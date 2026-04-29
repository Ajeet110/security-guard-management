// Script to fix all ESLint warnings in the project
// Run with: node fix_warnings.js

const fs = require('fs');
const path = require('path');

// Files to fix with their specific warnings
const filesToFix = [
  {
    file: 'client/src/components/ProfileViewer.js',
    fixes: [
      {
        pattern: /useEffect\(\(\) => {\s*loadProfile\(\);\s*}, \[userId\]\);/,
        replacement: `useEffect(() => {
    loadProfile();
  }, [userId, loadProfile]);`
      }
    ]
  },
  {
    file: 'client/src/components/HierarchyTree.js',
    fixes: [
      {
        pattern: /useEffect\(\(\) => {\s*fetchUserAndChildren\(\);\s*}, \[userId\]\);/,
        replacement: `useEffect(() => {
    fetchUserAndChildren();
  }, [userId, fetchUserAndChildren]);`
      }
    ]
  },
  {
    file: 'client/src/components/AttendanceDashboard.js',
    fixes: [
      {
        pattern: /useEffect\(\(\) => {\s*fetchGuards\(\);\s*}, \[\]\);/,
        replacement: `useEffect(() => {
    fetchGuards();
  }, [fetchGuards]);`
      },
      {
        pattern: /useEffect\(\(\) => {\s*fetchAttendanceData\(\);\s*}, \[\]\);/,
        replacement: `useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);`
      }
    ]
  }
];

function fixFile(filePath, fixes) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    for (const fix of fixes) {
      if (fix.pattern.test(content)) {
        content = content.replace(fix.pattern, fix.replacement);
        modified = true;
        console.log(`✅ Fixed pattern in ${filePath}`);
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated ${filePath}`);
    } else {
      console.log(`ℹ️ No changes needed for ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

// Run fixes
console.log('🔄 Fixing ESLint warnings...');
for (const fileInfo of filesToFix) {
  fixFile(fileInfo.file, fileInfo.fixes);
}

console.log('✅ All fixes applied!');