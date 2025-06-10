const express = require("express");
const multer = require("multer");
const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");

console.log("🚀 server.js has started");

const app = express();
dotenv.config();

// Middleware
app.use(express.json());
app.use(express.static("public"));
app.use('/uploads', express.static('uploads'));

// Ensure "uploads" folder exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer setup
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.fieldname + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Helper to save video metadata
function saveVideoMetadata(metadata) {
  const metaPath = path.join(__dirname, 'videos.json');
  let videos = [];
  if (fs.existsSync(metaPath)) {
    try {
      videos = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch (e) {
      videos = [];
    }
  }
  videos.unshift(metadata); // add newest first
  fs.writeFileSync(metaPath, JSON.stringify(videos, null, 2));
}

// Check passkey route
app.post("/verify", (req, res) => {
  const { passkey } = req.body;
  if (passkey === process.env.PASSKEY) {
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

// Upload route
app.post("/upload", upload.fields([
  { name: "video", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 }
]), (req, res) => {
  console.log('--- Upload Attempt ---');
  console.log('Body:', req.body);
  console.log('Files:', req.files);
  try {
    const { title } = req.body;
    const videoFile = req.files && req.files.video ? req.files.video[0] : null;
    const thumbFile = req.files && req.files.thumbnail ? req.files.thumbnail[0] : null;

    if (!title || !videoFile || !thumbFile) {
      console.error('Missing field:', { title, videoFile, thumbFile });
      return res.status(400).send("Missing title, video, or thumbnail.");
    }

    // Save metadata
    saveVideoMetadata({
      title,
      video: videoFile.filename,
      thumbnail: thumbFile.filename,
      uploadedAt: new Date().toISOString()
    });

    res.send("Upload successful ✅");
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).send("Server error: " + err.message);
  }
});

// Endpoint to get all videos
app.get("/videos", (req, res) => {
  const metaPath = path.join(__dirname, 'videos.json');
  let videos = [];
  if (fs.existsSync(metaPath)) {
    try {
      videos = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch (e) {
      videos = [];
    }
  }
  res.json(videos);
});

// Start the server
app.listen(3000, () => {
  console.log("🔥 Server running on http://localhost:3000");
});
