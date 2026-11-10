const verificationModel = require('../models/verificationModel');

function checkRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      req.flash('error_msg', 'Please sign in first.');
      return res.redirect('/login');
    }

    if (!allowedRoles.includes(req.session.user.role)) {
      req.flash('error_msg', 'Unauthorized access: You do not have permission to view that page.');
      if (req.session.user.role === 'admin') return res.redirect('/admin');
      return res.redirect('/dashboard');
    }

    next();
  };
}

async function requireVerifiedDriver(req, res, next) {
  if (!req.session || !req.session.user) {
    req.flash('error_msg', 'Please sign in first.');
    return res.redirect('/login');
  }

  if (req.session.user.role === 'admin') {
    return next();
  }

  if (req.session.user.role !== 'driver') {
    req.flash('error_msg', 'Only registered drivers can offer rides. You can register vehicle details in your profile.');
    return res.redirect('/profile');
  }

  const isVerified = await verificationModel.isDriverVerified(req.session.user.id);
  if (!isVerified) {
    req.flash('error_msg', 'Your driver account has not been verified by campus administration yet. You cannot publish active trips until verified.');
    return res.redirect('/profile');
  }

  next();
}

module.exports = {
  checkRole,
  requireVerifiedDriver,
};
