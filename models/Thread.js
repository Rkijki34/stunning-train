const mongoose = require('mongoose');

const threadSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tags: [{ type: String, trim: true }]
}, { timestamps: true });

module.exports = mongoose.models.Thread || mongoose.model('Thread', threadSchema);