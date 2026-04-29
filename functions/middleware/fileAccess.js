const path = require('path');
const fs = require('fs');
const { db } = require('../database/db');
const { authenticateToken } = require('./auth');

/**
 * Middleware to control access to uploaded files
 * Ensures users can only access their own files or files they have permission to view
 */
const fileAccessControl = (req, res, next) => {
  try {
    const filePath = req.path;
    const fileName = path.basename(filePath);
    
    // Extract file type from path
    let fileType = 'unknown';
    if (filePath.startsWith('/uploads/attendance/')) {
      fileType = 'attendance';
    } else if (filePath.startsWith('/uploads/documents/')) {
      fileType = 'document';
    } else if (filePath.startsWith('/uploads/profiles/')) {
      fileType = 'profile';
    }

    // If no user is authenticated, deny access
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required to access files' });
    }

    // Check file ownership based on type
    switch (fileType) {
      case 'attendance':
        return checkAttendanceFileAccess(req, res, next, fileName);
      
      case 'document':
        return checkDocumentFileAccess(req, res, next, fileName);
      
      case 'profile':
        return checkProfileFileAccess(req, res, next, fileName);
      
      default:
        // For unknown file types, deny access
        return res.status(403).json({ error: 'Access denied' });
    }
  } catch (error) {
    console.error('File access control error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Check access to attendance photos
 */
function checkAttendanceFileAccess(req, res, next, fileName) {
  try {
    // Find attendance record by photo path
    const attendance = db.prepare(`
      SELECT a.*, u.parent_id, u.role as user_role
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE a.photo_path LIKE ?
    `).get(`%${fileName}`);

    if (!attendance) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if user has permission to view this attendance photo
    const hasAccess = checkUserHierarchyAccess(req.user, attendance.user_id, attendance.parent_id, attendance.user_role);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  } catch (error) {
    console.error('Attendance file access error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Check access to document files
 */
function checkDocumentFileAccess(req, res, next, fileName) {
  try {
    // Find document record by file path
    const document = db.prepare(`
      SELECT d.*, u.parent_id, u.role as user_role
      FROM documents d
      JOIN users u ON d.user_id = u.id
      WHERE d.file_path LIKE ?
    `).get(`%${fileName}`);

    if (!document) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if user has permission to view this document
    const hasAccess = checkUserHierarchyAccess(req.user, document.user_id, document.parent_id, document.user_role);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  } catch (error) {
    console.error('Document file access error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Check access to profile photos
 */
function checkProfileFileAccess(req, res, next, fileName) {
  try {
    // Find user by profile photo path
    const user = db.prepare(`
      SELECT id, parent_id, role
      FROM users
      WHERE profile_photo LIKE ?
    `).get(`%${fileName}`);

    if (!user) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if user has permission to view this profile photo
    const hasAccess = checkUserHierarchyAccess(req.user, user.id, user.parent_id, user.role);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  } catch (error) {
    console.error('Profile file access error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Check if requesting user has access to target user's files based on hierarchy
 */
function checkUserHierarchyAccess(requestingUser, targetUserId, targetParentId, targetUserRole) {
  // Users can always access their own files
  if (requestingUser.id === targetUserId) {
    return true;
  }

  // Owner can access all files
  if (requestingUser.role === 'Owner') {
    return true;
  }

  // Manager can access files of their subordinates
  if (requestingUser.role === 'Manager') {
    // Check if target user is directly under this manager
    if (targetParentId === requestingUser.id) {
      return true;
    }
    
    // Check if target user is under a supervisor who is under this manager
    if (targetUserRole === 'Guard') {
      const supervisor = db.prepare('SELECT parent_id FROM users WHERE id = ?').get(targetParentId);
      if (supervisor && supervisor.parent_id === requestingUser.id) {
        return true;
      }
    }
  }

  // Supervisor can access files of guards directly under them
  if (requestingUser.role === 'Supervisor' && targetUserRole === 'Guard') {
    return targetParentId === requestingUser.id;
  }

  return false;
}

module.exports = {
  fileAccessControl,
  checkUserHierarchyAccess
};