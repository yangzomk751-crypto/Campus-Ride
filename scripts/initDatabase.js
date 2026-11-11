const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function initDatabase() {
  console.log('========================================================');
  console.log('📦 SHERUBTSE CAMPUS RIDE - DATABASE INITIALIZATION');
  console.log('========================================================');

  const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
  const seedPath = path.join(__dirname, '..', 'sql', 'seed.sql');

  if (process.env.DATABASE_URL) {
    const isRemote =
      !process.env.DATABASE_URL.includes('localhost') &&
      !process.env.DATABASE_URL.includes('127.0.0.1');

    console.log('Connecting using DATABASE_URL...');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: isRemote || process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    try {
      await client.connect();
      console.log('✅ Connected to target cloud database.');

      console.log('Executing schema.sql...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('✅ Tables created successfully (schema.sql executed).');

      console.log('Executing seed.sql...');
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await client.query(seedSql);
      console.log('✅ Seed data inserted successfully (all 20 Dzongkhag fare rates, users, drivers, vehicles).');

      console.log('\n========================================================');
      console.log('🎉 DATABASE INITIALIZATION COMPLETE!');
      console.log('Ready to run: npm start');
      console.log('========================================================');
    } catch (err) {
      console.error('❌ Error executing database script:', err.message);
    } finally {
      try {
        await client.end();
      } catch (_) {}
    }
    return;
  }

  // Local connection with DB_HOST, DB_USER, etc.
  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };

  const targetDbName = process.env.DB_NAME || 'campus_ride_db';

  // 1. Connect to default postgres DB to verify / create target database
  const maintenanceClient = new Client({
    ...dbConfig,
    database: 'postgres',
  });

  try {
    console.log(`Connecting to PostgreSQL server at ${dbConfig.host}:${dbConfig.port}...`);
    await maintenanceClient.connect();
    console.log('Connected to default PostgreSQL database.');

    const checkDbRes = await maintenanceClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDbName]
    );

    if (checkDbRes.rowCount === 0) {
      console.log(`Creating database "${targetDbName}"...`);
      await maintenanceClient.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`✅ Database "${targetDbName}" created successfully.`);
    } else {
      console.log(`Database "${targetDbName}" already exists.`);
    }
  } catch (err) {
    console.warn(`Note: Could not run maintenance client: ${err.message}`);
  } finally {
    try {
      await maintenanceClient.end();
    } catch (_) {}
  }

  // 2. Connect to target database and execute schema.sql & seed.sql
  const targetClient = new Client({
    ...dbConfig,
    database: targetDbName,
  });

  try {
    await targetClient.connect();
    console.log(`Connected to target database "${targetDbName}".`);

    console.log('Executing schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await targetClient.query(schemaSql);
    console.log('✅ Tables created successfully (schema.sql executed).');

    console.log('Executing seed.sql...');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await targetClient.query(seedSql);
    console.log('✅ Seed data inserted successfully (all 20 Dzongkhag fare rates, users, drivers, vehicles).');

    console.log('\n========================================================');
    console.log('🎉 DATABASE INITIALIZATION COMPLETE!');
    console.log('Ready to run: npm start');
    console.log('========================================================');
  } catch (err) {
    console.error('❌ Error executing database script:', err.message);
  } finally {
    try {
      await targetClient.end();
    } catch (_) {}
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = initDatabase;
