const Timesheet = require('../models/Timesheet');
const User = require('../models/User');
const Team = require('../models/Team');

// Helper: Check if requester can access target user's data
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

// GET /api/timesheets?userId=...&month=2023-11
const getTimesheets = async (req, res) => {
  try {
    const targetUserId = req.query.userId || req.user._id.toString();
    const monthStr = req.query.month; // "YYYY-MM"

    if (!(await canAccessData(req.user, targetUserId))) {
      return res.status(403).json({ message: 'Access Denied' });
    }

    // Get range for the entire month
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

// POST /api/timesheets
const saveTimesheet = async (req, res) => {
  try {
    const { userId, date, hours } = req.body;
    const targetUserId = userId || req.user._id.toString();

    if (!(await canAccessData(req.user, targetUserId))) {
      return res.status(403).json({ message: 'Access Denied' });
    }

    const entryDate = new Date(date);
    
    // If hours is 0, we could choose to delete the entry, but updating to 0 is also fine.
    const entry = await Timesheet.findOneAndUpdate(
      { user: targetUserId, date: entryDate },
      { 
        hours, 
        updatedBy: req.user._id 
      },
      { new: true, upsert: true }
    );

    res.json(entry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/timesheets/team-members
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

module.exports = { getTimesheets, saveTimesheet, getTeamMembers };