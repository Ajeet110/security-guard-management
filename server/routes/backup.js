const express = require('express');
const path = require('path');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { 
  createBackup, 
  listBackups, 
  restoreBackup, 
  cleanOldBackups,
  getBackupStats 
} = require('../database/backup');

const router = express.Router();

// Get database path
const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../database/secureguard.db');

// List all backups (Owner only)
router.get('/list', authenticateToken, authorizeRoles('Owner'), (req, res) => {
  try {
    const backups = listBackups();
    const stats = getBackupStats();
    
    res.json({
      success: true,
      backups,
      stats
    });
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

// Create manual backup (Owner only)
router.post('/create', authenticateToken, authorizeRoles('Owner'), (req, res) => {
  try {
    const backupPath = createBackup(dbPath, 'manual');
    
    if (backupPath) {
      res.json({
        success: true,
        message: 'Backup created successfully',
        backupPath
      });
    } else {
      res.status(500).json({ error: 'Failed to create backup' });
    }
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// Restore from backup (Owner only)
router.post('/restore/:filename', authenticateToken, authorizeRoles('Owner'), (req, res) => {
  try {
    const { filename } = req.params;
    const backups = listBackups();
    const backup = backups.find(b => b.filename === filename);
    
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    const success = restoreBackup(backup.path, dbPath);
    
    if (success) {
      res.json({
        success: true,
        message: 'Database restored successfully. Please restart the server for changes to take effect.',
        restored: filename
      });
    } else {
      res.status(500).json({ error: 'Failed to restore backup' });
    }
  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

// Clean old backups (Owner only)
router.post('/clean', authenticateToken, authorizeRoles('Owner'), (req, res) => {
  try {
    const { keepCount = 10 } = req.body;
    cleanOldBackups(keepCount);
    
    res.json({
      success: true,
      message: `Old backups cleaned, kept ${keepCount} most recent`
    });
  } catch (error) {
    console.error('Clean backups error:', error);
    res.status(500).json({ error: 'Failed to clean backups' });
  }
});

// Get backup statistics (Owner only)
router.get('/stats', authenticateToken, authorizeRoles('Owner'), (req, res) => {
  try {
    const stats = getBackupStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get backup stats error:', error);
    res.status(500).json({ error: 'Failed to get backup stats' });
  }
});

// Download backup file (Owner only)
router.get('/download/:filename', authenticateToken, authorizeRoles('Owner'), (req, res) => {
  try {
    const { filename } = req.params;
    const backups = listBackups();
    const backup = backups.find(b => b.filename === filename);
    
    if (!backup) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    res.download(backup.path, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Failed to download backup' });
      }
    });
  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({ error: 'Failed to download backup' });
  }
});

module.exports = router;
