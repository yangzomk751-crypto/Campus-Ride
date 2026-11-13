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

function formatDate(d) {
  if (!d) return '';
  if (d instanceof Date) {
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const day = d.getUTCDate();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getUTCDay()]}, ${day} ${months[month]} ${year}`;
  }
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, day] = s.split('T')[0].split('-');
    const dateObj = new Date(Date.UTC(+y, +m - 1, +day));
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[dateObj.getUTCDay()]}, ${parseInt(day, 10)} ${months[+m - 1]} ${y}`;
  }
  if (s.includes('00:00:00') || s.includes('GMT') || s.includes('Coordinated')) {
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getUTCFullYear();
      const month = parsed.getUTCMonth();
      const day = parsed.getUTCDate();
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${days[parsed.getUTCDay()]}, ${day} ${months[month]} ${year}`;
    }
  }
  return s;
}

function formatTime(t) {
  if (!t) return '';
  const s = String(t).trim();
  const parts = s.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    if (!isNaN(hours)) {
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 || 12;
      return `${h12}:${minutes} ${ampm}`;
    }
  }
  return s;
}

async function populateLocals(req, res, next) {
  res.locals.currentUser = req.session ? req.session.user : null;
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.info_msg = req.flash('info_msg');
  res.locals.currentPath = req.path;
  res.locals.collegeName = 'Sherubtse College';
  res.locals.formatDate = formatDate;
  res.locals.formatTime = formatTime;

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
  formatDate,
  formatTime,
};
