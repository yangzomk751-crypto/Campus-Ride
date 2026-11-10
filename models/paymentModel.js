const db = require('../config/database');

const paymentModel = {
  async getByBookingId(bookingId) {
    const res = await db.query(
      `SELECT p.*, b.service_type, b.destination, b.pickup_location, b.travel_date,
              u.full_name as passenger_name, u.phone as passenger_phone,
              du.full_name as driver_name
       FROM payments p
       JOIN bookings b ON p.booking_id = b.booking_id
       JOIN users u ON p.passenger_id = u.user_id
       LEFT JOIN drivers d ON p.driver_id = d.driver_id
       LEFT JOIN users du ON d.user_id = du.user_id
       WHERE p.booking_id = $1 LIMIT 1`,
      [bookingId]
    );
    return res.rows[0] || null;
  },

  async getUserPayments(passengerId) {
    const res = await db.query(
      `SELECT p.*, b.service_type, b.destination, b.pickup_location, b.travel_date, b.booking_status,
              du.full_name as driver_name
       FROM payments p
       JOIN bookings b ON p.booking_id = b.booking_id
       LEFT JOIN drivers d ON p.driver_id = d.driver_id
       LEFT JOIN users du ON d.user_id = du.user_id
       WHERE p.passenger_id = $1
       ORDER BY p.created_at DESC`,
      [passengerId]
    );
    return res.rows;
  },

  async getDriverPayments(driverId) {
    const res = await db.query(
      `SELECT p.*, b.service_type, b.destination, b.pickup_location, b.travel_date, b.booking_status,
              u.full_name as passenger_name, u.phone as passenger_phone
       FROM payments p
       JOIN bookings b ON p.booking_id = b.booking_id
       JOIN users u ON p.passenger_id = u.user_id
       WHERE p.driver_id = $1
       ORDER BY p.created_at DESC`,
      [driverId]
    );
    return res.rows;
  },

  async getAllPayments(status = null) {
    let sql = `
      SELECT p.*, b.service_type, b.destination, b.pickup_location, b.travel_date, b.booking_status,
              u.full_name as passenger_name, u.phone as passenger_phone, u.passenger_type,
              du.full_name as driver_name,
              ru.full_name as recorder_name
       FROM payments p
       JOIN bookings b ON p.booking_id = b.booking_id
       JOIN users u ON p.passenger_id = u.user_id
       LEFT JOIN drivers d ON p.driver_id = d.driver_id
       LEFT JOIN users du ON d.user_id = du.user_id
       LEFT JOIN users ru ON p.recorded_by = ru.user_id
       WHERE 1=1
    `;
    const params = [];
    if (status && status !== 'all') {
      sql += ` AND LOWER(p.payment_status) = LOWER($1)`;
      params.push(status);
    }
    sql += ` ORDER BY p.created_at DESC`;
    const res = await db.query(sql, params);
    return res.rows;
  },

  async recordCashPayment(bookingId, driverUserId, notes = '') {
    const res = await db.query(
      `UPDATE payments
       SET payment_status = 'Paid',
           payment_method = 'Cash',
           recorded_by = $1,
           notes = COALESCE($2, notes),
           paid_at = CURRENT_TIMESTAMP
       WHERE booking_id = $3
       RETURNING *`,
      [driverUserId, notes.trim(), bookingId]
    );
    return res.rows[0];
  },

  async markStatus(paymentId, status, adminUserId, notes = '') {
    const valid = ['Pending', 'Paid', 'Waived'];
    if (!valid.includes(status)) throw new Error('Invalid payment status: ' + status);

    const paidAt = (status === 'Paid' || status === 'Waived') ? 'CURRENT_TIMESTAMP' : 'NULL';

    const res = await db.query(
      `UPDATE payments
       SET payment_status = $1,
           recorded_by = $2,
           notes = COALESCE($3, notes),
           paid_at = ${paidAt}
       WHERE payment_id = $4
       RETURNING *`,
      [status, adminUserId, notes.trim(), paymentId]
    );
    return res.rows[0];
  },

  async getSummaryStats() {
    const total = await db.query(`SELECT COUNT(*)::int as count, COALESCE(SUM(amount), 0)::numeric as sum FROM payments`);
    const paid = await db.query(`SELECT COUNT(*)::int as count, COALESCE(SUM(amount), 0)::numeric as sum FROM payments WHERE payment_status = 'Paid'`);
    const pending = await db.query(`SELECT COUNT(*)::int as count, COALESCE(SUM(amount), 0)::numeric as sum FROM payments WHERE payment_status = 'Pending'`);
    const waived = await db.query(`SELECT COUNT(*)::int as count, COALESCE(SUM(amount), 0)::numeric as sum FROM payments WHERE payment_status = 'Waived'`);

    return {
      total_payments: total.rows[0] ? total.rows[0].count : 0,
      total_amount: total.rows[0] ? parseFloat(total.rows[0].sum) : 0,
      paid_count: paid.rows[0] ? paid.rows[0].count : 0,
      paid_amount: paid.rows[0] ? parseFloat(paid.rows[0].sum) : 0,
      pending_count: pending.rows[0] ? pending.rows[0].count : 0,
      pending_amount: pending.rows[0] ? parseFloat(pending.rows[0].sum) : 0,
      waived_count: waived.rows[0] ? waived.rows[0].count : 0,
      waived_amount: waived.rows[0] ? parseFloat(waived.rows[0].sum) : 0,
    };
  },
};

module.exports = paymentModel;
