# Current Schedules & Delete Operations Status

## 🔒 Automatic Schedules (Cron Jobs)

### Status: **ALL DISABLED** ✅

**File**: `server/scheduler.js`

### Previously Active Schedules (NOW DISABLED):

#### 1. Daily Archival Schedule
- **Time**: 00:00 IST (18:30 UTC)
- **Frequency**: Once per day
- **Action**: Archive old verified attendance
- **Status**: ❌ **DISABLED** (commented out)
- **What it did**: 
  - Archived verified attendance older than 30 days
  - Deleted archived records from main table
- **Current**: Does nothing, all data kept permanently

#### 2. Rejected Cleanup Schedule
- **Time**: Every 6 hours
- **Frequency**: 4 times per day
- **Action**: Delete rejected attendance
- **Status**: ❌ **DISABLED** (commented out)
- **What it did**:
  - Deleted rejected attendance older than 7 days
- **Current**: Does nothing, even rejected records kept

### Current Scheduler Behavior:
```
✅ No automatic deletion
✅ No automatic archival
✅ No automatic cleanup
✅ All data preserved forever
✅ Only manual deletion allowed
```

---

## 🗑️ Manual Delete Operations

These DELETE operations only run when **manually triggered** by admin/user:

### 1. User Deletion
**File**: `server/routes/management.js`
**Trigger**: Admin clicks "Delete User" button
**What it deletes**: 
- ✅ One specific user (by ID)
- ✅ Only when admin explicitly requests
- ✅ Has permission checks (can't delete Owner)
- ✅ Checks for subordinates first

**Code**:
```javascript
DELETE FROM users WHERE id = ?
```

### 2. Document Rejection
**File**: `server/routes/documents.js`
**Trigger**: Manager/Supervisor rejects a document
**What it deletes**:
- ✅ One specific document (by ID)
- ✅ Only when explicitly rejected
- ✅ Deletes file and database record

**Code**:
```javascript
DELETE FROM documents WHERE id = ?
```

### 3. Attendance Re-upload
**File**: `server/routes/attendance.js`
**Trigger**: Guard re-uploads rejected attendance
**What it deletes**:
- ✅ Old rejected attendance record
- ✅ Only to allow new upload
- ✅ Automatic but necessary for functionality

**Code**:
```javascript
DELETE FROM attendance WHERE id = ?
```

### 4. Logout (Token Cleanup)
**File**: `server/routes/auth.js`
**Trigger**: User logs out
**What it deletes**:
- ✅ User's refresh token
- ✅ Only for security
- ✅ Does not affect user data

**Code**:
```javascript
DELETE FROM refresh_tokens WHERE token = ?
```

### 5. Leave Group
**File**: `server/routes/chat.js`
**Trigger**: User leaves a group chat
**What it deletes**:
- ✅ User's participation in that group
- ✅ Does not delete messages or group
- ✅ Only removes user from participants

**Code**:
```javascript
DELETE FROM conversation_participants WHERE conversation_id = ? AND user_id = ?
```

### 6. Remove from Role Groups
**File**: `server/routes/groups.js`
**Trigger**: User role changes or user deleted
**What it deletes**:
- ✅ User's membership in role-based groups
- ✅ Automatic cleanup when user deleted
- ✅ Does not delete messages

**Code**:
```javascript
DELETE FROM conversation_participants WHERE conversation_id = ? AND user_id = ?
```

---

## 🛠️ Utility Scripts (Manual Only)

These scripts must be **manually run** by developer:

### 1. Reset Attendance Script
**File**: `server/resetAttendance.js`
**How to run**: `node server/resetAttendance.js`
**What it does**: Deletes ALL attendance records
**Status**: ⚠️ Manual execution only
**Use case**: Testing or emergency cleanup

### 2. Clear Pending Attendance Script
**File**: `server/clearPendingAttendance.js`
**How to run**: `node server/clearPendingAttendance.js`
**What it does**: Deletes only pending (unverified) attendance
**Status**: ⚠️ Manual execution only
**Use case**: Clear stuck pending records

### 3. Clear All Attendance Script
**File**: `server/clearAllAttendance.js`
**How to run**: `node server/clearAllAttendance.js`
**What it does**: Deletes ALL attendance records
**Status**: ⚠️ Manual execution only
**Use case**: Complete reset

---

## 📊 Summary

### Automatic Operations (Scheduled)
| Schedule | Status | Frequency | Action |
|----------|--------|-----------|--------|
| Daily Archival | ❌ DISABLED | - | None |
| Rejected Cleanup | ❌ DISABLED | - | None |

**Total Automatic Schedules**: 0 (All disabled)

### Manual Operations (User/Admin Triggered)
| Operation | Trigger | Affects | Safe? |
|-----------|---------|---------|-------|
| Delete User | Admin action | 1 user | ✅ Yes |
| Reject Document | Manager action | 1 document | ✅ Yes |
| Re-upload Attendance | Guard action | 1 old record | ✅ Yes |
| Logout | User action | 1 token | ✅ Yes |
| Leave Group | User action | 1 membership | ✅ Yes |
| Role Change | Admin action | Group memberships | ✅ Yes |

**Total Manual Operations**: 6 (All safe and necessary)

### Utility Scripts (Developer Only)
| Script | Execution | Danger Level | Use Case |
|--------|-----------|--------------|----------|
| resetAttendance.js | Manual | ⚠️ High | Testing |
| clearPendingAttendance.js | Manual | ⚠️ Medium | Cleanup |
| clearAllAttendance.js | Manual | ⚠️ High | Reset |

**Total Utility Scripts**: 3 (Manual execution only)

---

## 🔐 Data Protection Status

### What NEVER Gets Deleted Automatically:
1. ✅ **Users** - Permanent storage
2. ✅ **Attendance** - All records kept forever
3. ✅ **Documents** - Permanent storage
4. ✅ **Messages** - Permanent storage
5. ✅ **Conversations** - Permanent storage
6. ✅ **Database file** - Never removed

### What Gets Deleted (Manual Only):
1. ⚠️ **Specific user** - When admin explicitly deletes
2. ⚠️ **Rejected document** - When manager rejects
3. ⚠️ **Old rejected attendance** - When guard re-uploads
4. ⚠️ **Refresh tokens** - When user logs out
5. ⚠️ **Group membership** - When user leaves group

### What Gets Deleted (Utility Scripts):
1. ⚠️ **All attendance** - Only if developer runs script
2. ⚠️ **Pending attendance** - Only if developer runs script

---

## 🎯 Current Configuration

```javascript
// server/scheduler.js
console.log('🔒 DATA PROTECTION MODE: ENABLED');
console.log('  ✅ Users: NEVER deleted');
console.log('  ✅ Attendance: NEVER deleted');
console.log('  ✅ Documents: NEVER deleted');
console.log('  ✅ Messages: NEVER deleted');
console.log('  ✅ All data: PERMANENT storage');
console.log('  ✅ No automatic cleanup');
console.log('  ✅ Manual deletion only (by admin)');
```

---

## ⚠️ Important Notes

### Database Growth
- With no automatic cleanup, database will grow over time
- Monitor database size regularly
- Consider manual cleanup if needed
- Render free tier: 1 GB disk space

### Manual Cleanup Options
If database grows too large:
1. Export old data to backup
2. Manually delete very old records (>1 year)
3. Archive to separate database
4. Upgrade to larger disk

### Render Disk Required
- **CRITICAL**: Enable Render Disk for persistence
- Without disk: Database deleted on every restart
- With disk: All data preserved forever

---

## 📝 Recommendations

### Current Setup (All Schedules Disabled):
**Pros**:
- ✅ No data loss
- ✅ Complete history preserved
- ✅ Easy to audit
- ✅ No surprises

**Cons**:
- ⚠️ Database will grow continuously
- ⚠️ May need manual cleanup eventually
- ⚠️ Slower queries with large datasets

### If Database Grows Too Large:
1. Enable Render Disk (1 GB free)
2. Monitor database size monthly
3. Consider archival after 6-12 months
4. Export old data before cleanup
5. Keep backups before any deletion

---

**Status**: ✅ All automatic schedules DISABLED
**Data Protection**: ✅ MAXIMUM (nothing deleted automatically)
**Manual Control**: ✅ Full admin control over deletions
**Render Disk**: ⚠️ REQUIRED for persistence

**Last Updated**: April 29, 2026
