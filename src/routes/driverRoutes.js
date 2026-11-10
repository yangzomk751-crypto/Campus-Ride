const express = require('express');
const router = express.Router();
const DriverController = require('../controllers/driverController');
const { ensureAuthenticated, authorizeRoles } = require('../middleware/auth');

// Protect all driver routes
router.use(ensureAuthenticated);
router.use(authorizeRoles('driver', 'admin'));

router.get('/', DriverController.getDashboard);
router.get('/trips/:id/manifest', DriverController.getTripManifest);
router.post('/trips/:id/status', DriverController.postUpdateTripStatus);

module.exports = router;
