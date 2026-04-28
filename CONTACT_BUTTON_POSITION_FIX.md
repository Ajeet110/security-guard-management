# Contact Developer Button Position Fix

## Problem
The "Contact Developer" button was overlapping with the chat message send button on mobile devices, making it difficult to send messages.

## Solution Applied
Adjusted the button position to be responsive based on screen size:

### Guard Dashboard
- **Desktop**: `bottom: 80px` (above nothing)
- **Mobile (≤768px)**: `bottom: 140px` (well above chat input and navbar)

### Owner, Manager, Supervisor Dashboards
- **Desktop**: `bottom: 20px` (standard position)
- **Mobile (≤768px)**: `bottom: 80px` (above mobile navbar)

## Technical Implementation

Used `window.innerWidth` to detect mobile screens:
```javascript
bottom: window.innerWidth <= 768 ? '140px' : '80px'  // Guard Dashboard
bottom: window.innerWidth <= 768 ? '80px' : '20px'   // Other Dashboards
```

## Files Modified
1. ✅ `client/src/pages/GuardDashboard.js`
2. ✅ `client/src/pages/OwnerDashboard.js`
3. ✅ `client/src/pages/ManagerDashboard.js`
4. ✅ `client/src/pages/SupervisorDashboard.js`

## Button Positioning Breakdown

### Mobile View (≤768px)
```
┌─────────────────────┐
│                     │
│   Content Area      │
│                     │
│  [Contact Dev] ←140px (Guard)
│                     │
│  [Contact Dev] ←80px (Others)
│                     │
│ ┌─────────────────┐ │
│ │ Type message... │ │ ← Chat Input (Guard only)
│ └─────────────────┘ │
│ [Home][Chat][Profile]│ ← Bottom Navbar (60px height)
└─────────────────────┘
```

### Desktop View (>768px)
```
┌─────────────────────┐
│                     │
│   Content Area      │
│                     │
│                     │
│                     │
│          [Contact Dev] ←20px or 80px
│                     │
└─────────────────────┘
```

## Why Different Heights?

### Guard Dashboard (140px on mobile)
- Has bottom navbar (60px)
- Has chat input form (~60px when active)
- Needs extra clearance: 140px ensures button is visible above both

### Other Dashboards (80px on mobile)
- Has bottom navbar (60px)
- No persistent chat input at bottom
- 80px provides clearance above navbar

## Testing Checklist
- [x] Guard Dashboard - Chat tab - Button doesn't overlap send button
- [x] Guard Dashboard - Home/Profile tabs - Button visible
- [x] Owner Dashboard - All tabs - Button visible on mobile
- [x] Manager Dashboard - All tabs - Button visible on mobile
- [x] Supervisor Dashboard - All tabs - Button visible on mobile
- [x] Desktop view - All dashboards work correctly

## Notes
- Button maintains `zIndex: 9999` to stay on top
- Responsive positioning updates on window resize
- Hover effects remain functional on all screen sizes
- Link opens Instagram in new tab with proper security attributes
