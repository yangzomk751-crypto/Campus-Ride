const db = require('../config/database');
const BookingModel = require('./bookingModel');

const AssignmentModel = {
  /**
   * Conflict Detection (Assignment Requirement FR14 & Chapter 7.5)
   * Prevents assigning a vehicle or driver with overlapping trips on the same date/time
   */
  async checkOverlap({ vehicleId, driverId, travelDate, departureTime, excludeBookingId = null }) {
    // 1. Check Vehicle Conflict
    let vehicleSql = `
      SELECT ta.*, b.departure_time, b.pickup_location, b.destination, b.booking_type, v.registration_number
      FROM trip_assignments ta
      JOIN bookings b ON ta.booking_id = b.booking_id
      JOIN vehicles v ON ta.vehicle_id = v.vehicle_id
      WHERE ta.vehicle_id = $1 
        AND b.travel_date = $2
        AND ta.trip_status IN ('Assigned', 'Ongoing')
    `;
    const vParams = [vehicleId, travelDate];
    if (excludeBookingId) {
      vParams.push(excludeBookingId);
      vehicleSql += ` AND ta.booking_id <> $3`;
    }

    const vehicleRes = await db.query(vehicleSql, vParams);
    if (vehicleRes.rows.length > 0) {
      const conflict = vehicleRes.rows[0];
      return {
        hasConflict: true,
        type: 'vehicle',
        message: `Vehicle ${conflict.registration_number} is already assigned on ${travelDate} at ${conflict.departure_time} (${conflict.pickup_location} ➔ ${conflict.destination}).`,
      };
    }

    // 2. Check Driver Conflict
    let driverSql = `
      SELECT ta.*, b.departure_time, b.pickup_location, b.destination, b.booking_type, d.full_name AS driver_name
      FROM trip_assignments ta
      JOIN bookings b ON ta.booking_id = b.booking_id
      JOIN drivers d ON ta.driver_id = d.driver_id
      WHERE ta.driver_id = $1 
        AND b.travel_date = $2
        AND ta.trip_status IN ('Assigned', 'Ongoing')
    `;
    const dParams = [driverId, travelDate];
    if (excludeBookingId) {
      dParams.push(excludeBookingId);
      driverSql += ` AND ta.booking_id <> $3`;
    }

    const driverRes = await db.query(driverSql, dParams);
    if (driverRes.rows.length > 0) {
      const conflict = driverRes.rows[0];
      return {
        hasConflict: true,
        type: 'driver',
        message: `Driver ${conflict.driver_name} is already assigned on ${travelDate} at ${conflict.departure_time} (${conflict.pickup_location} ➔ ${conflict.destination}).`,
      };
    }

    return { hasConflict: false };
  },

  async assign({ bookingId, vehicleId, driverId }) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Fetch booking details
      const bRes = await client.query(`SELECT * FROM bookings WHERE booking_id = $1 FOR UPDATE`, [bookingId]);
      if (bRes.rows.length === 0) {
        throw new Error('Booking not found.');
      }
      const booking = bRes.rows[0];

      // Check conflict
      const conflict = await this.checkOverlap({
        vehicleId,
        driverId,
        travelDate: booking.travel_date,
        departureTime: booking.departure_time,
        excludeBookingId: bookingId,
      });

      if (conflict.hasConflict) {
        throw new Error(`Scheduling Conflict: ${conflict.message}`);
      }

      // Upsert trip_assignments
      const assignRes = await client.query(
        `INSERT INTO trip_assignments (booking_id, vehicle_id, driver_id, trip_status)
         VALUES ($1, $2, $3, 'Assigned')
         ON CONFLICT (booking_id) 
         DO UPDATE SET vehicle_id = $2, driver_id = $3, trip_status = 'Assigned', assigned_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [bookingId, vehicleId, driverId]
      );

      // Update booking status to Assigned
      await client.query(
        `UPDATE bookings SET booking_status = 'Assigned' WHERE booking_id = $1`,
        [bookingId]
      );

      // Fetch vehicle & driver details for notification
      const vInfo = await client.query(`SELECT registration_number, vehicle_type FROM vehicles WHERE vehicle_id = $1`, [vehicleId]);
      const dInfo = await client.query(`SELECT full_name, phone FROM drivers WHERE driver_id = $1`, [driverId]);

      const vPlate = vInfo.rows[0] ? vInfo.rows[0].registration_number : 'Vehicle';
      const dName = dInfo.rows[0] ? dInfo.rows[0].full_name : 'Driver';
      const dPhone = dInfo.rows[0] ? dInfo.rows[0].phone : '';

      // Create notification for student
      await client.query(
        `INSERT INTO notifications (user_id, booking_id, message)
         VALUES ($1, $2, $3)`,
        [
          booking.user_id,
          bookingId,
          `Your ${booking.booking_type} booking (#${bookingId}) has been assigned to ${vPlate} with Driver ${dName} (${dPhone}).`,
        ]
      );

      await client.query('COMMIT');
      return assignRes.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getDriverTrips(driverId) {
    const res = await db.query(
      `SELECT 
        ta.*,
        b.user_id,
        b.booking_type,
        b.pickup_location,
        b.destination,
        b.travel_date,
        b.departure_time,
        b.passenger_count,
        b.trip_purpose,
        b.booking_status,
        u.full_name AS passenger_name,
        u.phone AS passenger_phone,
        u.email AS passenger_email,
        u.role AS passenger_role,
        v.registration_number AS vehicle_plate,
        v.vehicle_type,
        v.capacity AS vehicle_capacity
       FROM trip_assignments ta
       JOIN bookings b ON ta.booking_id = b.booking_id
       JOIN users u ON b.user_id = u.user_id
       JOIN vehicles v ON ta.vehicle_id = v.vehicle_id
       WHERE ta.driver_id = $1
       ORDER BY b.travel_date ASC, b.departure_time ASC`,
      [driverId]
    );
    return res.rows;
  },

  async updateTripStatus(assignmentId, tripStatus) {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const aRes = await client.query(
        `UPDATE trip_assignments 
         SET trip_status = $1 
         WHERE assignment_id = $2 
         RETURNING *`,
        [tripStatus, assignmentId]
      );

      if (aRes.rows.length === 0) {
        throw new Error('Trip assignment not found.');
      }
      const assignment = aRes.rows[0];

      // Sync booking status with trip status
      const bRes = await client.query(
        `UPDATE bookings 
         SET booking_status = $1 
         WHERE booking_id = $2 
         RETURNING *`,
        [tripStatus, assignment.booking_id]
      );

      const booking = bRes.rows[0];

      // Notify passenger
      if (booking) {
        await client.query(
          `INSERT INTO notifications (user_id, booking_id, message)
           VALUES ($1, $2, $3)`,
          [
            booking.user_id,
            booking.booking_id,
            `Trip update: Your ${booking.booking_type} ride (#${booking.booking_id}) is now "${tripStatus}".`,
          ]
        );
      }

      await client.query('COMMIT');
      return assignment;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};

module.exports = AssignmentModel;
