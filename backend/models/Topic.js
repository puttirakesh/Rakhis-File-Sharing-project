const mongoose = require("mongoose");

const TopicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
  },
  { timestamps: true }
);

TopicSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Topic", TopicSchema);

