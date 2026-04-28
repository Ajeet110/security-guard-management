const bcrypt = require('bcryptjs');
const { db, initDatabase } = require('./database/db');

async function updatePasswords() {
  console.log('🔄 Updating user passwords...\n');

  try {
    await initDatabase();

    // Get all users except owner
    const users = db.prepare(`
      SELECT id, user_id, role 
      FROM users 
      WHERE role != 'Owner'
    `).all();

    let updated = 0;

    users.forEach(user => {
      let password;
      
      // Generate password based on role
      switch (user.role) {
        case 'Manager':
          password = `Mgr@${user.user_id.slice(-4)}`;
          break;
        case 'Supervisor':
          password = `Sup@${user.user_id.slice(-4)}`;
          break;
        case 'Guard':
          password = `Grd@${user.user_id.slice(-4)}`;
          break;
        default:
          password = 'guard123';
      }

      // Hash the password
      const hashedPassword = bcrypt.hashSync(password, 10);

      // Update the user
      db.prepare(`
        UPDATE users 
        SET password = ?, display_password = ? 
        WHERE id = ?
      `).run(hashedPassword, password, user.id);

      updated++;
    });

    console.log(`✅ Updated passwords for ${updated} users`);
    console.log('\n💡 Run "npm run credentials" to see all login credentials\n');

  } catch (error) {
    console.error('❌ Error updating passwords:', error);
  }
}

updatePasswords();
