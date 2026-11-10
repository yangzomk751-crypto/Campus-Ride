const db = require('../config/db');

const FeedbackModel = {
  async create({ bookingId, tripId, passengerId, rating, comment = '' }) {
    const res = await db.query(
      `INSERT INTO feedback (booking_id, trip_id, passenger_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [bookingId, tripId, passengerId, parseInt(rating, 10), comment.trim()]
    );
    return res.rows[0];
  },

  async getByBookingId(bookingId) {
    const res = await db.query(`SELECT * FROM feedback WHERE booking_id = $1`, [bookingId]);
    return res.rows[0] || null;
  },

  async getRecent(limit = 10) {
    const res = await db.query(
      `SELECT 
        f.*,
        u.full_name AS passenger_name,
        r.name AS route_name,
        v.plate_number AS vehicle_plate
       FROM feedback f
       JOIN users u ON f.passenger_id = u.id
       JOIN trips t ON f.trip_id = t.id
       JOIN routes r ON t.route_id = r.id
       JOIN vehicles v ON t.vehicle_id = v.id
       ORDER BY f.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return res.rows;
  },

  async getAverageRating() {
    const res = await db.query(`SELECT ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS total_reviews FROM feedback`);
    return res.rows[0];
  }
};

module.exports = FeedbackModel;
