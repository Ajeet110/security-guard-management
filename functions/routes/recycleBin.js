const express = require('express');
const { db } = require('../database/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { getLocalTimestamp } = require('../utils/dateUtils');

const router = express.Router();

// Get all deleted items (recycle bin)
router.get('/', authenticateToken, authorizeRoles('Owner', 'Manager', 'Supervisor'), (req, res) => {
  try {
    const deletedItems = db.prepare(`
      SELECT 
        d.*,
        u.name as deleted_by_name,
        u.role as deleted_by_role
      FROM deleted_items d
      JOIN users u ON d.deleted_by = u.id
      ORDER BY d.deleted_at DESC
    `).all();

    // Parse item_data JSON for each item
    const items = deletedItems.map(item => ({
      ...item,
      item_data: JSON.parse(item.item_data),
      days_remaining: Math.ceil((new Date(item.auto_delete_at) - new Date()) / (1000 * 60 * 60 * 24))
    }));

    res.json({
      items,
      total: items.length
    });
  } catch (error) {
    console.error('Get deleted items error:', error);
    res.status(500).json({ error: 'Failed to get deleted items' });
  }
});

// Recover single item
router.post('/recover/:itemId', authenticateToken, authorizeRoles('Owner', 'Manager', 'Supervisor'), (req, res) => {
  try {
    const deletedItem = db.prepare('SELECT * FROM deleted_items WHERE id = ?').get(req.params.itemId);

    if (!deletedItem) {
      return res.status(404).json({ error: 'Deleted item not found' });
    }

    const itemData = JSON.parse(deletedItem.item_data);

    // Recover based on item type
    switch (deletedItem.item_type) {
      case 'user':
        recoverUser(itemData);
        break;
      case 'attendance':
        recoverAttendance(itemData);
        break;
      case 'document':
        recoverDocument(itemData);
        break;
      default:
        return res.status(400).json({ error: 'Unknown item type' });
    }

    // Remove from deleted_items
    db.prepare('DELETE FROM deleted_items WHERE id = ?').run(req.params.itemId);

    res.json({
      message: `${deletedItem.item_type} recovered successfully`,
      recovered_by: req.user.name
    });
  } catch (error) {
    console.error('Recover item error:', error);
    res.status(500).json({ error: 'Failed to recover item' });
  }
});

// Recover all items
router.post('/recover-all', authenticateToken, authorizeRoles('Owner', 'Manager', 'Supervisor'), (req, res) => {
  try {
    const deletedItems = db.prepare('SELECT * FROM deleted_items').all();

    if (deletedItems.length === 0) {
      return res.json({ message: 'No items to recover', count: 0 });
    }

    let recovered = 0;

    deletedItems.forEach(item => {
      try {
        const itemData = JSON.parse(item.item_data);

        switch (item.item_type) {
          case 'user':
            recoverUser(itemData);
            recovered++;
            break;
          case 'attendance':
            recoverAttendance(itemData);
            recovered++;
            break;
          case 'document':
            recoverDocument(itemData);
            recovered++;
            break;
        }

        // Remove from deleted_items
        db.prepare('DELETE FROM deleted_items WHERE id = ?').run(item.id);
      } catch (err) {
        console.error(`Failed to recover item ${item.id}:`, err);
      }
    });

    res.json({
      message: `${recovered} items recovered successfully`,
      total: deletedItems.length,
      recovered: recovered,
      recovered_by: req.user.name
    });
  } catch (error) {
    console.error('Recover all error:', error);
    res.status(500).json({ error: 'Failed to recover all items' });
  }
});

// Permanently delete single item
router.delete('/permanent/:itemId', authenticateToken, authorizeRoles('Owner', 'Manager', 'Supervisor'), (req, res) => {
  try {
    const deletedItem = db.prepare('SELECT * FROM deleted_items WHERE id = ?').get(req.params.itemId);

    if (!deletedItem) {
      return res.status(404).json({ error: 'Deleted item not found' });
    }

    // Remove from deleted_items (permanent deletion)
    db.prepare('DELETE FROM deleted_items WHERE id = ?').run(req.params.itemId);

    res.json({
      message: `${deletedItem.item_type} permanently deleted`,
      deleted_by: req.user.name
    });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ error: 'Failed to permanently delete item' });
  }
});

// Empty recycle bin (delete all)
router.delete('/empty', authenticateToken, authorizeRoles('Owner', 'Manager', 'Supervisor'), (req, res) => {
  try {
    const result = db.prepare('DELETE FROM deleted_items').run();

    res.json({
      message: 'Recycle bin emptied',
      count: result.changes,
      emptied_by: req.user.name
    });
  } catch (error) {
    console.error('Empty recycle bin error:', error);
    res.status(500).json({ error: 'Failed to empty recycle bin' });
  }
});

// Helper functions to recover items
function recoverUser(userData) {
  db.prepare(`
    INSERT INTO users (id, user_id, password, name, role, parent_id, mobile, email, location, shift, profile_photo, created_by, created_at, last_seen, is_online)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userData.id,
    userData.user_id,
    userData.password,
    userData.name,
    userData.role,
    userData.parent_id,
    userData.mobile,
    userData.email,
    userData.location,
    userData.shift,
    userData.profile_photo,
    userData.created_by,
    userData.created_at,
    userData.last_seen,
    userData.is_online
  );
}

function recoverAttendance(attendanceData) {
  db.prepare(`
    INSERT INTO attendance (id, user_id, photo_path, latitude, longitude, marked_at, is_verified, is_rejected, rejection_reason, verified_by, verified_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    attendanceData.id,
    attendanceData.user_id,
    attendanceData.photo_path,
    attendanceData.latitude,
    attendanceData.longitude,
    attendanceData.marked_at,
    attendanceData.is_verified,
    attendanceData.is_rejected,
    attendanceData.rejection_reason,
    attendanceData.verified_by,
    attendanceData.verified_at
  );
}

function recoverDocument(documentData) {
  db.prepare(`
    INSERT INTO documents (id, user_id, doc_type, file_path, is_verified, is_rejected, rejection_reason, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    documentData.id,
    documentData.user_id,
    documentData.doc_type,
    documentData.file_path,
    documentData.is_verified,
    documentData.is_rejected,
    documentData.rejection_reason,
    documentData.uploaded_at
  );
}

module.exports = router;
