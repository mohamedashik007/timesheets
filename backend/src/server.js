require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const AllowedEmail = require('./models/AllowedEmail');
const User = require('./models/User');
const Team = require('./models/Team');

// Passport Config
require('./config/passport')(passport);

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Atlas Connected');
    // FIX FOR ISSUE #1: Ensure googleId index is sparse to allow multiple users without googleId
    try {
      const collection = mongoose.connection.collection('users');
      // Attempt to drop the old index if it exists and creates conflicts
      // Note: If this fails it might be because the index doesn't exist, which is fine.
      await collection.dropIndex('googleId_1').catch(() => {}); 
    } catch (e) {
      // Ignore errors here, just a safety cleanup
    }
  })
  .catch(err => console.log(err));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true }
  })
);

app.use(passport.initialize());
app.use(passport.session());

// --- Middleware ---
const ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') return next();
  res.status(403).json({ message: 'Access Denied: Admin rights required.' });
};

const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: 'Not Authenticated' });
};

// --- Auth Routes ---
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: 'http://localhost:5173/unauthorized' }),
  (req, res) => res.redirect('http://localhost:5173/dashboard')
);
app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('http://localhost:5173');
  });
});

// --- API Routes ---

app.get('/api/current_user', ensureAuth, (req, res) => {
  res.json(req.user);
});

// 1. GET ALL USERS
app.get('/api/users', ensureAdmin, async (req, res) => {
  try {
    const users = await User.find().populate('team');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. ADD NEW USER (WITH ROLLBACK)
app.post('/api/users', ensureAdmin, async (req, res) => {
  const { email, name, role, company } = req.body;
  const lowerEmail = email.toLowerCase();
  let allowedEmailCreated = false;

  try {
    // A. Check for existing User first (Fail fast)
    let user = await User.findOne({ email: lowerEmail });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // B. Add to Whitelist
    // We check existence first to avoid duplicate key errors on AllowedEmail
    const existingAllow = await AllowedEmail.findOne({ email: lowerEmail });
    if (!existingAllow) {
      await AllowedEmail.create({ email: lowerEmail, addedBy: req.user.email });
      allowedEmailCreated = true; // Mark that we created it
    }

    // C. Create User
    const newUser = await User.create({
      email: lowerEmail,
      displayName: name,
      role: role || 'user',
      company: company || ''
      // googleId is undefined, which works with sparse: true
    });

    res.status(201).json(newUser);

  } catch (err) {
    console.error("Error creating user:", err);

    // ROLLBACK: If we created the AllowedEmail but failed to create the User,
    // delete the AllowedEmail so the state stays clean.
    if (allowedEmailCreated) {
        await AllowedEmail.findOneAndDelete({ email: lowerEmail });
    }

    res.status(500).json({ message: 'Failed to create user. Changes rolled back.', error: err.message });
  }
});

// 3. EDIT USER
app.put('/api/users/:id', ensureAdmin, async (req, res) => {
  try {
    const { displayName, role, company } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id, 
      { displayName, role, company }, 
      { new: true }
    );
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. DELETE USER
app.delete('/api/users/:id', ensureAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    
    // If user doesn't exist, just return success (idempotent)
    if (!user) return res.json({ message: 'User already deleted' });

    // 1. Remove from Whitelist
    await AllowedEmail.findOneAndDelete({ email: user.email });

    // 2. Remove from Teams
    await Team.updateMany({ lead: userId }, { lead: null });
    await Team.updateMany({ members: userId }, { $pull: { members: userId } });
    
    // 3. Delete User
    await User.findByIdAndDelete(userId);
    
    res.json({ message: 'User and permissions deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET TEAMS
app.get('/api/teams', ensureAdmin, async (req, res) => {
  try {
    const teams = await Team.find().populate('lead').populate('members');
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. CREATE TEAM
app.post('/api/teams', ensureAdmin, async (req, res) => {
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
});

// 7. EDIT TEAM
app.put('/api/teams/:id', ensureAdmin, async (req, res) => {
  try {
    const { name, leadId, memberIds } = req.body;
    const teamId = req.params.id;

    const oldTeam = await Team.findById(teamId);
    if (!oldTeam) return res.status(404).json({ message: 'Team not found' });

    if (leadId && oldTeam.lead?.toString() !== leadId) {
       await User.findByIdAndUpdate(leadId, { team: teamId, role: 'team_lead' });
    }

    // Reset old members
    await User.updateMany(
      { team: teamId, _id: { $nin: memberIds } }, 
      { team: null }
    );

    // Set new members
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
});

// 8. DELETE TEAM
app.delete('/api/teams/:id', ensureAdmin, async (req, res) => {
  try {
    const teamId = req.params.id;
    await User.updateMany({ team: teamId }, { team: null });
    await Team.findByIdAndDelete(teamId);
    res.json({ message: 'Team deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));