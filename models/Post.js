const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  thread: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, maxlength: 5000 }
}, { timestamps: true });

module.exports = mongoose.models.Post || mongoose.model('Post', postSchema);