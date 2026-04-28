const express = require('express');
const { db } = require('../database/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { removeUserFromRoleGroups } = require('./groups');
const { getLocalDate, getDateDaysAgo } = require('../utils/dateUtils');

const router = express.Router();

// Update user job details (location, shift, hours)
router.put('/user/:userId/job', authenticateToken, authorizeRoles('Owner', 'Manager', 'Supervisor'), (req, res) => {
  const { userId } = req.params;
  const { location, shift, hours, mobile } = req.body;

  try {
    // Check if user has permission to update this user
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Permission check
    if (req.user.role === 'Supervisor' && targetUser.role !== 'Guard') {
      return res.status(403).json({ error: 'Supervisors can only update Guards' });
    }

    if (req.user.role === 'Manager' && targetUser.role === 'Owner') {
      return res.status(403).json({ error: 'Cannot update Owner' });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (location !== undefined) {
      updates.push('location = ?');
      params.push(location);
    }
    if (shift !== undefined) {
      updates.push('shift = ?');
      params.push(shift);
    }
    if (mobile !== undefined) {
      updates.push('mobile = ?');
      params.push(mobile);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    res.json({ message: 'User job details updated successfully' });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ error: 'Failed to update job details' });
  }
});

// Transfer user to another parent (supervisor/manager)
router.put('/user/:userId/transfer', authenticateToken, authorizeRoles('Owner', 'Manager'), (req, res) => {
  const { userId } = req.params;
  const { new_parent_id } = req.body;

  try {
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const newParent = db.prepare('SELECT * FROM users WHERE id = ?').get(new_parent_id);

    if (!targetUser || !newParent) {
      return res.status(404).json({ error: 'User or parent not found' });
    }

    // Validation: Guard can be under Supervisor or Manager
    if (targetUser.role === 'Guard' && !['Supervisor', 'Manager'].includes(newParent.role)) {
      return res.status(400).json({ error: 'Guard can only be transferred to Supervisor or Manager' });
    }

    // Validation: Supervisor can be under Manager or Owner
    if (targetUser.role === 'Supervisor' && !['Manager', 'Owner'].includes(newParent.role)) {
      return res.status(400).json({ error: 'Supervisor can only be transferred to Manager or Owner' });
    }

    // Validation: Manager can only be under Owner
    if (targetUser.role === 'Manager' && newParent.role !== 'Owner') {
      return res.status(400).json({ error: 'Manager can only be under Owner' });
    }

    db.prepare('UPDATE users SET parent_id = ? WHERE id = ?').run(new_parent_id, userId);

    res.json({ 
      message: `${targetUser.role} transferred successfully`,
      user: targetUser.name,
      new_parent: newParent.name
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Failed to transfer user' });
  }
});

// Delete user
router.delete('/user/:userId', authenticateToken, authorizeRoles('Owner', 'Manager', 'Supervisor'), (req, res) => {
  const { userId } = req.params;

  try {
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot delete owner
    if (targetUser.role === 'Owner') {
      return res.status(403).json({ error: 'Cannot delete Owner' });
    }

    // Permission check
    if (req.user.role === 'Supervisor' && targetUser.role !== 'Guard') {
      return res.status(403).json({ error: 'Supervisors can only delete Guards' });
    }

    if (req.user.role === 'Manager' && ['Owner', 'Manager'].includes(targetUser.role)) {
      return res.status(403).json({ error: 'Managers cannot delete Owners or other Managers' });
    }

    // Check if user has children
    const children = db.prepare('SELECT COUNT(*) as count FROM users WHERE parent_id = ?').get(userId);
    
    if (children.count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete user with ${children.count} subordinate(s). Transfer them first.` 
      });
    }

    // Delete user
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    // Remove from role-based groups
    removeUserFromRoleGroups(userId, targetUser.role);

    res.json({ message: `${targetUser.role} deleted successfully` });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get attendance report (Excel-like data)
router.get('/attendance/report', authenticateToken, authorizeRoles('Owner', 'Manager', 'Supervisor'), (req, res) => {
  const { start_date, end_date, user_id } = req.query;

  try {
    let query = `
      SELECT 
        u.id,
        u.user_id,
        u.name,
        u.role,
        u.location,
        u.shift,
        DATE(a.marked_at) as date,
        TIME(a.marked_at) as time,
        a.marked_at,
        a.photo_path,
        a.is_verified,
        a.is_rejected,
        a.rejection_reason
      FROM users u
      LEFT JOIN attendance a ON u.id = a.user_id
        ${start_date ? 'AND DATE(a.marked_at) >= ?' : ''}
        ${end_date ? 'AND DATE(a.marked_at) <= ?' : ''}
      WHERE u.role = 'Guard'
    `;

    const params = [];
    
    if (start_date) {
      params.push(start_date);
    }
    if (end_date) {
      params.push(end_date);
    }

    if (user_id) {
      query += ' AND u.id = ?';
      params.push(user_id);
    }

    // Filter by hierarchy
    if (req.user.role === 'Supervisor') {
      query += ' AND u.parent_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'Manager') {
      // Get all descendants
      const descendants = getDescendantIds(req.user.id);
      if (descendants.length > 0) {
        query += ` AND u.id IN (${descendants.join(',')})`;
      }
    }

    query += ' ORDER BY u.name, a.marked_at DESC';

    const records = db.prepare(query).all(...params);

    // Group by user and date
    const report = {};
    
    records.forEach(record => {
      if (!report[record.user_id]) {
        report[record.user_id] = {
          user_id: record.user_id,
          name: record.name,
          role: record.role,
          location: record.location,
          shift: record.shift,
          attendance: []
        };
      }

      if (record.date) {
        let status = 'Present';
        if (record.is_verified) {
          status = 'Verified';
        } else if (record.is_rejected) {
          status = 'Rejected';
        } else {
          status = 'Pending';
        }
        
        report[record.user_id].attendance.push({
          date: record.date,
          time: record.time,
          marked_at: record.marked_at,
          status: status,
          is_verified: record.is_verified,
          is_rejected: record.is_rejected,
          rejection_reason: record.rejection_reason
        });
      }
    });

    res.json(Object.values(report));
  } catch (error) {
    console.error('Attendance report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Get attendance statistics for graphs
router.get('/attendance/stats', authenticateToken, authorizeRoles('Owner', 'Manager', 'Supervisor'), (req, res) => {
  const { days = 7 } = req.query; // Default 7 days

  try {
    // Get date range - use centralized date utility
    const dates = [];
    for (let i = parseInt(days) - 1; i >= 0; i--) {
      dates.push(getDateDaysAgo(i));
    }

    // Get guards based on role
    let guardsQuery = 'SELECT id, name FROM users WHERE role = ?';
    const guardsParams = ['Guard'];

    if (req.user.role === 'Supervisor') {
      guardsQuery += ' AND parent_id = ?';
      guardsParams.push(req.user.id);
    } else if (req.user.role === 'Manager') {
      const descendants = getDescendantIds(req.user.id);
      if (descendants.length > 0) {
        guardsQuery += ` AND id IN (${descendants.join(',')})`;
      }
    }

    const guards = db.prepare(guardsQuery).all(...guardsParams);
    const totalGuards = guards.length;

    // Get attendance for each date
    const stats = dates.map(date => {
      const attendanceCount = db.prepare(`
        SELECT COUNT(DISTINCT user_id) as count
        FROM attendance
        WHERE DATE(marked_at) = ?
        AND user_id IN (${guards.map(g => g.id).join(',') || '0'})
      `).get(date);

      return {
        date,
        present: attendanceCount?.count || 0,
        absent: totalGuards - (attendanceCount?.count || 0),
        total: totalGuards,
        percentage: totalGuards > 0 ? Math.round(((attendanceCount?.count || 0) / totalGuards) * 100) : 0
      };
    });

    res.json({
      stats,
      total_guards: totalGuards,
      date_range: { start: dates[0], end: dates[dates.length - 1] }
    });
  } catch (error) {
    console.error('Attendance stats error:', error);
    res.status(500).json({ error: 'Failed to get attendance statistics' });
  }
});

// Helper function to get all descendant IDs
function getDescendantIds(userId) {
  const children = db.prepare('SELECT id FROM users WHERE parent_id = ?').all(userId);
  let allIds = children.map(c => c.id);
  
  children.forEach(child => {
    allIds = allIds.concat(getDescendantIds(child.id));
  });
  
  return allIds;
}

module.exports = router;
