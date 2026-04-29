const { db } = require('./database/db');

// Clear all pending attendance (not verified, not rejected)
console.log('Clearing pending attendance...');

try {
  const result = db.prepare(`
    DELETE FROM attendance 
    WHERE is_verified = 0 AND is_rejected = 0
  `).run();
  
  console.log(`✅ Cleared ${result.changes} pending attendance records`);
  
  // Show remaining records
  const remaining = db.prepare('SELECT COUNT(*) as count FROM attendance').get();
  console.log(`📊 Remaining attendance records: ${remaining.count}`);
  
} catch (error) {
  console.error('❌ Error clearing attendance:', error);
}

process.exit(0);
