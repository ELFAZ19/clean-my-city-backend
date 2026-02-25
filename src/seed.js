/**
 * Database Seed Script
 * Seeds default admin user and sample authorities (organizations)
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool, testConnection } = require('./config/database');

// Default admin credentials
const DEFAULT_ADMIN = {
    email: 'admin@fixmycity.com',
    password: 'Admin@123456',
    full_name: 'System Administrator'
};

// Sample authorities (organizations)
const SAMPLE_AUTHORITIES = [
    {
        name: 'Electricity Department',
        description: 'Handles all electricity-related issues including power outages, street lights, and electrical infrastructure.',
        category: 'Electricity',
        contact_email: 'electricity@city.gov',
        contact_phone: '+1234567890',
        login_email: 'electricity@city.gov',
        login_password: 'Electricity@123'
    },
    {
        name: 'Water Department',
        description: 'Handles water supply, sewage, and plumbing infrastructure issues.',
        category: 'Water',
        contact_email: 'water@city.gov',
        contact_phone: '+1234567891',
        login_email: 'water@city.gov',
        login_password: 'Water@123456'
    },
    {
        name: 'Roads Department',
        description: 'Handles road maintenance, potholes, traffic signals, and transportation infrastructure.',
        category: 'Roads',
        contact_email: 'roads@city.gov',
        contact_phone: '+1234567892',
        login_email: 'roads@city.gov',
        login_password: 'Roads@123456'
    }
];

async function seed() {
    console.log('🌱 Starting database seed...\n');

    try {
        // Test connection
        const connected = await testConnection();
        if (!connected) {
            console.error('❌ Could not connect to database. Exiting.');
            process.exit(1);
        }

        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;

        // 1. Create default admin
        console.log('📌 Creating default admin user...');
        const adminPasswordHash = await bcrypt.hash(DEFAULT_ADMIN.password, saltRounds);
        
        // Check if admin exists
        const [existingAdmin] = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [DEFAULT_ADMIN.email]
        );

        let adminId;
        if (existingAdmin.length > 0) {
            adminId = existingAdmin[0].id;
            console.log('   ✅ Admin already exists (ID: ' + adminId + ')');
        } else {
            const [adminResult] = await pool.query(
                `INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, 'ADMIN') RETURNING id`,
                [DEFAULT_ADMIN.email, adminPasswordHash, DEFAULT_ADMIN.full_name]
            );
            adminId = adminResult[0].id;
            console.log('   ✅ Admin created (ID: ' + adminId + ')');
        }

        console.log('   📧 Email: ' + DEFAULT_ADMIN.email);
        console.log('   🔑 Password: ' + DEFAULT_ADMIN.password);
        console.log('');

        // 2. Create sample authorities (organizations)
        console.log('📌 Creating sample authorities (organizations)...');
        
        for (const auth of SAMPLE_AUTHORITIES) {
            // Check if authority user exists
            const [existingUser] = await pool.query(
                'SELECT id FROM users WHERE email = $1',
                [auth.login_email]
            );

            let userId;
            if (existingUser.length > 0) {
                userId = existingUser[0].id;
                console.log(`   ⏭️  ${auth.name} user already exists`);
                
                // Fix for legacy role migration (ORGANIZATION -> AUTHORITY)
                await pool.query(
                    "UPDATE users SET role = 'AUTHORITY' WHERE id = $1 AND role = 'ORGANIZATION'",
                    [userId]
                );
            } else {
                // Create authority user with AUTHORITY role
                const authPasswordHash = await bcrypt.hash(auth.login_password, saltRounds);
                const [userResult] = await pool.query(
                    `INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, 'AUTHORITY') RETURNING id`,
                    [auth.login_email, authPasswordHash, auth.name]
                );
                userId = userResult[0].id;
            }

            // Check if organization exists
            const [existingOrg] = await pool.query(
                'SELECT id FROM organizations WHERE user_id = $1',
                [userId]
            );

            if (existingOrg.length > 0) {
                console.log(`   ✅ ${auth.name} already exists (ID: ${existingOrg[0].id})`);
            } else {
                const [orgResult] = await pool.query(
                    `INSERT INTO organizations (user_id, name, description, category, contact_email, contact_phone) 
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                    [userId, auth.name, auth.description, auth.category, auth.contact_email, auth.contact_phone]
                );
                console.log(`   ✅ ${auth.name} created (ID: ${orgResult[0].id})`);
            }
            console.log(`      📧 Login: ${auth.login_email}`);
            console.log(`      🔑 Password: ${auth.login_password}`);
        }

        console.log('\n✅ Database seeding completed successfully!\n');
        console.log('='.repeat(50));
        console.log('Default Credentials:');
        console.log('='.repeat(50));
        console.log('ADMIN (Can only manage authorities/organizations):');
        console.log(`  Email: ${DEFAULT_ADMIN.email}`);
        console.log(`  Password: ${DEFAULT_ADMIN.password}`);
        console.log('');
        console.log('AUTHORITIES (Can manage their profile and assigned issues):');
        SAMPLE_AUTHORITIES.forEach(auth => {
            console.log(`  ${auth.name}:`);
            console.log(`    Email: ${auth.login_email}`);
            console.log(`    Password: ${auth.login_password}`);
        });
        console.log('='.repeat(50));

        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        process.exit(1);
    }
}

seed();
