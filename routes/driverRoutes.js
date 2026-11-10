const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { ensureDriver } = require('../middleware/authMiddleware');

router.use(ensureDriver);

router.get('/', driverController.getDashboard);
router.post('/availability', driverController.postToggleAvailability);
router.post('/weekday-availability', driverController.postToggleWeekdayAvailability);

router.get('/requests', driverController.getIncomingRequests);
router.post('/requests/:id/accept', driverController.postAcceptRequest);
router.post('/requests/:id/reject', driverController.postRejectRequest);

router.get('/trips', driverController.getDriverTrips);
router.post('/trips/:id/status', driverController.postUpdateTripStatus);
router.post('/trips/:id/payment', driverController.postRecordPayment);

router.get('/bus-trips', driverController.getAssignedBusTrips);
router.get('/payments', driverController.getPaymentRecords);
router.get('/vehicle', driverController.getVehicleInfo);

module.exports = router;
