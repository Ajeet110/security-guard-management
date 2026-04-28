import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Avatar from './Avatar';

const HierarchyTree = ({ userId, depth = 0 }) => {
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserAndChildren();
  }, [userId]);

  const fetchUserAndChildren = async () => {
    try {
      // Fetch user details
      const userRes = await axios.get(`http://localhost:5000/api/users/${userId}`, {
        withCredentials: true
      });
      setUser(userRes.data);

      // Fetch children
      const childrenRes = await axios.get(`http://localhost:5000/api/users?parent_id=${userId}`, {
        withCredentials: true
      });
      setChildren(childrenRes.data || []);
    } catch (error) {
      console.error('Error fetching hierarchy:', error);
    } finally {
      setLoading(false);
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
        style={{ paddingLeft: `${depth * 8}px` }}
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(!expanded);
        }}
      >
        <i 
          className="fa-solid fa-chevron-right" 
          style={{
            fontSize: '9px',
            color: 'var(--t3)',
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)'
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
    </>
  );
};

export default HierarchyTree;
