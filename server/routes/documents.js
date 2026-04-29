const express = require('express');
const multer = require('multer');
const path = require('path');
const { db } = require('../database/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { getISTTimestamp } = require('../utils/dateUtils');

const router = express.Router();

// Configure multer for documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${getISTTimestamp()}-${req.user.id}-${req.body.doc_type}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files allowed'));
    }
  }
});

// Upload document
router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
  const { doc_type } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'File required' });
  }

  const validTypes = ['aadhaar', 'pan', 'police_verification', 'bank_passbook', '10th_marksheet', '12th_marksheet', 'profile_photo'];
  if (!validTypes.includes(doc_type)) {
    return res.status(400).json({ error: 'Invalid document type' });
  }

  try {
    if (doc_type === 'profile_photo') {
      db.prepare('UPDATE users SET profile_photo = ? WHERE id = ?').run(req.file.path, req.user.id);
    } else {
      // Check if document already exists
      const existing = db.prepare('SELECT id FROM documents WHERE user_id = ? AND doc_type = ?').get(req.user.id, doc_type);
      
      if (existing) {
        db.prepare('UPDATE documents SET file_path = ?, uploaded_at = CURRENT_TIMESTAMP, is_verified = 0, is_rejected = 0, rejection_reason = NULL WHERE id = ?').run(req.file.path, existing.id);
      } else {
        db.prepare('INSERT INTO documents (user_id, doc_type, file_path) VALUES (?, ?, ?)').run(req.user.id, doc_type, req.file.path);
      }
    }

    res.json({
      message: 'Document uploaded successfully',
      file_path: req.file.path
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Get user documents
router.get('/user/:userId', authenticateToken, (req, res) => {
  try {
    const documents = db.prepare(`
      SELECT id, doc_type, file_path, is_verified, is_rejected, rejection_reason, uploaded_at
      FROM documents WHERE user_id = ?
    `).all(req.params.userId);

    res.json(documents);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

// Verify document (Manager/Supervisor/Owner only)
router.post('/verify/:documentId', authenticateToken, (req, res) => {
  if (req.user.role === 'Guard') {
    return res.status(403).json({ error: 'Access denied' });
  }

  try {
    db.prepare('UPDATE documents SET is_verified = 1, is_rejected = 0, rejection_reason = NULL WHERE id = ?').run(req.params.documentId);
    res.json({ message: 'Document verified successfully' });
  } catch (error) {
    console.error('Verify document error:', error);
    res.status(500).json({ error: 'Failed to verify document' });
  }
});

// Reject document (Manager/Supervisor/Owner only)
// Note: This marks as rejected but does NOT delete - only Owner can delete
router.post('/reject/:documentId', authenticateToken, (req, res) => {
  if (req.user.role === 'Guard') {
    return res.status(403).json({ error: 'Access denied' });
  }

  const { reason } = req.body;

  if (!reason || reason.trim().length === 0) {
    return res.status(400).json({ error: 'Rejection reason is required' });
  }

  try {
    console.log('Rejecting document ID:', req.params.documentId);
    
    // Get document info
    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.documentId);
    
    console.log('Found document:', document);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Mark as rejected instead of deleting
    db.prepare(`
      UPDATE documents 
      SET is_rejected = 1, rejection_reason = ?, is_verified = 0 
      WHERE id = ?
    `).run(reason, req.params.documentId);

    res.json({ 
      message: 'Document marked as rejected',
      reason: reason,
      note: 'Document not deleted - only Owner can permanently delete documents'
    });
  } catch (error) {
    console.error('Reject document error:', error);
    res.status(500).json({ error: 'Failed to reject document' });
  }
});

// Delete document permanently - Move to recycle bin (Owner, Manager, Supervisor can delete)
router.delete('/delete/:documentId', authenticateToken, authorizeRoles('Owner', 'Manager', 'Supervisor'), (req, res) => {
  try {
    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Move to recycle bin instead of permanent delete
    const autoDeleteDate = new Date();
    autoDeleteDate.setDate(autoDeleteDate.getDate() + 30); // Auto-delete after 30 days

    db.prepare(`
      INSERT INTO deleted_items (item_type, item_id, item_data, deleted_by, auto_delete_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      'document',
      document.id,
      JSON.stringify(document),
      req.user.id,
      autoDeleteDate.toISOString()
    );

    // Delete the document record from database
    db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.documentId);

    res.json({ 
      message: 'Document moved to recycle bin',
      deleted_by: req.user.name,
      auto_delete_in_days: 30,
      note: 'Can be recovered from recycle bin within 30 days'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Update mobile number
router.post('/update-mobile', authenticateToken, (req, res) => {
  const { mobile } = req.body;

  try {
    db.prepare('UPDATE users SET mobile = ? WHERE id = ?').run(mobile, req.user.id);
    res.json({ message: 'Mobile number updated successfully' });
  } catch (error) {
    console.error('Update mobile error:', error);
    res.status(500).json({ error: 'Failed to update mobile' });
  }
});

module.exports = router;
