const app = require('./app');
const db = require('./config/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  console.log('----------------------------------------------------');
  console.log('🚀 Starting Campus Ride Transport & Booking System...');
  console.log('----------------------------------------------------');

  // Diagnostic check for PostgreSQL
  const dbStatus = await db.testConnection();
  if (dbStatus.success) {
    console.log(`✅ PostgreSQL Connected Successfully!`);
    console.log(`   Database: ${dbStatus.db_name}`);
    console.log(`   Server Timestamp: ${dbStatus.current_time}`);
  } else {
    console.warn(`⚠️ PostgreSQL Warning: Unable to connect to database.`);
    console.warn(`   Reason: ${dbStatus.error}`);
    console.warn(`   Please make sure PostgreSQL is running on port ${process.env.DB_PORT || 5432}`);
    console.warn(`   and run: npm run db:init`);
  }

  const server = app.listen(PORT, () => {
    console.log('----------------------------------------------------');
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('----------------------------------------------------');
    console.log('Default Test Accounts:');
    console.log('  Admin:   admin@campus.edu        / Admin@123');
    console.log('  Driver:  driver.john@campus.edu  / Driver@123');
    console.log('  Student: alice@campus.edu        / Student@123');
    console.log('----------------------------------------------------');
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\nGracefully shutting down Campus Ride...');
    server.close(() => {
      db.pool.end(() => {
        console.log('PostgreSQL pool closed. Bye!');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer();
