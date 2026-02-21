# Fix My City API Documentation

Base URL: `http://localhost:3000/api`

## Table of Contents
1. [Authentication](#authentication)
2. [User Profile](#user-profile)
3. [Issues](#issues)
4. [Organizations/Authorities](#organizations)
5. [System](#system)

---

## Roles & Permissions

- **CITIZEN**: Can create issues and view their own issues.
- **AUTHORITY**: (Organization) Can view issues assigned to their category and update issue status.
- **ADMIN**: Can manage authorities (organizations).

---

## Authentication

### Register (Citizen)
Create a new citizen account.

- **Endpoint**: `POST /auth/register`
- **Access**: Public
- **Content-Type**: `application/json`

**Request Body:**
```json
{
  "email": "citizen@example.com",
  "password": "Password@123",
  "full_name": "John Doe",
  "phone": "+1234567890"  // Optional
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "citizen@example.com",
      "full_name": "John Doe",
      "role": "CITIZEN",
      "is_active": 1,
      "created_at": "2023-11-20T10:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR..."
  }
}
```

### Login
Authenticate user and receive JWT token.

- **Endpoint**: `POST /auth/login`
- **Access**: Public
- **Content-Type**: `application/json`

**Request Body:**
```json
{
  "email": "citizen@example.com",
  "password": "Password@123"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "citizen@example.com",
      "full_name": "John Doe",
      "role": "CITIZEN"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR..."
  }
}
```

### Logout
Destroy current session.

- **Endpoint**: `POST /auth/logout`
- **Access**: Public

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## User Profile

### Get Profile
Get current user's profile information.

- **Endpoint**: `GET /users/profile`
- **Access**: Private (All roles)
- **Header**: `Authorization: Bearer <token>`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "citizen@example.com",
      "full_name": "John Doe",
      "phone": "+1234567890",
      "role": "CITIZEN"
    }
  }
}
```

### Update Profile
Update profile information.

- **Endpoint**: `PUT /users/profile`
- **Access**: Private (All roles)
- **Header**: `Authorization: Bearer <token>`
- **Content-Type**: `application/json`

**Request Body:**
```json
{
  "full_name": "John Smith",
  "phone": "+1987654321"
}
```

### Change Password
Change user password.

- **Endpoint**: `PUT /users/password`
- **Access**: Private (All roles)
- **Header**: `Authorization: Bearer <token>`
- **Content-Type**: `application/json`

**Request Body:**
```json
{
  "current_password": "Password@123",
  "new_password": "NewPassword@456"
}
```

---

## Issues

### Create Issue (Citizen)
Report a new issue with optional image upload.

- **Endpoint**: `POST /issues`
- **Access**: Private (Citizen only)
- **Header**: `Authorization: Bearer <token>`
- **Content-Type**: `multipart/form-data`

**Form Data Fields:**
- `title` (text, required): Title of the issue (min 5 chars)
- `description` (text, required): Detailed description (min 10 chars)
- `organization_id` (text, required): ID of the authority to assign
- `latitude` (text, optional): GPS latitude (e.g., 40.7128)
- `longitude` (text, optional): GPS longitude (e.g., -74.0060)
- `image` (file, optional): Image file (JPEG, PNG, GIF, WebP - max 5MB)

**Success Response (201 Created):**
```json
{
  "success": true,
  "isDuplicate": false,
  "message": "Issue created successfully",
  "data": {
    "issue": {
      "id": 101,
      "title": "Broken Street Light",
      "status": "PENDING",
      "image_url": "/uploads/issue-1705689.jpg",
      "created_at": "2023-11-20T12:00:00.000Z"
    }
  }
}
```

### Get My Issues (Citizen)
Get all issues reported by the current citizen.

- **Endpoint**: `GET /issues/my-issues`
- **Access**: Private (Citizen only)
- **Header**: `Authorization: Bearer <token>`

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "count": 5,
    "issues": [
      {
        "id": 101,
        "title": "Broken Street Light",
        "status": "PENDING",
        "created_at": "...",
        "organization_name": "Electricity Dept"
      }
    ]
  }
}
```

### Get Authority Queue (Authority)
Get issues assigned to the logged-in authority.

- **Endpoint**: `GET /issues/queue`
- **Access**: Private (Authority only)
- **Header**: `Authorization: Bearer <token>`
- **Query Params**: `status` (optional) - PENDING, IN_PROGRESS, RESOLVED

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "organization_id": 2,
    "filter": "all",
    "count": 12,
    "issues": [...]
  }
}
```

### Update Issue Status (Authority)
Update the status of an assigned issue.

- **Endpoint**: `PUT /issues/:id/status`
- **Access**: Private (Authority only)
- **Header**: `Authorization: Bearer <token>`
- **Content-Type**: `application/json`

**Request Body:**
```json
{
  "status": "IN_PROGRESS"  // or "RESOLVED"
}
```

### Get Issue Details
Get full details of a specific issue.

- **Endpoint**: `GET /issues/:id`
- **Access**: Private (Owner, Assigned Authority, or Admin)
- **Header**: `Authorization: Bearer <token>`

---

## Organizations (Authorities)

### Get Public Authorities
Get list of authorities for citizens to choose from.

- **Endpoint**: `GET /organizations/public`
- **Access**: Public

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "count": 3,
    "organizations": [
      {
        "id": 1,
        "name": "Electricity Department",
        "category": "Electricity"
      },
      ...
    ]
  }
}
```

### Create Authority (Admin)
Create a new authority/organization.

- **Endpoint**: `POST /organizations`
- **Access**: Private (Admin only)
- **Header**: `Authorization: Bearer <token>`
- **Content-Type**: `application/json`

**Request Body:**
```json
{
  "name": "Sanitation Dept",
  "description": "Waste management",
  "category": "Sanitation",
  "contact_email": "sanitation@city.gov",
  "contact_phone": "+123456789",
  "email": "sanitation@city.gov",  // Login email
  "password": "Password@123"      // Login password
}
```

### Update Authority (Admin)
Update authority details.

- **Endpoint**: `PUT /organizations/:id`
- **Access**: Private (Admin only)
- **Header**: `Authorization: Bearer <token>`

### Activate/Deactivate Authority (Admin)
Enable or disable an authority account.

- **Endpoints**: 
  - `PUT /organizations/:id/activate`
  - `PUT /organizations/:id/deactivate`
- **Access**: Private (Admin only)

### Get All Authorities (Admin)
Get full list of authorities including inactive ones.

- **Endpoint**: `GET /organizations`
- **Access**: Private (Admin only)
- **Header**: `Authorization: Bearer <token>`

---

## System

### Health Check
Check API status.

- **Endpoint**: `GET /health`
- **Access**: Public

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Fix My City API is running",
  "timestamp": "..."
}
```
