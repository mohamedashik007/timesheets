const express = require('express');
const passport = require('passport');
const router = express.Router();
const authController = require('../controllers/authController');
const { ensureAuth } = require('../middleware/authMiddleware');

// Google Auth Trigger
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google Callback
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/unauthorized` 
  }),
  authController.googleCallback
);

// Get Current User
router.get('/current_user', ensureAuth, authController.getCurrentUser);

// Logout
router.get('/logout', authController.logout);

module.exports = router;