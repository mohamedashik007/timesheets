const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const AllowedEmail = require('../models/AllowedEmail');

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
          // 1. Check Whitelist
          const isAllowed = await AllowedEmail.findOne({ email: email });
          if (!isAllowed) {
            console.log(`Access rejected for: ${email}`);
            return done(null, false, { message: 'Email not authorized.' });
          }

          // 2. Logic: Find User by GoogleID OR Email
          // We check for GoogleID first (fastest), then Email (for pre-created users)
          let user = await User.findOne({ 
            $or: [
                { googleId: profile.id }, 
                { email: email }
            ] 
          });

          if (user) {
            // User exists!
            // If this is a pre-created user (no googleId yet), update them now.
            if (!user.googleId) {
                user.googleId = profile.id;
                user.displayName = user.displayName || profile.displayName; // Keep admin set name if exists
                user.firstName = profile.name.givenName;
                user.lastName = profile.name.familyName;
                user.image = profile.photos[0].value;
                await user.save();
            }
            return done(null, user);
          } else {
            // No user found at all (and they are in whitelist).
            // This happens if Admin added to whitelist but didn't create a User profile.
            // We create a fresh user.
            const newUser = {
              googleId: profile.id,
              displayName: profile.displayName,
              firstName: profile.name.givenName,
              lastName: profile.name.familyName,
              image: profile.photos[0].value,
              email: email,
              role: 'user'
            };
            user = await User.create(newUser);
            return done(null, user);
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
      const user = await User.findById(id).populate('team'); // Populate team info on load
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};