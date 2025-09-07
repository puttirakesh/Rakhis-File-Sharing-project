const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/teachers-portal', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schemas
const TEACHER_KEY = process.env.TEACHER_KEY || 'mysecretkey123';

const topicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const fileSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  fileName: { type: String, required: true },
  fileUrl: { type: String, required: true }, // Changed from filePath to fileUrl
  fileSize: { type: Number, required: true },
  fileType: { type: String, required: true },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  uploadedAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['teacher', 'student'], default: 'teacher' },
  createdAt: { type: Date, default: Date.now }
});

const Topic = mongoose.model('Topic', topicSchema);
const File = mongoose.model('File', fileSchema);
const User = mongoose.model('User', userSchema);

// Multer config for AWS S3
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const topicId = req.body.topicId;
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileName = `topic_${topicId}/file-${uniqueSuffix}${path.extname(file.originalname)}`;
      cb(null, fileName);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    req.user = await User.findById(decoded.id).select('-password');
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Teacher-only middleware
const requireTeacher = (req, res, next) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ message: 'Access denied. Teacher privileges required.' });
  }
  next();
};

// Routes

// Register route - modified to require the exact key
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role, teacherKey } = req.body;
    
    // Check if teacher key is provided and exactly matches the required key
    if (role === 'teacher') {
      if (!teacherKey) {
        return res.status(400).json({ message: 'Teacher key is required for teacher registration' });
      }
      if (teacherKey !== TEACHER_KEY) {
        return res.status(400).json({ message: 'Invalid teacher key. Access denied.' });
      }
    }
    
    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    user = new User({
      name,
      email,
      password,
      role: role || 'student' // Default to student if not specified
    });
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    
    await user.save();
    
    // Create JWT
    const payload = {
      id: user.id
    };
    
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'super_secret_jwt_key_2024_teachers_portal_secure_token',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login route
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT
    const payload = {
      id: user.id
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all topics
app.get('/api/topics', async (req, res) => {
  try {
    const topics = await Topic.find().sort({ createdAt: -1 });
    res.json(topics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new topic
app.post('/api/topics', auth, requireTeacher, async (req, res) => {
  try {
    const { title, description } = req.body;
    const topic = new Topic({ title, description });
    await topic.save();
    res.status(201).json(topic);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get files by topic
app.get('/api/topics/:topicId/files', async (req, res) => {
  try {
    const files = await File.find({ topic: req.params.topicId }).sort({ uploadedAt: -1 });
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload multiple files
app.post('/api/upload', auth, requireTeacher, upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const { topicId } = req.body;
    const topic = await Topic.findById(topicId);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });

    const files = [];
    for (const file of req.files) {
      const newFile = new File({
        originalName: file.originalname,
        fileName: file.key,
        fileUrl: file.location, // S3 file URL
        fileSize: file.size,
        fileType: file.mimetype,
        topic: topicId
      });
      await newFile.save();
      files.push(newFile);
    }

    res.status(201).json(files);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Download a file - redirect to S3 URL
app.get('/api/download/:fileId', async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ message: 'File not found' });

    // Redirect to the S3 URL for download
    res.redirect(file.fileUrl);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a file
app.delete('/api/files/:fileId', auth, requireTeacher, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ message: 'File not found' });

    // Delete from S3
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: file.fileName
    };

    s3.deleteObject(params, async (err) => {
      if (err) {
        console.error('Error deleting file from S3:', err);
        return res.status(500).json({ message: 'Error deleting file from storage' });
      }

      // Delete from database
      await File.findByIdAndDelete(req.params.fileId);
      res.json({ message: 'File deleted successfully' });
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a topic and all its files
app.delete('/api/topics/:topicId', auth, requireTeacher, async (req, res) => {
  try {
    const topicId = req.params.topicId;

    // Find all files in topic
    const filesInTopic = await File.find({ topic: topicId });

    // Delete files from S3
    for (const file of filesInTopic) {
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: file.fileName
      };
      s3.deleteObject(params).promise().catch(err => {
        console.error('Error deleting file from S3:', err);
      });
    }

    // Delete files from DB
    await File.deleteMany({ topic: topicId });

    // Delete the topic itself
    await Topic.findByIdAndDelete(topicId);

    res.json({ message: 'Topic and associated files deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Edit file name
app.put('/api/files/:fileId', auth, requireTeacher, async (req, res) => {
  try {
    const { newName } = req.body;
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ message: 'File not found' });

    file.originalName = newName;
    await file.save();

    res.json(file);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Edit topic
app.put('/api/topics/:topicId', auth, requireTeacher, async (req, res) => {
  try {
    const { title, description } = req.body;
    const topic = await Topic.findByIdAndUpdate(
      req.params.topicId,
      { title, description },
      { new: true }
    );

    if (!topic) return res.status(404).json({ message: 'Topic not found' });

    res.json(topic);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Internal server error' });
});

app.get('/', (req, res) => {
  res.redirect(process.env.CLIENT_URL);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});