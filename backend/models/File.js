const mongoose = require("mongoose");

const FileSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
      min: 0,
    },
    fileType: {
      type: String,
      required: true,
      maxlength: 150,
    },
    publicId: {
      type: String,
      required: true,
      index: true,
    },
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
      required: true,
      index: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { versionKey: false }
);

FileSchema.index({ topic: 1, uploadedAt: -1 });
module.exports = mongoose.model('File', FileSchema);
