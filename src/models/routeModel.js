const db = require('../config/db');

const RouteModel = {
  async getAll({ activeOnly = false } = {}) {
    let sql = `
      SELECT 
        r.*,
        s_orig.name AS origin_stop_name,
        s_orig.code AS origin_stop_code,
        s_dest.name AS destination_stop_name,
        s_dest.code AS destination_stop_code
      FROM routes r
      JOIN stops s_orig ON r.origin_stop_id = s_orig.id
      JOIN stops s_dest ON r.destination_stop_id = s_dest.id
    `;
    if (activeOnly) {
      sql += ` WHERE r.is_active = TRUE`;
    }
    sql += ` ORDER BY r.name ASC`;
    const res = await db.query(sql);
    return res.rows;
  },

  async getById(id) {
    const res = await db.query(
      `SELECT 
        r.*,
        s_orig.name AS origin_stop_name,
        s_orig.code AS origin_stop_code,
        s_dest.name AS destination_stop_name,
        s_dest.code AS destination_stop_code
      FROM routes r
      JOIN stops s_orig ON r.origin_stop_id = s_orig.id
      JOIN stops s_dest ON r.destination_stop_id = s_dest.id
      WHERE r.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  },

  async create({ name, originStopId, destinationStopId, distanceKm = 0, estimatedDurationMin = 15, isActive = true }) {
    const res = await db.query(
      `INSERT INTO routes (name, origin_stop_id, destination_stop_id, distance_km, estimated_duration_min, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name.trim(), originStopId, destinationStopId, distanceKm, estimatedDurationMin, isActive]
    );
    return res.rows[0];
  },

  async update(id, { name, originStopId, destinationStopId, distanceKm = 0, estimatedDurationMin = 15, isActive = true }) {
    const res = await db.query(
      `UPDATE routes 
       SET name = $1, origin_stop_id = $2, destination_stop_id = $3, 
           distance_km = $4, estimated_duration_min = $5, is_active = $6
       WHERE id = $7
       RETURNING *`,
      [name.trim(), originStopId, destinationStopId, distanceKm, estimatedDurationMin, isActive, id]
    );
    return res.rows[0] || null;
  },

  async delete(id) {
    const res = await db.query(`DELETE FROM routes WHERE id = $1 RETURNING id`, [id]);
    return res.rows[0] || null;
  }
};

module.exports = RouteModel;
