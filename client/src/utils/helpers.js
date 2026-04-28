// Avatar color generator
export const avatarColor = (name) => {
  const colors = [
    '#00897b', '#1565c0', '#6a1b9a', '#c62828', '#ef6c00',
    '#2e7d32', '#4527a0', '#ad1457', '#00838f', '#4e342e'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Get initials from name
export const initials = (name) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

// Format date to YYYYMMDDHHMM
export const makeId = (dateString) => {
  return dateString.replace(/[-:T]/g, '').slice(0, 12);
};

// Generate random phone number
export const randomPhone = () => {
  return '9' + Math.floor(1000000000 + Math.random() * 9000000000);
};

// Message status ticks
export const ticks = (status) => {
  if (status === 'sent') {
    return '<i class="fa-solid fa-check" style="color:var(--t3);font-size:13px"></i>';
  }
  if (status === 'delivered') {
    return '<i class="fa-solid fa-check-double" style="color:var(--t3);font-size:13px"></i>';
  }
  return '<i class="fa-solid fa-check-double" style="color:#53bdeb;font-size:13px"></i>';
};

// Format time in India timezone (IST)
export const formatTime = (date) => {
  // Convert to India timezone (IST = UTC+5:30)
  const indiaDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  const hours = indiaDate.getHours();
  const minutes = indiaDate.getMinutes();
  const displayHours = hours > 12 ? hours - 12 : hours || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  return `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

// Format date in India timezone (IST)
export const formatDate = (date) => {
  // Convert to India timezone (IST = UTC+5:30)
  const indiaDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  return indiaDate.toISOString().slice(0, 10);
};

// Get created by label
export const createdByLabel = (id, users) => {
  if (id === 'System') return 'System';
  const user = users.find(u => u.id === id);
  if (!user) return id;
  return `${user.name} (${user.role})`;
};
// Get API base URL
export const getApiUrl = () => {
  // In production, use relative URLs
  if (process.env.NODE_ENV === 'production') {
    return window.location.origin + '/api';
  }
  return process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
};

// Get base URL for file access
export const getBaseUrl = () => {
  // In production, use relative URLs
  if (process.env.NODE_ENV === 'production') {
    return window.location.origin;
  }
  return process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
};

// Get full file URL with proper path handling
export const getFileUrl = (path) => {
  if (!path) return null;
  
  // If path is already a full URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  return `${getBaseUrl()}/${cleanPath}`;
};