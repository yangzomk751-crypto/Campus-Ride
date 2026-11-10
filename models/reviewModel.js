const db = require('../config/database');

const reviewModel = {
  async create({ tripId, reviewerId, driverId, rating, comment }) {
    // Check if passenger had an accepted request on this trip
    const bookingCheck = await db.query(
      `SELECT * FROM ride_requests WHERE trip_id = $1 AND passenger_id = $2 AND request_status = 'Accepted';`,
      [tripId, reviewerId]
    );
    if (bookingCheck.rows.length === 0) {
      throw new Error('Only passengers with confirmed bookings can review a trip.');
    }

    const query = `
      INSERT INTO reviews (trip_id, reviewer_id, driver_id, rating, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const res = await db.query(query, [
      tripId,
      reviewerId,
      driverId,
      parseInt(rating, 10),
      comment ? comment.trim() : null,
    ]);
    return res.rows[0];
  },

  async getByDriver(driverId) {
    const query = `
      SELECT r.*, u.full_name AS reviewer_name, t.starting_location, t.destination, t.travel_date
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.user_id
      JOIN trips t ON r.trip_id = t.trip_id
      WHERE r.driver_id = $1
      ORDER BY r.created_at DESC;
    `;
    const res = await db.query(query, [driverId]);
    return res.rows;
  },

  async hasReviewed(tripId, reviewerId) {
    const res = await db.query(
      `SELECT review_id FROM reviews WHERE trip_id = $1 AND reviewer_id = $2;`,
      [tripId, reviewerId]
    );
    return res.rows.length > 0;
  },
};

module.exports = reviewModel;
