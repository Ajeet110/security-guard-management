import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';

const GroupManagementModal = ({ onClose }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await api.get('/groups/default');
      setGroups(res.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    if (!window.confirm('Initialize default groups? This will create:\n- All Managers\n- All Supervisors\n- All Guards\n- Everyone')) {
      return;
    }

    setInitializing(true);
    try {
      await api.post('/groups/initialize');
      alert('Groups initialized successfully!');
      fetchGroups();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to initialize groups');
    } finally {
      setInitializing(false);
    }
  };

  const handleSync = async () => {
    if (!window.confirm('Sync all users to their role-based groups? This will ensure all users are in the correct groups.')) {
      return;
    }

    setSyncing(true);
    try {
      const res = await api.post('/groups/sync');
      alert(`Groups synced successfully! ${res.data.synced_count} memberships updated.`);
      fetchGroups();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to sync groups');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && onClose()}>
      <div className="modal" style={{ width: '600px' }}>
        <div className="modal-head">
          <h3>Automatic Group Management</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="modal-body">
          {/* Info Box */}
          <div style={{
            background: 'rgba(0, 188, 212, 0.1)',
            border: '1px solid rgba(0, 188, 212, 0.3)',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '20px',
            fontSize: '13px',
            color: 'var(--tl)'
          }}>
            <i className="fa-solid fa-info-circle" style={{ marginRight: '6px' }}></i>
            Users are automatically added to groups based on their role when created.
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <button
              className="btn-p"
              onClick={handleInitialize}
              disabled={initializing || groups.length >= 4}
              style={{ flex: 1 }}
            >
              {initializing ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>
                  Initializing...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i>
                  Initialize Groups
                </>
              )}
            </button>
            <button
              className="btn-s"
              onClick={handleSync}
              disabled={syncing || groups.length === 0}
              style={{ flex: 1, color: 'var(--grn)', borderColor: 'rgba(0, 200, 83, 0.3)' }}
            >
              {syncing ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>
                  Syncing...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-sync" style={{ marginRight: '6px' }}></i>
                  Sync All Users
                </>
              )}
            </button>
          </div>

          {/* Groups List */}
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
            Default Groups
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px' }}></i>
              <div style={{ marginTop: '12px' }}>Loading groups...</div>
            </div>
          ) : groups.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              background: 'var(--card)',
              borderRadius: '10px',
              border: '1px solid var(--bd)'
            }}>
              <i className="fa-solid fa-users" style={{ fontSize: '48px', color: 'var(--t3)', marginBottom: '12px' }}></i>
              <div style={{ fontSize: '14px', color: 'var(--t2)', marginBottom: '8px' }}>
                No groups found
              </div>
              <div style={{ fontSize: '12px', color: 'var(--t3)' }}>
                Click "Initialize Groups" to create default groups
              </div>
            </div>
          ) : (
            <div style={{
              background: 'var(--card)',
              border: '1px solid var(--bd)',
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              {groups.map((group, idx) => {
                const icons = {
                  'All Managers': { icon: 'fa-briefcase', color: 'var(--blu)' },
                  'All Supervisors': { icon: 'fa-hard-hat', color: 'var(--ylw)' },
                  'All Guards': { icon: 'fa-shield', color: 'var(--grn)' },
                  'Everyone': { icon: 'fa-users', color: 'var(--tl)' }
                };

                const groupIcon = icons[group.name] || { icon: 'fa-users', color: 'var(--t3)' };

                return (
                  <div
                    key={group.id}
                    style={{
                      padding: '14px 16px',
                      borderBottom: idx < groups.length - 1 ? '1px solid var(--bd)' : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: `${groupIcon.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <i className={`fa-solid ${groupIcon.icon}`} style={{ color: groupIcon.color, fontSize: '18px' }}></i>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>
                        {group.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--t3)' }}>
                        {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <span className="badge badge-g">
                      <i className="fa-solid fa-check" style={{ fontSize: '9px' }}></i> Active
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* How It Works */}
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: 'var(--card)',
            borderRadius: '10px',
            border: '1px solid var(--bd)'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>
              How Automatic Groups Work:
            </div>
            <div style={{ fontSize: '12px', color: 'var(--t2)', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '6px' }}>
                <i className="fa-solid fa-check" style={{ color: 'var(--grn)', marginRight: '6px' }}></i>
                When a <strong>Manager</strong> is created → Added to "All Managers" + "Everyone"
              </div>
              <div style={{ marginBottom: '6px' }}>
                <i className="fa-solid fa-check" style={{ color: 'var(--grn)', marginRight: '6px' }}></i>
                When a <strong>Supervisor</strong> is created → Added to "All Supervisors" + "Everyone"
              </div>
              <div style={{ marginBottom: '6px' }}>
                <i className="fa-solid fa-check" style={{ color: 'var(--grn)', marginRight: '6px' }}></i>
                When a <strong>Guard</strong> is created → Added to "All Guards" + "Everyone"
              </div>
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--bd)' }}>
                <i className="fa-solid fa-info-circle" style={{ color: 'var(--tl)', marginRight: '6px' }}></i>
                Users are automatically removed from groups when deleted
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupManagementModal;
