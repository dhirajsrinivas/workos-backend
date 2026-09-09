# WorkOS — Backend

Backend REST API for WorkOS, a full-stack SaaS platform with authentication, workspace management, role-based access control, email invitations, task management, and file sharing.

Built with Node.js, Express.js, and PostgreSQL.

## Features

* JWT-based authentication
* Password hashing with bcryptjs
* User registration and login
* Workspace creation and management
* Workspace member management
* Role-Based Access Control (RBAC)
* Four workspace roles:

  * Owner
  * Admin
  * Editor
  * Member
* Email-based workspace invitations
* Token-based invitation acceptance
* 48-hour invitation expiry
* Task management
* `.txt` file uploads
* Workspace-specific file storage
* Inline file content viewing
* File downloads
* Permission-based file deletion
* Protected API routes
* PostgreSQL database with automatic schema initialization
* Modular REST API architecture

## Tech Stack

| Category         | Technology |
| ---------------- | ---------- |
| Runtime          | Node.js    |
| Framework        | Express.js |
| Database         | PostgreSQL |
| Authentication   | JWT        |
| Password Hashing | bcryptjs   |
| Email            | Nodemailer |
| File Uploads     | Multer     |
| API              | REST       |
| Deployment       | Render     |

## Project Structure

```text
backend/
├── config/
│   ├── db.js
│   ├── email.js
│   └── upload.js
│
├── controllers/
│   ├── authController.js
│   ├── workspaceController.js
│   ├── inviteController.js
│   ├── taskController.js
│   └── fileController.js
│
├── middleware/
│   └── auth.js
│
├── routes/
│   ├── auth.js
│   ├── workspace.js
│   └── invite.js
│
├── uploads/
│   └── <workspace folders>
│
├── server.js
├── package.json
└── .env.example
```

## Authentication and Authorization

WorkOS uses JWT-based authentication. Passwords are securely hashed using bcryptjs before being stored.

Protected routes use authentication middleware to identify the current user and verify their permissions within a workspace.

### RBAC

| Action               | Owner | Admin | Editor | Member |
| -------------------- | :---: | :---: | :----: | :----: |
| View tasks and files |  Yes  |  Yes  |   Yes  |   Yes  |
| Upload files         |  Yes  |  Yes  |   Yes  |   Yes  |
| Create / edit tasks  |  Yes  |  Yes  |   Yes  |   No   |
| Delete tasks         |  Yes  |  Yes  |   Yes  |   No   |
| Send invitations     |  Yes  |  Yes  |   No   |   No   |
| Change member roles  |  Yes  |  Yes  |   No   |   No   |
| Remove members       |  Yes  |  Yes  |   No   |   No   |
| Edit workspace       |  Yes  |   No  |   No   |   No   |
| Delete workspace     |  Yes  |   No  |   No   |   No   |

Authorization is enforced on the backend using middleware such as:

```text
protect
requireOwner
requireAdmin
requireEditor
requireWorkspaceAccess
```

## Workspace Invitations

Workspace owners and administrators can invite users through email.

```text
Admin
  |
  v
Create Invitation
  |
  v
Nodemailer / SMTP
  |
  v
Invitation Email
  |
  v
Recipient Opens Link
  |
  v
Token Validation
  |
  v
Accept Invitation
  |
  v
User Added to Workspace
```

Invitation tokens expire after 48 hours.

## File Sharing

Members can upload `.txt` files to their workspace.

Supported operations:

* Upload `.txt` files
* Maximum file size of 5 MB
* Workspace-specific storage
* View file contents
* Download files
* Delete files according to permissions

Multer handles file uploads and local storage.

## API Reference

### Authentication

Base route: `/api/auth`

| Method | Endpoint    | Auth   | Description      |
| ------ | ----------- | ------ | ---------------- |
| POST   | `/register` | Public | Register a user  |
| POST   | `/login`    | Public | Login            |
| GET    | `/me`       | JWT    | Get current user |
| PUT    | `/profile`  | JWT    | Update profile   |

### Workspaces

Base route: `/api/workspace`

| Method | Endpoint                 | Role    | Description            |
| ------ | ------------------------ | ------- | ---------------------- |
| GET    | `/`                      | Any     | List user's workspaces |
| POST   | `/`                      | Any     | Create workspace       |
| GET    | `/:id`                   | Member+ | Get workspace          |
| PUT    | `/:id`                   | Owner   | Edit workspace         |
| DELETE | `/:id`                   | Owner   | Delete workspace       |
| PUT    | `/:id/members/:uid/role` | Admin+  | Change member role     |
| DELETE | `/:id/members/:uid`      | Admin+  | Remove member          |

### Invitations

Base route: `/api/workspace/:id/invite`

| Method | Endpoint        | Role   | Description       |
| ------ | --------------- | ------ | ----------------- |
| POST   | `/invite`       | Admin+ | Send invitation   |
| GET    | `/invites`      | Admin+ | List invitations  |
| DELETE | `/invites/:iid` | Admin+ | Revoke invitation |

Public and acceptance routes:

```text
GET  /api/invite/:token
POST /api/invite/:token/accept
```

### Tasks

Base route: `/api/workspace/:id/tasks`

| Method | Endpoint | Role    | Description |
| ------ | -------- | ------- | ----------- |
| GET    | `/`      | Member+ | List tasks  |
| POST   | `/`      | Editor+ | Create task |
| PUT    | `/:tid`  | Editor+ | Update task |
| DELETE | `/:tid`  | Editor+ | Delete task |

### Files

Base route: `/api/workspace/:id/files`

| Method | Endpoint         | Role              | Description       |
| ------ | ---------------- | ----------------- | ----------------- |
| GET    | `/`              | Member+           | List files        |
| POST   | `/`              | Member+           | Upload `.txt`     |
| GET    | `/:fid/content`  | Member+           | View file content |
| GET    | `/:fid/download` | Member+           | Download file     |
| DELETE | `/:fid`          | Admin+ / Uploader | Delete file       |

## Environment Variables

Create a `.env` file based on `.env.example`.

```env
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret

FRONTEND_URL=http://localhost:5173

SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_app_password
```

Do not commit `.env` files or credentials to GitHub.

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd backend
```

### 2. Create the PostgreSQL database

```sql
CREATE DATABASE workos_db;
```

Required tables are automatically initialized when the backend starts.

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

```bash
cp .env.example .env
```

Update the environment variables with your PostgreSQL, JWT, frontend, and SMTP configuration.

### 5. Start the development server

```bash
npm run dev
```

The backend runs on:

```text
http://localhost:5000
```

## Gmail SMTP Setup

For Gmail SMTP:

1. Enable 2-Step Verification.
2. Open Google Account security settings.
3. Create an App Password.
4. Use the generated password as `SMTP_PASS`.

## Deployment

The backend can be deployed as a Node.js Web Service on Render.

Build command:

```bash
npm install
```

Start command:

```bash
node server.js
```

Configure the required environment variables on the deployment platform:

```text
DATABASE_URL
JWT_SECRET
FRONTEND_URL
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
```

## Architecture

```text
Client
  |
  v
Express Router
  |
  v
Authentication Middleware
  |
  v
RBAC Middleware
  |
  v
Controller
  |
  +---- PostgreSQL
  |
  +---- Nodemailer
  |
  +---- Multer / File Storage
```

The backend separates routing, business logic, authorization, database configuration, email services, and file handling into independent modules.

## Author

Dhiraj Srinivas

Computer Science & Engineering
Big Data Analytics
