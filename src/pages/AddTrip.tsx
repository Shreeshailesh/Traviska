import { useState } from "react";
import axios from "axios";
import Cropper from "react-easy-crop";

function AddTrip() {
  const createImage = (url: string): Promise<HTMLImageElement> =>
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

  ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";

 canvas.width = Math.round(pixelCrop.width);
canvas.height = Math.round(pixelCrop.height);

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
          reject(new Error("Failed to create cropped image"));
        }
      },
      "image/png",
      1.0
    );
  });
};

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");
const [crop, setCrop] = useState({ x: 0, y: 0 });
const [zoom, setZoom] = useState(1);
const [showCropper, setShowCropper] = useState(false);

const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

const [imageFile, setImageFile] = useState<File | null>(null);
const [imagePreview, setImagePreview] = useState("");
const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

const handleCrop = async () => {
    if (!imageFile || !croppedAreaPixels) return;

      try {
        const imageUrl = URL.createObjectURL(imageFile);
        console.log("Cropped width:", croppedAreaPixels?.width);
console.log("Cropped height:", croppedAreaPixels?.height);
        const croppedBlob = await getCroppedImg(
  imageUrl,
  croppedAreaPixels
);

const croppedFile = new File(
  [croppedBlob],
  "trip-image.jpg",
  { type: "image/jpeg" }
);
setImageFile(croppedFile);
setImagePreview(URL.createObjectURL(croppedFile));
setShowCropper(false);
URL.revokeObjectURL(imageUrl);
        } catch (error) {
  console.error("Crop failed:", error);
}
};

  const handleAddTrip = async () => {
  try {
    let imageUrl = image;

    if (imageFile) {
      const formData = new FormData();
      formData.append("image", imageFile);

      const uploadResponse = await axios.post(
        "http://localhost:5001/upload",
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      imageUrl = `http://localhost:5001/uploads/${uploadResponse.data.filename}`;
    }

    const galleryUrls: string[] = [];

for (const file of galleryFiles) {
  const formData = new FormData();
  formData.append("image", file);

  const uploadResponse = await axios.post(
    "http://localhost:5001/upload",
    formData,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    }
  );

  galleryUrls.push(
    `http://localhost:5001/uploads/${uploadResponse.data.filename}`
  );
}

    await axios.post(
      "http://localhost:5001/trips",
      {
        title,
        location,
        duration,
        price: Number(price),
        image: imageUrl,
photos: galleryUrls,
description,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    alert("Trip added successfully!");
  } catch (error) {
    console.error(error);
    alert("Failed to add trip");
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
        boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
      }}
    >
      <h2 style={{ marginBottom: "20px" }}>Add New Trip</h2>

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
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        style={inputStyle}
      />

     <input
  type="file"
  accept="image/*"
  onChange={(e) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);

    if (file) {
      setShowCropper(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  }}
  style={inputStyle}
/>
<label style={{ display: "block", marginTop: "20px", fontWeight: "600" }}>
  Trip Gallery Photos
</label>

<input
  type="file"
  accept="image/*"
  multiple
  onChange={(e) => {
    setGalleryFiles(Array.from(e.target.files || []));
  }}
  style={inputStyle}
/>

{showCropper && imageFile && (
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
      image={URL.createObjectURL(imageFile)}
      crop={crop}
      zoom={zoom}
      aspect={16 / 9}
      onCropChange={setCrop}
      onZoomChange={setZoom}
      onCropComplete={(_, croppedPixels) =>
  setCroppedAreaPixels(croppedPixels)
}
    />
  </div>
)}

{showCropper && imageFile && (
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
)}
{imagePreview && !showCropper && (
  <div style={{ marginTop: "20px" }}>
    <p style={{ fontWeight: "600", marginBottom: "10px" }}>
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

{showCropper && imageFile && (
  <div style={{ marginTop: "15px" }}>
    <label>Zoom</label>

    <input
      type="range"
      min={1}
      max={3}
      step={0.1}
      value={zoom}
      onChange={(e) => setZoom(Number(e.target.value))}
      style={{ width: "100%" }}
    />
  </div>
)}

      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={{
          ...inputStyle,
          height: "120px",
          resize: "none",
        }}
      />

     <button
  onClick={handleAddTrip}
  style={{
    width: "100%",
    padding: "14px",
    background: "#ff6b00",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
  }}
>
  Add Trip
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