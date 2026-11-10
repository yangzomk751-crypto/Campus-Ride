const db = require('../config/database');

const notificationModel = {
  async create({ userId, bookingId = null, title, message, link = '' }) {
    const res = await db.query(
      `INSERT INTO notifications (user_id, booking_id, title, message, link)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, bookingId, title.trim(), message.trim(), link.trim()]
    );
    return res.rows[0];
  },

  async getUserNotifications(userId) {
    const res = await db.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [userId]
    );
    return res.rows;
  },

  async markAsRead(notificationId, userId) {
    const res = await db.query(
      `UPDATE notifications SET is_read = TRUE WHERE notification_id = $1 AND user_id = $2 RETURNING *`,
      [notificationId, userId]
    );
    return res.rows[0];
  },

  async markAllAsRead(userId) {
    await db.query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1`, [userId]);
  },

  async getUnreadCount(userId) {
    const res = await db.query(
      `SELECT COUNT(*)::int as count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return res.rows[0] ? res.rows[0].count : 0;
  },
};

module.exports = notificationModel;
