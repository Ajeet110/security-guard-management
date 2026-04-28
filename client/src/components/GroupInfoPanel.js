import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Avatar from './Avatar';

const GroupInfoPanel = ({ conversation, onClose, currentUser }) => {
  const [members, setMembers] = useState([]);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionText, setDescriptionText] = useState(conversation.description || '');
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { socket, connected } = useSocket();

  // Check if current user is admin (Owner or Manager)
  const isAdmin = currentUser.role === 'Owner' || currentUser.role === 'Manager';

  useEffect(() => {
    loadGroupInfo();
    loadAllUsers();
  }, [conversation.id]);

  // Socket.io event listeners for real-time updates
  useEffect(() => {
    if (!socket || !connected) return;

    socket.on('group_description_updated', (data) => {
      if (data.conversation_id === conversation.id) {
        setDescriptionText(data.description);
      }
    });

    socket.on('group_profile_updated', (data) => {
      if (data.conversation_id === conversation.id) {
        // Update conversation name (parent component should handle this)
        loadGroupInfo();
      }
    });

    socket.on('members_added', (data) => {
      if (data.conversation_id === conversation.id) {
        loadGroupInfo();
      }
    });

    socket.on('member_removed', (data) => {
      if (data.conversation_id === conversation.id) {
        if (data.removed_user_id === currentUser.id) {
          // Current user was removed, close panel
          onClose();
        } else {
          loadGroupInfo();
        }
      }
    });

    socket.on('user_status_change', (data) => {
      // Update member online status
      setMembers(prev => prev.map(member => 
        member.id === data.user_id 
          ? { ...member, is_online: data.is_online, last_seen: data.last_seen }
          : member
      ));
    });

    return () => {
      socket.off('group_description_updated');
      socket.off('group_profile_updated');
      socket.off('members_added');
      socket.off('member_removed');
      socket.off('user_status_change');
    };
  }, [socket, connected, conversation.id, currentUser.id]);

  const loadGroupInfo = async () => {
    try {
      const response = await api.get(`/chat/conversation/${conversation.id}/info`);
      setMembers(response.data.members || []);
    } catch (error) {
      console.error('Load group info error:', error);
    }
  };

  const loadAllUsers = async () => {
    try {
      const response = await api.get('/users/all');
      setAllUsers(response.data);
    } catch (error) {
      console.error('Load users error:', error);
    }
  };

  const handleDescriptionSave = async () => {
    if (descriptionText.length > 500) {
      alert('Description must be 500 characters or less');
      return;
    }

    setLoading(true);
    try {
      await api.put(`/chat/conversation/${conversation.id}/description`, {
        description: descriptionText
      });
      setIsEditingDescription(false);
    } catch (error) {
      console.error('Save description error:', error);
      alert(error.response?.data?.error || 'Failed to save description');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) {
      return;
    }

    setLoading(true);
    try {
      await api.delete(`/chat/conversation/${conversation.id}/members/${userId}`);
      loadGroupInfo();
    } catch (error) {
      console.error('Remove member error:', error);
      alert(error.response?.data?.error || 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMembers = async () => {
    if (selectedMembers.length === 0) {
      alert('Please select at least one member to add');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/chat/conversation/${conversation.id}/members`, {
        user_ids: selectedMembers
      });
      setShowAddMembers(false);
      setSelectedMembers([]);
      loadGroupInfo();
    } catch (error) {
      console.error('Add members error:', error);
      alert(error.response?.data?.error || 'Failed to add members');
    } finally {
      setLoading(false);
    }
  };

  const toggleMemberSelection = (userId) => {
    setSelectedMembers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Filter out users who are already members
  const availableUsers = allUsers.filter(u => 
    !members.some(m => m.id === u.id)
  );

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: '380px',
      height: '100vh',
      background: 'var(--bg2)',
      borderLeft: '1px solid var(--bd)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--bd)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'var(--bg3)'
      }}>
        <button
          onClick={onClose}
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
        <span style={{ fontSize: '15px', fontWeight: 600 }}>Group Information</span>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Group Icon and Name */}
        <div style={{
          padding: '24px 16px',
          textAlign: 'center',
          borderBottom: '1px solid var(--bd)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #009624, #00bcd4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            margin: '0 auto 12px',
            fontSize: '32px'
          }}>
            <i className="fa-solid fa-users"></i>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
            {conversation.name}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--t3)' }}>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Description Section */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--bd)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t2)' }}>
              Description
            </span>
            {isAdmin && !isEditingDescription && (
              <button
                onClick={() => setIsEditingDescription(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--grn)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '4px 8px'
                }}
              >
                <i className="fa-solid fa-pen"></i>
              </button>
            )}
          </div>

          {isEditingDescription ? (
            <div>
              <textarea
                value={descriptionText}
                onChange={(e) => setDescriptionText(e.target.value)}
                placeholder="Add group description..."
                maxLength={500}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '8px',
                  border: '1px solid var(--bd)',
                  borderRadius: '8px',
                  background: 'var(--bg1)',
                  color: 'var(--t1)',
                  fontSize: '13px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '8px'
              }}>
                <span style={{
                  fontSize: '11px',
                  color: descriptionText.length > 500 ? 'var(--red)' : 'var(--t3)'
                }}>
                  {descriptionText.length}/500
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setDescriptionText(conversation.description || '');
                      setIsEditingDescription(false);
                    }}
                    className="btn-s btn-sm"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDescriptionSave}
                    className="btn-p btn-sm"
                    disabled={loading || descriptionText.length > 500}
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              fontSize: '13px',
              color: 'var(--t2)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {descriptionText || 'No description'}
            </div>
          )}
        </div>

        {/* Members Section */}
        <div style={{ padding: '16px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t2)' }}>
              Members ({members.length})
            </span>
            {isAdmin && (
              <button
                onClick={() => setShowAddMembers(true)}
                className="btn-s btn-sm"
                style={{ color: 'var(--grn)', borderColor: 'rgba(0, 200, 83, 0.3)' }}
              >
                <i className="fa-solid fa-plus"></i> Add
              </button>
            )}
          </div>

          {/* Member List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {members.map(member => (
              <div
                key={member.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px',
                  borderRadius: '8px',
                  background: 'var(--card)',
                  position: 'relative'
                }}
              >
                <Avatar user={member} size="md" online={member.is_online} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>
                    {member.name}
                    {member.id === currentUser.id && (
                      <span style={{ fontSize: '12px', color: 'var(--t3)', marginLeft: '6px' }}>
                        (You)
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                    {member.role}
                    {member.is_online ? ' • Online' : ''}
                  </div>
                </div>
                {isAdmin && member.id !== currentUser.id && (
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    disabled={loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--red)',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      fontSize: '14px'
                    }}
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Members Modal */}
      {showAddMembers && (
        <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && setShowAddMembers(false)}>
          <div className="modal" style={{ width: '500px' }}>
            <div className="modal-head">
              <h3>Add Members</h3>
              <button className="modal-close" onClick={() => setShowAddMembers(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <label className="flbl">Select Members</label>
                <div style={{ maxHeight: '350px', overflowY: 'auto', marginTop: '8px' }}>
                  {availableUsers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--t3)' }}>
                      No users available to add
                    </div>
                  ) : (
                    availableUsers.map(u => (
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
                onClick={handleAddMembers}
                disabled={loading || selectedMembers.length === 0}
              >
                Add Members
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupInfoPanel;
