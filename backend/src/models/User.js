const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    // unique: true, // REMOVED: Pre-created users won't have this yet
    sparse: true     // ADDED: Allows multiple docs to have null/undefined googleId
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  displayName: String,
  firstName: String,
  lastName: String,
  image: String,
  role: {
    type: String,
    enum: ['user', 'admin', 'team_lead'], // Added team_lead
    default: 'user'
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', UserSchema);