const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

let db = null;
// Use environment variable or default path
const dbPath = process.env.DATABASE_URL || path.join(__dirname, 'secureguard.db');

// Helper to ensure database directory exists
const ensureDbDirExists = () => {
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`📁 Created database directory: ${dbDir}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to create database directory ${dbDir}:`, error.message);
      return false;
    }
  }
  return true;
};

const initDatabase = async () => {
  try {
    console.log('🔄 Initializing sql.js...');
    
    // Ensure database directory exists
    if (!ensureDbDirExists()) {
      throw new Error(`Failed to create database directory: ${path.dirname(dbPath)}`);
    }
    
    // Initialize sql.js with explicit WASM loading for Render compatibility
    let SQL;
    try {
      // Try to load sql.js with default settings first
      SQL = await initSqlJs();
      console.log('✅ sql.js initialized successfully with default settings');
    } catch (error) {
      console.log('⚠️ Default sql.js initialization failed, trying alternative...');
      console.log('Error:', error.message);
      
      // Try alternative initialization for Render/Node.js environment
      // sql.js may need explicit WASM file path in some environments
      try {
        // In Render environment, we might need to use the local file system
        const wasmBinary = fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'));
        SQL = await initSqlJs({ wasmBinary });
        console.log('✅ sql.js initialized successfully with explicit WASM binary');
      } catch (wasmError) {
        console.error('❌ Failed to load sql.js with explicit WASM:', wasmError.message);
        
        // Last resort: try without WASM (will be slower but should work)
        console.log('🔄 Trying sql.js without WASM (slower but functional)...');
        SQL = await initSqlJs({ locateFile: () => '' });
        console.log('✅ sql.js initialized without WASM (slower mode)');
      }
    }
  
  // Load existing database or create new one
  let buffer;
  try {
    console.log(`📁 Checking for existing database at: ${dbPath}`);
    buffer = fs.readFileSync(dbPath);
    console.log(`✅ Found existing database file (${buffer.length} bytes)`);
  } catch (err) {
    console.log(`ℹ️ No existing database found, will create new one: ${err.message}`);
    buffer = null;
  }

  console.log('🔄 Creating sql.js database instance...');
  db = new SQL.Database(buffer);
  console.log('✅ Database instance created successfully');

  // Add display_password column if it doesn't exist (migration)
  try {
    db.run(`ALTER TABLE users ADD COLUMN display_password TEXT`);
    console.log('✅ Added display_password column');
  } catch (err) {
    // Column already exists, ignore error
  }

  // Add rejection columns to documents table if they don't exist (migration)
  try {
    db.run(`ALTER TABLE documents ADD COLUMN is_rejected INTEGER DEFAULT 0`);
    console.log('✅ Added is_rejected column to documents');
  } catch (err) {
    // Column already exists, ignore error
  }

  try {
    db.run(`ALTER TABLE documents ADD COLUMN rejection_reason TEXT`);
    console.log('✅ Added rejection_reason column to documents');
  } catch (err) {
    // Column already exists, ignore error
  }

  // Add description column to conversations table (migration)
  try {
    db.run(`ALTER TABLE conversations ADD COLUMN description TEXT`);
    console.log('✅ Added description column to conversations');
  } catch (err) {
    // Column already exists, ignore error
  }

  // Add updated_at column to conversations table (migration)
  try {
    db.run(`ALTER TABLE conversations ADD COLUMN updated_at DATETIME`);
    console.log('✅ Added updated_at column to conversations');
  } catch (err) {
    // Column already exists, ignore error
  }

  // Add verification columns to attendance table if they don't exist (migration)
  try {
    db.run(`ALTER TABLE attendance ADD COLUMN is_verified INTEGER DEFAULT 0`);
    console.log('✅ Added is_verified column to attendance');
  } catch (err) {
    // Column already exists, ignore error
  }

  try {
    db.run(`ALTER TABLE attendance ADD COLUMN is_rejected INTEGER DEFAULT 0`);
    console.log('✅ Added is_rejected column to attendance');
  } catch (err) {
    // Column already exists, ignore error
  }

  try {
    db.run(`ALTER TABLE attendance ADD COLUMN rejection_reason TEXT`);
    console.log('✅ Added rejection_reason column to attendance');
  } catch (err) {
    // Column already exists, ignore error
  }

  try {
    db.run(`ALTER TABLE attendance ADD COLUMN verified_by INTEGER`);
    console.log('✅ Added verified_by column to attendance');
  } catch (err) {
    // Column already exists, ignore error
  }

  try {
    db.run(`ALTER TABLE attendance ADD COLUMN verified_at DATETIME`);
    console.log('✅ Added verified_at column to attendance');
  } catch (err) {
    // Column already exists, ignore error
  }

  // Create tables
  console.log('🔄 Creating database tables...');
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_password TEXT,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Owner', 'Manager', 'Supervisor', 'Guard')),
      parent_id INTEGER,
      mobile TEXT,
      email TEXT,
      location TEXT,
      shift TEXT,
      profile_photo TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen DATETIME,
      is_online INTEGER DEFAULT 0,
      FOREIGN KEY (parent_id) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);
  console.log('✅ Users table created/verified');

  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      doc_type TEXT NOT NULL CHECK(doc_type IN ('aadhaar', 'pan', 'police_verification', 'bank_passbook')),
      file_path TEXT NOT NULL,
      is_verified INTEGER DEFAULT 0,
      is_rejected INTEGER DEFAULT 0,
      rejection_reason TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      photo_path TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_verified INTEGER DEFAULT 0,
      is_rejected INTEGER DEFAULT 0,
      rejection_reason TEXT,
      verified_by INTEGER,
      verified_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('personal', 'group')),
      name TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS conversation_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      is_admin INTEGER DEFAULT 0,
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(conversation_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      reply_to INTEGER,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id),
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (reply_to) REFERENCES messages(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS message_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('sent', 'delivered', 'read')),
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES messages(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(message_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS message_deletions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES messages(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(message_id, user_id)
    )
  `);

  // Create owner account if not exists
  console.log('🔄 Checking for owner account...');
  const ownerCheck = db.prepare("SELECT * FROM users WHERE user_id = ?");
  ownerCheck.bind(['2026']);
  const ownerExists = ownerCheck.step();
  ownerCheck.free();
  
  if (!ownerExists) {
    console.log('🔄 Creating owner account...');
    const hashedPassword = bcrypt.hashSync('owner123', 10);
    const stmt = db.prepare(
      "INSERT INTO users (user_id, password, display_password, name, role, created_by) VALUES (?, ?, ?, ?, ?, NULL)"
    );
    stmt.bind(['2026', hashedPassword, 'owner123', 'System Owner', 'Owner']);
    stmt.step();
    stmt.free();
    saveDatabase();
    console.log('✅ Owner account created - ID: 2026, Password: owner123');
  } else {
    console.log('ℹ️ Owner account already exists');
    // Update owner's display password if not set
    const updateStmt = db.prepare("UPDATE users SET display_password = ? WHERE user_id = ? AND display_password IS NULL");
    updateStmt.bind(['owner123', '2026']);
    updateStmt.step();
    updateStmt.free();
    saveDatabase();
  }

  // Set default display passwords for all users without one
  try {
    const usersWithoutPassword = db.prepare("SELECT id, user_id, role FROM users WHERE display_password IS NULL OR display_password = 'guard123'");
    const users = [];
    
    while (usersWithoutPassword.step()) {
      const values = usersWithoutPassword.get();
      users.push({
        id: values[0],
        user_id: values[1],
        role: values[2]
      });
    }
    usersWithoutPassword.free();

    // Update each user with a proper password based on role
    users.forEach(user => {
      let defaultPassword;
      
      switch (user.role) {
        case 'Owner':
          defaultPassword = 'owner123';
          break;
        case 'Manager':
          defaultPassword = `Mgr@${user.user_id.slice(-4)}`;
          break;
        case 'Supervisor':
          defaultPassword = `Sup@${user.user_id.slice(-4)}`;
          break;
        case 'Guard':
          defaultPassword = `Grd@${user.user_id.slice(-4)}`;
          break;
        default:
          defaultPassword = 'guard123';
      }
      
      // Update display password
      const updateStmt = db.prepare("UPDATE users SET display_password = ? WHERE id = ?");
      updateStmt.bind([defaultPassword, user.id]);
      updateStmt.step();
      updateStmt.free();

      // Also update the hashed password
      const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
      const updateHashStmt = db.prepare("UPDATE users SET password = ? WHERE id = ?");
      updateHashStmt.bind([hashedPassword, user.id]);
      updateHashStmt.step();
      updateHashStmt.free();
    });

    if (users.length > 0) {
      saveDatabase();
      console.log(`✅ Set proper passwords for ${users.length} users`);
    }
  } catch (err) {
    console.error('Error setting default passwords:', err);
  }

  // Create indexes for performance optimization
  try {
    // Attendance table indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_attendance_marked_at ON attendance(marked_at)');
    db.run('CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(DATE(marked_at))');
    db.run('CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(is_verified, is_rejected)');
    
    // Users table indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');
    db.run('CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id)');
    
    // Documents table indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(is_verified, is_rejected)');
    
    // Messages table indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at)');
    
    console.log('✅ Database indexes created for performance optimization');
  } catch (err) {
    console.error('❌ Error creating indexes:', err.message);
  }

  // Save database to file
  saveDatabase();

  console.log('✅ Database initialized successfully');
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  console.error('Stack trace:', error.stack);
  throw error;
}
};

const saveDatabase = () => {
  if (db) {
    const data = db.export();
    fs.writeFileSync(dbPath, data);
  }
};

// Wrapper functions to match better-sqlite3 API
const prepare = (sql) => {
  if (!db) {
    throw new Error('Database not initialized yet. Ensure initDatabase() has completed before making queries.');
  }
  return {
    run: (...params) => {
      try {
        // Prepare statement with sql.js
        const stmt = db.prepare(sql);
        stmt.bind(params);
        stmt.step();
        
        // Get last insert rowid BEFORE freeing the statement
        const lastIdStmt = db.prepare("SELECT last_insert_rowid() as id");
        lastIdStmt.step();
        const lastId = lastIdStmt.get()[0];
        lastIdStmt.free();
        
        stmt.free();
        saveDatabase();
        
        return { lastInsertRowid: lastId };
      } catch (error) {
        console.error('SQL Error:', error);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw error;
      }
    },
    get: (...params) => {
      try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        
        if (stmt.step()) {
          const columns = stmt.getColumnNames();
          const values = stmt.get();
          const obj = {};
          columns.forEach((col, i) => {
            obj[col] = values[i];
          });
          stmt.free();
          return obj;
        }
        
        stmt.free();
        return null;
      } catch (error) {
        console.error('SQL Error:', error);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw error;
      }
    },
    all: (...params) => {
      try {
        const stmt = db.prepare(sql);
        stmt.bind(params);
        
        const results = [];
        const columns = stmt.getColumnNames();
        
        while (stmt.step()) {
          const values = stmt.get();
          const obj = {};
          columns.forEach((col, i) => {
            obj[col] = values[i];
          });
          results.push(obj);
        }
        
        stmt.free();
        return results;
      } catch (error) {
        console.error('SQL Error:', error);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw error;
      }
    }
  };
};

const dbWrapper = {
  prepare,
  exec: (sql) => {
    db.run(sql);
    saveDatabase();
  }
};

module.exports = { db: dbWrapper, initDatabase };
