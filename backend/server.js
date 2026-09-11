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

const MAX_FILE_SIZE_MB = Number(
  process.env.MAX_FILE_SIZE_MB || 25
);

const MAX_FILES_PER_UPLOAD = Number(
  process.env.MAX_FILES_PER_UPLOAD || 10
);

/* ============================================================
   MODELS
============================================================ */

const File = require("./models/File");
const Topic = require("./models/Topic");
const User = require("./models/User");

/* ============================================================
   REQUIRED ENVIRONMENT VARIABLES
============================================================ */

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
    throw new Error(
      `Missing required environment variable: ${key}`
    );
  }
}

/* ============================================================
   CORS
============================================================ */

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

const uniqueOrigins = [
  ...new Set(allowedOrigins),
];

/* ============================================================
   EXPRESS
============================================================ */

app.disable("x-powered-by");

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const normalized =
        normalizeOrigin(origin);

      if (
        uniqueOrigins.includes(
          normalized
        )
      ) {
        return callback(null, true);
      }

      console.warn(
        `Blocked CORS origin: ${origin}`
      );

      return callback(
        new Error(
          "Not allowed by CORS"
        )
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

/* ============================================================
   CLOUDINARY
============================================================ */

cloudinary.config({
  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME,

  api_key:
    process.env.CLOUDINARY_API_KEY,

  api_secret:
    process.env.CLOUDINARY_API_SECRET,

  secure: true,
});

/* ============================================================
   CLOUDINARY HELPERS
============================================================ */

const getResourceType = (
  mimeType = ""
) => {
  const type =
    mimeType.toLowerCase();

  if (type.startsWith("image/")) {
    return "image";
  }

  if (type.startsWith("video/")) {
    return "video";
  }

  return "raw";
};

const sanitizePublicIdPart = (
  name = "file"
) => {
  return name
    .replace(/\.[^/.]+$/, "")
    .replace(
      /[^a-zA-Z0-9_-]/g,
      "-"
    )
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "file";
};

/* ============================================================
   CLOUDINARY STORAGE
============================================================ */

const storage =
  new CloudinaryStorage({
    cloudinary,

    params: async (
      req,
      file
    ) => {
      const resourceType =
        getResourceType(
          file.mimetype
        );

      const safeName =
        sanitizePublicIdPart(
          file.originalname
        );

      return {
        folder:
          "rakhis-file-sharing/uploads",

        public_id:
          `file-${Date.now()}-${crypto.randomUUID()}-${safeName}`,

        resource_type:
          resourceType,

        use_filename:
          false,

        unique_filename:
          false,
      };
    },
  });

/* ============================================================
   FILE VALIDATION
============================================================ */

const allowedMimeTypes =
  new Set([
    "application/pdf",

    "application/msword",

    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

    "application/vnd.ms-powerpoint",

    "application/vnd.openxmlformats-officedocument.presentationml.presentation",

    "application/vnd.ms-excel",

    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

    "text/plain",

    "text/csv",

    "text/markdown",

    "application/json",

    "application/xml",

    "text/xml",

    "text/html",

    "text/css",

    "text/javascript",

    "application/javascript",

    "application/x-javascript",

    "application/typescript",

    "text/typescript",

    "text/x-python",

    "text/x-java-source",

    "text/x-c",

    "text/x-c++",

    "application/x-httpd-php",

    "application/zip",

    "application/x-zip-compressed",

    "application/x-7z-compressed",

    "application/x-rar-compressed",

    "application/gzip",

    "application/x-gzip",

    "image/jpeg",

    "image/png",

    "image/webp",

    "image/gif",

    "image/svg+xml",

    "video/mp4",

    "video/webm",

    "video/quicktime",

    "audio/mpeg",

    "audio/wav",

    "audio/ogg",

    "audio/webm",

    "audio/mp4",

    "application/octet-stream",
  ]);

const allowedExtensions =
  new Set([
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

    "zip",
    "7z",
    "rar",
    "gz",
    "tar",

    "jpg",
    "jpeg",
    "png",
    "webp",
    "gif",
    "svg",

    "mp4",
    "webm",
    "mov",

    "mp3",
    "wav",
    "ogg",
    "m4a",
  ]);

const getExtension = (
  filename = ""
) => {
  const parts =
    filename
      .toLowerCase()
      .split(".");

  if (
    parts.length <= 1
  ) {
    return "";
  }

  return parts.pop();
};

/* ============================================================
   MULTER
============================================================ */

const upload = multer({
  storage,

  limits: {
    files:
      MAX_FILES_PER_UPLOAD,

    fileSize:
      MAX_FILE_SIZE_MB *
      1024 *
      1024,
  },

  fileFilter: (
    req,
    file,
    callback
  ) => {
    const mimeType =
      (
        file.mimetype ||
        ""
      ).toLowerCase();

    const extension =
      getExtension(
        file.originalname
      );

    const mimeAllowed =
      allowedMimeTypes.has(
        mimeType
      );

    const extensionAllowed =
      allowedExtensions.has(
        extension
      );

    /*
      Accept the file when either:
      1. MIME type is recognized
      OR
      2. Extension is recognized

      This handles browser/OS MIME differences.
    */

    if (
      mimeAllowed ||
      extensionAllowed
    ) {
      return callback(
        null,
        true
      );
    }

    console.warn(
      `Rejected upload: ${file.originalname} (${mimeType || "unknown"})`
    );

    /*
      IMPORTANT:
      Use normal Error here.

      Do NOT create MulterError manually.
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

/* ============================================================
   AUTH HELPERS
============================================================ */

const createToken = (
  userId
) => {
  return jwt.sign(
    {
      id: userId,
    },

    process.env.JWT_SECRET,

    {
      expiresIn: "7d",
    }
  );
};

const validateObjectId = (
  value
) => {
  return mongoose.isValidObjectId(
    value
  );
};

/* ============================================================
   AUTH MIDDLEWARE
============================================================ */

const auth = async (
  req,
  res,
  next
) => {
  try {
    const header =
      req.get(
        "Authorization"
      ) || "";

    if (
      !header.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        message:
          "Authentication required.",
      });
    }

    const token =
      header
        .slice(7)
        .trim();

    if (!token) {
      return res.status(401).json({
        message:
          "Authentication required.",
      });
    }

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    const user =
      await User.findById(
        decoded.id
      ).select(
        "-password"
      );

    if (!user) {
      return res.status(401).json({
        message:
          "User account not found.",
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

/* ============================================================
   TEACHER AUTHORIZATION
============================================================ */

const requireTeacher = (
  req,
  res,
  next
) => {
  if (
    req.user?.role !==
    "teacher"
  ) {
    return res.status(403).json({
      message:
        "Teacher privileges are required.",
    });
  }

  next();
};

/* ============================================================
   ROOT
============================================================ */

app.get(
  "/",
  (req, res) => {
    res.json({
      name:
        "Rakhis File Sharing API",

      status:
        "running",

      environment:
        NODE_ENV,
    });
  }
);

/* ============================================================
   HEALTH CHECK
============================================================ */

app.get(
  "/health",
  (req, res) => {
    const connected =
      mongoose.connection
        .readyState === 1;

    res
      .status(
        connected
          ? 200
          : 503
      )
      .json({
        status:
          connected
            ? "ok"
            : "degraded",

        database:
          connected
            ? "connected"
            : "disconnected",

        uptime:
          Math.round(
            process.uptime()
          ),
      });
  }
);

/* ============================================================
   REGISTER
============================================================ */

app.post(
  "/api/register",
  async (
    req,
    res
  ) => {
    try {
      const name =
        String(
          req.body.name ||
            ""
        ).trim();

      const email =
        String(
          req.body.email ||
            ""
        )
          .trim()
          .toLowerCase();

      const password =
        String(
          req.body.password ||
            ""
        );

      const role =
        req.body.role ===
        "teacher"
          ? "teacher"
          : "student";

      const teacherKey =
        String(
          req.body
            .teacherKey ||
            ""
        );

      if (
        name.length < 2 ||
        name.length > 80
      ) {
        return res.status(400).json({
          message:
            "Name must be between 2 and 80 characters.",
        });
      }

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

      if (
        password.length < 8
      ) {
        return res.status(400).json({
          message:
            "Password must be at least 8 characters.",
        });
      }

      if (
        role ===
          "teacher" &&
        teacherKey !==
          process.env.TEACHER_KEY
      ) {
        return res.status(400).json({
          message:
            "Invalid teacher access key.",
        });
      }

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

      const hashedPassword =
        await bcrypt.hash(
          password,
          12
        );

      const user =
        await User.create({
          name,

          email,

          password:
            hashedPassword,

          role,
        });

      const token =
        createToken(
          user.id
        );

      return res
        .status(201)
        .json({
          token,

          user: {
            id:
              user.id,

            name:
              user.name,

            email:
              user.email,

            role:
              user.role,
          },
        });
    } catch (error) {
      console.error(
        "Register error:",
        error
      );

      if (
        error.code ===
        11000
      ) {
        return res.status(409).json({
          message:
            "An account with this email already exists.",
        });
      }

      return res.status(500).json({
        message:
          "Unable to create the account.",
      });
    }
  }
);

/* ============================================================
   LOGIN
============================================================ */

app.post(
  "/api/login",
  async (
    req,
    res
  ) => {
    try {
      const email =
        String(
          req.body.email ||
            ""
        )
          .trim()
          .toLowerCase();

      const password =
        String(
          req.body.password ||
            ""
        );

      const teacherKey =
        String(
          req.body
            .teacherKey ||
            ""
        );

      /* --------------------------------------------------------
         TEACHER KEY LOGIN
      -------------------------------------------------------- */

      if (teacherKey) {
        if (
          process.env
            .TEACHER_KEY_LOGIN_ENABLED !==
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

        let teacher =
          await User.findOne({
            role: "teacher",
          }).sort({
            createdAt: 1,
          });

        if (!teacher) {
          teacher =
            await User.create({
              name:
                "Teacher",

              email:
                `teacher-${Date.now()}@file-sharing.local`,

              password:
                await bcrypt.hash(
                  crypto.randomUUID(),
                  12
                ),

              role:
                "teacher",
            });
        }

        return res.json({
          token:
            createToken(
              teacher.id
            ),

          user: {
            id:
              teacher.id,

            name:
              teacher.name,

            email:
              teacher.email,

            role:
              teacher.role,
          },
        });
      }

      /* --------------------------------------------------------
         NORMAL LOGIN
      -------------------------------------------------------- */

      if (
        !email ||
        !password
      ) {
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

      if (
        !passwordMatches
      ) {
        return res.status(401).json({
          message:
            "Invalid email or password.",
        });
      }

      return res.json({
        token:
          createToken(
            user.id
          ),

        user: {
          id:
            user.id,

          name:
            user.name,

          email:
            user.email,

          role:
            user.role,
        },
      });
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to sign you in.",
      });
    }
  }
);

/* ============================================================
   CURRENT USER
============================================================ */

app.get(
  "/api/me",
  auth,
  (req, res) => {
    res.json({
      user:
        req.user,
    });
  }
);

/* ============================================================
   GET ALL FOLDERS
============================================================ */

app.get(
  "/api/topics",
  async (
    req,
    res
  ) => {
    try {
      const topics =
        await Topic.find()
          .sort({
            createdAt: -1,
          })
          .lean();

      const topicIds =
        topics.map(
          (topic) =>
            topic._id
        );

      const counts =
        topicIds.length
          ? await File.aggregate([
              {
                $match: {
                  topic: {
                    $in:
                      topicIds,
                  },
                },
              },

              {
                $group: {
                  _id:
                    "$topic",

                  count: {
                    $sum: 1,
                  },
                },
              },
            ])
          : [];

      const countMap =
        Object.fromEntries(
          counts.map(
            (item) => [
              item._id.toString(),
              item.count,
            ]
          )
        );

      return res.json(
        topics.map(
          (topic) => ({
            ...topic,

            fileCount:
              countMap[
                topic._id.toString()
              ] || 0,
          })
        )
      );
    } catch (error) {
      console.error(
        "Get topics error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to load folders.",
      });
    }
  }
);

/* ============================================================
   CREATE FOLDER
============================================================ */

app.post(
  "/api/topics",
  auth,
  requireTeacher,
  async (
    req,
    res
  ) => {
    try {
      const title =
        String(
          req.body.title ||
            ""
        ).trim();

      const description =
        String(
          req.body
            .description ||
            ""
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
        await Topic.create({
          title,

          description:
            description.slice(
              0,
              300
            ),
        });

      return res
        .status(201)
        .json({
          ...topic.toObject(),

          fileCount: 0,
        });
    } catch (error) {
      console.error(
        "Create topic error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to create folder.",
      });
    }
  }
);

/* ============================================================
   UPDATE FOLDER
============================================================ */

app.put(
  "/api/topics/:topicId",
  auth,
  requireTeacher,
  async (
    req,
    res
  ) => {
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

      const title =
        String(
          req.body.title ||
            ""
        ).trim();

      const description =
        String(
          req.body
            .description ||
            ""
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
          topicId,

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

            runValidators:
              true,
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
          topic:
            topic._id,
        });

      return res.json({
        ...topic.toObject(),

        fileCount,
      });
    } catch (error) {
      console.error(
        "Edit topic error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to update folder.",
      });
    }
  }
);

/* ============================================================
   GET FILES INSIDE FOLDER
============================================================ */

app.get(
  "/api/topics/:topicId/files",
  async (
    req,
    res
  ) => {
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
          topic:
            topicId,
        })
          .sort({
            uploadedAt: -1,
          })
          .lean();

      return res.json(
        files
      );
    } catch (error) {
      console.error(
        "Get files error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to load files.",
      });
    }
  }
);

/* ============================================================
   GET ALL FILES
============================================================ */

app.get(
  "/api/files",
  async (
    req,
    res
  ) => {
    try {
      const files =
        await File.find()
          .sort({
            uploadedAt: -1,
          })
          .lean();

      return res.json(
        files
      );
    } catch (error) {
      console.error(
        "Get all files error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to load files.",
      });
    }
  }
);

/* ============================================================
   UPLOAD FILES
============================================================ */

app.post(
  "/api/upload",

  auth,

  requireTeacher,

  upload.array(
    "files",
    MAX_FILES_PER_UPLOAD
  ),

  async (
    req,
    res
  ) => {
    const uploadedToCloudinary =
      [];

    try {
      const {
        topicId,
      } = req.body;

      if (
        !validateObjectId(
          topicId
        )
      ) {
        return res.status(400).json({
          message:
            "Please select a valid folder.",
        });
      }

      const topic =
        await Topic.findById(
          topicId
        );

      if (!topic) {
        return res.status(404).json({
          message:
            "Selected folder was not found.",
        });
      }

      if (
        !req.files ||
        !req.files.length
      ) {
        return res.status(400).json({
          message:
            "Please choose at least one file.",
        });
      }

      const savedFiles =
        [];

      for (
        const file of req.files
      ) {
        if (
          !file.path ||
          !file.filename
        ) {
          throw new Error(
            `Cloudinary did not return a usable result for ${file.originalname}.`
          );
        }

        const resourceType =
          getResourceType(
            file.mimetype
          );

        uploadedToCloudinary.push({
          publicId:
            file.filename,

          resourceType,
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

      return res
        .status(201)
        .json(
          savedFiles
        );
    } catch (error) {
      console.error(
        "Upload error:",
        error
      );

      /* --------------------------------------------------------
         CLOUDINARY ROLLBACK
      -------------------------------------------------------- */

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

      /* --------------------------------------------------------
         MULTER ERRORS
      -------------------------------------------------------- */

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

      /* --------------------------------------------------------
         UNSUPPORTED FILE TYPE
      -------------------------------------------------------- */

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

      return res.status(500).json({
        message:
          `Upload failed: ${error.message}`,
      });
    }
  }
);

/* ============================================================
   RENAME FILE
============================================================ */

app.put(
  "/api/files/:fileId",
  auth,
  requireTeacher,
  async (
    req,
    res
  ) => {
    try {
      const {
        fileId,
      } = req.params;

      if (
        !validateObjectId(
          fileId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid file id.",
        });
      }

      const newName =
        String(
          req.body.newName ||
            ""
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
          fileId
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

      return res.json(
        file
      );
    } catch (error) {
      console.error(
        "Edit file error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to rename file.",
      });
    }
  }
);

/* ============================================================
   DELETE FILE
============================================================ */

app.delete(
  "/api/files/:fileId",
  auth,
  requireTeacher,
  async (
    req,
    res
  ) => {
    try {
      const {
        fileId,
      } = req.params;

      if (
        !validateObjectId(
          fileId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid file id.",
        });
      }

      const file =
        await File.findById(
          fileId
        );

      if (!file) {
        return res.status(404).json({
          message:
            "File not found.",
        });
      }

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
              "Cloudinary delete warning:",
              error.message
            );
          }
        );

      await File.findByIdAndDelete(
        file._id
      );

      return res.json({
        message:
          "File deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Delete file error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to delete file.",
      });
    }
  }
);

/* ============================================================
   DELETE FOLDER + ALL FILES
============================================================ */

app.delete(
  "/api/topics/:topicId",
  auth,
  requireTeacher,
  async (
    req,
    res
  ) => {
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

      const topic =
        await Topic.findById(
          topicId
        );

      if (!topic) {
        return res.status(404).json({
          message:
            "Folder not found.",
        });
      }

      const files =
        await File.find({
          topic:
            topicId,
        });

      for (
        const file
        of files
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
                `Cloudinary delete warning for ${file.publicId}:`,
                error.message
              );
            }
          );
      }

      await File.deleteMany({
        topic:
          topicId,
      });

      await Topic.findByIdAndDelete(
        topicId
      );

      return res.json({
        message:
          "Folder and its files deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Delete topic error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to delete folder.",
      });
    }
  }
);

/* ============================================================
   DOWNLOAD FILE
============================================================ */

app.get(
  "/api/download/:fileId",
  async (
    req,
    res
  ) => {
    try {
      const {
        fileId,
      } = req.params;

      if (
        !validateObjectId(
          fileId
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid file id.",
        });
      }

      const file =
        await File.findById(
          fileId
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
                status >=
                  200 &&
                status < 300,
          }
        );

      const safeName =
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
          safeName
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

      response.data.pipe(
        res
      );
    } catch (error) {
      console.error(
        "Download error:",
        error.message
      );

      if (
        !res.headersSent
      ) {
        const status =
          error.response?.status ===
          404
            ? 404
            : 500;

        return res
          .status(status)
          .json({
            message:
              status ===
              404
                ? "File was not found in storage."
                : "Unable to download file.",
          });
      }
    }
  }
);

/* ============================================================
   GLOBAL ERROR HANDLER
============================================================ */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    /* --------------------------------------------------------
       CORS
    -------------------------------------------------------- */

    if (
      error?.message ===
      "Not allowed by CORS"
    ) {
      return res.status(403).json({
        message:
          "This website is not allowed to access the API.",
      });
    }

    /* --------------------------------------------------------
       MULTER
    -------------------------------------------------------- */

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

    /* --------------------------------------------------------
       UNSUPPORTED FILE TYPE
    -------------------------------------------------------- */

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

    /* --------------------------------------------------------
       UNKNOWN ERROR
    -------------------------------------------------------- */

    console.error(
      "Unhandled server error:",
      error
    );

    if (
      !res.headersSent
    ) {
      return res.status(500).json({
        message:
          "Internal server error.",
      });
    }

    return next(error);
  }
);

/* ============================================================
   START SERVER
============================================================ */

const startServer =
  async () => {
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
            `Environment: ${NODE_ENV}`
          );

          console.log(
            `Max file size: ${MAX_FILE_SIZE_MB} MB`
          );

          console.log(
            `Max files per upload: ${MAX_FILES_PER_UPLOAD}`
          );

          console.log(
            `Allowed origins: ${
              uniqueOrigins.join(
                ", "
              ) ||
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

/* ============================================================
   GRACEFUL SHUTDOWN
============================================================ */

const shutdown =
  async (
    signal
  ) => {
    console.log(
      `${signal} received. Shutting down...`
    );

    await mongoose.connection
      .close()
      .catch(
        () => {}
      );

    process.exit(0);
  };

process.on(
  "SIGTERM",
  () =>
    shutdown(
      "SIGTERM"
    )
);

process.on(
  "SIGINT",
  () =>
    shutdown(
      "SIGINT"
    )
);

/* ============================================================
   START
============================================================ */

startServer();

/* ============================================================
   EXPORT
============================================================ */

module.exports = app;