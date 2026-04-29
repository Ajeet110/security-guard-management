import React, { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { getBaseURL } from '../config/api';
import DashboardLayout from '../components/DashboardLayout';
import Avatar from '../components/Avatar';
import UserManagementModal from '../components/UserManagementModal';
import SettingsModal from '../components/SettingsModal';
import AttendanceDashboard from '../components/AttendanceDashboard';
import RecycleBinModal from '../components/RecycleBinModal';
import DraggableContactButton from '../components/DraggableContactButton';

const ManagerDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [stats, setStats] = useState({
    supervisors: 0,
    guards: 0,
    activeInTeam: 0
  });
  const [teamMembers, setTeamMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showManagement, setShowManagement] = useState(false);
  const [managementUser, setManagementUser] = useState(null);
  const [chatConversationId, setChatConversationId] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const handleUserDataUpdated = () => {
      fetchDashboardData();
    };
    window.addEventListener('userDataUpdated', handleUserDataUpdated);
    return () => window.removeEventListener('userDataUpdated', handleUserDataUpdated);
  }, []);

  // Mobile resize listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen for chat open requests
  useEffect(() => {
    if (chatConversationId) {
      window.dispatchEvent(new CustomEvent('openChat', { detail: { conversationId: chatConversationId } }));
      setChatConversationId(null);
    }
  }, [chatConversationId]);

  const fetchDashboardData = async () => {
    try {
      // Fetch all users
      const usersRes = await api.get('/users/hierarchy');
      const users = usersRes.data;
      setAllUsers(users);

      // Get descendants (users under this manager)
      const descendants = getDescendants(user.id, users);
      setTeamMembers(descendants.slice(0, 12));

      // Calculate stats
      setStats({
        supervisors: descendants.filter(u => u.role === 'Supervisor').length,
        guards: descendants.filter(u => u.role === 'Guard').length,
        activeInTeam: descendants.filter(u => u.is_online).length + 1 // +1 for manager
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const getDescendants = (userId, users) => {
    const children = users.filter(u => u.parent_id === userId);
    let all = [...children];
    children.forEach(child => {
      all = all.concat(getDescendants(child.id, users));
    });
    return all;
  };

  const openProfile = (user) => {
    setSelectedUser(user);
    setShowProfile(true);
  };

  const openManagement = (user) => {
    setManagementUser(user);
    setShowManagement(true);
  };

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const renderDashboard = () => (
    <>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
            Manager Dashboard
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--t2)' }}>
            My Area: {user.location || 'Assigned Zone'}
          </p>
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-s"
              onClick={() => setShowRecycleBin(true)}
              style={{ color: 'var(--red)', borderColor: 'rgba(255, 82, 82, 0.3)' }}
            >
              <i className="fa-solid fa-trash-can-arrow-up" style={{ marginRight: '6px' }}></i>
              Recycle Bin
            </button>
            <button
              className="btn-s"
              onClick={() => setShowSettings(true)}
              style={{ color: 'var(--blu)', borderColor: 'rgba(33, 150, 243, 0.3)' }}
            >
              <i className="fa-solid fa-gear" style={{ marginRight: '6px' }}></i>
              Settings
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards with Add User Options */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div className="stat">
          <div className="lbl">
            <span>My Supervisors</span>
            <button 
              className="btn-icon btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRole('Supervisor');
                setShowAddUser(true);
              }}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '28px',
                height: '28px',
                fontSize: '12px',
                background: 'rgba(245, 158, 11, 0.2)',
                borderColor: 'rgba(245, 158, 11, 0.3)'
              }}
            >
              <i className="fa-solid fa-plus"></i>
            </button>
          </div>
          <div className="num" style={{ color: 'var(--ylw)' }}>{stats.supervisors}</div>
          <i className="fa-solid fa-hard-hat ico" style={{ color: 'var(--ylw)' }}></i>
        </div>

        <div className="stat">
          <div className="lbl">
            <span>Guards Under Me</span>
            <button 
              className="btn-icon btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRole('Guard');
                setShowAddUser(true);
              }}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '28px',
                height: '28px',
                fontSize: '12px',
                background: 'rgba(16, 185, 129, 0.2)',
                borderColor: 'rgba(16, 185, 129, 0.3)'
              }}
            >
              <i className="fa-solid fa-plus"></i>
            </button>
          </div>
          <div className="num" style={{ color: 'var(--grn)' }}>{stats.guards}</div>
          <i className="fa-solid fa-shield ico" style={{ color: 'var(--grn)' }}></i>
        </div>

        <div className="stat">
          <div className="lbl">Active in My Team</div>
          <div className="num" style={{ color: 'var(--grn)' }}>{stats.activeInTeam}</div>
          <i className="fa-solid fa-wifi ico" style={{ color: 'var(--grn)' }}></i>
        </div>
      </div>

      {/* Attendance Dashboard */}
      <AttendanceDashboard userRole="Manager" userId={user.id} />

      {/* Team Members Table */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--bd)',
        borderRadius: '14px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--bd)',
          fontSize: '14px',
          fontWeight: 600
        }}>
          My Team Members
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created By</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map(member => {
              const badgeClass = member.role === 'Supervisor' ? 'badge-o' : 'badge-g';
              
              return (
                <tr 
                  key={member.id} 
                  style={{ cursor: 'pointer' }}
                  onClick={() => openProfile(member)}
                >
                  <td style={{
                    fontFamily: 'monospace',
                    color: 'var(--grn)',
                    fontSize: '12px'
                  }}>
                    {member.user_id}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Avatar user={member} size="sm" />
                      {member.name}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${badgeClass}`}>{member.role}</span>
                  </td>
                  <td>
                    <span className={`badge ${member.is_online ? 'badge-g' : 'badge-r'}`}>
                      <i className="fa-solid fa-circle" style={{ fontSize: '6px' }}></i>
                      {' '}{member.is_online ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--t2)', fontSize: '12px' }}>
                    {member.creator_name ? `${member.creator_name} (${member.creator_role})` : 'System'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <DashboardLayout onAddUser={() => setShowAddUser(true)}>
      {isMobile ? (
        <>
          <div style={{ paddingBottom: '70px' }}>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'team' && (
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3>My Team</h3>
                  <button
                    className="btn-p"
                    onClick={() => setShowAddUser(true)}
                    style={{ 
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #FF6B35, #F7931E)',
                      border: 'none'
                    }}
                  >
                    <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i>
                    Add User
                  </button>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '20px' }}>
                  View and manage your team members
                </div>
                {teamMembers.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {teamMembers.map(member => (
                      <div 
                        key={member.id}
                        onClick={() => openProfile(member)}
                        style={{
                          background: 'var(--card)',
                          border: '1px solid var(--bd)',
                          borderRadius: '12px',
                          padding: '16px',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <Avatar user={member} size="md" />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', fontWeight: 600 }}>{member.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--t3)', fontFamily: 'monospace' }}>
                              {member.user_id}
                            </div>
                          </div>
                          <span className={`badge ${member.role === 'Supervisor' ? 'badge-o' : 'badge-g'}`}>
                            {member.role}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--t2)' }}>
                          Created by: {member.creator_name ? `${member.creator_name} (${member.creator_role})` : 'System'}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--t3)', padding: '40px 20px' }}>
                    No team members yet
                  </div>
                )}
              </div>
            )}
            {activeTab === 'reports' && (
              <div style={{ padding: '20px' }}>
                <h3 style={{ marginBottom: '16px' }}>Reports & Analytics</h3>
                <div style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '12px' }}>
                  View attendance reports and team analytics
                </div>
                <button
                  className="btn-s"
                  onClick={() => setShowRecycleBin(true)}
                  style={{ width: '100%', color: 'var(--red)', borderColor: 'rgba(255, 82, 82, 0.3)' }}
                >
                  <i className="fa-solid fa-trash-can-arrow-up" style={{ marginRight: '8px' }}></i>
                  Recycle Bin
                </button>
              </div>
            )}
          </div>

          {/* Mobile Bottom Navigation */}
          <div className="bottom-nav">
            <div 
              className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <i className="fa-solid fa-chart-line"></i>
              <span>Dashboard</span>
            </div>
            <div 
              className={`nav-btn ${activeTab === 'team' ? 'active' : ''}`}
              onClick={() => setActiveTab('team')}
            >
              <i className="fa-solid fa-users"></i>
              <span>Team</span>
            </div>
            <div 
              className={`nav-btn ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <i className="fa-solid fa-file-alt"></i>
              <span>Reports</span>
            </div>
          </div>
        </>
      ) : (
        renderDashboard()
      )}

      {/* Modals */}
      {showAddUser && (
        <AddUserModal 
          selectedRole={selectedRole}
          onClose={() => {
            setShowAddUser(false);
            setSelectedRole(null);
            fetchDashboardData();
          }}
        />
      )}

      {showProfile && selectedUser && (
        <ProfileModal
          user={selectedUser}
          onClose={() => {
            setShowProfile(false);
            setSelectedUser(null);
          }}
          onOpenChat={(convId) => setChatConversationId(convId)}
          onManageClick={openManagement}
          visiblePasswords={visiblePasswords}
          togglePasswordVisibility={togglePasswordVisibility}
        />
      )}

      {showManagement && managementUser && (
        <UserManagementModal
          user={managementUser}
          onClose={() => {
            setShowManagement(false);
            setManagementUser(null);
          }}
          onUpdate={fetchDashboardData}
        />
      )}

      {showSettings && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showRecycleBin && (
        <RecycleBinModal
          isOpen={showRecycleBin}
          onClose={() => setShowRecycleBin(false)}
        />
      )}

      {/* Draggable Floating Contact Developer Button */}
      <DraggableContactButton />
    </DashboardLayout>
  );
};

// Profile Modal Component
const ProfileModal = ({ user, onClose, onOpenChat, onManageClick, visiblePasswords, togglePasswordVisibility }) => {
  const [startingChat, setStartingChat] = React.useState(false);
  const [documents, setDocuments] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [verifying, setVerifying] = React.useState(null);
  const [rejecting, setRejecting] = React.useState(null);
  const [showRejectModal, setShowRejectModal] = React.useState(false);
  const [rejectDocType, setRejectDocType] = React.useState(null);
  const [rejectionReason, setRejectionReason] = React.useState('');

  // Get actual password from database
  const getActualPassword = (user) => {
    // Return the actual stored password if available
    if (user.display_password) {
      return user.display_password;
    }
    
    // Fallback to generated default if no stored password (for old users)
    if (!user.user_id) return 'Not available';
    const lastFour = user.user_id.slice(-4);
    const rolePrefix = {
      'Manager': 'Mgr',
      'Supervisor': 'Sup',
      'Guard': 'Grd',
      'Owner': 'Own'
    };
    const prefix = rolePrefix[user.role] || 'Usr';
    return `${prefix}@${lastFour}`;
  };

  React.useEffect(() => {
    fetchDocuments();
  }, [user.id]);

  const fetchDocuments = async () => {
    try {
      const response = await api.get(`/documents/user/${user.id}`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDocument = async (docType) => {
    const doc = documents.find(d => d.doc_type === docType);
    if (!doc) return;

    if (!window.confirm(`Verify ${docType.replace('_', ' ')} for ${user.name}?`)) {
      return;
    }

    setVerifying(docType);
    try {
      await api.post(`/documents/verify/${doc.id}`, {});
      alert('Document verified successfully!');
      fetchDocuments();
    } catch (error) {
      console.error('Verify document error:', error);
      alert(error.response?.data?.error || 'Failed to verify document');
    } finally {
      setVerifying(null);
    }
  };

  const handleRejectDocument = async () => {
    const doc = documents.find(d => d.doc_type === rejectDocType);
    console.log('Rejecting document:', doc);
    console.log('All documents:', documents);
    
    if (!doc || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    if (!doc.id) {
      alert('Document ID is missing. Please refresh and try again.');
      return;
    }

    setRejecting(rejectDocType);
    try {
      console.log('Sending reject request for document ID:', doc.id);
      await api.post(`/documents/reject/${doc.id}`, {
        reason: rejectionReason
      });
      alert(`Document rejected and deleted. Reason: ${rejectionReason}`);
      setShowRejectModal(false);
      setRejectionReason('');
      setRejectDocType(null);
      fetchDocuments();
    } catch (error) {
      console.error('Reject document error:', error);
      console.error('Error response:', error.response?.data);
      alert(error.response?.data?.error || 'Failed to reject document');
    } finally {
      setRejecting(null);
    }
  };

  const openRejectModal = (docType) => {
    setRejectDocType(docType);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleStartChat = async () => {
    setStartingChat(true);
    try {
      const response = await api.post('/chat/conversation/personal', 
        { user_id: user.id });
      
      onClose();
      if (onOpenChat) {
        onOpenChat(response.data.conversation_id);
      }
    } catch (error) {
      console.error('Start chat error:', error);
      alert('Failed to start chat');
    } finally {
      setStartingChat(false);
    }
  };

  const docItems = [
    { key: 'aadhaar', label: 'Aadhaar Card', icon: 'fa-id-card' },
    { key: 'pan', label: 'PAN Card', icon: 'fa-file-invoice' },
    { key: 'police_verification', label: 'Police Verification', icon: 'fa-shield-halved' },
    { key: 'bank_passbook', label: 'Bank Passbook', icon: 'fa-building-columns' },
    { key: '10th_marksheet', label: '10th Marksheet', icon: 'fa-graduation-cap' },
    { key: '12th_marksheet', label: '12th Marksheet', icon: 'fa-graduation-cap' }
  ];

  const getDocStatus = (docType) => {
    const doc = documents.find(d => d.doc_type === docType);
    if (!doc) return { label: 'Missing', className: 'badge-r', icon: 'fa-xmark', doc: null };
    if (doc.is_verified) return { label: 'Verified', className: 'badge-g', icon: 'fa-circle-check', doc };
    return { label: 'Pending', className: 'badge-o', icon: 'fa-clock', doc };
  };

  return (
    <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>User Profile</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="modal-body">
          {/* Avatar and Name */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <Avatar user={user} size="lg" online={user.is_online} style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: '18px', fontWeight: 700 }}>{user.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '2px' }}>
              {user.role} · ID: <span style={{ color: 'var(--grn)', fontFamily: 'monospace' }}>{user.user_id}</span>
            </div>
            
            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
              <button
                className="btn-p"
                onClick={handleStartChat}
                disabled={startingChat}
                style={{ fontSize: '13px', padding: '8px 20px' }}
              >
                <i className="fa-solid fa-message" style={{ marginRight: '6px' }}></i>
                {startingChat ? 'Starting...' : 'Message'}
              </button>
              <button
                className="btn-s"
                onClick={() => {
                  onClose();
                  onManageClick(user);
                }}
                style={{ fontSize: '13px', padding: '8px 20px', color: 'var(--blu)', borderColor: 'rgba(0, 188, 212, 0.3)' }}
              >
                <i className="fa-solid fa-pen-to-square" style={{ marginRight: '6px' }}></i>
                Manage
              </button>
            </div>
          </div>

          {/* Info Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ background: 'var(--card)', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Phone
              </div>
              <div style={{ fontSize: '13px' }}>{user.mobile || 'Not set'}</div>
            </div>

            <div style={{ background: 'var(--card)', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Status
              </div>
              <span className={`badge ${user.is_online ? 'badge-g' : 'badge-r'}`}>
                {user.is_online ? 'Online' : 'Offline'}
              </span>
            </div>

            <div style={{ background: 'var(--card)', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Location
              </div>
              <div style={{ fontSize: '13px' }}>{user.location || 'Not set'}</div>
            </div>

            <div style={{ background: 'var(--card)', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Shift
              </div>
              <div style={{ fontSize: '13px' }}>{user.shift || 'Not set'}</div>
            </div>

            <div style={{ background: 'var(--card)', borderRadius: '10px', padding: '12px', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Password
              </div>
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 600, 
                  color: 'var(--grn)',
                  fontFamily: 'monospace',
                  letterSpacing: '1px'
                }}>
                  {visiblePasswords[user.id] ? getActualPassword(user) : '••••••'}
                </div>
                <button
                  onClick={() => togglePasswordVisibility(user.id)}
                  style={{
                    background: 'var(--bg2)',
                    border: '1px solid var(--bd)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    color: 'var(--t2)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className={`fa-solid fa-eye${visiblePasswords[user.id] ? '-slash' : ''}`}></i>
                  {visiblePasswords[user.id] ? 'Hide' : 'Show'}
                </button>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '6px' }}>
                {user.display_password ? 'Actual password from database' : 'Default password (user created before update)'}
              </div>
            </div>
          </div>

          {/* Documents */}
          {user.role === 'Guard' && (
            <>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
                Documents {loading && <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '11px', marginLeft: '6px' }}></i>}
              </div>
              {docItems.map(doc => {
                const status = getDocStatus(doc.key);
                const canVerify = status.doc && !status.doc.is_verified && !status.doc.is_rejected;
                const isVerified = status.doc && status.doc.is_verified;
                
                return (
                  <div key={doc.key}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      background: 'var(--card)',
                      borderRadius: '8px',
                      marginBottom: '6px'
                    }}>
                      <i className={`fa-solid ${doc.icon}`} style={{
                        fontSize: '16px',
                        color: 'var(--t3)',
                        width: '20px',
                        textAlign: 'center'
                      }}></i>
                      <span style={{ fontSize: '13px', flex: 1 }}>{doc.label}</span>
                      <span className={`badge ${status.className}`}>
                        <i className={`fa-solid ${status.icon}`} style={{ fontSize: '9px' }}></i> {status.label}
                      </span>
                      {canVerify && (
                        <>
                          <button
                            className="btn-s btn-sm"
                            onClick={() => handleVerifyDocument(doc.key)}
                            disabled={verifying === doc.key}
                            style={{ 
                              color: 'var(--grn)', 
                              borderColor: 'rgba(0, 200, 83, 0.3)',
                              padding: '4px 10px',
                              fontSize: '11px'
                            }}
                          >
                            {verifying === doc.key ? (
                              <i className="fa-solid fa-spinner fa-spin"></i>
                            ) : (
                              <>
                                <i className="fa-solid fa-check" style={{ marginRight: '4px' }}></i>
                                Verify
                              </>
                            )}
                          </button>
                          <button
                            className="btn-s btn-sm"
                            onClick={() => openRejectModal(doc.key)}
                            disabled={rejecting === doc.key}
                            style={{ 
                              color: 'var(--red)', 
                              borderColor: 'rgba(255, 82, 82, 0.3)',
                              padding: '4px 10px',
                              fontSize: '11px'
                            }}
                          >
                            {rejecting === doc.key ? (
                              <i className="fa-solid fa-spinner fa-spin"></i>
                            ) : (
                              <>
                                <i className="fa-solid fa-ban" style={{ marginRight: '4px' }}></i>
                                Reject
                              </>
                            )}
                          </button>
                        </>
                      )}
                      {status.doc && (
                        <>
                          {!isVerified && (
                            <a
                              href={`${getBaseURL()}/${status.doc.file_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                color: 'var(--tl)',
                                fontSize: '11px',
                                textDecoration: 'none',
                                padding: '4px 8px',
                                border: '1px solid rgba(0, 188, 212, 0.3)',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <i className="fa-solid fa-eye"></i>
                              View
                            </a>
                          )}
                          {isVerified && (
                            <a
                              href={`${getBaseURL()}/${status.doc.file_path}`}
                              download
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                color: 'var(--grn)',
                                fontSize: '11px',
                                textDecoration: 'none',
                                padding: '4px 8px',
                                border: '1px solid rgba(0, 200, 83, 0.3)',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <i className="fa-solid fa-download"></i>
                              Download
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && setShowRejectModal(false)} style={{ zIndex: 1001 }}>
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-head">
              <h3>Reject Document</h3>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <label className="flbl">Rejection Reason</label>
                <textarea
                  className="finput"
                  rows="4"
                  placeholder="Enter reason for rejection (e.g., unclear image, expired document, etc.)"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  style={{ resize: 'vertical', minHeight: '80px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-p"
                  onClick={handleRejectDocument}
                  disabled={!rejectionReason.trim() || rejecting}
                  style={{ 
                    flex: 1,
                    background: 'var(--red)', 
                    borderColor: 'var(--red)' 
                  }}
                >
                  {rejecting ? 'Rejecting...' : 'Reject Document'}
                </button>
                <button
                  className="btn-s"
                  onClick={() => setShowRejectModal(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add User Modal Component for ManagerDashboard
const AddUserModal = ({ onClose, selectedRole: propSelectedRole }) => {
  const [formData, setFormData] = useState({
    role: propSelectedRole || '',
    name: '',
    mobile: '',
    location: '',
    shift: '',
    parent_id: ''
  });
  const [previewId, setPreviewId] = useState('Select role to generate');
  const [previewPw, setPreviewPw] = useState('--');
  const [managers, setManagers] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(false);

  // Define functions BEFORE useEffect hooks
  const fetchParentOptions = async () => {
    try {
      const res = await api.get('/users/hierarchy');
      setManagers(res.data.filter(u => u.role === 'Manager'));
      setSupervisors(res.data.filter(u => u.role === 'Supervisor'));
    } catch (error) {
      console.error('Error fetching parent options:', error);
    }
  };

  const generatePreview = () => {
    const now = new Date();
    const id = now.toISOString().replace(/[-:T]/g, '').slice(0, 12);
    setPreviewId(id);
    
    const pwMap = {
      Manager: `Mgr@${id.slice(-4)}`,
      Supervisor: `Sup@${id.slice(-4)}`,
      Guard: `Grd@${id.slice(-4)}`
    };
    setPreviewPw(pwMap[formData.role] || '--');
  };

  useEffect(() => {
    fetchParentOptions();
    if (propSelectedRole) {
      generatePreview();
    }
  }, []);

  useEffect(() => {
    if (formData.role) {
      generatePreview();
    }
  }, [formData.role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/users/create', formData);
      window.dispatchEvent(new CustomEvent('userDataUpdated'));
      alert(`User ${formData.name} created successfully with ID: ${previewId}`);
      onClose();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>Add New User</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            {/* Role Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label className="flbl">Select Role</label>
              <select 
                className="fselect"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <option value="">Choose role...</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Guard">Guard</option>
              </select>
            </div>

            {/* Parent Selection */}
            {formData.role === 'Supervisor' && (
              <div style={{ marginBottom: '16px' }}>
                <label className="flbl">Assign to Manager</label>
                <select 
                  className="fselect"
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  required
                >
                  <option value="">Choose manager...</option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.user_id})</option>
                  ))}
                </select>
              </div>
            )}

            {formData.role === 'Guard' && (
              <div style={{ marginBottom: '16px' }}>
                <label className="flbl">Assign to Supervisor/Manager</label>
                <select 
                  className="fselect"
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  required
                >
                  <option value="">Choose supervisor/manager...</option>
                  {supervisors.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.user_id}) - Supervisor</option>
                  ))}
                  {managers.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.user_id}) - Manager</option>
                  ))}
                </select>
              </div>
            )}

            {/* Name */}
            <div style={{ marginBottom: '16px' }}>
              <label className="flbl">Full Name</label>
              <input
                type="text"
                className="finput"
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Phone */}
            <div style={{ marginBottom: '16px' }}>
              <label className="flbl">Phone Number</label>
              <input
                type="tel"
                className="finput"
                placeholder="10-digit mobile"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </div>

            {/* Location */}
            <div style={{ marginBottom: '16px' }}>
              <label className="flbl">Location / Post</label>
              <input
                type="text"
                className="finput"
                placeholder="e.g. Gate A"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>

            {/* Shift */}
            <div style={{ marginBottom: '20px' }}>
              <label className="flbl">Shift</label>
              <input
                type="text"
                className="finput"
                placeholder="e.g. Day 6AM-2PM, Night 10PM-6AM"
                value={formData.shift}
                onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
              />
              <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '4px' }}>
                Enter custom shift timing
              </div>
            </div>

            {/* Preview */}
            <div style={{
              background: 'var(--card)',
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '4px' }}>
                Auto-Generated ID
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--grn)',
                fontFamily: 'monospace'
              }}>
                {previewId}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '4px' }}>
                Default Password: <span style={{ color: 'var(--t2)' }}>{previewPw}</span>
              </div>
            </div>

            <button type="submit" className="btn-p" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
