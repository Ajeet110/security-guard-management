/**
 * Database Initialization Script
 * Ensures database is created and seeded before server starts
 */

// Use production database in production
const dbModule = process.env.NODE_ENV === 'production'
  ? require('./database/db-production')
  : require('./database/db');

async function initialize() {
  console.log('🔄 Initializing database for', process.env.NODE_ENV || 'development');
  
  try {
    // Initialize database
    if (dbModule.initDatabase) {
      await dbModule.initDatabase();
    } else {
      dbModule.initDatabase();
    }
    
    console.log('✅ Database initialized successfully');
    
    // Verify owner account exists
    const { db } = dbModule;
    const owner = db.prepare('SELECT * FROM users WHERE user_id = ?').get('2026');
    
    if (owner) {
      console.log('✅ Owner account verified:', owner.name);
      console.log('   Login with: 2026 / owner123');
    } else {
      console.log('⚠️  Owner account not found');
    }
    
    console.log('✅ Database ready');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

initialize();
