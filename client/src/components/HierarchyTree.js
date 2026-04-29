import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import ProfileViewer from './ProfileViewer';

const HierarchyTree = ({ userId, depth = 0 }) => {
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  const fetchUserAndChildren = async () => {
    try {
      // Fetch user details
      const userRes = await api.get(`/users/${userId}/profile`);
      setUser(userRes.data);

      // Fetch children from hierarchy
      const childrenRes = await api.get(`/users/hierarchy`);
      setChildren((childrenRes.data || []).filter(u => u.parent_id === userRes.data.id));
    } catch (error) {
      console.error('Error fetching hierarchy:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserAndChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleUserClick = (e) => {
    // Check if click is on expand/collapse icon
    if (e.target.closest('.expand-icon')) {
      setExpanded(!expanded);
    } else {
      // Click on user name/row - open profile
      setShowProfile(true);
    }
  };

  if (loading || !user) return null;

  const icons = {
    Owner: 'fa-crown',
    Manager: 'fa-briefcase',
    Supervisor: 'fa-hard-hat',
    Guard: 'fa-shield'
  };

  const colors = {
    Owner: '#ffd740',
    Manager: 'var(--blu)',
    Supervisor: 'var(--ylw)',
    Guard: 'var(--grn)'
  };

  return (
    <>
      <div 
        className="tree-label"
        style={{ paddingLeft: `${depth * 8}px`, cursor: 'pointer' }}
        onClick={handleUserClick}
      >
        <i 
          className="fa-solid fa-chevron-right expand-icon" 
          style={{
            fontSize: '9px',
            color: 'var(--t3)',
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            cursor: 'pointer'
          }}
        ></i>
        <i 
          className={`fa-solid ${icons[user.role]}`}
          style={{ color: colors[user.role], fontSize: '12px' }}
        ></i>
        <span style={{
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {user.name}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--t3)' }}>
          {user.user_id.slice(-4)}
        </span>
        {children.length > 0 && (
          <span className="badge badge-g" style={{ fontSize: '9px', padding: '2px 6px' }}>
            {children.length}
          </span>
        )}
      </div>

      {expanded && children.length > 0 && (
        <div className="tree-kids">
          {children.map(child => (
            <HierarchyTree key={child.id} userId={child.user_id} depth={depth + 1} />
          ))}
        </div>
      )}

      {/* Profile Viewer Modal */}
      {showProfile && (
        <ProfileViewer
          userId={user.id}
          onClose={() => setShowProfile(false)}
        />
      )}
    </>
  );
};

export default HierarchyTree;
