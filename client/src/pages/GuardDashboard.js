import React, { useState, useEffect, useRef } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Avatar from '../components/Avatar';
import SettingsModal from '../components/SettingsModal';
import DraggableContactButton from '../components/DraggableContactButton';
import { formatTime, formatDate } from '../utils/helpers';
import { getFileURL } from '../config/api';

const GuardDashboard = () => {
  const { user, logout, checkAuth } = useAuth();
  const { socket, connected } = useSocket();
  const [activeTab, setActiveTab] = useState('home');
  const [attendance, setAttendance] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [camStream, setCamStream] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [uploadingAttendance, setUploadingAttendance] = useState(false);
  
  // New Chat functionality
  const [showNewChat, setShowNewChat] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRefs = useRef({});
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Get greeting based on Indian time
  const getGreeting = () => {
    const now = new Date();
    // Convert to Indian timezone (IST = UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
    const istTime = new Date(now.getTime() + istOffset);
    const hours = istTime.getUTCHours();
    
    if (hours >= 5 && hours < 12) {
      return '🌅 Good Morning';
    } else if (hours >= 12 && hours < 17) {
      return '☀️ Good Afternoon';
    } else if (hours >= 17 && hours < 21) {
      return '🌆 Good Evening';
    } else {
      return '🌙 Good Night';
    }
  };

  useEffect(() => {
    if (activeTab === 'attendance' || activeTab === 'home') {
      fetchAttendance();
    }
    if (activeTab === 'chat') {
      fetchConversations();
      fetchAllUsers();
    }
    if (activeTab === 'profile') {
      fetchDocuments();
    }
  }, [activeTab]);

  // Fetch attendance on initial load
  useEffect(() => {
    fetchAttendance();
  }, []);

  // Poll attendance every 30 seconds to pick up verification changes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAttendance();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleUserDataUpdated = async () => {
      await checkAuth();
      fetchAttendance();
      fetchConversations();
      fetchAllUsers();
      if (activeTab === 'profile') {
        fetchDocuments();
      }
    };
    window.addEventListener('userDataUpdated', handleUserDataUpdated);
    return () => window.removeEventListener('userDataUpdated', handleUserDataUpdated);
  }, [activeTab]);

  // Socket.IO event listeners for real-time updates
  useEffect(() => {
    if (!socket || !connected) return;

    // Listen for new messages
    socket.on('new_message', (message) => {
      console.log('📨 New message received:', message);
      
      // If we're in chat tab and this message is for active chat, update messages
      if (activeTab === 'chat' && activeChat && message.conversation_id === activeChat.id) {
        setMessages(prev => [...prev, message]);
        
        // Mark as read immediately if chat is open
        setTimeout(() => {
          api.post('/chat/messages/read', {
            conversation_id: activeChat.id,
            message_ids: [message.id]
          }).catch(console.error);
        }, 100);
      }
      
      // Always refresh conversations to update unread counts
      fetchConversations();
    });

    // Listen for message updates (edited, deleted, etc.)
    socket.on('message_updated', (updatedMessage) => {
      console.log('📝 Message updated:', updatedMessage);
      
      if (activeTab === 'chat' && activeChat && updatedMessage.conversation_id === activeChat.id) {
        setMessages(prev => prev.map(msg => 
          msg.id === updatedMessage.id ? updatedMessage : msg
        ));
      }
      
      // Refresh conversations
      fetchConversations();
    });

    // Listen for conversation updates
    socket.on('conversation_updated', (conversation) => {
      console.log('💬 Conversation updated:', conversation);
      fetchConversations();
    });

    // Listen for user status changes
    socket.on('user_status_changed', (data) => {
      console.log('👤 User status changed:', data);
      fetchConversations();
      fetchAllUsers();
    });

    // Cleanup listeners
    return () => {
      socket.off('new_message');
      socket.off('message_updated');
      socket.off('conversation_updated');
      socket.off('user_status_changed');
    };
  }, [socket, connected, activeTab, activeChat]);

  // Auto-refresh messages when in chat tab with active chat
  useEffect(() => {
    if (activeTab === 'chat' && activeChat) {
      // Initial load
      fetchMessages(activeChat.id);
      
      // Refresh every 5 seconds as backup (in case socket fails)
      const interval = setInterval(() => {
        fetchMessages(activeChat.id);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [activeTab, activeChat]);

  // Refresh attendance data when month changes
  useEffect(() => {
    const checkMonthChange = () => {
      const now = new Date();
      
      // Check if month has changed (runs once per day)
      const today = now.toISOString().split('T')[0];
      const lastCheck = localStorage.getItem('lastAttendanceCheck');
      
      if (lastCheck !== today) {
        localStorage.setItem('lastAttendanceCheck', today);
        if (activeTab === 'attendance' || activeTab === 'home') {
          fetchAttendance();
        }
      }
    };

    // Check immediately
    checkMonthChange();
    
    // Check every hour
    const interval = setInterval(checkMonthChange, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [activeTab]);

  // Clear captured photo when attendance status changes
  useEffect(() => {
    if (attendance.length > 0) {
      const todayRecord = attendance[0];
      const today = formatDate(new Date());
      
      // Handle both boolean and integer values for is_rejected consistently
      const isRejected = todayRecord.is_rejected === true || todayRecord.is_rejected === 1;
      const isVerified = todayRecord.is_verified === true || todayRecord.is_verified === 1;
      
      // If today's attendance exists and is not rejected, FORCE clear everything
      if (todayRecord.date === today && todayRecord.present && !isRejected) {
        console.log('Force clearing camera - attendance marked', { isVerified, isRejected });
        
        // Clear captured photo
        setCapturedPhoto(null);
        
        // Stop and clear camera stream
        if (camStream) {
          camStream.getTracks().forEach(track => track.stop());
          setCamStream(null);
        }
        
        // Hide video element
        if (videoRef.current) {
          videoRef.current.style.display = 'none';
          videoRef.current.srcObject = null;
        }
      }
    }
  }, [attendance]);

  const fetchAllUsers = async () => {
    try {
      const res = await api.get('/users/all');
      setAllUsers(res.data.filter(u => u.id !== user.id));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
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
      fetchConversations();
      
      // Open the new conversation
      setTimeout(() => {
        const newConv = conversations.find(c => c.id === response.data.conversation_id);
        if (newConv) {
          setActiveChat(newConv);
          fetchMessages(newConv.id);
        }
      }, 500);
    } catch (error) {
      console.error('Start chat error:', error);
      alert('Failed to start chat');
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/users/documents');
      setDocuments(res.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await api.get('/attendance/my');
      console.log('Fetched attendance records:', res.data);
      
      // Get current month's days up to today only - use local system date
      const now = new Date();
      const today = now.getDate(); // Current day of month (1-31)
      const year = now.getFullYear();
      const month = now.getMonth(); // 0-11
      
      console.log('Current date info:', { 
        today, 
        year, 
        month: month + 1, 
        fullDate: now.toString(),
        isoDate: now.toISOString(),
        localDate: now.toLocaleDateString()
      });
      
      const monthAttendance = [];
      // Loop from day 1 to today (inclusive)
      // Shows only current month days up to today (e.g., 27 days for April 27)
      for (let day = 1; day <= today; day++) {
        // Create date at noon local time
        const date = new Date(year, month, day, 12, 0, 0);
        const dateStr = formatDate(date);
        const record = res.data.find(r => r.date === dateStr);
        
        if (day === today || day === today - 1) {
          console.log(`Day ${day} record check:`, { dateStr, record, foundInData: !!record });
        }
        
        // Handle both boolean and integer values for is_verified and is_rejected
        const isVerified = record?.is_verified === true || record?.is_verified === 1;
        const isRejected = record?.is_rejected === true || record?.is_rejected === 1;
        
        monthAttendance.push({
          date: dateStr,
          present: !!record,
          time: record ? formatTime(new Date(record.marked_at)) : '--',
          is_verified: isVerified,
          is_rejected: isRejected,
          rejection_reason: record?.rejection_reason || null,
          photo_url: record?.photo_url || null
        });
      }
      
      console.log('Total days generated:', monthAttendance.length);
      console.log('Last 3 records (latest):', monthAttendance.slice(-3));
      
      // Reverse to show latest first
      setAttendance(monthAttendance.reverse());
    } catch (error) {
      console.error('Error fetching attendance:', error);
      // If API fails, show empty data for current month up to today
      const now = new Date();
      const today = now.getDate();
      const year = now.getFullYear();
      const month = now.getMonth();
      
      const emptyData = [];
      for (let day = 1; day <= today; day++) {
        const date = new Date(year, month, day, 12, 0, 0);
        emptyData.push({
          date: formatDate(date),
          present: false,
          time: '--',
          is_verified: false,
          is_rejected: false,
          rejection_reason: null,
          photo_url: null
        });
      }
      setAttendance(emptyData.reverse());
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await api.get('/chat/conversations');
      setConversations(res.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const res = await api.get(`/chat/messages/${conversationId}`);
      setMessages(res.data);
      
      // Mark messages as read when fetching
      markMessagesAsRead(conversationId);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markMessagesAsRead = async (conversationId) => {
    try {
      await api.post('/chat/messages/read', {
        conversation_id: conversationId
      });
      
      // Refresh conversations to update unread counts
      fetchConversations();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX

    try {
      const response = await api.post('/chat/message', {
        conversation_id: activeChat.id,
        content: messageContent
      });
      
      // Message sent successfully
      console.log('Message sent successfully:', response.data);
      
      // Socket will handle real-time update, but fetch as fallback
      setTimeout(() => {
        fetchMessages(activeChat.id);
      }, 500);
    } catch (error) {
      console.error('Send message error:', error);
      
      // Restore message in input if send failed
      setNewMessage(messageContent);
      
      // Show user-friendly error message
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send message';
      alert(`Could not send message: ${errorMessage}\n\nPlease check your connection and try again.`);
    }
  };

  const handleOpenChat = (conv) => {
    setActiveChat(conv);
    fetchMessages(conv.id);
    markMessagesAsRead(conv.id);
  };

  const handleDocumentUpload = async (docType, file) => {
    if (!file) return;

    setUploadingDoc(docType);
    const formData = new FormData();
    formData.append('document', file);
    formData.append('doc_type', docType);

    try {
      await api.post('/users/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Document uploaded successfully!');
      // Reset file input
      if (fileInputRefs.current[docType]) {
        fileInputRefs.current[docType].value = '';
      }
      // Refresh documents
      fetchDocuments();
    } catch (error) {
      console.error('Upload error:', error);
      alert(error.response?.data?.error || 'Failed to upload document');
    } finally {
      setUploadingDoc(null);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.style.display = 'block';
      }
      setCamStream(stream);
      setCapturedPhoto(null); // Reset captured photo when opening camera
    } catch (error) {
      alert('Camera access denied');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    canvas.getContext('2d').drawImage(video, 0, 0);

    // Stop camera
    if (camStream) {
      camStream.getTracks().forEach(track => track.stop());
      setCamStream(null);
    }
    video.style.display = 'none';

    // Get photo as data URL for preview
    const photoDataUrl = canvas.toDataURL('image/jpeg');
    setCapturedPhoto(photoDataUrl);
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const uploadAttendance = async () => {
    if (!canvasRef.current || !capturedPhoto) return;

    setUploadingAttendance(true);
    
    // Convert canvas to blob and upload
    canvasRef.current.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append('photo', blob, 'attendance.jpg');

      try {
        const response = await api.post('/attendance/mark', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        // Clear captured photo and camera stream first
        setCapturedPhoto(null);
        if (camStream) {
          camStream.getTracks().forEach(track => track.stop());
          setCamStream(null);
        }
        
        // Refresh attendance data, then show alert so UI is already updated
        await fetchAttendance();
        alert('Attendance marked successfully! Waiting for verification.');
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to mark attendance';
        
        // Always clear photo and camera on any error, then refresh
        setCapturedPhoto(null);
        if (camStream) {
          camStream.getTracks().forEach(track => track.stop());
          setCamStream(null);
        }
        await fetchAttendance();
        alert(errorMessage);
      } finally {
        setUploadingAttendance(false);
      }
    });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.post('/auth/reset-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      
      alert('Password changed successfully!');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const renderHome = () => {
    // Check today's attendance status
    const todayRecord = attendance.length > 0 && attendance[0].date === formatDate(new Date()) ? attendance[0] : null;
    const todayMarked = todayRecord && todayRecord.present;
    // Handle both boolean and integer values consistently
    const isVerified = todayRecord?.is_verified === true || todayRecord?.is_verified === 1;
    const isRejected = todayRecord?.is_rejected === true || todayRecord?.is_rejected === 1;
    const isPending = todayMarked && !isVerified && !isRejected;

    return (
      <div style={{ padding: '20px 16px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{getGreeting()}, {user.name}!</h2>
          <p style={{ fontSize: '13px', color: 'var(--t2)' }}>Duty Time, Update Profile</p>
        </div>

        {/* Duty Time Card */}
        <div style={{
          background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '16px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            right: '-20px',
            top: '-20px',
            width: '100px',
            height: '100px',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '50%'
          }}></div>
          <div style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.8)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '6px'
          }}>
            Current Duty Time
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--t1)', marginBottom: '4px' }}>
            8 Hrs <span style={{ fontSize: '14px', fontWeight: 500, opacity: 0.8 }}>(Active)</span>
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
            06:00 AM - 02:00 PM · {user.location || 'Post'}
          </div>
        </div>

        {/* Update Profile Card */}
        <div 
          className="stat"
          onClick={() => setActiveTab('profile')}
          style={{ marginBottom: '16px', cursor: 'pointer' }}
        >
          <div className="lbl">
            <span>Update Profile</span>
            <button 
              className="btn-icon btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('profile');
              }}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '28px',
                height: '28px',
                fontSize: '12px',
                background: 'rgba(0, 188, 212, 0.2)',
                borderColor: 'rgba(0, 188, 212, 0.3)'
              }}
            >
              <i className="fa-solid fa-pen"></i>
            </button>
          </div>
          <div className="num" style={{ color: 'var(--tl)' }}>Edit Details</div>
          <i className="fa-solid fa-user-edit ico" style={{ color: 'var(--tl)' }}></i>
        </div>

        {/* Today's Attendance Status */}
        {todayMarked ? (
          <div style={{
            background: isVerified ? 'linear-gradient(135deg, var(--grnD), var(--grn))' : 
                       isRejected ? 'linear-gradient(135deg, var(--danger), rgba(239, 68, 68, 0.8))' : 
                       'linear-gradient(135deg, var(--warning), rgba(245, 158, 11, 0.8))',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              right: '-20px',
              top: '-20px',
              width: '100px',
              height: '100px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '50%'
            }}></div>
            <div style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.8)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px'
            }}>
              Today's Attendance
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--t1)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className={`fa-solid ${isVerified ? 'fa-circle-check' : isRejected ? 'fa-circle-xmark' : 'fa-clock'}`}></i>
              {isVerified ? 'Present' : isRejected ? 'Rejected' : 'Pending Verification'}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
              Marked at {todayRecord.time}
            </div>
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(135deg, var(--card), var(--cardH))',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '16px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              right: '-20px',
              top: '-20px',
              width: '100px',
              height: '100px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '50%'
            }}></div>
            <div style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.8)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px'
            }}>
              Attendance Not Marked
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--t1)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-camera"></i>
              Mark Attendance Now
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
              Go to Attendance tab to mark
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderChat = () => {
    if (activeChat) {
      // Get other user info for personal chats
      const otherUser = activeChat.type === 'personal' 
        ? activeChat.participants?.find(p => p.id !== user.id)
        : null;
      const chatName = activeChat.type === 'group' 
        ? activeChat.name 
        : otherUser?.name || 'Unknown';

      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%',
          maxHeight: 'calc(100vh - 120px)', // Account for header and bottom nav
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--bd)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--bg3)',
            flexShrink: 0
          }}>
            <button 
              onClick={() => setActiveChat(null)}
              style={{ background: 'none', border: 'none', color: 'var(--t2)', cursor: 'pointer', fontSize: '16px', padding: '4px' }}
            >
              <i className="fa-solid fa-arrow-left"></i>
            </button>
            {activeChat.type === 'group' ? (
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--grnD), var(--tl))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--t1)'
              }}>
                <i className="fa-solid fa-users"></i>
              </div>
            ) : (
              <Avatar user={otherUser} size="md" />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{chatName}</div>
              {activeChat.type === 'group' && (
                <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                  {activeChat.participants?.length || 0} members
                </div>
              )}
            </div>
          </div>

          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '12px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px',
            background: 'var(--bg1)'
          }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--t3)', padding: '40px 20px' }}>
                No messages yet
              </div>
            ) : (
              messages.map(msg => {
                const isOwn = String(msg.sender_id) === String(user.id);
                return (
                  <div key={msg.id} style={{
                    display: 'flex',
                    justifyContent: isOwn ? 'flex-end' : 'flex-start',
                    marginBottom: '4px'
                  }}>
                    <div style={{
                      maxWidth: '75%',
                      background: isOwn ? 'linear-gradient(135deg, var(--grnD), var(--grn))' : 'var(--card)',
                      color: isOwn ? 'var(--t1)' : 'var(--t1)',
                      padding: '8px 12px',
                      borderRadius: '12px',
                      borderTopRightRadius: isOwn ? '4px' : '12px',
                      borderTopLeftRadius: isOwn ? '12px' : '4px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}>
                      {!isOwn && activeChat.type === 'group' && (
                        <div style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          marginBottom: '4px',
                          color: 'var(--grn)'
                        }}>
                          {msg.sender_name}
                        </div>
                      )}
                      <div style={{ fontSize: '13px', wordBreak: 'break-word' }}>
                        {msg.content}
                      </div>
                      <div style={{
                        fontSize: '10px',
                        marginTop: '4px',
                        opacity: 0.7,
                        textAlign: 'right'
                      }}>
                        {formatTime(new Date(msg.sent_at))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} style={{
            background: 'var(--bg3)',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderTop: '1px solid var(--bd)',
            flexShrink: 0,
            minHeight: '60px'
          }}>
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
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
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              style={{
                background: newMessage.trim() ? 'var(--grn)' : 'var(--card)',
                border: 'none',
                color: 'var(--t1)',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <i className="fa-solid fa-paper-plane"></i>
            </button>
          </form>
        </div>
      );
    }

    return (
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Messages</h3>
          <button
            className="btn-p"
            onClick={() => setShowNewChat(true)}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i>
            New Chat
          </button>
        </div>
        {conversations.map(conv => {
          const otherUser = conv.type === 'personal' 
            ? conv.participants?.find(p => p.id !== user.id)
            : null;
          const displayName = conv.type === 'group' 
            ? conv.name 
            : otherUser?.name || 'Unknown';
          
          return (
            <div 
              key={conv.id}
              onClick={() => handleOpenChat(conv)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 0',
                borderBottom: '1px solid rgba(26, 58, 82, 0.3)',
                cursor: 'pointer'
              }}
            >
              {conv.type === 'group' ? (
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #009624, #00bcd4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--t1)',
                  flexShrink: 0
                }}>
                  <i className="fa-solid fa-users" style={{ fontSize: '20px' }}></i>
                </div>
              ) : (
                <Avatar user={otherUser} size="md" />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>{displayName}</span>
                  {conv.last_message_time && (
                    <span style={{ fontSize: '11px', color: 'var(--t3)' }}>
                      {formatTime(new Date(conv.last_message_time))}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--t2)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {conv.last_message || 'No messages yet'}
                </div>
              </div>
            </div>
          );
        })}
        {conversations.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--t3)', padding: '40px 20px' }}>
            No conversations yet
          </div>
        )}
      </div>
    );
  };

  const renderAttendance = () => {
    const todayRecord = attendance.length > 0 && attendance[0].date === formatDate(new Date()) ? attendance[0] : null;
    const todayMarked = todayRecord && todayRecord.present;
    
    // Handle both boolean and integer values for is_verified and is_rejected
    const isVerified = todayRecord?.is_verified === true || todayRecord?.is_verified === 1;
    const isRejected = todayRecord?.is_rejected === true || todayRecord?.is_rejected === 1;
    
    // CRITICAL: Only show camera if NO attendance OR attendance is rejected
    const showCamera = !todayMarked || (todayMarked && isRejected);

    // If attendance is verified or pending, show the uploaded photo instead of camera
    if (todayMarked && !isRejected) {
      return (
        <div style={{ padding: '20px 16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Today's Attendance</h3>

          {/* Show uploaded photo */}
          {todayRecord.photo_url && (
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '100%',
                maxWidth: '320px',
                margin: '0 auto',
                borderRadius: '14px',
                overflow: 'hidden',
                border: `3px solid ${isVerified ? 'var(--grn)' : 'var(--ylw)'}`,
                boxShadow: `0 4px 12px ${isVerified ? 'rgba(0, 200, 83, 0.3)' : 'rgba(255, 204, 0, 0.3)'}`
              }}>
                <img
                  src={getFileURL(todayRecord.photo_url)}
                  alt="Attendance Photo"
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block'
                  }}
                  onError={(e) => {
                    console.error('Failed to load image:', todayRecord.photo_url);
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '16px 24px',
              borderRadius: '12px',
              background: isVerified ? 'var(--grnG)' : 'rgba(255, 204, 0, 0.1)',
              border: `2px solid ${isVerified ? 'var(--grn)' : 'var(--ylw)'}`,
              marginBottom: '12px'
            }}>
              <i className={`fa-solid ${isVerified ? 'fa-circle-check' : 'fa-clock'}`} style={{
                fontSize: '32px',
                color: isVerified ? 'var(--grn)' : 'var(--ylw)'
              }}></i>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: isVerified ? 'var(--grn)' : 'var(--ylw)' }}>
                  PRESENT
                </div>
                <div style={{ fontSize: '13px', color: 'var(--t2)', marginTop: '2px' }}>
                  {isVerified ? 'Verified' : 'Pending Verification'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '14px', color: 'var(--t2)' }}>
              Marked at {todayRecord.time}
            </div>
            {!isVerified && (
              <div style={{ 
                fontSize: '12px', 
                color: 'var(--t3)', 
                marginTop: '12px',
                padding: '10px 16px',
                background: 'rgba(255, 204, 0, 0.1)',
                borderRadius: '8px',
                maxWidth: '320px',
                margin: '12px auto 0'
              }}>
                <i className="fa-solid fa-info-circle" style={{ marginRight: '6px' }}></i>
                Waiting for manager/supervisor verification
              </div>
            )}
          </div>

          {/* Current Month Attendance */}
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', marginTop: '32px' }}>
            This Month ({new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
          </div>
          {attendance.map((att, idx) => {
            const attIsVerified = att.is_verified === true || att.is_verified === 1;
            const attIsRejected = att.is_rejected === true || att.is_rejected === 1;
            
            let badgeClass = 'badge-r';
            let badgeIcon = 'fa-xmark';
            let badgeText = 'Absent';
            
            if (att.present) {
              if (attIsVerified) {
                badgeClass = 'badge-g';
                badgeIcon = 'fa-circle-check';
                badgeText = 'Verified';
              } else if (attIsRejected) {
                badgeClass = 'badge-r';
                badgeIcon = 'fa-circle-xmark';
                badgeText = 'Rejected';
              } else {
                badgeClass = 'badge-o';
                badgeIcon = 'fa-clock';
                badgeText = 'Pending';
              }
            }
            
            return (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid rgba(26, 58, 82, 0.3)'
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{att.date}</div>
                  <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                    {att.time !== '--' ? att.time : 'Not marked'}
                  </div>
                </div>
                <span className={`badge ${badgeClass}`}>
                  <i className={`fa-solid ${badgeIcon}`} style={{ fontSize: '10px' }}></i>
                  {' '}{badgeText}
                </span>
              </div>
            );
          })}
        </div>
      );
    }

    // If attendance not marked or rejected, show camera interface
    return (
      <div style={{ padding: '20px 16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Mark Attendance</h3>

        {/* Status Circle - Only for not marked or rejected */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background: isRejected ? 'rgba(255, 59, 48, 0.1)' : 'var(--card)',
            border: `3px solid ${isRejected ? 'var(--red)' : 'var(--bd)'}`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px'
          }}>
            <i className={`fa-solid ${isRejected ? 'fa-circle-xmark' : 'fa-camera'}`} style={{
              fontSize: '48px',
              color: isRejected ? 'var(--red)' : 'var(--t1)'
            }}></i>
          </div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: isRejected ? 'var(--red)' : 'var(--t1)' }}>
            {isRejected ? 'Rejected - Upload Again' : 'Capture Selfie to Mark Attendance'}
          </div>
          {isRejected && todayRecord.rejection_reason && (
            <div style={{ 
              fontSize: '12px', 
              color: 'var(--red)', 
              marginTop: '8px',
              padding: '8px 12px',
              background: 'rgba(255, 59, 48, 0.1)',
              borderRadius: '8px',
              maxWidth: '320px',
              margin: '8px auto 0'
            }}>
              <strong>Reason:</strong> {todayRecord.rejection_reason}
            </div>
          )}
        </div>

        {/* Camera Controls */}
        {showCamera && (
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            {/* Video Stream */}
            <video ref={videoRef} autoPlay playsInline style={{
              width: '100%',
              maxWidth: '320px',
              borderRadius: '14px',
              background: 'var(--bg1)',
              display: 'none',
              marginBottom: '16px'
            }}></video>
            
            {/* Hidden Canvas for capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
            
            {/* Photo Preview */}
            {capturedPhoto && (
              <div style={{
                width: '100%',
                maxWidth: '320px',
                margin: '0 auto 16px',
                borderRadius: '14px',
                overflow: 'hidden',
                border: '2px solid var(--grn)',
                boxShadow: '0 4px 12px rgba(0, 200, 83, 0.2)'
              }}>
                <img
                  src={capturedPhoto}
                  alt="Captured"
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block'
                  }}
                />
              </div>
            )}
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {!camStream && !capturedPhoto ? (
                <button className="btn-s" onClick={startCamera}>
                  <i className="fa-solid fa-video" style={{ marginRight: '6px' }}></i>
                  Open Camera
                </button>
              ) : camStream && !capturedPhoto ? (
                <button className="btn-p" onClick={capturePhoto} style={{ width: 'auto', padding: '12px 24px' }}>
                  <i className="fa-solid fa-camera" style={{ marginRight: '6px' }}></i>
                  Capture Photo
                </button>
              ) : capturedPhoto ? (
                <>
                  <button 
                    className="btn-s" 
                    onClick={retakePhoto}
                    disabled={uploadingAttendance}
                    style={{ width: 'auto', padding: '12px 24px' }}
                  >
                    <i className="fa-solid fa-rotate-left" style={{ marginRight: '6px' }}></i>
                    Retake
                  </button>
                  <button 
                    className="btn-p" 
                    onClick={uploadAttendance}
                    disabled={uploadingAttendance}
                    style={{ width: 'auto', padding: '12px 24px' }}
                  >
                    {uploadingAttendance ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-upload" style={{ marginRight: '6px' }}></i>
                        Upload & Mark
                      </>
                    )}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        )}

        {/* Current Month Attendance */}
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', marginTop: '20px' }}>
          This Month ({new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
        </div>
        {attendance.map((att, idx) => {
          const attIsVerified = att.is_verified === true || att.is_verified === 1;
          const attIsRejected = att.is_rejected === true || att.is_rejected === 1;
          
          let badgeClass = 'badge-r';
          let badgeIcon = 'fa-xmark';
          let badgeText = 'Absent';
          
          if (att.present) {
            if (attIsVerified) {
              badgeClass = 'badge-g';
              badgeIcon = 'fa-circle-check';
              badgeText = 'Verified';
            } else if (attIsRejected) {
              badgeClass = 'badge-r';
              badgeIcon = 'fa-circle-xmark';
              badgeText = 'Rejected';
            } else {
              badgeClass = 'badge-o';
              badgeIcon = 'fa-clock';
              badgeText = 'Pending';
            }
          }
          
          return (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: '1px solid rgba(26, 58, 82, 0.3)'
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{att.date}</div>
                <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                  {att.time !== '--' ? att.time : 'Not marked'}
                </div>
              </div>
              <span className={`badge ${badgeClass}`}>
                <i className={`fa-solid ${badgeIcon}`} style={{ fontSize: '10px' }}></i>
                {' '}{badgeText}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderProfile = () => {
    const docItems = [
      { key: 'aadhaar', label: 'Aadhaar Card', icon: 'fa-id-card' },
      { key: 'pan', label: 'PAN Card', icon: 'fa-file-invoice' },
      { key: '10th_marksheet', label: '10th Marksheet', icon: 'fa-graduation-cap' },
      { key: '12th_marksheet', label: '12th Marksheet', icon: 'fa-graduation-cap' },
      { key: 'police_verification', label: 'Police Verification', icon: 'fa-shield-halved' },
      { key: 'bank_passbook', label: 'Bank Passbook', icon: 'fa-building-columns' }
    ];

    // Calculate profile completion
    let profileCompletion = 0;
    const fields = ['name', 'mobile', 'email', 'profile_photo'];
    fields.forEach(field => {
      if (user[field]) profileCompletion += 10;
    });
    docItems.forEach(doc => {
      if (documents.find(d => d.doc_type === doc.key)) profileCompletion += 10;
    });
    profileCompletion = Math.round(profileCompletion);

    // Get document status
    const getDocStatus = (docType) => {
      const doc = documents.find(d => d.doc_type === docType);
      if (!doc) return { label: 'Missing', className: 'badge-r', icon: 'fa-xmark' };
      if (doc.is_verified) return { label: 'Verified', className: 'badge-g', icon: 'fa-circle-check' };
      return { label: 'Pending', className: 'badge-o', icon: 'fa-clock' };
    };

    return (
      <div style={{ padding: '20px 16px' }}>
        {/* Avatar and Info */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Avatar user={user} size="xl" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: '18px', fontWeight: 700 }}>{user.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '2px' }}>
            ID: {user.user_id} · {user.role}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--t2)', marginTop: '4px' }}>
            <i className="fa-solid fa-phone" style={{ marginRight: '4px' }}></i>
            {user.mobile || 'Not set'}
          </div>
        </div>

        {/* Profile Completion */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Profile Completion</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--grn)' }}>
              {profileCompletion}%
            </span>
          </div>
          <div className="pbar" style={{ height: '8px' }}>
            <div className="pfill" style={{
              width: `${profileCompletion}%`,
              background: 'linear-gradient(90deg, var(--grnD), var(--grn))'
            }}></div>
          </div>
        </div>

        {/* Documents */}
        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Documents</div>
        {docItems.map(doc => {
          const status = getDocStatus(doc.key);
          return (
            <div key={doc.key} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'var(--card)',
              border: '1px solid var(--bd)',
              borderRadius: '12px',
              marginBottom: '8px'
            }}>
              <i className={`fa-solid ${doc.icon}`} style={{
                fontSize: '18px',
                color: 'var(--t3)',
                width: '24px',
                textAlign: 'center'
              }}></i>
              <div style={{ flex: 1, fontSize: '13px', fontWeight: 500 }}>{doc.label}</div>
              <span className={`badge ${status.className}`}>
                <i className={`fa-solid ${status.icon}`} style={{ fontSize: '9px' }}></i> {status.label}
              </span>
              <input
                ref={el => fileInputRefs.current[doc.key] = el}
                type="file"
                accept="image/*,application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files[0]) {
                    handleDocumentUpload(doc.key, e.target.files[0]);
                  }
                }}
              />
              <button 
                className="btn-s btn-sm"
                onClick={() => fileInputRefs.current[doc.key]?.click()}
                disabled={uploadingDoc === doc.key}
              >
                {uploadingDoc === doc.key ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-solid fa-camera"></i>
                )}
              </button>
            </div>
          );
        })}

        {/* Change Password */}
        <div style={{ marginTop: '24px' }}>
          <button 
            className="btn-d"
            style={{ width: '100%', padding: '12px' }}
            onClick={() => setShowPasswordModal(true)}
          >
            <i className="fa-solid fa-key" style={{ marginRight: '6px' }}></i>
            Change Password
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="pwa">
      {/* Header */}
      <div className="pwa-head">
        <Avatar user={user} size="md" online={true} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 600 }}>{user.name}</div>
          <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
            Guard · {user.shift || 'Day 6AM-2PM'}
          </div>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '18px', cursor: 'pointer', marginRight: '8px' }}
          title="Settings"
        >
          <i className="fa-solid fa-gear"></i>
        </button>
        <button 
          onClick={logout}
          style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: '18px', cursor: 'pointer' }}
          title="Logout"
        >
          <i className="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>

      {/* Body */}
      <div className="pwa-body">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'chat' && renderChat()}
        {activeTab === 'attendance' && renderAttendance()}
        {activeTab === 'profile' && renderProfile()}
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <div 
          className={`nav-btn ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <i className="fa-solid fa-house"></i>
          <span>Home</span>
        </div>
        <div 
          className={`nav-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <i className="fa-solid fa-comments"></i>
          <span>Chat</span>
        </div>
        <div 
          className={`nav-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          onClick={() => setActiveTab('attendance')}
        >
          <i className="fa-solid fa-camera"></i>
          <span>Attendance</span>
        </div>
        <div 
          className={`nav-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <i className="fa-solid fa-user"></i>
          <span>Profile</span>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && setShowPasswordModal(false)}>
          <div className="modal" style={{ width: '400px', maxWidth: '95vw' }}>
            <div className="modal-head">
              <h3>Change Password</h3>
              <button className="modal-close" onClick={() => setShowPasswordModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleChangePassword}>
                <div style={{ marginBottom: '16px' }}>
                  <label className="flbl">Current Password</label>
                  <input
                    type="password"
                    className="finput"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label className="flbl">New Password</label>
                  <input
                    type="password"
                    className="finput"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label className="flbl">Confirm New Password</label>
                  <input
                    type="password"
                    className="finput"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    type="button"
                    className="btn-s"
                    onClick={() => setShowPasswordModal(false)}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-p"
                    disabled={passwordLoading}
                    style={{ flex: 1 }}
                  >
                    {passwordLoading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && setShowNewChat(false)}>
          <div className="modal" style={{ width: '400px', maxWidth: '95vw' }}>
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

      {/* Draggable Floating Contact Developer Button */}
      <DraggableContactButton />
    </div>
  );
};

export default GuardDashboard;
