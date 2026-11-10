const db = require('../config/db');

const VehicleModel = {
  async getAll({ status = null } = {}) {
    let sql = `SELECT * FROM vehicles`;
    const params = [];
    if (status) {
      params.push(status);
      sql += ` WHERE status = $1`;
    }
    sql += ` ORDER BY plate_number ASC`;
    const res = await db.query(sql, params);
    return res.rows;
  },

  async getById(id) {
    const res = await db.query(`SELECT * FROM vehicles WHERE id = $1`, [id]);
    return res.rows[0] || null;
  },

  async create({ plateNumber, modelName, vehicleType = 'Shuttle Bus', capacity, status = 'ACTIVE' }) {
    const res = await db.query(
      `INSERT INTO vehicles (plate_number, model_name, vehicle_type, capacity, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [plateNumber.trim().toUpperCase(), modelName.trim(), vehicleType, capacity, status]
    );
    return res.rows[0];
  },

  async update(id, { plateNumber, modelName, vehicleType = 'Shuttle Bus', capacity, status = 'ACTIVE' }) {
    const res = await db.query(
      `UPDATE vehicles 
       SET plate_number = $1, model_name = $2, vehicle_type = $3, capacity = $4, status = $5
       WHERE id = $6
       RETURNING *`,
      [plateNumber.trim().toUpperCase(), modelName.trim(), vehicleType, capacity, status, id]
    );
    return res.rows[0] || null;
  },

  async delete(id) {
    const res = await db.query(`DELETE FROM vehicles WHERE id = $1 RETURNING id`, [id]);
    return res.rows[0] || null;
  }
};

module.exports = VehicleModel;
