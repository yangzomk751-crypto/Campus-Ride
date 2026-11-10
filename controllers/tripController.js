const tripModel = require('../models/tripModel');
const vehicleModel = require('../models/vehicleModel');
const verificationModel = require('../models/verificationModel');
const requestModel = require('../models/requestModel');
const reviewModel = require('../models/reviewModel');

const tripController = {
  async getFindRide(req, res) {
    const { startLocation, destination, travelDate, vehicleType, sort } = req.query;

    try {
      const trips = await tripModel.findAvailableTrips({
        startLocation,
        destination,
        travelDate,
        vehicleType,
        sort,
      });

      res.render('trips/find', {
        title: 'Find a Ride | Campus Ride',
        trips,
        query: {
          startLocation: startLocation || '',
          destination: destination || '',
          travelDate: travelDate || '',
          vehicleType: vehicleType || 'all',
          sort: sort || 'date_asc',
        },
      });
    } catch (err) {
      console.error('Find a ride error:', err);
      req.flash('error_msg', 'Failed to retrieve available trips.');
      res.render('trips/find', {
        title: 'Find a Ride | Campus Ride',
        trips: [],
        query: req.query || {},
      });
    }
  },

  async getOfferRide(req, res) {
    try {
      const userId = req.session.user.id;
      const isVerified = await verificationModel.isDriverVerified(userId);
      const vehicles = await vehicleModel.getByUserId(userId);

      res.render('trips/offer', {
        title: 'Offer a Ride | Campus Ride',
        isVerified,
        vehicles,
        todayDate: new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      console.error('Offer ride page error:', err);
      req.flash('error_msg', 'Failed to load trip offer page.');
      res.redirect('/dashboard');
    }
  },

  async postOfferRide(req, res) {
    const {
      startingLocation,
      destination,
      pickupLocation,
      travelDate,
      departureTime,
      availableSeats,
      fareOrContribution,
      vehicleId,
      tripDescription,
    } = req.body;

    const userId = req.session.user.id;

    // Check verification status
    if (req.session.user.role !== 'admin') {
      const isVerified = await verificationModel.isDriverVerified(userId);
      if (!isVerified) {
        req.flash('error_msg', 'Your driver account must be verified by campus administration before publishing active trips.');
        return res.redirect('/profile');
      }
    }

    // Validation
    if (!startingLocation || !destination || !pickupLocation || !travelDate || !departureTime || !availableSeats) {
      req.flash('error_msg', 'Please provide all required trip fields.');
      return res.redirect('/trips/offer');
    }

    const seats = parseInt(availableSeats, 10);
    if (isNaN(seats) || seats <= 0) {
      req.flash('error_msg', 'Available seats must be greater than zero.');
      return res.redirect('/trips/offer');
    }

    // Check vehicle capacity limit if vehicle selected
    if (vehicleId) {
      const vehicle = await vehicleModel.getById(vehicleId);
      if (vehicle && seats > vehicle.capacity) {
        req.flash('error_msg', `Available seats (${seats}) cannot exceed vehicle passenger capacity (${vehicle.capacity}).`);
        return res.redirect('/trips/offer');
      }
    }

    // Check past date
    const today = new Date().toISOString().split('T')[0];
    if (travelDate < today) {
      req.flash('error_msg', 'Trip travel date cannot be in the past.');
      return res.redirect('/trips/offer');
    }

    try {
      const newTrip = await tripModel.createTrip({
        driverId: userId,
        vehicleId: vehicleId ? parseInt(vehicleId, 10) : null,
        startingLocation,
        destination,
        pickupLocation,
        travelDate,
        departureTime,
        availableSeats: seats,
        fareOrContribution: fareOrContribution || 0,
        tripDescription,
      });

      req.flash('success_msg', 'Trip successfully published! Passengers travelling along your route can now discover and request seats.');
      res.redirect('/my-trips');
    } catch (err) {
      console.error('Trip publish error:', err);
      req.flash('error_msg', 'Failed to publish trip: ' + err.message);
      res.redirect('/trips/offer');
    }
  },

  async getTripDetails(req, res) {
    const tripId = parseInt(req.params.id, 10);
    if (isNaN(tripId)) {
      return res.status(404).render('404', { title: '404 - Trip Not Found' });
    }

    try {
      const trip = await tripModel.getById(tripId);
      if (!trip) {
        req.flash('error_msg', 'Trip not found.');
        return res.redirect('/find-ride');
      }

      // Check current user's request status for this trip
      let userRequest = null;
      let acceptedPassengers = [];
      let isDriver = false;
      let hasReviewed = false;

      if (req.session.user) {
        isDriver = trip.driver_id === req.session.user.id;
        const requests = await requestModel.getByPassenger(req.session.user.id);
        userRequest = requests.find((r) => r.trip_id === tripId) || null;
        hasReviewed = await reviewModel.hasReviewed(tripId, req.session.user.id);
      }

      // If driver or user has accepted request or admin, show accepted passengers list
      if (isDriver || (userRequest && userRequest.request_status === 'Accepted') || (req.session.user && req.session.user.role === 'admin')) {
        acceptedPassengers = await requestModel.getAcceptedPassengers(tripId);
      }

      const driverReviews = await reviewModel.getByDriver(trip.driver_id);

      res.render('trips/details', {
        title: `${trip.starting_location} to ${trip.destination} | Campus Ride`,
        trip,
        isDriver,
        userRequest,
        acceptedPassengers,
        driverReviews,
        hasReviewed,
      });
    } catch (err) {
      console.error('Trip details error:', err);
      req.flash('error_msg', 'Error retrieving trip details.');
      res.redirect('/find-ride');
    }
  },

  async postCancelTrip(req, res) {
    const tripId = parseInt(req.params.id, 10);
    const userId = req.session.user.id;

    try {
      await tripModel.cancelTrip(tripId, userId);
      req.flash('success_msg', 'Trip cancelled. All passengers have been notified.');
      res.redirect('/my-trips');
    } catch (err) {
      console.error('Cancel trip error:', err);
      req.flash('error_msg', 'Failed to cancel trip: ' + err.message);
      res.redirect('/my-trips');
    }
  },
};

module.exports = tripController;
