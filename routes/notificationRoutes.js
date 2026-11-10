const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

// Get all notifications for current user
router.get('/notifications', ensureAuthenticated, notificationController.getNotifications);

// Mark a single notification as read (supports fetch JSON & form POST)
router.post('/notifications/:id/read', ensureAuthenticated, notificationController.postMarkRead);

// Mark all notifications as read (supports both /mark-all-read and /read-all)
router.post('/notifications/mark-all-read', ensureAuthenticated, notificationController.postMarkAllRead);
router.post('/notifications/read-all', ensureAuthenticated, notificationController.postMarkAllRead);

module.exports = router;
