const app = require('./app');
const db = require('./config/database');

const PORT = process.env.PORT || 3000;

async function start() {
  console.log('========================================================');
  console.log('🚌 CAMPUS RIDE - COLLEGE RIDE SHARING & CAMPUS BUS SYSTEM');
  console.log('========================================================');

  const check = await db.testConnection();
  if (check.success && check.mode === 'postgresql') {
    console.log(`✅ PostgreSQL Connected Successfully! [DB: ${check.db_name}]`);
    try {
      const userCountRes = await db.pool.query('SELECT COUNT(*)::int AS count FROM users');
      if (userCountRes.rows[0].count === 0) {
        console.log('📦 Database is empty. Automatically seeding default accounts & rates...');
        const initDatabase = require('./scripts/initDatabase');
        await initDatabase();
      }
    } catch (e) {
      console.log('📦 Tables not yet created in PostgreSQL. Initializing schema & seed accounts...');
      try {
        const initDatabase = require('./scripts/initDatabase');
        await initDatabase();
      } catch (initErr) {
        console.warn('⚠️ Could not auto-initialize database:', initErr.message);
        console.warn('   Please run in your terminal: npm run db:init');
      }
    }
  } else if (check.mode === 'fallback') {
    console.log(`ℹ️ [IN-MEMORY MODE ACTIVE]`);
    console.log(`   Connected to in-memory store. Note: Data resets when nodemon restarts.`);
    console.log(`   To persist data permanently, ensure PostgreSQL is running and run: npm run db:init`);
  } else {
    console.warn(`⚠️ PostgreSQL Warning: ${check.error}`);
    console.warn('   Run: npm run db:init to initialize the database.');
  }

  const server = app.listen(PORT, () => {
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log('Pre-configured Test Accounts:');
    console.log('  Admin:          admin@sherubtse.edu.bt        / Admin@123');
    console.log('  Driver (Car):   driver.ugyen@sherubtse.edu.bt / Driver@123');
    console.log('  Driver (Bus):   driver.tashi@sherubtse.edu.bt / Driver@123');
    console.log('  Passenger:      sonam@sherubtse.edu.bt        / Student@123');
    console.log('  Passenger:      kinley@sherubtse.edu.bt       / Student@123');
    console.log('========================================================');
  });

  const shutdown = () => {
    server.close(() => {
      db.pool.end(() => {
        console.log('Server terminated cleanly.');
        process.exit(0);
      });
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
