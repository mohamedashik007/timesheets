require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors'); // Required for Frontend-Backend communication
const AllowedEmail = require('./models/AllowedEmail');

// Passport Config
require('./config/passport')(passport);

const app = express();

// --- 1. Middleware Setup ---

// CORS: Allow React Frontend to make requests
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173', // Frontend URL
  credentials: true // Important: Allows session cookies to be sent back and forth
}));

// Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Atlas Connected'))
  .catch(err => console.log(err));

// Session Setup
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      // secure: true, // Uncomment this line if using HTTPS (Production)
      httpOnly: true 
    }
  })
);

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// --- 2. Custom Middleware Definitions ---
// (Must be defined BEFORE they are used in routes)

const ensureAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Access Denied: Admin rights required.' });
};

const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Not Authenticated' });
};

// --- 3. Routes ---

// A. Auth Routes
// ---------------------------------------------------------
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// The Callback Route (Fixed for React Redirect)
app.get(
  '/auth/google/callback',
  passport.authenticate('google', { 
    failureRedirect: 'http://localhost:5173/unauthorized' 
  }),
  (req, res) => {
    // Successful authentication
    // Redirect to the React Dashboard
    res.redirect('http://localhost:5173/dashboard');
  }
);

// B. API Routes (For React to fetch data)
// ---------------------------------------------------------

// Get Current User (Frontend calls this to see who is logged in)
app.get('/api/current_user', ensureAuth, (req, res) => {
  res.json(req.user);
});

// Admin: Add Allowed Email
app.post('/admin/allow-email', ensureAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).send('Email is required');

    const existing = await AllowedEmail.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).send('Email already allowed');

    await AllowedEmail.create({ 
        email: email.toLowerCase(),
        addedBy: req.user.email 
    });

    res.status(200).send(`Success! ${email} can now login.`);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Logout Route
app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    // Redirect back to Frontend Login page
    res.redirect('http://localhost:5173');
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));