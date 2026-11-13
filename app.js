const path = require('path');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const morgan = require('morgan');
require('dotenv').config();

const { populateLocals, formatDate, formatTime } = require('./middleware/authMiddleware');

const publicRoutes = require('./routes/publicRoutes');
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const driverRoutes = require('./routes/driverRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

app.locals.formatDate = formatDate;
app.locals.formatTime = formatTime;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'campus_ride_super_secure_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      secure: false, // development / local
    },
  })
);

app.use(flash());
app.use(populateLocals);

// Route mounting
app.use('/', publicRoutes);         // /, /about, /services, /fare-chart, /contact
app.use('/', authRoutes);           // /login, /register, /profile, /logout
app.use('/', bookingRoutes);        // /dashboard, /weekday-rides, /book-taxi, /book-bus, /my-bookings, /payments
app.use('/', notificationRoutes);   // /notifications
app.use('/driver', driverRoutes);   // /driver, /driver/availability, /driver/requests, /driver/trips, /driver/payments
app.use('/admin', adminRoutes);     // /admin, /admin/passengers, /admin/drivers, /admin/vehicles, /admin/bookings, etc.

// 404 Handler
app.use((req, res) => {
  res.status(404).render('404', {
    title: '404 - Page Not Found | Sherubtse Campus Ride',
    url: req.originalUrl,
  });
});

// 500 Global Error Handler
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err.stack || err);
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).render('500', {
    title: '500 - Server Error | Sherubtse Campus Ride',
    error: isDev ? err : {},
    message: isDev ? err.message : 'An unexpected error occurred.',
  });
});

module.exports = app;
