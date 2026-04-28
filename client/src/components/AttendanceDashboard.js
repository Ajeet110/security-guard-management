import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';
import Avatar from './Avatar';

// Helper function to get local date in YYYY-MM-DD format
const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to format date in local timezone (DD/MM/YYYY)
const formatLocalDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper function to format date-time in local timezone (DD/MM/YYYY, HH:MM AM/PM)
const formatLocalDateTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
};

const AttendanceDashboard = ({ userRole, userId }) => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, total: 0 });
  const [guardStats, setGuardStats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [loadingGuardStats, setLoadingGuardStats] = useState(false);
  const [allGuards, setAllGuards] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [verifying, setVerifying] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectAttendanceId, setRejectAttendanceId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [showGuardStats, setShowGuardStats] = useState(false);

  useEffect(() => {
    fetchGuards();
    fetchGuardStats();
  }, []);

  useEffect(() => {
    if (allGuards.length > 0) {
      fetchAttendanceData();
    }
  }, [selectedDate, allGuards]);

  // Auto-refresh every 60 seconds when viewing today's date (optimized from 30s)
  useEffect(() => {
    const today = getLocalDateString();
    if (selectedDate === today && allGuards.length > 0) {
      const interval = setInterval(() => {
        fetchAttendanceData();
        setLastRefresh(new Date());
      }, 60000); // 60 seconds - reduced polling frequency

      return () => clearInterval(interval);
    }
  }, [selectedDate, allGuards]);

  const fetchGuards = async () => {
    try {
      console.log('Fetching guards for role:', userRole, 'userId:', userId);
      const response = await api.get('/users/hierarchy');
      const users = response.data;
      
      console.log('All users fetched:', users.length);
      console.log('Sample users:', users.slice(0, 3));
      
      let guards = [];
      if (userRole === 'Owner') {
        // Owner sees all guards
        guards = users.filter(u => u.role === 'Guard');
        console.log('Owner - All guards:', guards.length);
        console.log('Owner - Guards list:', guards.map(g => ({ id: g.id, name: g.name, user_id: g.user_id })));
      } else if (userRole === 'Manager') {
        // Manager sees guards under their hierarchy
        const descendants = getDescendants(userId, users);
        guards = descendants.filter(u => u.role === 'Guard');
        console.log('Manager - Guards in hierarchy:', guards.length);
      } else if (userRole === 'Supervisor') {
        // Supervisor sees only their direct guards
        guards = users.filter(u => u.parent_id === userId && u.role === 'Guard');
        console.log('Supervisor - Direct guards:', guards.length);
      }
      
      console.log('Guards to display:', guards.length);
      setAllGuards(guards);
    } catch (error) {
      console.error('Error fetching guards:', error);
      console.error('Error details:', error.response?.data);
    }
  };

  const fetchGuardStats = async () => {
    setLoadingGuardStats(true);
    try {
      const response = await api.get('/attendance/user-wise-stats');
      console.log('Guard stats fetched:', response.data.users.length);
      setGuardStats(response.data.users);
    } catch (error) {
      console.error('Error fetching guard stats:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoadingGuardStats(false);
    }
  };

  const getDescendants = (parentId, users) => {
    const children = users.filter(u => u.parent_id === parentId);
    let descendants = [...children];
    children.forEach(child => {
      descendants = descendants.concat(getDescendants(child.id, users));
    });
    return descendants;
  };

  const fetchAttendanceData = async () => {
    setLoadingAttendance(true);
    
    try {
      // Get attendance for selected date
      console.log('Fetching attendance for date:', selectedDate);
      const response = await api.get(`/attendance/records?date=${selectedDate}`);
      const attendanceRecords = response.data;
      
      console.log('Attendance records fetched:', attendanceRecords.length);
      console.log('Attendance records:', attendanceRecords);
      
      // Debug: Check verification status in raw data
      attendanceRecords.forEach(record => {
        console.log(`📋 Record ID: ${record.id}, User: ${record.name}, user_id: ${record.user_id}, is_verified: ${record.is_verified}, is_rejected: ${record.is_rejected}`);
      });
      
      console.log('🔍 All Guards:', allGuards.map(g => ({ id: g.id, name: g.name, user_id: g.user_id })));
      
      // Combine guards with their attendance
      const attendanceWithGuards = allGuards.map(guard => {
        const attendance = attendanceRecords.find(a => {
          const match = a.user_id === guard.id;
          if (match) {
            console.log(`✅ MATCH FOUND: Attendance user_id ${a.user_id} === Guard id ${guard.id} (${guard.name})`);
          }
          return match;
        });
        
        // Keep original values from database (SQLite returns 0/1 as integers)
        if (attendance) {
          console.log(`📝 Guard ${guard.name} has attendance:`, attendance);
        }
        
        return {
          ...guard,
          attendance: attendance || null,
          present: !!attendance
        };
      });
      
      console.log('Combined attendance data:', attendanceWithGuards);
      
      // Debug: Check pending requests
      const pendingRequests = attendanceWithGuards.filter(g => {
        if (g.attendance) {
          // Handle both boolean and integer values - convert to boolean
          const isVerified = Boolean(g.attendance.is_verified);
          const isRejected = Boolean(g.attendance.is_rejected);
          const isPending = !isVerified && !isRejected;
          
          console.log(`🔍 Guard: ${g.name}`);
          console.log(`   is_verified: ${g.attendance.is_verified} (type: ${typeof g.attendance.is_verified})`);
          console.log(`   is_rejected: ${g.attendance.is_rejected} (type: ${typeof g.attendance.is_rejected})`);
          console.log(`   isVerified (bool): ${isVerified}`);
          console.log(`   isRejected (bool): ${isRejected}`);
          console.log(`   isPending: ${isPending}`);
          
          return isPending;
        }
        return false;
      });
      console.log('🔍 PENDING REQUESTS:', pendingRequests.length);
      console.log('🔍 Pending details:', pendingRequests);
      
      setAttendanceData(attendanceWithGuards);
      
      // Calculate stats
      const present = attendanceWithGuards.filter(g => g.present).length;
      const total = allGuards.length;
      setAttendanceStats({
        present,
        absent: total - present,
        total
      });
      
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching attendance:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleRefresh = () => {
    fetchAttendanceData();
  };

  const handleVerify = async (attendanceId) => {
    setVerifying(attendanceId);
    try {
      await api.post(`/attendance/verify/${attendanceId}`);
      fetchAttendanceData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to verify attendance');
    } finally {
      setVerifying(null);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setRejecting(rejectAttendanceId);
    try {
      await api.post(`/attendance/reject/${rejectAttendanceId}`, {
        reason: rejectionReason
      });
      setShowRejectModal(false);
      setRejectionReason('');
      setRejectAttendanceId(null);
      fetchAttendanceData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to reject attendance');
    } finally {
      setRejecting(null);
    }
  };

  const handleVerifyAll = async () => {
    if (!window.confirm('Are you sure you want to verify all pending attendance?')) {
      return;
    }

    try {
      const response = await api.post('/attendance/verify-all', { date: selectedDate });
      alert(response.data.message);
      fetchAttendanceData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to verify all attendance');
    }
  };

  const handleRejectAll = async () => {
    const reason = prompt('Enter rejection reason for all pending attendance:');
    if (!reason || !reason.trim()) {
      return;
    }

    try {
      const response = await api.post('/attendance/reject-all', { 
        date: selectedDate,
        reason: reason
      });
      alert(response.data.message);
      fetchAttendanceData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to reject all attendance');
    }
  };

  // Helper function to check if attendance is pending
  const isPendingVerification = (guard) => {
    if (!guard || !guard.attendance) return false;
    // Handle both boolean and integer values - convert to boolean for comparison
    const verified = Boolean(guard.attendance.is_verified);
    const rejected = Boolean(guard.attendance.is_rejected);
    const result = !verified && !rejected;
    return result;
  };

  // Get pending requests
  const pendingRequests = attendanceData.filter(isPendingVerification);
  
  console.log('🎯 FINAL PENDING COUNT:', pendingRequests.length);
  console.log('🎯 Pending guards:', pendingRequests.map(g => ({ 
    name: g.name, 
    is_verified: g.attendance?.is_verified, 
    is_rejected: g.attendance?.is_rejected,
    verified_bool: Boolean(g.attendance?.is_verified),
    rejected_bool: Boolean(g.attendance?.is_rejected)
  })));
  console.log('🎯 All attendance data:', attendanceData.map(g => ({
    name: g.name,
    has_attendance: !!g.attendance,
    is_verified: g.attendance?.is_verified,
    is_rejected: g.attendance?.is_rejected,
    is_pending: isPendingVerification(g)
  })));

  const openPhotoModal = (guard) => {
    setSelectedAttendance(guard);
    setShowPhotoModal(true);
  };

  const filteredData = attendanceData
    .filter(guard => 
      searchQuery === '' || 
      guard.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guard.user_id.includes(searchQuery)
    )
    .sort((a, b) => {
      // Sort by verification status: Pending first, then Verified, then Rejected, then Absent
      const getStatusPriority = (guard) => {
        if (!guard.attendance) return 4; // Absent - last
        if (guard.attendance.is_rejected) return 3; // Rejected
        if (guard.attendance.is_verified) return 2; // Verified
        return 1; // Pending - first
      };
      
      const priorityA = getStatusPriority(a);
      const priorityB = getStatusPriority(b);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // If same status, sort by name
      return a.name.localeCompare(b.name);
    });

  return (
    <>
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--bd)',
        borderRadius: '14px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--bd)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              Daily Attendance Dashboard
            </div>
            <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>
              Last updated: {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={handleRefresh}
              className="btn-s"
              disabled={loadingAttendance}
              style={{ padding: '6px 12px', fontSize: '12px' }}
              title="Refresh attendance data"
            >
              <i className={`fa-solid fa-rotate ${loadingAttendance ? 'fa-spin' : ''}`} style={{ marginRight: '6px' }}></i>
              Refresh
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid var(--bd)',
                borderRadius: '8px',
                background: 'var(--bg1)',
                color: 'var(--t1)',
                fontSize: '12px'
              }}
            />
            <button
              onClick={() => setSelectedDate(getLocalDateString())}
              className="btn-s"
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Today
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          padding: '16px 20px',
          borderBottom: '1px solid var(--bd)',
          background: 'var(--bg1)'
        }}>
          <div style={{
            background: 'var(--card)',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid var(--bd)'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '4px' }}>
              Total Guards
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--blu)' }}>
              {attendanceStats.total}
            </div>
          </div>
          <div style={{
            background: 'var(--card)',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid var(--bd)'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '4px' }}>
              Present
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--grn)' }}>
              {attendanceStats.present}
            </div>
          </div>
          <div style={{
            background: 'var(--card)',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid var(--bd)'
          }}>
            <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '4px' }}>
              Absent
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--red)' }}>
              {attendanceStats.absent}
            </div>
          </div>
        </div>

        {/* Search Box */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bd)' }}>
          <input
            type="text"
            placeholder="Search by Guard Name or User ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid var(--bd)',
              borderRadius: '8px',
              background: 'var(--bg1)',
              color: 'var(--t1)',
              fontSize: '13px'
            }}
          />
        </div>

        {/* Pending Verification Section - Highlighted */}
        {pendingRequests.length > 0 && (
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--bd)',
            background: 'linear-gradient(135deg, rgba(255, 204, 0, 0.15), rgba(255, 152, 0, 0.1))',
            border: '2px solid var(--ylw)',
            margin: '16px',
            borderRadius: '12px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ylw)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-clock" style={{ fontSize: '20px' }}></i>
                  Pending Verification Requests
                </div>
                <div style={{ fontSize: '12px', color: 'var(--t2)', marginTop: '4px' }}>
                  {pendingRequests.length} guard(s) waiting for approval
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleVerifyAll}
                  className="btn-p"
                  style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 600 }}
                >
                  <i className="fa-solid fa-check-double" style={{ marginRight: '6px' }}></i>
                  Verify All ({pendingRequests.length})
                </button>
                <button
                  onClick={handleRejectAll}
                  className="btn-d"
                  style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 600 }}
                >
                  <i className="fa-solid fa-xmark" style={{ marginRight: '6px' }}></i>
                  Reject All
                </button>
              </div>
            </div>
            
            {/* Pending Guards List */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
              gap: '12px',
              marginTop: '12px'
            }}>
              {pendingRequests.map(guard => (
                  <div key={guard.id} style={{
                    background: 'var(--card)',
                    border: '2px solid var(--ylw)',
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Avatar user={guard} size="md" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>{guard.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--t3)', fontFamily: 'monospace' }}>
                          {guard.user_id}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--t2)' }}>
                      <i className="fa-solid fa-clock" style={{ marginRight: '4px' }}></i>
                      {new Date(guard.attendance.marked_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => openPhotoModal(guard)}
                        className="btn-s btn-sm"
                        style={{ flex: 1, padding: '6px', fontSize: '11px' }}
                      >
                        <i className="fa-solid fa-image" style={{ marginRight: '4px' }}></i>
                        View Photo
                      </button>
                      <button
                        onClick={() => handleVerify(guard.attendance.id)}
                        disabled={verifying === guard.attendance.id}
                        className="btn-s btn-sm"
                        style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--grn)', borderColor: 'var(--grn)' }}
                        title="Verify"
                      >
                        {verifying === guard.attendance.id ? (
                          <i className="fa-solid fa-spinner fa-spin"></i>
                        ) : (
                          <i className="fa-solid fa-check"></i>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setRejectAttendanceId(guard.attendance.id);
                          setShowRejectModal(true);
                        }}
                        className="btn-s btn-sm"
                        style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--red)', borderColor: 'var(--red)' }}
                        title="Reject"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--bd)',
          background: 'var(--bg1)',
          display: 'flex',
          gap: '20px',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--ylw)', fontWeight: 600 }}>
              ⏳ Pending: {pendingRequests.length}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--grn)', fontWeight: 600 }}>
              ✅ Verified: {attendanceData.filter(g => g.attendance && Boolean(g.attendance.is_verified)).length}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--red)', fontWeight: 600 }}>
              ❌ Rejected: {attendanceData.filter(g => g.attendance && Boolean(g.attendance.is_rejected)).length}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--t3)', fontWeight: 600 }}>
              ⚫ Absent: {attendanceData.filter(g => !g.attendance).length}
            </span>
          </div>
        </div>

        {/* Attendance Table */}
        {loadingAttendance ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px' }}></i>
            <div style={{ marginTop: '12px' }}>Loading attendance...</div>
          </div>
        ) : (
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Guard</th>
                  <th>User ID</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Photo</th>
                  <th>Verification</th>
                  <th>Verified By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(guard => (
                  <tr key={guard.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Avatar user={guard} size="sm" />
                        {guard.name}
                      </div>
                    </td>
                    <td style={{
                      fontFamily: 'monospace',
                      color: 'var(--grn)',
                      fontWeight: 500,
                      fontSize: '12px'
                    }}>
                      {guard.user_id}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--t2)' }}>
                      {guard.location || 'Not assigned'}
                    </td>
                    <td>
                      {guard.present ? (
                        <span className="badge badge-g">
                          <i className="fa-solid fa-circle-check" style={{ fontSize: '10px' }}></i> Present
                        </span>
                      ) : (
                        <span className="badge badge-r">
                          <i className="fa-solid fa-circle-xmark" style={{ fontSize: '10px' }}></i> Absent
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--t2)' }}>
                      {guard.attendance ? (
                        new Date(guard.attendance.marked_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      {guard.attendance?.photo_path ? (
                        <button
                          onClick={() => openPhotoModal(guard)}
                          className="btn-s btn-sm"
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                        >
                          <i className="fa-solid fa-image" style={{ marginRight: '4px' }}></i>
                          View
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--t3)' }}>-</span>
                      )}
                    </td>
                    <td>
                      {guard.attendance ? (
                        guard.attendance.is_verified ? (
                          <span className="badge badge-g">
                            <i className="fa-solid fa-circle-check" style={{ fontSize: '9px' }}></i> Verified
                          </span>
                        ) : guard.attendance.is_rejected ? (
                          <span className="badge badge-r" title={guard.attendance.rejection_reason}>
                            <i className="fa-solid fa-circle-xmark" style={{ fontSize: '9px' }}></i> Rejected - Upload Again
                          </span>
                        ) : (
                          <span className="badge badge-o">
                            <i className="fa-solid fa-clock" style={{ fontSize: '9px' }}></i> Pending
                          </span>
                        )
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--t3)' }}>-</span>
                      )}
                    </td>
                    <td style={{ fontSize: '11px', color: 'var(--t2)' }}>
                      {guard.attendance?.verified_by_name ? (
                        <div>
                          <div style={{ fontWeight: 500 }}>{guard.attendance.verified_by_name}</div>
                          <div style={{ color: 'var(--t3)', fontSize: '10px' }}>
                            {formatLocalDate(guard.attendance.verified_at)}
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      {guard.attendance && !guard.attendance.is_verified && !guard.attendance.is_rejected ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => handleVerify(guard.attendance.id)}
                            disabled={verifying === guard.attendance.id}
                            className="btn-s btn-sm"
                            style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--grn)', borderColor: 'var(--grn)' }}
                            title="Verify"
                          >
                            {verifying === guard.attendance.id ? (
                              <i className="fa-solid fa-spinner fa-spin"></i>
                            ) : (
                              <i className="fa-solid fa-check"></i>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setRejectAttendanceId(guard.attendance.id);
                              setShowRejectModal(true);
                            }}
                            className="btn-s btn-sm"
                            style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--red)', borderColor: 'var(--red)' }}
                            title="Reject"
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--t3)' }}>-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--t3)' }}>
                      {searchQuery ? 'No guards found matching your search' : 'No guards available'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Photo Viewer Modal */}
      {showPhotoModal && selectedAttendance && (
        <div 
          className="modal-bg" 
          onClick={(e) => e.target.className === 'modal-bg' && setShowPhotoModal(false)}
        >
          <div className="modal" style={{ width: '500px', maxWidth: '95vw' }}>
            <div className="modal-head">
              <h3>Attendance Photo</h3>
              <button className="modal-close" onClick={() => setShowPhotoModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
                  {selectedAttendance.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--t3)' }}>
                  ID: {selectedAttendance.user_id} · {selectedAttendance.attendance ? formatLocalDateTime(selectedAttendance.attendance.marked_at) : ''}
                </div>
                {selectedAttendance.attendance && (
                  <div style={{ marginTop: '8px' }}>
                    {selectedAttendance.attendance.is_verified ? (
                      <span className="badge badge-g">
                        <i className="fa-solid fa-circle-check" style={{ fontSize: '9px' }}></i> Verified
                      </span>
                    ) : selectedAttendance.attendance.is_rejected ? (
                      <span className="badge badge-r">
                        <i className="fa-solid fa-circle-xmark" style={{ fontSize: '9px' }}></i> Rejected - Upload Again
                      </span>
                    ) : (
                      <span className="badge badge-o">
                        <i className="fa-solid fa-clock" style={{ fontSize: '9px' }}></i> Pending
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div style={{
                width: '100%',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid var(--bd)',
                background: 'var(--bg1)'
              }}>
                <img
                  src={`http://localhost:5000/${selectedAttendance.attendance?.photo_path}`}
                  alt="Attendance"
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block'
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--t3)"><i class="fa-solid fa-image-slash" style="font-size: 32px; margin-bottom: 12px; opacity: 0.5"></i><div>Photo not available</div></div>';
                  }}
                />
              </div>
              {selectedAttendance.attendance && !selectedAttendance.attendance.is_verified && !selectedAttendance.attendance.is_rejected && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button
                    onClick={() => {
                      handleVerify(selectedAttendance.attendance.id);
                      setShowPhotoModal(false);
                    }}
                    disabled={verifying === selectedAttendance.attendance.id}
                    className="btn-p"
                    style={{ flex: 1 }}
                  >
                    {verifying === selectedAttendance.attendance.id ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>
                        Verifying...
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-check" style={{ marginRight: '6px' }}></i>
                        Verify Attendance
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowPhotoModal(false);
                      setRejectAttendanceId(selectedAttendance.attendance.id);
                      setShowRejectModal(true);
                    }}
                    className="btn-d"
                    style={{ flex: 1 }}
                  >
                    <i className="fa-solid fa-xmark" style={{ marginRight: '6px' }}></i>
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div 
          className="modal-bg" 
          onClick={(e) => e.target.className === 'modal-bg' && setShowRejectModal(false)}
          style={{ zIndex: 1001 }}
        >
          <div className="modal" style={{ width: '400px', maxWidth: '95vw' }}>
            <div className="modal-head">
              <h3>Reject Attendance</h3>
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
                  placeholder="Enter reason for rejection (e.g., unclear photo, wrong person, etc.)"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  style={{ resize: 'vertical', minHeight: '80px' }}
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-s"
                  onClick={() => setShowRejectModal(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  className="btn-d"
                  onClick={handleReject}
                  disabled={!rejectionReason.trim() || rejecting}
                  style={{ flex: 1 }}
                >
                  {rejecting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '6px' }}></i>
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-ban" style={{ marginRight: '6px' }}></i>
                      Reject
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guard Statistics Section */}
      <div style={{
        marginTop: '20px',
        background: 'var(--card)',
        border: '1px solid var(--bd)',
        borderRadius: '14px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--bd)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer'
        }} onClick={() => setShowGuardStats(!showGuardStats)}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              Guard Attendance Statistics
            </div>
            <div style={{ fontSize: '11px', color: 'var(--t3)', marginTop: '2px' }}>
              Click to {showGuardStats ? 'hide' : 'show'} individual guard performance
            </div>
          </div>
          <div>
            <i className={`fa-solid fa-chevron-${showGuardStats ? 'up' : 'down'}`} style={{ color: 'var(--t3)' }}></i>
          </div>
        </div>

        {showGuardStats && (
          <div style={{ padding: '20px' }}>
            {loadingGuardStats ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px' }}></i>
                <div style={{ marginTop: '12px' }}>Loading guard statistics...</div>
              </div>
            ) : guardStats.length > 0 ? (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Guard</th>
                      <th>User ID</th>
                      <th>Total Days</th>
                      <th>Present Days</th>
                      <th>Absent Days</th>
                      <th>Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guardStats.map(guard => (
                      <tr key={guard.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Avatar user={guard} size="sm" />
                            {guard.name}
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                          {guard.user_id}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                          {guard.total_days}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--grn)', fontWeight: 600 }}>
                          {guard.present_days}
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--red)', fontWeight: 600 }}>
                          {guard.absent_days}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                              width: '60px',
                              height: '8px',
                              background: 'var(--bd)',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${guard.attendance_rate}%`,
                                height: '100%',
                                background: guard.attendance_rate >= 80 ? 'var(--grn)' : 
                                          guard.attendance_rate >= 60 ? 'var(--ylw)' : 'var(--red)'
                              }}></div>
                            </div>
                            <span style={{
                              fontWeight: 600,
                              color: guard.attendance_rate >= 80 ? 'var(--grn)' : 
                                     guard.attendance_rate >= 60 ? 'var(--ylw)' : 'var(--red)',
                              fontSize: '12px'
                            }}>
                              {guard.attendance_rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)' }}>
                <i className="fa-solid fa-chart-bar" style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.5 }}></i>
                <div>No guard statistics available</div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default AttendanceDashboard;
