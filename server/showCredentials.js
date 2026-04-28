const { db, initDatabase } = require('./database/db');

async function showCredentials() {
  console.log('\n🔐 SecureGuard Connect - User Credentials\n');
  console.log('='.repeat(70));

  try {
    // Initialize database first
    await initDatabase();

    const users = db.prepare(`
      SELECT user_id, display_password, name, role 
      FROM users 
      ORDER BY 
        CASE role 
          WHEN 'Owner' THEN 1 
          WHEN 'Manager' THEN 2 
          WHEN 'Supervisor' THEN 3 
          WHEN 'Guard' THEN 4 
        END,
        created_at
    `).all();

    let currentRole = '';
    
    users.forEach(user => {
      if (user.role !== currentRole) {
        currentRole = user.role;
        console.log(`\n${user.role}s:`);
        console.log('-'.repeat(70));
      }
      
      const password = user.display_password || 'owner123';
      console.log(`  ${user.name.padEnd(25)} | ID: ${user.user_id.padEnd(15)} | Pass: ${password}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log(`\nTotal Users: ${users.length}`);
    console.log('\n💡 Use User ID and Password to login at http://localhost:3000/login\n');

  } catch (error) {
    console.error('❌ Error reading credentials:', error.message);
    console.log('\n💡 Make sure the database is seeded. Run: npm run seed\n');
  }
}

showCredentials();
