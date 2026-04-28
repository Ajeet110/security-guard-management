const { db } = require('./database/db');

console.log('🔄 Resetting attendance data...\n');

try {
  // Get current count
  const before = db.prepare('SELECT COUNT(*) as count FROM attendance').get();
  console.log(`📊 Current attendance records: ${before.count}`);
  
  // Clear all attendance
  const result = db.prepare('DELETE FROM attendance').run();
  console.log(`✅ Deleted ${result.changes} records`);
  
  // Verify
  const after = db.prepare('SELECT COUNT(*) as count FROM attendance').get();
  console.log(`📊 Remaining records: ${after.count}`);
  
  console.log('\n✨ Attendance data reset complete!');
  console.log('👉 You can now mark fresh attendance\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

process.exit(0);
