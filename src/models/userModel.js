const db = require('../config/db');

const UserModel = {
  async findByEmail(email) {
    const res = await db.query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );
    return res.rows[0] || null;
  },

  async findById(id) {
    const res = await db.query(
      `SELECT id, full_name, email, role, phone, student_staff_id, created_at 
       FROM users WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  },

  async create({ fullName, email, passwordHash, role = 'passenger', phone = null, studentStaffId = null }) {
    const res = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, phone, student_staff_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, email, role, phone, student_staff_id, created_at`,
      [fullName.trim(), email.trim().toLowerCase(), passwordHash, role, phone, studentStaffId]
    );
    return res.rows[0];
  },

  async getAll({ role = null } = {}) {
    let query = `SELECT id, full_name, email, role, phone, student_staff_id, created_at FROM users`;
    const params = [];
    if (role) {
      params.push(role);
      query += ` WHERE role = $1`;
    }
    query += ` ORDER BY created_at DESC`;
    const res = await db.query(query, params);
    return res.rows;
  },

  async getDrivers() {
    const res = await db.query(
      `SELECT id, full_name, email, phone, student_staff_id FROM users WHERE role = 'driver' ORDER BY full_name ASC`
    );
    return res.rows;
  },

  async updateRole(id, newRole) {
    const res = await db.query(
      `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, full_name, email, role`,
      [newRole, id]
    );
    return res.rows[0] || null;
  },

  async countStats() {
    const res = await db.query(`
      SELECT 
        COUNT(*) AS total_users,
        COUNT(*) FILTER (WHERE role = 'passenger') AS passengers,
        COUNT(*) FILTER (WHERE role = 'driver') AS drivers,
        COUNT(*) FILTER (WHERE role = 'admin') AS admins
      FROM users
    `);
    return res.rows[0];
  }
};

module.exports = UserModel;
