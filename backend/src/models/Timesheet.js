const mongoose = require('mongoose');

const TimesheetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date, // We will store midnight UTC for the day
    required: true
  },
  hours: {
    type: Number,
    required: true,
    min: 0,
    max: 24
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Track who made the last edit (User or Team Lead)
  }
}, { timestamps: true });

// Compound index: A user can only have ONE entry per date
TimesheetSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Timesheet', TimesheetSchema);