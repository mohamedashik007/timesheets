const User = require('../models/User');
const AllowedEmail = require('../models/AllowedEmail');
const Team = require('../models/Team');
const Timesheet = require('../models/Timesheet'); // Import Timesheet Model

// Get All Users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate('team');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add New User
const createUser = async (req, res) => {
  const { email, name, role, company } = req.body;
  const lowerEmail = email.toLowerCase();
  let allowedEmailCreated = false;

  try {
    let user = await User.findOne({ email: lowerEmail });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const existingAllow = await AllowedEmail.findOne({ email: lowerEmail });
    if (!existingAllow) {
      await AllowedEmail.create({ email: lowerEmail, addedBy: req.user.email });
      allowedEmailCreated = true;
    }

    const newUser = await User.create({
      email: lowerEmail,
      displayName: name,
      role: role || 'user',
      company: company || ''
    });

    res.status(201).json(newUser);

  } catch (err) {
    console.error("Error creating user:", err);
    if (allowedEmailCreated) {
        await AllowedEmail.findOneAndDelete({ email: lowerEmail });
    }
    res.status(500).json({ message: 'Failed to create user.', error: err.message });
  }
};

// Update User
const updateUser = async (req, res) => {
  try {
    const { displayName, company } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id, 
      { displayName, company }, 
      { new: true }
    );
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete User (FIXED: Deletes Timesheets)
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) return res.json({ message: 'User already deleted' });

    // 1. Remove from Whitelist
    await AllowedEmail.findOneAndDelete({ email: user.email });

    // 2. Remove from Teams
    await Team.updateMany({ lead: userId }, { lead: null });
    await Team.updateMany({ members: userId }, { $pull: { members: userId } });
    
    // 3. Remove User's Timesheets (NEW ADDITION)
    await Timesheet.deleteMany({ user: userId });

    // 4. Delete User
    await User.findByIdAndDelete(userId);
    
    res.json({ message: 'User and associated data deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getAllUsers, createUser, updateUser, deleteUser };