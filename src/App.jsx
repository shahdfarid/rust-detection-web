import React, { useState, useRef } from "react";
import "./App.css";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

// Import your logo from src
import rustRadarLogo from "./rustRadar_logo.png";


function App() {
  const [images, setImages] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const API_URL = "https://mariamlabib-corrosion-detection-api.hf.space/predict/";

  const sendToAPI = async (file, url) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(API_URL, { method: "POST", body: formData });
      const data = await res.json();

      const boxes = (data.detections || []).map((d) => {
        const conf = d.confidence;
        const status = conf >= 0.7 ? "SAFE" : "ALARM";
        const color = conf >= 0.7 ? "green" : "red";

        return {
          x: d.bbox[0],
          y: d.bbox[1],
          width: d.bbox[2] - d.bbox[0],
          height: d.bbox[3] - d.bbox[1],
          status,
          confidence: conf,
          color,
        };
      });

      setImages((prev) =>
        prev.map((img) => (img.url === url ? { ...img, boxes } : img))
      );
    } catch (err) {
      console.error("API error:", err);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      setImages((prev) => [...prev, { url, boxes: [] }]);
      sendToAPI(file, url);
    });
    setShowCamera(false);
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const captureSnapshot = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = 640;
    canvas.height = 640;
    ctx.drawImage(video, 0, 0, 640, 640);

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      setImages((prev) => [...prev, { url, boxes: [] }]);
      sendToAPI(blob, url);
    }, "image/png");

    // Stop camera
    const tracks = video.srcObject.getTracks();
    tracks.forEach((track) => track.stop());
    setShowCamera(false);
  };

  return (
    <div className="dashboard">
      <div className="sidebar">
        <div className="logo">
          <img src={rustRadarLogo} alt="Rust Radar Logo" />
          <h2>Rust Radar</h2>
        </div>

        <button className="btn" onClick={startCamera}>
          <CameraAltIcon /> Live
        </button>

        <label className="btn upload">
          <UploadFileIcon /> Upload
          <input type="file" hidden multiple onChange={handleImageUpload} />
        </label>
      </div>

      <div className="main">
        <h1>AI-Powered Corrosion Detection</h1>

        <div className="content">
          {showCamera ? (
            <div className="image-box camera-box">
              <video ref={videoRef} autoPlay playsInline />
              <button className="btn capture" onClick={captureSnapshot}>
                Capture
              </button>
              <canvas ref={canvasRef} hidden></canvas>
            </div>
          ) : images.length > 0 ? (
            images.map((imgObj, idx) => (
              <div key={idx} className="image-box dynamic-box">
                <div style={{ position: "relative", width: 640, height: 640 }}>
                  <img src={imgObj.url} alt={`Uploaded ${idx + 1}`} />
                  {imgObj.boxes.map((box, i) => (
                    <div
                      key={i}
                      className="rust-box"
                      style={{
                        top: box.y,
                        left: box.x,
                        width: box.width,
                        height: box.height,
                        borderColor: box.color,
                        borderStyle: "solid",
                        borderWidth: 3,
                      }}
                    >
                      <span
                        className="rust-label"
                        style={{ backgroundColor: box.color }}
                      >
                        {box.status} ({Math.round(box.confidence * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() =>
                    setImages((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="delete-btn"
                >
                  ✕
                </button>
              </div>
            ))
          ) : (
            <div className="image-box upload-placeholder">
              <label className="choose">
                <CloudUploadIcon />
                <p>CHOOSE IMAGES</p>
                <input type="file" hidden multiple onChange={handleImageUpload} />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
