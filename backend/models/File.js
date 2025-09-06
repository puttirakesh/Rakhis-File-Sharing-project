const mongoose = require('mongoose');
const FileSchema = new mongoose.Schema({
  filename: String,
  originalName: String,
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
  uploadDate: Date
});
module.exports = mongoose.model('File', FileSchema);
