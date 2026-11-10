const db = require('../config/db');

const TripModel = {
  async getAll({ status = null, date = null, driverId = null, limit = 50 } = {}) {
    let sql = `
      SELECT 
        t.*,
        r.name AS route_name,
        r.distance_km,
        r.estimated_duration_min,
        s_orig.name AS origin_stop_name,
        s_orig.code AS origin_stop_code,
        s_dest.name AS destination_stop_name,
        s_dest.code AS destination_stop_code,
        v.plate_number AS vehicle_plate,
        v.model_name AS vehicle_model,
        v.vehicle_type,
        v.capacity AS vehicle_capacity,
        u.full_name AS driver_name,
        u.phone AS driver_phone,
        (SELECT COUNT(*) FROM bookings b WHERE b.trip_id = t.id AND b.status = 'CONFIRMED') AS booked_passengers_count
      FROM trips t
      JOIN routes r ON t.route_id = r.id
      JOIN stops s_orig ON r.origin_stop_id = s_orig.id
      JOIN stops s_dest ON r.destination_stop_id = s_dest.id
      JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN users u ON t.driver_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND t.status = $${params.length}`;
    }

    if (driverId) {
      params.push(driverId);
      sql += ` AND t.driver_id = $${params.length}`;
    }

    if (date) {
      params.push(date);
      sql += ` AND DATE(t.departure_time) = DATE($${params.length})`;
    }

    sql += ` ORDER BY t.departure_time DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const res = await db.query(sql, params);
    return res.rows;
  },

  async getUpcoming({ originStopId = null, destinationStopId = null, date = null } = {}) {
    let sql = `
      SELECT 
        t.*,
        r.name AS route_name,
        r.distance_km,
        r.estimated_duration_min,
        s_orig.name AS origin_stop_name,
        s_orig.code AS origin_stop_code,
        s_dest.name AS destination_stop_name,
        s_dest.code AS destination_stop_code,
        v.plate_number AS vehicle_plate,
        v.model_name AS vehicle_model,
        v.vehicle_type,
        v.capacity AS vehicle_capacity,
        u.full_name AS driver_name
      FROM trips t
      JOIN routes r ON t.route_id = r.id
      JOIN stops s_orig ON r.origin_stop_id = s_orig.id
      JOIN stops s_dest ON r.destination_stop_id = s_dest.id
      JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN users u ON t.driver_id = u.id
      WHERE t.departure_time >= NOW() - INTERVAL '10 minutes'
        AND t.status IN ('SCHEDULED', 'BOARDING')
    `;
    const params = [];

    if (originStopId) {
      params.push(originStopId);
      sql += ` AND r.origin_stop_id = $${params.length}`;
    }

    if (destinationStopId) {
      params.push(destinationStopId);
      sql += ` AND r.destination_stop_id = $${params.length}`;
    }

    if (date) {
      params.push(date);
      sql += ` AND DATE(t.departure_time) = DATE($${params.length})`;
    }

    sql += ` ORDER BY t.departure_time ASC LIMIT 30`;
    const res = await db.query(sql, params);
    return res.rows;
  },

  async getById(id) {
    const res = await db.query(
      `SELECT 
        t.*,
        r.name AS route_name,
        r.distance_km,
        r.estimated_duration_min,
        s_orig.name AS origin_stop_name,
        s_orig.code AS origin_stop_code,
        s_dest.name AS destination_stop_name,
        s_dest.code AS destination_stop_code,
        v.plate_number AS vehicle_plate,
        v.model_name AS vehicle_model,
        v.vehicle_type,
        v.capacity AS vehicle_capacity,
        u.full_name AS driver_name,
        u.phone AS driver_phone,
        u.email AS driver_email
      FROM trips t
      JOIN routes r ON t.route_id = r.id
      JOIN stops s_orig ON r.origin_stop_id = s_orig.id
      JOIN stops s_dest ON r.destination_stop_id = s_dest.id
      JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN users u ON t.driver_id = u.id
      WHERE t.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  },

  async getDriverTrips(driverId) {
    const res = await db.query(
      `SELECT 
        t.*,
        r.name AS route_name,
        s_orig.name AS origin_stop_name,
        s_dest.name AS destination_stop_name,
        v.plate_number AS vehicle_plate,
        v.model_name AS vehicle_model,
        v.vehicle_type,
        v.capacity AS vehicle_capacity,
        (SELECT COUNT(*) FROM bookings b WHERE b.trip_id = t.id AND b.status = 'CONFIRMED') AS booked_passengers_count
      FROM trips t
      JOIN routes r ON t.route_id = r.id
      JOIN stops s_orig ON r.origin_stop_id = s_orig.id
      JOIN stops s_dest ON r.destination_stop_id = s_dest.id
      JOIN vehicles v ON t.vehicle_id = v.id
      WHERE t.driver_id = $1
      ORDER BY t.departure_time ASC`,
      [driverId]
    );
    return res.rows;
  },

  async create({ routeId, vehicleId, driverId, departureTime, arrivalTime, availableSeats, fareAmount = 0.00, notes = '' }) {
    const res = await db.query(
      `INSERT INTO trips (route_id, vehicle_id, driver_id, departure_time, arrival_time, available_seats, fare_amount, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'SCHEDULED', $8)
       RETURNING *`,
      [routeId, vehicleId, driverId || null, departureTime, arrivalTime, availableSeats, fareAmount, notes]
    );
    return res.rows[0];
  },

  async update(id, { routeId, vehicleId, driverId, departureTime, arrivalTime, availableSeats, fareAmount = 0.00, status, notes = '' }) {
    const res = await db.query(
      `UPDATE trips 
       SET route_id = $1, vehicle_id = $2, driver_id = $3, departure_time = $4,
           arrival_time = $5, available_seats = $6, fare_amount = $7, status = $8, notes = $9
       WHERE id = $10
       RETURNING *`,
      [routeId, vehicleId, driverId || null, departureTime, arrivalTime, availableSeats, fareAmount, status, notes, id]
    );
    return res.rows[0] || null;
  },

  async updateStatus(id, newStatus) {
    const res = await db.query(
      `UPDATE trips SET status = $1 WHERE id = $2 RETURNING *`,
      [newStatus, id]
    );
    return res.rows[0] || null;
  },

  async delete(id) {
    const res = await db.query(`DELETE FROM trips WHERE id = $1 RETURNING id`, [id]);
    return res.rows[0] || null;
  }
};

module.exports = TripModel;
