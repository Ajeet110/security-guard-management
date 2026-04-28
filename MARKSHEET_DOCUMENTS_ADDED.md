# 10th and 12th Marksheet Documents Added

## Changes Made

### 1. Settings Modal (Guard Dashboard) ✅
**File**: `client/src/components/SettingsModal.js`

Added 10th and 12th marksheet options to the Settings modal:

#### Document Status Section
- Now shows 6 documents instead of 4
- Added: `10th_marksheet` and `12th_marksheet`
- Status badges show: Missing (red), Pending (orange), Verified (green)

#### Upload Document Section
- Added dropdown options:
  - 10th Marksheet
  - 12th Marksheet

### 2. Backend Document Routes ✅
**File**: `server/routes/documents.js`

Updated valid document types:
```javascript
const validTypes = [
  'aadhaar', 
  'pan', 
  'police_verification', 
  'bank_passbook', 
  '10th_marksheet',      // NEW
  '12th_marksheet',      // NEW
  'profile_photo'
];
```

### 3. Database Schema Migration ✅
**File**: `server/database/db.js`

Added automatic migration to update the `documents` table CHECK constraint:

**Old Constraint**:
```sql
CHECK(doc_type IN ('aadhaar', 'pan', 'police_verification', 'bank_passbook'))
```

**New Constraint**:
```sql
CHECK(doc_type IN ('aadhaar', 'pan', 'police_verification', 'bank_passbook', '10th_marksheet', '12th_marksheet'))
```

#### Migration Process
1. Backs up existing documents data
2. Renames old table to `documents_old`
3. Creates new table with updated constraint
4. Restores all existing documents
5. Drops old table
6. Saves database

### 4. Guard Dashboard Profile Section ✅
**File**: `client/src/pages/GuardDashboard.js`

Already has 10th and 12th marksheet in the Profile tab (added in previous update).

## Document Types Summary

### Total Documents: 6

1. **Aadhaar Card** - Identity proof
2. **PAN Card** - Tax identification
3. **Police Verification** - Background check
4. **Bank Passbook** - Bank details
5. **10th Marksheet** - Educational qualification (NEW)
6. **12th Marksheet** - Educational qualification (NEW)

## Profile Completion Calculation

Updated from 12.5% per document to 10% per document:
- 6 documents × 10% = 60% for documents
- Remaining 40% for other profile fields

## Where Guards Can Upload Documents

### Option 1: Guard Dashboard - Profile Tab
- Click on Profile tab in bottom navbar
- Scroll to "Documents" section
- See all 6 document types with upload buttons
- Upload directly from profile

### Option 2: Guard Dashboard - Settings Modal
- Click on user avatar (top right)
- Select "Settings"
- Go to "Documents" tab
- See document status for all 6 types
- Upload using dropdown + file selector

## Testing Checklist

- [x] Settings modal shows 10th marksheet option
- [x] Settings modal shows 12th marksheet option
- [x] Document status displays correctly for new types
- [x] Upload dropdown includes new document types
- [x] Backend accepts 10th_marksheet uploads
- [x] Backend accepts 12th_marksheet uploads
- [x] Database migration runs successfully
- [x] Existing documents preserved after migration
- [x] Profile tab shows all 6 document types
- [x] Profile completion calculation updated

## Database Migration Notes

### Automatic Migration
- Runs automatically on server start
- Safe: Backs up data before migration
- Idempotent: Can run multiple times safely
- Logs migration status to console

### Migration Logs
```
🔄 Migrating documents table to support marksheets...
✅ Migrated X documents to new table
✅ Documents table migration completed
```

Or if already migrated:
```
ℹ️ Documents table migration not needed or already completed
```

## File Upload Specifications

### Accepted File Types
- JPG, JPEG, PNG (images)
- PDF (documents)

### File Size Limit
- Maximum: 10 MB per file

### Storage Location
- Server: `uploads/documents/`
- Filename format: `{timestamp}-{userId}-{docType}.{ext}`

## API Endpoints

### Upload Document
```
POST /api/documents/upload
Headers: Authorization: Bearer {token}
Body: FormData
  - doc_type: '10th_marksheet' | '12th_marksheet'
  - file: File
```

### Get User Documents
```
GET /api/documents/user/:userId
Headers: Authorization: Bearer {token}
Response: Array of documents with status
```

### Verify Document (Manager/Supervisor/Owner)
```
POST /api/documents/verify/:documentId
Headers: Authorization: Bearer {token}
```

### Reject Document (Manager/Supervisor/Owner)
```
POST /api/documents/reject/:documentId
Headers: Authorization: Bearer {token}
Body: { reason: string }
```

## Benefits

### For Guards
- ✅ Complete educational profile
- ✅ Better job opportunities
- ✅ Professional documentation
- ✅ Easy verification process

### For Managers/Supervisors/Owners
- ✅ Verify educational qualifications
- ✅ Better hiring decisions
- ✅ Complete guard profiles
- ✅ Professional record keeping

## Next Steps

1. ✅ Deploy changes to production
2. ✅ Database migration runs automatically
3. ✅ Guards can upload marksheets
4. ✅ Managers can verify documents

---

**Status**: Complete and ready for deployment
**Last Updated**: April 29, 2026
