/**
 * Database Seed Script
 * Seeds default admin user, sample authorities (organizations), and sample issues
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

// Default citizen for sample issues
const SAMPLE_CITIZEN = {
    email: 'citizen@example.com',
    password: 'Citizen@123456',
    full_name: 'John Citizen'
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

        // 2. Create sample citizen
        console.log('📌 Creating sample citizen user...');
        const citizenPasswordHash = await bcrypt.hash(SAMPLE_CITIZEN.password, saltRounds);
        const [existingCitizen] = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [SAMPLE_CITIZEN.email]
        );

        let citizenId;
        if (existingCitizen.length > 0) {
            citizenId = existingCitizen[0].id;
            console.log('   ✅ Citizen already exists (ID: ' + citizenId + ')');
        } else {
            const [citizenResult] = await pool.query(
                `INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, 'CITIZEN') RETURNING id`,
                [SAMPLE_CITIZEN.email, citizenPasswordHash, SAMPLE_CITIZEN.full_name]
            );
            citizenId = citizenResult[0].id;
            console.log('   ✅ Citizen created (ID: ' + citizenId + ')');
        }
        console.log('');

        // 3. Create sample authorities (organizations)
        console.log('📌 Creating sample authorities (organizations)...');
        const orgIds = {};
        
        for (const auth of SAMPLE_AUTHORITIES) {
            const [existingUser] = await pool.query(
                'SELECT id FROM users WHERE email = $1',
                [auth.login_email]
            );

            let userId;
            if (existingUser.length > 0) {
                userId = existingUser[0].id;
                console.log(`   ⏭️  ${auth.name} user already exists`);
                await pool.query(
                    "UPDATE users SET role = 'AUTHORITY' WHERE id = $1 AND role = 'ORGANIZATION'",
                    [userId]
                );
            } else {
                const authPasswordHash = await bcrypt.hash(auth.login_password, saltRounds);
                const [userResult] = await pool.query(
                    `INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, 'AUTHORITY') RETURNING id`,
                    [auth.login_email, authPasswordHash, auth.name]
                );
                userId = userResult[0].id;
            }

            const [existingOrg] = await pool.query(
                'SELECT id FROM organizations WHERE user_id = $1',
                [userId]
            );

            let orgId;
            if (existingOrg.length > 0) {
                orgId = existingOrg[0].id;
                console.log(`   ✅ ${auth.name} already exists (ID: ${orgId})`);
            } else {
                const [orgResult] = await pool.query(
                    `INSERT INTO organizations (user_id, name, description, category, contact_email, contact_phone) 
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
                    [userId, auth.name, auth.description, auth.category, auth.contact_email, auth.contact_phone]
                );
                orgId = orgResult[0].id;
                console.log(`   ✅ ${auth.name} created (ID: ${orgId})`);
            }
            console.log(`      📧 Login: ${auth.login_email}`);
            console.log(`      🔑 Password: ${auth.login_password}`);
            orgIds[auth.category] = orgId;
        }

        // 4. Seed sample issues
        console.log('\n📌 Seeding sample issues...');
        const [existingIssues] = await pool.query('SELECT COUNT(*) as count FROM issues');
        const issueCount = Number(existingIssues[0].count);

        if (issueCount > 0) {
            console.log(`   ⏭️  ${issueCount} issues already exist, skipping issue seeding.`);
        } else {
            const sampleIssues = [
                // --- Electricity issues ---
                { title: 'Street light out on Main St', description: 'The street light at the corner of Main St has been off for 3 days. Very dangerous at night.', org: 'Electricity', status: 'RESOLVED', daysAgo: 18, resolvedHoursAfter: 5 },
                { title: 'Power outage in Block 4', description: 'Entire block 4 is without electricity since this morning. Residents are affected.', org: 'Electricity', status: 'RESOLVED', daysAgo: 14, resolvedHoursAfter: 26 },
                { title: 'Exposed electrical wires near park', description: 'There are exposed electrical wires near the children\'s park. Very dangerous situation.', org: 'Electricity', status: 'IN_PROGRESS', daysAgo: 7 },
                { title: 'Flickering lights in residential area', description: 'The street lights on Oak Avenue keep flickering intermittently every night.', org: 'Electricity', status: 'PENDING', daysAgo: 3 },
                { title: 'Traffic light malfunction at Junction 12', description: 'Traffic lights at the busy Junction 12 are showing red on all sides, causing major traffic jams.', org: 'Electricity', status: 'RESOLVED', daysAgo: 10, resolvedHoursAfter: 8 },
                { title: 'Burnt transformer on 5th Avenue', description: 'A transformer on 5th Avenue appears to have burnt out, leaving half the street in darkness.', org: 'Electricity', status: 'RESOLVED', daysAgo: 25, resolvedHoursAfter: 3 },
                { title: 'No power in school zone', description: 'The school zone area has had no electricity for 2 days, affecting the school schedule.', org: 'Electricity', status: 'PENDING', daysAgo: 2 },

                // --- Water issues ---
                { title: 'Water pipe burst on River Road', description: 'A water pipe has burst on River Road creating a large pool of water and disrupting traffic.', org: 'Water', status: 'RESOLVED', daysAgo: 20, resolvedHoursAfter: 10 },
                { title: 'Contaminated water supply complaints', description: 'Multiple residents in Zone B are reporting discolored water coming from their taps.', org: 'Water', status: 'IN_PROGRESS', daysAgo: 5 },
                { title: 'Sewer blockage causing overflow', description: 'Sewer overflow on Green Lane is causing sewage to spill onto the sidewalk. Health hazard.', org: 'Water', status: 'RESOLVED', daysAgo: 12, resolvedHoursAfter: 18 },
                { title: 'Low water pressure in residential zone', description: 'We have been experiencing very low water pressure for the past week. Showers are barely usable.', org: 'Water', status: 'PENDING', daysAgo: 6 },
                { title: 'Abandoned hydrant leaking', description: 'An abandoned fire hydrant near the hospital has been leaking continuously, wasting water.', org: 'Water', status: 'RESOLVED', daysAgo: 8, resolvedHoursAfter: 2 },

                // --- Roads issues ---
                { title: 'Large pothole on Central Avenue', description: 'There is a very large pothole on Central Avenue that has already damaged several vehicles.', org: 'Roads', status: 'RESOLVED', daysAgo: 22, resolvedHoursAfter: 30 },
                { title: 'Missing road sign at crossroads', description: 'The stop sign at the Main / Oak crossroads is missing, causing confusion for drivers.', org: 'Roads', status: 'IN_PROGRESS', daysAgo: 9 },
                { title: 'Damaged footpath near school', description: 'The footpath near Elm School has large cracks and broken slabs, posing a risk to children.', org: 'Roads', status: 'PENDING', daysAgo: 4 },
                { title: 'Road flooding near underpass', description: 'The underpass on Industrial Road floods every time it rains, blocking the entire road.', org: 'Roads', status: 'RESOLVED', daysAgo: 15, resolvedHoursAfter: 12 },
                { title: 'Broken guardrail on highway exit', description: 'The guardrail at Highway 7 exit is broken and bent, posing danger to vehicles exiting.', org: 'Roads', status: 'PENDING', daysAgo: 1 },
                { title: 'Road lines faded on busy intersection', description: 'The road lane markings on the high-traffic intersection near the mall are completely faded.', org: 'Roads', status: 'RESOLVED', daysAgo: 27, resolvedHoursAfter: 5 }
            ];

            for (const issue of sampleIssues) {
                const orgId = orgIds[issue.org];
                if (!orgId) {
                    console.log(`   ⚠️  Org not found for category '${issue.org}', skipping.`);
                    continue;
                }

                // Calculate timestamps relative to today
                const createdAt = new Date();
                createdAt.setDate(createdAt.getDate() - issue.daysAgo);
                createdAt.setHours(Math.floor(Math.random() * 12) + 8, 0, 0, 0); // 8am-8pm

                let resolvedAt = null;
                if (issue.status === 'RESOLVED' && issue.resolvedHoursAfter) {
                    resolvedAt = new Date(createdAt.getTime() + issue.resolvedHoursAfter * 60 * 60 * 1000);
                }

                await pool.query(
                    `INSERT INTO issues (title, description, status, user_id, organization_id, created_at, resolved_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [issue.title, issue.description, issue.status, citizenId, orgId, createdAt, resolvedAt]
                );
            }
            console.log(`   ✅ ${sampleIssues.length} sample issues created successfully`);
        }

        console.log('\n✅ Database seeding completed successfully!\n');
        console.log('='.repeat(50));
        console.log('Default Credentials:');
        console.log('='.repeat(50));
        console.log('ADMIN:');
        console.log(`  Email: ${DEFAULT_ADMIN.email}`);
        console.log(`  Password: ${DEFAULT_ADMIN.password}`);
        console.log('');
        console.log('AUTHORITIES:');
        SAMPLE_AUTHORITIES.forEach(auth => {
            console.log(`  ${auth.name}:`);
            console.log(`    Email: ${auth.login_email}`);
            console.log(`    Password: ${auth.login_password}`);
        });
        console.log('');
        console.log('CITIZEN (for testing):');
        console.log(`  Email: ${SAMPLE_CITIZEN.email}`);
        console.log(`  Password: ${SAMPLE_CITIZEN.password}`);
        console.log('='.repeat(50));

        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding failed:', error.message, error.stack);
        process.exit(1);
    }
}

seed();
