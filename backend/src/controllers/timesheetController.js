const Timesheet = require('../models/Timesheet');
const Team = require('../models/Team');

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

    let sheet = await Timesheet.findOne({ user: targetUserId, month: monthStr });

    if (!sheet) {
      // Return empty structure if not found, don't create yet
      return res.json({ month: monthStr, entries: [], totalHours: 0 });
    }

    res.json(sheet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/timesheets/bulk
// Accepts: { userId, month: "2023-11", entries: [{ date: "...", hours: 8 }, ...] }
const saveBulkTimesheets = async (req, res) => {
  try {
    const { userId, month, entries } = req.body;
    const targetUserId = userId || req.user._id.toString();

    if (!(await canAccessData(req.user, targetUserId))) {
      return res.status(403).json({ message: 'Access Denied' });
    }

    // Calculate Total Hours
    const totalHours = entries.reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);

    const sheet = await Timesheet.findOneAndUpdate(
      { user: targetUserId, month },
      { 
        entries, 
        totalHours,
        updatedBy: req.user._id 
      },
      { new: true, upsert: true }
    );

    res.json(sheet);
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

module.exports = { getTimesheets, saveBulkTimesheets, getTeamMembers };