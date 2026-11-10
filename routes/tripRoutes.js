const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const { requireVerifiedDriver } = require('../middleware/roleMiddleware');

// Find a Ride
router.get('/find-ride', tripController.getFindRide);
router.get('/trips/find', tripController.getFindRide);

// Offer a Ride
router.get('/offer-ride', ensureAuthenticated, requireVerifiedDriver, tripController.getOfferRide);
router.get('/trips/offer', ensureAuthenticated, requireVerifiedDriver, tripController.getOfferRide);
router.post('/trips/offer', ensureAuthenticated, requireVerifiedDriver, tripController.postOfferRide);

// Trip Details
router.get('/trips/:id', tripController.getTripDetails);

// Cancel Trip (by Driver)
router.post('/trips/:id/cancel', ensureAuthenticated, tripController.postCancelTrip);

module.exports = router;
