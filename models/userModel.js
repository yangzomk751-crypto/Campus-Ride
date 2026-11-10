const db = require('../config/database');

const userModel = {
  async findByEmail(email) {
    const res = await db.query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email.trim()]
    );
    return res.rows[0] || null;
  },

  async findById(userId) {
    const res = await db.query(
      `SELECT * FROM users WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return res.rows[0] || null;
  },

  async create({ fullName, email, passwordHash, role, passengerType = null, phone }) {
    const res = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, passenger_type, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [fullName.trim(), email.trim().toLowerCase(), passwordHash, role, passengerType, phone.trim()]
    );
    return res.rows[0];
  },

  async getAllPassengers() {
    const res = await db.query(
      `SELECT user_id, full_name, email, phone, role, passenger_type, status, created_at
       FROM users
       WHERE role = 'passenger'
       ORDER BY created_at DESC`
    );
    return res.rows;
  },

  async updateStatus(userId, status) {
    const res = await db.query(
      `UPDATE users SET status = $1 WHERE user_id = $2 RETURNING *`,
      [status, userId]
    );
    return res.rows[0];
  },

  async updateProfile(userId, { fullName, phone }) {
    const res = await db.query(
      `UPDATE users SET full_name = $1, phone = $2 WHERE user_id = $3 RETURNING *`,
      [fullName.trim(), phone.trim(), userId]
    );
    return res.rows[0];
  },

  async getPlatformStats() {
    const usersRes = await db.query(`SELECT COUNT(*)::int AS count FROM users`);
    const passengersRes = await db.query(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'passenger'`);
    const studentsRes = await db.query(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'passenger' AND passenger_type = 'student'`);
    const staffRes = await db.query(`SELECT COUNT(*)::int AS count FROM users WHERE role = 'passenger' AND passenger_type = 'staff'`);

    return {
      total_users: usersRes.rows[0] ? usersRes.rows[0].count : 0,
      total_passengers: passengersRes.rows[0] ? passengersRes.rows[0].count : 0,
      total_students: studentsRes.rows[0] ? studentsRes.rows[0].count : 0,
      total_staff: staffRes.rows[0] ? staffRes.rows[0].count : 0,
    };
  },
};

module.exports = userModel;
