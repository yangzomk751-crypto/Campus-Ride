const QRCode = require('qrcode');
const TripModel = require('../models/tripModel');
const StopModel = require('../models/stopModel');
const BookingModel = require('../models/bookingModel');
const FeedbackModel = require('../models/feedbackModel');

const PassengerController = {
  async getBrowseTrips(req, res) {
    try {
      const { origin, destination, date } = req.query;
      const stops = await StopModel.getAll({ activeOnly: true });

      const trips = await TripModel.getUpcoming({
        originStopId: origin ? parseInt(origin, 10) : null,
        destinationStopId: destination ? parseInt(destination, 10) : null,
        date: date || null,
      });

      res.render('passenger/browseTrips', {
        title: 'Find Campus Rides - Schedules & Bookings',
        trips,
        stops,
        filters: { origin: origin || '', destination: destination || '', date: date || '' },
      });
    } catch (err) {
      console.error('Browse trips error:', err);
      req.flash('error_msg', 'Could not load campus rides.');
      res.redirect('/');
    }
  },

  async getTripDetails(req, res) {
    try {
      const tripId = parseInt(req.params.id, 10);
      const trip = await TripModel.getById(tripId);

      if (!trip) {
        req.flash('error_msg', 'The requested trip was not found.');
        return res.redirect('/trips');
      }

      res.render('passenger/tripDetails', {
        title: `${trip.route_name} - Trip Details`,
        trip,
      });
    } catch (err) {
      console.error('Trip details error:', err);
      req.flash('error_msg', 'Failed to retrieve trip details.');
      res.redirect('/trips');
    }
  },

  async postBookTrip(req, res) {
    try {
      const tripId = parseInt(req.params.id, 10);
      const seatsBooked = parseInt(req.body.seatsBooked, 10) || 1;
      const passengerId = req.session.user.id;

      if (seatsBooked < 1 || seatsBooked > 5) {
        req.flash('error_msg', 'You can book between 1 and 5 seats per reservation.');
        return res.redirect(`/trips/${tripId}`);
      }

      // Execute atomic transaction in model
      const booking = await BookingModel.createWithTransaction({
        tripId,
        passengerId,
        seatsBooked,
      });

      req.flash(
        'success_msg',
        `Ride successfully booked! Your booking reference is ${booking.booking_code}.`
      );
      res.redirect(`/bookings/${booking.id}/ticket`);
    } catch (err) {
      console.error('Booking failed:', err.message);
      req.flash('error_msg', err.message || 'Failed to complete booking. Please try again.');
      res.redirect(`/trips/${req.params.id}`);
    }
  },

  async getMyBookings(req, res) {
    try {
      const passengerId = req.session.user.id;
      const bookings = await BookingModel.getPassengerBookings(passengerId);

      res.render('passenger/myBookings', {
        title: 'My Bookings - Campus Ride',
        bookings,
      });
    } catch (err) {
      console.error('My bookings error:', err);
      req.flash('error_msg', 'Unable to retrieve your bookings.');
      res.redirect('/trips');
    }
  },

  async getBookingTicket(req, res) {
    try {
      const bookingId = parseInt(req.params.id, 10);
      const booking = await BookingModel.getById(bookingId);

      if (!booking) {
        req.flash('error_msg', 'Booking not found.');
        return res.redirect('/my-bookings');
      }

      // Check ownership or admin
      if (booking.passenger_id !== req.session.user.id && req.session.user.role !== 'admin') {
        req.flash('error_msg', 'Access denied to this ticket.');
        return res.redirect('/my-bookings');
      }

      // Generate QR Code containing verification URL/Code
      const qrData = JSON.stringify({
        code: booking.booking_code,
        passenger: booking.passenger_name,
        route: booking.route_name,
        seats: booking.seats_booked,
        departure: booking.departure_time,
      });
      const qrCodeUrl = await QRCode.toDataURL(qrData, { width: 220, margin: 1 });

      res.render('passenger/ticket', {
        title: `Boarding Pass - ${booking.booking_code}`,
        booking,
        qrCodeUrl,
      });
    } catch (err) {
      console.error('Ticket error:', err);
      req.flash('error_msg', 'Could not display boarding pass.');
      res.redirect('/my-bookings');
    }
  },

  async postCancelBooking(req, res) {
    try {
      const bookingId = parseInt(req.params.id, 10);
      const userId = req.session.user.id;
      const isAdmin = req.session.user.role === 'admin';
      const reason = req.body.cancellationReason || 'Student cancelled via web portal';

      await BookingModel.cancelWithTransaction(bookingId, userId, isAdmin, reason);

      req.flash('success_msg', 'Your booking has been cancelled and your seat released.');
      res.redirect('/my-bookings');
    } catch (err) {
      console.error('Cancel booking error:', err.message);
      req.flash('error_msg', err.message || 'Could not cancel booking.');
      res.redirect('/my-bookings');
    }
  },

  async postFeedback(req, res) {
    try {
      const { bookingId, tripId, rating, comment } = req.body;
      const passengerId = req.session.user.id;

      if (!rating || rating < 1 || rating > 5) {
        req.flash('error_msg', 'Please select a valid star rating (1-5).');
        return res.redirect('/my-bookings');
      }

      await FeedbackModel.create({
        bookingId: parseInt(bookingId, 10),
        tripId: parseInt(tripId, 10),
        passengerId,
        rating: parseInt(rating, 10),
        comment: comment || '',
      });

      req.flash('success_msg', 'Thank you for your feedback! It helps improve campus transit.');
      res.redirect('/my-bookings');
    } catch (err) {
      console.error('Feedback error:', err);
      req.flash('error_msg', 'You have already submitted feedback for this ride or an error occurred.');
      res.redirect('/my-bookings');
    }
  }
};

module.exports = PassengerController;
