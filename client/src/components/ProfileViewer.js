import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import Avatar from './Avatar';

const ProfileViewer = ({ userId, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/users/profile/${userId}`);
      // Client-side privacy filter (defense in depth)
      const filteredProfile = filterPrivateData(response.data);
      setProfile(filteredProfile);
    } catch (error) {
      console.error('Load profile error:', error);
      alert('Failed to load profile');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // Client-side privacy filter - only allow public fields
  const filterPrivateData = (user) => {
    if (!user) return null;
    
    const { 
      id, 
      user_id,
      name, 
      profile_photo, 
      role, 
      is_online, 
      last_seen,
      mobile,
      email,
      location,
      shift,
      documents,
      attendance_count,
      profile_completion
    } = user;
    
    return {
      id,
      user_id,
      name,
      profile_photo,
      role,
      is_online,
      last_seen,
      mobile,
      email,
      location,
      shift,
      documents,
      attendance_count,
      profile_completion
    };
  };

  const formatLastSeen = (lastSeenDate) => {
    if (!lastSeenDate) return 'Unknown';
    
    const now = new Date();
    const lastSeen = new Date(lastSeenDate);
    const diffMs = now - lastSeen;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    
    return lastSeen.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <div 
      className="modal-bg" 
      onClick={(e) => e.target.className === 'modal-bg' && onClose()}
    >
      <div className="modal" style={{ width: '400px', textAlign: 'center' }}>
        <div className="modal-head">
          <h3>Profile</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        <div className="modal-body">
          {loading ? (
            <div style={{ padding: '40px', color: 'var(--t3)' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '32px' }}></i>
              <div style={{ marginTop: '12px' }}>Loading profile...</div>
            </div>
          ) : profile ? (
            <div>
              {/* Large Avatar */}
              <div style={{ marginBottom: '20px' }}>
                <Avatar 
                  user={profile} 
                  size="xl" 
                  online={profile.is_online}
                  style={{
                    width: '120px',
                    height: '120px',
                    fontSize: '48px',
                    margin: '0 auto'
                  }}
                />
              </div>

              {/* Name */}
              <div style={{
                fontSize: '24px',
                fontWeight: 600,
                marginBottom: '8px',
                color: 'var(--t1)'
              }}>
                {profile.name}
              </div>

              {/* Role and User ID */}
              <div style={{
                fontSize: '14px',
                color: 'var(--t2)',
                marginBottom: '8px'
              }}>
                {profile.role} • ID: <span style={{ fontFamily: 'monospace', color: 'var(--grn)' }}>{profile.user_id}</span>
              </div>

              {/* Online Status */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '20px',
                background: profile.is_online ? 'rgba(0, 200, 83, 0.1)' : 'var(--card)',
                marginBottom: '12px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: profile.is_online ? 'var(--grn)' : 'var(--t3)'
                }}></div>
                <span style={{
                  fontSize: '13px',
                  color: profile.is_online ? 'var(--grn)' : 'var(--t2)',
                  fontWeight: 500
                }}>
                  {profile.is_online ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Last Seen */}
              {!profile.is_online && profile.last_seen && (
                <div style={{
                  fontSize: '12px',
                  color: 'var(--t3)',
                  marginBottom: '12px'
                }}>
                  Last seen: {formatLastSeen(profile.last_seen)}
                </div>
              )}

              {/* Additional Info Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '20px'
              }}>
                {profile.mobile && (
                  <div style={{ background: 'var(--card)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Phone
                    </div>
                    <div style={{ fontSize: '13px' }}>{profile.mobile}</div>
                  </div>
                )}

                {profile.email && (
                  <div style={{ background: 'var(--card)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Email
                    </div>
                    <div style={{ fontSize: '13px' }}>{profile.email}</div>
                  </div>
                )}

                {profile.location && (
                  <div style={{ background: 'var(--card)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Location
                    </div>
                    <div style={{ fontSize: '13px' }}>{profile.location}</div>
                  </div>
                )}

                {profile.shift && (
                  <div style={{ background: 'var(--card)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Shift
                    </div>
                    <div style={{ fontSize: '13px' }}>{profile.shift}</div>
                  </div>
                )}


              </div>

              {/* Attendance Count */}
              {profile.attendance_count !== undefined && (
                <div style={{
                  background: 'var(--card)',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '12px'
                }}>
                  <div style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Attendance Records
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--grn)' }}>
                    {profile.attendance_count}
                  </div>
                </div>
              )}

              {/* Profile Completion */}
              {profile.profile_completion !== undefined && (
                <div style={{
                  background: 'var(--card)',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '20px'
                }}>
                  <div style={{ fontSize: '10px', color: 'var(--t3)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Profile Completion
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--grn)' }}>
                    {profile.profile_completion}%
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button 
                className="btn-s" 
                onClick={onClose}
                style={{ marginTop: '20px', width: '100%' }}
              >
                Close
              </button>
            </div>
          ) : (
            <div style={{ padding: '40px', color: 'var(--t3)' }}>
              Profile not found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileViewer;
