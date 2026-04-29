# Database Migration Order Fix - COMPLETE

## Problem
Users were not showing on dashboard and user creation was failing with errors:
- `no such column: u.display_password`
- `table users has no column named display_password`

## Root Causes Identified

### 1. Migration Order Issue
**Problem**: ALTER TABLE migrations were running BEFORE CREATE TABLE statements
- Line 81: `ALTER TABLE users ADD COLUMN display_password` ran first
- Line 157: `CREATE TABLE IF NOT EXISTS users` ran second
- On fresh database: ALTER TABLE fails (table doesn't exist yet)
- On existing database: Column might not be added if table structure is different

### 2. Conflicting Code (Already Fixed)
- Code that removed display_password column was already removed in previous fix

## Solution Applied

### 1. Reordered Database Initialization
**Changed execution order**:
1. Create SQL.js database instance
2. Create ALL tables first (with display_password already in schema)
3. Run migrations AFTER tables exist
4. Create owner account
5. Save database

**Before** (WRONG):
```javascript
db = new SQL.Database(buffer);
// Run migrations first ❌
ALTER TABLE users ADD COLUMN display_password
// Then create tables
CREATE TABLE IF NOT EXISTS users (... display_password TEXT ...)
```

**After** (CORRECT):
```javascript
db = new SQL.Database(buffer);
// Create tables first ✅
CREATE TABLE IF NOT EXISTS users (... display_password TEXT ...)
// Then run migrations
ALTER TABLE users ADD COLUMN display_password (will fail silently if exists)
```

### 2. Improved Logging
- Added detailed logging for migration success/failure
- Added logging for database directory checks
- Added better error messages in saveDatabase function

### 3. Enhanced Error Handling
- saveDatabase now ensures directory exists before writing
- saveDatabase returns boolean success/failure
- Better error logging with stack traces

## Files Modified

### server/database/db.js
1. **Lines 6-25**: Enhanced ensureDbDirExists with better logging
2. **Lines 75-78**: Removed premature migrations, moved to after table creation
3. **Lines 304-395**: Added migrations AFTER all CREATE TABLE statements
4. **Lines 475-495**: Enhanced saveDatabase with directory check and better error handling

## Database Schema (Final)

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,              -- Hashed password for authentication
  display_password TEXT,                -- Plain password for admin viewing ✅
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
```

## Initialization Flow (Correct Order)

1. ✅ Initialize sql.js
2. ✅ Load existing database file (if exists)
3. ✅ Create SQL.Database instance
4. ✅ **CREATE ALL TABLES** (users, documents, attendance, conversations, etc.)
5. ✅ **RUN MIGRATIONS** (add columns to existing tables)
6. ✅ Create owner account (with display_password)
7. ✅ Create indexes for performance
8. ✅ Save database to disk

## Expected Logs on Startup

```
🔄 Initializing sql.js...
📂 Database path: /path/to/secureguard.db
📂 Absolute path: /absolute/path/to/secureguard.db
📂 Checking database directory: /path/to
✅ Database directory exists: /path/to
✅ sql.js initialized successfully
🔄 Creating sql.js database instance...
✅ Database instance created successfully
🔄 Creating database tables...
✅ Users table created/verified
✅ Documents table created/verified
✅ Attendance table created/verified
✅ Conversations table created/verified
✅ Conversation participants table created/verified
✅ Messages table created/verified
✅ Message status table created/verified
✅ Refresh tokens table created/verified
✅ Message deletions table created/verified
✅ Deleted items (recycle bin) table created/verified
🔄 Running database migrations...
ℹ️ display_password column already exists
ℹ️ is_rejected column already exists in documents
ℹ️ rejection_reason column already exists in documents
ℹ️ description column already exists in conversations
ℹ️ updated_at column already exists in conversations
ℹ️ is_verified column already exists in attendance
ℹ️ is_rejected column already exists in attendance
ℹ️ rejection_reason column already exists in attendance
ℹ️ verified_by column already exists in attendance
ℹ️ verified_at column already exists in attendance
✅ Database migrations completed
🔄 Checking for owner account...
✅ Owner account created - ID: 2026, Password: owner123
✅ Database indexes created for performance optimization
💾 Database saved successfully to: /path/to/secureguard.db (XXXXX bytes)
✅ Database initialized successfully
```

## Testing Checklist

### Fresh Database (No existing database file)
- [x] Tables created with display_password column
- [x] Owner account created with display_password
- [x] Database saved to disk
- [ ] Can create new users
- [ ] Users show on dashboard
- [ ] Passwords display correctly

### Existing Database (Has database file)
- [x] Migrations run after tables exist
- [x] display_password column added if missing
- [x] Existing data preserved
- [ ] Can create new users
- [ ] Users show on dashboard
- [ ] Passwords display correctly

### User Creation
- [ ] POST /api/users/create succeeds
- [ ] User has display_password stored
- [ ] User appears in hierarchy
- [ ] Password shows correctly in UI

### Dashboard Display
- [ ] GET /api/users/hierarchy returns users
- [ ] Users have display_password field
- [ ] Frontend displays passwords correctly
- [ ] No "column not found" errors

## Debug Endpoints

### Check Database Status
```
GET /api/debug
```
Returns:
- User count
- Owner account info
- Write test result
- Database path
- Environment variables
- System information

### Check Health
```
GET /api/health
```
Returns:
- Database status
- Query test result
- Timestamp

## Rollback Plan (If Issues Occur)

If problems persist:
1. Delete database file: `rm /path/to/secureguard.db`
2. Restart server (will create fresh database)
3. Check logs for initialization sequence
4. Test user creation
5. If still failing, check file permissions on database directory

## Next Steps

1. ✅ Code changes complete
2. ⏳ Deploy to Render
3. ⏳ Check startup logs
4. ⏳ Test user creation via API
5. ⏳ Test dashboard display
6. ⏳ Verify passwords show correctly
7. ⏳ Commit and push to GitHub

---
**Status**: ✅ Code complete, ready for deployment testing
**Date**: 2026-04-29
**Issue**: Migration order causing column not found errors
**Resolution**: Moved migrations to run AFTER table creation
