const db = require('../src/config/db');

async function test() {
  console.log('Testing PostgreSQL connection...');
  console.log(`Connecting to: ${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'campus_ride_db'}`);
  
  const res = await db.testConnection();
  if (res.success) {
    console.log('Connection SUCCESSFUL!');
    console.log(`PostgreSQL Server Time: ${res.current_time}`);
    console.log(`Current Database: ${res.db_name}`);
    process.exit(0);
  } else {
    console.error('Connection FAILED:', res.error);
    console.log('\nPlease make sure your PostgreSQL service is started and .env credentials match.');
    process.exit(1);
  }
}

test();
