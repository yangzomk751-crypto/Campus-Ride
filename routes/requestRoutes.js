const express = require('express');
const router = express.Router();
const requestController = require('../controllers/requestController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

// Passenger requests
router.post('/requests/create', ensureAuthenticated, requestController.postRequestSeat);
router.get('/my-requests', ensureAuthenticated, requestController.getMyRequests);
router.post('/requests/:id/cancel', ensureAuthenticated, requestController.postCancelRequest);

// Driver requests management
router.post('/requests/:id/accept', ensureAuthenticated, requestController.postAcceptRequest);
router.post('/requests/:id/reject', ensureAuthenticated, requestController.postRejectRequest);

module.exports = router;
