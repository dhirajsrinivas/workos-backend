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

// Static file serving for uploads (for download endpoint)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/workspace', require('./routes/workspace'));
app.use('/api/invite', require('./routes/invite'));

// Health
app.get('/api/health', (req, res) => res.json({ success: true, message: 'WorkOS API v2 running', timestamp: new Date() }));

// 404
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` }));

// Error handler (multer errors etc.)
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(413).json({ success: false, message: `File too large. Max size is ${process.env.MAX_FILE_SIZE_MB || 5}MB.` });
  if (err.message?.includes('Only .txt'))
    return res.status(400).json({ success: false, message: err.message });
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ success: false, message: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 5000;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 WorkOS API v2 running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize DB:', err.message);
  process.exit(1);
});
