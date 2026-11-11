const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

router.get('/dashboard', ensureAuthenticated, bookingController.getDashboard);

// Available Weekday Rides
router.get('/weekday-rides', ensureAuthenticated, bookingController.getWeekdayRides);
router.post('/weekday-rides', ensureAuthenticated, bookingController.postWeekdayRide);

// Book a Taxi
router.get('/book-taxi', ensureAuthenticated, bookingController.getTaxiBookingForm);
router.post('/book-taxi', ensureAuthenticated, bookingController.postTaxiBooking);

// Request a Bus
router.get('/book-bus', ensureAuthenticated, bookingController.getBusBookingForm);
router.post('/book-bus', ensureAuthenticated, bookingController.postBusBooking);

// Bookings management for passenger
router.get('/my-bookings', ensureAuthenticated, bookingController.getMyBookings);
router.get('/bookings/:id', ensureAuthenticated, bookingController.getBookingDetails);
router.post('/bookings/:id/accept-quote', ensureAuthenticated, bookingController.postAcceptQuotation);
router.post('/bookings/:id/decline-quote', ensureAuthenticated, bookingController.postDeclineQuotation);
router.post('/bookings/:id/cancel', ensureAuthenticated, bookingController.postCancelBooking);

// Payment history
router.get('/payments', ensureAuthenticated, bookingController.getPaymentHistory);
router.get('/my-payments', ensureAuthenticated, bookingController.getPaymentHistory);

module.exports = router;
