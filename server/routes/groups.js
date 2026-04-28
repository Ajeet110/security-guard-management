const express = require('express');
const { db } = require('../database/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Initialize default groups (called on server start or manually)
router.post('/initialize', authenticateToken, authorizeRoles('Owner'), (req, res) => {
  try {
    // Check if groups already exist
    const existingGroups = db.prepare(`
      SELECT COUNT(*) as count FROM conversations 
      WHERE name IN ('All Managers', 'All Supervisors', 'All Guards', 'Everyone')
    `).get();

    if (existingGroups.count >= 4) {
      return res.json({ message: 'Groups already initialized' });
    }

    // Get owner ID
    const owner = db.prepare("SELECT id FROM users WHERE role = 'Owner'").get();
    
    // Create groups
    const groups = [
      { name: 'All Managers', role: 'Manager' },
      { name: 'All Supervisors', role: 'Supervisor' },
      { name: 'All Guards', role: 'Guard' },
      { name: 'Everyone', role: 'All' }
    ];

    const createdGroups = [];

    groups.forEach(group => {
      // Create conversation
      const result = db.prepare(`
        INSERT INTO conversations (type, name, created_by, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run('group', group.name, owner.id);

      const conversationId = result.lastInsertRowid;

      // Add owner as admin
      db.prepare(`
        INSERT INTO conversation_participants (conversation_id, user_id, is_admin)
        VALUES (?, ?, 1)
      `).run(conversationId, owner.id);

      // Add all users of that role
      if (group.role === 'All') {
        // Add everyone (all roles)
        const allUsers = db.prepare(`
          SELECT id FROM users WHERE role IN ('Manager', 'Supervisor', 'Guard')
        `).all();

        allUsers.forEach(user => {
          db.prepare(`
            INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id, is_admin)
            VALUES (?, ?, 0)
          `).run(conversationId, user.id);
        });
      } else {
        // Add users of specific role
        const roleUsers = db.prepare(`
          SELECT id FROM users WHERE role = ?
        `).all(group.role);

        roleUsers.forEach(user => {
          db.prepare(`
            INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id, is_admin)
            VALUES (?, ?, 0)
          `).run(conversationId, user.id);
        });
      }

      createdGroups.push({
        id: conversationId,
        name: group.name,
        role: group.role
      });
    });

    res.json({
      message: 'Groups initialized successfully',
      groups: createdGroups
    });
  } catch (error) {
    console.error('Initialize groups error:', error);
    res.status(500).json({ error: 'Failed to initialize groups' });
  }
});

// Add user to role-based groups (called when user is created)
const addUserToRoleGroups = (userId, role) => {
  try {
    // Get group IDs for this role
    const groups = [];

    // Add to role-specific group
    if (role === 'Manager') {
      const managerGroup = db.prepare("SELECT id FROM conversations WHERE name = 'All Managers'").get();
      if (managerGroup) groups.push(managerGroup.id);
    } else if (role === 'Supervisor') {
      const supervisorGroup = db.prepare("SELECT id FROM conversations WHERE name = 'All Supervisors'").get();
      if (supervisorGroup) groups.push(supervisorGroup.id);
    } else if (role === 'Guard') {
      const guardGroup = db.prepare("SELECT id FROM conversations WHERE name = 'All Guards'").get();
      if (guardGroup) groups.push(guardGroup.id);
    }

    // Add to "Everyone" group
    const everyoneGroup = db.prepare("SELECT id FROM conversations WHERE name = 'Everyone'").get();
    if (everyoneGroup) groups.push(everyoneGroup.id);

    // Add user to all groups
    groups.forEach(groupId => {
      db.prepare(`
        INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id, is_admin)
        VALUES (?, ?, 0)
      `).run(groupId, userId);
    });

    return groups.length;
  } catch (error) {
    console.error('Add user to groups error:', error);
    return 0;
  }
};

// Remove user from role-based groups (called when user is deleted or role changes)
const removeUserFromRoleGroups = (userId, role) => {
  try {
    const groups = [];

    // Get role-specific group
    if (role === 'Manager') {
      const managerGroup = db.prepare("SELECT id FROM conversations WHERE name = 'All Managers'").get();
      if (managerGroup) groups.push(managerGroup.id);
    } else if (role === 'Supervisor') {
      const supervisorGroup = db.prepare("SELECT id FROM conversations WHERE name = 'All Supervisors'").get();
      if (supervisorGroup) groups.push(supervisorGroup.id);
    } else if (role === 'Guard') {
      const guardGroup = db.prepare("SELECT id FROM conversations WHERE name = 'All Guards'").get();
      if (guardGroup) groups.push(guardGroup.id);
    }

    // Get "Everyone" group
    const everyoneGroup = db.prepare("SELECT id FROM conversations WHERE name = 'Everyone'").get();
    if (everyoneGroup) groups.push(everyoneGroup.id);

    // Remove user from all groups
    groups.forEach(groupId => {
      db.prepare(`
        DELETE FROM conversation_participants 
        WHERE conversation_id = ? AND user_id = ?
      `).run(groupId, userId);
    });

    return groups.length;
  } catch (error) {
    console.error('Remove user from groups error:', error);
    return 0;
  }
};

// Get all default groups
router.get('/default', authenticateToken, (req, res) => {
  try {
    const groups = db.prepare(`
      SELECT c.id, c.name, c.created_at,
             COUNT(cp.user_id) as member_count
      FROM conversations c
      LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE c.name IN ('All Managers', 'All Supervisors', 'All Guards', 'Everyone')
      GROUP BY c.id
      ORDER BY 
        CASE c.name
          WHEN 'All Managers' THEN 1
          WHEN 'All Supervisors' THEN 2
          WHEN 'All Guards' THEN 3
          WHEN 'Everyone' THEN 4
        END
    `).all();

    res.json(groups);
  } catch (error) {
    console.error('Get default groups error:', error);
    res.status(500).json({ error: 'Failed to get groups' });
  }
});

// Sync all users to groups (in case of inconsistencies)
router.post('/sync', authenticateToken, authorizeRoles('Owner'), (req, res) => {
  try {
    // Get all groups
    const managerGroup = db.prepare("SELECT id FROM conversations WHERE name = 'All Managers'").get();
    const supervisorGroup = db.prepare("SELECT id FROM conversations WHERE name = 'All Supervisors'").get();
    const guardGroup = db.prepare("SELECT id FROM conversations WHERE name = 'All Guards'").get();
    const everyoneGroup = db.prepare("SELECT id FROM conversations WHERE name = 'Everyone'").get();

    let synced = 0;

    // Sync Managers
    if (managerGroup) {
      const managers = db.prepare("SELECT id FROM users WHERE role = 'Manager'").all();
      managers.forEach(user => {
        db.prepare(`
          INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id, is_admin)
          VALUES (?, ?, 0)
        `).run(managerGroup.id, user.id);
        synced++;
      });
    }

    // Sync Supervisors
    if (supervisorGroup) {
      const supervisors = db.prepare("SELECT id FROM users WHERE role = 'Supervisor'").all();
      supervisors.forEach(user => {
        db.prepare(`
          INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id, is_admin)
          VALUES (?, ?, 0)
        `).run(supervisorGroup.id, user.id);
        synced++;
      });
    }

    // Sync Guards
    if (guardGroup) {
      const guards = db.prepare("SELECT id FROM users WHERE role = 'Guard'").all();
      guards.forEach(user => {
        db.prepare(`
          INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id, is_admin)
          VALUES (?, ?, 0)
        `).run(guardGroup.id, user.id);
        synced++;
      });
    }

    // Sync Everyone
    if (everyoneGroup) {
      const allUsers = db.prepare(`
        SELECT id FROM users WHERE role IN ('Manager', 'Supervisor', 'Guard')
      `).all();
      allUsers.forEach(user => {
        db.prepare(`
          INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id, is_admin)
          VALUES (?, ?, 0)
        `).run(everyoneGroup.id, user.id);
        synced++;
      });
    }

    res.json({
      message: 'Groups synced successfully',
      synced_count: synced
    });
  } catch (error) {
    console.error('Sync groups error:', error);
    res.status(500).json({ error: 'Failed to sync groups' });
  }
});

module.exports = { router, addUserToRoleGroups, removeUserFromRoleGroups };
