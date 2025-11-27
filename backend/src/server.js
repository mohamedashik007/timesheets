require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const ensureAdmin = require('./middleware/auth.js');
const AllowedEmail = require('./models/AllowedEmail');

// Passport Config
require('./config/passport')(passport);

const app = express();
app.use(express.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Atlas Connected'))
  .catch(err => console.log(err));

// Middleware: Session
// This creates a 'sessions' collection in your Atlas DB automatically
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  })
);

// Middleware: Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
// 1. Login Route: Redirects user to Google
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// 2. Callback Route: Google redirects back here with code
app.get(
  '/auth/google/callback',
  passport.authenticate('google', { 
      successRedirect: '/dashboard',
      failureRedirect: '/unauthorized' // Redirect here if whitelist check fails
  })
);

// 3. Protected Route (Example)
app.get('/dashboard', (req, res) => {
  if (req.isAuthenticated()) {
    res.send(`<h1>Welcome ${req.user.displayName}</h1><img src="${req.user.image}" /> <br> <a href="/logout">Logout</a>`);
  } else {
    res.redirect('/');
  }
});

// Create the unauthorized page
app.get('/unauthorized', (req, res) => {
    res.status(401).send(`
        <h1>Access Denied</h1>
        <p>Your email is not on the allowed list.</p>
        <p>Please contact the administrator to request access.</p>
        <a href="/">Go Home</a>
    `);
});

// 4. Logout Route
app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// 1. Route to ADD an email to the allowlist (Admin Only)
app.post('/admin/allow-email', ensureAdmin, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).send('Email is required');

    // Check if already exists
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

app.get('/', (req, res) => {
  res.send('<h1>Home</h1><a href="/auth/google">Login with Google</a>');
});

// Admin Only Route (Only 'admin' role can see this)
app.get('/admin', ensureAdmin, (req, res) => {
  res.send(`<h1>Admin Panel</h1><p>Welcome, Master ${req.user.displayName}</p>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));