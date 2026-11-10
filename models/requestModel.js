const db = require('../config/database');

const requestModel = {
  async createRequest({ tripId, passengerId, seatsRequested, pickupNote }) {
    const seats = parseInt(seatsRequested, 10);
    if (!seats || seats <= 0) {
      throw new Error('Please specify a valid number of seats.');
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Check trip exists and lock for read
      const tripRes = await client.query(
        `SELECT * FROM trips WHERE trip_id = $1 FOR UPDATE;`,
        [tripId]
      );
      if (tripRes.rows.length === 0) {
        throw new Error('Selected trip not found.');
      }

      const trip = tripRes.rows[0];

      // 1. Rule: Prevent drivers from requesting seats on their own trips
      if (trip.driver_id === passengerId) {
        throw new Error('Drivers cannot request seats on their own trips.');
      }

      // 2. Rule: Do not allow requests for past trips
      const today = new Date().toISOString().split('T')[0];
      const tripDate = trip.travel_date.toISOString().split('T')[0];
      if (tripDate < today || trip.trip_status !== 'Scheduled') {
        throw new Error('Cannot request seats on a past or inactive trip.');
      }

      // 3. Rule: Cannot request more seats than available
      if (seats > trip.available_seats) {
        throw new Error(`Only ${trip.available_seats} seat(s) currently available.`);
      }

      // 4. Rule: Prevent duplicate requests from the same passenger
      const existingRes = await client.query(
        `SELECT * FROM ride_requests WHERE trip_id = $1 AND passenger_id = $2;`,
        [tripId, passengerId]
      );
      if (existingRes.rows.length > 0) {
        const existing = existingRes.rows[0];
        if (existing.request_status === 'Pending' || existing.request_status === 'Accepted') {
          throw new Error('You already have an active request for this trip.');
        } else {
          // If previously cancelled or rejected, allow re-requesting by updating the row
          const updateRes = await client.query(
            `UPDATE ride_requests
             SET seats_requested = $1,
                 pickup_note = $2,
                 request_status = 'Pending',
                 cancellation_reason = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE request_id = $3
             RETURNING *;`,
            [seats, pickupNote ? pickupNote.trim() : null, existing.request_id]
          );

          // Notify driver
          const passenger = await client.query(`SELECT full_name FROM users WHERE user_id = $1;`, [passengerId]);
          await client.query(
            `INSERT INTO notifications (user_id, title, message, link)
             VALUES ($1, 'New Ride Request', $2, '/my-trips');`,
            [
              trip.driver_id,
              `${passenger.rows[0].full_name} submitted a request for ${seats} seat(s) on your trip from ${trip.starting_location} to ${trip.destination}.`,
            ]
          );

          await client.query('COMMIT');
          return updateRes.rows[0];
        }
      }

      // Insert new request
      const insertRes = await client.query(
        `INSERT INTO ride_requests (trip_id, passenger_id, seats_requested, pickup_note, request_status)
         VALUES ($1, $2, $3, $4, 'Pending')
         RETURNING *;`,
        [tripId, passengerId, seats, pickupNote ? pickupNote.trim() : null]
      );

      // Notify driver
      const passenger = await client.query(`SELECT full_name FROM users WHERE user_id = $1;`, [passengerId]);
      await client.query(
        `INSERT INTO notifications (user_id, title, message, link)
         VALUES ($1, 'New Ride Request', $2, '/my-trips');`,
        [
          trip.driver_id,
          `${passenger.rows[0].full_name} submitted a request for ${seats} seat(s) on your trip from ${trip.starting_location} to ${trip.destination}.`,
        ]
      );

      await client.query('COMMIT');
      return insertRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getByPassenger(passengerId) {
    const query = `
      SELECT rr.*,
             t.starting_location, t.destination, t.pickup_location, t.travel_date, t.departure_time,
             t.available_seats, t.total_seats, t.fare_or_contribution, t.trip_status,
             u.full_name AS driver_name, u.phone AS driver_phone, u.email AS driver_email,
             v.vehicle_model, v.registration_number, v.vehicle_type
      FROM ride_requests rr
      JOIN trips t ON rr.trip_id = t.trip_id
      JOIN users u ON t.driver_id = u.user_id
      LEFT JOIN vehicles v ON t.vehicle_id = v.vehicle_id
      WHERE rr.passenger_id = $1
      ORDER BY t.travel_date DESC, t.departure_time DESC;
    `;
    const res = await db.query(query, [passengerId]);
    return res.rows;
  },

  async getByTrip(tripId) {
    const query = `
      SELECT rr.*,
             u.full_name AS passenger_name, u.email AS passenger_email, u.phone AS passenger_phone,
             sp.student_id AS passenger_student_id, sp.department AS passenger_department,
             sp.emergency_contact AS passenger_emergency
      FROM ride_requests rr
      JOIN users u ON rr.passenger_id = u.user_id
      LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
      WHERE rr.trip_id = $1
      ORDER BY rr.created_at ASC;
    `;
    const res = await db.query(query, [tripId]);
    return res.rows;
  },

  async getAcceptedPassengers(tripId) {
    const query = `
      SELECT rr.request_id, rr.seats_requested, rr.pickup_note, rr.updated_at,
             u.user_id, u.full_name, u.phone, u.email,
             sp.student_id, sp.department, sp.emergency_contact
      FROM ride_requests rr
      JOIN users u ON rr.passenger_id = u.user_id
      LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
      WHERE rr.trip_id = $1 AND rr.request_status = 'Accepted'
      ORDER BY rr.updated_at ASC;
    `;
    const res = await db.query(query, [tripId]);
    return res.rows;
  },

  async acceptRequest(requestId, driverId) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // 1. Fetch request with row lock
      const reqRes = await client.query(
        `SELECT * FROM ride_requests WHERE request_id = $1 FOR UPDATE;`,
        [requestId]
      );
      if (reqRes.rows.length === 0) {
        throw new Error('Request not found.');
      }
      const request = reqRes.rows[0];

      if (request.request_status === 'Accepted') {
        throw new Error('Request has already been accepted.');
      }
      if (request.request_status !== 'Pending') {
        throw new Error(`Cannot accept request with status ${request.request_status}.`);
      }

      // 2. Fetch and lock trip row to guarantee concurrency safety & prevent overbooking
      const tripRes = await client.query(
        `SELECT * FROM trips WHERE trip_id = $1 AND driver_id = $2 FOR UPDATE;`,
        [request.trip_id, driverId]
      );
      if (tripRes.rows.length === 0) {
        throw new Error('Trip not found or unauthorized driver.');
      }
      const trip = tripRes.rows[0];

      if (trip.trip_status !== 'Scheduled') {
        throw new Error('Trip is not in Scheduled status.');
      }

      // 3. Rule: Check capacity / available seats
      if (trip.available_seats < request.seats_requested) {
        throw new Error(
          `Cannot accept: Trip only has ${trip.available_seats} seat(s) left, but ${request.seats_requested} were requested.`
        );
      }

      // 4. Update available seats
      const newAvailable = trip.available_seats - request.seats_requested;
      await client.query(
        `UPDATE trips SET available_seats = $1 WHERE trip_id = $2;`,
        [newAvailable, trip.trip_id]
      );

      // 5. Update request status
      const updatedReqRes = await client.query(
        `UPDATE ride_requests 
         SET request_status = 'Accepted', updated_at = CURRENT_TIMESTAMP
         WHERE request_id = $1
         RETURNING *;`,
        [requestId]
      );

      // 6. Notify passenger
      const driver = await client.query(`SELECT full_name FROM users WHERE user_id = $1;`, [driverId]);
      await client.query(
        `INSERT INTO notifications (user_id, title, message, link)
         VALUES ($1, 'Seat Request Accepted! 🎉', $2, '/my-requests');`,
        [
          request.passenger_id,
          `${driver.rows[0].full_name} accepted your request for ${request.seats_requested} seat(s) from ${trip.starting_location} to ${trip.destination}.`,
        ]
      );

      await client.query('COMMIT');
      return { request: updatedReqRes.rows[0], newAvailableSeats: newAvailable };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async rejectRequest(requestId, driverId, reason) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const reqRes = await client.query(
        `SELECT rr.*, t.driver_id, t.starting_location, t.destination 
         FROM ride_requests rr
         JOIN trips t ON rr.trip_id = t.trip_id
         WHERE rr.request_id = $1 FOR UPDATE;`,
        [requestId]
      );
      if (reqRes.rows.length === 0) {
        throw new Error('Request not found.');
      }

      const req = reqRes.rows[0];
      if (req.driver_id !== driverId) {
        throw new Error('Unauthorized.');
      }

      if (req.request_status !== 'Pending') {
        throw new Error(`Cannot reject request with status ${req.request_status}.`);
      }

      // Rejecting pending request does NOT affect seat availability
      const updatedReq = await client.query(
        `UPDATE ride_requests 
         SET request_status = 'Rejected', cancellation_reason = $1, updated_at = CURRENT_TIMESTAMP
         WHERE request_id = $2
         RETURNING *;`,
        [reason || 'Driver was unable to accommodate request', requestId]
      );

      // Notify passenger
      await client.query(
        `INSERT INTO notifications (user_id, title, message, link)
         VALUES ($1, 'Seat Request Update', $2, '/my-requests');`,
        [
          req.passenger_id,
          `Your request for the trip from ${req.starting_location} to ${req.destination} was not accepted by the driver.`,
        ]
      );

      await client.query('COMMIT');
      return updatedReq.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async cancelRequest(requestId, passengerId, reason) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const reqRes = await client.query(
        `SELECT rr.*, t.trip_id, t.driver_id, t.starting_location, t.destination, t.available_seats, t.total_seats, t.travel_date
         FROM ride_requests rr
         JOIN trips t ON rr.trip_id = t.trip_id
         WHERE rr.request_id = $1 AND rr.passenger_id = $2 FOR UPDATE;`,
        [requestId, passengerId]
      );
      if (reqRes.rows.length === 0) {
        throw new Error('Request not found or unauthorized.');
      }

      const req = reqRes.rows[0];
      if (req.request_status === 'Cancelled') {
        throw new Error('Request is already cancelled.');
      }

      // If it was accepted, restore seats in transaction!
      if (req.request_status === 'Accepted') {
        // Lock trip row
        const tripLock = await client.query(
          `SELECT available_seats, total_seats FROM trips WHERE trip_id = $1 FOR UPDATE;`,
          [req.trip_id]
        );
        const curSeats = tripLock.rows[0];
        const restoredSeats = Math.min(curSeats.total_seats, curSeats.available_seats + req.seats_requested);

        await client.query(
          `UPDATE trips SET available_seats = $1 WHERE trip_id = $2;`,
          [restoredSeats, req.trip_id]
        );

        // Notify driver
        const passenger = await client.query(`SELECT full_name FROM users WHERE user_id = $1;`, [passengerId]);
        await client.query(
          `INSERT INTO notifications (user_id, title, message, link)
           VALUES ($1, 'Passenger Cancelled Booking', $2, '/my-trips');`,
          [
            req.driver_id,
            `${passenger.rows[0].full_name} cancelled their accepted booking (${req.seats_requested} seat(s)) for trip ${req.starting_location} ➔ ${req.destination}. Seats have been restored.`,
          ]
        );
      }

      const updatedReq = await client.query(
        `UPDATE ride_requests 
         SET request_status = 'Cancelled', cancellation_reason = $1, updated_at = CURRENT_TIMESTAMP
         WHERE request_id = $2
         RETURNING *;`,
        [reason || 'Cancelled by passenger', requestId]
      );

      await client.query('COMMIT');
      return updatedReq.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getPlatformRequestStats() {
    const res = await db.query(`
      SELECT 
        COUNT(*)::int AS total_requests,
        COUNT(CASE WHEN request_status = 'Pending' THEN 1 END)::int AS pending_requests,
        COUNT(CASE WHEN request_status = 'Accepted' THEN 1 END)::int AS accepted_requests,
        COUNT(CASE WHEN request_status = 'Rejected' THEN 1 END)::int AS rejected_requests,
        COUNT(CASE WHEN request_status = 'Cancelled' THEN 1 END)::int AS cancelled_requests
      FROM ride_requests;
    `);
    return res.rows[0];
  },
};

module.exports = requestModel;
