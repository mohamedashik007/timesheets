require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const teamRoutes = require('./routes/teamRoutes');
const timesheetRoutes = require('./routes/timesheetRoutes');

// Passport Config
require('./config/passport')(passport);

const app = express();

// --- 1. Middleware Setup ---
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 2. Database Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Atlas Connected');
    // Safety cleanup for sparse index
    try {
      const collection = mongoose.connection.collection('users');
      await collection.dropIndex('googleId_1').catch(() => {}); 
    } catch (e) {}
  })
  .catch(err => console.log(err));

// --- 3. Session Setup ---
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

// --- 4. Route Usage ---
app.use('/auth', authRoutes);      // Handles /auth/google, /auth/logout
app.use('/api', authRoutes);       // Handles /api/current_user (reusing auth routes for simplicity)
app.use('/api/users', userRoutes); // Handles /api/users CRUD
app.use('/api/teams', teamRoutes); // Handles /api/teams CRUD
app.use('/api/timesheets', timesheetRoutes); // ADD THIS LINE

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));