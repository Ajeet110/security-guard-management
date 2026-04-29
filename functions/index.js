const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const { db, initDatabase } = require('./database/db');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const chatRoutes = require('./routes/chat');
const attendanceRoutes = require('./routes/attendance');
const documentRoutes = require('./routes/documents');
const managementRoutes = require('./routes/management');
const { router: groupsRoutes } = require('./routes/groups');
const recycleBinRoutes = require('./routes/recycleBin');
const backupRoutes = require('./routes/backup');
const socketHandler = require('./socket/socketHandler');
const { authenticateToken } = require('./middleware/auth');
const { fileAccessControl } = require('./middleware/fileAccess');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Middleware
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:3000';
    // Allow requests with no origin (mobile apps, curl, etc.) or matching origin
    if (!origin || origin === allowedOrigin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Serve uploads directory
let uploadsDir = process.env.UPLOADS_DIR || 'uploads';

// On Render, check if we should use persistent storage for uploads
if (process.env.RENDER && !process.env.UPLOADS_DIR) {
  // Try to use persistent disk if available
  const persistentUploadsDir = '/opt/render/project/persistent/uploads';
  const ephemeralUploadsDir = '/opt/render/project/src/uploads';
  
  console.log(`🔄 Render environment detected for uploads`);
  console.log(`📁 Checking for persistent uploads directory at: ${persistentUploadsDir}`);
  
  // Check if persistent directory exists
  const fs = require('fs');
  const persistentDir = '/opt/render/project/persistent';
  
  try {
    // Try to create persistent directory if it doesn't exist
    if (!fs.existsSync(persistentDir)) {
      fs.mkdirSync(persistentDir, { recursive: true });
      console.log(`📁 Created persistent directory: ${persistentDir}`);
    }
    
    // Use persistent path for uploads
    uploadsDir = persistentUploadsDir;
    console.log(`✅ Using persistent uploads directory: ${uploadsDir}`);
  } catch (error) {
    console.log(`⚠️ Could not use persistent storage for uploads: ${error.message}`);
    console.log(`ℹ️ Falling back to: ${ephemeralUploadsDir}`);
    uploadsDir = ephemeralUploadsDir;
  }
}

// Ensure uploads directory exists
const fs = require('fs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`📁 Created uploads directory: ${uploadsDir}`);
}
app.use('/uploads', express.static(path.resolve(uploadsDir)));

// Make io available to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/management', managementRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/recycle-bin', recycleBinRoutes);
app.use('/api/backup', backupRoutes);

// Socket.io
socketHandler(io);

// Health check
app.get('/api/health', (req, res) => {
  try {
    const { db } = require('./database/db');
    
    if (!db) {
      return res.status(503).json({ 
        status: 'error', 
        message: 'Database not initialized',
        healthy: false
      });
    }
    
    // Simple query to verify database is working
    try {
      db.prepare('SELECT 1 as test').get();
      res.json({ 
        status: 'ok', 
        message: 'SecureGuard Connect API is running',
        healthy: true,
        timestamp: new Date().toISOString()
      });
    } catch (dbError) {
      res.status(503).json({ 
        status: 'error', 
        message: 'Database query failed',
        error: dbError.message,
        healthy: false,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      message: 'Health check failed',
      error: error.message,
      healthy: false,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to check IST time
app.get('/api/debug/time', (req, res) => {
  try {
    const { getISTInfo } = require('./utils/dateUtils');
    const timeInfo = getISTInfo();
    
    res.json({
      status: 'ok',
      message: 'IST Time Debug Information',
      ...timeInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint to check database status
app.get('/api/debug', (req, res) => {
  try {
    const { db } = require('./database/db');
    
    if (!db) {
      return res.json({ 
        status: 'error', 
        message: 'Database not initialized',
        dbPath: process.env.DATABASE_URL || path.join(__dirname, 'database/secureguard.db'),
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform
      });
    }
    
    // Try to query users table
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    
    // Try to get the owner user
    const owner = db.prepare('SELECT id, user_id, name, role FROM users WHERE user_id = ?').get('2026');
    
    // Check if we can create a user (test write operation)
    const testUserId = Date.now().toString();
    try {
      const testResult = db.prepare(`
        INSERT INTO users (user_id, password, display_password, name, role, created_by)
        VALUES (?, ?, ?, ?, ?, NULL)
      `).run(testUserId, 'test_hash', 'test123', 'Test User', 'Guard');
      
      // Delete the test user
      db.prepare('DELETE FROM users WHERE user_id = ?').run(testUserId);
      
      var writeTest = { success: true, testUserId };
    } catch (writeError) {
      var writeTest = { success: false, error: writeError.message };
    }
    
    res.json({ 
      status: 'ok', 
      message: 'Database is working',
      userCount: userCount.count,
      owner: owner,
      writeTest,
      dbPath: process.env.DATABASE_URL || path.join(__dirname, 'database/secureguard.db'),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET_SET: !!process.env.JWT_SECRET,
        JWT_REFRESH_SECRET_SET: !!process.env.JWT_REFRESH_SECRET,
        CLIENT_URL: process.env.CLIENT_URL,
        DATABASE_URL: process.env.DATABASE_URL,
        UPLOADS_DIR: process.env.UPLOADS_DIR
      },
      system: {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage()
      }
    });
  } catch (error) {
    res.json({ 
      status: 'error', 
      message: error.message,
      stack: error.stack,
      dbPath: process.env.DATABASE_URL || path.join(__dirname, 'database/secureguard.db'),
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform
    });
  }
});

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

// Initialize database FIRST, then start server
initDatabase().then(() => {
  // Start attendance scheduler after DB is ready
  try {
    require('./scheduler');
    console.log('⏰ Attendance scheduler started');
  } catch (error) {
    console.error('❌ Failed to start scheduler:', error.message);
  }

  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Uploads directory: ${uploadsDir}`);
    console.log(`🌐 CORS origin: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
    console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}).catch((err) => {
  console.error('❌ Failed to initialize database:', err);
  process.exit(1);
});
