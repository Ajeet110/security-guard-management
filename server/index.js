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
const socketHandler = require('./socket/socketHandler');

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
const uploadsDir = process.env.UPLOADS_DIR || 'uploads';
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

// Socket.io
socketHandler(io);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'SecureGuard Connect API is running' });
});

// Debug endpoint to check database status
app.get('/api/debug', (req, res) => {
  try {
    if (!db) {
      return res.json({ 
        status: 'error', 
        message: 'Database not initialized',
        dbPath: process.env.DATABASE_URL || path.join(__dirname, 'database/secureguard.db')
      });
    }
    
    // Try to query users table
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    res.json({ 
      status: 'ok', 
      message: 'Database is working',
      userCount: userCount.count,
      dbPath: process.env.DATABASE_URL || path.join(__dirname, 'database/secureguard.db')
    });
  } catch (error) {
    res.json({ 
      status: 'error', 
      message: error.message,
      stack: error.stack,
      dbPath: process.env.DATABASE_URL || path.join(__dirname, 'database/secureguard.db')
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
