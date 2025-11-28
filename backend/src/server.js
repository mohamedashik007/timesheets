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
  .then(() => console.log('MongoDB Atlas Connected'))
  .catch(err => console.log(err));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { maxAge: 24 * 60 * 60 * 1000, // secure: true, // Uncomment this line if using HTTPS (Production),
    httpOnly: true }
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

// 1. GET ALL USERS (For Admin UI)
app.get('/api/users', ensureAdmin, async (req, res) => {
  try {
    const users = await User.find().populate('team');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. ADD NEW USER (Pre-create + Whitelist)
app.post('/api/users', ensureAdmin, async (req, res) => {
  try {
    const { email, name, role } = req.body;
    const lowerEmail = email.toLowerCase();

    // A. Add to Whitelist
    const existingAllow = await AllowedEmail.findOne({ email: lowerEmail });
    if (!existingAllow) {
      await AllowedEmail.create({ email: lowerEmail, addedBy: req.user.email });
    }

    // B. Check if User exists (could be pre-created or logged in)
    let user = await User.findOne({ email: lowerEmail });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // C. Create Placeholder User
    const newUser = await User.create({
      email: lowerEmail,
      displayName: name,
      role: role || 'user'
    });

    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET TEAMS
app.get('/api/teams', ensureAdmin, async (req, res) => {
  try {
    const teams = await Team.find().populate('lead').populate('members');
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. CREATE TEAM
app.post('/api/teams', ensureAdmin, async (req, res) => {
  try {
    const { name, leadId } = req.body;
    
    const newTeam = await Team.create({ name, lead: leadId || null });
    
    // If a lead was assigned, update that User's team and role
    if (leadId) {
      await User.findByIdAndUpdate(leadId, { 
        team: newTeam._id,
        role: 'team_lead' // Promote to team lead
      });
    }

    res.status(201).json(newTeam);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));