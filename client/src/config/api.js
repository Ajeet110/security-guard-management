// API Configuration for different environments
// This ensures proper URL handling in development and production

// Get the base URL based on environment
export const getBaseURL = () => {
  // If REACT_APP_API_URL is set, use it (for custom deployments)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // In production (or when running from a non-localhost domain), use same origin
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return window.location.origin;
  }
  
  // In development, use localhost
  return 'http://localhost:5000';
};

// Get API base URL (with /api suffix)
export const getApiURL = () => {
  const baseURL = getBaseURL();
  return `${baseURL}/api`;
};

// Get Socket URL
export const getSocketURL = () => {
  if (process.env.REACT_APP_SOCKET_URL) {
    return process.env.REACT_APP_SOCKET_URL;
  }
  return getBaseURL();
};

// Get full URL for uploaded files
export const getFileURL = (path) => {
  if (!path) return null;
  
  // If path is already a full URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  return `${getBaseURL()}/${cleanPath}`;
};

// Export configuration object
export const apiConfig = {
  baseURL: getBaseURL(),
  apiURL: getApiURL(),
  socketURL: getSocketURL(),
  timeout: 30000, // 30 seconds
  withCredentials: true
};

export default apiConfig;
