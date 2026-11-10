const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { ensureAdmin } = require('../middleware/authMiddleware');

router.use(ensureAdmin);

// Dashboard
router.get('/', adminController.getDashboard);

// Passengers
router.get('/passengers', adminController.getPassengers);
router.post('/passengers/:id/toggle', adminController.postTogglePassengerStatus);

// Drivers
router.get('/drivers', adminController.getDrivers);
router.post('/drivers/:id/verify', adminController.postVerifyDriver);

// Vehicles
router.get('/vehicles', adminController.getVehicles);
router.post('/vehicles', adminController.postAddVehicle);
router.post('/vehicles/:id/status', adminController.postUpdateVehicleStatus);

// Bookings
router.get('/bookings', adminController.getBookings);
router.get('/weekday-rides', adminController.getWeekdayRides);
router.get('/taxi-requests', adminController.getTaxiRequests);
router.get('/bus-requests', adminController.getBusRequests);
router.post('/bus-requests/:id/assign', adminController.postAssignBus);

// Quotations
router.get('/quotations', adminController.getCustomQuotations);
router.post('/quotations/:id/quote', adminController.postQuoteFare);

// Fare chart (20 Dzongkhags)
router.get('/fare-chart', adminController.getFareChart);
router.post('/fare-chart/add', adminController.postAddFareRate);
router.post('/fare-chart/:id/update', adminController.postUpdateFareRate);
router.post('/fare-chart/:id/toggle', adminController.postToggleFareRate);

// Payments
router.get('/payments', adminController.getPayments);
router.post('/payments/:id/update', adminController.postUpdatePaymentStatus);

// Reports & Settings
router.get('/reports', adminController.getReportsAndStats);
router.get('/reports-stats', adminController.getReportsAndStats);
router.get('/settings', adminController.getSettings);

module.exports = router;
