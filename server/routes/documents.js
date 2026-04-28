const express = require('express');
const multer = require('multer');
const path = require('path');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
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
    
    // Get document info before deleting
    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.documentId);
    
    console.log('Found document:', document);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete the document record from database
    db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.documentId);

    // Optionally delete the physical file
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', '..', document.file_path);
    
    console.log('Deleting file at:', filePath);
    
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('File deleted successfully');
      } catch (err) {
        console.error('Error deleting file:', err);
        // Continue even if file deletion fails
      }
    } else {
      console.log('File does not exist:', filePath);
    }

    res.json({ 
      message: 'Document rejected and deleted successfully',
      reason: reason 
    });
  } catch (error) {
    console.error('Reject document error:', error);
    res.status(500).json({ error: 'Failed to reject document' });
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
