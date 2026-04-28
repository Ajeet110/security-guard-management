import React, { useState, useEffect } from 'react';
import { api } from '../context/AuthContext';

const AttendanceReportModal = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('graph');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [filters, setFilters] = useState({
    days: 7, // Default 7 days
    start_date: '',
    end_date: '',
    user_id: ''
  });
  const [guards, setGuards] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchGuards();
  }, []);

  // Auto-refresh stats every 5 minutes when on graph tab
  useEffect(() => {
    if (activeTab === 'graph') {
      const interval = setInterval(() => {
        fetchStats();
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
    }
  }, [activeTab, filters.days]);

  useEffect(() => {
    if (activeTab === 'report') {
      fetchReport();
    }
  }, [activeTab, filters]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/management/attendance/stats?days=${filters.days}`);
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuards = async () => {
    try {
      const res = await api.get('/users/hierarchy');
      setGuards(res.data.filter(u => u.role === 'Guard'));
    } catch (error) {
      console.error('Error fetching guards:', error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      if (filters.user_id) params.append('user_id', filters.user_id);

      const res = await api.get(`/management/attendance/report?${params.toString()}`);
      setReportData(res.data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (reportData.length === 0) {
      alert('No data to export');
      return;
    }

    let csv = 'User ID,Name,Role,Location,Shift,Date,Time,Status,Verified,Rejected,Rejection Reason\n';
    
    reportData.forEach(user => {
      if (user.attendance.length === 0) {
        csv += `${user.user_id},${user.name},${user.role},${user.location || 'N/A'},${user.shift || 'N/A'},-,-,No Records,No,No,\n`;
      } else {
        user.attendance.forEach(att => {
          csv += `${user.user_id},${user.name},${user.role},${user.location || 'N/A'},${user.shift || 'N/A'},${att.date},${att.time},${att.status},${att.is_verified ? 'Yes' : 'No'},${att.is_rejected ? 'Yes' : 'No'},"${att.rejection_reason || ''}"\n`;
        });
      }
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="modal-bg" onClick={(e) => e.target.className === 'modal-bg' && onClose()}>
      <div className="modal" style={{ width: '900px', maxWidth: '95vw' }}>
        <div className="modal-head">
          <h3>Attendance Report & Analytics</h3>
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
            onClick={() => setActiveTab('graph')}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 20px',
              cursor: 'pointer',
              color: activeTab === 'graph' ? 'var(--grn)' : 'var(--t2)',
              borderBottom: activeTab === 'graph' ? '2px solid var(--grn)' : 'none',
              fontWeight: activeTab === 'graph' ? 600 : 400,
              fontSize: '13px'
            }}
          >
            <i className="fa-solid fa-chart-line" style={{ marginRight: '6px' }}></i>
            Graph View
          </button>
          <button
            onClick={() => setActiveTab('report')}
            style={{
              background: 'none',
              border: 'none',
              padding: '12px 20px',
              cursor: 'pointer',
              color: activeTab === 'report' ? 'var(--grn)' : 'var(--t2)',
              borderBottom: activeTab === 'report' ? '2px solid var(--grn)' : 'none',
              fontWeight: activeTab === 'report' ? 600 : 400,
              fontSize: '13px'
            }}
          >
            <i className="fa-solid fa-table" style={{ marginRight: '6px' }}></i>
            Detailed Report
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* Graph View */}
          {activeTab === 'graph' && (
            <>
              {/* Controls */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '20px',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500 }}>Show last:</label>
                  <select
                    className="fselect"
                    style={{ width: 'auto' }}
                    value={filters.days}
                    onChange={(e) => {
                      setFilters({ ...filters, days: e.target.value });
                      setTimeout(() => fetchStats(), 100);
                    }}
                  >
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                  </select>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                  <i className="fa-solid fa-rotate" style={{ marginRight: '4px' }}></i>
                  Auto-updates every 5 minutes
                </div>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px' }}></i>
                  <div style={{ marginTop: '12px' }}>Loading statistics...</div>
                </div>
              ) : stats ? (
                <>
                  {/* Summary Cards */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    marginBottom: '24px'
                  }}>
                    <div style={{
                      background: 'var(--card)',
                      borderRadius: '10px',
                      padding: '16px',
                      border: '1px solid var(--bd)'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '4px' }}>
                        Total Guards
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--grn)' }}>
                        {stats.total_guards}
                      </div>
                    </div>
                    <div style={{
                      background: 'var(--card)',
                      borderRadius: '10px',
                      padding: '16px',
                      border: '1px solid var(--bd)'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '4px' }}>
                        Avg Attendance
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--blu)' }}>
                        {stats.stats.length > 0 
                          ? Math.round(stats.stats.reduce((sum, s) => sum + s.percentage, 0) / stats.stats.length)
                          : 0}%
                      </div>
                    </div>
                    <div style={{
                      background: 'var(--card)',
                      borderRadius: '10px',
                      padding: '16px',
                      border: '1px solid var(--bd)'
                    }}>
                      <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '4px' }}>
                        Today's Attendance
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--ylw)' }}>
                        {stats.stats[stats.stats.length - 1]?.percentage || 0}%
                      </div>
                    </div>
                  </div>

                  {/* Bar Chart */}
                  <div style={{
                    background: 'var(--card)',
                    borderRadius: '10px',
                    padding: '20px',
                    border: '1px solid var(--bd)'
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
                      Daily Attendance Trend
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: '8px',
                      height: '200px',
                      padding: '10px 0'
                    }}>
                      {stats.stats.map((stat, idx) => {
                        const height = (stat.percentage / 100) * 180;
                        const color = stat.percentage >= 80 ? 'var(--grn)' : 
                                     stat.percentage >= 60 ? 'var(--ylw)' : 'var(--red)';
                        
                        return (
                          <div
                            key={idx}
                            style={{
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            <div style={{
                              width: '100%',
                              height: `${height}px`,
                              background: color,
                              borderRadius: '4px 4px 0 0',
                              position: 'relative',
                              transition: 'height 0.3s',
                              minHeight: '20px'
                            }}>
                              <div style={{
                                position: 'absolute',
                                top: '-20px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: 'var(--t1)'
                              }}>
                                {stat.percentage}%
                              </div>
                            </div>
                            <div style={{
                              fontSize: '10px',
                              color: 'var(--t3)',
                              textAlign: 'center'
                            }}>
                              {formatDate(stat.date)}
                            </div>
                            <div style={{
                              fontSize: '9px',
                              color: 'var(--t3)'
                            }}>
                              {stat.present}/{stat.total}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Legend */}
                  <div style={{
                    display: 'flex',
                    gap: '20px',
                    justifyContent: 'center',
                    marginTop: '16px',
                    fontSize: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        background: 'var(--grn)',
                        borderRadius: '2px'
                      }}></div>
                      <span>≥80% (Good)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        background: 'var(--ylw)',
                        borderRadius: '2px'
                      }}></div>
                      <span>60-79% (Average)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        background: 'var(--red)',
                        borderRadius: '2px'
                      }}></div>
                      <span>&lt;60% (Poor)</span>
                    </div>
                  </div>
                </>
              ) : null}
            </>
          )}

          {/* Report View */}
          {activeTab === 'report' && (
            <>
              {/* Filters */}
              <div style={{
                background: 'var(--card)',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '20px',
                border: '1px solid var(--bd)'
              }}>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>
                  Filters
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px'
                }}>
                  <div>
                    <label className="flbl">Start Date</label>
                    <input
                      type="date"
                      className="finput"
                      value={filters.start_date}
                      onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="flbl">End Date</label>
                    <input
                      type="date"
                      className="finput"
                      value={filters.end_date}
                      onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="flbl">Guard</label>
                    <select
                      className="fselect"
                      value={filters.user_id}
                      onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
                    >
                      <option value="">All Guards</option>
                      {guards.map(guard => (
                        <option key={guard.id} value={guard.id}>
                          {guard.name} ({guard.user_id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  className="btn-s"
                  onClick={exportToCSV}
                  style={{ marginTop: '12px', color: 'var(--grn)', borderColor: 'rgba(0, 200, 83, 0.3)' }}
                >
                  <i className="fa-solid fa-download" style={{ marginRight: '6px' }}></i>
                  Export to CSV
                </button>
              </div>

              {/* Report Table */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--t3)' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px' }}></i>
                  <div style={{ marginTop: '12px' }}>Loading report...</div>
                </div>
              ) : (
                <div style={{
                  background: 'var(--card)',
                  border: '1px solid var(--bd)',
                  borderRadius: '10px',
                  overflow: 'hidden'
                }}>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>User ID</th>
                        <th>Name</th>
                        <th>Location</th>
                        <th>Shift</th>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--t3)' }}>
                            No attendance records found
                          </td>
                        </tr>
                      ) : (
                        reportData.map(user => {
                          if (user.attendance.length === 0) {
                            return (
                              <tr key={user.user_id}>
                                <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{user.user_id}</td>
                                <td>{user.name}</td>
                                <td>{user.location || '-'}</td>
                                <td>{user.shift || '-'}</td>
                                <td colSpan="2" style={{ textAlign: 'center', color: 'var(--t3)' }}>
                                  No records
                                </td>
                                <td>
                                  <span className="badge badge-r">Absent</span>
                                </td>
                              </tr>
                            );
                          }
                          
                          return user.attendance.map((att, idx) => (
                            <tr key={`${user.user_id}-${idx}`}>
                              {idx === 0 && (
                                <>
                                  <td rowSpan={user.attendance.length} style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                    {user.user_id}
                                  </td>
                                  <td rowSpan={user.attendance.length}>{user.name}</td>
                                  <td rowSpan={user.attendance.length}>{user.location || '-'}</td>
                                  <td rowSpan={user.attendance.length}>{user.shift || '-'}</td>
                                </>
                              )}
                              <td>{att.date}</td>
                              <td>{att.time}</td>
                              <td>
                                {att.status === 'Verified' ? (
                                  <span className="badge badge-g">Verified</span>
                                ) : att.status === 'Rejected' ? (
                                  <span className="badge badge-r">Rejected</span>
                                ) : att.status === 'Pending' ? (
                                  <span className="badge badge-o">Pending</span>
                                ) : (
                                  <span className="badge badge-g">Present</span>
                                )}
                              </td>
                            </tr>
                          ));
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceReportModal;
