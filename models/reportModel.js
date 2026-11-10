const db = require('../config/database');

const reportModel = {
  async create({ reporterId, reportedUserId, reportedTripId, reportType, description }) {
    const query = `
      INSERT INTO reports (reporter_id, reported_user_id, reported_trip_id, report_type, description, status)
      VALUES ($1, $2, $3, $4, $5, 'Pending')
      RETURNING *;
    `;
    const res = await db.query(query, [
      reporterId,
      reportedUserId || null,
      reportedTripId || null,
      reportType.trim(),
      description.trim(),
    ]);
    return res.rows[0];
  },

  async getAll({ status } = {}) {
    let query = `
      SELECT r.*,
             u_rep.full_name AS reporter_name, u_rep.email AS reporter_email,
             u_target.full_name AS target_user_name, u_target.email AS target_user_email,
             t.starting_location, t.destination, t.travel_date
      FROM reports r
      JOIN users u_rep ON r.reporter_id = u_rep.user_id
      LEFT JOIN users u_target ON r.reported_user_id = u_target.user_id
      LEFT JOIN trips t ON r.reported_trip_id = t.trip_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND r.status = $${params.length}`;
    }

    query += ` ORDER BY r.created_at DESC;`;
    const res = await db.query(query, params);
    return res.rows;
  },

  async updateStatus(reportId, { status, adminNotes }) {
    const query = `
      UPDATE reports
      SET status = $1, admin_notes = $2
      WHERE report_id = $3
      RETURNING *;
    `;
    const res = await db.query(query, [status, adminNotes || null, reportId]);
    return res.rows[0] || null;
  },

  async getPendingCount() {
    const res = await db.query(`SELECT COUNT(*)::int AS count FROM reports WHERE status = 'Pending';`);
    return res.rows[0].count;
  },
};

module.exports = reportModel;
