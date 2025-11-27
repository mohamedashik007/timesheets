const mongoose = require('mongoose');

const AllowedEmailSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true, // Store all as lowercase to avoid mismatches
    trim: true
  },
  addedBy: {
    type: String, // Optional: Store which admin added them
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('AllowedEmail', AllowedEmailSchema);