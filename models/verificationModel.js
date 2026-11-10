const db = require('../config/database');

const verificationModel = {
  async submitOrUpdate({ userId, licenseNumber, vehicleId }) {
    // Check if verification record already exists
    const existing = await db.query(
      `SELECT * FROM driver_verifications WHERE user_id = $1;`,
      [userId]
    );

    if (existing.rows.length > 0) {
      const res = await db.query(
        `UPDATE driver_verifications
         SET license_number = $1,
             vehicle_id = $2,
             verification_status = 'Pending',
             admin_notes = 'Resubmitted for verification'
         WHERE user_id = $3
         RETURNING *;`,
        [licenseNumber.trim(), vehicleId || null, userId]
      );
      return res.rows[0];
    } else {
      const res = await db.query(
        `INSERT INTO driver_verifications (user_id, license_number, vehicle_id, verification_status, admin_notes)
         VALUES ($1, $2, $3, 'Pending', 'Initial verification submission')
         RETURNING *;`,
        [userId, licenseNumber.trim(), vehicleId || null]
      );
      return res.rows[0];
    }
  },

  async getByUserId(userId) {
    const query = `
      SELECT dv.*, v.vehicle_model, v.registration_number, v.vehicle_type
      FROM driver_verifications dv
      LEFT JOIN vehicles v ON dv.vehicle_id = v.vehicle_id
      WHERE dv.user_id = $1;
    `;
    const res = await db.query(query, [userId]);
    return res.rows[0] || null;
  },

  async isDriverVerified(userId) {
    const res = await db.query(
      `SELECT verification_status FROM driver_verifications WHERE user_id = $1;`,
      [userId]
    );
    return res.rows.length > 0 && res.rows[0].verification_status === 'Verified';
  },

  async getAllVerifications({ status } = {}) {
    let query = `
      SELECT dv.*, u.full_name, u.email, u.phone,
             sp.student_id, sp.department,
             v.vehicle_model, v.registration_number, v.vehicle_type, v.capacity
      FROM driver_verifications dv
      JOIN users u ON dv.user_id = u.user_id
      LEFT JOIN student_profiles sp ON u.user_id = sp.user_id
      LEFT JOIN vehicles v ON dv.vehicle_id = v.vehicle_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND dv.verification_status = $${params.length}`;
    }

    query += ` ORDER BY dv.created_at DESC;`;
    const res = await db.query(query, params);
    return res.rows;
  },

  async updateStatus(verificationId, { status, adminNotes }) {
    const res = await db.query(
      `UPDATE driver_verifications
       SET verification_status = $1,
           admin_notes = $2,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE verification_id = $3
       RETURNING *;`,
      [status, adminNotes || null, verificationId]
    );
    return res.rows[0] || null;
  },

  async getPendingCount() {
    const res = await db.query(
      `SELECT COUNT(*)::int AS count FROM driver_verifications WHERE verification_status = 'Pending';`
    );
    return res.rows[0].count;
  },
};

module.exports = verificationModel;
