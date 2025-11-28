const getCurrentUser = (req, res) => {
  res.json(req.user);
};

const logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect(process.env.CLIENT_URL || 'http://localhost:5173');
  });
};

const googleCallback = (req, res) => {
  // Successful authentication
  res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard`);
};

module.exports = { getCurrentUser, logout, googleCallback };