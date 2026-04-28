import React, { useState, useEffect, useRef } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Avatar from './Avatar';
import GroupInfoPanel from './GroupInfoPanel';
import ProfileViewer from './ProfileViewer';

const ChatPanel = () => {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [sending, setSending] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showProfileViewer, setShowProfileViewer] = useState(null);
  const [userCount, setUserCount] = useState({ total: 0, online: 0, offline: 0 });
  const [contextMenu, setContextMenu] = useState(null);
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  useEffect(() => {
    loadConversations();
    loadAllUsers();
    
    // Listen for open chat events
    const handleOpenChat = async (event) => {
      const { conversationId } = event.detail;
      
      // Wait for conversations to load
      await loadConversations();
      
      // Find and open the conversation
      setTimeout(() => {
        const conv = conversations.find(c => c.id === conversationId);
        if (conv) {
          setActiveChat(conv);
        } else {
          // If not found, reload conversations and try again
          loadConversations().then(() => {
            const foundConv = conversations.find(c => c.id === conversationId);
            if (foundConv) setActiveChat(foundConv);
          });
        }
      }, 500);
    };

    window.addEventListener('openChat', handleOpenChat);
    
    // Refresh conversations every 5 seconds
    const interval = setInterval(loadConversations, 5000);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('openChat', handleOpenChat);
    };
  }, [conversations]);

  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat.id);
      loadUserCount(activeChat.id);
      // Refresh messages every 2 seconds when chat is active
      const interval = setInterval(() => loadMessages(activeChat.id), 2000);
      return () => clearInterval(interval);
    }
  }, [activeChat]);

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket || !connected) return;

    // Listen for new messages
    socket.on('new_message', (message) => {
      if (activeChat && message.conversation_id === activeChat.id) {
        setMessages(prev => [...prev, message]);
        // Mark as read immediately if chat is open
        setTimeout(() => {
          axios.post('/chat/messages/read', {
            message_ids: [message.id]
          }).catch(err => console.error('Mark read error:', err));
        }, 500);
      }
      // Refresh conversations list
      loadConversations();
    });

    // Listen for read receipts
    socket.on('messages_read', (data) => {
      if (activeChat && activeChat.id === data.conversation_id) {
        setMessages(prev => prev.map(msg => {
          if (data.message_ids.includes(msg.id)) {
            return {
              ...msg,
              status: msg.status ? msg.status.map(s => 
                s.user_id === data.user_id ? { ...s, status: 'read' } : s
              ) : []
            };
          }
          return msg;
        }));
      }
    });

    // Listen for group description updates
    socket.on('group_description_updated', (data) => {
      if (activeChat && activeChat.id === data.conversation_id) {
        setActiveChat(prev => ({ ...prev, description: data.description }));
      }
      loadConversations();
    });

    // Listen for group profile updates
    socket.on('group_profile_updated', (data) => {
      if (activeChat && activeChat.id === data.conversation_id) {
        setActiveChat(prev => ({ ...prev, name: data.name }));
      }
      loadConversations();
    });

    // Listen for members added
    socket.on('members_added', (data) => {
      if (activeChat && activeChat.id === data.conversation_id) {
        loadMessages(activeChat.id);
        loadUserCount(activeChat.id);
      }
      loadConversations();
    });

    // Listen for member removed
    socket.on('member_removed', (data) => {
      if (activeChat && activeChat.id === data.conversation_id) {
        if (data.removed_user_id === user.id) {
          setActiveChat(null); // Close chat if current user was removed
        } else {
          loadMessages(activeChat.id);
          loadUserCount(activeChat.id);
        }
      }
      loadConversations();
    });

    // Listen for user status changes
    socket.on('user_status_change', (data) => {
      // Update user count when online status changes
      if (activeChat) {
        loadUserCount(activeChat.id);
      }
      loadConversations();
    });

    return () => {
      socket.off('new_message');
      socket.off('messages_read');
      socket.off('group_description_updated');
      socket.off('group_profile_updated');
      socket.off('members_added');
      socket.off('member_removed');
      socket.off('user_status_change');
    };
  }, [socket, connected, activeChat]);

  useEffect(() => {
    scrollToBottom();
    // Mark messages as read when they are loaded
    if (messages.length > 0 && activeChat) {
      markMessagesAsRead();
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const response = await api.get('/chat/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Load conversations error:', error);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await api.get('/users/all');
      setAllUsers(response.data.filter(u => u.id !== user.id));
    } catch (error) {
      console.error('Load users error:', error);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const response = await api.get(`/chat/messages/${conversationId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Load messages error:', error);
    }
  };

  const loadUserCount = async (conversationId) => {
    try {
      const response = await api.get(`/chat/conversation/${conversationId}/user-count`);
      setUserCount(response.data);
    } catch (error) {
      console.error('Load user count error:', error);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      // Get all unread messages from others
      const unreadMessages = messages.filter(msg => {
        // Only mark messages from others as read - use string comparison
        if (String(msg.sender_id) === String(user.id)) return false;
        
        // Check if already read - use string comparison
        if (msg.status && msg.status.length > 0) {
          const myStatus = msg.status.find(s => String(s.user_id) === String(user.id));
          return !myStatus || myStatus.status !== 'read';
        }
        return true;
      }).map(msg => msg.id);

      if (unreadMessages.length > 0) {
        await api.post('/chat/messages/read', {
          message_ids: unreadMessages
        });
        
        // Emit socket event for real-time read receipt
        if (socket && connected) {
          socket.emit('mark_read', {
            message_ids: unreadMessages,
            conversation_id: activeChat.id
          });
        }
        
        // Refresh conversations to update unread count
        loadConversations();
      }
    } catch (error) {
      console.error('Mark messages as read error:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChat || sending) return;

    setSending(true);
    try {
      if (replyingTo) {
        // Send message with reply
        await api.post('/chat/message/reply', {
          conversation_id: activeChat.id,
          content: messageText.trim(),
          reply_to: replyingTo.id
        });
        setReplyingTo(null);
      } else {
        // Send regular message
        await api.post('/chat/message', {
          conversation_id: activeChat.id,
          content: messageText.trim()
        });
      }
      
      setMessageText('');
      loadMessages(activeChat.id);
      loadConversations();
      messageInputRef.current?.focus();
    } catch (error) {
      console.error('Send message error:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleReplyToMessage = (message) => {
    setReplyingTo(message);
    setContextMenu(null);
    messageInputRef.current?.focus();
  };

  const handleDeleteForMe = async (messageId) => {
    try {
      await api.post(`/chat/message/${messageId}/delete-for-me`, {
        user_id: user.id
      });
      setContextMenu(null);
      // Remove message from local state immediately
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error('Delete message error:', error);
      alert('Failed to delete message');
    }
  };

  const handleMessageContextMenu = (e, message) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      message: message
    });
  };

  const openProfileViewer = (userId) => {
    setShowProfileViewer(userId);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length < 2) {
      alert('Please enter a group name and select at least 2 members');
      return;
    }

    try {
      const response = await api.post('/chat/conversation/group', {
        name: groupName,
        participant_ids: selectedMembers
      });
      
      setShowCreateGroup(false);
      setGroupName('');
      setSelectedMembers([]);
      loadConversations();
      
      // Open the newly created group
      setTimeout(() => {
        const newConv = conversations.find(c => c.id === response.data.conversation_id);
        if (newConv) setActiveChat(newConv);
      }, 500);
    } catch (error) {
      console.error('Create group error:', error);
      alert(error.response?.data?.error || 'Failed to create group');
    }
  };

  const toggleMemberSelection = (userId) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSearchUsers = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredUsers([]);
      return;
    }
    
    const filtered = allUsers.filter(u => 
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.user_id.includes(query)
    );
    setFilteredUsers(filtered);
  };

  const handleStartNewChat = async (userId) => {
    try {
      const response = await api.post('/chat/conversation/personal', { user_id: userId });
      setShowNewChat(false);
      setSearchQuery('');
      setFilteredUsers([]);
      loadConversations();
      
      // Open the new conversation
      setTimeout(() => {
        const newConv = conversations.find(c => c.id === response.data.conversation_id);
        if (newConv) {
          setActiveChat(newConv);
          loadMessages(newConv.id);
        }
      }, 500);
    } catch (error) {
      console.error('Start chat error:', error);
      alert('Failed to start chat');
    }
  };

  const openChat = (conv) => {
    setActiveChat(conv);
    setMessages([]);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  // Group conversations
  const groups = conversations.filter(c => c.type === 'group');
  const personalConvos = conversations.filter(c => c.type === 'personal');

  return (
    <div style={{
      width: '380px',
      minWidth: '380px',
      background: 'var(--bg2)',
      borderLeft: '1px solid var(--bd)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh'
    }}>
      {!activeChat ? (
        // Conversations List
        <>
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--bd)',
            fontSize: '15px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg3)'
          }}>
            <span>
              <i className="fa-solid fa-comments" style={{ color: 'var(--grn)', marginRight: '6px' }}></i>
              Messages
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn-s btn-sm"
                onClick={() => setShowNewChat(true)}
                style={{ color: 'var(--blu)', borderColor: 'rgba(33, 150, 243, 0.3)' }}
                title="New Chat"
              >
                <i className="fa-solid fa-comment"></i>
              </button>
              <button 
                className="btn-s btn-sm"
                onClick={() => setShowCreateGroup(true)}
                style={{ color: 'var(--grn)', borderColor: 'rgba(0, 200, 83, 0.3)' }}
                title="Create Group"
              >
                <i className="fa-solid fa-users"></i>
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {/* Groups */}
            {groups.length > 0 && (
              <div>
                <div style={{
                  padding: '8px 16px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--t3)',
                  textTransform: 'uppercase'
                }}>
                  Groups ({groups.length})
                </div>
                {groups.map(conv => {
                  const unread = conv.unread_count || 0;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => openChat(conv)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--bd)',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center',
                        background: 'var(--bg2)',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--card)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg2)'}
                    >
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #009624, #00bcd4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        flexShrink: 0
                      }}>
                        <i className="fa-solid fa-users" style={{ fontSize: '20px' }}></i>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>{conv.name}</span>
                          {conv.last_message_time && (
                            <span style={{ fontSize: '11px', color: 'var(--t3)' }}>
                              {formatTime(conv.last_message_time)}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '12px',
                            color: 'var(--t2)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {conv.last_message || 'No messages yet'}
                          </span>
                          {unread > 0 && (
                            <span style={{
                              background: 'var(--grn)',
                              color: '#fff',
                              fontSize: '10px',
                              fontWeight: 700,
                              minWidth: '20px',
                              height: '20px',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0 6px',
                              marginLeft: '8px'
                            }}>
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Personal Chats */}
            {personalConvos.length > 0 && (
              <div>
                <div style={{
                  padding: '8px 16px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--t3)',
                  textTransform: 'uppercase'
                }}>
                  Direct Messages ({personalConvos.length})
                </div>
                {personalConvos.map(conv => {
                  const otherUser = conv.participants?.find(p => p.id !== user.id);
                  const unread = conv.unread_count || 0;
                  
                  return (
                    <div
                      key={conv.id}
                      onClick={() => openChat(conv)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--bd)',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center',
                        background: 'var(--bg2)',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--card)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg2)'}
                    >
                      <Avatar user={otherUser} size="md" online={otherUser?.is_online} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>
                            {otherUser?.name || 'Unknown'}
                          </span>
                          {conv.last_message_time && (
                            <span style={{ fontSize: '11px', color: 'var(--t3)' }}>
                              {formatTime(conv.last_message_time)}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '12px',
                            color: 'var(--t2)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {conv.last_message || 'No messages yet'}
                          </span>
                          {unread > 0 && (
                            <span style={{
                              background: 'var(--grn)',
                              color: '#fff',
                              fontSize: '10px',
                              fontWeight: 700,
                              minWidth: '20px',
                              height: '20px',
                              borderRadius: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '0 6px',
                              marginLeft: '8px'
                            }}>
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {conversations.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: 'var(--t3)'
              }}>
                <i className="fa-solid fa-comments" style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}></i>
                <div>No conversations yet</div>
                <div style={{ fontSize: '12px', marginTop: '8px' }}>
                  Start a chat or create a group
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        // Active Chat View
        <>
          {/* Chat Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--bd)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--bg3)'
          }}>
            <button
              onClick={() => setActiveChat(null)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--t1)',
                cursor: 'pointer',
                padding: '4px',
                fontSize: '18px'
              }}
            >
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            
            {activeChat.type === 'group' ? (
              <div 
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #009624, #00bcd4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  cursor: 'pointer'
                }}
                onClick={() => setShowGroupInfo(true)}
              >
                <i className="fa-solid fa-users"></i>
              </div>
            ) : (
              <div onClick={() => {
                const otherUser = activeChat.participants?.find(p => p.id !== user.id);
                if (otherUser) openProfileViewer(otherUser.id);
              }} style={{ cursor: 'pointer' }}>
                <Avatar 
                  user={activeChat.participants?.find(p => p.id !== user.id)} 
                  size="md" 
                  online={activeChat.participants?.find(p => p.id !== user.id)?.is_online}
                />
              </div>
            )}
            
            <div style={{ flex: 1 }}>
              <div 
                style={{ fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => {
                  if (activeChat.type === 'group') {
                    setShowGroupInfo(true);
                  } else {
                    const otherUser = activeChat.participants?.find(p => p.id !== user.id);
                    if (otherUser) openProfileViewer(otherUser.id);
                  }
                }}
              >
                {activeChat.type === 'group' 
                  ? activeChat.name 
                  : activeChat.participants?.find(p => p.id !== user.id)?.name || 'Unknown'}
              </div>
              {activeChat.type === 'group' ? (
                <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                  {userCount.total} member{userCount.total !== 1 ? 's' : ''} • {userCount.online} online
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                  {activeChat.participants?.find(p => p.id !== user.id)?.is_online ? 'Online' : 'Offline'}
                </div>
              )}
            </div>

            {activeChat.type === 'group' && (
              <button
                onClick={() => setShowGroupInfo(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--t2)',
                  cursor: 'pointer',
                  padding: '8px',
                  fontSize: '18px'
                }}
              >
                <i className="fa-solid fa-info-circle"></i>
              </button>
            )}
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            background: 'var(--bg1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {messages.map((msg, index) => {
              // Ensure proper comparison - convert both to strings for reliable comparison
              const isOwn = String(msg.sender_id) === String(user.id);
              const showDate = index === 0 || 
                formatDate(messages[index - 1].sent_at) !== formatDate(msg.sent_at);
              
              // Get message status
              let statusIcon = null;
              if (isOwn && msg.status && msg.status.length > 0) {
                const allRead = msg.status.every(s => s.status === 'read');
                const allDelivered = msg.status.every(s => s.status === 'delivered' || s.status === 'read');
                
                if (allRead) {
                  statusIcon = <i className="fa-solid fa-check-double" style={{ color: '#4fc3f7', marginLeft: '4px' }}></i>;
                } else if (allDelivered) {
                  statusIcon = <i className="fa-solid fa-check-double" style={{ opacity: 0.5, marginLeft: '4px' }}></i>;
                } else {
                  statusIcon = <i className="fa-solid fa-check" style={{ opacity: 0.5, marginLeft: '4px' }}></i>;
                }
              }
              
              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <div style={{
                      textAlign: 'center',
                      margin: '12px 0',
                      fontSize: '11px',
                      color: 'var(--t3)'
                    }}>
                      <span style={{
                        background: 'var(--card)',
                        padding: '4px 12px',
                        borderRadius: '12px'
                      }}>
                        {formatDate(msg.sent_at)}
                      </span>
                    </div>
                  )}
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: isOwn ? 'flex-end' : 'flex-start',
                    marginBottom: '4px'
                  }}>
                    <div 
                      onContextMenu={(e) => handleMessageContextMenu(e, msg)}
                      style={{
                        maxWidth: '70%',
                        background: isOwn ? 'linear-gradient(135deg, #00C853, #00A843)' : 'var(--card)',
                        color: isOwn ? '#fff' : 'var(--t1)',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        borderTopRightRadius: isOwn ? '4px' : '12px',
                        borderTopLeftRadius: isOwn ? '12px' : '4px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        cursor: 'context-menu'
                      }}
                    >
                      {!isOwn && activeChat.type === 'group' && (
                        <div 
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            marginBottom: '4px',
                            color: 'var(--grn)',
                            cursor: 'pointer'
                          }}
                          onClick={() => openProfileViewer(msg.sender_id)}
                        >
                          {msg.sender_name}
                        </div>
                      )}
                      
                      {/* Reply preview */}
                      {msg.reply_to_message && (
                        <div style={{
                          background: isOwn ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          marginBottom: '6px',
                          borderLeft: '3px solid ' + (isOwn ? 'rgba(255,255,255,0.5)' : 'var(--grn)'),
                          fontSize: '11px',
                          opacity: 0.9
                        }}>
                          <div style={{ fontWeight: 600, marginBottom: '2px' }}>
                            {msg.reply_to_message.sender_name}
                          </div>
                          <div style={{ 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {msg.reply_to_message.content}
                          </div>
                        </div>
                      )}
                      
                      <div style={{ fontSize: '13px', wordBreak: 'break-word' }}>
                        {msg.content}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        marginTop: '4px',
                        opacity: 0.7,
                        textAlign: 'right',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '2px'
                      }}>
                        {formatTime(msg.sent_at)}
                        {statusIcon}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div style={{
            borderTop: '1px solid var(--bd)',
            background: 'var(--bg3)'
          }}>
            {/* Reply Preview */}
            {replyingTo && (
              <div style={{
                padding: '8px 16px',
                background: 'var(--card)',
                borderBottom: '1px solid var(--bd)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', color: 'var(--grn)', fontWeight: 600, marginBottom: '2px' }}>
                    Replying to {replyingTo.sender_name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--t2)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {replyingTo.content}
                  </div>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--t3)',
                    cursor: 'pointer',
                    padding: '4px',
                    fontSize: '16px'
                  }}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            )}
            
            <form onSubmit={handleSendMessage} style={{
              padding: '12px 16px',
              display: 'flex',
              gap: '8px'
            }}>
              <input
                ref={messageInputRef}
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message..."
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  border: '1px solid var(--bd)',
                  borderRadius: '20px',
                  background: 'var(--bg1)',
                  color: 'var(--t1)',
                  fontSize: '13px',
                  outline: 'none'
                }}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={!messageText.trim() || sending}
                style={{
                  background: messageText.trim() ? 'var(--grn)' : 'var(--card)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  color: '#fff',
                  cursor: messageText.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px'
                }}
              >
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </form>
          </div>
        </>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && setShowCreateGroup(false)}>
          <div className="modal" style={{ width: '500px' }}>
            <div className="modal-head">
              <h3>Create New Group</h3>
              <button className="modal-close" onClick={() => setShowCreateGroup(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <label className="flbl">Group Name</label>
                <input
                  type="text"
                  className="finput"
                  placeholder="Enter group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="flbl">Select Members (minimum 2)</label>
                <div style={{ maxHeight: '350px', overflowY: 'auto', marginTop: '8px' }}>
                  {allUsers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--t3)' }}>
                      No users available
                    </div>
                  ) : (
                    allUsers.map(u => (
                      <div key={u.id} className="chk-row">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(u.id)}
                          onChange={() => toggleMemberSelection(u.id)}
                        />
                        <Avatar user={u} size="sm" />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px' }}>{u.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--t3)' }}>
                            {u.role} · {u.user_id}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '8px' }}>
                  {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                </div>
              </div>

              <button 
                className="btn-p" 
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedMembers.length < 2}
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu for Messages */}
      {contextMenu && (
        <div style={{
          position: 'fixed',
          top: contextMenu.y,
          left: contextMenu.x,
          background: 'var(--bg3)',
          border: '1px solid var(--bd)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          minWidth: '150px',
          overflow: 'hidden'
        }}>
          <button
            onClick={() => handleReplyToMessage(contextMenu.message)}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              color: 'var(--t1)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--card)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <i className="fa-solid fa-reply"></i>
            Reply
          </button>
          <button
            onClick={() => handleDeleteForMe(contextMenu.message.id)}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'none',
              border: 'none',
              color: 'var(--red)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--card)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <i className="fa-solid fa-trash"></i>
            Delete for Me
          </button>
        </div>
      )}

      {/* Group Info Panel */}
      {showGroupInfo && activeChat && activeChat.type === 'group' && (
        <GroupInfoPanel
          conversation={activeChat}
          onClose={() => setShowGroupInfo(false)}
          currentUser={user}
        />
      )}

      {/* Profile Viewer */}
      {showProfileViewer && (
        <ProfileViewer
          userId={showProfileViewer}
          onClose={() => setShowProfileViewer(null)}
        />
      )}

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && setShowNewChat(false)}>
          <div className="modal" style={{ width: '450px', maxWidth: '95vw' }}>
            <div className="modal-head">
              <h3>New Chat</h3>
              <button className="modal-close" onClick={() => setShowNewChat(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div className="modal-body">
              {/* Search Box */}
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="text"
                  className="finput"
                  placeholder="Search by name or User ID..."
                  value={searchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  autoFocus
                />
              </div>

              {/* User List */}
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {searchQuery.trim() === '' ? (
                  <div style={{ textAlign: 'center', color: 'var(--t3)', padding: '40px 20px' }}>
                    <i className="fa-solid fa-search" style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}></i>
                    <div>Search for users to start a chat</div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--t3)', padding: '40px 20px' }}>
                    <i className="fa-solid fa-user-slash" style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}></i>
                    <div>No users found</div>
                  </div>
                ) : (
                  filteredUsers.map(u => (
                    <div
                      key={u.id}
                      onClick={() => handleStartNewChat(u.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        background: 'transparent'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--card)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Avatar user={u} size="md" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--t3)' }}>
                          ID: {u.user_id} · {u.role}
                        </div>
                      </div>
                      <i className="fa-solid fa-comment" style={{ color: 'var(--grn)', fontSize: '18px' }}></i>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPanel;
