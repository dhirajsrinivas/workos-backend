const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const generateToken = (user) =>
  jwt.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });

const getInitials = (name) =>
  name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Please provide name, email and password.' });
    if (password.length < 8)
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0)
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });

    const hashed = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, avatar_initials) VALUES ($1,$2,$3,$4) RETURNING id,name,email,avatar_initials,created_at',
      [name.trim(), email.toLowerCase(), hashed, getInitials(name)]
    );
    const user = result.rows[0];
    res.status(201).json({ success: true, token: generateToken(user), user: { ...user, initials: user.avatar_initials } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!result.rows.length || !(await bcrypt.compare(password, result.rows[0].password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const user = result.rows[0];
    res.json({ success: true, token: generateToken(user), user: { id: user.id, name: user.name, email: user.email, initials: user.avatar_initials } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const getMe = async (req, res) => {
  try {
    const result = await pool.query('SELECT id,name,email,avatar_initials,created_at FROM users WHERE id=$1', [req.user.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'User not found.' });
    const u = result.rows[0];
    res.json({ success: true, user: { ...u, initials: u.avatar_initials } });
  } catch { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required.' });
    const result = await pool.query(
      'UPDATE users SET name=$1, avatar_initials=$2, updated_at=NOW() WHERE id=$3 RETURNING id,name,email,avatar_initials',
      [name.trim(), getInitials(name), req.user.id]
    );
    const u = result.rows[0];
    res.json({ success: true, user: { ...u, initials: u.avatar_initials } });
  } catch { res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = { register, login, getMe, updateProfile };
