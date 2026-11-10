const crypto = require('crypto');
const db = require('../config/db');

const BookingModel = {
  /**
   * Helper to generate human-readable unique booking codes (e.g. CR-2026-X89B)
   */
  generateBookingCode() {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `CR-${new Date().getFullYear()}-${randomHex}`;
  },

  /**
   * ATOMIC BOOKING TRANSACTION
   * Uses PostgreSQL row-level lock (FOR UPDATE) to prevent seat overbooking race conditions
   */
  async createWithTransaction({ tripId, passengerId, seatsBooked = 1 }) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // 1. Lock the trip row for update to guarantee concurrency safety
      const tripRes = await client.query(
        `SELECT id, available_seats, fare_amount, status, departure_time 
         FROM trips 
         WHERE id = $1 
         FOR UPDATE`,
        [tripId]
      );

      if (tripRes.rows.length === 0) {
        throw new Error('Selected trip does not exist.');
      }

      const trip = tripRes.rows[0];

      if (trip.status !== 'SCHEDULED' && trip.status !== 'BOARDING') {
        throw new Error(`This trip cannot be booked because it is ${trip.status.toLowerCase()}.`);
      }

      if (new Date(trip.departure_time) <= new Date()) {
        throw new Error('This trip has already departed.');
      }

      if (trip.available_seats < seatsBooked) {
        throw new Error(`Only ${trip.available_seats} seat(s) available on this shuttle.`);
      }

      // Check if user already has an active booking for this trip
      const existingRes = await client.query(
        `SELECT id FROM bookings WHERE trip_id = $1 AND passenger_id = $2 AND status = 'CONFIRMED'`,
        [tripId, passengerId]
      );
      if (existingRes.rows.length > 0) {
        throw new Error('You already have an active booking for this trip.');
      }

      // 2. Decrement available seats
      await client.query(
        `UPDATE trips SET available_seats = available_seats - $1 WHERE id = $2`,
        [seatsBooked, tripId]
      );

      // 3. Insert booking record
      const bookingCode = this.generateBookingCode();
      const totalFare = parseFloat(trip.fare_amount || 0) * seatsBooked;

      const bookingRes = await client.query(
        `INSERT INTO bookings (booking_code, trip_id, passenger_id, seats_booked, total_fare, status)
         VALUES ($1, $2, $3, $4, $5, 'CONFIRMED')
         RETURNING *`,
        [bookingCode, tripId, passengerId, seatsBooked, totalFare]
      );

      await client.query('COMMIT');
      return bookingRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  /**
   * ATOMIC CANCELLATION TRANSACTION
   * Cancels booking and restores available seats to the trip
   */
  async cancelWithTransaction(bookingId, userId = null, isAdmin = false, cancellationReason = 'Cancelled by passenger') {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Lock booking row
      const bookingRes = await client.query(
        `SELECT b.*, t.departure_time, t.status AS trip_status
         FROM bookings b
         JOIN trips t ON b.trip_id = t.id
         WHERE b.id = $1
         FOR UPDATE`,
        [bookingId]
      );

      if (bookingRes.rows.length === 0) {
        throw new Error('Booking not found.');
      }

      const booking = bookingRes.rows[0];

      // Authorization check
      if (!isAdmin && booking.passenger_id !== userId) {
        throw new Error('Unauthorized to cancel this booking.');
      }

      if (booking.status !== 'CONFIRMED') {
        throw new Error(`Cannot cancel booking with status: ${booking.status}`);
      }

      // Restore seats to the trip
      await client.query(
        `UPDATE trips SET available_seats = available_seats + $1 WHERE id = $2`,
        [booking.seats_booked, booking.trip_id]
      );

      // Update booking status
      const updatedBooking = await client.query(
        `UPDATE bookings 
         SET status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP, cancellation_reason = $1
         WHERE id = $2
         RETURNING *`,
        [cancellationReason, bookingId]
      );

      await client.query('COMMIT');
      return updatedBooking.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getById(id) {
    const res = await db.query(
      `SELECT 
        b.*,
        t.departure_time,
        t.arrival_time,
        t.status AS trip_status,
        t.fare_amount,
        r.name AS route_name,
        r.distance_km,
        s_orig.name AS origin_stop_name,
        s_orig.code AS origin_stop_code,
        s_dest.name AS destination_stop_name,
        s_dest.code AS destination_stop_code,
        v.plate_number AS vehicle_plate,
        v.model_name AS vehicle_model,
        v.vehicle_type,
        u_p.full_name AS passenger_name,
        u_p.email AS passenger_email,
        u_p.student_staff_id,
        u_d.full_name AS driver_name,
        u_d.phone AS driver_phone,
        f.rating AS review_rating,
        f.comment AS review_comment
      FROM bookings b
      JOIN trips t ON b.trip_id = t.id
      JOIN routes r ON t.route_id = r.id
      JOIN stops s_orig ON r.origin_stop_id = s_orig.id
      JOIN stops s_dest ON r.destination_stop_id = s_dest.id
      JOIN vehicles v ON t.vehicle_id = v.id
      JOIN users u_p ON b.passenger_id = u_p.id
      LEFT JOIN users u_d ON t.driver_id = u_d.id
      LEFT JOIN feedback f ON f.booking_id = b.id
      WHERE b.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  },

  async getByCode(code) {
    const res = await db.query(
      `SELECT 
        b.*,
        t.departure_time,
        t.arrival_time,
        t.status AS trip_status,
        r.name AS route_name,
        s_orig.name AS origin_stop_name,
        s_dest.name AS destination_stop_name,
        v.plate_number AS vehicle_plate,
        v.model_name AS vehicle_model,
        u_p.full_name AS passenger_name,
        u_p.student_staff_id
      FROM bookings b
      JOIN trips t ON b.trip_id = t.id
      JOIN routes r ON t.route_id = r.id
      JOIN stops s_orig ON r.origin_stop_id = s_orig.id
      JOIN stops s_dest ON r.destination_stop_id = s_dest.id
      JOIN vehicles v ON t.vehicle_id = v.id
      JOIN users u_p ON b.passenger_id = u_p.id
      WHERE b.booking_code = $1`,
      [code.trim().toUpperCase()]
    );
    return res.rows[0] || null;
  },

  async getPassengerBookings(passengerId) {
    const res = await db.query(
      `SELECT 
        b.*,
        t.departure_time,
        t.arrival_time,
        t.status AS trip_status,
        r.name AS route_name,
        s_orig.name AS origin_stop_name,
        s_dest.name AS destination_stop_name,
        v.plate_number AS vehicle_plate,
        v.model_name AS vehicle_model,
        v.vehicle_type,
        u_d.full_name AS driver_name,
        f.id AS feedback_id,
        f.rating AS feedback_rating
      FROM bookings b
      JOIN trips t ON b.trip_id = t.id
      JOIN routes r ON t.route_id = r.id
      JOIN stops s_orig ON r.origin_stop_id = s_orig.id
      JOIN stops s_dest ON r.destination_stop_id = s_dest.id
      JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN users u_d ON t.driver_id = u_d.id
      LEFT JOIN feedback f ON f.booking_id = b.id
      WHERE b.passenger_id = $1
      ORDER BY b.booked_at DESC`,
      [passengerId]
    );
    return res.rows;
  },

  async getTripPassengerManifest(tripId) {
    const res = await db.query(
      `SELECT 
        b.id,
        b.booking_code,
        b.seats_booked,
        b.status,
        b.booked_at,
        u.full_name AS passenger_name,
        u.email AS passenger_email,
        u.phone AS passenger_phone,
        u.student_staff_id
      FROM bookings b
      JOIN users u ON b.passenger_id = u.id
      WHERE b.trip_id = $1
      ORDER BY b.booked_at ASC`,
      [tripId]
    );
    return res.rows;
  },

  async getAll({ status = null, limit = 100 } = {}) {
    let sql = `
      SELECT 
        b.*,
        t.departure_time,
        t.arrival_time,
        r.name AS route_name,
        s_orig.name AS origin_stop_name,
        s_dest.name AS destination_stop_name,
        u_p.full_name AS passenger_name,
        u_p.email AS passenger_email,
        u_p.student_staff_id,
        v.plate_number AS vehicle_plate
      FROM bookings b
      JOIN trips t ON b.trip_id = t.id
      JOIN routes r ON t.route_id = r.id
      JOIN stops s_orig ON r.origin_stop_id = s_orig.id
      JOIN stops s_dest ON r.destination_stop_id = s_dest.id
      JOIN vehicles v ON t.vehicle_id = v.id
      JOIN users u_p ON b.passenger_id = u_p.id
      WHERE 1=1
    `;
    const params = [];
    if (status) {
      params.push(status);
      sql += ` AND b.status = $${params.length}`;
    }
    sql += ` ORDER BY b.booked_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const res = await db.query(sql, params);
    return res.rows;
  },

  async countStats() {
    const res = await db.query(`
      SELECT 
        COUNT(*) AS total_bookings,
        COUNT(*) FILTER (WHERE status = 'CONFIRMED') AS active_bookings,
        COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_bookings,
        COALESCE(SUM(total_fare) FILTER (WHERE status = 'CONFIRMED'), 0) AS total_revenue
      FROM bookings
    `);
    return res.rows[0];
  }
};

module.exports = BookingModel;
