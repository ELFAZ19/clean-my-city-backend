/**
 * Issues Table Schema Fix Script
 * Migrates the issues table to include BLOB image support
 * Adds image_data and image_mime_type columns
 */

const { pool } = require('./config/database');

async function fixIssuesSchema() {
    console.log('🛠️  Starting issues table schema fix...');

    try {
        console.log('1. Checking for existing columns...');
        // We blindly attempt to add columns. If they exist, it might error, so we catch it.
        // Or better, just run ALTER statements one by one.

        try {
            console.log('   Adding image_data column...');
            await pool.query("ALTER TABLE issues ADD COLUMN image_data LONGBLOB");
            console.log('   ✅ Added image_data');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('   ℹ️  image_data already exists');
            } else {
                throw e;
            }
        }

        try {
            console.log('   Adding image_mime_type column...');
            await pool.query("ALTER TABLE issues ADD COLUMN image_mime_type VARCHAR(50)");
            console.log('   ✅ Added image_mime_type');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('   ℹ️  image_mime_type already exists');
            } else {
                throw e;
            }
        }

        // Optional: Remove image_url if it exists, to match new schema
        try {
            console.log('   Removing legacy image_url column...');
            await pool.query("ALTER TABLE issues DROP COLUMN image_url");
            console.log('   ✅ Removed image_url');
        } catch (e) {
             if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log('   ℹ️  image_url does not exist');
            } else {
                 // Ignore other drop errors (e.g. if it's the only column, unlikely)
                console.log('   ⚠️  Could not remove image_url:', e.message);
            }
        }
        
        console.log('✅ Issues table schema fixed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Issues schema fix failed:', error.message);
        process.exit(1);
    }
}

fixIssuesSchema();
