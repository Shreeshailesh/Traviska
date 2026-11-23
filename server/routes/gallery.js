const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const GalleryItem = require("../models/GalleryItem");

// Configure Multer memory storage for gallery uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 60 * 1024 * 1024, // 60MB limit for high-res images and videos
  },
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || "").toLowerCase();
    const isImage = mime.startsWith("image/");
    const isVideo = mime.startsWith("video/");

    if (!isImage && !isVideo) {
      return cb(new Error("Only images (JPG, PNG, WebP) and videos (MP4, WebM, MOV) are allowed"));
    }
    cb(null, true);
  },
});

module.exports = function ({ authMiddleware, adminMiddleware }) {
  const router = express.Router();

  // Helper to upload a buffer to Cloudinary
  const uploadToCloudinary = (fileBuffer, isVideo) => {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: "traviska/gallery",
        resource_type: isVideo ? "video" : "image",
      };

      if (!isVideo) {
        // Optimize images automatically
        uploadOptions.quality = "auto:good";
        uploadOptions.fetch_format = "auto";
      }

      const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
      stream.end(fileBuffer);
    });
  };

  // =========================================================================
  // PUBLIC ENDPOINTS
  // =========================================================================

  /**
   * GET /gallery
   * Public read-only endpoint returning all visible gallery items sorted by row and order.
   */
  router.get("/gallery", async (req, res) => {
    try {
      const items = await GalleryItem.find({ isVisible: true })
        .sort({ row: 1, order: 1, createdAt: -1 })
        .lean();

      const top = items.filter((i) => i.row === "top");
      const bottom = items.filter((i) => i.row === "bottom");

      res.setHeader("Cache-Control", "public, max-age=30, must-revalidate");
      res.json({
        success: true,
        items,
        top,
        bottom,
      });
    } catch (err) {
      console.error("Failed to fetch gallery items:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch gallery items",
      });
    }
  });

  // =========================================================================
  // ADMIN PROTECTED ENDPOINTS
  // =========================================================================

  /**
   * GET /admin/gallery
   * Admin endpoint returning all items (both visible and hidden).
   */
  router.get("/admin/gallery", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const items = await GalleryItem.find()
        .sort({ row: 1, order: 1, createdAt: -1 })
        .lean();

      res.json({
        success: true,
        items,
      });
    } catch (err) {
      console.error("Admin: failed to fetch gallery items:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch admin gallery items",
      });
    }
  });

  /**
   * POST /admin/gallery/upload
   * Upload multiple photos and/or videos to Cloudinary and create gallery items.
   */
  router.post(
    "/admin/gallery/upload",
    authMiddleware,
    adminMiddleware,
    (req, res, next) => {
      upload.array("files", 12)(req, res, (err) => {
        if (err) {
          return res.status(400).json({
            success: false,
            message: err.message || "File upload error",
          });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({
            success: false,
            message: "No files provided for upload",
          });
        }

        const targetRow = req.body.row === "bottom" ? "bottom" : "top";

        // Find current max order for this row
        const lastItem = await GalleryItem.findOne({ row: targetRow }).sort({ order: -1 });
        let currentOrder = lastItem && typeof lastItem.order === "number" ? lastItem.order + 1 : 0;

        const createdItems = [];

        for (const file of req.files) {
          const isVideo = (file.mimetype || "").toLowerCase().startsWith("video/");
          const mediaType = isVideo ? "video" : "image";

          const uploadResult = await uploadToCloudinary(file.buffer, isVideo);

          let thumbnailUrl = "";
          if (isVideo) {
            // Generate video thumbnail snapshot from Cloudinary URL or public ID
            thumbnailUrl = uploadResult.secure_url.replace(/\.[^/.]+$/, ".jpg");
          } else {
            thumbnailUrl = uploadResult.secure_url;
          }

          const newItem = await GalleryItem.create({
            mediaType,
            mediaUrl: uploadResult.secure_url,
            cloudinaryPublicId: uploadResult.public_id,
            thumbnailUrl,
            row: targetRow,
            order: currentOrder++,
            title: req.body.title || file.originalname || "",
            isVisible: true,
          });

          createdItems.push(newItem);
        }

        res.status(201).json({
          success: true,
          message: `Successfully uploaded ${createdItems.length} item(s)`,
          items: createdItems,
        });
      } catch (err) {
        console.error("Failed to upload gallery media:", err);
        res.status(500).json({
          success: false,
          message: err.message || "Failed to upload gallery media",
        });
      }
    }
  );

  /**
   * POST /admin/gallery
   * Create gallery item with custom/existing URL.
   */
  router.post("/admin/gallery", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { mediaType, mediaUrl, cloudinaryPublicId, thumbnailUrl, row, order, title, isVisible } = req.body;

      if (!mediaUrl) {
        return res.status(400).json({
          success: false,
          message: "Media URL is required",
        });
      }

      const item = await GalleryItem.create({
        mediaType: mediaType === "video" ? "video" : "image",
        mediaUrl,
        cloudinaryPublicId: cloudinaryPublicId || `manual_${Date.now()}`,
        thumbnailUrl: thumbnailUrl || mediaUrl,
        row: row === "bottom" ? "bottom" : "top",
        order: typeof order === "number" ? order : 0,
        title: title || "",
        isVisible: typeof isVisible === "boolean" ? isVisible : true,
      });

      res.status(201).json({
        success: true,
        item,
      });
    } catch (err) {
      console.error("Failed to create gallery item:", err);
      res.status(500).json({
        success: false,
        message: "Failed to create gallery item",
      });
    }
  });

  /**
   * PUT /admin/gallery/reorder
   * Batch update order and row assignments for multiple items.
   */
  router.put("/admin/gallery/reorder", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({
          success: false,
          message: "Items array is required",
        });
      }

      const updatePromises = items.map((item) => {
        const updateData = {};
        if (typeof item.order === "number") updateData.order = item.order;
        if (item.row && ["top", "bottom"].includes(item.row)) updateData.row = item.row;
        if (typeof item.isVisible === "boolean") updateData.isVisible = item.isVisible;

        return GalleryItem.findByIdAndUpdate(item.id || item._id, { $set: updateData });
      });

      await Promise.all(updatePromises);

      res.json({
        success: true,
        message: "Gallery items reordered successfully",
      });
    } catch (err) {
      console.error("Failed to reorder gallery items:", err);
      res.status(500).json({
        success: false,
        message: "Failed to reorder gallery items",
      });
    }
  });

  /**
   * PUT /admin/gallery/:id
   * Update a single gallery item (row, order, isVisible, title).
   */
  router.put("/admin/gallery/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { row, order, isVisible, title } = req.body;
      const item = await GalleryItem.findById(req.params.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Gallery item not found",
        });
      }

      if (row && ["top", "bottom"].includes(row)) item.row = row;
      if (typeof order === "number") item.order = order;
      if (typeof isVisible === "boolean") item.isVisible = isVisible;
      if (typeof title === "string") item.title = title;

      await item.save();

      res.json({
        success: true,
        item,
      });
    } catch (err) {
      console.error("Failed to update gallery item:", err);
      res.status(500).json({
        success: false,
        message: "Failed to update gallery item",
      });
    }
  });

  /**
   * DELETE /admin/gallery/:id
   * Verify ownership via database record, delete from Cloudinary, then delete from MongoDB.
   */
  router.delete("/admin/gallery/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const item = await GalleryItem.findById(req.params.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Gallery item not found",
        });
      }

      // Safe Cloudinary deletion using the verified public ID stored in MongoDB
      if (item.cloudinaryPublicId && !item.cloudinaryPublicId.startsWith("manual_")) {
        try {
          await cloudinary.uploader.destroy(item.cloudinaryPublicId, {
            resource_type: item.mediaType === "video" ? "video" : "image",
          });
        } catch (cloudErr) {
          console.warn(`Cloudinary deletion warning for ${item.cloudinaryPublicId}:`, cloudErr.message);
          // Continue deleting document even if Cloudinary file was already removed
        }
      }

      await GalleryItem.findByIdAndDelete(req.params.id);

      res.json({
        success: true,
        message: "Gallery item deleted successfully",
      });
    } catch (err) {
      console.error("Failed to delete gallery item:", err);
      res.status(500).json({
        success: false,
        message: "Failed to delete gallery item",
      });
    }
  });

  return router;
};

