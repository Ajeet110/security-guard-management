const { db } = require('./database/db');

// Clear ALL attendance records
console.log('⚠️  WARNING: Clearing ALL attendance records...');

try {
  const result = db.prepare('DELETE FROM attendance').run();
  
  console.log(`✅ Cleared ${result.changes} attendance records`);
  console.log('📊 All attendance data has been deleted');
  
  // Verify
  const count = db.prepare('SELECT COUNT(*) as count FROM attendance').get();
  console.log(`Remaining records: ${count.count}`);
  
} catch (error) {
  console.error('❌ Error clearing attendance:', error);
}

process.exit(0);
