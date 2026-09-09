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
