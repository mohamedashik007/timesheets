const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true, // Important: Ensures we don't create duplicate users
  },
  displayName: {
    type: String,
    required: true,
  },
  firstName: String,
  lastName: String,
  image: String,
  email: String,
  role: {
    type: String,
    enum: ['user', 'admin'], // Valid values
    default: 'user'          // Default role
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', UserSchema);