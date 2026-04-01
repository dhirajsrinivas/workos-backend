const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { initDB } = require('./config/db');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',      require('./routes/auth'));
app.use('/api/workspace', require('./routes/workspace'));
app.use('/api/invite',    require('./routes/invite'));
app.use('/api/workspace/:id/repo', require('./routes/repo'));
app.use('/api',           require('./routes/aria'));   // ← added

app.get('/api/health', (req, res) => res.json({ success: true, message: 'WorkOS API running', timestamp: new Date() }));

app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` }));

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(413).json({ success: false, message: `File too large. Max ${process.env.MAX_FILE_SIZE_MB || 5}MB.` });
  if (err.message?.includes('Only .txt'))
    return res.status(400).json({ success: false, message: err.message });
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong.' });
});

const PORT = process.env.PORT || 5000;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀  WorkOS API running → http://localhost:${PORT}`);
    console.log(`🗄️   Database connected`);
    console.log(`🌐  CORS origin: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);
  });
}).catch(err => {
  console.error('\n❌  Server failed to start:', err.message);
  if (err.message.includes('password') || err.message.includes('SASL')) {
    console.error('\n  >> PostgreSQL auth failed. Fix your .env:');
    console.error('     DATABASE_URL=postgresql://USERNAME:PASSWORD@localhost:5432/workos_db');
    console.error('\n  >> Steps:');
    console.error('     1. Check your PostgreSQL username/password');
    console.error('     2. Ensure PostgreSQL is running');
    console.error('     3. Run in psql: CREATE DATABASE workos_db;\n');
    console.log(process.env.DATABASE_URL);
  }
  if (err.message.includes('ECONNREFUSED')) {
    console.error('\n  >> PostgreSQL is not running!');
    console.error('     Start it: net start postgresql-x64-16  (adjust version)\n');
  }
  process.exit(1);
});