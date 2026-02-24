require('dotenv').config();
const { pool } = require('./src/config/database');

async function check() {
    try {
        const [orgs] = await pool.query('SELECT * FROM organizations');
        console.log('--- Organizations ---');
        console.log(JSON.stringify(orgs, null, 2));
        
        const [users] = await pool.query("SELECT id, email, full_name, role FROM users WHERE role = 'AUTHORITY'");
        console.log('\n--- Authority Users ---');
        console.log(JSON.stringify(users, null, 2));
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
