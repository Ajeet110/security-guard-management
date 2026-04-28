const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../database/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { addUserToRoleGroups } = require('./groups');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = file.fieldname === 'profile_photo' 
      ? 'uploads/profiles' 
      : 'uploads/documents';
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG) and PDF files are allowed'));
    }
  }
});

// Generate unique user ID (YYYYMMDDHHMM)
const generateUserId = () => {
  const now = new Date();
  return now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0');
};

// Create user
router.post('/create', authenticateToken, (req, res) => {
  const { name, role, parent_id, mobile, email, password, location, shift } = req.body;
  const creator = req.user;

  // Validate role hierarchy
  const roleHierarchy = { Owner: 4, Manager: 3, Supervisor: 2, Guard: 1 };
  
  if (roleHierarchy[creator.role] <= roleHierarchy[role]) {
    return res.status(403).json({ error: 'Cannot create user with equal or higher role' });
  }

  try {
    const userId = generateUserId();
    const userPassword = password || 'guard123';
    const hashedPassword = bcrypt.hashSync(userPassword, 10);

    const result = db.prepare(`
      INSERT INTO users (user_id, password, display_password, name, role, parent_id, mobile, email, location, shift, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, 
      hashedPassword,
      userPassword, // Store plain password for display
      name, 
      role, 
      parent_id || creator.id, 
      mobile || null, 
      email || null,
      location || null,
      shift || null,
      creator.id
    );

    const newUserId = result.lastInsertRowid;

    // Automatically add user to role-based groups
    const groupsAdded = addUserToRoleGroups(newUserId, role);

    res.json({
      message: 'User created successfully',
      user: {
        id: newUserId,
        user_id: userId,
        name,
        role,
        password: userPassword
      },
      groups_added: groupsAdded
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get hierarchy (users under current user)
router.get('/hierarchy', authenticateToken, (req, res) => {
  try {
    let users;
    
    if (req.user.role === 'Owner') {
      users = db.prepare(`
        SELECT u.id, u.user_id, u.name, u.role, u.parent_id, u.mobile, u.email, u.profile_photo, 
               u.is_online, u.last_seen, u.created_at, u.created_by, u.display_password,
               creator.name as creator_name, creator.role as creator_role
        FROM users u
        LEFT JOIN users creator ON u.created_by = creator.id
        WHERE u.id != ?
        ORDER BY u.role DESC, u.name ASC
      `).all(req.user.id);
    } else {
      // Get users under this user's hierarchy
      users = db.prepare(`
        WITH RECURSIVE hierarchy AS (
          SELECT id FROM users WHERE id = ?
          UNION ALL
          SELECT u.id FROM users u
          INNER JOIN hierarchy h ON u.parent_id = h.id
        )
        SELECT u.id, u.user_id, u.name, u.role, u.parent_id, u.mobile, u.email, 
               u.profile_photo, u.is_online, u.last_seen, u.created_at, u.created_by, u.display_password,
               creator.name as creator_name, creator.role as creator_role
        FROM users u
        LEFT JOIN users creator ON u.created_by = creator.id
        WHERE u.id IN (SELECT id FROM hierarchy) AND u.id != ?
        ORDER BY u.role DESC, u.name ASC
      `).all(req.user.id, req.user.id);
    }

    res.json(users);
  } catch (error) {
    console.error('Get hierarchy error:', error);
    res.status(500).json({ error: 'Failed to get hierarchy' });
  }
});

// Search users
router.get('/search', authenticateToken, (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Search query required' });
  }

  try {
    const users = db.prepare(`
      SELECT id, user_id, name, role, mobile, email, profile_photo, is_online, last_seen
      FROM users
      WHERE (user_id LIKE ? OR name LIKE ?) AND id != ?
      LIMIT 20
    `).all(`%${query}%`, `%${query}%`, req.user.id);

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get user profile with documents
router.get('/profile/:userId', authenticateToken, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, user_id, name, role, mobile, email, profile_photo, 
             is_online, last_seen, created_at, display_password
      FROM users WHERE id = ?
    `).get(req.params.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const documents = db.prepare(`
      SELECT doc_type, file_path, is_verified, uploaded_at
      FROM documents WHERE user_id = ?
    `).all(user.id);

    const attendance = db.prepare(`
      SELECT COUNT(*) as count FROM attendance WHERE user_id = ?
    `).get(user.id);

    res.json({
      ...user,
      documents,
      attendance_count: attendance.count,
      profile_completion: calculateProfileCompletion(user, documents)
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Get public user profile (for chat/group contexts)
router.get('/:id/profile', authenticateToken, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, name, profile_photo, role, is_online, last_seen
      FROM users WHERE id = ?
    `).get(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return only public profile fields
    res.json(user);
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Get all users with passwords (Owner only)
router.get('/all-credentials', authenticateToken, authorizeRoles('Owner'), (req, res) => {
  try {
    const users = db.prepare(`
      SELECT user_id, name, role, mobile, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();

    res.json(users);
  } catch (error) {
    console.error('Get credentials error:', error);
    res.status(500).json({ error: 'Failed to get credentials' });
  }
});

// Get user password (Owner only)
router.get('/credentials/:userId', authenticateToken, authorizeRoles('Owner'), (req, res) => {
  try {
    const user = db.prepare('SELECT user_id FROM users WHERE id = ?').get(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return a placeholder - in production, you'd implement proper password retrieval
    res.json({ password: 'guard123' });
  } catch (error) {
    console.error('Get password error:', error);
    res.status(500).json({ error: 'Failed to get password' });
  }
});

// Get statistics
router.get('/stats', authenticateToken, (req, res) => {
  try {
    let stats;

    if (req.user.role === 'Owner') {
      stats = {
        total_managers: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'Manager'").get().count,
        total_supervisors: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'Supervisor'").get().count,
        total_guards: db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'Guard'").get().count,
        active_sessions: db.prepare("SELECT COUNT(*) as count FROM users WHERE is_online = 1").get().count
      };
    } else {
      // Stats for users under hierarchy
      stats = db.prepare(`
        WITH RECURSIVE hierarchy AS (
          SELECT id FROM users WHERE id = ?
          UNION ALL
          SELECT u.id FROM users u
          INNER JOIN hierarchy h ON u.parent_id = h.id
        )
        SELECT 
          SUM(CASE WHEN role = 'Supervisor' THEN 1 ELSE 0 END) as total_supervisors,
          SUM(CASE WHEN role = 'Guard' THEN 1 ELSE 0 END) as total_guards,
          SUM(CASE WHEN is_online = 1 THEN 1 ELSE 0 END) as active_sessions
        FROM users WHERE id IN (SELECT id FROM hierarchy) AND id != ?
      `).get(req.user.id, req.user.id);
    }

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Calculate profile completion percentage
const calculateProfileCompletion = (user, documents) => {
  let completion = 0;
  const fields = ['name', 'mobile', 'email', 'profile_photo'];
  fields.forEach(field => {
    if (user[field]) completion += 12.5;
  });

  const docTypes = ['aadhaar', 'pan', 'police_verification', 'bank_passbook'];
  docTypes.forEach(type => {
    if (documents.find(d => d.doc_type === type)) completion += 12.5;
  });

  return Math.round(completion);
};

// Update user profile
router.put('/profile', authenticateToken, upload.single('profile_photo'), (req, res) => {
  const { name, mobile, email } = req.body;

  try {
    let updateQuery = 'UPDATE users SET name = ?, mobile = ?, email = ?';
    let params = [name, mobile, email];

    if (req.file) {
      updateQuery += ', profile_photo = ?';
      params.push(req.file.path);
    }

    updateQuery += ' WHERE id = ?';
    params.push(req.user.id);

    db.prepare(updateQuery).run(...params);

    const updatedUser = db.prepare(`
      SELECT id, user_id, name, role, mobile, email, profile_photo, is_online, last_seen
      FROM users WHERE id = ?
    `).get(req.user.id);

    res.json({ 
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user documents
router.get('/documents', authenticateToken, (req, res) => {
  try {
    const documents = db.prepare(`
      SELECT id, doc_type, file_path, is_verified, is_rejected, rejection_reason, uploaded_at
      FROM documents WHERE user_id = ?
      ORDER BY uploaded_at DESC
    `).all(req.user.id);

    res.json(documents);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to get documents' });
  }
});

// Upload document
router.post('/documents', authenticateToken, upload.single('document'), (req, res) => {
  const { doc_type } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  if (!['aadhaar', 'pan', 'police_verification', 'bank_passbook'].includes(doc_type)) {
    return res.status(400).json({ error: 'Invalid document type' });
  }

  try {
    // Check if document already exists
    const existing = db.prepare(`
      SELECT id FROM documents WHERE user_id = ? AND doc_type = ?
    `).get(req.user.id, doc_type);

    if (existing) {
      // Update existing document
      db.prepare(`
        UPDATE documents SET file_path = ?, is_verified = 0, is_rejected = 0, rejection_reason = NULL, uploaded_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(req.file.path, existing.id);
    } else {
      // Insert new document
      db.prepare(`
        INSERT INTO documents (user_id, doc_type, file_path, is_verified)
        VALUES (?, ?, ?, 0)
      `).run(req.user.id, doc_type, req.file.path);
    }

    res.json({ 
      message: 'Document uploaded successfully',
      doc_type,
      file_path: req.file.path
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Get all users (for group creation)
router.get('/all', authenticateToken, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, user_id, name, role, mobile, profile_photo, is_online
      FROM users
      WHERE id != ?
      ORDER BY role DESC, name ASC
    `).all(req.user.id);

    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Update user profile (legacy endpoint)
router.post('/update-profile', authenticateToken, (req, res) => {
  const { name, mobile, email } = req.body;

  try {
    db.prepare('UPDATE users SET name = ?, mobile = ?, email = ? WHERE id = ?').run(
      name,
      mobile,
      email,
      req.user.id
    );
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
