const Timesheet = require('../models/Timesheet');
const User = require('../models/User');
const Team = require('../models/Team');

// Helper: Check Permissions
const canAccessData = async (requester, targetUserId) => {
  if (!requester) return false;
  if (requester._id.toString() === targetUserId) return true;
  if (requester.role === 'admin') return true;
  
  if (requester.role === 'team_lead') {
    const team = await Team.findOne({ lead: requester._id });
    if (team && team.members.some(m => m.toString() === targetUserId)) {
      return true;
    }
  }
  return false;
};

// GET /api/timesheets
const getTimesheets = async (req, res) => {
  try {
    const targetUserId = req.query.userId || req.user._id.toString();
    const monthStr = req.query.month;

    if (!(await canAccessData(req.user, targetUserId))) {
      return res.status(403).json({ message: 'Access Denied' });
    }

    const sheet = await Timesheet.findOne({
      user: targetUserId,
      month: monthStr
    });

    // Return empty entry list if no sheet exists yet
    if (!sheet) return res.json({ entries: [] }); 

    res.json(sheet);
  } catch (err) {
    console.error("Get Timesheet Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/timesheets/bulk
const saveBulkTimesheets = async (req, res) => {
  try {
    const { userId, month, entries } = req.body;
    const targetUserId = userId || req.user._id.toString();

    if (!(await canAccessData(req.user, targetUserId))) {
      return res.status(403).json({ message: 'Access Denied' });
    }

    const totalHours = entries.reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);

    const sheet = await Timesheet.findOneAndUpdate(
      { user: targetUserId, month: month },
      { 
        $set: {
            entries: entries,
            totalHours: totalHours,
            updatedBy: req.user._id
        }
      },
      { new: true, upsert: true }
    );

    res.json({ message: 'Saved successfully', sheet });
  } catch (err) {
    console.error("Bulk Save Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET Team Members
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

// Correctly export all functions
module.exports = { getTimesheets, saveBulkTimesheets, getTeamMembers };