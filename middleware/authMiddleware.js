const db = require('../config/database');

function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    if (req.session.user.status === 'suspended') {
      req.session.destroy(() => {});
      return res.redirect('/login?suspended=1');
    }
    return next();
  }
  req.flash('error_msg', 'Please sign in to access this page.');
  req.session.returnTo = req.originalUrl;
  return res.redirect('/login');
}

function ensureGuest(req, res, next) {
  if (req.session && req.session.user) {
    if (req.session.user.role === 'admin') return res.redirect('/admin');
    if (req.session.user.role === 'driver') return res.redirect('/driver');
    return res.redirect('/dashboard');
  }
  return next();
}

function ensureRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      req.flash('error_msg', 'Please log in to continue.');
      return res.redirect('/login');
    }
    if (!roles.includes(req.session.user.role)) {
      req.flash('error_msg', 'Access denied. You do not have permission to view this resource.');
      if (req.session.user.role === 'admin') return res.redirect('/admin');
      if (req.session.user.role === 'driver') return res.redirect('/driver');
      return res.redirect('/dashboard');
    }
    next();
  };
}

async function populateLocals(req, res, next) {
  res.locals.currentUser = req.session ? req.session.user : null;
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.info_msg = req.flash('info_msg');
  res.locals.currentPath = req.path;
  res.locals.collegeName = 'Sherubtse College';

  if (req.session && req.session.user) {
    try {
      const notifRes = await db.query(
        `SELECT COUNT(*)::int AS unread_count FROM notifications WHERE user_id = $1 AND is_read = FALSE;`,
        [req.session.user.id]
      );
      res.locals.unreadNotifCount = notifRes.rows[0] ? notifRes.rows[0].unread_count : 0;

      if (req.session.user.role === 'driver') {
        const dRes = await db.query(
          `SELECT driver_id, verification_status, availability_status, weekday_available
           FROM drivers WHERE user_id = $1 LIMIT 1;`,
          [req.session.user.id]
        );
        if (dRes.rows[0]) {
          res.locals.driverInfo = dRes.rows[0];
          res.locals.isDriverVerified = dRes.rows[0].verification_status === 'Approved';
        } else {
          res.locals.driverInfo = null;
          res.locals.isDriverVerified = false;
        }
      } else {
        res.locals.driverInfo = null;
        res.locals.isDriverVerified = false;
      }
    } catch (e) {
      res.locals.unreadNotifCount = 0;
      res.locals.driverInfo = null;
      res.locals.isDriverVerified = false;
    }
  } else {
    res.locals.unreadNotifCount = 0;
    res.locals.driverInfo = null;
    res.locals.isDriverVerified = false;
  }

  next();
}

module.exports = {
  ensureAuthenticated,
  ensureGuest,
  ensureRole,
  ensureAdmin: ensureRole('admin'),
  ensureDriver: ensureRole('driver', 'admin'),
  ensurePassenger: ensureRole('passenger', 'student', 'staff', 'admin'),
  populateLocals,
};
