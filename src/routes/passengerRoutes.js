const express = require('express');
const router = express.Router();
const PassengerController = require('../controllers/passengerController');
const { ensureAuthenticated } = require('../middleware/auth');
const StopModel = require('../models/stopModel');
const TripModel = require('../models/tripModel');

// Home Landing Page
router.get('/', async (req, res) => {
  try {
    const stops = await StopModel.getAll({ activeOnly: true });
    const upcomingTrips = await TripModel.getUpcoming();
    res.render('home', {
      title: 'Welcome to Campus Ride - Campus Transit Booking',
      stops,
      upcomingTrips: upcomingTrips.slice(0, 4),
    });
  } catch (err) {
    console.error('Home page error:', err);
    res.render('home', {
      title: 'Welcome to Campus Ride',
      stops: [],
      upcomingTrips: [],
    });
  }
});

// Browse & Search Trips
router.get('/trips', PassengerController.getBrowseTrips);
router.get('/trips/:id', PassengerController.getTripDetails);

// Booking actions (require login)
router.post('/trips/:id/book', ensureAuthenticated, PassengerController.postBookTrip);
router.get('/my-bookings', ensureAuthenticated, PassengerController.getMyBookings);
router.get('/bookings/:id/ticket', ensureAuthenticated, PassengerController.getBookingTicket);
router.post('/bookings/:id/cancel', ensureAuthenticated, PassengerController.postCancelBooking);

// Feedback
router.post('/feedback', ensureAuthenticated, PassengerController.postFeedback);

module.exports = router;
