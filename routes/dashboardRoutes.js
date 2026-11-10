const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

router.get('/dashboard', ensureAuthenticated, dashboardController.getDashboard);
router.get('/my-trips', ensureAuthenticated, dashboardController.getMyTrips);

module.exports = router;
