const db = require('../config/database');

const vehicleModel = {
  async getAll() {
    const res = await db.query(
      `SELECT v.*, d.user_id, u.full_name as driver_name, u.phone as driver_phone
       FROM vehicles v
       LEFT JOIN drivers d ON v.driver_id = d.driver_id
       LEFT JOIN users u ON d.user_id = u.user_id
       ORDER BY v.vehicle_type ASC, v.registration_number ASC`
    );
    return res.rows;
  },

  async getById(vehicleId) {
    const res = await db.query(
      `SELECT v.*, d.user_id, u.full_name as driver_name, u.phone as driver_phone
       FROM vehicles v
       LEFT JOIN drivers d ON v.driver_id = d.driver_id
       LEFT JOIN users u ON d.user_id = u.user_id
       WHERE v.vehicle_id = $1 LIMIT 1`,
      [vehicleId]
    );
    return res.rows[0] || null;
  },

  async getAvailableVehicles(vehicleType = null) {
    let sql = `
      SELECT v.*, u.full_name as driver_name, u.phone as driver_phone
      FROM vehicles v
      LEFT JOIN drivers d ON v.driver_id = d.driver_id
      LEFT JOIN users u ON d.user_id = u.user_id
      WHERE v.availability_status = 'Available'
    `;
    const params = [];
    if (vehicleType) {
      sql += ` AND LOWER(v.vehicle_type) = LOWER($1)`;
      params.push(vehicleType);
    }
    sql += ` ORDER BY v.capacity DESC`;
    const res = await db.query(sql, params);
    return res.rows;
  },

  async create({ driverId = null, registrationNumber, vehicleModel, vehicleType, capacity, description = '' }) {
    const res = await db.query(
      `INSERT INTO vehicles (driver_id, registration_number, vehicle_model, vehicle_type, capacity, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [driverId, registrationNumber.trim().toUpperCase(), vehicleModel.trim(), vehicleType, capacity, description.trim()]
    );
    return res.rows[0];
  },

  async updateStatus(vehicleId, status) {
    const res = await db.query(
      `UPDATE vehicles SET availability_status = $1 WHERE vehicle_id = $2 RETURNING *`,
      [status, vehicleId]
    );
    return res.rows[0];
  },

  async assignDriver(vehicleId, driverId) {
    const res = await db.query(
      `UPDATE vehicles SET driver_id = $1 WHERE vehicle_id = $2 RETURNING *`,
      [driverId, vehicleId]
    );
    return res.rows[0];
  },

  async checkAvailability(vehicleId, travelDate, departureTime, excludeBookingId = null) {
    let sql = `
      SELECT b.booking_id, b.travel_date, b.departure_time, b.booking_status
      FROM bookings b
      WHERE b.assigned_vehicle_id = $1
        AND b.travel_date = $2
        AND b.booking_status IN ('Confirmed', 'In Progress')
    `;
    const params = [vehicleId, travelDate];
    if (excludeBookingId) {
      sql += ` AND b.booking_id != $3`;
      params.push(excludeBookingId);
    }
    const res = await db.query(sql, params);
    return res.rows.length === 0;
  },
};

module.exports = vehicleModel;
