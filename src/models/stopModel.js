const db = require('../config/db');

const StopModel = {
  async getAll({ activeOnly = false } = {}) {
    let sql = `SELECT * FROM stops`;
    if (activeOnly) {
      sql += ` WHERE is_active = TRUE`;
    }
    sql += ` ORDER BY name ASC`;
    const res = await db.query(sql);
    return res.rows;
  },

  async getById(id) {
    const res = await db.query(`SELECT * FROM stops WHERE id = $1`, [id]);
    return res.rows[0] || null;
  },

  async create({ name, code, locationDescription = '', isActive = true }) {
    const res = await db.query(
      `INSERT INTO stops (name, code, location_description, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name.trim(), code.trim().toUpperCase(), locationDescription, isActive]
    );
    return res.rows[0];
  },

  async update(id, { name, code, locationDescription = '', isActive = true }) {
    const res = await db.query(
      `UPDATE stops 
       SET name = $1, code = $2, location_description = $3, is_active = $4
       WHERE id = $5
       RETURNING *`,
      [name.trim(), code.trim().toUpperCase(), locationDescription, isActive, id]
    );
    return res.rows[0] || null;
  },

  async delete(id) {
    const res = await db.query(`DELETE FROM stops WHERE id = $1 RETURNING id`, [id]);
    return res.rows[0] || null;
  }
};

module.exports = StopModel;
