const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

// Use production database in production environment
const dbModule = process.env.NODE_ENV === 'production' 
  ? require('./database/db-production')
  : require('./database/db');
const db = dbModule;

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
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Serve uploads directory
const uploadsDir = process.env.UPLOADS_DIR || 'uploads';
app.use('/uploads', express.static(path.resolve(uploadsDir)));

// Initialize database
db.initDatabase();

// Start attendance scheduler
try {
  require('./scheduler');
  console.log('⏰ Attendance scheduler started');
} catch (error) {
  console.error('❌ Failed to start scheduler:', error.message);
}

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

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
  console.log(`🌐 CORS origin: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
  console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
});
