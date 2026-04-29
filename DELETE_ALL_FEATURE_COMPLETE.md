# Delete All Users by Role Feature - COMPLETE

## Feature Added
Added "Delete All" buttons to each role stat card (Managers, Supervisors, Guards) in Owner Dashboard.

## Implementation

### 1. Backend Endpoint (server/routes/users.js)
**New Route**: `DELETE /api/users/delete-all/:role`
- **Access**: Owner only (uses `authorizeRoles('Owner')` middleware)
- **Parameters**: `role` (Manager, Supervisor, or Guard)
- **Validation**: Only allows valid roles
- **Cascade Delete**: Deletes all related data:
  - Documents
  - Attendance records
  - Messages sent by users
  - Message status
  - Conversation participants
  - Refresh tokens
  - Finally, the users themselves

**Response**:
```json
{
  "message": "Successfully deleted all Guards",
  "deleted_count": 5,
  "deleted_users": ["John Doe", "Jane Smith", ...]
}
```

### 2. Frontend Implementation (client/src/pages/OwnerDashboard.js)

#### New Function: `handleDeleteAllRole(role)`
- Shows list of users to be deleted
- Requires typed confirmation: `DELETE ALL MANAGERS` (or SUPERVISORS/GUARDS)
- Prevents accidental deletion
- Shows success message with deleted user names
- Refreshes dashboard data after deletion

#### UI Changes
Each stat card now has TWO buttons:
1. **Add Button** (Plus icon) - Existing functionality
2. **Delete All Button** (Trash icon) - NEW
   - Only shows if count > 0
   - Red color to indicate danger
   - Positioned next to add button

**Button Layout**:
```
┌─────────────────────────────┐
│ Total Managers         [+][🗑]│
│                              │
│         5                    │
│                         💼   │
└─────────────────────────────┘
```

## Safety Features

### 1. Confirmation Dialog
User must type exact text to confirm:
- For Managers: `DELETE ALL MANAGERS`
- For Supervisors: `DELETE ALL SUPERVISORS`
- For Guards: `DELETE ALL GUARDS`

### 2. Warning Message
Shows:
- Number of users to be deleted
- List of all user names and IDs
- "This action CANNOT be undone!" warning

### 3. Authorization
- Only Owner role can access this endpoint
- Backend validates role and permissions
- Returns 403 if unauthorized

### 4. Cascade Delete
Properly removes all related data to prevent orphaned records:
- Documents uploaded by users
- Attendance records
- Chat messages
- Message status
- Conversation memberships
- Refresh tokens

## User Experience

### Before Deletion
1. Owner clicks trash icon on stat card
2. Prompt shows with warning and user list
3. Owner must type confirmation text exactly
4. If text doesn't match, deletion is cancelled

### After Deletion
1. Success alert shows deleted count and names
2. Dashboard automatically refreshes
3. Stat cards update to show new counts
4. Deleted users no longer appear in hierarchy

## Code Changes

### Files Modified
1. **server/routes/users.js**
   - Added `DELETE /api/users/delete-all/:role` endpoint
   - Implements cascade delete logic
   - Returns detailed deletion report

2. **client/src/pages/OwnerDashboard.js**
   - Added `handleDeleteAllRole()` function
   - Updated stat card UI to show delete buttons
   - Added confirmation dialog with typed verification

## Testing Checklist

- [ ] Delete All Managers button appears when managers exist
- [ ] Delete All Supervisors button appears when supervisors exist
- [ ] Delete All Guards button appears when guards exist
- [ ] Buttons hidden when count is 0
- [ ] Confirmation dialog shows correct user list
- [ ] Wrong confirmation text cancels deletion
- [ ] Correct confirmation text proceeds with deletion
- [ ] All related data is deleted (documents, attendance, etc.)
- [ ] Dashboard refreshes after deletion
- [ ] Non-owner users cannot access endpoint (403 error)
- [ ] Success message shows deleted user names

## Security Considerations

✅ **Authorization**: Only Owner can delete all users
✅ **Confirmation**: Requires typed confirmation to prevent accidents
✅ **Validation**: Backend validates role parameter
✅ **Cascade**: Properly removes all related data
✅ **Audit Trail**: Could be enhanced with logging (future improvement)

## Future Enhancements (Optional)

1. **Soft Delete**: Move to recycle bin instead of permanent delete
2. **Audit Log**: Record who deleted what and when
3. **Undo Feature**: Allow restoration within time window
4. **Batch Operations**: Select specific users instead of all
5. **Export Before Delete**: Download user data before deletion

## Usage Example

### Scenario: Delete All Guards
1. Owner sees "Total Guards: 10" with [+] and [🗑] buttons
2. Clicks trash icon
3. Prompt shows:
   ```
   ⚠️ WARNING: This will permanently delete ALL 10 Guard(s):
   
   • John Doe (202604291234)
   • Jane Smith (202604291235)
   ... (8 more)
   
   This action CANNOT be undone!
   
   Type "DELETE ALL GUARDS" to confirm:
   ```
4. Owner types: `DELETE ALL GUARDS`
5. System deletes all guards and related data
6. Success message: "✅ Successfully deleted all Guards. Deleted 10 users: John Doe, Jane Smith, ..."
7. Dashboard updates: "Total Guards: 0"

---
**Status**: ✅ Complete and ready for testing
**Date**: 2026-04-29
**Feature**: Delete all users by role with confirmation
**Access**: Owner only
