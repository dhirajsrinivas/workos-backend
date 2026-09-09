# WorkOS — Backend

Backend REST API for WorkOS, a full-stack SaaS platform with authentication, workspace management, role-based access control, email invitations, task management, file sharing, an online code compiler, and ARIA, an AI coding assistant.

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
* Online code compiler with multi-language execution via Judge0
* Per-workspace compiler submission history
* ARIA — AI coding assistant powered by Grok
* ARIA chat, code debugging, and file/code explanation endpoints
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
| Code Execution   | Judge0 API |
| AI Assistant     | Grok API (xAI) |
| API              | REST       |
| Deployment       | Render     |

## Project Structure

```text
backend/
├── config/
│   ├── db.js
│   ├── email.js
│   ├── upload.js
│   ├── judge0.js
│   └── grok.js
│
├── controllers/
│   ├── authController.js
│   ├── workspaceController.js
│   ├── inviteController.js
│   ├── taskController.js
│   ├── fileController.js
│   ├── compilerController.js
│   └── ariaController.js
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

| Action                 | Owner | Admin | Editor | Member |
| ----------------------- | :---: | :---: | :----: | :----: |
| View tasks and files    |  Yes  |  Yes  |   Yes  |   Yes  |
| Upload files             |  Yes  |  Yes  |   Yes  |   Yes  |
| Use online compiler     |  Yes  |  Yes  |   Yes  |   Yes  |
| Use ARIA AI assistant   |  Yes  |  Yes  |   Yes  |   Yes  |
| Create / edit tasks      |  Yes  |  Yes  |   Yes  |   No   |
| Delete tasks             |  Yes  |  Yes  |   Yes  |   No   |
| Send invitations         |  Yes  |  Yes  |   No   |   No   |
| Change member roles      |  Yes  |  Yes  |   No   |   No   |
| Remove members           |  Yes  |  Yes  |   No   |   No   |
| Edit workspace           |  Yes  |   No  |   No   |   No   |
| Delete workspace         |  Yes  |   No  |   No   |   No   |

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

## Online Code Compiler

Members can write and run code directly against the backend, which proxies execution to Judge0.

```text
Client
  |
  v
compilerController.run
  |
  v
Judge0 API (submit source + language + stdin)
  |
  v
Poll for result
  |
  v
Return stdout / stderr / verdict / execution time
```

Supported operations:

* Submit source code and language to be executed
* Poll and return execution status, stdout, stderr, and verdict
* List supported languages and their Judge0 language IDs
* View recent compiler submissions for a workspace

## ARIA — AI Coding Assistant

ARIA is a Grok-powered assistant available within each workspace for code generation, debugging, and file-aware Q&A.

```text
Client
  |
  v
ariaController
  |
  v
Grok API (xAI)
  |
  +---- Chat: general Q&A / code generation
  |
  +---- Debug: code + error output -> diagnosis + fix
  |
  +---- Explain: code snippet or workspace .txt file -> explanation
  |
  v
Response returned + stored in ARIA conversation history
```

Supported operations:

* General chat and code-generation queries
* Debugging: submit code and an error/stack trace for a diagnosis and suggested fix
* Explain: request an explanation of a code snippet or an uploaded workspace file
* Retrieve past ARIA conversation history per workspace

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
| ------ | ---------------- | ----------------- | ------------------ |
| GET    | `/`              | Member+           | List files        |
| POST   | `/`              | Member+           | Upload `.txt`     |
| GET    | `/:fid/content`  | Member+           | View file content |
| GET    | `/:fid/download` | Member+           | Download file     |
| DELETE | `/:fid`          | Admin+ / Uploader | Delete file       |

### Online Compiler

Base route: `/api/workspace/:id/compiler`

| Method | Endpoint      | Role    | Description                                              |
| ------ | ------------- | ------- | ---------------------------------------------------------- |
| POST   | `/run`        | Member+ | Submit source code + language to Judge0, return result   |
| GET    | `/languages`  | Member+ | List supported languages and Judge0 language IDs         |
| GET    | `/submissions`| Member+ | List recent compiler runs for the workspace               |

### ARIA AI Assistant

Base route: `/api/workspace/:id/aria`

| Method | Endpoint   | Role    | Description                                              |
| ------ | ---------- | ------- | ---------------------------------------------------------- |
| POST   | `/chat`    | Member+ | Send a message to ARIA (Q&A / code generation)            |
| POST   | `/debug`   | Member+ | Submit code + error output for diagnosis and a suggested fix |
| POST   | `/explain` | Member+ | Request an explanation of a code snippet or workspace file |
| GET    | `/history` | Member+ | List past ARIA conversations for the workspace             |

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

JUDGE0_API_URL=your_judge0_api_url
JUDGE0_API_KEY=your_judge0_api_key

GROK_API_KEY=your_grok_api_key
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

Update the environment variables with your PostgreSQL, JWT, frontend, SMTP, Judge0, and Grok configuration.

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

## Judge0 Setup

1. Sign up for a Judge0 API key (RapidAPI) or deploy a self-hosted Judge0 instance.
2. Set `JUDGE0_API_URL` and `JUDGE0_API_KEY` in `.env`.

## Grok (ARIA) Setup

1. Create an account and generate an API key from the xAI developer console.
2. Set `GROK_API_KEY` in `.env`.

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
JUDGE0_API_URL
JUDGE0_API_KEY
GROK_API_KEY
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
  |
  +---- Judge0 API (code execution)
  |
  +---- Grok API (ARIA assistant)
```

The backend separates routing, business logic, authorization, database configuration, email services, file handling, code execution, and AI assistance into independent modules.

## Author

Dhiraj Srinivas

Computer Science & Engineering
Big Data Analytics
