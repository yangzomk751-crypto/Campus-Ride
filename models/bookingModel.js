const db = require('../config/database');

const bookingModel = {
  async create({
    userId,
    serviceType,
    bookingSubtype,
    pickupLocation,
    destination,
    travelDate,
    departureTime,
    passengerCount = 1,
    rideSharingOpted = false,
    farePerPassenger = 0,
    totalFare = 0,
    tripPurpose = '',
    remarks = '',
    bookingStatus = 'Pending',
    quotationStatus = 'None',
    quotedFare = null,
    assignedDriverId = null,
    assignedVehicleId = null,
  }) {
    const res = await db.query(
      `INSERT INTO bookings (
        user_id, service_type, booking_subtype, pickup_location, destination,
        travel_date, departure_time, passenger_count, ride_sharing_opted,
        fare_per_passenger, total_fare, trip_purpose, remarks,
        booking_status, quotation_status, quoted_fare, assigned_driver_id, assigned_vehicle_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        userId,
        serviceType,
        bookingSubtype,
        pickupLocation.trim(),
        destination.trim(),
        travelDate,
        departureTime,
        passengerCount,
        rideSharingOpted,
        farePerPassenger,
        totalFare,
        tripPurpose ? tripPurpose.trim() : null,
        remarks ? remarks.trim() : null,
        bookingStatus,
        quotationStatus,
        quotedFare,
        assignedDriverId,
        assignedVehicleId,
      ]
    );

    const booking = res.rows[0];

    // Automatically create payment entry for cash management
    try {
      await db.query(
        `INSERT INTO payments (booking_id, passenger_id, driver_id, amount, payment_method, payment_status)
         VALUES ($1, $2, $3, $4, 'Cash', 'Pending')
         ON CONFLICT (booking_id) DO NOTHING`,
        [booking.booking_id, userId, assignedDriverId, totalFare]
      );
    } catch (e) {
      console.warn('Could not auto-insert payment:', e.message);
    }

    return booking;
  },

  async getById(bookingId) {
    const res = await db.query(
      `SELECT b.*,
              u.full_name as passenger_name, u.phone as passenger_phone, u.email as passenger_email, u.passenger_type,
              du.full_name as driver_name, du.phone as driver_phone, d.license_number as driver_license,
              v.registration_number, v.vehicle_model, v.vehicle_type, v.capacity as vehicle_capacity,
              p.payment_id, p.payment_status, p.amount as payment_amount, p.paid_at
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       LEFT JOIN drivers d ON b.assigned_driver_id = d.driver_id
       LEFT JOIN users du ON d.user_id = du.user_id
       LEFT JOIN vehicles v ON b.assigned_vehicle_id = v.vehicle_id
       LEFT JOIN payments p ON p.booking_id = b.booking_id
       WHERE b.booking_id = $1 LIMIT 1`,
      [bookingId]
    );
    return res.rows[0] || null;
  },

  async getUserBookings(userId, filterStatus = 'all', serviceType = null) {
    let sql = `
      SELECT b.*,
             du.full_name as driver_name, du.phone as driver_phone,
             v.registration_number, v.vehicle_model,
             p.payment_status
      FROM bookings b
      LEFT JOIN drivers d ON b.assigned_driver_id = d.driver_id
      LEFT JOIN users du ON d.user_id = du.user_id
      LEFT JOIN vehicles v ON b.assigned_vehicle_id = v.vehicle_id
      LEFT JOIN payments p ON p.booking_id = b.booking_id
      WHERE b.user_id = $1
    `;
    const params = [userId];

    if (filterStatus && filterStatus !== 'all') {
      sql += ` AND LOWER(b.booking_status) = LOWER($${params.length + 1})`;
      params.push(filterStatus);
    }

    if (serviceType) {
      sql += ` AND b.service_type = $${params.length + 1}`;
      params.push(serviceType);
    }

    sql += ` ORDER BY b.created_at DESC`;
    const res = await db.query(sql, params);
    return res.rows;
  },

  async getAllBookings({ status, type, date, limit } = {}) {
    let sql = `
      SELECT b.*,
             u.full_name as passenger_name, u.phone as passenger_phone, u.passenger_type,
             du.full_name as driver_name, du.phone as driver_phone,
             v.registration_number, v.vehicle_model,
             p.payment_status
      FROM bookings b
      JOIN users u ON b.user_id = u.user_id
      LEFT JOIN drivers d ON b.assigned_driver_id = d.driver_id
      LEFT JOIN users du ON d.user_id = du.user_id
      LEFT JOIN vehicles v ON b.assigned_vehicle_id = v.vehicle_id
      LEFT JOIN payments p ON p.booking_id = b.booking_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      sql += ` AND LOWER(b.booking_status) = LOWER($${params.length + 1})`;
      params.push(status);
    }

    if (type && type !== 'all') {
      sql += ` AND LOWER(b.service_type) = LOWER($${params.length + 1})`;
      params.push(type);
    }

    if (date) {
      sql += ` AND b.travel_date = $${params.length + 1}`;
      params.push(date);
    }

    sql += ` ORDER BY b.created_at DESC`;

    if (limit) {
      sql += ` LIMIT $${params.length + 1}`;
      params.push(limit);
    }

    const res = await db.query(sql, params);
    return res.rows;
  },

  async getIncomingDriverRequests(driverId) {
    // Weekday rides assigned to this driver AND general unassigned/eligible taxi requests in Pending status
    const res = await db.query(
      `SELECT b.*, u.full_name as passenger_name, u.phone as passenger_phone, u.passenger_type
       FROM bookings b
       JOIN users u ON b.user_id = u.user_id
       WHERE (
         -- Weekday ride specifically requesting this driver
         (b.service_type = 'Weekday Ride' AND b.assigned_driver_id = $1 AND b.booking_status = 'Pending')
         OR
         -- Taxi request awaiting first verified driver to accept
         (b.service_type = 'Taxi' AND (b.assigned_driver_id IS NULL OR b.assigned_driver_id = $1) AND b.booking_status = 'Pending' AND (b.quotation_status = 'None' OR b.quotation_status = 'Not Required' OR b.quotation_status = 'Accepted'))
       )
       ORDER BY b.travel_date ASC, b.departure_time ASC`,
      [driverId]
    );
    return res.rows;
  },

  async getDriverTrips(driverId, filterStatus = null) {
    let sql = `
      SELECT b.*,
             u.full_name as passenger_name, u.phone as passenger_phone, u.passenger_type,
             v.registration_number, v.vehicle_model,
             p.payment_status, p.amount as payment_amount, p.payment_id
      FROM bookings b
      JOIN users u ON b.user_id = u.user_id
      LEFT JOIN vehicles v ON b.assigned_vehicle_id = v.vehicle_id
      LEFT JOIN payments p ON p.booking_id = b.booking_id
      WHERE b.assigned_driver_id = $1
    `;
    const params = [driverId];

    if (filterStatus) {
      if (filterStatus === 'upcoming') {
        sql += ` AND b.booking_status IN ('Confirmed', 'In Progress')`;
      } else if (filterStatus === 'completed') {
        sql += ` AND b.booking_status = 'Completed'`;
      } else if (filterStatus === 'bus') {
        sql += ` AND b.service_type = 'Bus'`;
      } else {
        sql += ` AND b.booking_status = $2`;
        params.push(filterStatus);
      }
    }

    sql += ` ORDER BY b.travel_date DESC, b.departure_time DESC`;
    const res = await db.query(sql, params);
    return res.rows;
  },

  async acceptDriverRequest(bookingId, driverId, vehicleId = null) {
    const booking = await this.getById(bookingId);
    if (!booking) throw new Error('Booking not found.');

    if (booking.booking_status !== 'Pending') {
      throw new Error(`This ride request has already been ${booking.booking_status.toLowerCase()} by another driver.`);
    }

    // Check conflict for this driver
    const hasConflict = await this.checkDriverConflict(driverId, booking.travel_date, booking.departure_time, bookingId);
    if (hasConflict) {
      throw new Error('You already have another confirmed trip scheduled for this date and time.');
    }

    // Assign driver & set confirmed
    const res = await db.query(
      `UPDATE bookings
       SET booking_status = 'Confirmed',
           assigned_driver_id = $1,
           assigned_vehicle_id = COALESCE($2, assigned_vehicle_id),
           updated_at = CURRENT_TIMESTAMP
       WHERE booking_id = $3 AND booking_status = 'Pending'
       RETURNING *`,
      [driverId, vehicleId, bookingId]
    );

    if (res.rowCount === 0) {
      throw new Error('Could not accept request. It may have already been accepted.');
    }

    // Update payment record with assigned driver
    await db.query(
      `UPDATE payments SET driver_id = $1 WHERE booking_id = $2`,
      [driverId, bookingId]
    );

    return res.rows[0];
  },

  async rejectDriverRequest(bookingId, driverId, reason = 'Driver unavailable') {
    const res = await db.query(
      `UPDATE bookings
       SET booking_status = 'Rejected',
           rejection_reason = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE booking_id = $2 AND (assigned_driver_id = $3 OR assigned_driver_id IS NULL)
       RETURNING *`,
      [reason, bookingId, driverId]
    );
    return res.rows[0] || null;
  },

  async updateStatus(bookingId, status, reason = null) {
    const valid = ['Pending', 'Confirmed', 'Rejected', 'Cancelled', 'In Progress', 'Completed'];
    if (!valid.includes(status)) throw new Error('Invalid booking status: ' + status);

    const res = await db.query(
      `UPDATE bookings
       SET booking_status = $1,
           rejection_reason = COALESCE($2, rejection_reason),
           updated_at = CURRENT_TIMESTAMP
       WHERE booking_id = $3
       RETURNING *`,
      [status, reason, bookingId]
    );
    return res.rows[0];
  },

  async provideQuotation(bookingId, quotedFare, adminNotes = '') {
    const fare = parseFloat(quotedFare);
    if (isNaN(fare) || fare <= 0) throw new Error('Quoted fare must be a positive number.');

    const res = await db.query(
      `UPDATE bookings
       SET quoted_fare = $1,
           total_fare = $1,
           quotation_status = 'Quoted',
           admin_notes = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE booking_id = $3
       RETURNING *`,
      [fare, adminNotes.trim(), bookingId]
    );

    // Update payment amount
    await db.query(
      `UPDATE payments SET amount = $1 WHERE booking_id = $2`,
      [fare, bookingId]
    );

    return res.rows[0];
  },

  async acceptQuotation(bookingId, userId) {
    const res = await db.query(
      `UPDATE bookings
       SET quotation_status = 'Accepted',
           updated_at = CURRENT_TIMESTAMP
       WHERE booking_id = $1 AND user_id = $2 AND quotation_status = 'Quoted'
       RETURNING *`,
      [bookingId, userId]
    );
    return res.rows[0];
  },

  async declineQuotation(bookingId, userId) {
    const res = await db.query(
      `UPDATE bookings
       SET quotation_status = 'Declined',
           booking_status = 'Cancelled',
           rejection_reason = 'Passenger declined fare quotation',
           updated_at = CURRENT_TIMESTAMP
       WHERE booking_id = $1 AND user_id = $2 AND quotation_status = 'Quoted'
       RETURNING *`,
      [bookingId, userId]
    );
    return res.rows[0];
  },

  async assignDriverAndVehicle(bookingId, driverId, vehicleId, adminNotes = '') {
    const booking = await this.getById(bookingId);
    if (!booking) throw new Error('Booking not found.');

    // Conflict detection
    const driverConflict = await this.checkDriverConflict(driverId, booking.travel_date, booking.departure_time, bookingId);
    if (driverConflict) {
      throw new Error('This driver already has an overlapping active booking at that date and time.');
    }

    const vehicleConflict = await this.checkVehicleConflict(vehicleId, booking.travel_date, booking.departure_time, bookingId);
    if (vehicleConflict) {
      throw new Error('This vehicle already has an overlapping active booking at that date and time.');
    }

    const res = await db.query(
      `UPDATE bookings
       SET assigned_driver_id = $1,
           assigned_vehicle_id = $2,
           booking_status = 'Confirmed',
           admin_notes = COALESCE($3, admin_notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE booking_id = $4
       RETURNING *`,
      [driverId, vehicleId, adminNotes.trim(), bookingId]
    );

    // Update payment driver
    await db.query(
      `UPDATE payments SET driver_id = $1 WHERE booking_id = $2`,
      [driverId, bookingId]
    );

    return res.rows[0];
  },

  async checkDriverConflict(driverId, travelDate, departureTime, excludeBookingId = null) {
    let sql = `
      SELECT booking_id FROM bookings
      WHERE assigned_driver_id = $1
        AND travel_date = $2
        AND booking_status IN ('Confirmed', 'In Progress')
    `;
    const params = [driverId, travelDate];
    if (excludeBookingId) {
      sql += ` AND booking_id != $3`;
      params.push(excludeBookingId);
    }
    const res = await db.query(sql, params);
    return res.rows.length > 0;
  },

  async checkVehicleConflict(vehicleId, travelDate, departureTime, excludeBookingId = null) {
    let sql = `
      SELECT booking_id FROM bookings
      WHERE assigned_vehicle_id = $1
        AND travel_date = $2
        AND booking_status IN ('Confirmed', 'In Progress')
    `;
    const params = [vehicleId, travelDate];
    if (excludeBookingId) {
      sql += ` AND booking_id != $3`;
      params.push(excludeBookingId);
    }
    const res = await db.query(sql, params);
    return res.rows.length > 0;
  },

  async cancelBooking(bookingId, userId, reason = 'Cancelled by passenger') {
    const booking = await this.getById(bookingId);
    if (!booking) throw new Error('Booking not found.');

    if (booking.booking_status === 'In Progress' || booking.booking_status === 'Completed') {
      throw new Error('Cannot cancel a ride that is already in progress or completed.');
    }

    const res = await db.query(
      `UPDATE bookings
       SET booking_status = 'Cancelled',
           rejection_reason = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE booking_id = $2 AND (user_id = $3 OR $3 = 0)
       RETURNING *`,
      [reason, bookingId, userId]
    );

    if (res.rowCount === 0) {
      throw new Error('Unauthorized or booking could not be cancelled.');
    }

    return res.rows[0];
  },

  async getPlatformStats() {
    const total = await db.query(`SELECT COUNT(*)::int as count FROM bookings`);
    const pending = await db.query(`SELECT COUNT(*)::int as count FROM bookings WHERE booking_status = 'Pending'`);
    const confirmed = await db.query(`SELECT COUNT(*)::int as count FROM bookings WHERE booking_status = 'Confirmed'`);
    const inProgress = await db.query(`SELECT COUNT(*)::int as count FROM bookings WHERE booking_status = 'In Progress'`);
    const completed = await db.query(`SELECT COUNT(*)::int as count FROM bookings WHERE booking_status = 'Completed'`);
    const cancelled = await db.query(`SELECT COUNT(*)::int as count FROM bookings WHERE booking_status IN ('Cancelled', 'Rejected')`);

    const weekdayCount = await db.query(`SELECT COUNT(*)::int as count FROM bookings WHERE service_type = 'Weekday Ride'`);
    const taxiCount = await db.query(`SELECT COUNT(*)::int as count FROM bookings WHERE service_type = 'Taxi'`);
    const busCount = await db.query(`SELECT COUNT(*)::int as count FROM bookings WHERE service_type = 'Bus'`);

    const totalRevenue = await db.query(`
      SELECT COALESCE(SUM(total_fare), 0)::numeric as rev
      FROM bookings
      WHERE booking_status = 'Completed'
    `);

    return {
      total_bookings: total.rows[0] ? total.rows[0].count : 0,
      pending_bookings: pending.rows[0] ? pending.rows[0].count : 0,
      confirmed_bookings: confirmed.rows[0] ? confirmed.rows[0].count : 0,
      in_progress_bookings: inProgress.rows[0] ? inProgress.rows[0].count : 0,
      completed_bookings: completed.rows[0] ? completed.rows[0].count : 0,
      cancelled_bookings: cancelled.rows[0] ? cancelled.rows[0].count : 0,
      weekday_rides_count: weekdayCount.rows[0] ? weekdayCount.rows[0].count : 0,
      taxis_count: taxiCount.rows[0] ? taxiCount.rows[0].count : 0,
      buses_count: busCount.rows[0] ? busCount.rows[0].count : 0,
      total_revenue: totalRevenue.rows[0] ? parseFloat(totalRevenue.rows[0].rev) : 0,
    };
  },
};

module.exports = bookingModel;
