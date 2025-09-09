const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

const crypto = require('crypto');

app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error("MongoDB connection error:", err));

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000', // Local development
  'http://localhost:5173', // Vite default port
  'https://chandan-kumars-educational-resource-hub-23qt.onrender.com', // Your production frontend
  process.env.VITE_CLIENT_URL // Environment variable
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Log blocked origins for debugging
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Schemas
const topicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const fileSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number },
  fileType: { type: String, required: true },
  publicId: { type: String, required: true },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["teacher", "student"], default: "student" },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: { type: Date, default: Date.now },
});

const Topic = mongoose.model("Topic", topicSchema);
const File = mongoose.model("File", fileSchema);
const User = mongoose.model("User", userSchema);

// Cloudinary Setup
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let resource_type = "raw"; // Default for non-image/video files
    if (file.mimetype.startsWith("image")) resource_type = "image";
    else if (file.mimetype.startsWith("video")) resource_type = "video";
    return {
      folder: `uploads`,
      public_id: `file-${Date.now()}-${file.originalname}`,
      resource_type: "auto",
    };
  },
});

  const upload = multer({ storage });

// Helper to determine resource type from MIME type
const getResourceType = (mimeType) => {
  if (mimeType.startsWith("image")) return "image";
  if (mimeType.startsWith("video")) return "video";
  return "raw"; // PDFs, docs, etc.
};

// Auth Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    res.status(401).json({ message: "Token is not valid" });
  }
};

const requireTeacher = (req, res, next) => {
  if (req.user.role !== "teacher") {
    return res.status(403).json({ message: "Access denied. Teacher privileges required." });
  }
  next();
};

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, role, teacherKey } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    if (role === "teacher" && teacherKey !== process.env.TEACHER_KEY) {
      return res.status(400).json({ message: "Invalid teacher key" });
    }

    user = new User({ name, email, password, role: role || "student" });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    const payload = { id: user.id };
    jwt.sign(
      payload,
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "7d" },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: { id: user.id, name, email, role: user.role } });
      }
    );
  } catch (error) {
    console.error("Register error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password, teacherKey } = req.body;
    if (teacherKey) {
      if (teacherKey !== process.env.TEACHER_KEY) {
        return res.status(400).json({ message: "Invalid teacher key" });
      }
      let teacher = await User.findOne({ email: "teacher@default.com", role: "teacher" });
      if (!teacher) {
        teacher = new User({
          name: "Default Teacher",
          email: "teacher@default.com",
          password: await bcrypt.hash("dummy", 10),
          role: "teacher"
        });
        await teacher.save();
      }
      const payload = { id: teacher.id };
      const token = jwt.sign(payload, process.env.JWT_SECRET || "fallback_secret", { expiresIn: "7d" });
      return res.json({
        token,
        user: { id: teacher.id, name: teacher.name, email: teacher.email, role: teacher.role },
      });
    } else {
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: "Invalid credentials" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

      const payload = { id: user.id };
      jwt.sign(
        payload,
        process.env.JWT_SECRET || "fallback_secret",
        { expiresIn: "7d" },
        (err, token) => {
          if (err) throw err;
          res.json({
            token,
            user: { id: user.id, name: user.name, email, role: user.role },
          });
        }
      );
    }
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/topics", async (req, res) => {
  try {
    const topics = await Topic.find().sort({ createdAt: -1 });
    res.json(topics);
  } catch (error) {
    console.error("Get topics error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/topics", auth, requireTeacher, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });
    const topic = new Topic({ title, description });
    await topic.save();
    res.status(201).json(topic);
  } catch (error) {
    console.error("Create topic error:", error.message);
    res.status(400).json({ message: error.message });
  }
});

app.post("/api/upload", auth, requireTeacher, upload.array("files"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    const { topicId } = req.body;
    const topic = await Topic.findById(topicId);
    if (!topic) return res.status(404).json({ message: "Topic not found" });

    const files = [];
    for (const file of req.files) {
      if (!file.path || !file.filename) {
        console.error("Cloudinary response missing fields:", file);
        return res.status(500).json({ message: "Cloudinary upload failed: Missing path or filename" });
      }
      const newFile = new File({
        originalName: file.originalname,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size || 0,
        fileType: file.mimetype,
        publicId: file.filename,
        topic: topicId,
      });
      await newFile.save();
      files.push(newFile);
    }

    res.status(201).json(files);
  } catch (error) {
    console.error("Upload error:", error.message, error.stack);
    res.status(500).json({ message: `Upload failed: ${error.message}` });
  }
});

app.get("/api/topics/:topicId/files", async (req, res) => {
  try {
    const files = await File.find({ topic: req.params.topicId }).sort({ uploadedAt: -1 });
    res.json(files);
  } catch (error) {
    console.error("Get files error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/files/:fileId", auth, requireTeacher, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    const resourceType = getResourceType(file.fileType);
    await cloudinary.uploader.destroy(file.publicId, { resource_type: resourceType });
    await File.findByIdAndDelete(req.params.fileId);

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete file error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

app.delete("/api/topics/:topicId", auth, requireTeacher, async (req, res) => {
  try {
    const topicId = req.params.topicId;
    const filesInTopic = await File.find({ topic: topicId });

    for (const file of filesInTopic) {
      const resourceType = getResourceType(file.fileType);
      await cloudinary.uploader.destroy(file.publicId, { resource_type: resourceType });
    }

    await File.deleteMany({ topic: topicId });
    await Topic.findByIdAndDelete(topicId);

    res.json({ message: "Topic and associated files deleted successfully" });
  } catch (error) {
    console.error("Delete topic error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/files/:fileId", auth, requireTeacher, async (req, res) => {
  try {
    const { newName } = req.body;
    if (!newName) return res.status(400).json({ message: "New name is required" });
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    file.originalName = newName;
    await file.save();
    res.json(file);
  } catch (error) {
    console.error("Edit file error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/topics/:topicId", auth, requireTeacher, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ message: "Title is required" });
    const topic = await Topic.findByIdAndUpdate(
      req.params.topicId,
      { title, description },
      { new: true }
    );
    if (!topic) return res.status(404).json({ message: "Topic not found" });
    res.json(topic);
  } catch (error) {
    console.error("Edit topic error:", error.message);
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/download/:fileId", async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found in database" });
    }

    if (!file.filePath || !file.publicId) {
      return res.status(400).json({ message: "Invalid file path or publicId in database" });
    }

    const resourceType = getResourceType(file.fileType);

    // Verify file exists in Cloudinary
    try {
      const resource = await cloudinary.api.resource(file.publicId, { resource_type: resourceType });
      console.log("Cloudinary resource check successful for:", file.publicId);
    } catch (cloudError) {
      console.error("Cloudinary resource check error:", cloudError.message);
      return res.status(404).json({ message: `File not found on Cloudinary: ${file.publicId}` });
    }

    // Extract version from filePath (e.g., /v1757354202/ -> 1757354202)
    const versionMatch = file.filePath.match(/\/v(\d+)\//);
    const version = versionMatch ? versionMatch[1] : null;
    if (!version) {
      return res.status(400).json({ message: "Invalid version in filePath" });
    }

    // Generate signature for delivery URL: SHA-1 of (version/public_id + api_secret), first 8 chars, URL-safe base64
    const stringToSign = `${version}/${file.publicId}`;
    const stringWithSecret = stringToSign + process.env.API_SECRET;
    const hash = crypto
      .createHash('sha1')
      .update(stringWithSecret)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    const signature = hash.substring(0, 8);
    const sigComponent = `/s--${signature}--/`;

    // Construct signed URL: https://res.cloudinary.com/<cloud>/raw/upload/v<version>/s--sig--/<public_id>
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const basePath = file.filePath.split(`res.cloudinary.com/${cloudName}`)[1].split('/v' + version)[0]; // Extract base path (e.g., /raw/upload)
    const signedUrl = `https://res.cloudinary.com/${cloudName}${basePath}/v${version}${sigComponent}${file.publicId}`;

    console.log("Generated signed download URL:", signedUrl); // Debug log

    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader("Content-Type", file.fileType || "application/octet-stream");

    const response = await axios({
      url: signedUrl,
      method: "GET",
      responseType: "stream",
      timeout: 30000,
    }).catch(err => {
      console.error("Axios error details:", err.response?.status, err.response?.statusText);
      if (err.response?.status === 401) {
        throw new Error("Unauthorized access to Cloudinary file. Verify API_SECRET and security settings.");
      } else if (err.response?.status === 404) {
        throw new Error(`File not found on Cloudinary: ${file.publicId}`);
      } else {
        throw new Error(`Failed to fetch file from Cloudinary: ${err.message}`);
      }
    });

    if (response.status !== 200) {
      throw new Error(`Cloudinary returned status ${response.status}`);
    }

    response.data.pipe(res);
    response.data.on("error", (err) => {
      console.error("Stream error:", err.message);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error streaming file" });
      }
    });
  } catch (error) {
    console.error("Download error:", error.message);
    if (!res.headersSent) {
      res.status(error.message.includes("not found") ? 404 : 500).json({
        message: `Download failed: ${error.message}`,
      });
    }
  }
});

// Error middleware
app.use((error, req, res, next) => {
  console.error("Global error:", error.message, error.stack);
  if (!res.headersSent) {
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});