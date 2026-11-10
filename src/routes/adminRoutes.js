const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { ensureAuthenticated, authorizeRoles } = require('../middleware/auth');

// Protect all admin routes
router.use(ensureAuthenticated);
router.use(authorizeRoles('admin'));

// Admin Dashboard
router.get('/', AdminController.getDashboard);

// Campus Stops Management
router.get('/stops', AdminController.getStops);
router.post('/stops', AdminController.postCreateStop);
router.post('/stops/:id/delete', AdminController.postDeleteStop);

// Routes Management
router.get('/routes', AdminController.getRoutes);
router.post('/routes', AdminController.postCreateRoute);
router.post('/routes/:id/delete', AdminController.postDeleteRoute);

// Fleet / Vehicles Management
router.get('/vehicles', AdminController.getVehicles);
router.post('/vehicles', AdminController.postCreateVehicle);
router.post('/vehicles/:id/delete', AdminController.postDeleteVehicle);

// Trips Dispatch Management
router.get('/trips', AdminController.getTrips);
router.post('/trips', AdminController.postCreateTrip);
router.post('/trips/:id/status', AdminController.postUpdateTripStatus);
router.post('/trips/:id/delete', AdminController.postDeleteTrip);

// Bookings
router.get('/bookings', AdminController.getBookings);
router.post('/bookings/:id/cancel', AdminController.postCancelBookingAdmin);

// Users Management
router.get('/users', AdminController.getUsers);
router.post('/users/:id/role', AdminController.postUpdateUserRole);

module.exports = router;
