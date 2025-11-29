const mongoose = require('mongoose');

const TimesheetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: String, // Format: "YYYY-MM"
    required: true
  },
  // We store daily hours in an object map for easy access: { "01": 8, "02": 0, ... }
  // OR an array of objects. Let's use an array for flexibility.
  entries: [{
    date: { type: Date, required: true },
    hours: { type: Number, default: 0, min: 0, max: 24 }
  }],
  totalHours: {
    type: Number,
    default: 0
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Ensure unique month per user
TimesheetSchema.index({ user: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Timesheet', TimesheetSchema);