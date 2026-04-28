#!/usr/bin/env node

/**
 * Disk Persistence Verification Script
 * 
 * This script checks if Render's persistent disk is properly configured
 * Run this on Render to verify database persistence
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Render Disk Persistence Configuration...\n');

// Check environment variables
console.log('📋 Environment Variables:');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('  DATABASE_URL:', process.env.DATABASE_URL || 'not set');
console.log('  UPLOADS_DIR:', process.env.UPLOADS_DIR || 'not set');
console.log('');

// Check database path
const dbPath = process.env.DATABASE_URL || path.join(__dirname, 'database/secureguard.db');
const dbDir = path.dirname(dbPath);

console.log('📁 Database Configuration:');
console.log('  Database Path:', dbPath);
console.log('  Database Directory:', dbDir);

// Check if database directory exists
if (fs.existsSync(dbDir)) {
  console.log('  ✅ Database directory exists');
  
  // Check if database file exists
  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    console.log('  ✅ Database file exists');
    console.log('  📊 Database size:', (stats.size / 1024).toFixed(2), 'KB');
    console.log('  📅 Last modified:', stats.mtime.toISOString());
  } else {
    console.log('  ⚠️  Database file does not exist (will be created on first run)');
  }
  
  // Check write permissions
  try {
    const testFile = path.join(dbDir, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('  ✅ Write permissions OK');
  } catch (err) {
    console.log('  ❌ Write permissions FAILED:', err.message);
  }
} else {
  console.log('  ❌ Database directory does not exist');
  console.log('  💡 This will be created automatically on first run');
}

console.log('');

// Check uploads directory
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');
console.log('📁 Uploads Configuration:');
console.log('  Uploads Path:', uploadsDir);

if (fs.existsSync(uploadsDir)) {
  console.log('  ✅ Uploads directory exists');
  
  // Count files in uploads
  try {
    const attendanceDir = path.join(uploadsDir, 'attendance');
    const documentsDir = path.join(uploadsDir, 'documents');
    const profilesDir = path.join(uploadsDir, 'profiles');
    
    let totalFiles = 0;
    
    if (fs.existsSync(attendanceDir)) {
      const attendanceFiles = fs.readdirSync(attendanceDir).filter(f => f !== '.gitkeep');
      console.log('  📸 Attendance photos:', attendanceFiles.length);
      totalFiles += attendanceFiles.length;
    }
    
    if (fs.existsSync(documentsDir)) {
      const documentFiles = fs.readdirSync(documentsDir).filter(f => f !== '.gitkeep');
      console.log('  📄 Documents:', documentFiles.length);
      totalFiles += documentFiles.length;
    }
    
    if (fs.existsSync(profilesDir)) {
      const profileFiles = fs.readdirSync(profilesDir).filter(f => f !== '.gitkeep');
      console.log('  👤 Profile photos:', profileFiles.length);
      totalFiles += profileFiles.length;
    }
    
    console.log('  📊 Total files:', totalFiles);
  } catch (err) {
    console.log('  ⚠️  Could not count files:', err.message);
  }
  
  // Check write permissions
  try {
    const testFile = path.join(uploadsDir, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log('  ✅ Write permissions OK');
  } catch (err) {
    console.log('  ❌ Write permissions FAILED:', err.message);
  }
} else {
  console.log('  ❌ Uploads directory does not exist');
  console.log('  💡 This will be created automatically on first run');
}

console.log('');

// Check if running on Render
console.log('🌐 Platform Detection:');
if (process.env.RENDER) {
  console.log('  ✅ Running on Render');
  console.log('  📍 Render Service:', process.env.RENDER_SERVICE_NAME || 'unknown');
  console.log('  🔧 Render Instance:', process.env.RENDER_INSTANCE_ID || 'unknown');
  
  // Check if persistent disk is mounted
  const expectedMountPath = '/opt/render/project/src';
  if (dbPath.startsWith(expectedMountPath)) {
    console.log('  ✅ Database path uses persistent disk mount');
  } else {
    console.log('  ⚠️  Database path does NOT use persistent disk mount');
    console.log('  💡 Expected path to start with:', expectedMountPath);
    console.log('  💡 Actual path:', dbPath);
    console.log('  ⚠️  DATA WILL BE LOST ON RESTART!');
  }
} else {
  console.log('  ℹ️  Running locally (not on Render)');
}

console.log('');

// Summary
console.log('📝 Summary:');
if (process.env.RENDER && dbPath.startsWith('/opt/render/project/src')) {
  console.log('  ✅ Configuration looks good for Render deployment');
  console.log('  ✅ Database should persist across restarts');
} else if (process.env.RENDER) {
  console.log('  ⚠️  WARNING: Database may not persist on Render!');
  console.log('  💡 Check DATABASE_URL environment variable');
  console.log('  💡 Ensure Render Disk is properly configured');
} else {
  console.log('  ℹ️  Local development configuration');
}

console.log('');
console.log('🔗 Useful Links:');
console.log('  📖 Fix Guide: See RENDER_DATABASE_FIX.md');
console.log('  🌐 Render Dashboard: https://dashboard.render.com');
console.log('  🔍 Debug Endpoint: /api/debug');
console.log('');
