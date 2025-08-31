const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true, trim: true, minlength: 3, maxlength: 32 },
  passwordHash: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);