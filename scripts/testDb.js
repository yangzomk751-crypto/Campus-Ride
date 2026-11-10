const db = require('../config/database');

async function check() {
  console.log('Testing database connection...');
  const res = await db.testConnection();
  if (res.success) {
    console.log(`Database Connected! Server Time: ${res.current_time}, DB: ${res.db_name}`);
    process.exit(0);
  } else {
    console.error('Database connection failed:', res.error);
    process.exit(1);
  }
}

check();
