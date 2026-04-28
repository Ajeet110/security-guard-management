import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Avatar from './Avatar';

const UserManagementModal = ({ user, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    location: user.location || '',
    shift: user.shift || '',
    mobile: user.mobile || ''
  });
  const [transferData, setTransferData] = useState({
    new_parent_id: ''
  });
  const [availableParents, setAvailableParents] = useState([]);

  useEffect(() => {
    if (activeTab === 'transfer') {
      fetchAvailableParents();
    }
  }, [activeTab]);

  const fetchAvailableParents = async () => {
    try {
      const res = await axios.get('/users/hierarchy');
      let parents = [];

      if (user.role === 'Guard') {
        parents = res.data.filter(u => 
          ['Supervisor', 'Manager'].includes(u.role) && u.id !== user.parent_id
        );
      } else if (user.role === 'Supervisor') {
        parents = res.data.filter(u => 
          ['Manager', 'Owner'].includes(u.role) && u.id !== user.parent_id
        );
      } else if (user.role === 'Manager') {
        parents = res.data.filter(u => u.role === 'Owner' && u.id !== user.parent_id);
      }

      setAvailableParents(parents);
    } catch (error) {
      console.error('Error fetching parents:', error);
    }
  };

  const handleUpdateJob = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.put(`/management/user/${user.id}/job`, formData);
      alert('Job details updated successfully!');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update job details');
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    
    if (!transferData.new_parent_id) {
      alert('Please select a new supervisor/manager');
      return;
    }

    if (!window.confirm(`Are you sure you want to transfer ${user.name}?`)) {
      return;
    }

    setLoading(true);

    try {
      await axios.put(`/management/user/${user.id}/transfer`, transferData);
      alert('User transferred successfully!');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to transfer user');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);

    try {
      await axios.delete(`/management/user/${user.id}`);
      alert('User deleted successfully!');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && onClose()}>
      <div className="modal" style={{ width: '600px' }}>
        <div className="modal-head">
          <h3>Manage User - {user.name}</h3>
          <button className="modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--bd)',
          padding: '0 20px'
        }}>
          <button
            onClick={() => setActiveTab('details')}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 20px',
              cursor: 'pointer',
              color: activeTab === 'details' ? 'var(--grn)' : 'var(--t2)',
              borderBottom: activeTab === 'details' ? '2px solid var(--grn)' : 'none',
              fontWeight: activeTab === 'details' ? 600 : 400,
              fontSize: '13px'
            }}
          >
            <i className="fa-solid fa-pen-to-square" style={{ marginRight: '6px' }}></i>
            Edit Details
          </button>
          <button
            onClick={() => setActiveTab('transfer')}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 20px',
              cursor: 'pointer',
              color: activeTab === 'transfer' ? 'var(--grn)' : 'var(--t2)',
              borderBottom: activeTab === 'transfer' ? '2px solid var(--grn)' : 'none',
              fontWeight: activeTab === 'transfer' ? 600 : 400,
              fontSize: '13px'
            }}
          >
            <i className="fa-solid fa-right-left" style={{ marginRight: '6px' }}></i>
            Transfer
          </button>
          <button
            onClick={() => setActiveTab('delete')}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 20px',
              cursor: 'pointer',
              color: activeTab === 'delete' ? 'var(--red)' : 'var(--t2)',
              borderBottom: activeTab === 'delete' ? '2px solid var(--red)' : 'none',
              fontWeight: activeTab === 'delete' ? 600 : 400,
              fontSize: '13px'
            }}
          >
            <i className="fa-solid fa-trash" style={{ marginRight: '6px' }}></i>
            Delete
          </button>
        </div>

        <div className="modal-body">
          {/* User Info Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px',
            background: 'var(--card)',
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            <Avatar user={user} size="md" online={user.is_online} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>{user.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--t3)' }}>
                {user.role} · ID: {user.user_id}
              </div>
            </div>
            <span className={`badge ${user.is_online ? 'badge-g' : 'badge-r'}`}>
              {user.is_online ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Edit Details Tab */}
          {activeTab === 'details' && (
            <form onSubmit={handleUpdateJob}>
              <div style={{ marginBottom: '16px' }}>
                <label className="flbl">Location / Post</label>
                <input
                  type="text"
                  className="finput"
                  placeholder="e.g. Gate A, Tower 1 Lobby"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="flbl">Shift Timing</label>
                <input
                  type="text"
                  className="finput"
                  placeholder="e.g. Day 8AM-4PM, Night 10PM-6AM, 12 hours shift"
                  value={formData.shift}
                  onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                />
                <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '4px' }}>
                  Enter custom shift timing (e.g. "Day 6AM-2PM" or "Night 10PM-6AM")
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="flbl">Mobile Number</label>
                <input
                  type="tel"
                  className="finput"
                  placeholder="10-digit mobile number"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-p" disabled={loading}>
                {loading ? 'Updating...' : 'Update Job Details'}
              </button>
            </form>
          )}

          {/* Transfer Tab */}
          {activeTab === 'transfer' && (
            <form onSubmit={handleTransfer}>
              <div style={{
                background: 'rgba(0, 188, 212, 0.1)',
                border: '1px solid rgba(0, 188, 212, 0.3)',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '20px',
                fontSize: '13px',
                color: 'var(--tl)'
              }}>
                <i className="fa-solid fa-info-circle" style={{ marginRight: '6px' }}></i>
                Transfer {user.name} to a different {user.role === 'Guard' ? 'Supervisor/Manager' : user.role === 'Supervisor' ? 'Manager' : 'Owner'}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="flbl">
                  Select New {user.role === 'Guard' ? 'Supervisor/Manager' : user.role === 'Supervisor' ? 'Manager' : 'Owner'}
                </label>
                <select
                  className="fselect"
                  value={transferData.new_parent_id}
                  onChange={(e) => setTransferData({ new_parent_id: e.target.value })}
                  required
                >
                  <option value="">Choose...</option>
                  {availableParents.map(parent => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name} ({parent.role}) - ID: {parent.user_id}
                    </option>
                  ))}
                </select>
                {availableParents.length === 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '6px' }}>
                    No available {user.role === 'Guard' ? 'supervisors/managers' : 'managers'} to transfer to
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className="btn-p" 
                disabled={loading || !transferData.new_parent_id}
                style={{ background: 'var(--tl)', borderColor: 'var(--tl)' }}
              >
                {loading ? 'Transferring...' : 'Transfer User'}
              </button>
            </form>
          )}

          {/* Delete Tab */}
          {activeTab === 'delete' && (
            <div>
              <div style={{
                background: 'rgba(255, 82, 82, 0.1)',
                border: '1px solid rgba(255, 82, 82, 0.3)',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--red)', marginBottom: '8px' }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i>
                  Warning: This action cannot be undone
                </div>
                <div style={{ fontSize: '13px', color: 'var(--t2)' }}>
                  Deleting {user.name} will permanently remove their account and all associated data.
                  {user.role !== 'Guard' && ' Make sure to transfer any subordinates first.'}
                </div>
              </div>

              <div style={{
                background: 'var(--card)',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '12px', color: 'var(--t3)', marginBottom: '8px' }}>
                  User to be deleted:
                </div>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>{user.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '4px' }}>
                  Role: {user.role} · ID: {user.user_id}
                </div>
              </div>

              <button
                onClick={handleDelete}
                className="btn-p"
                disabled={loading}
                style={{
                  background: 'var(--red)',
                  borderColor: 'var(--red)',
                  width: '100%'
                }}
              >
                {loading ? 'Deleting...' : 'Delete User Permanently'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagementModal;
