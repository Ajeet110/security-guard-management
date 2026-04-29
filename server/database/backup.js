const fs = require('fs');
const path = require('path');

// Backup directory
const backupDir = process.env.BACKUP_DIR || path.join(__dirname, 'backups');

// Ensure backup directory exists
const ensureBackupDir = () => {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`📁 Created backup directory: ${backupDir}`);
  }
};

// Create backup of database file
const createBackup = (dbPath, reason = 'manual') => {
  try {
    ensureBackupDir();

    // Check if database file exists
    if (!fs.existsSync(dbPath)) {
      console.log('⚠️ No database file to backup');
      return null;
    }

    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `secureguard_${reason}_${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFilename);

    // Copy database file to backup
    fs.copyFileSync(dbPath, backupPath);
    
    const stats = fs.statSync(backupPath);
    console.log(`✅ Database backup created: ${backupFilename} (${stats.size} bytes)`);
    
    return backupPath;
  } catch (error) {
    console.error('❌ Failed to create backup:', error.message);
    return null;
  }
};

// List all backups
const listBackups = () => {
  try {
    ensureBackupDir();
    
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .map(f => {
        const filePath = path.join(backupDir, f);
        const stats = fs.statSync(filePath);
        return {
          filename: f,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.created - a.created); // Newest first
    
    return files;
  } catch (error) {
    console.error('❌ Failed to list backups:', error.message);
    return [];
  }
};

// Restore database from backup
const restoreBackup = (backupPath, dbPath) => {
  try {
    if (!fs.existsSync(backupPath)) {
      console.error('❌ Backup file not found:', backupPath);
      return false;
    }

    // Create backup of current database before restoring
    if (fs.existsSync(dbPath)) {
      const currentBackup = createBackup(dbPath, 'before-restore');
      console.log(`📦 Current database backed up before restore: ${currentBackup}`);
    }

    // Copy backup file to database location
    fs.copyFileSync(backupPath, dbPath);
    console.log(`✅ Database restored from: ${backupPath}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to restore backup:', error.message);
    return false;
  }
};

// Clean old backups (keep last N backups)
const cleanOldBackups = (keepCount = 10) => {
  try {
    const backups = listBackups();
    
    if (backups.length <= keepCount) {
      console.log(`ℹ️ Only ${backups.length} backups, no cleanup needed`);
      return;
    }

    // Delete old backups
    const toDelete = backups.slice(keepCount);
    let deletedCount = 0;
    
    toDelete.forEach(backup => {
      try {
        fs.unlinkSync(backup.path);
        deletedCount++;
      } catch (err) {
        console.error(`❌ Failed to delete backup ${backup.filename}:`, err.message);
      }
    });

    console.log(`🗑️ Cleaned ${deletedCount} old backups (kept ${keepCount} most recent)`);
  } catch (error) {
    console.error('❌ Failed to clean old backups:', error.message);
  }
};

// Get backup statistics
const getBackupStats = () => {
  const backups = listBackups();
  
  if (backups.length === 0) {
    return {
      count: 0,
      totalSize: 0,
      oldest: null,
      newest: null
    };
  }

  const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
  
  return {
    count: backups.length,
    totalSize,
    totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
    oldest: backups[backups.length - 1],
    newest: backups[0]
  };
};

module.exports = {
  createBackup,
  listBackups,
  restoreBackup,
  cleanOldBackups,
  getBackupStats,
  backupDir
};
