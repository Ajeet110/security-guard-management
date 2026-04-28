/**
 * Production Database using better-sqlite3
 * More reliable for production deployments
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DATABASE_URL || path.join(__dirname, 'secureguard.db');
let db = null;

const initDatabase = () => {
  console.log('🔄 Initializing production database...');
  console.log('📁 Database path:', dbPath);

  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('✅ Created database directory');
  }

  // Initialize database
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  console.log('✅ Database connection established');

  // Create tables
  createTables();
  
  // Seed initial data
  seedInitialData();
  
  console.log('✅ Database initialization complete');
};

const createTables = () => {
  console.log('📋 Creating tables...');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_password TEXT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      mobile TEXT,
      email TEXT,
      location TEXT,
      shift TEXT,
      parent_id INTEGER,
      profile_photo TEXT,
      is_online INTEGER DEFAULT 0,
      last_seen DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES users(id)
    )
  `);

  // Attendance table
  db.exec(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      photo_path TEXT,
      is_verified INTEGER DEFAULT 0,
      is_rejected INTEGER DEFAULT 0,
      rejection_reason TEXT,
      verified_by INTEGER,
      verified_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (verified_by) REFERENCES users(id),
      UNIQUE(user_id, date)
    )
  `);

  // Documents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      doc_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      is_verified INTEGER DEFAULT 0,
      is_rejected INTEGER DEFAULT 0,
      rejection_reason TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Conversations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      type TEXT NOT NULL,
      description TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  // Conversation participants table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversation_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(conversation_id, user_id)
    )
  `);

  // Messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )
  `);

  // Refresh tokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  console.log('✅ Tables created');
};

const seedInitialData = () => {
  console.log('🌱 Seeding initial data...');

  // Check if owner exists
  const owner = db.prepare('SELECT * FROM users WHERE user_id = ?').get('2026');
  
  if (!owner) {
    console.log('👤 Creating owner account...');
    
    const hashedPassword = bcrypt.hashSync('owner123', 10);
    
    db.prepare(`
      INSERT INTO users (user_id, password, display_password, name, role, mobile, email)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('2026', hashedPassword, 'owner123', 'OWNER', 'Owner', '9876543210', 'owner@secureguard.com');
    
    console.log('✅ Owner account created');
    console.log('   User ID: 2026');
    console.log('   Password: owner123');
  } else {
    console.log('✅ Owner account already exists');
  }
};

// Export database instance and functions
module.exports = {
  db,
  initDatabase,
  get db() {
    if (!db) {
      throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
  }
};
