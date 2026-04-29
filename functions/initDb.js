/**
 * Database Initialization Script
 */

const { initDatabase } = require('./database/db');

async function initialize() {
  console.log('🔄 Initializing database...');
  
  try {
    await initDatabase();
    console.log('✅ Database initialized');
    
    const { db } = require('./database/db');
    const owner = db.prepare('SELECT * FROM users WHERE user_id = ?').get('2026');
    
    if (owner) {
      console.log('✅ Owner account ready');
      console.log('   Login: 2026 / owner123');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Init failed:', error.message);
    process.exit(1);
  }
}

initialize();
