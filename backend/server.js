const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const crypto = require("crypto");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
require("dotenv").config();

const app = express();

const PORT = Number(process.env.PORT || 5000);
const NODE_ENV = process.env.NODE_ENV || "development";
const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB || 25);
const MAX_FILES_PER_UPLOAD = Number(process.env.MAX_FILES_PER_UPLOAD || 10);

const File = require("./models/File");
const Topic = require("./models/Topic");
const User = require("./models/User");

const requiredEnv = [
  "MONGODB_URI",
  "JWT_SECRET",
  "TEACHER_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

if (process.env.JWT_SECRET.length < 32) {
  console.warn("WARNING: JWT_SECRET should be at least 32 characters long.");
}

const normalizeOrigin = (value) =>
  value?.trim().replace(/\/$/, "");

const allowedOrigins = (
  process.env.CLIENT_URLS ||
  process.env.CLIENT_URL ||
  ""
)
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

if (NODE_ENV !== "production") {
  allowedOrigins.push(
    "http://localhost:5173",
    "http://localhost:4173"
  );
}

const uniqueOrigins = [...new Set(allowedOrigins)];

app.disable("x-powered-by");

app.use(express.json({ limit: "1mb" }));

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without Origin header
      // such as Postman/server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      const normalized = normalizeOrigin(origin);

      if (uniqueOrigins.includes(normalized)) {
        return callback(null, true);
      }

      console.warn(`Blocked CORS origin: ${origin}`);

      return callback(
        new Error("Not allowed by CORS")
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],

    optionsSuccessStatus: 204,
  })
);


// ============================================================
// CLOUDINARY CONFIGURATION
// ============================================================

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


// ============================================================
// CLOUDINARY RESOURCE TYPE
// ============================================================

const getResourceType = (mimeType = "") => {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  return "raw";
};


// ============================================================
// SAFE CLOUDINARY PUBLIC ID
// ============================================================

const sanitizePublicIdPart = (name = "file") =>
  name
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "file";


// ============================================================
// CLOUDINARY STORAGE
// ============================================================

const storage = new CloudinaryStorage({
  cloudinary,

  params: async (req, file) => {
    const resourceType = getResourceType(
      file.mimetype
    );

    const safeName = sanitizePublicIdPart(
      file.originalname
    );

    return {
      folder: "rakhis-file-sharing/uploads",

      public_id:
        `file-${Date.now()}-${crypto.randomUUID()}-${safeName}`,

      resource_type: resourceType,

      use_filename: false,

      unique_filename: false,
    };
  },
});


// ============================================================
// FILE UPLOAD VALIDATION
// ============================================================

// Common educational/document MIME types
const allowedMimeTypes = new Set([
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  // Presentations
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  // Spreadsheets
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  // Text / data
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  "application/xml",
  "text/xml",

  // Web / source code
  "text/html",
  "text/css",
  "text/javascript",
  "application/javascript",
  "application/x-javascript",
  "application/typescript",
  "text/typescript",

  // Programming languages
  "text/x-python",
  "text/x-java-source",
  "text/x-c",
  "text/x-c++",
  "application/x-httpd-php",

  // Archives
  "application/zip",
  "application/x-zip-compressed",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
  "application/gzip",
  "application/x-gzip",

  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",

  // Video
  "video/mp4",
  "video/webm",
  "video/quicktime",

  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",

  // Generic / unknown browser files
  "application/octet-stream",
]);


// ============================================================
// ALLOWED FILE EXTENSIONS
// ============================================================

const allowedExtensions = new Set([
  // Documents
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "txt",
  "csv",
  "md",
  "markdown",

  // Web/source code
  "html",
  "htm",
  "css",
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "xml",
  "py",
  "java",
  "c",
  "h",
  "cpp",
  "cc",
  "hpp",
  "php",
  "sql",
  "sh",

  // Archives
  "zip",
  "7z",
  "rar",
  "gz",
  "tar",

  // Images
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "svg",

  // Video
  "mp4",
  "webm",
  "mov",

  // Audio
  "mp3",
  "wav",
  "ogg",
  "m4a",
]);


// ============================================================
// FILE EXTENSION HELPER
// ============================================================

const getExtension = (filename = "") => {
  const parts = filename
    .toLowerCase()
    .split(".");

  return parts.length > 1
    ? parts.pop()
    : "";
};


// ============================================================
// MULTER UPLOAD
// ============================================================

const upload = multer({
  storage,

  limits: {
    files: MAX_FILES_PER_UPLOAD,

    fileSize:
      MAX_FILE_SIZE_MB * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    const extension =
      getExtension(file.originalname);

    const mimeType =
      (file.mimetype || "").toLowerCase();

    const mimeAllowed =
      allowedMimeTypes.has(mimeType);

    const extensionAllowed =
      allowedExtensions.has(extension);

    /*
      Accept if either browser MIME type
      OR file extension is recognized.

      This is important because different browsers
      and operating systems report different MIME types.
    */

    if (mimeAllowed || extensionAllowed) {
      return callback(null, true);
    }

    console.warn(
      `Rejected upload: ${file.originalname} (${mimeType || "unknown MIME type"})`
    );

    /*
      IMPORTANT:
      This must be a normal Error.

      Do NOT create a MulterError here because
      "unsupported file type" is our own validation
      error, not an unexpected multipart field.
    */

    return callback(
      new Error(
        `Unsupported file type: ${
          mimeType ||
          extension ||
          "unknown"
        }`
      )
    );
  },
});


// ============================================================
// JWT
// ============================================================

const createToken = (userId) =>
  jwt.sign(
    {
      id: userId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );


// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

const auth = async (req, res, next) => {
  try {
    const header =
      req.header("Authorization") || "";

    const token =
      header.startsWith("Bearer ")
        ? header.slice(7)
        : null;

    if (!token) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user =
      await User.findById(decoded.id)
        .select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User account not found.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      message:
        "Your session is invalid or expired.",
    });
  }
};


// ============================================================
// TEACHER AUTHORIZATION
// ============================================================

const requireTeacher = (req, res, next) => {
  if (req.user?.role !== "teacher") {
    return res.status(403).json({
      message:
        "Teacher privileges are required.",
    });
  }

  next();
};


// ============================================================
// OBJECT ID VALIDATOR
// ============================================================

const validateObjectId = (value) =>
  mongoose.isValidObjectId(value);


// ============================================================
// ROOT ROUTE
// ============================================================

app.get("/", (req, res) => {
  res.json({
    name: "Rakhis File Sharing API",
    status: "running",
    environment: NODE_ENV,
  });
});


// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/health", (req, res) => {
  const readyState =
    mongoose.connection.readyState;

  res
    .status(readyState === 1 ? 200 : 503)
    .json({
      status:
        readyState === 1
          ? "ok"
          : "degraded",

      database:
        readyState === 1
          ? "connected"
          : "disconnected",

      uptime: Math.round(
        process.uptime()
      ),
    });
});


// ============================================================
// REGISTER
// ============================================================

app.post("/api/register", async (req, res) => {
  try {
    const name = String(
      req.body.name || ""
    ).trim();

    const email = String(
      req.body.email || ""
    )
      .trim()
      .toLowerCase();

    const password = String(
      req.body.password || ""
    );

    const role =
      req.body.role === "teacher"
        ? "teacher"
        : "student";

    const teacherKey = String(
      req.body.teacherKey || ""
    );


    // -----------------------------
    // NAME VALIDATION
    // -----------------------------

    if (
      name.length < 2 ||
      name.length > 80
    ) {
      return res.status(400).json({
        message:
          "Name must be between 2 and 80 characters.",
      });
    }


    // -----------------------------
    // EMAIL VALIDATION
    // -----------------------------

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      return res.status(400).json({
        message:
          "Please enter a valid email address.",
      });
    }


    // -----------------------------
    // PASSWORD VALIDATION
    // -----------------------------

    if (password.length < 8) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters.",
      });
    }


    // -----------------------------
    // TEACHER KEY VALIDATION
    // -----------------------------

    if (
      role === "teacher" &&
      teacherKey !== process.env.TEACHER_KEY
    ) {
      return res.status(400).json({
        message:
          "Invalid teacher access key.",
      });
    }


    // -----------------------------
    // EXISTING USER CHECK
    // -----------------------------

    const existingUser =
      await User.findOne({
        email,
      });

    if (existingUser) {
      return res.status(409).json({
        message:
          "An account with this email already exists.",
      });
    }


    // -----------------------------
    // HASH PASSWORD
    // -----------------------------

    const hashedPassword =
      await bcrypt.hash(
        password,
        12
      );


    // -----------------------------
    // CREATE USER
    // -----------------------------

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });


    // -----------------------------
    // CREATE TOKEN
    // -----------------------------

    const token =
      createToken(user.id);


    // -----------------------------
    // RESPONSE
    // -----------------------------

    res.status(201).json({
      token,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error(
      "Register error:",
      error
    );

    res.status(500).json({
      message:
        "Unable to create the account.",
    });
  }
});


// ============================================================
// LOGIN
// ============================================================

app.post("/api/login", async (req, res) => {
  try {
    const email = String(
      req.body.email || ""
    )
      .trim()
      .toLowerCase();

    const password = String(
      req.body.password || ""
    );

    const teacherKey = String(
      req.body.teacherKey || ""
    );


    // ========================================================
    // TEACHER KEY LOGIN
    // ========================================================

    if (teacherKey) {

      if (
        process.env.TEACHER_KEY_LOGIN_ENABLED !==
        "true"
      ) {
        return res.status(403).json({
          message:
            "Teacher key login is disabled.",
        });
      }


      if (
        teacherKey !==
        process.env.TEACHER_KEY
      ) {
        return res.status(401).json({
          message:
            "Invalid teacher access key.",
        });
      }


      /*
        Find the oldest teacher account.

        If there is no teacher account yet,
        create one automatically.
      */

      let teacher =
        await User.findOne({
          role: "teacher",
        }).sort({
          createdAt: 1,
        });


      if (!teacher) {
        teacher =
          await User.create({
            name: "Teacher",

            email:
              "teacher@file-sharing.local",

            password:
              await bcrypt.hash(
                crypto.randomUUID(),
                12
              ),

            role: "teacher",
          });
      }


      return res.json({
        token:
          createToken(teacher.id),

        user: {
          id: teacher.id,
          name: teacher.name,
          email: teacher.email,
          role: teacher.role,
        },
      });
    }


    // ========================================================
    // EMAIL/PASSWORD LOGIN
    // ========================================================

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Email and password are required.",
      });
    }


    const user =
      await User.findOne({
        email,
      });


    if (!user) {
      return res.status(401).json({
        message:
          "Invalid email or password.",
      });
    }


    const passwordMatches =
      await bcrypt.compare(
        password,
        user.password
      );


    if (!passwordMatches) {
      return res.status(401).json({
        message:
          "Invalid email or password.",
      });
    }


    res.json({
      token:
        createToken(user.id),

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    res.status(500).json({
      message:
        "Unable to sign you in.",
    });
  }
});


// ============================================================
// GET ALL FOLDERS
// ============================================================

app.get("/api/topics", async (req, res) => {
  try {

    const topics =
      await Topic.find()
        .sort({
          createdAt: -1,
        })
        .lean();


    const topicIds =
      topics.map(
        (topic) => topic._id
      );


    const counts =
      await File.aggregate([
        {
          $match: {
            topic: {
              $in: topicIds,
            },
          },
        },

        {
          $group: {
            _id: "$topic",
            count: {
              $sum: 1,
            },
          },
        },
      ]);


    const countMap =
      Object.fromEntries(
        counts.map(
          (item) => [
            item._id.toString(),
            item.count,
          ]
        )
      );


    res.json(
      topics.map((topic) => ({
        ...topic,

        fileCount:
          countMap[
            topic._id.toString()
          ] || 0,
      }))
    );

  } catch (error) {

    console.error(
      "Get topics error:",
      error
    );

    res.status(500).json({
      message:
        "Unable to load folders.",
    });
  }
});


// ============================================================
// CREATE FOLDER
// ============================================================

app.post(
  "/api/topics",
  auth,
  requireTeacher,
  async (req, res) => {

    try {

      const title =
        String(
          req.body.title || ""
        ).trim();


      const description =
        String(
          req.body.description || ""
        ).trim();


      if (
        title.length < 1 ||
        title.length > 100
      ) {
        return res.status(400).json({
          message:
            "Folder title must be between 1 and 100 characters.",
        });
      }


      const topic =
        await Topic.create({
          title,

          description:
            description.slice(
              0,
              300
            ),
        });


      res.status(201).json({
        ...topic.toObject(),

        fileCount: 0,
      });

    } catch (error) {

      console.error(
        "Create topic error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to create folder.",
      });
    }
  }
);


// ============================================================
// GET FILES INSIDE ONE FOLDER
// ============================================================

app.get(
  "/api/topics/:topicId/files",
  async (req, res) => {

    try {

      const {
        topicId,
      } = req.params;


      if (
        !validateObjectId(
          topicId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid folder id.",
        });
      }


      const files =
        await File.find({
          topic: topicId,
        })
        .sort({
          uploadedAt: -1,
        })
        .lean();


      res.json(files);

    } catch (error) {

      console.error(
        "Get files error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to load files.",
      });
    }
  }
);


// ============================================================
// GET ALL FILES
// ============================================================

// Useful for the frontend to build accurate folder counts
// without fetching every folder separately.

app.get(
  "/api/files",
  async (req, res) => {

    try {

      const files =
        await File.find()
          .sort({
            uploadedAt: -1,
          })
          .lean();


      res.json(files);

    } catch (error) {

      console.error(
        "Get all files error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to load files.",
      });
    }
  }
);


// ============================================================
// UPLOAD FILES INTO SELECTED FOLDER
// ============================================================

app.post(
  "/api/upload",

  auth,

  requireTeacher,

  upload.array(
    "files",
    MAX_FILES_PER_UPLOAD
  ),

  async (req, res) => {

    const uploadedToCloudinary = [];


    try {

      const {
        topicId,
      } = req.body;


      // ======================================================
      // VALIDATE FOLDER ID
      // ======================================================

      if (
        !validateObjectId(
          topicId
        )
      ) {

        // Clean up any Cloudinary uploads
        // if folder validation fails.

        for (
          const file
          of req.files || []
        ) {

          if (file.filename) {

            await cloudinary.uploader
              .destroy(
                file.filename,
                {
                  resource_type:
                    getResourceType(
                      file.mimetype
                    ),
                }
              )
              .catch(
                () => {}
              );
          }
        }


        return res.status(400).json({
          message:
            "Please select a valid folder.",
        });
      }


      // ======================================================
      // CHECK FOLDER EXISTS
      // ======================================================

      const topic =
        await Topic.findById(
          topicId
        );


      if (!topic) {

        for (
          const file
          of req.files || []
        ) {

          if (file.filename) {

            await cloudinary.uploader
              .destroy(
                file.filename,
                {
                  resource_type:
                    getResourceType(
                      file.mimetype
                    ),
                }
              )
              .catch(
                () => {}
              );
          }
        }


        return res.status(404).json({
          message:
            "Selected folder was not found.",
        });
      }


      // ======================================================
      // CHECK FILES EXIST
      // ======================================================

      if (
        !req.files?.length
      ) {

        return res.status(400).json({
          message:
            "Please choose at least one file.",
        });
      }


      // ======================================================
      // SAVE FILE RECORDS
      // ======================================================

      const savedFiles = [];


      for (
        const file
        of req.files
      ) {

        if (
          !file.path ||
          !file.filename
        ) {

          throw new Error(
            `Cloudinary did not return a usable result for ${file.originalname}.`
          );
        }


        uploadedToCloudinary.push({
          publicId:
            file.filename,

          resourceType:
            getResourceType(
              file.mimetype
            ),
        });


        const newFile =
          await File.create({

            originalName:
              file.originalname,

            fileName:
              file.originalname,

            filePath:
              file.path,

            fileSize:
              Number(
                file.size || 0
              ),

            fileType:
              file.mimetype ||
              "application/octet-stream",

            publicId:
              file.filename,

            topic:
              topic._id,
          });


        savedFiles.push(
          newFile
        );
      }


      // ======================================================
      // SUCCESS
      // ======================================================

      res.status(201).json(
        savedFiles
      );

    } catch (error) {

      console.error(
        "Upload error:",
        error
      );


      // ======================================================
      // ROLLBACK CLOUDINARY UPLOADS
      // ======================================================

      for (
        const uploaded
        of uploadedToCloudinary
      ) {

        await cloudinary.uploader
          .destroy(
            uploaded.publicId,
            {
              resource_type:
                uploaded.resourceType,
            }
          )
          .catch(
            () => {}
          );
      }


      // ======================================================
      // MULTER ERRORS
      // ======================================================

      if (
        error instanceof
        multer.MulterError
      ) {

        if (
          error.code ===
          "LIMIT_FILE_SIZE"
        ) {

          return res.status(413).json({
            message:
              `Each file must be ${MAX_FILE_SIZE_MB} MB or smaller.`,
          });
        }


        if (
          error.code ===
          "LIMIT_FILE_COUNT"
        ) {

          return res.status(413).json({
            message:
              `You can upload up to ${MAX_FILES_PER_UPLOAD} files at once.`,
          });
        }


        if (
          error.code ===
          "LIMIT_UNEXPECTED_FILE"
        ) {

          return res.status(400).json({
            message:
              "Unexpected file upload field. Please select files using the upload control.",
          });
        }


        return res.status(400).json({
          message:
            error.message ||
            "File upload error.",
        });
      }


      // ======================================================
      // UNSUPPORTED FILE TYPE
      // ======================================================

      if (
        typeof error?.message ===
          "string" &&
        error.message.startsWith(
          "Unsupported file type:"
        )
      ) {

        return res.status(400).json({
          message:
            error.message,
        });
      }


      // ======================================================
      // GENERIC UPLOAD ERROR
      // ======================================================

      res.status(500).json({
        message:
          `Upload failed: ${error.message}`,
      });
    }
  }
);


// ============================================================
// DELETE FILE
// ============================================================

app.delete(
  "/api/files/:fileId",
  auth,
  requireTeacher,
  async (req, res) => {

    try {

      if (
        !validateObjectId(
          req.params.fileId
        )
      ) {

        return res.status(400).json({
          message:
            "Invalid file id.",
        });
      }


      const file =
        await File.findById(
          req.params.fileId
        );


      if (!file) {

        return res.status(404).json({
          message:
            "File not found.",
        });
      }


      const resourceType =
        getResourceType(
          file.fileType
        );


      await cloudinary.uploader
        .destroy(
          file.publicId,
          {
            resource_type:
              resourceType,
          }
        );


      await File.findByIdAndDelete(
        file._id
      );


      res.json({
        message:
          "File deleted successfully.",
      });

    } catch (error) {

      console.error(
        "Delete file error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to delete file.",
      });
    }
  }
);


// ============================================================
// DELETE FOLDER + ALL FILES
// ============================================================

app.delete(
  "/api/topics/:topicId",
  auth,
  requireTeacher,
  async (req, res) => {

    try {

      const {
        topicId,
      } = req.params;


      if (
        !validateObjectId(
          topicId
        )
      ) {

        return res.status(400).json({
          message:
            "Invalid folder id.",
        });
      }


      const filesInTopic =
        await File.find({
          topic: topicId,
        });


      for (
        const file
        of filesInTopic
      ) {

        await cloudinary.uploader
          .destroy(
            file.publicId,
            {
              resource_type:
                getResourceType(
                  file.fileType
                ),
            }
          )
          .catch(
            (error) => {

              console.warn(
                `Cloudinary delete failed for ${file.publicId}:`,
                error.message
              );

            }
          );
      }


      await File.deleteMany({
        topic: topicId,
      });


      const deletedTopic =
        await Topic.findByIdAndDelete(
          topicId
        );


      if (!deletedTopic) {

        return res.status(404).json({
          message:
            "Folder not found.",
        });
      }


      res.json({
        message:
          "Folder and its files deleted successfully.",
      });

    } catch (error) {

      console.error(
        "Delete topic error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to delete folder.",
      });
    }
  }
);


// ============================================================
// RENAME FILE
// ============================================================

app.put(
  "/api/files/:fileId",
  auth,
  requireTeacher,
  async (req, res) => {

    try {

      if (
        !validateObjectId(
          req.params.fileId
        )
      ) {

        return res.status(400).json({
          message:
            "Invalid file id.",
        });
      }


      const newName =
        String(
          req.body.newName || ""
        ).trim();


      if (
        !newName ||
        newName.length > 255
      ) {

        return res.status(400).json({
          message:
            "File name must be between 1 and 255 characters.",
        });
      }


      const file =
        await File.findById(
          req.params.fileId
        );


      if (!file) {

        return res.status(404).json({
          message:
            "File not found.",
        });
      }


      file.originalName =
        newName;

      file.fileName =
        newName;


      await file.save();


      res.json(file);

    } catch (error) {

      console.error(
        "Edit file error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to rename file.",
      });
    }
  }
);


// ============================================================
// UPDATE FOLDER
// ============================================================

app.put(
  "/api/topics/:topicId",
  auth,
  requireTeacher,
  async (req, res) => {

    try {

      if (
        !validateObjectId(
          req.params.topicId
        )
      ) {

        return res.status(400).json({
          message:
            "Invalid folder id.",
        });
      }


      const title =
        String(
          req.body.title || ""
        ).trim();


      const description =
        String(
          req.body.description || ""
        ).trim();


      if (
        !title ||
        title.length > 100
      ) {

        return res.status(400).json({
          message:
            "Folder title must be between 1 and 100 characters.",
        });
      }


      const topic =
        await Topic.findByIdAndUpdate(
          req.params.topicId,

          {
            title,

            description:
              description.slice(
                0,
                300
              ),
          },

          {
            new: true,
            runValidators: true,
          }
        );


      if (!topic) {

        return res.status(404).json({
          message:
            "Folder not found.",
        });
      }


      const fileCount =
        await File.countDocuments({
          topic: topic._id,
        });


      res.json({
        ...topic.toObject(),

        fileCount,
      });

    } catch (error) {

      console.error(
        "Edit topic error:",
        error
      );

      res.status(500).json({
        message:
          "Unable to update folder.",
      });
    }
  }
);


// ============================================================
// DOWNLOAD FILE
// ============================================================

app.get(
  "/api/download/:fileId",
  async (req, res) => {

    try {

      if (
        !validateObjectId(
          req.params.fileId
        )
      ) {

        return res.status(400).json({
          message:
            "Invalid file id.",
        });
      }


      const file =
        await File.findById(
          req.params.fileId
        );


      if (!file) {

        return res.status(404).json({
          message:
            "File not found.",
        });
      }


      if (!file.filePath) {

        return res.status(400).json({
          message:
            "File does not have a valid storage URL.",
        });
      }


      const response =
        await axios.get(
          file.filePath,
          {
            responseType:
              "stream",

            timeout:
              30000,

            maxRedirects:
              5,

            validateStatus:
              (status) =>
                status >= 200 &&
                status < 300,
          }
        );


      const safeFileName =
        String(
          file.originalName ||
          "download"
        )
          .replace(
            /[\r\n"]/g,
            "_"
          )
          .slice(
            0,
            255
          );


      res.setHeader(
        "Content-Disposition",

        `attachment; filename*=UTF-8''${encodeURIComponent(
          safeFileName
        )}`
      );


      res.setHeader(
        "Content-Type",

        file.fileType ||
          "application/octet-stream"
      );


      if (
        response.headers[
          "content-length"
        ]
      ) {

        res.setHeader(
          "Content-Length",

          response.headers[
            "content-length"
          ]
        );
      }


      response.data.on(
        "error",
        (streamError) => {

          console.error(
            "Download stream error:",
            streamError
          );


          if (
            !res.headersSent
          ) {

            res.status(500).json({
              message:
                "Error while streaming the file.",
            });

          } else {

            res.destroy(
              streamError
            );
          }
        }
      );


      response.data.pipe(res);

    } catch (error) {

      console.error(
        "Download error:",
        error.message
      );


      const status =
        error.response?.status ===
        404
          ? 404
          : 500;


      if (
        !res.headersSent
      ) {

        res.status(status).json({
          message:
            status === 404
              ? "File was not found in storage."
              : "Unable to download file.",
        });
      }
    }
  }
);


// ============================================================
// GLOBAL ERROR HANDLER
// IMPORTANT: MUST BE AFTER ALL ROUTES
// ============================================================

app.use(
  (err, req, res, next) => {

    // ========================================================
    // CORS ERROR
    // ========================================================

    if (
      err?.message ===
      "Not allowed by CORS"
    ) {

      return res.status(403).json({
        message:
          "This website is not allowed to access the API.",
      });
    }


    // ========================================================
    // MULTER ERROR
    // ========================================================

    if (
      err instanceof
      multer.MulterError
    ) {

      // ------------------------------
      // FILE TOO LARGE
      // ------------------------------

      if (
        err.code ===
        "LIMIT_FILE_SIZE"
      ) {

        return res.status(413).json({
          message:
            `Each file must be ${MAX_FILE_SIZE_MB} MB or smaller.`,
        });
      }


      // ------------------------------
      // TOO MANY FILES
      // ------------------------------

      if (
        err.code ===
        "LIMIT_FILE_COUNT"
      ) {

        return res.status(413).json({
          message:
            `You can upload up to ${MAX_FILES_PER_UPLOAD} files at once.`,
        });
      }


      // ------------------------------
      // UNEXPECTED FIELD
      // ------------------------------

      if (
        err.code ===
        "LIMIT_UNEXPECTED_FILE"
      ) {

        return res.status(400).json({
          message:
            "Unexpected file upload field. Please select files using the upload control.",
        });
      }


      // ------------------------------
      // OTHER MULTER ERROR
      // ------------------------------

      return res.status(400).json({
        message:
          err.message ||
          "File upload error.",
      });
    }


    // ========================================================
    // UNSUPPORTED FILE TYPE
    // ========================================================

    /*
      The fileFilter intentionally uses
      a normal Error for unsupported file types.

      Treat that as a client validation error
      rather than a 500 server error.
    */

    if (
      typeof err?.message ===
        "string" &&
      err.message.startsWith(
        "Unsupported file type:"
      )
    ) {

      return res.status(400).json({
        message:
          err.message,
      });
    }


    // ========================================================
    // UNKNOWN ERROR
    // ========================================================

    console.error(
      "Unhandled server error:",
      err
    );


    if (
      !res.headersSent
    ) {

      return res.status(500).json({
        message:
          "Internal server error.",
      });
    }


    return next(err);
  }
);


// ============================================================
// START SERVER
// ============================================================

const startServer = async () => {

  try {

    await mongoose.connect(
      process.env.MONGODB_URI,
      {
        serverSelectionTimeoutMS:
          10000,
      }
    );


    console.log(
      "Connected to MongoDB"
    );


    app.listen(
      PORT,
      "0.0.0.0",
      () => {

        console.log(
          `API listening on http://0.0.0.0:${PORT}`
        );


        console.log(
          `Allowed origins: ${
            uniqueOrigins.join(", ") ||
            "none configured"
          }`
        );
      }
    );

  } catch (error) {

    console.error(
      "MongoDB startup error:",
      error
    );

    process.exit(1);
  }
};


// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

process.on(
  "SIGTERM",
  async () => {

    await mongoose.connection.close();

    process.exit(0);
  }
);


process.on(
  "SIGINT",
  async () => {

    await mongoose.connection.close();

    process.exit(0);
  }
);


// ============================================================
// START
// ============================================================

startServer();


module.exports = app;