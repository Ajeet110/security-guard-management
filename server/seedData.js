const bcrypt = require('bcryptjs');
const { db, initDatabase } = require('./database/db');

// Sample names from HTML
const NAMES_M = ['Amit Sharma', 'Vikram Patel', 'Rajesh Singh', 'Suresh Kumar', 'Manoj Tiwari', 'Deepak Gupta', 'Arjun Mehta', 'Karan Desai', 'Nikhil Joshi', 'Pradeep Verma', 'Ravi Malhotra', 'Sanjay Dubey', 'Ashok Nair', 'Anil Reddy', 'Pawan Kalyan'];
const NAMES_S = ['Sunil Yadav', 'Mukesh Prajapati', 'Ramesh Oraon', 'Bijay Swain', 'Dilip Das', 'Ganesh Patil', 'Harish Chauhan', 'Irfan Ali', 'Jagan Mohan', 'Kamlesh Thakur', 'Lakshman Rao', 'Mahesh Pillai', 'Naresh Dahiya', 'Om Prakash', 'Prabhu Deva'];
const NAMES_G = ['Raju Khatri', 'Bhola Paswan', 'Chhote Lal', 'Dinesh Ram', 'Eklavya Singh', 'Firoz Khan', 'Guddu Mishra', 'Hari Narayan', 'Inderjit Kaur', 'Jitendra Oraon', 'Kalu Batham', 'Lallu Prasad', 'Mohan Das', 'Nandu Sah', 'Pappu Kumar', 'Ramu Dom', 'Shiv Kumar', 'Tinku Mahato', 'Umesh Pal', 'Vijay Sahni', 'Wazir Ali', 'Yadavendra', 'Zubair Ansari', 'Akhil Raj', 'Bunty Gupta', 'Chandan Verma', 'Dablu Singh', 'Eshwar Rao', 'Fagu Mahato', 'Gopal Tiwari'];
const LOCS = ['Gate A - Main Entry', 'Gate B - Parking', 'Tower 1 Lobby', 'Tower 2 Lobby', 'Perimeter East', 'Perimeter West', 'Control Room', 'CCTV Room', 'Loading Dock', 'Rooftop', 'Basement P1', 'Basement P2', 'VIP Entrance', 'Emergency Exit', 'Service Gate'];
const SHIFTS = ['Day 6AM-2PM', 'Day 2PM-10PM', 'Night 10PM-6AM', 'Day 7AM-3PM', 'Day 3PM-11PM', 'Night 9PM-5AM'];
const TEXTS = ['All guards reported on time', 'Need replacement for Gate B', 'Patrol completed east sector', 'Visitor pass issued for 3 people', 'CCTV camera 7 needs maintenance', 'Minor fire alarm in parking', 'Shift handover completed', 'New guard joining tomorrow', 'Monthly report submitted', 'Equipment check done', 'Vehicle entry log updated', 'Emergency drill scheduled', 'Client feedback received', 'Overtime approval needed', 'Uniforms delivered'];

function makeId(dateString) {
  return dateString.replace(/[-:T]/g, '').slice(0, 12);
}

function randomPhone() {
  return '9' + Math.floor(1000000000 + Math.random() * 9000000000);
}

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // Check if we have more than just the owner
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    
    if (userCount && userCount.count > 1) {
      console.log('⚠️  Database already seeded. Skipping...');
      return;
    }

    const createdUsers = [];
    let ts = new Date(2026, 3, 15, 10, 30).getTime();

    // Create 3 Managers
    console.log('📝 Creating Managers...');
    const managerIds = [];
    for (let i = 0; i < 3; i++) {
      ts += 86400000; // +1 day
      const userId = makeId(new Date(ts).toISOString());
      const password = `Mgr@${userId.slice(-4)}`;
      const hashedPassword = bcrypt.hashSync(password, 10);

      const result = db.prepare(`
        INSERT INTO users (user_id, password, display_password, name, role, parent_id, mobile, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        hashedPassword,
        password,
        NAMES_M[i],
        'Manager',
        1, // Owner's id
        randomPhone(),
        1, // Created by owner
        new Date(ts).toISOString()
      );

      managerIds.push(result.lastInsertRowid);
      createdUsers.push({ id: result.lastInsertRowid, user_id: userId, name: NAMES_M[i], role: 'Manager' });
      console.log(`  ✅ Created Manager: ${NAMES_M[i]} (${userId})`);
    }

    // Create Supervisors under each Manager
    console.log('📝 Creating Supervisors...');
    const supervisorIds = [];
    let sI = 0;
    for (let mi = 0; mi < managerIds.length; mi++) {
      const count = 2 + mi; // 2, 3, 4 supervisors
      for (let i = 0; i < count; i++) {
        ts += 43200000; // +12 hours
        const userId = makeId(new Date(ts).toISOString());
        const password = `Sup@${userId.slice(-4)}`;
        const hashedPassword = bcrypt.hashSync(password, 10);

        const result = db.prepare(`
          INSERT INTO users (user_id, password, display_password, name, role, parent_id, mobile, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          userId,
          hashedPassword,
          password,
          NAMES_S[sI % NAMES_S.length],
          'Supervisor',
          managerIds[mi],
          randomPhone(),
          managerIds[mi],
          new Date(ts).toISOString()
        );

        supervisorIds.push(result.lastInsertRowid);
        createdUsers.push({ id: result.lastInsertRowid, user_id: userId, name: NAMES_S[sI % NAMES_S.length], role: 'Supervisor', parent_id: managerIds[mi] });
        console.log(`  ✅ Created Supervisor: ${NAMES_S[sI % NAMES_S.length]} (${userId})`);
        sI++;
      }
    }

    // Create Guards under each Supervisor
    console.log('📝 Creating Guards...');
    for (let si = 0; si < supervisorIds.length; si++) {
      const count = 3 + Math.floor(Math.random() * 4); // 3-6 guards per supervisor
      for (let i = 0; i < count; i++) {
        ts += 3600000; // +1 hour
        const userId = makeId(new Date(ts).toISOString());
        const password = `Grd@${userId.slice(-4)}`;
        const hashedPassword = bcrypt.hashSync(password, 10);

        const result = db.prepare(`
          INSERT INTO users (user_id, password, display_password, name, role, parent_id, mobile, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          userId,
          hashedPassword,
          password,
          NAMES_G[Math.floor(Math.random() * NAMES_G.length)],
          'Guard',
          supervisorIds[si],
          randomPhone(),
          supervisorIds[si],
          new Date(ts).toISOString()
        );

        createdUsers.push({ id: result.lastInsertRowid, user_id: userId, password: password, name: NAMES_G[Math.floor(Math.random() * NAMES_G.length)], role: 'Guard', parent_id: supervisorIds[si] });
        
        if (i === 0) {
          console.log(`  ✅ Created ${count} Guards under Supervisor ${si + 1}`);
        }
      }
    }

    console.log(`\n✅ Total users created: ${createdUsers.length}`);

    // Create Groups
    console.log('\n📝 Creating Groups...');
    
    // Group 1: All Managers
    const group1 = db.prepare(`
      INSERT INTO conversations (type, name, created_by, created_at)
      VALUES (?, ?, ?, ?)
    `).run('group', 'All Managers', 1, new Date().toISOString());

    // Add owner and all managers to group (owner is already id=1)
    db.prepare('INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id, is_admin) VALUES (?, ?, ?)').run(group1.lastInsertRowid, 1, 1);
    managerIds.forEach(mid => {
      db.prepare('INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id, is_admin) VALUES (?, ?, ?)').run(group1.lastInsertRowid, mid, 0);
    });
    console.log('  ✅ Created group: All Managers');

    // Group 2: Operations Team
    const group2 = db.prepare(`
      INSERT INTO conversations (type, name, created_by, created_at)
      VALUES (?, ?, ?, ?)
    `).run('group', 'Operations Team', 1, new Date().toISOString());

    db.prepare('INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id, is_admin) VALUES (?, ?, ?)').run(group2.lastInsertRowid, 1, 1);
    if (managerIds.length > 0) {
      db.prepare('INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id, is_admin) VALUES (?, ?, ?)').run(group2.lastInsertRowid, managerIds[0], 0);
    }
    if (supervisorIds.length > 1) {
      db.prepare('INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id, is_admin) VALUES (?, ?, ?)').run(group2.lastInsertRowid, supervisorIds[0], 0);
      db.prepare('INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id, is_admin) VALUES (?, ?, ?)').run(group2.lastInsertRowid, supervisorIds[1], 0);
    }
    console.log('  ✅ Created group: Operations Team');

    // Group 3: Night Shift Crew
    const group3 = db.prepare(`
      INSERT INTO conversations (type, name, created_by, created_at)
      VALUES (?, ?, ?, ?)
    `).run('group', 'Night Shift Crew', 1, new Date().toISOString());

    db.prepare('INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id, is_admin) VALUES (?, ?, ?)').run(group3.lastInsertRowid, 1, 1);
    if (supervisorIds.length > 2) {
      db.prepare('INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id, is_admin) VALUES (?, ?, ?)').run(group3.lastInsertRowid, supervisorIds[2], 0);
      
      // Add 3 guards from this supervisor
      const guardsUnderSup = createdUsers.filter(u => u.role === 'Guard' && u.parent_id === supervisorIds[2]).slice(0, 3);
      guardsUnderSup.forEach(guard => {
        db.prepare('INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id, is_admin) VALUES (?, ?, ?)').run(group3.lastInsertRowid, guard.id, 0);
      });
    }
    console.log('  ✅ Created group: Night Shift Crew');

    // Create Personal Conversations between Owner and Managers
    console.log('\n📝 Creating Personal Conversations...');
    for (let i = 0; i < Math.min(3, managerIds.length); i++) {
      const conv = db.prepare(`
        INSERT INTO conversations (type, created_by, created_at)
        VALUES (?, ?, ?)
      `).run('personal', 1, new Date().toISOString());

      db.prepare('INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)').run(conv.lastInsertRowid, 1);
      db.prepare('INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)').run(conv.lastInsertRowid, managerIds[i]);
      
      console.log(`  ✅ Created conversation: Owner ↔ Manager ${i + 1}`);
    }

    // Create Personal Conversations between Owner and some Supervisors
    for (let i = 0; i < Math.min(4, supervisorIds.length); i++) {
      const conv = db.prepare(`
        INSERT INTO conversations (type, created_by, created_at)
        VALUES (?, ?, ?)
      `).run('personal', 1, new Date().toISOString());

      db.prepare('INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)').run(conv.lastInsertRowid, 1);
      db.prepare('INSERT OR IGNORE INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)').run(conv.lastInsertRowid, supervisorIds[i]);
    }
    console.log(`  ✅ Created ${Math.min(4, supervisorIds.length)} conversations with Supervisors`);

    // Add sample messages to groups
    console.log('\n📝 Adding Sample Messages...');
    const conversations = db.prepare('SELECT id FROM conversations').all();
    
    conversations.forEach((conv, idx) => {
      const messageCount = 3 + Math.floor(Math.random() * 5);
      for (let i = 0; i < messageCount; i++) {
        const senderId = i % 2 === 0 ? 1 : (managerIds[0] || 1);
        const msgTime = new Date(Date.now() - (messageCount - i) * 3600000); // Hours ago
        
        db.prepare(`
          INSERT INTO messages (conversation_id, sender_id, content, sent_at)
          VALUES (?, ?, ?, ?)
        `).run(
          conv.id,
          senderId,
          TEXTS[Math.floor(Math.random() * TEXTS.length)],
          msgTime.toISOString()
        );
      }
      
      if (idx === 0) {
        console.log(`  ✅ Added sample messages to ${conversations.length} conversations`);
      }
    });

    // Add sample attendance records for guards
    console.log('\n📝 Adding Sample Attendance...');
    const guards = createdUsers.filter(u => u.role === 'Guard');
    let attendanceCount = 0;
    
    guards.forEach(guard => {
      for (let i = 0; i < 7; i++) {
        if (Math.random() > 0.15) { // 85% attendance rate
          const date = new Date();
          date.setDate(date.getDate() - i);
          
          db.prepare(`
            INSERT INTO attendance (user_id, photo_path, marked_at)
            VALUES (?, ?, ?)
          `).run(
            guard.id,
            'uploads/attendance/sample.jpg',
            date.toISOString()
          );
          attendanceCount++;
        }
      }
    });
    console.log(`  ✅ Added ${attendanceCount} attendance records`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Managers: ${managerIds.length}`);
    console.log(`   - Supervisors: ${supervisorIds.length}`);
    console.log(`   - Guards: ${guards.length}`);
    console.log(`   - Total Users: ${createdUsers.length + 1} (including Owner)`);
    console.log(`   - Groups: 3`);
    console.log(`   - Conversations: ${conversations.length}`);
    console.log(`   - Messages: ${conversations.length * 4} (approx)`);
    console.log(`   - Attendance Records: ${attendanceCount}`);
    console.log('\n✅ You can now login with:');
    console.log('   Owner: 2026 / owner123');
    const firstManager = createdUsers.find(u => u.role === 'Manager');
    if (firstManager) {
      console.log(`   Manager: ${firstManager.user_id} / Mgr@${firstManager.user_id.slice(-4)}`);
    }
    const firstSupervisor = createdUsers.find(u => u.role === 'Supervisor');
    if (firstSupervisor) {
      console.log(`   Supervisor: ${firstSupervisor.user_id} / Sup@${firstSupervisor.user_id.slice(-4)}`);
    }
    const firstGuard = createdUsers.find(u => u.role === 'Guard');
    if (firstGuard) {
      console.log(`   Guard: ${firstGuard.user_id} / ${firstGuard.password}`);
    }
    console.log('\n   💡 All Guards use password format: Grd@XXXX (last 4 digits of their User ID)');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initDatabase()
    .then(() => seedDatabase())
    .then(() => {
      console.log('\n✅ Seeding complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
