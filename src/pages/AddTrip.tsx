
import { useEffect, useState } from "react";
import axios from "axios";
import Cropper from "react-easy-crop";
import { API_BASE_URL } from "../api";

const createImage = (
  url: string
): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });

const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: any
): Promise<Blob> => {
  const image = await createImage(imageSrc);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas context not available");
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
        if (blob) {
          resolve(blob);
        } else {
          reject(
            new Error("Failed to create cropped image")
          );
        }
      },
      "image/png"
    );
  });
};

function AddTrip() {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [image] = useState("");
  const [description, setDescription] = useState("");

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [showCropper, setShowCropper] = useState(false);
  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState<any>(null);

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [cropImageUrl, setCropImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  const [galleryFiles, setGalleryFiles] =
    useState<File[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Release temporary browser image URLs when replaced.
  useEffect(() => {
    return () => {
      if (cropImageUrl) {
        URL.revokeObjectURL(cropImageUrl);
      }
    };
  }, [cropImageUrl]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageSelection = (
    file: File | null
  ) => {
    setImageFile(file);
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setImagePreview("");

    if (file) {
      setCropImageUrl(
        URL.createObjectURL(file)
      );
      setShowCropper(true);
    } else {
      setCropImageUrl("");
      setShowCropper(false);
    }
  };

  const handleCrop = async () => {
    if (
      !imageFile ||
      !cropImageUrl ||
      !croppedAreaPixels
    ) {
      return;
    }

    try {
      const croppedBlob = await getCroppedImg(
        cropImageUrl,
        croppedAreaPixels
      );

      const croppedFile = new File(
        [croppedBlob],
        "trip-image.png",
        { type: "image/png" }
      );

      setImageFile(croppedFile);
      setImagePreview(
        URL.createObjectURL(croppedFile)
      );
      setShowCropper(false);
    } catch (error) {
      console.error("Crop failed:", error);
      alert("Unable to crop image. Please try again.");
    }
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error(
        "Admin login required. Please log in again."
      );
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  };

  const uploadImage = async (
    file: File
  ): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);

    const uploadResponse = await axios.post(
      `${API_BASE_URL}/upload`,
      formData,
      {
        headers: getAuthHeaders(),
      }
    );

       const imageUrl = uploadResponse.data.url;

    if (!imageUrl) {
      throw new Error("Image upload failed");
    }

    return imageUrl;
  };

  const handleAddTrip = async () => {
    if (isSubmitting) {
      return;
    }

    if (
      !title.trim() ||
      !location.trim() ||
      !duration.trim() ||
      !price ||
      !description.trim()
    ) {
      alert("Please fill in all trip details.");
      return;
    }

    if (
      !Number.isFinite(Number(price)) ||
      Number(price) <= 0
    ) {
      alert("Please enter a valid trip price.");
      return;
    }

    if (showCropper) {
      alert(
        "Please apply the image crop before adding the trip."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = image;

      // Upload main trip image.
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      // Upload gallery images.
      const galleryUrls: string[] = [];

      for (const file of galleryFiles) {
        const uploadedUrl = await uploadImage(file);
        galleryUrls.push(uploadedUrl);
      }

      // Create the trip in the backend.
      await axios.post(
        `${API_BASE_URL}/trips`,
        {
          title: title.trim(),
          location: location.trim(),
          duration: duration.trim(),
          price: Number(price),
          image: imageUrl,
          photos: galleryUrls,
          description: description.trim(),
        },
        {
          headers: getAuthHeaders(),
        }
      );

      alert("Trip added successfully!");
    } catch (error) {
      console.error("Failed to add trip:", error);
      alert(
        "Failed to add trip. Please check your admin login and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "700px",
        margin: "40px auto",
        background: "#fff",
        padding: "30px",
        borderRadius: "16px",
        boxShadow:
          "0 10px 25px rgba(0,0,0,0.08)",
      }}
    >
      <h2 style={{ marginBottom: "20px" }}>
        Add New Trip
      </h2>

      <input
        type="text"
        placeholder="Trip Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={inputStyle}
      />

      <input
        type="text"
        placeholder="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        style={inputStyle}
      />

      <input
        type="text"
        placeholder="Duration"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        style={inputStyle}
      />

      <input
        type="number"
        placeholder="Price"
        min="1"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        style={inputStyle}
      />

      <label
        style={{
          display: "block",
          marginBottom: "8px",
          fontWeight: "600",
        }}
      >
        Main Trip Image
      </label>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file =
            e.target.files?.[0] || null;

          handleImageSelection(file);
        }}
        style={inputStyle}
      />

      <label
        style={{
          display: "block",
          marginTop: "20px",
          marginBottom: "8px",
          fontWeight: "600",
        }}
      >
        Trip Gallery Photos
      </label>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          setGalleryFiles(
            Array.from(e.target.files || [])
          );
        }}
        style={inputStyle}
      />

      {showCropper && imageFile && cropImageUrl && (
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "350px",
            background: "#111",
            marginTop: "20px",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <Cropper
            image={cropImageUrl}
            crop={crop}
            zoom={zoom}
            aspect={16 / 9}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, croppedPixels) =>
              setCroppedAreaPixels(
                croppedPixels
              )
            }
          />
        </div>
      )}

      {showCropper && imageFile && (
        <>
          <div style={{ marginTop: "15px" }}>
            <label>Zoom</label>

            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) =>
                setZoom(Number(e.target.value))
              }
              style={{ width: "100%" }}
            />
          </div>

          <button
            type="button"
            onClick={handleCrop}
            style={{
              marginTop: "15px",
              padding: "12px 24px",
              border: "none",
              borderRadius: "8px",
              background: "#ff6b00",
              color: "#fff",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Apply Crop
          </button>
        </>
      )}

      {imagePreview && !showCropper && (
        <div style={{ marginTop: "20px" }}>
          <p
            style={{
              fontWeight: "600",
              marginBottom: "10px",
            }}
          >
            Cropped Image Preview
          </p>

          <img
            src={imagePreview}
            alt="Cropped preview"
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              borderRadius: "12px",
            }}
          />
        </div>
      )}

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) =>
          setDescription(e.target.value)
        }
        style={{
          ...inputStyle,
          height: "120px",
          resize: "none",
        }}
      />

      <button
        type="button"
        onClick={handleAddTrip}
        disabled={isSubmitting}
        style={{
          width: "100%",
          padding: "14px",
          background: "#ff6b00",
          color: "#fff",
          border: "none",
          borderRadius: "10px",
          cursor: isSubmitting
            ? "not-allowed"
            : "pointer",
          opacity: isSubmitting ? 0.7 : 1,
          fontSize: "16px",
        }}
      >
        {isSubmitting
          ? "Adding Trip..."
          : "Add Trip"}
      </button>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "15px",
  borderRadius: "8px",
  border: "1px solid #ddd",
  fontSize: "16px",
  boxSizing: "border-box" as const,
};

export default AddTrip;
