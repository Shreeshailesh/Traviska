import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../api";
import { Modal } from "../ui/Modal";
import {
  Camera,
  Film,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Search,
  RotateCcw,
  X,
} from "lucide-react";

export interface GalleryAdminItem {
  _id: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  cloudinaryPublicId: string;
  thumbnailUrl: string;
  row: "top" | "bottom";
  order: number;
  title: string;
  isVisible: boolean;
  createdAt: string;
}

interface AdminGalleryManagerProps {
  onCountChange?: (total: number, active: number, top: number, bottom: number) => void;
  showUploadModalExternal?: boolean;
  onCloseUploadModalExternal?: () => void;
}

export const AdminGalleryManager: React.FC<AdminGalleryManagerProps> = ({
  onCountChange,
  showUploadModalExternal,
  onCloseUploadModalExternal,
}) => {
  const [items, setItems] = useState<GalleryAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "top" | "bottom">("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | "image" | "video">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Upload Form State
  const [selectedFilesArray, setSelectedFilesArray] = useState<File[]>([]);
  const [targetRow, setTargetRow] = useState<"top" | "bottom">("top");
  const [customTitle, setCustomTitle] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation modal state
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<GalleryAdminItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Sync external upload modal trigger from parent if passed
  useEffect(() => {
    if (typeof showUploadModalExternal === "boolean") {
      setShowUploadModal(showUploadModalExternal);
    }
  }, [showUploadModalExternal]);

  const handleCloseModal = () => {
    setShowUploadModal(false);
    setSelectedFilesArray([]);
    setCustomTitle("");
    if (onCloseUploadModalExternal) {
      onCloseUploadModalExternal();
    }
  };

  const getAuthHeader = () => {
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchItems = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await axios.get(`${API_BASE_URL}/admin/gallery`, {
        headers: getAuthHeader(),
      });
      if (res.data.success && Array.isArray(res.data.items)) {
        setItems(res.data.items);
        if (onCountChange) {
          const total = res.data.items.length;
          const active = res.data.items.filter((i: GalleryAdminItem) => i.isVisible).length;
          const top = res.data.items.filter((i: GalleryAdminItem) => i.row === "top").length;
          const bottom = res.data.items.filter((i: GalleryAdminItem) => i.row === "bottom").length;
          onCountChange(total, active, top, bottom);
        }
      }
    } catch (err: any) {
      console.error("Failed to load gallery items:", err);
      setErrorMessage(err.response?.data?.message || "Failed to load gallery media items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleFilesSelected = (files: FileList | File[]) => {
    const newFiles = Array.from(files);
    setSelectedFilesArray((prev) => {
      const existingKeys = new Set(prev.map((f) => f.name + f.size));
      const unique = newFiles.filter((f) => !existingKeys.has(f.name + f.size));
      return [...prev, ...unique];
    });
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFilesArray((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Multi-file Upload Handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFilesArray.length === 0) {
      setErrorMessage("Please select at least one photo or video to upload.");
      return;
    }

    setUploading(true);
    setErrorMessage(null);
    setUploadSuccessMessage(null);

    const formData = new FormData();
    for (let i = 0; i < selectedFilesArray.length; i++) {
      formData.append("files", selectedFilesArray[i]);
    }
    formData.append("row", targetRow);
    if (customTitle.trim()) {
      formData.append("title", customTitle.trim());
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/admin/gallery/upload`, formData, {
        headers: {
          ...getAuthHeader(),
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.success) {
        setUploadSuccessMessage(`Successfully uploaded ${res.data.items?.length || selectedFilesArray.length} frame(s)!`);
        handleCloseModal();
        fetchItems();
        setTimeout(() => setUploadSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      console.error("Upload failed:", err);
      setErrorMessage(err.response?.data?.message || "Media upload failed. Please try smaller files.");
    } finally {
      setUploading(false);
    }
  };

  // Toggle Visibility
  const handleToggleVisibility = async (item: GalleryAdminItem) => {
    const updatedVisible = !item.isVisible;
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i._id === item._id ? { ...i, isVisible: updatedVisible } : i))
    );

    try {
      await axios.put(
        `${API_BASE_URL}/admin/gallery/${item._id}`,
        { isVisible: updatedVisible },
        { headers: getAuthHeader() }
      );
    } catch (err) {
      console.error("Failed to update visibility:", err);
      fetchItems();
    }
  };

  // Switch Row (Top <-> Bottom)
  const handleSwitchRow = async (item: GalleryAdminItem) => {
    const newRow = item.row === "top" ? "bottom" : "top";
    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i._id === item._id ? { ...i, row: newRow } : i))
    );

    try {
      await axios.put(
        `${API_BASE_URL}/admin/gallery/${item._id}`,
        { row: newRow },
        { headers: getAuthHeader() }
      );
    } catch (err) {
      console.error("Failed to switch row:", err);
      fetchItems();
    }
  };

  // Move Item Up or Down within its row
  const handleMoveOrder = async (item: GalleryAdminItem, direction: "earlier" | "later") => {
    const sameRowItems = items
      .filter((i) => i.row === item.row)
      .sort((a, b) => a.order - b.order);

    const currentIndex = sameRowItems.findIndex((i) => i._id === item._id);
    if (currentIndex === -1) return;

    const targetIndex = direction === "earlier" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sameRowItems.length) return;

    const targetItem = sameRowItems[targetIndex];

    // Swap order values
    const newOrderCurrent = targetItem.order;
    const newOrderTarget = item.order;

    const updatedItems = items.map((i) => {
      if (i._id === item._id) return { ...i, order: newOrderCurrent };
      if (i._id === targetItem._id) return { ...i, order: newOrderTarget };
      return i;
    });

    setItems(updatedItems);

    try {
      await axios.put(
        `${API_BASE_URL}/admin/gallery/reorder`,
        {
          items: [
            { id: item._id, order: newOrderCurrent },
            { id: targetItem._id, order: newOrderTarget },
          ],
        },
        { headers: getAuthHeader() }
      );
    } catch (err) {
      console.error("Failed to reorder items:", err);
      fetchItems();
    }
  };

  // Delete Item
  const handleConfirmDelete = async () => {
    if (!deleteConfirmItem) return;
    setDeleting(true);

    try {
      await axios.delete(`${API_BASE_URL}/admin/gallery/${deleteConfirmItem._id}`, {
        headers: getAuthHeader(),
      });
      setItems((prev) => prev.filter((i) => i._id !== deleteConfirmItem._id));
      setDeleteConfirmItem(null);
    } catch (err: any) {
      console.error("Failed to delete gallery item:", err);
      alert(err.response?.data?.message || "Failed to delete item");
    } finally {
      setDeleting(false);
    }
  };

  const handleResetFilters = () => {
    setActiveTab("all");
    setMediaTypeFilter("all");
    setSearchQuery("");
  };

  // Filtered Items
  const filteredItems = items
    .filter((item) => {
      if (activeTab === "top" && item.row !== "top") return false;
      if (activeTab === "bottom" && item.row !== "bottom") return false;
      if (mediaTypeFilter !== "all" && item.mediaType !== mediaTypeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (item.title || "").toLowerCase().includes(q);
        const matchRow = item.row.toLowerCase().includes(q);
        const matchType = item.mediaType.toLowerCase().includes(q);
        return matchTitle || matchRow || matchType;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.row !== b.row) return a.row === "top" ? -1 : 1;
      return a.order - b.order;
    });

  const topCount = items.filter((i) => i.row === "top").length;
  const bottomCount = items.filter((i) => i.row === "bottom").length;

  return (
    <div className="space-y-5">
      {/* Success / Error Alerts */}
      {uploadSuccessMessage && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-medium shadow-2xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{uploadSuccessMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-medium shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => fetchItems()}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Segmented Row Filter Tabs (No duplicate button) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200/80 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "all"
                ? "bg-white text-gray-900 shadow-xs border border-gray-200/80"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            All Media ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("top")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "top"
                ? "bg-white text-gray-900 shadow-xs border border-gray-200/80"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Top Row ({topCount})</span>
            <span className="text-[11px] font-normal text-gray-400">&bull; L &rarr; R</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("bottom")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "bottom"
                ? "bg-white text-gray-900 shadow-xs border border-gray-200/80"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Bottom Row ({bottomCount})</span>
            <span className="text-[11px] font-normal text-gray-400">&bull; R &rarr; L</span>
          </button>
        </div>

        {/* Quick Upload Trigger */}
        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="admin-btn admin-btn-secondary"
        >
          <Plus className="w-4 h-4 text-emerald-800" />
          <span>Upload Media</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search frames by caption, location, or type..."
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0d2b17]/20 focus:border-[#0d2b17] transition-all"
            />
          </div>

          <select
            value={mediaTypeFilter}
            onChange={(e) => setMediaTypeFilter(e.target.value as any)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0d2b17]/20"
          >
            <option value="all">All Media Types</option>
            <option value="image">Photos Only</option>
            <option value="video">Videos Only</option>
          </select>
        </div>

        {(searchQuery || mediaTypeFilter !== "all" || activeTab !== "all") && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Media Grid Cards */}
      {loading ? (
        <div className="py-24 bg-white rounded-2xl border border-gray-200/80 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#0d2b17] mb-3" />
          <p className="text-xs font-semibold text-gray-600">Loading gallery frames...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-20 bg-white rounded-2xl border border-dashed border-gray-300 text-center p-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto mb-3.5">
            <Camera className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-gray-900">No media matches this filter</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Try resetting your search filters or click “Upload Media” to add new photos and videos to the homepage marquee.
          </p>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="mt-4 px-4 py-2 bg-[#0d2b17] hover:bg-[#164321] text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
          >
            Upload Media Frame
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map((item, index) => {
            const isVideo = item.mediaType === "video";
            return (
              <div
                key={item._id}
                className={`group bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs hover:shadow-md ${
                  item.isVisible
                    ? "border-gray-200/80"
                    : "border-gray-200 opacity-65 bg-gray-50/60"
                }`}
              >
                {/* 16:9 Media Preview */}
                <div className="relative aspect-video bg-gray-950 overflow-hidden">
                  {isVideo ? (
                    <video
                      src={item.mediaUrl}
                      poster={item.thumbnailUrl}
                      muted
                      playsInline
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                      onMouseOver={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
                      onMouseOut={(e) => {
                        const v = e.currentTarget as HTMLVideoElement;
                        v.pause();
                        v.currentTime = 0;
                      }}
                    />
                  ) : (
                    <img
                      src={item.thumbnailUrl || item.mediaUrl}
                      alt={item.title || "Media preview"}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                      loading="lazy"
                    />
                  )}

                  {/* Gradient Shadow Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/60 backdrop-blur-md text-white inline-flex items-center gap-1.5 border border-white/15">
                      {isVideo ? (
                        <>
                          <Film className="w-3 h-3 text-emerald-400" />
                          <span>Video</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-3 h-3 text-emerald-400" />
                          <span>Photo</span>
                        </>
                      )}
                    </span>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md border border-white/15 text-white ${
                        item.row === "top" ? "bg-blue-600/80" : "bg-purple-600/80"
                      }`}
                    >
                      {item.row === "top" ? "Top Row" : "Bottom Row"}
                    </span>
                  </div>

                  {/* Position Pill */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-white/95 text-gray-900 shadow-xs">
                      #{item.order + 1}
                    </span>
                  </div>

                  {/* Bottom Preview Overlay */}
                  <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1.5">
                    <a
                      href={item.mediaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-full bg-black/60 text-white hover:bg-black/90 backdrop-blur-xs transition-colors"
                      title="Open full resolution in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  <h4
                    className="text-xs font-bold text-gray-900 truncate"
                    title={item.title || "Untitled Frame"}
                  >
                    {item.title || "Untitled Frame"}
                  </h4>

                  {/* Metadata Row */}
                  <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2">
                    <span className="inline-flex items-center gap-1 font-medium">
                      {item.row === "top" ? (
                        <>
                          <ArrowRight className="w-3 h-3 text-blue-600" />
                          <span>Left &rarr; Right Marquee</span>
                        </>
                      ) : (
                        <>
                          <ArrowLeft className="w-3 h-3 text-purple-600" />
                          <span>Right &rarr; Left Marquee</span>
                        </>
                      )}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        item.isVisible ? "text-emerald-700" : "text-gray-400"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.isVisible ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                        }`}
                      />
                      {item.isVisible ? "Visible" : "Hidden"}
                    </span>
                  </div>

                  {/* Action Controls Toolbar */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-3.5">
                    {/* Reordering */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveOrder(item, "earlier")}
                        disabled={index === 0}
                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 rounded-lg transition-colors"
                        title="Move Earlier in Track"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveOrder(item, "later")}
                        disabled={index === filteredItems.length - 1}
                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-30 rounded-lg transition-colors"
                        title="Move Later in Track"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Switch Row */}
                    <button
                      type="button"
                      onClick={() => handleSwitchRow(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200/60"
                      title={`Switch to ${item.row === "top" ? "Bottom Row" : "Top Row"}`}
                    >
                      <ArrowLeftRight className="w-3 h-3 text-emerald-800" />
                      <span>{item.row === "top" ? "To Bottom" : "To Top"}</span>
                    </button>

                    {/* Visibility & Delete */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(item)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          item.isVisible
                            ? "text-emerald-700 hover:bg-emerald-50"
                            : "text-gray-400 hover:bg-gray-100"
                        }`}
                        title={item.isVisible ? "Hide from Homepage" : "Show on Homepage"}
                      >
                        {item.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmItem(item)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete from Gallery"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Redesigned Luxury Upload Gallery Media Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={handleCloseModal}
        title="Upload Gallery Media"
        subtitle="Select photos or videos and assign them to the homepage marquee row."
        maxWidth="640px"
      >
        <form onSubmit={handleUploadSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* Target Row Selection */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "8px",
              }}
            >
              TARGET ROW &amp; DIRECTION *
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {/* Top Row Card */}
              <div
                onClick={() => setTargetRow("top")}
                style={{
                  padding: "14px 16px",
                  borderRadius: "10px",
                  border: targetRow === "top" ? "2px solid #0d2b17" : "1px solid #e2e8f0",
                  background: targetRow === "top" ? "#f0fdf4" : "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#3b82f6" }} />
                    <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>Top Row</strong>
                  </div>
                  {targetRow === "top" && <CheckCircle2 size={16} color="#166534" />}
                </div>
                <span
                  style={{
                    fontSize: "11.5px",
                    color: "#64748b",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    marginTop: "2px",
                  }}
                >
                  <ArrowRight size={13} color="#3b82f6" />
                  <span>Moves Left &rarr; Right</span>
                </span>
              </div>

              {/* Bottom Row Card */}
              <div
                onClick={() => setTargetRow("bottom")}
                style={{
                  padding: "14px 16px",
                  borderRadius: "10px",
                  border: targetRow === "bottom" ? "2px solid #0d2b17" : "1px solid #e2e8f0",
                  background: targetRow === "bottom" ? "#f0fdf4" : "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#a855f7" }} />
                    <strong style={{ fontSize: "13.5px", color: "#0f172a" }}>Bottom Row</strong>
                  </div>
                  {targetRow === "bottom" && <CheckCircle2 size={16} color="#166534" />}
                </div>
                <span
                  style={{
                    fontSize: "11.5px",
                    color: "#64748b",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    marginTop: "2px",
                  }}
                >
                  <ArrowLeft size={13} color="#a855f7" />
                  <span>Moves Right &rarr; Left</span>
                </span>
              </div>
            </div>
          </div>

          {/* Caption / Title */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "6px",
              }}
            >
              CAPTION / TITLE (OPTIONAL)
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Misty Sunrise over Wayanad Tea Hills"
              style={{
                width: "100%",
                padding: "10px 14px",
                fontSize: "13px",
                color: "#0f172a",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                outline: "none",
                background: "#ffffff",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Drag & Drop File Zone */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "6px",
              }}
            >
              SELECT MEDIA FILES *
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleFilesSelected(e.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: dragOver ? "2px dashed #0d2b17" : "2px dashed #cbd5e1",
                borderRadius: "12px",
                padding: "26px 20px",
                textAlign: "center",
                background: dragOver ? "#f0fdf4" : "#f8fafc",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFilesSelected(e.target.files);
                  }
                }}
                style={{ display: "none" }}
                id="gallery-file-modal-input"
              />

              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "#eaf5e9",
                  color: "#166534",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 10px",
                }}
              >
                <UploadCloud size={24} />
              </div>

              <p style={{ margin: 0, fontSize: "13.5px", fontWeight: 700, color: "#0f172a" }}>
                Click to browse or drag &amp; drop photos/videos
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "11.5px", color: "#64748b" }}>
                Supports JPG, PNG, WebP photos &amp; MP4, MOV, WebM videos (up to 60MB per file)
              </p>
            </div>

            {/* Selected Files Preview List */}
            {selectedFilesArray.length > 0 && (
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>
                    {selectedFilesArray.length} File{selectedFilesArray.length === 1 ? "" : "s"} Ready for Upload
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedFilesArray([])}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#dc2626",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Clear All
                  </button>
                </div>

                <div
                  style={{
                    maxHeight: "160px",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                    paddingRight: "4px",
                  }}
                >
                  {selectedFilesArray.map((file, idx) => {
                    const isVid = file.type.startsWith("video/");
                    return (
                      <div
                        key={`${file.name}-${idx}`}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                          <div
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "6px",
                              background: isVid ? "#f3e8ff" : "#e0f2fe",
                              color: isVid ? "#7e22ce" : "#0369a1",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {isVid ? <Film size={14} /> : <Camera size={14} />}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p
                              style={{
                                margin: 0,
                                fontSize: "12px",
                                fontWeight: 600,
                                color: "#0f172a",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: "340px",
                              }}
                            >
                              {file.name}
                            </p>
                            <span style={{ fontSize: "10.5px", color: "#64748b" }}>
                              {formatFileSize(file.size)} &bull; {isVid ? "Video" : "Photo"}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFile(idx)}
                          style={{
                            background: "#f1f5f9",
                            border: "none",
                            borderRadius: "50%",
                            width: "22px",
                            height: "22px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "#64748b",
                            flexShrink: 0,
                          }}
                          title="Remove file"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "10px",
              paddingTop: "14px",
              borderTop: "1px solid #e2e8f0",
              marginTop: "4px",
            }}
          >
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={uploading}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "13px",
                fontWeight: 600,
                color: "#64748b",
                cursor: "pointer",
                padding: "8px 16px",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || selectedFilesArray.length === 0}
              style={{
                background: "#0d2b17",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "9px 20px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: uploading || selectedFilesArray.length === 0 ? "not-allowed" : "pointer",
                opacity: uploading || selectedFilesArray.length === 0 ? 0.6 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                transition: "background 0.15s ease",
              }}
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Uploading to Cloudinary...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={16} />
                  <span>
                    Upload {selectedFilesArray.length > 0 ? `(${selectedFilesArray.length})` : ""} to Gallery
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <Modal
          isOpen={!!deleteConfirmItem}
          onClose={() => setDeleteConfirmItem(null)}
          title="Delete Media Frame"
          subtitle="Remove asset from Cloudinary and homepage marquee."
          maxWidth="440px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>
              Are you sure you want to permanently delete{" "}
              <strong style={{ color: "#0f172a" }}>
                &ldquo;{deleteConfirmItem.title || "this frame"}&rdquo;
              </strong>
              ? This action cannot be undone.
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "10px",
                paddingTop: "14px",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={deleting}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#64748b",
                  cursor: "pointer",
                  padding: "8px 16px",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "9px 18px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: deleting ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {deleting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
