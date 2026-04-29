const cron = require('node-cron');
const { db } = require('./database/db');

console.log('⏰ Attendance Scheduler Started');
console.log('');
console.log('🔒 DATA PROTECTION MODE: ENABLED');
console.log('📝 Scheduler Policy:');
console.log('  ✅ Users: Moved to recycle bin (30 days)');
console.log('  ✅ Attendance: Moved to recycle bin (30 days)');
console.log('  ✅ Documents: Moved to recycle bin (30 days)');
console.log('  ✅ Messages: NEVER deleted');
console.log('  ✅ Recycle bin: Auto-cleanup after 30 days');
console.log('  ✅ Recover option available');
console.log('');
console.log('💾 Database: All data preserved with recovery option');
console.log('');

// Auto-cleanup recycle bin - Delete items older than 30 days
// Runs daily at 2:00 AM IST (20:30 UTC previous day)
cron.schedule('30 20 * * *', () => {
  console.log('🗑️  Running recycle bin auto-cleanup...');
  
  try {
    const now = new Date();
    const currentTime = now.toISOString();
    
    // Find items that should be auto-deleted
    const expiredItems = db.prepare(`
      SELECT * FROM deleted_items 
      WHERE auto_delete_at <= ?
    `).all(currentTime);
    
    if (expiredItems.length > 0) {
      console.log(`📊 Found ${expiredItems.length} expired items to permanently delete`);
      
      // Delete expired items
      const result = db.prepare(`
        DELETE FROM deleted_items 
        WHERE auto_delete_at <= ?
      `).run(currentTime);
      
      console.log(`✅ Permanently deleted ${result.changes} items from recycle bin`);
      console.log(`   (Items were in recycle bin for 30+ days)`);
    } else {
      console.log('ℹ️  No expired items in recycle bin');
    }
    
  } catch (error) {
    console.error('❌ Error in recycle bin cleanup:', error);
  }
}, {
  timezone: "UTC"
});

console.log('✅ Scheduler initialized with recycle bin auto-cleanup');
console.log('⏰ Auto-cleanup runs daily at 2:00 AM IST');
console.log('⚠️  Items in recycle bin are permanently deleted after 30 days');
console.log('💡 Recover items before 30 days to prevent permanent deletion');
console.log('');

module.exports = cron;