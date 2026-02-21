-- ============================================
-- Fix My City - Database Schema
-- ============================================
-- Production-ready MySQL schema for city issue reporting system
-- Includes: users, organizations (authorities), issues, sessions
-- Features: proper indexing, foreign keys, constraints
-- ============================================

-- Drop existing tables (for clean setup)
DROP TABLE IF EXISTS issues;
DROP TABLE IF EXISTS organizations;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

-- ============================================
-- USERS TABLE
-- ============================================
-- Stores all user accounts: citizens, authorities (organizations), and admins
-- CITIZEN: Regular users who report issues
-- AUTHORITY: Organizations that handle issues (e.g., Electricity Dept, Water Dept)
-- ADMIN: System administrators who manage authorities
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role ENUM('CITIZEN', 'AUTHORITY', 'ADMIN') NOT NULL DEFAULT 'CITIZEN',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ORGANIZATIONS TABLE (AUTHORITIES)
-- ============================================
-- Stores organization/authority details (electricity, water, roads, etc.)
-- Each organization is linked to a user account with AUTHORITY role
CREATE TABLE organizations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key to users table
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes for performance
    INDEX idx_active (is_active),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ISSUES TABLE
-- ============================================
-- Stores all reported issues with location and status tracking
-- STORES IMAGES AS BLOB DATA
CREATE TABLE issues (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('PENDING', 'IN_PROGRESS', 'RESOLVED') NOT NULL DEFAULT 'PENDING',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    image_data LONGBLOB,              -- Actual image binary data (up to 4GB)
    image_mime_type VARCHAR(50),      -- MIME type (e.g., image/jpeg)
    user_id INT NOT NULL,
    organization_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    
    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Indexes for performance and duplicate detection
    INDEX idx_user_issues (user_id, created_at DESC),
    INDEX idx_org_queue (organization_id, status, created_at DESC),
    INDEX idx_duplicate_detection (organization_id, status, created_at),
    INDEX idx_location (latitude, longitude),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SESSIONS TABLE
-- ============================================
-- Stores server-side session data
-- Managed automatically by express-mysql-session
CREATE TABLE sessions (
    session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL PRIMARY KEY,
    expires INT(11) UNSIGNED NOT NULL,
    data MEDIUMTEXT COLLATE utf8mb4_bin,
    
    -- Index for cleanup of expired sessions
    INDEX idx_expires (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- NOTES
-- ============================================
-- 1. Use npm run seed to create default admin and sample authorities
-- 2. LONGBLOB used for image_data to store images up to 4GB (though app limits to 5MB)
-- 3. Composite index (organization_id, status, created_at) optimizes duplicate detection queries
-- 4. Spatial indexes on (latitude, longitude) improve geolocation queries
-- 5. CASCADE delete ensures data integrity when users/organizations are deleted
-- ============================================
