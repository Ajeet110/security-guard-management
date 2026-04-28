const express = require('express');
const { db } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get conversations for current user
router.get('/conversations', authenticateToken, (req, res) => {
  try {
    const conversations = db.prepare(`
      SELECT DISTINCT c.id, c.type, c.name, c.created_at,
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY sent_at DESC LIMIT 1) as last_message,
        (SELECT sent_at FROM messages WHERE conversation_id = c.id ORDER BY sent_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM messages m 
         LEFT JOIN message_status ms ON m.id = ms.message_id AND ms.user_id = ?
         WHERE m.conversation_id = c.id AND m.sender_id != ? AND (ms.status IS NULL OR ms.status != 'read')) as unread_count
      FROM conversations c
      INNER JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE cp.user_id = ?
      ORDER BY last_message_time DESC
    `).all(req.user.id, req.user.id, req.user.id);

    // Get participants for each conversation
    conversations.forEach(conv => {
      conv.participants = db.prepare(`
        SELECT u.id, u.user_id, u.name, u.profile_photo, u.is_online, u.last_seen, cp.is_admin
        FROM conversation_participants cp
        INNER JOIN users u ON cp.user_id = u.id
        WHERE cp.conversation_id = ?
      `).all(conv.id);
    });

    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Create or get personal conversation
router.post('/conversation/personal', authenticateToken, (req, res) => {
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID required' });
  }

  if (user_id === req.user.id) {
    return res.status(400).json({ error: 'Cannot create conversation with yourself' });
  }

  try {
    // Check if conversation already exists
    const existing = db.prepare(`
      SELECT c.id FROM conversations c
      INNER JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
      INNER JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
      WHERE c.type = 'personal' AND cp1.user_id = ? AND cp2.user_id = ?
    `).get(req.user.id, user_id);

    if (existing) {
      return res.json({ conversation_id: existing.id, existing: true });
    }

    // Create new conversation
    const result = db.prepare(`
      INSERT INTO conversations (type, created_by) VALUES ('personal', ?)
    `).run(req.user.id);

    const conversationId = result.lastInsertRowid;

    if (!conversationId) {
      throw new Error('Failed to get conversation ID');
    }

    // Add participants
    db.prepare(`
      INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)
    `).run(conversationId, req.user.id);

    db.prepare(`
      INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)
    `).run(conversationId, user_id);

    res.json({ conversation_id: conversationId, existing: false });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation: ' + error.message });
  }
});

// Create group conversation
router.post('/conversation/group', authenticateToken, (req, res) => {
  const { name, participant_ids } = req.body;

  if (!name || !participant_ids || participant_ids.length < 2) {
    return res.status(400).json({ error: 'Group name and at least 2 participants required' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO conversations (type, name, created_by) VALUES ('group', ?, ?)
    `).run(name, req.user.id);

    const conversationId = result.lastInsertRowid;

    if (!conversationId) {
      throw new Error('Failed to get conversation ID');
    }

    // Add creator as admin
    db.prepare(`
      INSERT INTO conversation_participants (conversation_id, user_id, is_admin) VALUES (?, ?, 1)
    `).run(conversationId, req.user.id);

    // Add other participants (avoid duplicates)
    const uniqueParticipants = [...new Set(participant_ids)].filter(id => id !== req.user.id);
    
    uniqueParticipants.forEach(userId => {
      db.prepare(`
        INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)
      `).run(conversationId, userId);
    });

    res.json({ conversation_id: conversationId });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Failed to create group: ' + error.message });
  }
});

// Get messages for conversation
router.get('/messages/:conversationId', authenticateToken, (req, res) => {
  const { conversationId } = req.params;
  const { limit = 50, before } = req.query;

  try {
    // Verify user is participant
    const participant = db.prepare(`
      SELECT * FROM conversation_participants WHERE conversation_id = ? AND user_id = ?
    `).get(conversationId, req.user.id);

    if (!participant) {
      return res.status(403).json({ error: 'Not a participant' });
    }

    let query = `
      SELECT m.id, m.content, m.reply_to, m.sent_at, m.sender_id,
        u.name as sender_name, u.profile_photo as sender_photo,
        rm.id as reply_to_id, rm.content as reply_to_content,
        rm.sender_id as reply_to_sender_id, ru.name as reply_to_sender_name
      FROM messages m
      INNER JOIN users u ON m.sender_id = u.id
      LEFT JOIN messages rm ON m.reply_to = rm.id
      LEFT JOIN users ru ON rm.sender_id = ru.id
      LEFT JOIN message_deletions md ON m.id = md.message_id AND md.user_id = ?
      WHERE m.conversation_id = ? AND md.id IS NULL
    `;

    const params = [req.user.id, conversationId];

    if (before) {
      query += ' AND m.id < ?';
      params.push(before);
    }

    query += ' ORDER BY m.sent_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const messages = db.prepare(query).all(...params);

    // Get status for each message and build reply_to_message object
    messages.forEach(msg => {
      msg.status = db.prepare(`
        SELECT user_id, status, updated_at FROM message_status WHERE message_id = ?
      `).all(msg.id);

      // Build reply_to_message object if reply exists
      if (msg.reply_to && msg.reply_to_id) {
        msg.reply_to_message = {
          id: msg.reply_to_id,
          content: msg.reply_to_content,
          sender_id: msg.reply_to_sender_id,
          sender_name: msg.reply_to_sender_name
        };
      } else {
        msg.reply_to_message = null;
      }

      // Clean up temporary fields
      delete msg.reply_to_id;
      delete msg.reply_to_content;
      delete msg.reply_to_sender_id;
      delete msg.reply_to_sender_name;
    });

    res.json(messages.reverse());
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Send message
router.post('/message', authenticateToken, (req, res) => {
  const { conversation_id, content, reply_to } = req.body;

  try {
    const result = db.prepare(`
      INSERT INTO messages (conversation_id, sender_id, content, reply_to)
      VALUES (?, ?, ?, ?)
    `).run(conversation_id, req.user.id, content, reply_to || null);

    const messageId = result.lastInsertRowid;

    // Get all participants except sender
    const participants = db.prepare(`
      SELECT user_id FROM conversation_participants 
      WHERE conversation_id = ? AND user_id != ?
    `).all(conversation_id, req.user.id);

    // Create status records
    participants.forEach(p => {
      db.prepare(`
        INSERT INTO message_status (message_id, user_id, status) VALUES (?, ?, 'sent')
      `).run(messageId, p.user_id);
    });

    const message = db.prepare(`
      SELECT m.*, u.name as sender_name, u.profile_photo as sender_photo
      FROM messages m
      INNER JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?
    `).get(messageId);

    res.json(message);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
router.post('/messages/read', authenticateToken, (req, res) => {
  const { message_ids } = req.body;

  try {
    message_ids.forEach(msgId => {
      db.prepare(`
        INSERT OR REPLACE INTO message_status (message_id, user_id, status, updated_at)
        VALUES (?, ?, 'read', CURRENT_TIMESTAMP)
      `).run(msgId, req.user.id);
    });

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Send message reply
router.post('/message/reply', authenticateToken, (req, res) => {
  const { conversation_id, content, reply_to } = req.body;

  try {
    // Validate required fields
    if (!conversation_id || !content || !reply_to) {
      return res.status(400).json({ error: 'conversation_id, content, and reply_to are required' });
    }

    // Verify user is a participant in the conversation
    const participant = db.prepare(`
      SELECT * FROM conversation_participants WHERE conversation_id = ? AND user_id = ?
    `).get(conversation_id, req.user.id);

    if (!participant) {
      return res.status(403).json({ error: 'You are not a member of this conversation' });
    }

    // Validate that reply_to message exists and belongs to same conversation
    const replyToMessage = db.prepare(`
      SELECT id, conversation_id FROM messages WHERE id = ?
    `).get(reply_to);

    if (!replyToMessage) {
      return res.status(400).json({ error: 'Referenced message not found' });
    }

    if (replyToMessage.conversation_id !== conversation_id) {
      return res.status(400).json({ error: 'Referenced message not found in this conversation' });
    }

    // Insert message into messages table with reply_to reference
    const result = db.prepare(`
      INSERT INTO messages (conversation_id, sender_id, content, reply_to)
      VALUES (?, ?, ?, ?)
    `).run(conversation_id, req.user.id, content, reply_to);

    const messageId = result.lastInsertRowid;

    // Get all participants except sender
    const participants = db.prepare(`
      SELECT user_id FROM conversation_participants 
      WHERE conversation_id = ? AND user_id != ?
    `).all(conversation_id, req.user.id);

    // Create message_status records for all participants
    participants.forEach(p => {
      db.prepare(`
        INSERT INTO message_status (message_id, user_id, status) VALUES (?, ?, 'sent')
      `).run(messageId, p.user_id);
    });

    // Get created message with reply metadata populated
    const message = db.prepare(`
      SELECT m.*, u.name as sender_name, u.profile_photo as sender_photo,
        rm.content as reply_to_content, rm.sender_id as reply_to_sender_id,
        ru.name as reply_to_sender_name
      FROM messages m
      INNER JOIN users u ON m.sender_id = u.id
      LEFT JOIN messages rm ON m.reply_to = rm.id
      LEFT JOIN users ru ON rm.sender_id = ru.id
      WHERE m.id = ?
    `).get(messageId);

    // Emit Socket.io event 'new_message' with reply metadata
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${conversation_id}`).emit('new_message', message);
    }

    // Return created message object with reply reference
    res.json(message);
  } catch (error) {
    console.error('Send reply error:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
});

// Get conversation info with member details
router.get('/conversation/:id/info', authenticateToken, (req, res) => {
  const { id } = req.params;

  try {
    // Verify user is a participant
    const participant = db.prepare(`
      SELECT * FROM conversation_participants WHERE conversation_id = ? AND user_id = ?
    `).get(id, req.user.id);

    if (!participant) {
      return res.status(403).json({ error: 'You are not a member of this conversation' });
    }

    // Get conversation details
    const conversation = db.prepare(`
      SELECT id, type, name, description, created_at
      FROM conversations
      WHERE id = ?
    `).get(id);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get member list with online status (filter out sensitive fields)
    const members = db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.profile_photo,
        u.role,
        u.is_online,
        u.last_seen,
        cp.is_admin,
        cp.joined_at
      FROM conversation_participants cp
      INNER JOIN users u ON cp.user_id = u.id
      WHERE cp.conversation_id = ?
      ORDER BY cp.is_admin DESC, u.name ASC
    `).all(id);

    // Calculate member counts
    const member_count = members.length;
    const online_count = members.filter(m => m.is_online).length;

    // Build response
    const response = {
      id: conversation.id,
      name: conversation.name,
      description: conversation.description,
      type: conversation.type,
      created_at: conversation.created_at,
      member_count: member_count,
      online_count: online_count,
      members: members
    };

    res.json(response);
  } catch (error) {
    console.error('Get conversation info error:', error);
    res.status(500).json({ error: 'Failed to get conversation info' });
  }
});

// Update conversation description
router.put('/conversation/:id/description', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { description } = req.body;

  try {
    // Validate description length
    if (description && description.length > 500) {
      return res.status(400).json({ error: 'Description must be 500 characters or less' });
    }

    // Verify user is a participant
    const participant = db.prepare(`
      SELECT * FROM conversation_participants WHERE conversation_id = ? AND user_id = ?
    `).get(id, req.user.id);

    if (!participant) {
      return res.status(403).json({ error: 'You are not a member of this conversation' });
    }

    // Update description and updated_at timestamp
    db.prepare(`
      UPDATE conversations 
      SET description = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(description, id);

    // Get updated conversation
    const conversation = db.prepare(`
      SELECT id, type, name, description, created_at, updated_at
      FROM conversations
      WHERE id = ?
    `).get(id);

    // Emit Socket.io event to conversation room
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${id}`).emit('group_description_updated', {
        conversation_id: parseInt(id),
        description: description,
        updated_by: req.user.id,
        updated_at: conversation.updated_at
      });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Update description error:', error);
    res.status(500).json({ error: 'Failed to update description' });
  }
});

// Update conversation profile (group name)
router.put('/conversation/:id/profile', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    // Validate name length
    if (!name || name.length < 3 || name.length > 50) {
      return res.status(400).json({ error: 'Group name must be between 3 and 50 characters' });
    }

    // Verify user is a participant with Owner or Manager role
    const participant = db.prepare(`
      SELECT cp.*, u.role
      FROM conversation_participants cp
      INNER JOIN users u ON cp.user_id = u.id
      WHERE cp.conversation_id = ? AND cp.user_id = ?
    `).get(id, req.user.id);

    if (!participant) {
      return res.status(403).json({ error: 'You are not a member of this conversation' });
    }

    // Check if user has Owner or Manager role
    if (participant.role !== 'Owner' && participant.role !== 'Manager') {
      return res.status(403).json({ error: 'Only group administrators can perform this action' });
    }

    // Update name and updated_at timestamp
    db.prepare(`
      UPDATE conversations 
      SET name = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(name, id);

    // Get updated conversation
    const conversation = db.prepare(`
      SELECT id, type, name, description, created_at, updated_at
      FROM conversations
      WHERE id = ?
    `).get(id);

    // Emit Socket.io event to conversation room
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${id}`).emit('group_profile_updated', {
        conversation_id: parseInt(id),
        name: name,
        updated_by: req.user.id,
        updated_at: conversation.updated_at
      });
    }

    res.json(conversation);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Add members to group
router.post('/conversation/:id/members', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { user_ids } = req.body;

  try {
    // Validate input
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({ error: 'user_ids array is required' });
    }

    // Verify requesting user is a participant with Owner or Manager role
    const participant = db.prepare(`
      SELECT cp.*, u.role
      FROM conversation_participants cp
      INNER JOIN users u ON cp.user_id = u.id
      WHERE cp.conversation_id = ? AND cp.user_id = ?
    `).get(id, req.user.id);

    if (!participant) {
      return res.status(403).json({ error: 'You are not a member of this conversation' });
    }

    // Check if user has Owner or Manager role
    if (participant.role !== 'Owner' && participant.role !== 'Manager') {
      return res.status(403).json({ error: 'Only group administrators can perform this action' });
    }

    // Validate that all users exist
    const placeholders = user_ids.map(() => '?').join(',');
    const existingUsers = db.prepare(`
      SELECT id FROM users WHERE id IN (${placeholders})
    `).all(...user_ids);

    if (existingUsers.length !== user_ids.length) {
      return res.status(400).json({ error: 'One or more users not found' });
    }

    // Check which users are already in the group
    const existingParticipants = db.prepare(`
      SELECT user_id FROM conversation_participants 
      WHERE conversation_id = ? AND user_id IN (${placeholders})
    `).all(id, ...user_ids);

    const existingParticipantIds = existingParticipants.map(p => p.user_id);
    const newUserIds = user_ids.filter(userId => !existingParticipantIds.includes(userId));

    if (newUserIds.length === 0) {
      return res.status(400).json({ error: 'All users are already in the group' });
    }

    // Add new members to the group
    const addedMembers = [];
    newUserIds.forEach(userId => {
      db.prepare(`
        INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `).run(id, userId);

      // Get the added member's details (filter out sensitive fields)
      const member = db.prepare(`
        SELECT 
          u.id,
          u.name,
          u.profile_photo,
          u.role,
          u.is_online,
          u.last_seen,
          cp.is_admin,
          cp.joined_at
        FROM users u
        INNER JOIN conversation_participants cp ON u.id = cp.user_id
        WHERE u.id = ? AND cp.conversation_id = ?
      `).get(userId, id);

      if (member) {
        addedMembers.push(member);
      }
    });

    // Emit Socket.io event to conversation room
    const io = req.app.get('io');
    if (io) {
      // Make newly added members join the conversation room
      addedMembers.forEach(member => {
        const userSocketId = Array.from(io.sockets.sockets.values())
          .find(socket => socket.userId === member.id);
        
        if (userSocketId) {
          userSocketId.join(`conversation_${id}`);
        }
      });

      // Broadcast to all participants including newly added
      io.to(`conversation_${id}`).emit('members_added', {
        conversation_id: parseInt(id),
        added_members: addedMembers,
        added_by: req.user.id,
        added_at: new Date().toISOString()
      });
    }

    res.json(addedMembers);
  } catch (error) {
    console.error('Add members error:', error);
    res.status(500).json({ error: 'Failed to add members' });
  }
});

// Remove member from group
router.delete('/conversation/:id/members/:userId', authenticateToken, (req, res) => {
  const { id, userId } = req.params;
  const targetUserId = parseInt(userId);

  try {
    // Verify requesting user is a participant with Owner or Manager role
    const participant = db.prepare(`
      SELECT cp.*, u.role
      FROM conversation_participants cp
      INNER JOIN users u ON cp.user_id = u.id
      WHERE cp.conversation_id = ? AND cp.user_id = ?
    `).get(id, req.user.id);

    if (!participant) {
      return res.status(403).json({ error: 'You are not a member of this conversation' });
    }

    // Check if user has Owner or Manager role
    if (participant.role !== 'Owner' && participant.role !== 'Manager') {
      return res.status(403).json({ error: 'Only group administrators can perform this action' });
    }

    // Check if target user exists in the conversation
    const targetParticipant = db.prepare(`
      SELECT cp.*, u.role
      FROM conversation_participants cp
      INNER JOIN users u ON cp.user_id = u.id
      WHERE cp.conversation_id = ? AND cp.user_id = ?
    `).get(id, targetUserId);

    if (!targetParticipant) {
      return res.status(404).json({ error: 'User is not a member of this conversation' });
    }

    // Check if target user is the last Owner
    if (targetParticipant.role === 'Owner') {
      const ownerCount = db.prepare(`
        SELECT COUNT(*) as count
        FROM conversation_participants cp
        INNER JOIN users u ON cp.user_id = u.id
        WHERE cp.conversation_id = ? AND u.role = 'Owner'
      `).get(id);

      if (ownerCount.count <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last Owner from the group' });
      }
    }

    // Delete the participant record
    db.prepare(`
      DELETE FROM conversation_participants
      WHERE conversation_id = ? AND user_id = ?
    `).run(id, targetUserId);

    // Emit Socket.io event to conversation room
    const io = req.app.get('io');
    if (io) {
      // Make removed user leave the conversation room
      const removedUserSocket = Array.from(io.sockets.sockets.values())
        .find(socket => socket.userId === targetUserId);
      
      if (removedUserSocket) {
        removedUserSocket.leave(`conversation_${id}`);
      }

      // Broadcast to all participants
      io.to(`conversation_${id}`).emit('member_removed', {
        conversation_id: parseInt(id),
        removed_user_id: targetUserId,
        removed_by: req.user.id,
        removed_at: new Date().toISOString()
      });
    }

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

// Delete message for self (local deletion only)
// Implements Requirements 7.1, 7.2, 7.3, 7.4
router.post('/message/:id/delete-for-me', authenticateToken, (req, res) => {
  const { id } = req.params;
  const messageId = parseInt(id);

  try {
    // Verify message exists
    const message = db.prepare(`
      SELECT id, conversation_id FROM messages WHERE id = ?
    `).get(messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Insert record into message_deletions table using INSERT OR IGNORE
    // This handles duplicate deletion attempts gracefully (Requirement 7.3)
    db.prepare(`
      INSERT OR IGNORE INTO message_deletions (message_id, user_id, deleted_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `).run(messageId, req.user.id);

    // Note: No Socket.io event needed (deletion is local to user)
    res.json({ message: 'Message deleted for you' });
  } catch (error) {
    console.error('Delete message for me error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Get user count for conversation
router.get('/conversation/:id/user-count', authenticateToken, (req, res) => {
  const { id } = req.params;

  try {
    // Verify user is a participant
    const participant = db.prepare(`
      SELECT * FROM conversation_participants WHERE conversation_id = ? AND user_id = ?
    `).get(id, req.user.id);

    if (!participant) {
      return res.status(403).json({ error: 'You are not a member of this conversation' });
    }

    // Get total member count
    const totalResult = db.prepare(`
      SELECT COUNT(*) as total FROM conversation_participants WHERE conversation_id = ?
    `).get(id);

    // Get online member count
    const onlineResult = db.prepare(`
      SELECT COUNT(*) as online
      FROM conversation_participants cp
      INNER JOIN users u ON cp.user_id = u.id
      WHERE cp.conversation_id = ? AND u.is_online = 1
    `).get(id);

    const total = totalResult.total;
    const online = onlineResult.online;
    const offline = total - online;

    res.json({ total, online, offline });
  } catch (error) {
    console.error('Get user count error:', error);
    res.status(500).json({ error: 'Failed to get user count' });
  }
});

module.exports = router;
