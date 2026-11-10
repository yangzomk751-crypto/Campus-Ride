const fs = require('fs');
const path = require('path');
const { Client, Pool } = require('pg');
require('dotenv').config();

const dbName = process.env.DB_NAME || 'campus_ride_db';
const user = process.env.DB_USER || 'postgres';
const password = process.env.DB_PASSWORD || 'postgres';
const host = process.env.DB_HOST || '127.0.0.1';
const port = parseInt(process.env.DB_PORT, 10) || 5432;

async function ensureDatabaseExists() {
  if (process.env.DATABASE_URL) {
    // If using hosted cloud URL (e.g., Supabase / Neon / Render), assume target db exists
    console.log('Connecting using provided DATABASE_URL...');
    return;
  }

  console.log(`Checking if database "${dbName}" exists on ${host}:${port}...`);
  const rootClient = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres', // Connect to default maintenance database first
  });

  try {
    await rootClient.connect();
    const res = await rootClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (res.rowCount === 0) {
      console.log(`Database "${dbName}" not found. Creating database...`);
      await rootClient.query(`CREATE DATABASE "${dbName}"`);
      console.log(`Database "${dbName}" created successfully.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } catch (err) {
    console.warn(`Note when checking database: ${err.message}`);
    console.log(`Continuing to connect to "${dbName}" directly...`);
  } finally {
    await rootClient.end().catch(() => {});
  }
}

async function runSqlFile(pool, relativeFilePath) {
  const fullPath = path.join(__dirname, '..', relativeFilePath);
  console.log(`Executing SQL script: ${relativeFilePath}...`);
  const sql = fs.readFileSync(fullPath, 'utf8');
  await pool.query(sql);
  console.log(`Successfully executed: ${relativeFilePath}`);
}

async function main() {
  console.log('========================================================');
  console.log('CAMPUS RIDE - DATABASE INITIALIZATION & MIGRATION');
  console.log('========================================================');

  try {
    await ensureDatabaseExists();

    const pool = new Pool(
      process.env.DATABASE_URL
        ? {
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
          }
        : {
            host,
            port,
            user,
            password,
            database: dbName,
          }
    );

    // Run Schema
    await runSqlFile(pool, 'sql/schema.sql');

    // Run Seeds
    await runSqlFile(pool, 'sql/seed.sql');

    // Verify row counts
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) AS users_count,
        (SELECT COUNT(*) FROM stops) AS stops_count,
        (SELECT COUNT(*) FROM routes) AS routes_count,
        (SELECT COUNT(*) FROM vehicles) AS vehicles_count,
        (SELECT COUNT(*) FROM trips) AS trips_count,
        (SELECT COUNT(*) FROM bookings) AS bookings_count
    `);

    console.log('--------------------------------------------------------');
    console.log('Database initialized and seeded successfully!');
    console.log('Summary of populated entities:');
    console.table(stats.rows[0]);
    console.log('--------------------------------------------------------');
    console.log('Default Credentials:');
    console.log('  Admin:   admin@campus.edu        / Admin@123');
    console.log('  Driver:  driver.john@campus.edu  / Driver@123');
    console.log('  Student: alice@campus.edu        / Student@123');
    console.log('========================================================');

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Database initialization failed:');
    console.error(err.message);
    console.error('\nTroubleshooting tips:');
    console.error('1. Ensure PostgreSQL service is running on your machine or port 5432.');
    console.error('2. Check DB_USER and DB_PASSWORD in .env file.');
    console.error('3. If using Windows, start PostgreSQL via Windows Services or pgAdmin.');
    console.error('4. Alternatively, set a free cloud PostgreSQL URL in .env as DATABASE_URL.');
    process.exit(1);
  }
}

main();
