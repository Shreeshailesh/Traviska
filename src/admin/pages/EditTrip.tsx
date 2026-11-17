import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Cropper from "react-easy-crop";
import {
  ChevronLeft,
  Save,
  Plus,
  Trash2,
  Smartphone,
  Monitor,
  Sparkles,
  CheckCircle2,
  XCircle,
  Luggage,
  Check,
  MapPin,
  Clock,
  ExternalLink,
  Edit2,
  ArrowUp,
  ArrowDown,
  Calendar,
  UploadCloud,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  RefreshCw,
  Crop,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
} from "lucide-react";

import { API_BASE_URL } from "../../api";

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas 2D context not available");
  }

  canvas.width = Math.round(pixelCrop.width);
  canvas.height = Math.round(pixelCrop.height);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    Math.round(pixelCrop.x),
    Math.round(pixelCrop.y),
    Math.round(pixelCrop.width),
    Math.round(pixelCrop.height),
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      },
      "image/jpeg",
      0.95
    );
  });
};

interface ItineraryDay {
  day: number;
  title: string;
  description: string;
}

export interface PickupDateOverride {
  slotId?: string;
  date: string;
  pickupTime: string;
}

export interface PickupLocationItem {
  _id?: string;
  name: string;
  address: string;
  landmark: string;
  pickupTime: string;
  googleMapsUrl: string;
  isActive: boolean;
  order: number;
  dateOverrides: PickupDateOverride[];
}

export const EditTrip: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");

  const [activeTab, setActiveTab] = useState<
    "basic" | "images" | "highlights" | "itinerary" | "inclusions" | "thingsToCarry" | "pickups" | "preview"
  >(() => (searchParams.get("tab") as any) || "basic");
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("mobile");

  // Form State
  const [title, setTitle] = useState("Coorg Weekend Trip");
  const [destination, setDestination] = useState("Coorg, Karnataka");
  const [duration, setDuration] = useState("2 Days / 1 Night");
  const [difficulty, setDifficulty] = useState("Easy");
  const [maxTravellers, setMaxTravellers] = useState(40);
  const [basePrice, setBasePrice] = useState(4999);
  const [offerPrice, setOfferPrice] = useState(4499);
  const [showOfferPrice, setShowOfferPrice] = useState(true);
  const [description, setDescription] = useState(
    "Escape to the scenic hills of Coorg, known for its lush coffee plantations, misty landscapes, and peaceful vibe. A perfect weekend getaway from the city with nature, adventure and great company."
  );

  const [coverImage, setCoverImage] = useState(
    "https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?w=800&auto=format&fit=crop&q=80"
  );
  const [photos, setPhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800",
    "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?w=800",
  ]);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");

  // Gallery & Cloudinary Upload State
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [coverMode, setCoverMode] = useState<"upload" | "url">("upload");
  const [galleryMode, setGalleryMode] = useState<"upload" | "url">("upload");
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [isDraggingGallery, setIsDraggingGallery] = useState(false);
  const coverInputRef = React.useRef<HTMLInputElement | null>(null);
  const galleryInputRef = React.useRef<HTMLInputElement | null>(null);

  // Cover Image Cropping & Framing State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>("");
  const [rawCoverFile, setRawCoverFile] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<number>(16 / 9);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [uploadingCropped, setUploadingCropped] = useState(false);

  const [highlights, setHighlights] = useState<string[]>([
    "Abbey Falls Visit",
    "Coffee Plantation Tour",
    "Mandalpatti Viewpoint",
    "Campfire & Games",
  ]);
  const [newHighlight, setNewHighlight] = useState("");

  const [itinerary, setItinerary] = useState<ItineraryDay[]>([
    {
      day: 1,
      title: "Arrival & Plantation Walk",
      description: "Depart from Bangalore overnight. Arrive in Coorg, check in at resort, refresh and head out for coffee plantation walk.",
    },
    {
      day: 2,
      title: "Mandalpatti & Abbey Falls",
      description: "Early sunrise jeep safari to Mandalpatti. Visit majestic Abbey Falls and depart back towards Bangalore.",
    },
  ]);

  const [inclusions, setInclusions] = useState<string[]>([
    "Non-AC pushback tempo traveller or bus",
    "Stay in shared resort/homestay with pool",
    "2 Breakfasts and 1 Dinner included",
    "Sightseeing and entry permits",
    "Experienced Traviska Trip Captain",
  ]);
  const [newInclusion, setNewInclusion] = useState("");

  const [exclusions, setExclusions] = useState<string[]>([
    "Lunch on all days",
    "Personal expenses and water bottles",
    "Any activities not mentioned in itinerary",
  ]);
  const [newExclusion, setNewExclusion] = useState("");

  const [thingsToCarry, setThingsToCarry] = useState<string[]>([
    "Comfortable trekking shoes and flip-flops",
    "Warm jacket or sweater for misty mornings",
    "Government issued photo ID card (Original)",
    "Personal medication and reusable water bottle",
    "Raincoat or umbrella (seasonal)",
  ]);
  const [newThingToCarry, setNewThingToCarry] = useState("");

  // Pickup Locations State
  const [pickupLocations, setPickupLocations] = useState<PickupLocationItem[]>([]);
  const [tripSlots, setTripSlots] = useState<{ _id: string; date: string }[]>([]);
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [editingPickupIndex, setEditingPickupIndex] = useState<number | null>(null);
  const [pickupForm, setPickupForm] = useState<PickupLocationItem>({
    name: "",
    address: "",
    landmark: "",
    pickupTime: "10:00 PM",
    googleMapsUrl: "",
    isActive: true,
    order: 0,
    dateOverrides: [],
  });
  const [newOverrideSlotId, setNewOverrideSlotId] = useState("");
  const [newOverrideTime, setNewOverrideTime] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveAlert, setSaveAlert] = useState(false);

  // If editId present, load all existing trip details from MongoDB
  useEffect(() => {
    if (!editId) return;
    const fetchTrip = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/trips/${editId}`);
        if (data) {
          setTitle(data.title || "");
          setDestination(data.location || "");
          setDuration(data.duration || "2 Days / 1 Night");
          setBasePrice(Number(data.price) || 4999);
          setDescription(data.description || "");
          if (data.image) setCoverImage(data.image);
          if (Array.isArray(data.photos) && data.photos.length > 0) {
            setPhotos(data.photos);
          }

          // Highlights: split if stored as newline/comma separated string
          if (data.highlights) {
            if (typeof data.highlights === "string") {
              const parsed = data.highlights
                .split("\n")
                .map((s: string) => s.replace(/^[•\-\*]\s*/, "").trim())
                .filter(Boolean);
              if (parsed.length > 0) setHighlights(parsed);
            } else if (Array.isArray(data.highlights)) {
              setHighlights(data.highlights);
            }
          }

          // Inclusions
          if (data.inclusions) {
            if (typeof data.inclusions === "string") {
              const parsed = data.inclusions
                .split("\n")
                .map((s: string) => s.replace(/^[•\-\*]\s*/, "").trim())
                .filter(Boolean);
              if (parsed.length > 0) setInclusions(parsed);
            } else if (Array.isArray(data.inclusions)) {
              setInclusions(data.inclusions);
            }
          }

          // Exclusions
          if (data.exclusions) {
            if (typeof data.exclusions === "string") {
              const parsed = data.exclusions
                .split("\n")
                .map((s: string) => s.replace(/^[•\-\*]\s*/, "").trim())
                .filter(Boolean);
              if (parsed.length > 0) setExclusions(parsed);
            } else if (Array.isArray(data.exclusions)) {
              setExclusions(data.exclusions);
            }
          }

          // Things To Carry
          if (data.thingsToCarry) {
            if (typeof data.thingsToCarry === "string") {
              const parsed = data.thingsToCarry
                .split("\n")
                .map((s: string) => s.replace(/^[•\-\*]\s*/, "").trim())
                .filter(Boolean);
              if (parsed.length > 0) setThingsToCarry(parsed);
            } else if (Array.isArray(data.thingsToCarry)) {
              setThingsToCarry(data.thingsToCarry);
            }
          }

          // Itinerary
          if (data.itinerary && typeof data.itinerary === "string") {
            const days = data.itinerary.split(/Day\s*(\d+)[:\-]?/i).filter(Boolean);
            if (days.length >= 2) {
              const parsedDays: ItineraryDay[] = [];
              for (let i = 0; i < days.length; i += 2) {
                const dayNum = Number(days[i]) || parsedDays.length + 1;
                const text = days[i + 1] ? days[i + 1].trim() : "";
                const [firstLine, ...rest] = text.split("\n");
                parsedDays.push({
                  day: dayNum,
                  title: firstLine.trim(),
                  description: rest.join("\n").trim() || firstLine.trim(),
                });
              }
              if (parsedDays.length > 0) setItinerary(parsedDays);
            }
          }

          // Pickup Locations
          if (Array.isArray(data.pickupLocations)) {
            setPickupLocations(
              data.pickupLocations.map((p: any, idx: number) => ({
                _id: p._id,
                name: p.name || "",
                address: p.address || "",
                landmark: p.landmark || "",
                pickupTime: p.pickupTime || "10:00 PM",
                googleMapsUrl: p.googleMapsUrl || "",
                isActive: p.isActive !== false,
                order: typeof p.order === "number" ? p.order : idx,
                dateOverrides: Array.isArray(p.dateOverrides) ? p.dateOverrides : [],
              }))
            );
          }
        }
      } catch (err) {
        console.error("Failed to load trip:", err);
      }
    };
    fetchTrip();
  }, [editId]);

  // Fetch departure slots for configuring date overrides
  useEffect(() => {
    if (!editId) return;
    axios
      .get(`${API_BASE_URL}/trips/${editId}/slots`)
      .then((res) => {
        if (Array.isArray(res.data)) {
          setTripSlots(
            res.data.map((s: any) => ({
              _id: String(s._id),
              date: String(s.date),
            }))
          );
        }
      })
      .catch((err) => {
        console.warn("Could not load trip slots for overrides:", err?.message);
      });
  }, [editId]);

  const handleAddHighlight = () => {
    if (newHighlight.trim() && !highlights.includes(newHighlight.trim())) {
      setHighlights([...highlights, newHighlight.trim()]);
      setNewHighlight("");
    }
  };

  const handleRemoveHighlight = (h: string) => {
    setHighlights(highlights.filter((item) => item !== h));
  };

  const handleAddInclusion = () => {
    if (newInclusion.trim()) {
      setInclusions([...inclusions, newInclusion.trim()]);
      setNewInclusion("");
    }
  };

  const handleAddExclusion = () => {
    if (newExclusion.trim()) {
      setExclusions([...exclusions, newExclusion.trim()]);
      setNewExclusion("");
    }
  };

  const handleAddThingToCarry = () => {
    if (newThingToCarry.trim()) {
      setThingsToCarry([...thingsToCarry, newThingToCarry.trim()]);
      setNewThingToCarry("");
    }
  };

  const handleAddPhoto = () => {
    if (newPhotoUrl.trim() && !photos.includes(newPhotoUrl.trim())) {
      setPhotos([...photos, newPhotoUrl.trim()]);
      setNewPhotoUrl("");
    }
  };

  const handleCoverFileSelected = (file: File) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setUploadError("Image size exceeds 20MB limit. Please select a smaller photo.");
      return;
    }

    setRawCoverFile(file);
    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAspectRatio(16 / 9);
    setCroppedAreaPixels(null);
    setIsCropModalOpen(true);
  };

  const handleOpenCropForCurrentCover = () => {
    if (!coverImage) return;
    setRawCoverFile(null);
    setCropImageSrc(coverImage);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAspectRatio(16 / 9);
    setCroppedAreaPixels(null);
    setIsCropModalOpen(true);
  };

  const handleApplyCropAndUpload = async () => {
    if (!cropImageSrc || !croppedAreaPixels) {
      setUploadError("Please adjust your crop area before proceeding.");
      return;
    }

    setUploadingCropped(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const croppedBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], `cover-crop-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      const formData = new FormData();
      formData.append("image", croppedFile);

      const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
      const res = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.data?.success && res.data.url) {
        setCoverImage(res.data.url);
        setIsCropModalOpen(false);
        setUploadSuccess("Cover photo cropped and uploaded to Cloudinary successfully!");
        setTimeout(() => setUploadSuccess(null), 3500);
      } else {
        setUploadError(res.data?.message || "Failed to upload cropped image to Cloudinary.");
      }
    } catch (err: any) {
      console.error("Cropping/upload error:", err);
      setUploadError(err.response?.data?.message || "Failed to process and upload cropped image.");
    } finally {
      setUploadingCropped(false);
    }
  };

  const handleUploadCoverFile = async (file: File) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setUploadError("Image size exceeds 15MB limit. Please select a smaller photo.");
      return;
    }

    setUploadingCover(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append("image", file);

    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    try {
      const res = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.data?.success && res.data.url) {
        setCoverImage(res.data.url);
        setUploadSuccess("Cover image uploaded to Cloudinary successfully!");
        setTimeout(() => setUploadSuccess(null), 3500);
      } else {
        setUploadError(res.data?.message || "Failed to upload image to Cloudinary.");
      }
    } catch (err: any) {
      console.error("Cover upload error:", err);
      setUploadError(err.response?.data?.message || "Failed to upload image to Cloudinary.");
    } finally {
      setUploadingCover(false);
    }
  };

  const handleUploadGalleryFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);

    setUploadingGallery(true);
    setUploadError(null);
    setUploadSuccess(null);

    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");

    try {
      const formData = new FormData();
      fileList.forEach((f) => formData.append("images", f));

      try {
        const multiRes = await axios.post(`${API_BASE_URL}/upload-multiple`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (multiRes.data?.success && Array.isArray(multiRes.data.urls)) {
          setPhotos((prev) => [...prev, ...multiRes.data.urls]);
          setUploadSuccess(`${multiRes.data.urls.length} photo(s) uploaded to Cloudinary!`);
          setTimeout(() => setUploadSuccess(null), 3500);
          setUploadingGallery(false);
          return;
        }
      } catch (multiErr) {
        // Fallback to sequential uploads
      }

      const uploadedUrls: string[] = [];
      for (const file of fileList) {
        const singleForm = new FormData();
        singleForm.append("image", file);
        const sRes = await axios.post(`${API_BASE_URL}/upload`, singleForm, {
          headers: {
            "Content-Type": "multipart/form-data",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (sRes.data?.success && sRes.data.url) {
          uploadedUrls.push(sRes.data.url);
        }
      }

      if (uploadedUrls.length > 0) {
        setPhotos((prev) => [...prev, ...uploadedUrls]);
        setUploadSuccess(`${uploadedUrls.length} photo(s) uploaded to Cloudinary!`);
        setTimeout(() => setUploadSuccess(null), 3500);
      }
    } catch (err: any) {
      console.error("Gallery upload error:", err);
      setUploadError(err.response?.data?.message || "Failed to upload gallery photos.");
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");

    // Format fields cleanly for Mongoose Trip model
    const highlightsText = highlights.join("\n");
    const inclusionsText = inclusions.join("\n");
    const exclusionsText = exclusions.join("\n");
    const thingsToCarryText = thingsToCarry.join("\n");
    const itineraryText = itinerary
      .map((d) => `Day ${d.day}: ${d.title}\n${d.description}`)
      .join("\n\n");

    const payload = {
      title,
      location: destination,
      duration,
      price: showOfferPrice ? offerPrice : basePrice,
      image: coverImage,
      photos,
      description,
      highlights: highlightsText,
      inclusions: inclusionsText,
      exclusions: exclusionsText,
      thingsToCarry: thingsToCarryText,
      itinerary: itineraryText,
      pickupLocations: pickupLocations.map((p, idx) => ({
        ...p,
        order: idx,
      })),
    };

    try {
      if (editId) {
        await axios.put(`${API_BASE_URL}/trips/${editId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSaveAlert(true);
        setTimeout(() => setSaveAlert(false), 3000);
      } else {
        const { data: res } = await axios.post(`${API_BASE_URL}/trips`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("New trip created successfully!");
        if (res?.trip?._id) {
          navigate(`/admin/add-trip?edit=${res.trip._id}`, { replace: true });
        } else {
          navigate("/admin/trips");
        }
      }
    } catch (err: any) {
      console.error("Save trip failed:", err);
      alert(err.response?.data?.message || "Failed to save trip package");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddPickup = () => {
    setEditingPickupIndex(null);
    setPickupForm({
      name: "",
      address: "",
      landmark: "",
      pickupTime: "10:00 PM",
      googleMapsUrl: "",
      isActive: true,
      order: pickupLocations.length,
      dateOverrides: [],
    });
    setNewOverrideSlotId("");
    setNewOverrideTime("");
    setIsPickupModalOpen(true);
  };

  const handleEditPickup = (index: number) => {
    setEditingPickupIndex(index);
    const item = pickupLocations[index];
    setPickupForm({
      ...item,
      dateOverrides: Array.isArray(item.dateOverrides) ? [...item.dateOverrides] : [],
    });
    setNewOverrideSlotId("");
    setNewOverrideTime("");
    setIsPickupModalOpen(true);
  };

  const handleDeletePickup = (index: number) => {
    if (window.confirm("Are you sure you want to delete this pickup location?")) {
      setPickupLocations(pickupLocations.filter((_, idx) => idx !== index));
    }
  };

  const handleTogglePickupActive = (index: number) => {
    setPickupLocations((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, isActive: !item.isActive } : item
      )
    );
  };

  const handleMovePickup = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pickupLocations.length) return;
    const copy = [...pickupLocations];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    setPickupLocations(copy);
  };

  const handleAddDateOverride = () => {
    if (!newOverrideSlotId || !newOverrideTime.trim()) {
      alert("Please select a departure date and enter an override pickup time");
      return;
    }
    const matchedSlot = tripSlots.find((s) => s._id === newOverrideSlotId);
    const dateStr = matchedSlot ? matchedSlot.date : "";
    setPickupForm((prev) => ({
      ...prev,
      dateOverrides: [
        ...(prev.dateOverrides || []).filter(
          (o) => String(o.slotId) !== String(newOverrideSlotId)
        ),
        {
          slotId: newOverrideSlotId,
          date: dateStr,
          pickupTime: newOverrideTime.trim(),
        },
      ],
    }));
    setNewOverrideSlotId("");
    setNewOverrideTime("");
  };

  const handleRemoveDateOverride = (overrideIdx: number) => {
    setPickupForm((prev) => ({
      ...prev,
      dateOverrides: prev.dateOverrides.filter((_, idx) => idx !== overrideIdx),
    }));
  };

  const handleSavePickupModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickupForm.name.trim()) {
      alert("Pickup point name is required");
      return;
    }
    if (!pickupForm.pickupTime.trim()) {
      alert("Standard pickup time is required");
      return;
    }

    if (editingPickupIndex !== null) {
      setPickupLocations((prev) =>
        prev.map((item, idx) =>
          idx === editingPickupIndex
            ? { ...pickupForm, order: item.order }
            : item
        )
      );
    } else {
      setPickupLocations((prev) => [
        ...prev,
        { ...pickupForm, order: prev.length },
      ]);
    }
    setIsPickupModalOpen(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Breadcrumb & Action Header */}
      <div className="admin-page-header">
        <div className="admin-page-title-box">
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "#64748b", marginBottom: "4px" }}>
            <button
              onClick={() => navigate("/admin/trips")}
              style={{ background: "transparent", border: "none", color: "#166534", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
            >
              <ChevronLeft size={16} />
              <span>Trips</span>
            </button>
            <span>/</span>
            <span>{editId ? "Edit Trip" : "Create New Trip"}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1>{title || "Untitled Trip"}</h1>
            <span className="admin-badge active">● Published</span>
            {saveAlert && (
              <span style={{ fontSize: "12px", color: "#166534", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                <Check size={14} /> Saved & Persisted!
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={() => navigate("/admin/trips")}
          >
            Back to Trips
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="admin-btn admin-btn-primary"
          >
            <Save size={16} />
            <span>{saving ? "Saving..." : editId ? "Save Changes" : "Publish Trip"}</span>
          </button>
        </div>
      </div>

      {/* 7 Tab Navigation Bar */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid #e2e8f0",
          background: "#ffffff",
          borderRadius: "12px",
          padding: "4px 8px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          overflowX: "auto",
          gap: "4px",
        }}
      >
        {[
          { id: "basic", label: "1. Basic Details" },
          { id: "images", label: "2. Images & Gallery" },
          { id: "highlights", label: "3. Overview & Highlights" },
          { id: "itinerary", label: "4. Itinerary" },
          { id: "inclusions", label: "5. Inclusions & Exclusions" },
          { id: "thingsToCarry", label: "6. Things to Carry" },
          { id: "pickups", label: `7. Pickup Locations (${pickupLocations.length})` },
          { id: "preview", label: "8. Customer Preview" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: "10px 16px",
              border: "none",
              borderRadius: "8px",
              background: activeTab === tab.id ? "#eaf5e9" : "transparent",
              fontSize: "13px",
              fontWeight: 600,
              color: activeTab === tab.id ? "#166534" : "#64748b",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Workspace Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: activeTab === "preview" ? "1fr" : "1.4fr 1fr",
          gap: "24px",
          alignItems: "flex-start",
        }}
      >
        {/* TAB CONTENT PANELS */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e7ecf0",
            borderRadius: "14px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
          }}
        >
          {/* TAB 1: BASIC DETAILS */}
          {activeTab === "basic" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                  Basic Information
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Core trip package metadata, destination, duration and pricing.
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Trip Name *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "13.5px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Destination *
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "13.5px",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Duration *
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 2 Days / 1 Night"
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "13.5px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "13.5px",
                      background: "#ffffff",
                    }}
                  >
                    <option value="Easy">Easy (Family / Leisure)</option>
                    <option value="Moderate">Moderate (Active trek)</option>
                    <option value="Challenging">Challenging (Rugged)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Max Travellers (Batch)
                  </label>
                  <input
                    type="number"
                    value={maxTravellers}
                    onChange={(e) => setMaxTravellers(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "13.5px",
                    }}
                  />
                </div>
              </div>

              {/* Pricing Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "13.5px",
                      fontWeight: 700,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                    Offer Price (₹)
                  </label>
                  <input
                    type="number"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "13.5px",
                      fontWeight: 700,
                      color: "#166534",
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={showOfferPrice}
                      onChange={(e) => setShowOfferPrice(e.target.checked)}
                      style={{ width: "16px", height: "16px" }}
                    />
                    <span>Show Offer Price on Site</span>
                  </label>
                  <span style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                    Strikethrough base price with discount badge
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Trip Overview Description *
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the adventure, scenic locations, and experience..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "13.5px",
                    lineHeight: "1.5",
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 2: IMAGES & GALLERY */}
          {activeTab === "images" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Header */}
              <div
                style={{
                  borderBottom: "1px solid #f1f5f9",
                  paddingBottom: "12px",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                    Images & Photo Gallery
                  </h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Primary cover banner and photo gallery displayed on the customer trip page. Photos upload directly to Cloudinary.
                  </span>
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    padding: "4px 10px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#166534",
                  }}
                >
                  <UploadCloud size={14} /> Cloudinary Integrated
                </div>
              </div>

              {/* Status Alerts */}
              {uploadSuccess && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "8px",
                    color: "#166534",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span>{uploadSuccess}</span>
                </div>
              )}
              {uploadError && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    color: "#b91c1c",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* 1. MAIN COVER IMAGE */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", display: "block" }}>
                      Main Cover Image *
                    </label>
                    <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                      Hero banner shown on trip cards, listings, and at the top of the trip details page.
                    </span>
                  </div>

                  {/* Mode switcher */}
                  <div
                    style={{
                      display: "inline-flex",
                      background: "#f1f5f9",
                      borderRadius: "8px",
                      padding: "3px",
                      gap: "3px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setCoverMode("upload")}
                      style={{
                        padding: "5px 12px",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        borderRadius: "6px",
                        border: "none",
                        background: coverMode === "upload" ? "#ffffff" : "transparent",
                        color: coverMode === "upload" ? "#166534" : "#64748b",
                        boxShadow: coverMode === "upload" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <UploadCloud size={13} />
                      <span>Upload from Gallery</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverMode("url")}
                      style={{
                        padding: "5px 12px",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        borderRadius: "6px",
                        border: "none",
                        background: coverMode === "url" ? "#ffffff" : "transparent",
                        color: coverMode === "url" ? "#166534" : "#64748b",
                        boxShadow: coverMode === "url" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                        cursor: "pointer",
                      }}
                    >
                      Image URL
                    </button>
                  </div>
                </div>

                {/* Hidden Cover Input */}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleCoverFileSelected(f);
                    e.target.value = "";
                  }}
                />

                {coverMode === "upload" ? (
                  <div>
                    {/* Dropzone */}
                    <div
                      onClick={() => !uploadingCover && coverInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingCover(true);
                      }}
                      onDragLeave={() => setIsDraggingCover(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingCover(false);
                        const f = e.dataTransfer.files?.[0];
                        if (f) handleCoverFileSelected(f);
                      }}
                      style={{
                        border: isDraggingCover ? "2px dashed #166534" : "2px dashed #cbd5e1",
                        background: isDraggingCover ? "#f0fdf4" : uploadingCover ? "#f8fafc" : "#fafafa",
                        borderRadius: "10px",
                        padding: "24px 16px",
                        textAlign: "center",
                        cursor: uploadingCover ? "wait" : "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {uploadingCover ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                          <Loader2 size={26} className="animate-spin" color="#166534" />
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "#166534" }}>
                            Uploading cover image to Cloudinary...
                          </span>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>Optimizing and generating CDN delivery URL</span>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                          <div
                            style={{
                              width: "42px",
                              height: "42px",
                              borderRadius: "50%",
                              background: "#e8f5e9",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <UploadCloud size={22} color="#166534" />
                          </div>
                          <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                            Click to choose photo from your gallery or drag & drop
                          </span>
                          <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                            Interactive crop & framing • Direct Cloudinary upload (JPG, PNG, WebP up to 20MB)
                          </span>
                          <button
                            type="button"
                            className="admin-btn admin-btn-primary"
                            style={{ marginTop: "6px", padding: "6px 14px", fontSize: "11.5px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              coverInputRef.current?.click();
                            }}
                          >
                            Browse Device Gallery
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Preview if present */}
                    {coverImage && (
                      <div
                        style={{
                          marginTop: "12px",
                          position: "relative",
                          height: "200px",
                          borderRadius: "10px",
                          overflow: "hidden",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <img src={coverImage} alt="Cover Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <div
                          style={{
                            position: "absolute",
                            top: "10px",
                            left: "10px",
                            background: "rgba(15, 23, 42, 0.8)",
                            backdropFilter: "blur(4px)",
                            color: "#ffffff",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                          }}
                        >
                          <ImageIcon size={12} />
                          <span>Cover Preview</span>
                          {coverImage.includes("cloudinary.com") && (
                            <span style={{ background: "#166534", padding: "1px 5px", borderRadius: "4px", fontSize: "9.5px" }}>
                              Cloudinary
                            </span>
                          )}
                        </div>

                        <div style={{ position: "absolute", top: "10px", right: "10px", display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={handleOpenCropForCurrentCover}
                            title="Crop & Adjust Visible Region"
                            style={{
                              background: "#ffffff",
                              color: "#064e3b",
                              border: "1px solid #bbf7d0",
                              borderRadius: "6px",
                              padding: "4px 8px",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            }}
                          >
                            <Crop size={11} /> Crop & Adjust
                          </button>
                          <button
                            type="button"
                            onClick={() => coverInputRef.current?.click()}
                            style={{
                              background: "#ffffff",
                              color: "#0f172a",
                              border: "1px solid #cbd5e1",
                              borderRadius: "6px",
                              padding: "4px 8px",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            }}
                          >
                            <RefreshCw size={11} /> Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => setCoverImage("")}
                            style={{
                              background: "#fee2e2",
                              color: "#b91c1c",
                              border: "1px solid #fecaca",
                              borderRadius: "6px",
                              padding: "4px 8px",
                              fontSize: "11px",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            }}
                          >
                            <Trash2 size={11} /> Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      placeholder="https://images.unsplash.com/... or https://res.cloudinary.com/..."
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        fontSize: "13.5px",
                        marginBottom: "10px",
                      }}
                    />
                    {coverImage && (
                      <div style={{ height: "200px", borderRadius: "10px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                        <img src={coverImage} alt="Cover Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. PHOTO GALLERY */}
              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", display: "block" }}>
                      Photo Gallery ({photos.length} photos)
                    </label>
                    <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                      Showcase trip moments, destinations, accommodations, and views to prospective travelers.
                    </span>
                  </div>

                  {/* Mode switcher */}
                  <div
                    style={{
                      display: "inline-flex",
                      background: "#f1f5f9",
                      borderRadius: "8px",
                      padding: "3px",
                      gap: "3px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setGalleryMode("upload")}
                      style={{
                        padding: "5px 12px",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        borderRadius: "6px",
                        border: "none",
                        background: galleryMode === "upload" ? "#ffffff" : "transparent",
                        color: galleryMode === "upload" ? "#166534" : "#64748b",
                        boxShadow: galleryMode === "upload" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <UploadCloud size={13} />
                      <span>Upload from Gallery</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGalleryMode("url")}
                      style={{
                        padding: "5px 12px",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        borderRadius: "6px",
                        border: "none",
                        background: galleryMode === "url" ? "#ffffff" : "transparent",
                        color: galleryMode === "url" ? "#166534" : "#64748b",
                        boxShadow: galleryMode === "url" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                        cursor: "pointer",
                      }}
                    >
                      Paste URL
                    </button>
                  </div>
                </div>

                {/* Hidden Gallery Input (Multiple files allowed) */}
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const fl = e.target.files;
                    if (fl && fl.length > 0) handleUploadGalleryFiles(fl);
                    e.target.value = "";
                  }}
                />

                {galleryMode === "upload" ? (
                  <div
                    onClick={() => !uploadingGallery && galleryInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingGallery(true);
                    }}
                    onDragLeave={() => setIsDraggingGallery(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingGallery(false);
                      const fl = e.dataTransfer.files;
                      if (fl && fl.length > 0) handleUploadGalleryFiles(fl);
                    }}
                    style={{
                      border: isDraggingGallery ? "2px dashed #166534" : "2px dashed #cbd5e1",
                      background: isDraggingGallery ? "#f0fdf4" : uploadingGallery ? "#f8fafc" : "#fafafa",
                      borderRadius: "10px",
                      padding: "24px 16px",
                      textAlign: "center",
                      cursor: uploadingGallery ? "wait" : "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {uploadingGallery ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                        <Loader2 size={26} className="animate-spin" color="#166534" />
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "#166534" }}>
                          Uploading photos to Cloudinary...
                        </span>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>Uploading and indexing gallery photos</span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                        <div
                          style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "50%",
                            background: "#e8f5e9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <UploadCloud size={22} color="#166534" />
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                          Choose multiple photos from your gallery or drag & drop
                        </span>
                        <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                          Select multiple images at once • Direct Cloudinary CDN upload
                        </span>
                        <button
                          type="button"
                          className="admin-btn admin-btn-primary"
                          style={{ marginTop: "6px", padding: "6px 14px", fontSize: "11.5px" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            galleryInputRef.current?.click();
                          }}
                        >
                          Browse Device Gallery (Multiple)
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="url"
                      placeholder="Paste image URL to add to gallery..."
                      value={newPhotoUrl}
                      onChange={(e) => setNewPhotoUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddPhoto();
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        fontSize: "13px",
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddPhoto}
                      className="admin-btn admin-btn-primary"
                      style={{ padding: "8px 14px", fontSize: "12.5px" }}
                    >
                      <Plus size={14} /> Add Photo
                    </button>
                  </div>
                )}

                {/* Photo Thumbnails Grid */}
                {photos.length === 0 ? (
                  <div
                    style={{
                      padding: "18px",
                      textAlign: "center",
                      background: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      color: "#64748b",
                      fontSize: "12.5px",
                    }}
                  >
                    No photos added to gallery yet. Upload from your device gallery above or paste image URLs!
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                      gap: "10px",
                    }}
                  >
                    {photos.map((p, idx) => {
                      const isCloudinary = p.includes("cloudinary.com");
                      return (
                        <div
                          key={idx}
                          style={{
                            position: "relative",
                            height: "95px",
                            borderRadius: "8px",
                            overflow: "hidden",
                            border: "1px solid #e2e8f0",
                            background: "#f1f5f9",
                          }}
                        >
                          <img
                            src={p}
                            alt={`Gallery ${idx + 1}`}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                          {isCloudinary && (
                            <span
                              style={{
                                position: "absolute",
                                bottom: "4px",
                                left: "4px",
                                background: "rgba(6, 78, 59, 0.85)",
                                color: "#ffffff",
                                padding: "1px 5px",
                                borderRadius: "4px",
                                fontSize: "9px",
                                fontWeight: 700,
                              }}
                            >
                              Cloudinary
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                            title="Remove Photo"
                            style={{
                              position: "absolute",
                              top: "4px",
                              right: "4px",
                              background: "rgba(220, 38, 38, 0.85)",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "4px",
                              width: "22px",
                              height: "22px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: OVERVIEW & HIGHLIGHTS */}
          {activeTab === "highlights" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                  Trip Highlights & Key Features
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Shown as feature pills on the trip page. All items persist directly to database.
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>
                  Add Highlight Feature
                </label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                  <input
                    type="text"
                    placeholder="e.g. Abbey Falls Visit, Coffee Plantation Walk..."
                    value={newHighlight}
                    onChange={(e) => setNewHighlight(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddHighlight(); } }}
                    style={{
                      flex: 1,
                      padding: "9px 14px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddHighlight}
                    className="admin-btn admin-btn-primary"
                  >
                    <Plus size={15} /> Add Highlight
                  </button>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {highlights.map((h, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "#eaf5e9",
                        border: "1px solid #bbf7d0",
                        color: "#166534",
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      <Sparkles size={13} />
                      <span>{h}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveHighlight(h)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "#166534",
                          padding: "0 2px",
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ITINERARY */}
          {activeTab === "itinerary" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                  Day-by-Day Itinerary Plan
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Detailed sequence of daily adventures, pickup timings and sightseeing.
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {itinerary.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "16px",
                      background: "#f8fafc",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <span style={{ fontWeight: 700, fontSize: "13px", color: "#166534" }}>
                        Day {item.day}
                      </span>
                      {itinerary.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setItinerary(itinerary.filter((_, i) => i !== idx))}
                          style={{ border: "none", background: "transparent", color: "#b91c1c", cursor: "pointer", fontSize: "12px" }}
                        >
                          Remove Day
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Day Title (e.g. Arrival & Plantation Walk)"
                      value={item.title}
                      onChange={(e) => {
                        const copy = [...itinerary];
                        copy[idx].title = e.target.value;
                        setItinerary(copy);
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: 600,
                        marginBottom: "8px",
                      }}
                    />

                    <textarea
                      rows={3}
                      placeholder="Day activities and schedule details..."
                      value={item.description}
                      onChange={(e) => {
                        const copy = [...itinerary];
                        copy[idx].description = e.target.value;
                        setItinerary(copy);
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        fontSize: "12.5px",
                      }}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setItinerary([
                      ...itinerary,
                      {
                        day: itinerary.length + 1,
                        title: `Day ${itinerary.length + 1} Plan`,
                        description: "",
                      },
                    ])
                  }
                  className="admin-btn admin-btn-secondary"
                  style={{ alignSelf: "flex-start" }}
                >
                  <Plus size={14} /> Add Another Day
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: INCLUSIONS & EXCLUSIONS */}
          {activeTab === "inclusions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* Inclusions */}
              <div>
                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "8px", marginBottom: "12px" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#166534" }}>
                    What's Included
                  </h3>
                </div>

                <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                  <input
                    type="text"
                    placeholder="e.g. AC Travel, Resort Stay, Breakfast included..."
                    value={newInclusion}
                    onChange={(e) => setNewInclusion(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddInclusion(); } }}
                    style={{ flex: 1, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px" }}
                  />
                  <button type="button" onClick={handleAddInclusion} className="admin-btn admin-btn-primary" style={{ padding: "8px 12px" }}>
                    <Plus size={14} /> Add
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {inclusions.map((inc, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: "13px", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                        <CheckCircle2 size={15} color="#166534" /> {inc}
                      </span>
                      <button type="button" onClick={() => setInclusions(inclusions.filter((_, idx) => idx !== i))} style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer" }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Exclusions */}
              <div>
                <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "8px", marginBottom: "12px" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "#b91c1c" }}>
                    What's Not Included
                  </h3>
                </div>

                <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                  <input
                    type="text"
                    placeholder="e.g. Lunch on all days, personal water bottles..."
                    value={newExclusion}
                    onChange={(e) => setNewExclusion(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddExclusion(); } }}
                    style={{ flex: 1, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px" }}
                  />
                  <button type="button" onClick={handleAddExclusion} className="admin-btn admin-btn-secondary" style={{ padding: "8px 12px" }}>
                    <Plus size={14} /> Add
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {exclusions.map((exc, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: "13px", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                        <XCircle size={15} color="#b91c1c" /> {exc}
                      </span>
                      <button type="button" onClick={() => setExclusions(exclusions.filter((_, idx) => idx !== i))} style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer" }}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: THINGS TO CARRY */}
          {activeTab === "thingsToCarry" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                  Things to Carry Checklist
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Essential items, packing advice, and gear for travellers before boarding.
                </span>
              </div>

              <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                <input
                  type="text"
                  placeholder="e.g. Government ID card, trekking shoes, warm layer..."
                  value={newThingToCarry}
                  onChange={(e) => setNewThingToCarry(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddThingToCarry(); } }}
                  style={{ flex: 1, padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px" }}
                />
                <button type="button" onClick={handleAddThingToCarry} className="admin-btn admin-btn-primary" style={{ padding: "8px 12px" }}>
                  <Plus size={14} /> Add Item
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {thingsToCarry.map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                    <span style={{ fontSize: "13px", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                      <Luggage size={15} color="#166534" /> {item}
                    </span>
                    <button type="button" onClick={() => setThingsToCarry(thingsToCarry.filter((_, idx) => idx !== i))} style={{ border: "none", background: "transparent", color: "#94a3b8", cursor: "pointer" }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: PICKUP LOCATIONS */}
          {activeTab === "pickups" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #f1f5f9",
                  paddingBottom: "12px",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                    Pickup Locations & Boarding Hubs
                  </h3>
                  <span style={{ fontSize: "12.5px", color: "#64748b" }}>
                    Configure unlimited boarding points for this trip package. Each trip has its own pickup points.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAddPickup}
                  className="admin-btn admin-btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Plus size={15} /> Add Pickup Location
                </button>
              </div>

              {pickupLocations.length === 0 ? (
                <div
                  style={{
                    padding: "36px 20px",
                    textAlign: "center",
                    background: "#f8fafc",
                    borderRadius: "12px",
                    border: "1px dashed #cbd5e1",
                  }}
                >
                  <MapPin size={36} color="#94a3b8" style={{ margin: "0 auto 10px" }} />
                  <div style={{ fontWeight: 600, color: "#334155", fontSize: "14px" }}>
                    No pickup locations configured for this trip yet
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#64748b", margin: "4px auto 16px", maxWidth: "420px" }}>
                    Add boarding points where travellers can meet the trip captain. You can also configure specific departure date pickup times.
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddPickup}
                    className="admin-btn admin-btn-primary"
                  >
                    <Plus size={14} /> Add First Pickup Location
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {pickupLocations.map((loc, idx) => (
                    <div
                      key={loc._id || idx}
                      style={{
                        padding: "16px",
                        background: "#ffffff",
                        border: loc.isActive ? "1px solid #e2e8f0" : "1px dashed #cbd5e1",
                        borderRadius: "12px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                        opacity: loc.isActive ? 1 : 0.65,
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span
                            style={{
                              width: "26px",
                              height: "26px",
                              borderRadius: "6px",
                              background: "#eaf5e9",
                              color: "#166534",
                              fontWeight: 700,
                              fontSize: "12px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                              {loc.name}
                              <span
                                style={{
                                  fontSize: "11px",
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  fontWeight: 600,
                                  background: loc.isActive ? "#f0fdf4" : "#f1f5f9",
                                  color: loc.isActive ? "#166534" : "#64748b",
                                }}
                              >
                                {loc.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                            {loc.landmark && (
                              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                                Landmark: <strong>{loc.landmark}</strong>
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {/* Reorder buttons */}
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMovePickup(idx, "up")}
                            title="Move Up"
                            style={{
                              padding: "4px 8px",
                              border: "1px solid #e2e8f0",
                              borderRadius: "6px",
                              background: "#f8fafc",
                              cursor: idx === 0 ? "not-allowed" : "pointer",
                              color: idx === 0 ? "#cbd5e1" : "#475569",
                            }}
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            disabled={idx === pickupLocations.length - 1}
                            onClick={() => handleMovePickup(idx, "down")}
                            title="Move Down"
                            style={{
                              padding: "4px 8px",
                              border: "1px solid #e2e8f0",
                              borderRadius: "6px",
                              background: "#f8fafc",
                              cursor: idx === pickupLocations.length - 1 ? "not-allowed" : "pointer",
                              color: idx === pickupLocations.length - 1 ? "#cbd5e1" : "#475569",
                            }}
                          >
                            <ArrowDown size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTogglePickupActive(idx)}
                            style={{
                              padding: "4px 10px",
                              border: "1px solid #e2e8f0",
                              borderRadius: "6px",
                              background: loc.isActive ? "#fef2f2" : "#f0fdf4",
                              color: loc.isActive ? "#b91c1c" : "#166534",
                              fontSize: "11.5px",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {loc.isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditPickup(idx)}
                            style={{
                              padding: "4px 8px",
                              border: "1px solid #e2e8f0",
                              borderRadius: "6px",
                              background: "#ffffff",
                              color: "#166534",
                              cursor: "pointer",
                            }}
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePickup(idx)}
                            style={{
                              padding: "4px 8px",
                              border: "1px solid #fecaca",
                              borderRadius: "6px",
                              background: "#fef2f2",
                              color: "#b91c1c",
                              cursor: "pointer",
                            }}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Location Details */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "12px", alignItems: "center", background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", fontSize: "12.5px" }}>
                        <div>
                          {loc.address ? (
                            <div style={{ color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
                              <MapPin size={13} color="#64748b" style={{ flexShrink: 0 }} />
                              <span>{loc.address}</span>
                            </div>
                          ) : (
                            <span style={{ color: "#94a3b8", fontStyle: "italic" }}>No street address entered</span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600, color: "#166534", background: "#eaf5e9", padding: "3px 8px", borderRadius: "6px", fontSize: "12px" }}>
                            <Clock size={12} /> Standard: {loc.pickupTime || "10:00 PM"}
                          </span>
                          {loc.googleMapsUrl && (
                            <a
                              href={loc.googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#2563eb", textDecoration: "none", fontSize: "12px", fontWeight: 600 }}
                            >
                              <ExternalLink size={12} /> Google Maps
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Date Overrides */}
                      {Array.isArray(loc.dateOverrides) && loc.dateOverrides.length > 0 && (
                        <div style={{ borderLeft: "3px solid #166534", paddingLeft: "10px", fontSize: "12px" }}>
                          <span style={{ fontWeight: 600, color: "#166534" }}>Departure Date Overrides:</span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                            {loc.dateOverrides.map((ov, oIdx) => (
                              <span
                                key={oIdx}
                                style={{
                                  background: "#f1f5f9",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  color: "#334155",
                                  fontSize: "11.5px",
                                }}
                              >
                                📅 {ov.date || "Date"}: <strong>{ov.pickupTime}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: PREVIEW ON SITE */}
          {activeTab === "preview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                    Customer Website Live Mockup
                  </h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Real-time preview of how this trip appears to travellers on the Traviska booking portal.
                  </span>
                </div>

                <div style={{ display: "flex", gap: "4px" }}>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "none",
                      background: previewDevice === "mobile" ? "#166534" : "#f1f5f9",
                      color: previewDevice === "mobile" ? "#ffffff" : "#475569",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    <Smartphone size={14} /> Mobile
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "none",
                      background: previewDevice === "desktop" ? "#166534" : "#f1f5f9",
                      color: previewDevice === "desktop" ? "#ffffff" : "#475569",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    <Monitor size={14} /> Desktop
                  </button>
                </div>
              </div>

              {/* Embedded Site Card Mockup */}
              <div
                style={{
                  maxWidth: previewDevice === "mobile" ? "420px" : "100%",
                  margin: "0 auto",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ position: "relative", height: "220px", background: "#000" }}>
                  <img src={coverImage} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", bottom: "16px", left: "16px", color: "#fff", textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
                    <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>{title}</h2>
                    <div style={{ fontSize: "12px", opacity: 0.9 }}>{destination} • {duration}</div>
                  </div>
                </div>

                <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "22px", fontWeight: 800, color: "#166534" }}>
                        ₹{showOfferPrice ? offerPrice.toLocaleString("en-IN") : basePrice.toLocaleString("en-IN")}
                      </span>
                      {showOfferPrice && (
                        <span style={{ fontSize: "13px", color: "#94a3b8", textDecoration: "line-through", marginLeft: "8px" }}>
                          ₹{basePrice.toLocaleString("en-IN")}
                        </span>
                      )}
                      <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "4px" }}>/ person</span>
                    </div>

                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#b45309", background: "#fef3c7", padding: "4px 8px", borderRadius: "20px" }}>
                      ★ 4.9 (48 Reviews)
                    </span>
                  </div>

                  <p style={{ fontSize: "13px", color: "#334155", lineHeight: 1.5, margin: 0 }}>
                    {description}
                  </p>

                  <div>
                    <h4 style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 8px 0" }}>Highlights</h4>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {highlights.map((h, i) => (
                        <span key={i} style={{ fontSize: "11px", background: "#f1f5f9", padding: "4px 8px", borderRadius: "12px", color: "#475569" }}>
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "#166534",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: 700,
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    Book This Trip →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: REALTIME SIDE PANEL PREVIEW (Hidden in Full Preview Tab) */}
        {activeTab !== "preview" && (
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e7ecf0",
              borderRadius: "14px",
              padding: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#166534" }}>
                ✓ Customer Preview
              </span>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                style={{ fontSize: "11.5px", color: "#166534", fontWeight: 600, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
              >
                Expand View
              </button>
            </div>

            <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
              <div style={{ height: "140px", position: "relative" }}>
                <img src={coverImage} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", bottom: "8px", left: "8px", color: "#ffffff", textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
                  <div style={{ fontWeight: 700, fontSize: "14px" }}>{title}</div>
                  <div style={{ fontSize: "11px" }}>{destination}</div>
                </div>
              </div>

              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#166534" }}>
                    ₹{showOfferPrice ? offerPrice.toLocaleString("en-IN") : basePrice.toLocaleString("en-IN")}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>{duration}</div>
                </div>

                <div style={{ fontSize: "11px", color: "#64748b", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {highlights.slice(0, 3).map((h, i) => (
                    <span key={i} style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                      {h}
                    </span>
                  ))}
                  {highlights.length > 3 && (
                    <span style={{ color: "#166534", fontWeight: 600 }}>+{highlights.length - 3} more</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PICKUP LOCATION ADD / EDIT MODAL */}
      {isPickupModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            backdropFilter: "blur(3px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setIsPickupModalOpen(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "520px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
              border: "1px solid #e2e8f0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                  {editingPickupIndex !== null ? "Edit Pickup Location" : "Add Pickup Location"}
                </h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Boarding point for travellers joining this trip
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPickupModalOpen(false)}
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#64748b",
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePickupModal} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Pickup Point Name <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Majestic Metro Station (Exit Gate 3)"
                  value={pickupForm.name}
                  onChange={(e) => setPickupForm({ ...pickupForm, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Standard Pickup Time <span style={{ color: "#dc2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10:00 PM"
                    value={pickupForm.pickupTime}
                    onChange={(e) => setPickupForm({ ...pickupForm, pickupTime: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      fontSize: "13px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Status
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", height: "38px", cursor: "pointer", fontSize: "13px", color: "#334155" }}>
                    <input
                      type="checkbox"
                      checked={pickupForm.isActive}
                      onChange={(e) => setPickupForm({ ...pickupForm, isActive: e.target.checked })}
                      style={{ accentColor: "#166534", width: "16px", height: "16px" }}
                    />
                    <span>Active Point</span>
                  </label>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Full Street Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Platform Rd, Subhash Nagar, Sevashrama, Bengaluru 560023"
                  value={pickupForm.address}
                  onChange={(e) => setPickupForm({ ...pickupForm, address: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Landmark
                </label>
                <input
                  type="text"
                  placeholder="e.g. Opposite BMTC City Bus Terminal / Near ATM"
                  value={pickupForm.landmark}
                  onChange={(e) => setPickupForm({ ...pickupForm, landmark: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Google Maps URL
                </label>
                <input
                  type="url"
                  placeholder="e.g. https://maps.google.com/?q=Majestic+Bangalore"
                  value={pickupForm.googleMapsUrl}
                  onChange={(e) => setPickupForm({ ...pickupForm, googleMapsUrl: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* DATE OVERRIDES SECTION */}
              <div style={{ marginTop: "6px", padding: "14px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 600, fontSize: "12.5px", color: "#166534", marginBottom: "2px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Calendar size={14} /> Date-Specific Pickup Times (Optional)
                </div>
                <p style={{ fontSize: "11.5px", color: "#64748b", margin: "0 0 10px 0" }}>
                  Configure different boarding times for specific departure dates (e.g., peak holiday traffic).
                </p>

                {tripSlots.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr auto", gap: "8px", alignItems: "center" }}>
                      <select
                        value={newOverrideSlotId}
                        onChange={(e) => setNewOverrideSlotId(e.target.value)}
                        style={{
                          padding: "7px 10px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          fontSize: "12px",
                          background: "#ffffff",
                        }}
                      >
                        <option value="">Select Departure Date</option>
                        {tripSlots.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.date}
                          </option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Time (e.g. 09:30 PM)"
                        value={newOverrideTime}
                        onChange={(e) => setNewOverrideTime(e.target.value)}
                        style={{
                          padding: "7px 10px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          fontSize: "12px",
                        }}
                      />

                      <button
                        type="button"
                        onClick={handleAddDateOverride}
                        style={{
                          padding: "7px 12px",
                          background: "#166534",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        + Add
                      </button>
                    </div>

                    {pickupForm.dateOverrides.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                        {pickupForm.dateOverrides.map((ov, oIdx) => (
                          <div
                            key={oIdx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 10px",
                              background: "#ffffff",
                              borderRadius: "6px",
                              border: "1px solid #e2e8f0",
                              fontSize: "12px",
                            }}
                          >
                            <span>
                              Departure: <strong>{ov.date}</strong> → Pickup: <strong>{ov.pickupTime}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDateOverride(oIdx)}
                              style={{ border: "none", background: "none", color: "#dc2626", cursor: "pointer", fontSize: "14px", fontWeight: 700 }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: "11.5px", color: "#94a3b8", fontStyle: "italic" }}>
                    No departure dates found for this trip. Schedule departures in Trips → Departures & Slots first to set date-specific overrides.
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                <button
                  type="button"
                  onClick={() => setIsPickupModalOpen(false)}
                  className="admin-btn admin-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                >
                  {editingPickupIndex !== null ? "Update Pickup Point" : "Add Pickup Point"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INTERACTIVE COVER IMAGE CROP MODAL */}
      {isCropModalOpen && cropImageSrc && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(5px)",
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "680px",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "92vh",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "#e8f5e9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#064e3b",
                  }}
                >
                  <Crop size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                    Crop Cover Photo
                  </h3>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Drag, zoom, and select which area of the photo is visible in cover preview
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !uploadingCropped && setIsCropModalOpen(false)}
                style={{
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "8px",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body / Cropper Area */}
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}>
              {/* Aspect Ratio Switcher */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "#475569" }}>
                  Cover Aspect Ratio Framing:
                </span>
                <div style={{ display: "inline-flex", background: "#f1f5f9", borderRadius: "8px", padding: "2px", gap: "3px" }}>
                  {[
                    { label: "16:9 Banner (Recommended)", ratio: 16 / 9 },
                    { label: "2:1 Wide", ratio: 2 / 1 },
                    { label: "4:3 Standard", ratio: 4 / 3 },
                    { label: "1:1 Square", ratio: 1 },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setAspectRatio(opt.ratio)}
                      style={{
                        padding: "4px 9px",
                        fontSize: "11px",
                        fontWeight: 600,
                        borderRadius: "6px",
                        border: "none",
                        background: Math.abs(aspectRatio - opt.ratio) < 0.01 ? "#ffffff" : "transparent",
                        color: Math.abs(aspectRatio - opt.ratio) < 0.01 ? "#064e3b" : "#64748b",
                        boxShadow: Math.abs(aspectRatio - opt.ratio) < 0.01 ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                        cursor: "pointer",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cropper Container */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: "360px",
                  background: "#090d16",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: "inset 0 0 10px rgba(0,0,0,0.5)",
                }}
              >
                <Cropper
                  image={cropImageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspectRatio}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                />
              </div>

              {/* Zoom Slider & Adjustments */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  padding: "10px 14px",
                  borderRadius: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "12px", fontWeight: 600 }}>
                  <ZoomOut size={15} />
                  <span>Zoom</span>
                </div>

                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "#064e3b", cursor: "pointer" }}
                />

                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", fontSize: "12px", fontWeight: 600 }}>
                  <ZoomIn size={15} />
                  <span>{Math.round(zoom * 100)}%</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                  }}
                  style={{
                    padding: "4px 8px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#475569",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <RotateCcw size={12} /> Reset
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid #e2e8f0",
                background: "#f8fafc",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                Selected region will be uploaded directly to Cloudinary
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  disabled={uploadingCropped}
                  onClick={() => setIsCropModalOpen(false)}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    background: "#ffffff",
                    color: "#334155",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: uploadingCropped ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>

                {rawCoverFile && (
                  <button
                    type="button"
                    disabled={uploadingCropped}
                    onClick={() => {
                      setIsCropModalOpen(false);
                      handleUploadCoverFile(rawCoverFile);
                    }}
                    style={{
                      padding: "8px 14px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      background: "#f8fafc",
                      color: "#475569",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: uploadingCropped ? "not-allowed" : "pointer",
                    }}
                  >
                    Skip Crop (Use Original)
                  </button>
                )}

                <button
                  type="button"
                  disabled={uploadingCropped}
                  onClick={handleApplyCropAndUpload}
                  className="admin-btn admin-btn-primary"
                  style={{
                    padding: "8px 18px",
                    fontSize: "12.5px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {uploadingCropped ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Cropping & Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Apply Crop & Upload</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditTrip;
