const db = require('../config/database');

const tripModel = {
  async createTrip({
    driverId,
    vehicleId,
    startingLocation,
    destination,
    pickupLocation,
    travelDate,
    departureTime,
    availableSeats,
    fareOrContribution,
    tripDescription,
  }) {
    const seats = parseInt(availableSeats, 10);
    if (!seats || seats <= 0) {
      throw new Error('Available seats must be greater than zero.');
    }

    const query = `
      INSERT INTO trips (
        driver_id, vehicle_id, starting_location, destination, pickup_location,
        travel_date, departure_time, total_seats, available_seats,
        fare_or_contribution, trip_description, trip_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $10, 'Scheduled')
      RETURNING *;
    `;
    const res = await db.query(query, [
      driverId,
      vehicleId || null,
      startingLocation.trim(),
      destination.trim(),
      pickupLocation.trim(),
      travelDate,
      departureTime,
      seats,
      fareOrContribution ? parseFloat(fareOrContribution) : 0.00,
      tripDescription ? tripDescription.trim() : null,
    ]);
    return res.rows[0];
  },

  async findAvailableTrips({ startLocation, destination, travelDate, vehicleType, sort } = {}) {
    let query = `
      SELECT t.*, 
             u.full_name AS driver_name, u.phone AS driver_phone, u.email AS driver_email,
             sp.student_id AS driver_student_id, sp.department AS driver_department,
             dv.verification_status,
             v.vehicle_model, v.registration_number, v.vehicle_type, v.color AS vehicle_color,
             (SELECT COUNT(*) FROM ride_requests rr WHERE rr.trip_id = t.trip_id AND rr.request_status = 'Accepted')::int AS accepted_passengers_count
      FROM trips t
      JOIN users u ON t.driver_id = u.user_id
      LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
      LEFT JOIN driver_verifications dv ON u.user_id = dv.user_id
      LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
      WHERE t.trip_status = 'Scheduled'
        AND t.available_seats > 0
        AND (t.travel_date > CURRENT_DATE OR (t.travel_date = CURRENT_DATE AND t.departure_time >= CURRENT_TIME))
    `;
    const params = [];

    if (startLocation && startLocation.trim()) {
      params.push(`%${startLocation.trim().toLowerCase()}%`);
      query += ` AND LOWER(t.starting_location) LIKE $${params.length}`;
    }

    if (destination && destination.trim()) {
      params.push(`%${destination.trim().toLowerCase()}%`);
      query += ` AND LOWER(t.destination) LIKE $${params.length}`;
    }

    if (travelDate && travelDate.trim()) {
      params.push(travelDate.trim());
      query += ` AND t.travel_date = $${params.length}`;
    }

    if (vehicleType && vehicleType !== 'all') {
      params.push(vehicleType);
      query += ` AND v.vehicle_type = $${params.length}`;
    }

    // Sorting
    if (sort === 'fare_asc') {
      query += ` ORDER BY t.fare_or_contribution ASC, t.travel_date ASC`;
    } else if (sort === 'fare_desc') {
      query += ` ORDER BY t.fare_or_contribution DESC, t.travel_date ASC`;
    } else if (sort === 'seats_desc') {
      query += ` ORDER BY t.available_seats DESC, t.travel_date ASC`;
    } else {
      // Default: soonest departure first
      query += ` ORDER BY t.travel_date ASC, t.departure_time ASC`;
    }

    const res = await db.query(query, params);
    return res.rows;
  },

  async getById(tripId) {
    const query = `
      SELECT t.*, 
             u.user_id AS driver_user_id, u.full_name AS driver_name, u.phone AS driver_phone, u.email AS driver_email,
             sp.student_id AS driver_student_id, sp.college_name, sp.department AS driver_department, 
             sp.emergency_contact AS driver_emergency, sp.bio AS driver_bio,
             dv.verification_status, dv.license_number,
             v.vehicle_id, v.vehicle_model, v.registration_number, v.vehicle_type, v.capacity AS vehicle_capacity, v.color AS vehicle_color,
             COALESCE((SELECT AVG(rating)::numeric(2,1) FROM reviews r WHERE r.driver_id = t.driver_id), 5.0) AS driver_rating,
             (SELECT COUNT(*) FROM reviews r WHERE r.driver_id = t.driver_id)::int AS driver_review_count
      FROM trips t
      JOIN users u ON t.driver_id = u.user_id
      LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
      LEFT JOIN driver_verifications dv ON u.user_id = dv.user_id
      LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
      WHERE t.trip_id = $1;
    `;
    const res = await db.query(query, [tripId]);
    return res.rows[0] || null;
  },

  async getByDriver(driverId) {
    const query = `
      SELECT t.*,
             v.vehicle_model, v.registration_number, v.vehicle_type,
             (SELECT COUNT(*) FROM ride_requests rr WHERE rr.trip_id = t.trip_id AND rr.request_status = 'Pending')::int AS pending_requests_count,
             (SELECT COUNT(*) FROM ride_requests rr WHERE rr.trip_id = t.trip_id AND rr.request_status = 'Accepted')::int AS accepted_passengers_count
      FROM trips t
      LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
      WHERE t.driver_id = $1
      ORDER BY t.travel_date DESC, t.departure_time DESC;
    `;
    const res = await db.query(query, [driverId]);
    return res.rows;
  },

  async cancelTrip(tripId, driverId) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const tripCheck = await client.query(
        `SELECT * FROM trips WHERE trip_id = $1 AND driver_id = $2 FOR UPDATE;`,
        [tripId, driverId]
      );
      if (tripCheck.rows.length === 0) {
        throw new Error('Trip not found or unauthorized.');
      }

      const trip = tripCheck.rows[0];
      if (trip.trip_status === 'Cancelled') {
        throw new Error('Trip is already cancelled.');
      }

      await client.query(
        `UPDATE trips SET trip_status = 'Cancelled' WHERE trip_id = $1;`,
        [tripId]
      );

      // Cancel all pending/accepted requests and notify passengers
      const reqs = await client.query(
        `UPDATE ride_requests 
         SET request_status = 'Cancelled', cancellation_reason = 'Trip was cancelled by the driver.'
         WHERE trip_id = $1 AND request_status IN ('Pending', 'Accepted')
         RETURNING passenger_id;`,
        [tripId]
      );

      for (const row of reqs.rows) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, link)
           VALUES ($1, 'Trip Cancelled', $2, '/my-requests');`,
          [
            row.passenger_id,
            `The trip from ${trip.starting_location} to ${trip.destination} on ${trip.travel_date.toISOString().split('T')[0]} has been cancelled by the driver.`,
          ]
        );
      }

      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async adminCancelTrip(tripId, reason) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const tripCheck = await client.query(
        `SELECT * FROM trips WHERE trip_id = $1 FOR UPDATE;`,
        [tripId]
      );
      if (tripCheck.rows.length === 0) {
        throw new Error('Trip not found.');
      }

      const trip = tripCheck.rows[0];

      await client.query(
        `UPDATE trips SET trip_status = 'Cancelled', trip_description = COALESCE(trip_description, '') || ' [Removed by Admin: ' || $2 || ']'
         WHERE trip_id = $1;`,
        [tripId, reason || 'Inappropriate or reported content']
      );

      // Notify driver
      await client.query(
        `INSERT INTO notifications (user_id, title, message, link)
         VALUES ($1, 'Trip Removed by Admin', $2, '/my-trips');`,
        [
          trip.driver_id,
          `Your trip from ${trip.starting_location} to ${trip.destination} has been removed by system administration. Reason: ${reason || 'Policy violation'}.`,
        ]
      );

      // Notify any accepted passengers
      const passengers = await client.query(
        `UPDATE ride_requests 
         SET request_status = 'Cancelled', cancellation_reason = 'Trip removed by system administration.'
         WHERE trip_id = $1 AND request_status IN ('Pending', 'Accepted')
         RETURNING passenger_id;`,
        [tripId]
      );

      for (const p of passengers.rows) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, link)
           VALUES ($1, 'Trip Cancelled by Admin', $2, '/my-requests');`,
          [
            p.passenger_id,
            `The trip from ${trip.starting_location} to ${trip.destination} was removed by administration. Any reserved seats have been cancelled.`,
          ]
        );
      }

      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getAllTrips({ status, search } = {}) {
    let query = `
      SELECT t.*, u.full_name AS driver_name, u.email AS driver_email, u.phone AS driver_phone,
             v.vehicle_model, v.registration_number, v.vehicle_type,
             (SELECT COUNT(*) FROM ride_requests rr WHERE rr.trip_id = t.trip_id AND rr.request_status = 'Accepted')::int AS accepted_passengers_count
      FROM trips t
      JOIN users u ON t.driver_id = u.user_id
      LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND t.trip_status = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(t.starting_location) LIKE $${params.length} OR LOWER(t.destination) LIKE $${params.length} OR LOWER(u.full_name) LIKE $${params.length})`;
    }

    query += ` ORDER BY t.travel_date DESC, t.departure_time DESC;`;
    const res = await db.query(query, params);
    return res.rows;
  },

  async getPopularRoutes() {
    const query = `
      SELECT starting_location || ' ➔ ' || destination AS route_name,
             COUNT(*)::int AS total_trips
      FROM trips
      GROUP BY starting_location, destination
      ORDER BY total_trips DESC
      LIMIT 6;
    `;
    const res = await db.query(query);
    return res.rows;
  },

  async getTripStats() {
    const res = await db.query(`
      SELECT 
        COUNT(*)::int AS total_trips,
        COUNT(CASE WHEN trip_status = 'Scheduled' THEN 1 END)::int AS scheduled_trips,
        COUNT(CASE WHEN trip_status = 'Completed' THEN 1 END)::int AS completed_trips,
        COUNT(CASE WHEN trip_status = 'Cancelled' THEN 1 END)::int AS cancelled_trips
      FROM trips;
    `);
    return res.rows[0];
  },
};

module.exports = tripModel;
