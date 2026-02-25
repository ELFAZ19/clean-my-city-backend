-- ============================================
-- Fix My City - Database Schema (PostgreSQL)
-- ============================================
-- Production-ready PostgreSQL schema for city issue reporting system
-- Includes: users, organizations (authorities), issues, sessions
-- Features: proper indexing, foreign keys, constraints
-- ============================================

-- Drop existing tables (for clean setup)
DROP TABLE IF EXISTS issues CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop trigger function if exists
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================
-- HELPER: auto-update updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- USERS TABLE
-- ============================================
-- Stores all user accounts: citizens, authorities (organizations), and admins
-- CITIZEN: Regular users who report issues
-- AUTHORITY: Organizations that handle issues (e.g., Electricity Dept, Water Dept)
-- ADMIN: System administrators who manage authorities
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'CITIZEN'
        CHECK (role IN ('CITIZEN', 'AUTHORITY', 'ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Auto-update updated_at
CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ORGANIZATIONS TABLE (AUTHORITIES)
-- ============================================
-- Stores organization/authority details (electricity, water, roads, etc.)
-- Each organization is linked to a user account with AUTHORITY role
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key to users table
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_orgs_active ON organizations(is_active);
CREATE INDEX idx_orgs_category ON organizations(category);

-- Auto-update updated_at
CREATE TRIGGER set_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ISSUES TABLE
-- ============================================
-- Stores all reported issues with location and status tracking
-- STORES IMAGES AS BYTEA DATA
CREATE TABLE issues (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'IN_PROGRESS', 'RESOLVED')),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    image_data BYTEA,                   -- Actual image binary data
    image_mime_type VARCHAR(50),        -- MIME type (e.g., image/jpeg)
    user_id INTEGER NOT NULL,
    organization_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,

    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes for performance and duplicate detection
CREATE INDEX idx_issues_user ON issues(user_id, created_at DESC);
CREATE INDEX idx_issues_org_queue ON issues(organization_id, status, created_at DESC);
CREATE INDEX idx_issues_duplicate ON issues(organization_id, status, created_at);
CREATE INDEX idx_issues_location ON issues(latitude, longitude);
CREATE INDEX idx_issues_status ON issues(status);

-- Auto-update updated_at
CREATE TRIGGER set_issues_updated_at
    BEFORE UPDATE ON issues
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SESSIONS TABLE
-- ============================================
-- Stores server-side session data
-- Managed automatically by connect-pg-simple
CREATE TABLE IF NOT EXISTS sessions (
    sid VARCHAR NOT NULL COLLATE "default",
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL,

    CONSTRAINT sessions_pkey PRIMARY KEY (sid)
);

CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);

-- ============================================
-- NOTES
-- ============================================
-- 1. Use npm run seed to create default admin and sample authorities
-- 2. BYTEA used for image_data to store images (app limits to 5MB)
-- 3. Composite index (organization_id, status, created_at) optimizes duplicate detection queries
-- 4. Indexes on (latitude, longitude) improve geolocation queries
-- 5. CASCADE delete ensures data integrity when users/organizations are deleted
-- 6. update_updated_at_column() trigger replaces MySQL ON UPDATE CURRENT_TIMESTAMP
-- ============================================
