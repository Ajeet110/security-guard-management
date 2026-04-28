/**
 * Date and Time Utility Functions
 * Centralized date/time handling for consistent timezone management
 * All functions use Indian Standard Time (IST = UTC+5:30)
 */

/**
 * Get current IST timestamp in YYYY-MM-DD HH:MM:SS format
 * @returns {string} IST timestamp string
 */
function getLocalTimestamp() {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const istTime = new Date(now.getTime() + istOffset);
  
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istTime.getUTCDate()).padStart(2, '0');
  const hours = String(istTime.getUTCHours()).padStart(2, '0');
  const minutes = String(istTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(istTime.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get current IST date in YYYY-MM-DD format
 * @returns {string} IST date string
 */
function getLocalDate() {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const istTime = new Date(now.getTime() + istOffset);
  
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istTime.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get IST date N days ago in YYYY-MM-DD format
 * @param {number} daysAgo - Number of days to go back
 * @returns {string} IST date string
 */
function getDateDaysAgo(daysAgo) {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const istTime = new Date(now.getTime() + istOffset);
  
  // Subtract days
  istTime.setUTCDate(istTime.getUTCDate() - daysAgo);
  
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istTime.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Format timestamp for display (DD/MM/YYYY HH:MM AM/PM) in IST
 * @param {string} timestamp - Timestamp string
 * @returns {string} Formatted date-time string
 */
function formatDateTime(timestamp) {
  if (!timestamp) return '-';
  
  try {
    // Parse the timestamp and convert to IST
    const date = new Date(timestamp);
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
    const istTime = new Date(date.getTime() + istOffset);
    
    const day = String(istTime.getUTCDate()).padStart(2, '0');
    const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
    const year = istTime.getUTCFullYear();
    let hours = istTime.getUTCHours();
    const minutes = String(istTime.getUTCMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    
    return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return '-';
  }
}

/**
 * Format date for display (DD/MM/YYYY) in IST
 * @param {string} dateString - Date string
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
  if (!dateString) return '-';
  
  try {
    // Parse the date and convert to IST
    const date = new Date(dateString);
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
    const istTime = new Date(date.getTime() + istOffset);
    
    const day = String(istTime.getUTCDate()).padStart(2, '0');
    const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
    const year = istTime.getUTCFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
}

/**
 * Get IST time info for debugging
 * @returns {object} IST time information
 */
function getISTInfo() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  
  return {
    utc: now.toISOString(),
    ist: istTime.toISOString(),
    localDate: getLocalDate(),
    localTimestamp: getLocalTimestamp(),
    serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

/**
 * Get IST timestamp as number (for file naming)
 * @returns {number} IST timestamp in milliseconds
 */
function getISTTimestamp() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  return now.getTime() + istOffset;
}

module.exports = {
  getLocalTimestamp,
  getLocalDate,
  getDateDaysAgo,
  formatDateTime,
  formatDate,
  getISTInfo,
  getISTTimestamp
};
