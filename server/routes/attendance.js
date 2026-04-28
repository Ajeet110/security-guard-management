const express = require('express');
const multer = require('multer');
const path = require('path');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { getLocalTimestamp, getLocalDate } = require('../utils/dateUtils');

const router = express.Router();

// Configure multer for attendance photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/attendance/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${req.user.id}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  }
});

// Mark attendance - PHOTO IS MANDATORY
router.post('/mark', authenticateToken, upload.single('photo'), (req, res) => {
  const { latitude, longitude } = req.body;

  // Validate photo is provided
  if (!req.file) {
    return res.status(400).json({ 
      error: 'Photo is required to mark attendance',
      message: 'Please capture your selfie to mark attendance' 
    });
  }

  try {
    // Get current time in India/Delhi timezone (IST = UTC+5:30)
    const now = new Date();
    // Check if attendance already marked today (using local timezone)
    const today = getLocalDate();
    
    // Check if attendance already marked today (using India timezone)
    // Use date range for better index usage
    const startOfDay = `${today} 00:00:00`;
    const endOfDay = `${today} 23:59:59`;
    const existingAttendance = db.prepare(`
      SELECT id, is_rejected, is_verified FROM attendance 
      WHERE user_id = ? AND marked_at >= ? AND marked_at <= ?
    `).get(req.user.id, startOfDay, endOfDay);

    // If attendance exists, check status
    if (existingAttendance) {
      if (existingAttendance.is_verified) {
        return res.status(400).json({ 
          error: 'Attendance already verified',
          message: 'Your attendance has been verified for today' 
        });
      }
      
      if (existingAttendance.is_rejected) {
        // Delete old rejected record to allow re-upload
        db.prepare('DELETE FROM attendance WHERE id = ?').run(existingAttendance.id);
        // Continue to insert new record (don't return error)
      } else {
        // If pending (not verified and not rejected)
        return res.status(400).json({ 
          error: 'Attendance pending verification',
          message: 'Your attendance is pending verification. Please wait for approval.' 
        });
      }
    }

    // Insert attendance record with India timezone timestamp
    const indiaTimestamp = indiaTime.toISOString().replace('T', ' ').slice(0, 19);
    const result = db.prepare(`
      INSERT INTO attendance (user_id, photo_path, latitude, longitude, marked_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, req.file.path, latitude || null, longitude || null, indiaTimestamp);

    // Get the inserted record with full details
    const attendanceRecord = db.prepare(`
      SELECT * FROM attendance WHERE id = ?
    `).get(result.lastInsertRowid);

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      attendance: {
        id: attendanceRecord.id,
        photo_path: attendanceRecord.photo_path,
        marked_at: attendanceRecord.marked_at,
        date: new Date(attendanceRecord.marked_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
        time: new Date(attendanceRecord.marked_at).toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Asia/Kolkata'
        })
      }
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// Get my attendance records (for logged-in user)
router.get('/my', authenticateToken, (req, res) => {
  try {
    // Get last 30 days of records for better performance
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10) + ' 00:00:00';
    
    const records = db.prepare(`
      SELECT 
        id,
        photo_path,
        latitude,
        longitude,
        marked_at,
        is_verified,
        is_rejected,
        rejection_reason,
        DATE(marked_at) as date,
        TIME(marked_at) as time
      FROM attendance
      WHERE user_id = ? AND marked_at >= ?
      ORDER BY marked_at DESC
      LIMIT 30
    `).all(req.user.id, thirtyDaysAgoStr);

    console.log(`Fetching attendance for user ${req.user.id}:`, records.length, 'records');
    if (records.length > 0) {
      console.log('Sample record:', records[0]);
    }

    // Convert photo_path to photo_url for frontend
    const recordsWithUrl = records.map(record => ({
      ...record,
      photo_url: record.photo_path ? `${process.env.API_URL || 'http://localhost:5000'}${record.photo_path}` : null
    }));

    console.log('Returning records with URLs:', recordsWithUrl.length);
    if (recordsWithUrl.length > 0) {
      console.log('Sample with URL:', { date: recordsWithUrl[0].date, photo_url: recordsWithUrl[0].photo_url });
    }

    res.json(recordsWithUrl);
  } catch (error) {
    console.error('Get my attendance error:', error);
    res.status(500).json({ error: 'Failed to get attendance records' });
  }
});

// Get attendance records
router.get('/records', authenticateToken, (req, res) => {
  const { user_id, date, limit = 30 } = req.query;

  try {
    let query = `
      SELECT 
        a.*,
        u.name,
        u.user_id as guard_user_id,
        u.profile_photo,
        verifier.name as verified_by_name,
        verifier.role as verified_by_role
      FROM attendance a
      INNER JOIN users u ON a.user_id = u.id
      LEFT JOIN users verifier ON a.verified_by = verifier.id
      WHERE 1=1
    `;
    const params = [];

    if (user_id) {
      query += ' AND a.user_id = ?';
      params.push(user_id);
    } else if (req.user.role !== 'Owner') {
      // Get attendance for users under hierarchy
      query += ` AND a.user_id IN (
        WITH RECURSIVE hierarchy AS (
          SELECT id FROM users WHERE id = ?
          UNION ALL
          SELECT u.id FROM users u
          INNER JOIN hierarchy h ON u.parent_id = h.id
        )
        SELECT id FROM hierarchy
      )`;
      params.push(req.user.id);
    }

    if (date) {
      query += ' AND DATE(a.marked_at) = ?';
      params.push(date);
    }

    query += ' ORDER BY a.marked_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const records = db.prepare(query).all(...params);
    
    // Debug logging for attendance records
    console.log('📊 Attendance Records Query Results:');
    console.log('   Total records:', records.length);
    records.forEach(record => {
      console.log(`   Record ID: ${record.id}, User: ${record.name}, is_verified: ${record.is_verified} (${typeof record.is_verified}), is_rejected: ${record.is_rejected} (${typeof record.is_rejected})`);
    });
    
    res.json(records);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to get attendance records' });
  }
});

// Get today's attendance stats
router.get('/today-stats', authenticateToken, (req, res) => {
  try {
    const today = getLocalDate();
    
    let stats;
    if (req.user.role === 'Owner') {
      stats = db.prepare(`
        SELECT 
          COUNT(DISTINCT a.user_id) as present_count,
          (SELECT COUNT(*) FROM users WHERE role = 'Guard') as total_guards
        FROM attendance a
        WHERE DATE(a.marked_at) = ?
      `).get(today);
    } else {
      stats = db.prepare(`
        WITH RECURSIVE hierarchy AS (
          SELECT id FROM users WHERE id = ?
          UNION ALL
          SELECT u.id FROM users u
          INNER JOIN hierarchy h ON u.parent_id = h.id
        )
        SELECT 
          COUNT(DISTINCT a.user_id) as present_count,
          (SELECT COUNT(*) FROM users WHERE id IN (SELECT id FROM hierarchy) AND role = 'Guard') as total_guards
        FROM attendance a
        WHERE DATE(a.marked_at) = ? AND a.user_id IN (SELECT id FROM hierarchy)
      `).get(req.user.id, today);
    }

    res.json(stats);
  } catch (error) {
    console.error('Get today stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get monthly attendance statistics for dashboard graphs
router.get('/monthly-stats', authenticateToken, (req, res) => {
  try {
    const { month, year, user_id } = req.query;
    const currentDate = new Date();
    const targetMonth = month || (currentDate.getMonth() + 1);
    const targetYear = year || currentDate.getFullYear();
    
    // Get days in month
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    
    let query, params;
    
    if (user_id) {
      // Get stats for specific user
      query = `
        SELECT 
          DATE(marked_at) as date,
          COUNT(*) as count
        FROM attendance
        WHERE user_id = ?
          AND strftime('%Y', marked_at) = ?
          AND strftime('%m', marked_at) = ?
        GROUP BY DATE(marked_at)
      `;
      params = [user_id, targetYear.toString(), targetMonth.toString().padStart(2, '0')];
    } else if (req.user.role === 'Owner') {
      // Owner sees all guards
      query = `
        SELECT 
          DATE(marked_at) as date,
          COUNT(DISTINCT user_id) as count,
          (SELECT COUNT(*) FROM users WHERE role = 'Guard') as total_guards
        FROM attendance
        WHERE strftime('%Y', marked_at) = ?
          AND strftime('%m', marked_at) = ?
        GROUP BY DATE(marked_at)
      `;
      params = [targetYear.toString(), targetMonth.toString().padStart(2, '0')];
    } else {
      // Manager/Supervisor sees their hierarchy
      query = `
        WITH RECURSIVE hierarchy AS (
          SELECT id FROM users WHERE id = ?
          UNION ALL
          SELECT u.id FROM users u
          INNER JOIN hierarchy h ON u.parent_id = h.id
        )
        SELECT 
          DATE(marked_at) as date,
          COUNT(DISTINCT user_id) as count,
          (SELECT COUNT(*) FROM users WHERE id IN (SELECT id FROM hierarchy) AND role = 'Guard') as total_guards
        FROM attendance
        WHERE user_id IN (SELECT id FROM hierarchy WHERE id IN (SELECT id FROM users WHERE role = 'Guard'))
          AND strftime('%Y', marked_at) = ?
          AND strftime('%m', marked_at) = ?
        GROUP BY DATE(marked_at)
      `;
      params = [req.user.id, targetYear.toString(), targetMonth.toString().padStart(2, '0')];
    }
    
    const records = db.prepare(query).all(...params);
    
    // Create array for all days in month
    const monthData = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${targetYear}-${targetMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const record = records.find(r => r.date === dateStr);
      
      monthData.push({
        date: dateStr,
        day: day,
        present: record ? record.count : 0,
        absent: record && record.total_guards ? (record.total_guards - record.count) : 0,
        total: record ? record.total_guards : 0
      });
    }
    
    // Calculate summary
    const totalPresent = monthData.reduce((sum, day) => sum + day.present, 0);
    const totalAbsent = monthData.reduce((sum, day) => sum + day.absent, 0);
    
    res.json({
      month: targetMonth,
      year: targetYear,
      daysInMonth,
      dailyStats: monthData,
      summary: {
        totalPresent,
        totalAbsent,
        attendanceRate: totalPresent + totalAbsent > 0 
          ? Math.round((totalPresent / (totalPresent + totalAbsent)) * 100) 
          : 0
      }
    });
  } catch (error) {
    console.error('Get monthly stats error:', error);
    res.status(500).json({ error: 'Failed to get monthly stats' });
  }
});

// Get user-wise attendance for a specific period
router.get('/user-wise-stats', authenticateToken, (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    // Use centralized date utility - default to current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const year = firstDayOfMonth.getFullYear();
    const month = String(firstDayOfMonth.getMonth() + 1).padStart(2, '0');
    const day = String(firstDayOfMonth.getDate()).padStart(2, '0');
    const defaultStartDate = `${year}-${month}-${day}`;
    
    const startDate = start_date || defaultStartDate;
    const endDate = end_date || getLocalDate();
    
    let query, params;
    
    if (req.user.role === 'Owner') {
      query = `
        SELECT 
          u.id,
          u.user_id,
          u.name,
          u.role,
          u.profile_photo,
          COUNT(DISTINCT DATE(a.marked_at)) as present_days,
          (SELECT COUNT(DISTINCT DATE(marked_at)) FROM attendance WHERE DATE(marked_at) BETWEEN ? AND ?) as total_working_days
        FROM users u
        LEFT JOIN attendance a ON u.id = a.user_id AND DATE(a.marked_at) BETWEEN ? AND ?
        WHERE u.role = 'Guard'
        GROUP BY u.id
        ORDER BY present_days DESC
      `;
      params = [startDate, endDate, startDate, endDate];
    } else {
      query = `
        WITH RECURSIVE hierarchy AS (
          SELECT id FROM users WHERE id = ?
          UNION ALL
          SELECT u.id FROM users u
          INNER JOIN hierarchy h ON u.parent_id = h.id
        )
        SELECT 
          u.id,
          u.user_id,
          u.name,
          u.role,
          u.profile_photo,
          COUNT(DISTINCT DATE(a.marked_at)) as present_days,
          (SELECT COUNT(DISTINCT DATE(marked_at)) FROM attendance WHERE user_id IN (SELECT id FROM hierarchy) AND DATE(marked_at) BETWEEN ? AND ?) as total_working_days
        FROM users u
        LEFT JOIN attendance a ON u.id = a.user_id AND DATE(a.marked_at) BETWEEN ? AND ?
        WHERE u.id IN (SELECT id FROM hierarchy) AND u.role = 'Guard'
        GROUP BY u.id
        ORDER BY present_days DESC
      `;
      params = [req.user.id, startDate, endDate, startDate, endDate];
    }
    
    const stats = db.prepare(query).all(...params);
    
    // Calculate attendance percentage for each user
    const workingDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
    
    const enrichedStats = stats.map(user => ({
      ...user,
      absent_days: workingDays - user.present_days,
      attendance_rate: workingDays > 0 ? Math.round((user.present_days / workingDays) * 100) : 0,
      total_days: workingDays
    }));
    
    res.json({
      start_date: startDate,
      end_date: endDate,
      total_days: workingDays,
      users: enrichedStats
    });
  } catch (error) {
    console.error('Get user-wise stats error:', error);
    res.status(500).json({ error: 'Failed to get user-wise stats' });
  }
});

// Verify attendance (Owner, Manager, Supervisor only)
router.post('/verify/:attendanceId', authenticateToken, (req, res) => {
  try {
    // Check if user has permission
    if (!['Owner', 'Manager', 'Supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Owner, Manager, or Supervisor can verify attendance' });
    }

    const { attendanceId } = req.params;
    
    // Get attendance record
    const attendance = db.prepare(`
      SELECT a.*, u.name, u.role, u.parent_id
      FROM attendance a
      INNER JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `).get(attendanceId);

    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    // Check hierarchy permission
    if (req.user.role === 'Supervisor' && attendance.parent_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only verify attendance of your direct guards' });
    }

    // Verify attendance - use centralized local timestamp
    const localTimestamp = getLocalTimestamp();
    
    db.prepare(`
      UPDATE attendance 
      SET is_verified = 1, 
          is_rejected = 0,
          rejection_reason = NULL,
          verified_by = ?,
          verified_at = ?
      WHERE id = ?
    `).run(req.user.id, localTimestamp, attendanceId);

    res.json({ 
      message: 'Attendance verified successfully',
      verified_by: req.user.name
    });
  } catch (error) {
    console.error('Verify attendance error:', error);
    res.status(500).json({ error: 'Failed to verify attendance' });
  }
});

// Reject attendance (Owner, Manager, Supervisor only)
router.post('/reject/:attendanceId', authenticateToken, (req, res) => {
  try {
    // Check if user has permission
    if (!['Owner', 'Manager', 'Supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Owner, Manager, or Supervisor can reject attendance' });
    }

    const { attendanceId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Get attendance record
    const attendance = db.prepare(`
      SELECT a.*, u.name, u.role, u.parent_id
      FROM attendance a
      INNER JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `).get(attendanceId);

    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    // Check hierarchy permission
    if (req.user.role === 'Supervisor' && attendance.parent_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only reject attendance of your direct guards' });
    }

    // Reject attendance - use centralized local timestamp
    const localTimestamp = getLocalTimestamp();
    
    db.prepare(`
      UPDATE attendance 
      SET is_rejected = 1,
          is_verified = 0,
          rejection_reason = ?,
          verified_by = ?,
          verified_at = ?
      WHERE id = ?
    `).run(reason, req.user.id, localTimestamp, attendanceId);

    res.json({ 
      message: 'Attendance rejected successfully',
      rejected_by: req.user.name
    });
  } catch (error) {
    console.error('Reject attendance error:', error);
    res.status(500).json({ error: 'Failed to reject attendance' });
  }
});

// Verify all pending attendance for a date
router.post('/verify-all', authenticateToken, (req, res) => {
  try {
    // Check if user has permission
    if (!['Owner', 'Manager', 'Supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Owner, Manager, or Supervisor can verify attendance' });
    }

    const { date } = req.body;
    const targetDate = date || getLocalDate();

    // Get pending attendance records based on role
    let query = `
      SELECT a.id, u.parent_id
      FROM attendance a
      INNER JOIN users u ON a.user_id = u.id
      WHERE DATE(a.marked_at) = ?
        AND a.is_verified = 0
        AND a.is_rejected = 0
        AND u.role = 'Guard'
    `;
    const params = [targetDate];

    if (req.user.role === 'Supervisor') {
      query += ' AND u.parent_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'Manager') {
      // Get all guards under manager's hierarchy
      const descendants = getDescendantIds(req.user.id);
      if (descendants.length > 0) {
        query += ` AND u.id IN (${descendants.join(',')})`;
      }
    }

    const pendingRecords = db.prepare(query).all(...params);

    if (pendingRecords.length === 0) {
      return res.json({ message: 'No pending attendance to verify', count: 0 });
    }

    // Verify all - use centralized local timestamp
    const localTimestamp = getLocalTimestamp();
    
    pendingRecords.forEach(record => {
      db.prepare(`
        UPDATE attendance 
        SET is_verified = 1,
            verified_by = ?,
            verified_at = ?
        WHERE id = ?
      `).run(req.user.id, localTimestamp, record.id);
    });

    res.json({ 
      message: `${pendingRecords.length} attendance records verified successfully`,
      count: pendingRecords.length,
      verified_by: req.user.name
    });
  } catch (error) {
    console.error('Verify all error:', error);
    res.status(500).json({ error: 'Failed to verify all attendance' });
  }
});

// Reject all pending attendance for a date
router.post('/reject-all', authenticateToken, (req, res) => {
  try {
    // Check if user has permission
    if (!['Owner', 'Manager', 'Supervisor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only Owner, Manager, or Supervisor can reject attendance' });
    }

    const { date, reason } = req.body;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const targetDate = date || getLocalDate();

    // Get pending attendance records based on role
    let query = `
      SELECT a.id, u.parent_id
      FROM attendance a
      INNER JOIN users u ON a.user_id = u.id
      WHERE DATE(a.marked_at) = ?
        AND a.is_verified = 0
        AND a.is_rejected = 0
        AND u.role = 'Guard'
    `;
    const params = [targetDate];

    if (req.user.role === 'Supervisor') {
      query += ' AND u.parent_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'Manager') {
      const descendants = getDescendantIds(req.user.id);
      if (descendants.length > 0) {
        query += ` AND u.id IN (${descendants.join(',')})`;
      }
    }

    const pendingRecords = db.prepare(query).all(...params);

    if (pendingRecords.length === 0) {
      return res.json({ message: 'No pending attendance to reject', count: 0 });
    }

    // Reject all - use centralized local timestamp
    const localTimestamp = getLocalTimestamp();
    
    pendingRecords.forEach(record => {
      db.prepare(`
        UPDATE attendance 
        SET is_rejected = 1,
            rejection_reason = ?,
            verified_by = ?,
            verified_at = ?
        WHERE id = ?
      `).run(reason, req.user.id, localTimestamp, record.id);
    });

    res.json({ 
      message: `${pendingRecords.length} attendance records rejected`,
      count: pendingRecords.length,
      rejected_by: req.user.name
    });
  } catch (error) {
    console.error('Reject all error:', error);
    res.status(500).json({ error: 'Failed to reject all attendance' });
  }
});

// Helper function to get descendant IDs
function getDescendantIds(userId) {
  const children = db.prepare('SELECT id FROM users WHERE parent_id = ?').all(userId);
  let allIds = children.map(c => c.id);
  
  children.forEach(child => {
    allIds = allIds.concat(getDescendantIds(child.id));
  });
  
  return allIds;
}

module.exports = router;
