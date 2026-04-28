/**
 * Database Initialization Script
 * Ensures database is created and seeded before server starts
 */

const { initDatabase } = require('./database/db');

async function initialize() {
  console.log('🔄 Initializing database...');
  
  try {
    await initDatabase();
    console.log('✅ Database initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initialize();
