const db = require('../config/database');

const driverModel = {
  async getByUserId(userId) {
    const res = await db.query(
      `SELECT d.*, u.full_name, u.email, u.phone, u.status as user_status,
              v.vehicle_id, v.vehicle_model, v.registration_number, v.vehicle_type, v.capacity
       FROM drivers d
       JOIN users u ON d.user_id = u.user_id
       LEFT JOIN vehicles v ON v.driver_id = d.driver_id
       WHERE d.user_id = $1 LIMIT 1`,
      [userId]
    );
    return res.rows[0] || null;
  },

  async getById(driverId) {
    const res = await db.query(
      `SELECT d.*, u.full_name, u.email, u.phone,
              v.vehicle_id, v.vehicle_model, v.registration_number, v.vehicle_type, v.capacity
       FROM drivers d
       JOIN users u ON d.user_id = u.user_id
       LEFT JOIN vehicles v ON v.driver_id = d.driver_id
       WHERE d.driver_id = $1 LIMIT 1`,
      [driverId]
    );
    return res.rows[0] || null;
  },

  async getAll() {
    const res = await db.query(
      `SELECT d.*, u.full_name, u.email, u.phone, u.status as user_status,
              v.vehicle_id, v.vehicle_model, v.registration_number, v.vehicle_type, v.capacity
       FROM drivers d
       JOIN users u ON d.user_id = u.user_id
       LEFT JOIN vehicles v ON v.driver_id = d.driver_id
       ORDER BY d.created_at DESC`
    );
    return res.rows;
  },

  async getAvailableWeekdayDrivers() {
    const res = await db.query(
      `SELECT d.*, u.full_name, u.phone,
              v.vehicle_id, v.vehicle_model, v.registration_number, v.vehicle_type, v.capacity
       FROM drivers d
       JOIN users u ON d.user_id = u.user_id
       LEFT JOIN vehicles v ON v.driver_id = d.driver_id
       WHERE d.verification_status = 'Approved'
         AND d.availability_status = 'Available'
         AND d.weekday_available = TRUE
         AND u.status = 'active'
       ORDER BY d.driver_id ASC`
    );
    return res.rows;
  },

  async getAvailableDrivers(vehicleType = null) {
    let sql = `
      SELECT d.*, u.full_name, u.phone,
             v.vehicle_id, v.vehicle_model, v.registration_number, v.vehicle_type, v.capacity
      FROM drivers d
      JOIN users u ON d.user_id = u.user_id
      LEFT JOIN vehicles v ON v.driver_id = d.driver_id
      WHERE d.verification_status = 'Approved'
        AND d.availability_status = 'Available'
        AND u.status = 'active'
    `;
    const params = [];
    if (vehicleType) {
      sql += ` AND v.vehicle_type = $1`;
      params.push(vehicleType);
    }
    sql += ` ORDER BY d.driver_id ASC`;
    const res = await db.query(sql, params);
    return res.rows;
  },

  async create({ userId, licenseNumber, notes = '' }) {
    const res = await db.query(
      `INSERT INTO drivers (user_id, license_number, verification_status, availability_status, weekday_available, notes)
       VALUES ($1, $2, 'Pending', 'Unavailable', FALSE, $3)
       RETURNING *`,
      [userId, licenseNumber.trim(), notes.trim()]
    );
    return res.rows[0];
  },

  async updateAvailability(driverId, availabilityStatus) {
    const res = await db.query(
      `UPDATE drivers SET availability_status = $1 WHERE driver_id = $2 RETURNING *`,
      [availabilityStatus, driverId]
    );
    return res.rows[0];
  },

  async updateWeekdayAvailability(driverId, weekdayAvailable) {
    const res = await db.query(
      `UPDATE drivers SET weekday_available = $1 WHERE driver_id = $2 RETURNING *`,
      [weekdayAvailable, driverId]
    );
    return res.rows[0];
  },

  async updateVerificationStatus(driverId, verificationStatus) {
    const res = await db.query(
      `UPDATE drivers SET verification_status = $1 WHERE driver_id = $2 RETURNING *`,
      [verificationStatus, driverId]
    );
    return res.rows[0];
  },
};

module.exports = driverModel;
