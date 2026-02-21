/**
 * Schema Fix Script
 * Migrates the users table role column from old ENUM to new ENUM
 * Safely handles the transition from 'ORGANIZATION' to 'AUTHORITY'
 */

const { pool } = require('./config/database');

async function fixSchema() {
    console.log('🛠️  Starting schema fix...');

    try {
        // 1. Temporarily change column to VARCHAR to allow data modification without truncation
        console.log('1. Converting role column to VARCHAR...');
        await pool.query("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'CITIZEN'");
        
        // 2. Update existing data: 'ORGANIZATION' -> 'AUTHORITY'
        console.log('2. Migrating data (ORGANIZATION -> AUTHORITY)...');
        await pool.query("UPDATE users SET role = 'AUTHORITY' WHERE role = 'ORGANIZATION'");
        
        // 3. Apply the correct ENUM definition
        console.log('3. Applying new ENUM definition...');
        await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('CITIZEN', 'AUTHORITY', 'ADMIN') NOT NULL DEFAULT 'CITIZEN'");
        
        console.log('✅ Schema fixed successfully!');
        
        // Verify
        const [rows] = await pool.query("SELECT id, email, role FROM users WHERE role = 'AUTHORITY'");
        console.log(`   Verified: ${rows.length} users now have AUTHORITY role.`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Schema fix failed:', error.message);
        process.exit(1);
    }
}

fixSchema();
