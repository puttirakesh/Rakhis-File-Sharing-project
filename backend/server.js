const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});


// ========== Schemas ==========
const topicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const fileSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true }, // Cloudinary URL
  fileSize: { type: Number },
  fileType: { type: String, required: true },
  publicId: { type: String, required: true }, // Cloudinary public_id
  topic: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["teacher", "student"], default: "teacher" },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: { type: Date, default: Date.now },
});

const Topic = mongoose.model("Topic", topicSchema);
const File = mongoose.model("File", fileSchema);
const User = mongoose.model("User", userSchema);

// ========== Cloudinary Setup ==========
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => ({
    folder: `uploads`, // organize by topic
    public_id: "file-" + Date.now(),
    resource_type: "auto", // allow ALL file types
  }),
});

const upload = multer({ storage });

// ========== Auth Middleware ==========
const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    req.user = await User.findById(decoded.id).select("-password");
    next();
  } catch (error) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

const requireTeacher = (req, res, next) => {
  if (req.user.role !== "teacher") {
    return res
      .status(403)
      .json({ message: "Access denied. Teacher privileges required." });
  }
  next();
};

// ========== Routes ==========

// Register
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    user = new User({ name, email, password, role: role || "teacher" });
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
    res.status(500).json({ message: "Server error" });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
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
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get Topics
app.get("/api/topics", async (req, res) => {
  try {
    const topics = await Topic.find().sort({ createdAt: -1 });
    res.json(topics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create Topic
app.post("/api/topics", auth, requireTeacher, async (req, res) => {
  try {
    const { title, description } = req.body;
    const topic = new Topic({ title, description });
    await topic.save();
    res.status(201).json(topic);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Upload Files
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
      const newFile = new File({
        originalName: file.originalname,
        fileName: file.filename || file.originalname,
        filePath: file.path, // Cloudinary URL
        fileSize: file.size || 0,
        fileType: file.mimetype,
        publicId: file.filename || file.public_id,
        topic: topicId,
      });
      await newFile.save();
      files.push(newFile);
    }

    res.status(201).json(files);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get Files
app.get("/api/topics/:topicId/files", async (req, res) => {
  try {
    const files = await File.find({ topic: req.params.topicId }).sort({ uploadedAt: -1 });
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete File
app.delete("/api/files/:fileId", auth, requireTeacher, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    await cloudinary.uploader.destroy(file.publicId, { resource_type: "auto" });
    await File.findByIdAndDelete(req.params.fileId);

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete Topic + Files
app.delete("/api/topics/:topicId", auth, requireTeacher, async (req, res) => {
  try {
    const topicId = req.params.topicId;
    const filesInTopic = await File.find({ topic: topicId });

    for (const file of filesInTopic) {
      await cloudinary.uploader.destroy(file.publicId, { resource_type: "auto" });
    }

    await File.deleteMany({ topic: topicId });
    await Topic.findByIdAndDelete(topicId);

    res.json({ message: "Topic and associated files deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Edit File
app.put("/api/files/:fileId", auth, requireTeacher, async (req, res) => {
  try {
    const { newName } = req.body;
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ message: "File not found" });

    file.originalName = newName;
    await file.save();
    res.json(file);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Edit Topic
app.put("/api/topics/:topicId", auth, requireTeacher, async (req, res) => {
  try {
    const { title, description } = req.body;
    const topic = await Topic.findByIdAndUpdate(
      req.params.topicId,
      { title, description },
      { new: true }
    );
    if (!topic) return res.status(404).json({ message: "Topic not found" });
    res.json(topic);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Error middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
