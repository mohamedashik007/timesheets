// Add this function above your routes in app.js

const ensureAdmin = (req, res, next) => {
  // 1. Check if user is logged in
  if (req.isAuthenticated()) {
    // 2. Check if user role is admin
    if (req.user.role === 'admin') {
      return next(); // User is allowed, proceed to the route
    } else {
      res.status(403).send('Access Denied: You are not an Admin.');
    }
  } else {
    res.redirect('/'); // Not logged in
  }
};

module.exports = ensureAdmin;