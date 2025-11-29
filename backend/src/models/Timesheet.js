const mongoose = require('mongoose');

const TimesheetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  hours: {
    type: Number,
    required: true,
    min: 0,
    max: 24,
    default: 0
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Compound index: A user can only have ONE entry per date
TimesheetSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Timesheet', TimesheetSchema);