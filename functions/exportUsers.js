/**
 * Export all users from local database to JSON
 * Run: node server/exportUsers.js
 */

const { db } = require('./database/db');

async function exportUsers() {
  try {
    console.log('🔄 Exporting users from local database...');
    
    // Get all users
    const users = db.prepare(`
      SELECT id, user_id, password, display_password, name, role, 
             parent_id, mobile, email, location, shift, created_by, created_at
      FROM users
      ORDER BY id
    `).all();
    
    console.log(`✅ Found ${users.length} users`);
    
    // Write to JSON file
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.join(__dirname, 'users_export.json');
    
    fs.writeFileSync(outputPath, JSON.stringify(users, null, 2));
    
    console.log(`✅ Users exported to: ${outputPath}`);
    console.log('\nUsers:');
    users.forEach(u => {
      console.log(`  - ${u.name} (${u.user_id}) - ${u.role} - Password: ${u.display_password}`);
    });
    
  } catch (error) {
    console.error('❌ Export failed:', error);
  }
}

exportUsers();
