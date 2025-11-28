const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    sparse: true
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
  company: { type: String, trim: true }, // Added Company Field
  role: {
    type: String,
    enum: ['user', 'admin', 'team_lead'],
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