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

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- DATABASE CONNECTION & INDEX CLEANUP ---
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Atlas Connected');
    
    try {
      const collection = mongoose.connection.collection('timesheets');
      
      // 1. Drop the specific old index causing the 500 error
      if (await collection.indexExists('user_1_date_1')) {
        await collection.dropIndex('user_1_date_1');
        console.log('✅ FIXED: Dropped conflicting index "user_1_date_1"');
      }

      // 2. Drop any other potential conflicts (Optional safety)
      // await collection.dropIndexes(); 
      
    } catch (e) {
      // If index doesn't exist, that's good!
      console.log('Index check complete (No conflicts found).');
    }
  })
  .catch(err => console.log(err));

// --- SESSION SETUP ---
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { 
      maxAge: 24 * 60 * 60 * 1000, // 1 Day
      httpOnly: true 
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

// --- ROUTES ---
app.use('/auth', authRoutes);
app.use('/api', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/timesheets', timesheetRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));