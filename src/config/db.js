const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection pool configuration
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'campus_ride_db',
      max: 20, // Max clients in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

const pool = new Pool(poolConfig);

// Handle pool errors without crashing process
pool.on('error', (err) => {
  console.error('Unexpected idle client error on PostgreSQL pool:', err.message);
});

module.exports = {
  /**
   * Execute a single query against the pool
   * @param {string} text - SQL statement with $1, $2 placeholders
   * @param {Array} params - Array of parameters
   */
  query: (text, params) => pool.query(text, params),

  /**
   * Acquire a dedicated client from the pool (essential for Transactions)
   */
  getClient: () => pool.connect(),

  /**
   * Test current PostgreSQL connection
   */
  testConnection: async () => {
    try {
      const res = await pool.query('SELECT NOW() AS current_time, current_database() AS db_name');
      return { success: true, ...res.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  pool,
};
