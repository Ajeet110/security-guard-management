import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import Avatar from './Avatar';

const RecycleBinModal = ({ isOpen, onClose }) => {
  const [deletedItems, setDeletedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [recoveringAll, setRecoveringAll] = useState(false);
  const [emptyingBin, setEmptyingBin] = useState(false);
  const [filter, setFilter] = useState('all'); // all, user, attendance, document

  useEffect(() => {
    if (isOpen) {
      fetchDeletedItems();
    }
  }, [isOpen]);

  const fetchDeletedItems = async () => {
    setLoading(true);
    try {
      const response = await api.get('/recycle-bin');
      setDeletedItems(response.data.items || []);
    } catch (error) {
      console.error('Error fetching deleted items:', error);
      alert('Failed to load recycle bin');
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (itemId) => {
    if (!window.confirm('Are you sure you want to recover this item?')) {
      return;
    }

    setRecovering(itemId);
    try {
      const response = await api.post(`/recycle-bin/recover/${itemId}`);
      alert(response.data.message);
      fetchDeletedItems();
      // Trigger refresh of main dashboard
      window.dispatchEvent(new CustomEvent('userDataUpdated'));
    } catch (error) {
      console.error('Error recovering item:', error);
      alert(error.response?.data?.error || 'Failed to recover item');
    } finally {
      setRecovering(null);
    }
  };

  const handleRecoverAll = async () => {
    if (!window.confirm(`Are you sure you want to recover all ${deletedItems.length} items?`)) {
      return;
    }

    setRecoveringAll(true);
    try {
      const response = await api.post('/recycle-bin/recover-all');
      alert(response.data.message);
      fetchDeletedItems();
      // Trigger refresh of main dashboard
      window.dispatchEvent(new CustomEvent('userDataUpdated'));
    } catch (error) {
      console.error('Error recovering all items:', error);
      alert(error.response?.data?.error || 'Failed to recover all items');
    } finally {
      setRecoveringAll(false);
    }
  };

  const handlePermanentDelete = async (itemId) => {
    if (!window.confirm('⚠️ WARNING: This will permanently delete this item. This action cannot be undone. Are you sure?')) {
      return;
    }

    setDeleting(itemId);
    try {
      const response = await api.delete(`/recycle-bin/permanent/${itemId}`);
      alert(response.data.message);
      fetchDeletedItems();
    } catch (error) {
      console.error('Error permanently deleting item:', error);
      alert(error.response?.data?.error || 'Failed to permanently delete item');
    } finally {
      setDeleting(null);
    }
  };

  const handleEmptyBin = async () => {
    if (!window.confirm(`⚠️ WARNING: This will permanently delete all ${deletedItems.length} items in the recycle bin. This action cannot be undone. Are you sure?`)) {
      return;
    }

    // Double confirmation for safety
    if (!window.confirm('⚠️ FINAL WARNING: Are you absolutely sure? This cannot be undone!')) {
      return;
    }

    setEmptyingBin(true);
    try {
      const response = await api.delete('/recycle-bin/empty');
      alert(response.data.message);
      fetchDeletedItems();
    } catch (error) {
      console.error('Error emptying recycle bin:', error);
      alert(error.response?.data?.error || 'Failed to empty recycle bin');
    } finally {
      setEmptyingBin(false);
    }
  };

  const getItemTypeIcon = (type) => {
    switch (type) {
      case 'user':
        return 'fa-user';
      case 'attendance':
        return 'fa-calendar-check';
      case 'document':
        return 'fa-file';
      default:
        return 'fa-trash';
    }
  };

  const getItemTypeColor = (type) => {
    switch (type) {
      case 'user':
        return 'var(--blu)';
      case 'attendance':
        return 'var(--grn)';
      case 'document':
        return 'var(--ylw)';
      default:
        return 'var(--t3)';
    }
  };

  const getItemDescription = (item) => {
    const data = item.item_data;
    switch (item.item_type) {
      case 'user':
        return `${data.name} (${data.user_id}) - ${data.role}`;
      case 'attendance':
        return `Attendance record for user ID ${data.user_id} on ${new Date(data.marked_at).toLocaleDateString()}`;
      case 'document':
        return `${data.doc_type.replace('_', ' ')} for user ID ${data.user_id}`;
      default:
        return 'Unknown item';
    }
  };

  const filteredItems = filter === 'all' 
    ? deletedItems 
    : deletedItems.filter(item => item.item_type === filter);

  if (!isOpen) return null;

  return (
    <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && onClose()}>
      <div className="modal" style={{ maxWidth: '900px', width: '90%' }}>
        <div className="modal-head">
          <div>
            <h3>
              <i className="fa-solid fa-trash-can-arrow-up" style={{ marginRight: '8px', color: 'var(--red)' }}></i>
              Recycle Bin
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--t3)', marginTop: '4px', fontWeight: 400 }}>
              Items are automatically deleted after 30 days
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px' }}>
          {/* Action Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className={`btn-s ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
                style={{
                  background: filter === 'all' ? 'var(--blu)' : 'transparent',
                  color: filter === 'all' ? 'white' : 'var(--t2)',
                  borderColor: filter === 'all' ? 'var(--blu)' : 'var(--bd)'
                }}
              >
                All ({deletedItems.length})
              </button>
              <button
                className={`btn-s ${filter === 'user' ? 'active' : ''}`}
                onClick={() => setFilter('user')}
                style={{
                  background: filter === 'user' ? 'var(--blu)' : 'transparent',
                  color: filter === 'user' ? 'white' : 'var(--t2)',
                  borderColor: filter === 'user' ? 'var(--blu)' : 'var(--bd)'
                }}
              >
                Users ({deletedItems.filter(i => i.item_type === 'user').length})
              </button>
              <button
                className={`btn-s ${filter === 'attendance' ? 'active' : ''}`}
                onClick={() => setFilter('attendance')}
                style={{
                  background: filter === 'attendance' ? 'var(--grn)' : 'transparent',
                  color: filter === 'attendance' ? 'white' : 'var(--t2)',
                  borderColor: filter === 'attendance' ? 'var(--grn)' : 'var(--bd)'
                }}
              >
                Attendance ({deletedItems.filter(i => i.item_type === 'attendance').length})
              </button>
              <button
                className={`btn-s ${filter === 'document' ? 'active' : ''}`}
                onClick={() => setFilter('document')}
                style={{
                  background: filter === 'document' ? 'var(--ylw)' : 'transparent',
                  color: filter === 'document' ? 'white' : 'var(--t2)',
                  borderColor: filter === 'document' ? 'var(--ylw)' : 'var(--bd)'
                }}
              >
                Documents ({deletedItems.filter(i => i.item_type === 'document').length})
              </button>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-s"
                onClick={handleRecoverAll}
                disabled={filteredItems.length === 0 || recoveringAll}
                style={{ color: 'var(--grn)', borderColor: 'rgba(0, 200, 83, 0.3)' }}
              >
                {recoveringAll ? (
                  <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>Recovering...</>
                ) : (
                  <><i className="fa-solid fa-rotate-left" style={{ marginRight: '6px' }}></i>Recover All</>
                )}
              </button>
              <button
                className="btn-s"
                onClick={handleEmptyBin}
                disabled={deletedItems.length === 0 || emptyingBin}
                style={{ color: 'var(--red)', borderColor: 'rgba(255, 82, 82, 0.3)' }}
              >
                {emptyingBin ? (
                  <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>Emptying...</>
                ) : (
                  <><i className="fa-solid fa-trash" style={{ marginRight: '6px' }}></i>Empty Bin</>
                )}
              </button>
            </div>
          </div>

          {/* Items List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '12px' }}></i>
              <div>Loading deleted items...</div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)' }}>
              <i className="fa-solid fa-trash-can" style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}></i>
              <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                {filter === 'all' ? 'Recycle bin is empty' : `No deleted ${filter}s`}
              </div>
              <div style={{ fontSize: '13px' }}>
                Deleted items will appear here
              </div>
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--card)',
                    border: '1px solid var(--bd)',
                    borderRadius: '10px',
                    padding: '16px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '10px',
                    background: `${getItemTypeColor(item.item_type)}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <i className={`fa-solid ${getItemTypeIcon(item.item_type)}`} style={{
                      fontSize: '20px',
                      color: getItemTypeColor(item.item_type)
                    }}></i>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="badge" style={{
                        background: `${getItemTypeColor(item.item_type)}20`,
                        color: getItemTypeColor(item.item_type),
                        borderColor: `${getItemTypeColor(item.item_type)}40`
                      }}>
                        {item.item_type}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>
                        {getItemDescription(item)}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--t3)', marginBottom: '4px' }}>
                      Deleted by {item.deleted_by_name} ({item.deleted_by_role}) on {new Date(item.deleted_at).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="fa-solid fa-clock" style={{ color: 'var(--ylw)' }}></i>
                      <span style={{ color: item.days_remaining <= 7 ? 'var(--red)' : 'var(--t2)' }}>
                        {item.days_remaining > 0 
                          ? `Auto-delete in ${item.days_remaining} day${item.days_remaining !== 1 ? 's' : ''}`
                          : 'Will be deleted soon'
                        }
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      className="btn-s btn-sm"
                      onClick={() => handleRecover(item.id)}
                      disabled={recovering === item.id}
                      style={{ color: 'var(--grn)', borderColor: 'rgba(0, 200, 83, 0.3)' }}
                      title="Recover this item"
                    >
                      {recovering === item.id ? (
                        <i className="fa-solid fa-spinner fa-spin"></i>
                      ) : (
                        <>
                          <i className="fa-solid fa-rotate-left" style={{ marginRight: '6px' }}></i>
                          Recover
                        </>
                      )}
                    </button>
                    <button
                      className="btn-s btn-sm"
                      onClick={() => handlePermanentDelete(item.id)}
                      disabled={deleting === item.id}
                      style={{ color: 'var(--red)', borderColor: 'rgba(255, 82, 82, 0.3)' }}
                      title="Permanently delete this item"
                    >
                      {deleting === item.id ? (
                        <i className="fa-solid fa-spinner fa-spin"></i>
                      ) : (
                        <i className="fa-solid fa-trash"></i>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecycleBinModal;
