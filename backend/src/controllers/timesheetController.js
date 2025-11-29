const Timesheet = require('../models/Timesheet');
const User = require('../models/User');
const Team = require('../models/Team');

// ... (Keep existing helper 'canAccessData' and 'getTimesheets') ...
const canAccessData = async (requester, targetUserId) => {
  if (requester._id.toString() === targetUserId) return true;
  if (requester.role === 'admin') return true;
  
  if (requester.role === 'team_lead') {
    const team = await Team.findOne({ lead: requester._id });
    if (team && team.members.includes(targetUserId)) {
      return true;
    }
  }
  return false;
};

const getTimesheets = async (req, res) => {
  try {
    const targetUserId = req.query.userId || req.user._id.toString();
    const monthStr = req.query.month;

    if (!(await canAccessData(req.user, targetUserId))) {
      return res.status(403).json({ message: 'Access Denied' });
    }

    const start = new Date(`${monthStr}-01`);
    const end = new Date(new Date(start).setMonth(start.getMonth() + 1));

    const entries = await Timesheet.find({
      user: targetUserId,
      date: { $gte: start, $lt: end }
    });

    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ... (Keep 'saveTimesheet' for single edits if needed, but we focus on bulk) ...
const saveTimesheet = async (req, res) => {
    // ... existing single save logic ...
    try {
    const { userId, date, hours } = req.body;
    const targetUserId = userId || req.user._id.toString();

    if (!(await canAccessData(req.user, targetUserId))) {
      return res.status(403).json({ message: 'Access Denied' });
    }

    const entryDate = new Date(date);
    const entry = await Timesheet.findOneAndUpdate(
      { user: targetUserId, date: entryDate },
      { hours, updatedBy: req.user._id },
      { new: true, upsert: true }
    );

    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// NEW: Bulk Save
const saveBulkTimesheets = async (req, res) => {
  try {
    const { userId, entries } = req.body; // entries = [{ date, hours }, ...]
    const targetUserId = userId || req.user._id.toString();

    if (!(await canAccessData(req.user, targetUserId))) {
      return res.status(403).json({ message: 'Access Denied' });
    }

    const operations = entries.map(entry => ({
      updateOne: {
        filter: { user: targetUserId, date: new Date(entry.date) },
        update: { $set: { hours: entry.hours, updatedBy: req.user._id } },
        upsert: true
      }
    }));

    if (operations.length > 0) {
      await Timesheet.bulkWrite(operations);
    }

    res.json({ message: 'Saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getTeamMembers = async (req, res) => {
  try {
    if (req.user.role !== 'team_lead') return res.json([]);
    const team = await Team.findOne({ lead: req.user._id }).populate('members', 'displayName email');
    if (!team) return res.json([]);
    res.json(team.members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getTimesheets, saveTimesheet, saveBulkTimesheets, getTeamMembers };