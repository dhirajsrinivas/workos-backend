const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const protect = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }
  try {
    req.user = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Token expired. Please login again.' : 'Invalid token.';
    return res.status(401).json({ success: false, message: msg });
  }
};

// Check user's role in a workspace — attaches req.memberRole
const requireWorkspaceAccess = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'You are not a member of this workspace.' });
    }
    req.memberRole = result.rows[0].role;
    next();
  } catch {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// owner only
const requireOwner = (req, res, next) => {
  if (req.memberRole !== 'owner') {
    return res.status(403).json({ success: false, message: 'Only the workspace owner can perform this action.' });
  }
  next();
};

// owner or admin
const requireAdmin = (req, res, next) => {
  if (!['owner', 'admin'].includes(req.memberRole)) {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
};

// owner, admin, or editor
const requireEditor = (req, res, next) => {
  if (!['owner', 'admin', 'editor'].includes(req.memberRole)) {
    return res.status(403).json({ success: false, message: 'Editor access required.' });
  }
  next();
};

module.exports = { protect, requireWorkspaceAccess, requireOwner, requireAdmin, requireEditor };
