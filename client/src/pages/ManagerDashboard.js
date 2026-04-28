import React, { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { getBaseURL } from '../config/api';
import DashboardLayout from '../components/DashboardLayout';
import Avatar from '../components/Avatar';
import UserManagementModal from '../components/UserManagementModal';
import SettingsModal from '../components/SettingsModal';
import AttendanceDashboard from '../components/AttendanceDashboard';

const ManagerDashboard = () => {
  const { user } = useAuth();
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
  const [showManagement, setShowManagement] = useState(false);
  const [managementUser, setManagementUser] = useState(null);
  const [chatConversationId, setChatConversationId] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    fetchDashboardData();
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
      const usersRes = await api.get('/"users/hierarchy');
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

  return (
    <DashboardLayout onAddUser={() => setShowAddUser(true)}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
            Manager Dashboard
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--t2)' }}>
            My Area: {user.location || 'Assigned Zone'}
          </p>
        </div>
        <button
          className="btn-s"
          onClick={() => setShowSettings(true)}
          style={{ color: 'var(--blu)', borderColor: 'rgba(33, 150, 243, 0.3)' }}
        >
          <i className="fa-solid fa-gear" style={{ marginRight: '6px' }}></i>
          Settings
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div className="stat">
          <div className="lbl">My Supervisors</div>
          <div className="num" style={{ color: 'var(--ylw)' }}>{stats.supervisors}</div>
          <i className="fa-solid fa-hard-hat ico" style={{ color: 'var(--ylw)' }}></i>
        </div>

        <div className="stat">
          <div className="lbl">Guards Under Me</div>
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

      {/* Modals */}
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

  React.useEffect(() => {
    fetchDocuments();
  }, [user.id]);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${getBaseURL()}/api/documents/user/${user.id}`);
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
      await axios.post(`${getBaseURL()}/api/documents/verify/${doc.id}`, {});
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
      await axios.post(`${getBaseURL()}/api/documents/reject/${doc.id}`, {
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
      const response = await api.post('/"chat/conversation/personal', 
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
    { key: 'bank_passbook', label: 'Bank Passbook', icon: 'fa-building-columns' }
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
                  {visiblePasswords[user.id] ? (user.display_password || 'Not available') : '••••••'}
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

export default ManagerDashboard;
