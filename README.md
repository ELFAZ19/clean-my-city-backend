# Fix My City - Backend API

**Production-ready backend API for city issue reporting and management system**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-blue)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-orange)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-ISC-yellow)](https://opensource.org/licenses/ISC)

---

## 📋 Table of Contents

- [System Overview](#system-overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Scalability](#scalability)
- [Project Structure](#project-structure)

---

## 🎯 System Overview

Fix My City is a comprehensive city issue reporting and management system that allows registered citizens to report public service issues (electricity failures, water pipe damage, road problems, etc.) to responsible organizations.

### Key Capabilities

- **Citizen Reporting**: Citizens can create, track, and manage their issue reports
- **Organization Management**: Organizations receive and process issues in a queue system
- **Intelligent Duplicate Detection**: Prevents duplicate issue reporting using multi-criteria matching
- **Admin Control**: Admins can create and manage organizations
- **Dual Authentication**: Supports both JWT tokens and server-side sessions

---

## ✨ Features

### Authentication & Authorization
- ✅ JWT-based authentication (24-hour expiration)
- ✅ Server-side session management (7-day expiration)
- ✅ Role-based access control (CITIZEN, ORGANIZATION, ADMIN)
- ✅ Secure password hashing with bcrypt
- ✅ Session persistence in MySQL database

### Issue Management
- ✅ Create issues with optional location (GPS coordinates)
- ✅ Automatic duplicate detection (5 criteria)
- ✅ Issue status lifecycle (PENDING → IN_PROGRESS → RESOLVED)
- ✅ Organization-specific issue queues
- ✅ User issue history tracking

### Duplicate Detection Algorithm
Issues are considered duplicates if **ALL** criteria match:
1. Same organization
2. Status is NOT RESOLVED
3. Created within last 48 hours
4. Location distance ≤ 100 meters (if location exists)
5. Text similarity (title + description) ≥ 0.7

### Security Features
- ✅ Helmet.js for security headers
- ✅ CORS protection
- ✅ Rate limiting (100 requests per 15 minutes)
- ✅ Input validation with express-validator
- ✅ SQL injection prevention
- ✅ Password strength requirements

---

## 🛠 Technology Stack

| Component | Technology |
|-----------|-----------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express.js 4.x |
| **Database** | MySQL 8.0+ |
| **Authentication** | JWT + express-session |
| **Session Store** | express-mysql-session |
| **Password Hashing** | bcrypt |
| **Validation** | express-validator |
| **Text Similarity** | string-similarity (Dice coefficient) |
| **Security** | helmet, cors |
| **Rate Limiting** | express-rate-limit |

---

## 📦 Installation

### Prerequisites

- Node.js 18 or higher
- MySQL 8.0 or higher
- npm or yarn package manager

### Steps

1. **Clone or navigate to the project directory**
   ```bash
   cd "c:\2017\2017\2017\vs code\class ip\final project\fix my city"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** (see [Configuration](#configuration))

5. **Set up database** (see [Database Setup](#database-setup))

---

## ⚙️ Configuration

Edit the `.env` file with your configuration:

```env
# Server
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=1234
DB_PASSWORD=your_password
DB_NAME=fix_my_city

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Session
SESSION_SECRET=your_session_secret_key
SESSION_MAX_AGE=604800000

# Security
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000

# Duplicate Detection
DUPLICATE_TIME_WINDOW_HOURS=48
DUPLICATE_DISTANCE_METERS=100
DUPLICATE_SIMILARITY_THRESHOLD=0.7
```

---

## 🗄️ Database Setup

### 1. Create Database

```sql
CREATE DATABASE fix_my_city CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Run Schema

```bash
mysql -u root -p fix_my_city < database/schema.sql
```

Or manually execute the SQL file in your MySQL client.

### 3. Database Schema

The system uses 4 main tables:

- **users**: All user accounts (citizens, organizations, admins)
- **organizations**: Organization details and contact information
- **issues**: Reported issues with status tracking
- **sessions**: Server-side session storage

See [database/schema.sql](database/schema.sql) for complete schema.

---

## 🚀 Running the Application

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Verify Server is Running

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "message": "Fix My City API is running",
  "timestamp": "2026-01-09T18:30:00.000Z"
}
```

---

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api
```

### Authentication

Most endpoints require authentication via:
- **JWT Token**: `Authorization: Bearer <token>`
- **Session Cookie**: Automatically sent by browser

### Endpoints Summary

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/auth/register` | Public | Register new user |
| POST | `/auth/login` | Public | Login user |
| POST | `/auth/logout` | Public | Logout user |
| GET | `/users/profile` | Private | Get user profile |
| PUT | `/users/profile` | Private | Update profile |
| PUT | `/users/password` | Private | Change password |
| POST | `/issues` | Citizen | Create issue |
| GET | `/issues/my-issues` | Citizen | Get user's issues |
| GET | `/issues/queue` | Organization | Get organization queue |
| PUT | `/issues/:id/status` | Organization | Update issue status |
| GET | `/issues/:id` | Private | Get issue details |
| POST | `/organizations` | Admin | Create organization |
| PUT | `/organizations/:id` | Admin | Update organization |
| PUT | `/organizations/:id/activate` | Admin | Activate organization |
| PUT | `/organizations/:id/deactivate` | Admin | Deactivate organization |
| GET | `/organizations` | Admin | List organizations |

For detailed API documentation with request/response examples, see [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md).

---

## 🔒 Security

### Implemented Security Measures

1. **Authentication**
   - JWT tokens with expiration
   - Secure session cookies (httpOnly, secure, sameSite)
   - Password hashing with bcrypt (10 rounds)

2. **Authorization**
   - Role-based access control
   - Resource ownership verification
   - Organization-specific data isolation

3. **Input Validation**
   - Email format validation
   - Password strength requirements
   - SQL injection prevention via parameterized queries
   - XSS protection via input sanitization

4. **Rate Limiting**
   - 100 requests per 15 minutes per IP
   - Prevents brute force attacks

5. **Security Headers**
   - Helmet.js for HTTP security headers
   - CORS configuration
   - Content Security Policy

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

---

## 📈 Scalability

### Current Architecture

The system is designed with scalability in mind:

1. **Database Connection Pooling**
   - Connection pool (max 10 connections)
   - Automatic connection management
   - Query optimization with indexes

2. **Stateless API Design**
   - JWT tokens enable horizontal scaling
   - Session store in database (not in-memory)

3. **Efficient Duplicate Detection**
   - Indexed queries for time-based filtering
   - Spatial indexes for geolocation
   - Early exit on non-matches

### Scaling Recommendations

**For Production Deployment:**

1. **Load Balancing**
   - Use NGINX or AWS ELB
   - Multiple application instances
   - Sticky sessions for session-based auth

2. **Database Optimization**
   - Read replicas for reporting
   - Database connection pool tuning
   - Query caching (Redis)

3. **Caching Layer**
   - Redis for session storage
   - Cache organization data
   - Cache duplicate detection results (short TTL)

4. **Monitoring**
   - Application performance monitoring (APM)
   - Database query monitoring
   - Error tracking (Sentry)

5. **Rate Limiting**
   - Distributed rate limiting with Redis
   - Per-user rate limits
   - API key management

---

## 📁 Project Structure

```
fix-my-city/
├── database/
│   └── schema.sql              # Database schema
├── src/
│   ├── config/
│   │   ├── database.js         # Database connection
│   │   ├── session.js          # Session configuration
│   │   └── constants.js        # System constants
│   ├── middleware/
│   │   ├── auth.js             # Authentication & authorization
│   │   ├── validation.js       # Input validation
│   │   └── errorHandler.js    # Error handling
│   ├── services/
│   │   ├── duplicateDetection.js  # Duplicate detection algorithm
│   │   ├── authService.js         # Authentication logic
│   │   ├── issueService.js        # Issue management
│   │   ├── organizationService.js # Organization management
│   │   └── userService.js         # User management
│   ├── controllers/
│   │   ├── authController.js      # Auth endpoints
│   │   ├── userController.js      # User endpoints
│   │   ├── issueController.js     # Issue endpoints
│   │   └── organizationController.js # Organization endpoints
│   ├── routes/
│   │   ├── auth.routes.js         # Auth routes
│   │   ├── user.routes.js         # User routes
│   │   ├── issue.routes.js        # Issue routes
│   │   └── organization.routes.js # Organization routes
│   ├── app.js                  # Express app setup
│   └── server.js               # Server entry point
├── docs/
│   ├── API_DOCUMENTATION.md    # Detailed API docs
│   └── DUPLICATE_DETECTION.md  # Algorithm explanation
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
├── package.json                # Dependencies
└── README.md                   # This file
```

---

## 🧪 Testing

### Manual Testing with cURL

**Register a citizen:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "citizen@example.com",
    "password": "Citizen@123",
    "full_name": "John Doe",
    "phone": "+1234567890"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "citizen@example.com",
    "password": "Citizen@123"
  }'
```

**Create an issue:**
```bash
curl -X POST http://localhost:3000/api/issues \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Broken street light",
    "description": "Street light on Main St is not working",
    "organization_id": 1,
    "latitude": 40.7128,
    "longitude": -74.0060
  }'
```

---

