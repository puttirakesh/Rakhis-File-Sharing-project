import React, { useState } from "react";

function FileUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!file) {
      alert("Please select a file first");
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "your_unsigned_preset"); // 🔹 Replace with your Cloudinary preset

    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dq9p6c2yq/auto/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      console.log("Uploaded file:", data);

      setUploadedUrl(data.secure_url); // store uploaded file URL
      setUploading(false);
    } catch (err) {
      console.error("Upload failed:", err);
      setUploading(false);
    }
  };

  return (
    <div className="p-4">
      <input type="file" onChange={handleFileChange} />
      <button
        onClick={handleFileUpload}
        disabled={uploading}
        className="ml-2 p-2 bg-blue-500 text-white rounded"
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {uploadedUrl && (
        <div className="mt-4">
          <p>Uploaded File:</p>
          <a href={uploadedUrl} target="_blank" rel="noopener noreferrer">
            {uploadedUrl}
          </a>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
