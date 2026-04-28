const cron = require('node-cron');
const { db } = require('./database/db');

console.log('⏰ Attendance Scheduler Started');

// Schedule daily reset at midnight India time (00:00 IST = 18:30 UTC previous day)
// Run at 18:30 UTC which is 00:00 IST
cron.schedule('30 18 * * *', () => {
  console.log('🔄 Starting daily attendance reset...');
  
  try {
    // Get yesterday's date in India timezone
    const now = new Date();
    const indiaTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const yesterday = new Date(indiaTime);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];
    
    console.log(`📅 Resetting attendance for date: ${yesterdayDate}`);
    
    // Archive yesterday's verified attendance before resetting
    const verifiedRecords = db.prepare(`
      SELECT * FROM attendance 
      WHERE DATE(marked_at) = ? AND is_verified = 1
    `).all(yesterdayDate);
    
    if (verifiedRecords.length > 0) {
      console.log(`📊 Archiving ${verifiedRecords.length} verified attendance records`);
      
      // Create archive table if it doesn't exist
      db.run(`
        CREATE TABLE IF NOT EXISTS attendance_archive (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          original_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          photo_path TEXT NOT NULL,
          latitude REAL,
          longitude REAL,
          marked_at DATETIME NOT NULL,
          is_verified INTEGER DEFAULT 0,
          is_rejected INTEGER DEFAULT 0,
          rejection_reason TEXT,
          verified_by INTEGER,
          verified_at DATETIME,
          archived_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
      
      // Archive verified records
      const stmt = db.prepare(`
        INSERT INTO attendance_archive 
        (original_id, user_id, photo_path, latitude, longitude, marked_at, 
         is_verified, is_rejected, rejection_reason, verified_by, verified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const record of verifiedRecords) {
        stmt.run(
          record.id,
          record.user_id,
          record.photo_path,
          record.latitude,
          record.longitude,
          record.marked_at,
          record.is_verified,
          record.is_rejected,
          record.rejection_reason,
          record.verified_by,
          record.verified_at
        );
      }
    }
    
    // Delete all attendance records (except archived verified ones)
    const result = db.prepare('DELETE FROM attendance').run();
    console.log(`✅ Deleted ${result.changes} attendance records`);
    
    // Clean up pending photos older than 7 days
    const sevenDaysAgo = new Date(indiaTime);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoDate = sevenDaysAgo.toISOString().split('T')[0];
    
    const pendingRecords = db.prepare(`
      SELECT photo_path FROM attendance 
      WHERE DATE(marked_at) < ? AND (is_verified = 0 OR is_rejected = 1)
    `).all(sevenDaysAgoDate);
    
    console.log(`🗑️  Cleaned up ${pendingRecords.length} old pending records`);
    
    console.log('✨ Daily attendance reset complete!');
    
  } catch (error) {
    console.error('❌ Error in daily reset:', error);
  }
}, {
  timezone: "UTC"
});

// Schedule pending attendance cleanup every 6 hours
cron.schedule('0 */6 * * *', () => {
  console.log('🧹 Running pending attendance cleanup...');
  
  try {
    const now = new Date();
    const indiaTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const threeDaysAgo = new Date(indiaTime);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoDate = threeDaysAgo.toISOString().split('T')[0];
    
    // Delete pending attendance older than 3 days
    const result = db.prepare(`
      DELETE FROM attendance 
      WHERE DATE(marked_at) < ? AND is_verified = 0 AND is_rejected = 0
    `).run(threeDaysAgoDate);
    
    if (result.changes > 0) {
      console.log(`🗑️  Cleaned up ${result.changes} old pending attendance records`);
    }
    
  } catch (error) {
    console.error('❌ Error in pending cleanup:', error);
  }
}, {
  timezone: "UTC"
});

module.exports = cron;