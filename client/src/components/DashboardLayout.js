import React, { useState, useEffect } from 'react';
import { useAuth, api } from '../context/AuthContext';
import Avatar from './Avatar';
import HierarchyTree from './HierarchyTree';
import ChatPanel from './ChatPanel';
import SettingsModal from './SettingsModal';
import ProfileViewer from './ProfileViewer';

const DashboardLayout = ({ children, onAddUser }) => {
  const { user, logout } = useAuth();
  const [showCredentials, setShowCredentials] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 860);
  const [mobileTab, setMobileTab] = useState('dashboard');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 860);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    return (
      <div className="pwa">
        <div className="pwa-head">
          <Avatar user={user} size="md" online={true} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
              {user.role} · {user.user_id}
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

        <div className="pwa-body">
          {mobileTab === 'hierarchy' && (
            <div style={{ padding: '12px 8px' }}>
              <div style={{ padding: '0 8px 8px', fontSize: '11px', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Hierarchy
              </div>
              
              {/* Action Buttons for Mobile */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '0 8px 12px' }}>
                <button 
                  className="btn-s" 
                  onClick={() => setShowSearch(true)}
                  style={{ 
                    color: 'var(--blu)', 
                    borderColor: 'rgba(0, 123, 255, 0.3)',
                    padding: '10px 12px',
                    fontSize: '12px'
                  }}
                >
                  <i className="fa-solid fa-search" style={{ marginRight: '6px' }}></i>
                  Search
                </button>

                <button 
                  className="btn-s" 
                  onClick={() => setShowSettings(true)}
                  style={{ 
                    color: 'var(--grn)', 
                    borderColor: 'rgba(0, 200, 83, 0.3)',
                    padding: '10px 12px',
                    fontSize: '12px'
                  }}
                >
                  <i className="fa-solid fa-gear" style={{ marginRight: '6px' }}></i>
                  Settings
                </button>

                {user.role === 'Owner' && (
                  <button 
                    className="btn-s" 
                    onClick={() => setShowCredentials(true)}
                    style={{ 
                      padding: '10px 12px',
                      fontSize: '12px',
                      color: 'var(--ylw)',
                      borderColor: 'rgba(255, 193, 7, 0.3)'
                    }}
                  >
                    <i className="fa-solid fa-key" style={{ marginRight: '6px' }}></i>
                    Credentials
                  </button>
                )}
                
                <button 
                  className="btn-s"
                  onClick={() => setShowResetPassword(true)}
                  style={{ 
                    padding: '10px 12px',
                    fontSize: '12px',
                    color: 'var(--tl)',
                    borderColor: 'rgba(0, 188, 212, 0.3)'
                  }}
                >
                  <i className="fa-solid fa-rotate" style={{ marginRight: '6px' }}></i>
                  Password
                </button>
              </div>

              <div style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto', padding: '0 4px' }}>
                <HierarchyTree userId={user.role === 'Owner' ? '2026' : user.user_id} />
              </div>
              {onAddUser && (
                <div style={{ padding: '12px 8px 6px' }}>
                  <button className="btn-p" onClick={onAddUser} style={{ fontSize: '13px', padding: '11px 20px' }}>
                    <i className="fa-solid fa-user-plus" style={{ marginRight: '6px' }}></i>
                    Add New User
                  </button>
                </div>
              )}
            </div>
          )}

          {mobileTab === 'dashboard' && <div>{children}</div>}
          {mobileTab === 'messages' && <ChatPanel isMobile={true} />}
        </div>

        <div className="bottom-nav">
          <div className={`nav-btn ${mobileTab === 'hierarchy' ? 'active' : ''}`} onClick={() => setMobileTab('hierarchy')}>
            <i className="fa-solid fa-sitemap"></i>
            <span>Hierarchy</span>
          </div>
          <div className={`nav-btn ${mobileTab === 'dashboard' ? 'active' : ''}`} onClick={() => setMobileTab('dashboard')}>
            <i className="fa-solid fa-house"></i>
            <span>Dashboard</span>
          </div>
          <div className={`nav-btn ${mobileTab === 'messages' ? 'active' : ''}`} onClick={() => setMobileTab('messages')}>
            <i className="fa-solid fa-comments"></i>
            <span>Messages</span>
          </div>
        </div>

        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />

        {/* Search Users Modal */}
        {showSearch && (
          <SearchUsersModal
            onClose={() => setShowSearch(false)}
          />
        )}

        {/* View All Credentials Modal */}
        {showCredentials && (
          <ViewCredentialsModal
            onClose={() => setShowCredentials(false)}
          />
        )}

        {/* Reset Password Modal */}
        {showResetPassword && (
          <ResetPasswordModal
            onClose={() => setShowResetPassword(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="dash" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Left Column - Hierarchy */}
      <div className="d-left" style={{
        width: '290px',
        minWidth: '290px',
        background: 'var(--bg2)',
        borderRight: '1px solid var(--bd)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div className="d-header" style={{
          background: 'var(--bg3)',
          borderBottom: '1px solid var(--bd)',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          flexShrink: 0,
          flexWrap: 'wrap'
        }}>
          <Avatar user={user} size="md" online={true} />
          <div style={{ flex: 1, minWidth: '120px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>{user.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
              {user.role} · {user.user_id}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', width: '100%', marginTop: '8px' }}>
            <button 
              className="btn-s" 
              title="Search Users"
              onClick={() => setShowSearch(true)}
              style={{ 
                color: 'var(--blu)', 
                borderColor: 'rgba(0, 123, 255, 0.3)',
                flex: '1 1 calc(50% - 3px)',
                padding: '10px 12px',
                fontSize: '12px'
              }}
            >
              <i className="fa-solid fa-search" style={{ marginRight: '6px' }}></i>
              Search
            </button>

            <button 
              className="btn-s" 
              title="Settings"
              onClick={() => setShowSettings(true)}
              style={{ 
                color: 'var(--grn)', 
                borderColor: 'rgba(0, 200, 83, 0.3)',
                flex: '1 1 calc(50% - 3px)',
                padding: '10px 12px',
                fontSize: '12px'
              }}
            >
              <i className="fa-solid fa-gear" style={{ marginRight: '6px' }}></i>
              Settings
            </button>

            {user.role === 'Owner' && (
              <button 
                className="btn-s" 
                title="View All Credentials"
                onClick={() => setShowCredentials(true)}
                style={{ 
                  flex: '1 1 calc(50% - 3px)',
                  padding: '10px 12px',
                  fontSize: '12px',
                  color: 'var(--ylw)',
                  borderColor: 'rgba(255, 193, 7, 0.3)'
                }}
              >
                <i className="fa-solid fa-key" style={{ marginRight: '6px' }}></i>
                Credentials
              </button>
            )}
            
            <button 
              className="btn-s"
              title="Reset Password"
              onClick={() => setShowResetPassword(true)}
              style={{ 
                flex: '1 1 calc(50% - 3px)',
                padding: '10px 12px',
                fontSize: '12px',
                color: 'var(--tl)',
                borderColor: 'rgba(0, 188, 212, 0.3)'
              }}
            >
              <i className="fa-solid fa-rotate" style={{ marginRight: '6px' }}></i>
              Password
            </button>

            <button 
              className="btn-s" 
              title="Logout"
              onClick={logout}
              style={{ 
                borderColor: 'rgba(255, 82, 82, 0.3)', 
                color: 'var(--red)',
                flex: '1 1 100%',
                padding: '10px 12px',
                fontSize: '12px'
              }}
            >
              <i className="fa-solid fa-right-from-bracket" style={{ marginRight: '6px' }}></i>
              Logout
            </button>
          </div>
        </div>

        {/* Hierarchy Label */}
        <div style={{
          padding: '12px 12px 8px',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--t3)',
          textTransform: 'uppercase',
          letterSpacing: '0.8px'
        }}>
          Hierarchy
        </div>

        {/* Tree */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
          <HierarchyTree userId={user.role === 'Owner' ? '2026' : user.user_id} />
        </div>

        {/* Add User Button */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--bd)' }}>
          <button 
            className="btn-p" 
            onClick={onAddUser}
            style={{ fontSize: '13px', padding: '11px 20px' }}
          >
            <i className="fa-solid fa-user-plus" style={{ marginRight: '6px' }}></i>
            Add New User
          </button>
        </div>
      </div>

      {/* Center Column - Main Content */}
      <div className="d-center" style={{
        flex: 1,
        background: 'var(--bg1)',
        overflowY: 'auto',
        padding: '24px'
      }}>
        {children}
      </div>

      {/* Right Column - Chat */}
      <ChatPanel />

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Search Users Modal */}
      {showSearch && (
        <SearchUsersModal
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* View All Credentials Modal */}
      {showCredentials && (
        <ViewCredentialsModal
          onClose={() => setShowCredentials(false)}
        />
      )}

      {/* Reset Password Modal */}
      {showResetPassword && (
        <ResetPasswordModal
          onClose={() => setShowResetPassword(false)}
        />
      )}
    </div>
  );
};

// Search Users Modal
const SearchUsersModal = ({ onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      console.log('Searching for:', query);
      const response = await api.get(`/users/search?query=${encodeURIComponent(query)}`);
      console.log('Search results:', response.data);
      
      // Validate that all users have an id field
      const validResults = response.data.filter(user => {
        if (!user.id) {
          console.warn('User missing id field:', user);
          return false;
        }
        return true;
      });
      
      setSearchResults(validResults);
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Search failed';
      alert(`Search error: ${errorMessage}`);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleUserClick = (user) => {
    console.log('Opening profile for user:', user);
    if (!user || !user.id) {
      console.error('Invalid user object:', user);
      alert('Cannot open profile: Invalid user data');
      return;
    }
    setSelectedUser(user);
    setShowProfile(true);
  };

  const handleStartChat = async (userId, e) => {
    e.stopPropagation();
    try {
      const response = await api.post('/chat/conversation/personal', { user_id: userId });
      
      // Close modal and trigger chat open
      onClose();
      window.dispatchEvent(new CustomEvent('openChat', { 
        detail: { conversationId: response.data.conversation_id } 
      }));
    } catch (error) {
      console.error('Start chat error:', error);
      alert('Failed to start chat');
    }
  };

  if (showProfile && selectedUser) {
    return (
      <div className="modal-bg">
        <ProfileViewer
          userId={selectedUser.id}
          onClose={() => {
            setShowProfile(false);
            setSelectedUser(null);
          }}
          onBack={() => {
            setShowProfile(false);
            setSelectedUser(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && onClose()}>
      <div className="modal" style={{ width: '600px' }}>
        <div className="modal-head">
          <h3>Search Users</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="modal-body">
          {/* Search Input */}
          <div style={{ marginBottom: '20px' }}>
            <input
              type="text"
              className="finput"
              placeholder="Search by name or user ID..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Search Results */}
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {searching && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--t3)' }}>
                Searching...
              </div>
            )}

            {!searching && searchQuery && searchResults.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--t3)' }}>
                No users found
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <div>
                {searchResults.map(user => (
                  <div
                    key={user.id}
                    onClick={() => handleUserClick(user)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: 'var(--card)',
                      borderRadius: '10px',
                      marginBottom: '8px',
                      border: '1px solid var(--bd)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg3)';
                      e.currentTarget.style.borderColor = 'var(--primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--card)';
                      e.currentTarget.style.borderColor = 'var(--bd)';
                    }}
                  >
                    <Avatar user={user} size="md" online={user.is_online} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{user.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--t3)' }}>
                        {user.role} · ID: {user.user_id}
                      </div>
                      {user.mobile && (
                        <div style={{ fontSize: '11px', color: 'var(--t2)', marginTop: '2px' }}>
                          {user.mobile}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn-s btn-sm"
                        onClick={(e) => handleStartChat(user.id, e)}
                        style={{ color: 'var(--grn)', borderColor: 'rgba(0, 200, 83, 0.3)' }}
                        title="Send Message"
                      >
                        <i className="fa-solid fa-message"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!searching && !searchQuery && (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)' }}>
                <i className="fa-solid fa-search" style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}></i>
                <div>Enter a name or user ID to search</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// View All Credentials Modal
const ViewCredentialsModal = ({ onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  React.useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      const response = await api.get('/users/all-credentials');
      setUsers(response.data);
    } catch (error) {
      console.error('Fetch credentials error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (user) => {
    console.log('Opening profile for user from credentials:', user);
    if (!user || !user.id) {
      console.error('Invalid user object:', user);
      alert('Cannot open profile: Invalid user data');
      return;
    }
    setSelectedUser(user);
    setShowProfile(true);
  };

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.user_id?.toLowerCase().includes(query) ||
      user.mobile?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query)
    );
  });

  if (showProfile && selectedUser) {
    return (
      <div className="modal-bg">
        <ProfileViewer
          userId={selectedUser.id}
          onClose={() => {
            setShowProfile(false);
            setSelectedUser(null);
          }}
          onBack={() => {
            setShowProfile(false);
            setSelectedUser(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && onClose()}>
      <div className="modal" style={{ width: '700px', maxWidth: '95vw' }}>
        <div className="modal-head">
          <h3>All User Credentials</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="modal-body" style={{ padding: '20px' }}>
          {/* Search Input */}
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              className="finput"
              placeholder="Search by name, ID, mobile, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '6px' }}>
                Found {filteredUsers.length} of {users.length} users
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)' }}>
              Loading...
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Mobile</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--t3)' }}>
                        {searchQuery ? 'No users found matching your search' : 'No users found'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr 
                        key={user.user_id}
                        onClick={() => handleUserClick(user)}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--bg3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '';
                        }}
                      >
                        <td style={{ fontFamily: 'monospace', color: 'var(--grn)', fontWeight: 600 }}>
                          {user.user_id}
                        </td>
                        <td>{user.name}</td>
                        <td>
                          <span className={`badge ${
                            user.role === 'Manager' ? 'badge-b' :
                            user.role === 'Supervisor' ? 'badge-o' : 'badge-g'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--t2)' }}>
                          {user.mobile || '-'}
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--t3)' }}>
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Reset Password Modal
const ResetPasswordModal = ({ onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(currentPassword, newPassword);
      alert('Password reset successfully');
      onClose();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && onClose()}>
      <div className="modal" style={{ width: '450px' }}>
        <div className="modal-head">
          <h3>Reset Password</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label className="flbl">Current Password</label>
              <input
                type="password"
                className="finput"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="flbl">New Password</label>
              <input
                type="password"
                className="finput"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
                required
              />
            </div>

            <button type="submit" className="btn-p" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
