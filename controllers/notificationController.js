const notificationModel = require('../models/notificationModel');

const notificationController = {
  async getNotifications(req, res) {
    const userId = req.session.user.id;
    try {
      const notifications = await notificationModel.getUserNotifications(userId);
      res.render('notifications/index', {
        title: 'Notifications | Sherubtse Campus Ride',
        notifications,
      });
    } catch (err) {
      console.error('Notifications fetch error:', err);
      req.flash('error_msg', 'Failed to load notifications.');
      res.redirect('/dashboard');
    }
  },

  async postMarkRead(req, res) {
    const notificationId = parseInt(req.params.id, 10);
    const userId = req.session.user.id;
    try {
      await notificationModel.markAsRead(notificationId, userId);
      if (req.xhr || req.headers['content-type'] === 'application/json' || req.headers.accept?.includes('application/json')) {
        return res.json({ success: true });
      }
      res.redirect('/notifications');
    } catch (err) {
      console.error('Mark notification read error:', err);
      if (req.xhr || req.headers['content-type'] === 'application/json' || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.redirect('/notifications');
    }
  },

  async postMarkAllRead(req, res) {
    const userId = req.session.user.id;
    try {
      await notificationModel.markAllAsRead(userId);
      req.flash('success_msg', 'All notifications marked as read.');
      if (req.xhr || req.headers['content-type'] === 'application/json' || req.headers.accept?.includes('application/json')) {
        return res.json({ success: true });
      }
      res.redirect('/notifications');
    } catch (err) {
      console.error('Mark all notifications read error:', err);
      req.flash('error_msg', 'Failed to mark all as read.');
      if (req.xhr || req.headers['content-type'] === 'application/json' || req.headers.accept?.includes('application/json')) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.redirect('/notifications');
    }
  },
};

module.exports = notificationController;
