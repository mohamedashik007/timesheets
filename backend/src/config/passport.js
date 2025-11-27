// config/passport.js
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const AllowedEmail = require('../models/AllowedEmail'); // Import the new model

module.exports = function (passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        const email = profile.emails[0].value.toLowerCase();

        try {
          // ---------------------------------------------------------
          // 1. CHECK WHITELIST
          // ---------------------------------------------------------
          const isAllowed = await AllowedEmail.findOne({ email: email });

          // IF NOT IN WHITELIST:
          // We return "null" for error, and "false" for user.
          // This STOPS the login process immediately.
          if (!isAllowed) {
            console.log(`Access rejected for: ${email}`);
            return done(null, false, { message: 'Email not authorized by Admin.' });
          }

          // ---------------------------------------------------------
          // 2. PROCEED IF ALLOWED
          // ---------------------------------------------------------
          
          // Check if user exists in DB
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            done(null, user);
          } else {
            // Create new user (Only happens if they passed the whitelist check)
            const newUser = {
              googleId: profile.id,
              displayName: profile.displayName,
              firstName: profile.name.givenName,
              lastName: profile.name.familyName,
              image: profile.photos[0].value,
              email: email,
              role: 'user' // Default role
            };
            user = await User.create(newUser);
            done(null, user);
          }
        } catch (err) {
          console.error(err);
          done(err, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};