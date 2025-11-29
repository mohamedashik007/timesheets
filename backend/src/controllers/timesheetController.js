const Timesheet = require('../models/Timesheet');
const User = require('../models/User');
const Team = require('../models/Team');

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
exports.getTimesheets = async (req, res) => {
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

    if (!sheet) return res.json({ entries: [] }); 

    res.json(sheet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/timesheets/bulk
exports.saveBulkTimesheets = async (req, res) => {
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

exports.getTeamMembers = async (req, res) => {
  try {
    if (req.user.role !== 'team_lead') return res.json([]);
    const team = await Team.findOne({ lead: req.user._id }).populate('members', 'displayName email');
    if (!team) return res.json([]);
    res.json(team.members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// NEW: GET All User Stats (Admin Only)
exports.getAllUserStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access Denied' });
    }

    const { month } = req.query;

    // 1. Get all users with their team info
    const users = await User.find().populate('team', 'name');

    // 2. Get timesheets for the selected month
    const timesheets = await Timesheet.find({ month });

    // 3. Merge Data
    const report = users.map(user => {
      const sheet = timesheets.find(t => t.user.toString() === user._id.toString());
      return {
        _id: user._id,
        displayName: user.displayName,
        email: user.email,
        company: user.company || 'N/A',
        teamName: user.team?.name || 'Unassigned',
        totalHours: sheet ? sheet.totalHours : 0,
        entries: sheet ? sheet.entries : [] // For detailed view
      };
    });

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};