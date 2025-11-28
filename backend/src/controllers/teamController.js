const Team = require('../models/Team');
const User = require('../models/User');

// Get All Teams
const getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find().populate('lead').populate('members');
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create Team
const createTeam = async (req, res) => {
  try {
    const { name, leadId, memberIds = [] } = req.body;
    
    const newTeam = await Team.create({ 
      name, 
      lead: leadId || null,
      members: memberIds 
    });
    
    if (leadId) {
      await User.findByIdAndUpdate(leadId, { team: newTeam._id, role: 'team_lead' });
    }

    if (memberIds.length > 0) {
      await User.updateMany(
        { _id: { $in: memberIds } },
        { team: newTeam._id }
      );
    }

    res.status(201).json(newTeam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Team
const updateTeam = async (req, res) => {
  try {
    const { name, leadId, memberIds } = req.body;
    const teamId = req.params.id;

    const oldTeam = await Team.findById(teamId);
    if (!oldTeam) return res.status(404).json({ message: 'Team not found' });

    // Handle Lead Change
    if (leadId && oldTeam.lead?.toString() !== leadId) {
       // Demote old lead if they exist
       if (oldTeam.lead) {
         await User.findByIdAndUpdate(oldTeam.lead, { role: 'user' });
       }
       // Promote new lead
       await User.findByIdAndUpdate(leadId, { team: teamId, role: 'team_lead' });
    } else if (!leadId && oldTeam.lead) {
       // If lead is removed entirely, demote old lead
       await User.findByIdAndUpdate(oldTeam.lead, { role: 'user' });
    }

    // Handle Removed Members
    const idsToKeepInTeam = [...(memberIds || [])];
    if (leadId) idsToKeepInTeam.push(leadId);

    await User.updateMany(
      { team: teamId, _id: { $nin: idsToKeepInTeam } }, 
      { team: null }
    );

    // Handle Added Members
    if (memberIds && memberIds.length > 0) {
      await User.updateMany(
        { _id: { $in: memberIds } },
        { team: teamId }
      );
    }

    const updatedTeam = await Team.findByIdAndUpdate(
      teamId, 
      { name, lead: leadId || null, members: memberIds }, 
      { new: true }
    );
    res.json(updatedTeam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete Team (FIXED: Reverts Lead Role)
const deleteTeam = async (req, res) => {
  try {
    const teamId = req.params.id;

    // 1. Find team to identify the lead
    const team = await Team.findById(teamId);
    if (!team) return res.json({ message: 'Team already deleted' });

    // 2. Revert Lead role to 'user'
    if (team.lead) {
      await User.findByIdAndUpdate(team.lead, { role: 'user' });
    }

    // 3. Clear team reference for all members
    await User.updateMany({ team: teamId }, { team: null });

    // 4. Delete the team
    await Team.findByIdAndDelete(teamId);
    
    res.json({ message: 'Team deleted and lead demoted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAllTeams, createTeam, updateTeam, deleteTeam };