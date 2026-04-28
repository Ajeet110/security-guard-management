import React, { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { getBaseURL } from '../config/api';
import DashboardLayout from '../components/DashboardLayout';
import Avatar from '../components/Avatar';
import UserManagementModal from '../components/UserManagementModal';
import SettingsModal from '../components/SettingsModal';
import AttendanceDashboard from '../components/AttendanceDashboard';

const SupervisorDashboard = () => {
  const { user } = useAuth();
  const [myGuards, setMyGuards] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, total: 0 });
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

      // Get guards under this supervisor
      const guards = users.filter(u => u.parent_id === user.id && u.role === 'Guard');
      setMyGuards(guards);

      // Fetch attendance for today
      const today = new Date().toISOString().split('T')[0];
      const attendanceRes = await api.get(`/attendance/records?date=${today}`);
      
      const presentGuards = attendanceRes.data.filter(a => 
        guards.some(g => g.id === a.user_id)
      );
      
      setAttendanceStats({
        present: presentGuards.length,
        total: guards.length
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const attendancePercentage = attendanceStats.total > 0 
    ? Math.round((attendanceStats.present / attendanceStats.total) * 100) 
    : 0;

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
    <DashboardLayout onAddUser={() => {}}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
            Supervisor Dashboard
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--t2)' }}>
            {user.location || 'Assigned Area'}
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
          <div className="lbl">Active Patrols</div>
          <div className="num" style={{ color: 'var(--tl)' }}>7</div>
          <i className="fa-solid fa-route ico" style={{ color: 'var(--tl)' }}></i>
        </div>

        <div className="stat">
          <div className="lbl">Guard Attendance (Today)</div>
          <div className="num" style={{ fontSize: '28px' }}>
            <span style={{ color: 'var(--grn)' }}>{attendanceStats.present}</span>
            <span style={{ color: 'var(--t3)', fontSize: '18px' }}>/{attendanceStats.total}</span>
          </div>
          <div className="pbar" style={{ marginTop: '8px' }}>
            <div 
              className="pfill" 
              style={{
                width: `${attendancePercentage}%`,
                background: 'linear-gradient(90deg, var(--grnD), var(--grn))'
              }}
            ></div>
          </div>
        </div>

        <div className="stat">
          <div className="lbl">Recent Incidents</div>
          <div className="num" style={{ color: 'var(--red)' }}>2</div>
          <i className="fa-solid fa-triangle-exclamation ico" style={{ color: 'var(--red)' }}></i>
        </div>
      </div>

      {/* Attendance Dashboard */}
      <AttendanceDashboard userRole="Supervisor" userId={user.id} />

      {/* Shift Assignments Table */}
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
          Shift Assignments
        </div>

        <table className="tbl">
          <thead>
            <tr>
              <th>Guard Name</th>
              <th>Location</th>
              <th>Shift</th>
              <th>Patrol %</th>
              <th>Created By</th>
            </tr>
          </thead>
          <tbody>
            {myGuards.map(guard => {
              // Remove random patrol percentage - not implemented yet
              // Can be added later when patrol tracking feature is implemented
              
              return (
                <tr 
                  key={guard.id} 
                  style={{ cursor: 'pointer' }}
                  onClick={() => openProfile(guard)}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Avatar user={guard} size="sm" online={guard.is_online} />
                      {guard.name}
                    </div>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--t2)' }}>
                    {guard.location || 'Not assigned'}
                  </td>
                  <td>
                    <span className="badge badge-b">
                      {guard.shift || 'Day 6AM-2PM'}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--t2)' }}>
                    {/* Patrol tracking feature - to be implemented */}
                    <span style={{ opacity: 0.5 }}>-</span>
                  </td>
                  <td style={{ color: 'var(--t2)', fontSize: '12px' }}>
                    {guard.creator_name ? `${guard.creator_name} (${guard.creator_role})` : 'System'}
                  </td>
                </tr>
              );
            })}
            {myGuards.length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--t3)', padding: '30px' }}>
                  No guards assigned yet
                </td>
              </tr>
            )}
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
          onRefresh={fetchDashboardData}
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

// Profile Modal Component with Document Verification
const ProfileModal = ({ user, onClose, onOpenChat, onManageClick, onRefresh, visiblePasswords, togglePasswordVisibility }) => {
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
      if (onRefresh) onRefresh();
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
      if (onRefresh) onRefresh();
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
      <div className="modal" style={{ maxWidth: '600px' }}>
        <div className="modal-head">
          <h3>Guard Profile</h3>
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

          {/* Documents with Verification */}
          {user.role === 'Guard' && (
            <>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
                Documents {loading && <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '11px', marginLeft: '6px' }}></i>}
              </div>
              {docItems.map(doc => {
                const status = getDocStatus(doc.key);
                const isPending = status.doc && !status.doc.is_verified && !status.doc.is_rejected;
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
                      {isPending && (
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

export default SupervisorDashboard;
