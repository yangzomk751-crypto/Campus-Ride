const path = require('path');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const morgan = require('morgan');
require('dotenv').config();

const { populateLocals } = require('./middleware/auth');
const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const passengerRoutes = require('./routes/passengerRoutes');
const driverRoutes = require('./routes/driverRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// View Engine Setup (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// HTTP Request Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Request Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Support HTTP verbs like PUT and DELETE via hidden _method field
app.use(methodOverride('_method'));

// Serve Static Assets
app.use(express.static(path.join(__dirname, 'public')));

// Session Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'campus_ride_super_secure_secret_default',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

// Flash Messages
app.use(flash());

// Populate user and flash message data into EJS locals
app.use(populateLocals);

// Route Handlers
app.use('/', authRoutes);
app.use('/', passengerRoutes);
app.use('/driver', driverRoutes);
app.use('/admin', adminRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
