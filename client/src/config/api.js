// API Configuration for different environments
// This ensures proper URL handling in development and production

// Get the base URL based on environment
export const getBaseURL = () => {
  // If REACT_APP_API_URL is set, use it (for custom deployments)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Check if we're running in browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If hostname is localhost or 127.0.0.1, use localhost:5000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    
    // Otherwise use the same origin (for Render, Vercel, etc.)
    return window.location.origin;
  }
  
  // Fallback for SSR or build time
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

// Debug logging in development
if (typeof window !== 'undefined') {
  console.log('🔧 API Config:', {
    hostname: window.location.hostname,
    baseURL: apiConfig.baseURL,
    apiURL: apiConfig.apiURL
  });
}

export default apiConfig;
