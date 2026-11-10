/**
 * Authentication and Role-Based Access Control (RBAC) Middleware
 */

function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.flash('error_msg', 'Please log in to access this page.');
  req.session.returnTo = req.originalUrl;
  return res.redirect('/login');
}

function ensureGuest(req, res, next) {
  if (req.session && req.session.user) {
    // Redirect based on role
    if (req.session.user.role === 'admin') return res.redirect('/admin');
    if (req.session.user.role === 'driver') return res.redirect('/driver');
    return res.redirect('/trips');
  }
  return next();
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      req.flash('error_msg', 'Please log in first.');
      return res.redirect('/login');
    }

    if (!allowedRoles.includes(req.session.user.role)) {
      req.flash('error_msg', 'Access denied. You do not have permission for this section.');
      // Redirect to their respective home
      if (req.session.user.role === 'admin') return res.redirect('/admin');
      if (req.session.user.role === 'driver') return res.redirect('/driver');
      return res.redirect('/trips');
    }

    return next();
  };
}

function populateLocals(req, res, next) {
  res.locals.currentUser = req.session ? req.session.user : null;
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.currentPath = req.path;
  res.locals.campusName = process.env.CAMPUS_NAME || 'Campus Ride';
  next();
}

module.exports = {
  ensureAuthenticated,
  ensureGuest,
  authorizeRoles,
  populateLocals,
};
