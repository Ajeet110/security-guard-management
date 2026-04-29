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

  // Migration: Update documents table to support 10th and 12th marksheet
  try {
    // Check if we need to migrate by trying to insert a test record with new doc_type
    const testStmt = db.prepare("SELECT doc_type FROM documents WHERE doc_type = '10th_marksheet' LIMIT 1");
    testStmt.step();
    testStmt.free();
    
    // If we reach here, the constraint might be old, let's recreate the table
    console.log('🔄 Migrating documents table to support marksheets...');
    
    // Get existing data
    const existingDocs = [];
    const selectStmt = db.prepare("SELECT * FROM documents");
    const columns = selectStmt.getColumnNames();
    
    while (selectStmt.step()) {
      const values = selectStmt.get();
      const doc = {};
      columns.forEach((col, i) => {
        doc[col] = values[i];
      });
      existingDocs.push(doc);
    }
    selectStmt.free();
    
    // Drop old table
    db.run("DROP TABLE IF EXISTS documents_old");
    db.run("ALTER TABLE documents RENAME TO documents_old");
    
    // Create new table with updated constraint
    db.run(`
      CREATE TABLE documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        doc_type TEXT NOT NULL CHECK(doc_type IN ('aadhaar', 'pan', 'police_verification', 'bank_passbook', '10th_marksheet', '12th_marksheet')),
        file_path TEXT NOT NULL,
        is_verified INTEGER DEFAULT 0,
        is_rejected INTEGER DEFAULT 0,
        rejection_reason TEXT,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    // Restore data
    if (existingDocs.length > 0) {
      const insertStmt = db.prepare(`
        INSERT INTO documents (id, user_id, doc_type, file_path, is_verified, is_rejected, rejection_reason, uploaded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      existingDocs.forEach(doc => {
        insertStmt.bind([
          doc.id,
          doc.user_id,
          doc.doc_type,
          doc.file_path,
          doc.is_verified,
          doc.is_rejected,
          doc.rejection_reason,
          doc.uploaded_at
        ]);
        insertStmt.step();
        insertStmt.reset();
      });
      insertStmt.free();
      
      console.log(`✅ Migrated ${existingDocs.length} documents to new table`);
    }
    
    // Drop old table
    db.run("DROP TABLE IF EXISTS documents_old");
    
    saveDatabase();
    console.log('✅ Documents table migration completed');
  } catch (err) {
    // Migration already done or not needed
    console.log('ℹ️ Documents table migration not needed or already completed');
  }

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

  // Create deleted_items table for recycle bin functionality
  db.run(`
    CREATE TABLE IF NOT EXISTS deleted_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_type TEXT NOT NULL CHECK(item_type IN ('user', 'attendance', 'document')),
      item_id INTEGER NOT NULL,
      item_data TEXT NOT NULL,
      deleted_by INTEGER NOT NULL,
      deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      auto_delete_at DATETIME NOT NULL,
      FOREIGN KEY (deleted_by) REFERENCES users(id)
    )
  `);
  console.log('✅ Deleted items (recycle bin) table created/verified');

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
      "INSERT INTO users (user_id, password, name, role, created_by) VALUES (?, ?, ?, ?, NULL)"
    );
    stmt.bind(['2026', hashedPassword, 'System Owner', 'Owner']);
    stmt.step();
    stmt.free();
    saveDatabase();
    console.log('✅ Owner account created - ID: 2026, Password: owner123');
  } else {
    console.log('ℹ️ Owner account already exists');
  }

  // Remove display_password column for security (if it exists)
  try {
    // Check if display_password column exists
    const tableInfo = db.prepare("PRAGMA table_info(users)");
    const columns = [];
    while (tableInfo.step()) {
      const values = tableInfo.get();
      columns.push(values[1]); // Column name is at index 1
    }
    tableInfo.free();

    if (columns.includes('display_password')) {
      console.log('🔄 Removing insecure display_password column...');
      
      // Get existing data without display_password
      const existingUsers = [];
      const selectStmt = db.prepare("SELECT id, user_id, password, name, role, parent_id, mobile, email, location, shift, profile_photo, created_by, created_at, last_seen, is_online FROM users");
      
      while (selectStmt.step()) {
        const values = selectStmt.get();
        existingUsers.push({
          id: values[0],
          user_id: values[1],
          password: values[2],
          name: values[3],
          role: values[4],
          parent_id: values[5],
          mobile: values[6],
          email: values[7],
          location: values[8],
          shift: values[9],
          profile_photo: values[10],
          created_by: values[11],
          created_at: values[12],
          last_seen: values[13],
          is_online: values[14]
        });
      }
      selectStmt.free();
      
      // Drop old table and recreate without display_password
      db.run("DROP TABLE IF EXISTS users_old");
      db.run("ALTER TABLE users RENAME TO users_old");
      
      // Create new users table without display_password
      db.run(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
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
      
      // Restore data
      if (existingUsers.length > 0) {
        const insertStmt = db.prepare(`
          INSERT INTO users (id, user_id, password, name, role, parent_id, mobile, email, location, shift, profile_photo, created_by, created_at, last_seen, is_online)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        existingUsers.forEach(user => {
          insertStmt.bind([
            user.id,
            user.user_id,
            user.password,
            user.name,
            user.role,
            user.parent_id,
            user.mobile,
            user.email,
            user.location,
            user.shift,
            user.profile_photo,
            user.created_by,
            user.created_at,
            user.last_seen,
            user.is_online
          ]);
          insertStmt.step();
          insertStmt.reset();
        });
        insertStmt.free();
        
        console.log(`✅ Migrated ${existingUsers.length} users without display_password`);
      }
      
      // Drop old table
      db.run("DROP TABLE IF EXISTS users_old");
      
      saveDatabase();
      console.log('✅ Removed insecure display_password column');
    }
  } catch (err) {
    console.log('ℹ️ display_password column migration not needed or already completed');
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
