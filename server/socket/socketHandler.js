const jwt = require('jsonwebtoken');
const { db } = require('../database/db');

const userSockets = new Map(); // userId -> socketId
const typingUsers = new Map(); // conversationId -> Set of userIds

module.exports = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);
    
    // Store socket connection
    userSockets.set(socket.userId, socket.id);

    // Update user online status
    db.db.prepare('UPDATE users SET is_online = 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(socket.userId);

    // Notify contacts about online status
    broadcastOnlineStatus(socket.userId, true);

    // Join user's conversations
    const conversations = db.db.prepare(`
      SELECT conversation_id FROM conversation_participants WHERE user_id = ?
    `).all(socket.userId);

    conversations.forEach(conv => {
      socket.join(`conversation_${conv.conversation_id}`);
    });

    // Handle new message
    socket.on('send_message', (data) => {
      const { conversation_id, content, reply_to } = data;

      try {
        // Validate input
        if (!conversation_id || !content || content.trim().length === 0) {
          socket.emit('message_error', { error: 'Invalid message data' });
          return;
        }

        // Check if user is participant of this conversation
        const isParticipant = db.db.prepare(`
          SELECT 1 FROM conversation_participants 
          WHERE conversation_id = ? AND user_id = ?
        `).get(conversation_id, socket.userId);

        if (!isParticipant) {
          socket.emit('message_error', { error: 'Not a participant of this conversation' });
          return;
        }
        const result = db.db.prepare(`
          INSERT INTO messages (conversation_id, sender_id, content, reply_to)
          VALUES (?, ?, ?, ?)
        `).run(conversation_id, socket.userId, content, reply_to || null);

        const messageId = result.lastInsertRowid;

        // Get participants
        const participants = db.db.prepare(`
          SELECT user_id FROM conversation_participants 
          WHERE conversation_id = ? AND user_id != ?
        `).all(conversation_id, socket.userId);

        // Create status records
        participants.forEach(p => {
          db.db.prepare(`
            INSERT INTO message_status (message_id, user_id, status) VALUES (?, ?, 'sent')
          `).run(messageId, p.user_id);
        });

        const message = db.db.prepare(`
          SELECT m.*, u.name as sender_name, u.profile_photo as sender_photo
          FROM messages m
          INNER JOIN users u ON m.sender_id = u.id
          WHERE m.id = ?
        `).get(messageId);

        // Emit to conversation room
        io.to(`conversation_${conversation_id}`).emit('new_message', message);

        // Update delivery status for online users
        participants.forEach(p => {
          if (userSockets.has(p.user_id)) {
            db.db.prepare(`
              UPDATE message_status SET status = 'delivered', updated_at = CURRENT_TIMESTAMP
              WHERE message_id = ? AND user_id = ?
            `).run(messageId, p.user_id);
          }
        });
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('message_error', { error: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing_start', (data) => {
      const { conversation_id } = data;
      
      if (!typingUsers.has(conversation_id)) {
        typingUsers.set(conversation_id, new Set());
      }
      typingUsers.get(conversation_id).add(socket.userId);

      socket.to(`conversation_${conversation_id}`).emit('user_typing', {
        conversation_id,
        user_id: socket.userId
      });
    });

    socket.on('typing_stop', (data) => {
      const { conversation_id } = data;
      
      if (typingUsers.has(conversation_id)) {
        typingUsers.get(conversation_id).delete(socket.userId);
      }

      socket.to(`conversation_${conversation_id}`).emit('user_stopped_typing', {
        conversation_id,
        user_id: socket.userId
      });
    });

    // Handle message read
    socket.on('mark_read', (data) => {
      const { message_ids, conversation_id } = data;

      try {
        message_ids.forEach(msgId => {
          db.db.prepare(`
            INSERT OR REPLACE INTO message_status (message_id, user_id, status, updated_at)
            VALUES (?, ?, 'read', CURRENT_TIMESTAMP)
          `).run(msgId, socket.userId);
        });

        // Notify sender about read status
        io.to(`conversation_${conversation_id}`).emit('messages_read', {
          message_ids,
          user_id: socket.userId,
          conversation_id
        });
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      
      userSockets.delete(socket.userId);
      
      // Update user offline status
      db.db.prepare('UPDATE users SET is_online = 0, last_seen = CURRENT_TIMESTAMP WHERE id = ?').run(socket.userId);

      // Notify contacts about offline status
      broadcastOnlineStatus(socket.userId, false);

      // Clear typing status
      typingUsers.forEach((users, convId) => {
        if (users.has(socket.userId)) {
          users.delete(socket.userId);
          io.to(`conversation_${convId}`).emit('user_stopped_typing', {
            conversation_id: convId,
            user_id: socket.userId
          });
        }
      });
    });
  });

  function broadcastOnlineStatus(userId, isOnline) {
    // Get all conversations this user is part of
    const conversations = db.db.prepare(`
      SELECT conversation_id FROM conversation_participants WHERE user_id = ?
    `).all(userId);

    conversations.forEach(conv => {
      io.to(`conversation_${conv.conversation_id}`).emit('user_status_change', {
        user_id: userId,
        is_online: isOnline,
        last_seen: new Date().toISOString()
      });
    });
  }
};
