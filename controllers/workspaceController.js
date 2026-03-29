const { pool } = require('../config/db');

const getWorkspaces = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT w.*, wm.role,
        (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id)::int AS member_count,
        (SELECT COUNT(*) FROM tasks WHERE workspace_id = w.id)::int AS task_count,
        (SELECT COUNT(*) FROM workspace_files WHERE workspace_id = w.id)::int AS file_count,
        u.name AS owner_name
      FROM workspaces w
      JOIN workspace_members wm ON w.id = wm.workspace_id
      JOIN users u ON w.owner_id = u.id
      WHERE wm.user_id = $1
      ORDER BY w.created_at DESC
    `, [req.user.id]);
    res.json({ success: true, workspaces: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

const createWorkspace = async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, description, type, icon, color } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Workspace name is required.' });
    await client.query('BEGIN');
    const ws = await client.query(
      'INSERT INTO workspaces (name,description,type,icon,color,owner_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name.trim(), description || '', type || 'team', icon || '💼', color || '#E6F1FB', req.user.id]
    );
    await client.query(
      'INSERT INTO workspace_members (workspace_id,user_id,role) VALUES ($1,$2,$3)',
      [ws.rows[0].id, req.user.id, 'owner']
    );
    await client.query('COMMIT');
    res.status(201).json({ success: true, workspace: { ...ws.rows[0], role: 'owner', member_count: 1, task_count: 0, file_count: 0 } });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally { client.release(); }
};

const getWorkspace = async (req, res) => {
  try {
    const ws = await pool.query(`
      SELECT w.*, wm.role,
        (SELECT COUNT(*) FROM workspace_members WHERE workspace_id=w.id)::int AS member_count,
        (SELECT COUNT(*) FROM tasks WHERE workspace_id=w.id)::int AS task_count,
        (SELECT COUNT(*) FROM workspace_files WHERE workspace_id=w.id)::int AS file_count
      FROM workspaces w
      JOIN workspace_members wm ON w.id=wm.workspace_id
      WHERE w.id=$1 AND wm.user_id=$2
    `, [req.params.id, req.user.id]);
    if (!ws.rows.length) return res.status(404).json({ success: false, message: 'Workspace not found.' });

    const members = await pool.query(`
      SELECT u.id, u.name, u.email, u.avatar_initials AS initials, wm.role, wm.joined_at
      FROM workspace_members wm JOIN users u ON wm.user_id=u.id
      WHERE wm.workspace_id=$1 ORDER BY wm.joined_at
    `, [req.params.id]);

    res.json({ success: true, workspace: ws.rows[0], members: members.rows });
  } catch { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const updateWorkspace = async (req, res) => {
  try {
    const { name, description, type, icon, color } = req.body;
    const result = await pool.query(
      'UPDATE workspaces SET name=COALESCE($1,name),description=COALESCE($2,description),type=COALESCE($3,type),icon=COALESCE($4,icon),color=COALESCE($5,color),updated_at=NOW() WHERE id=$6 RETURNING *',
      [name, description, type, icon, color, req.params.id]
    );
    res.json({ success: true, workspace: result.rows[0] });
  } catch { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const deleteWorkspace = async (req, res) => {
  try {
    await pool.query('DELETE FROM workspaces WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Workspace deleted.' });
  } catch { res.status(500).json({ success: false, message: 'Server error.' }); }
};

// Update member role (owner/admin only)
const updateMemberRole = async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['admin', 'editor', 'member'];
    if (!validRoles.includes(role))
      return res.status(400).json({ success: false, message: 'Invalid role. Must be admin, editor, or member.' });

    // Cannot change owner role
    const target = await pool.query(
      'SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2',
      [req.params.id, req.params.userId]
    );
    if (!target.rows.length) return res.status(404).json({ success: false, message: 'Member not found.' });
    if (target.rows[0].role === 'owner') return res.status(403).json({ success: false, message: "Cannot change the owner's role." });

    await pool.query(
      'UPDATE workspace_members SET role=$1 WHERE workspace_id=$2 AND user_id=$3',
      [role, req.params.id, req.params.userId]
    );
    res.json({ success: true, message: 'Role updated.' });
  } catch { res.status(500).json({ success: false, message: 'Server error.' }); }
};

// Remove member (owner/admin only)
const removeMember = async (req, res) => {
  try {
    const target = await pool.query(
      'SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2',
      [req.params.id, req.params.userId]
    );
    if (!target.rows.length) return res.status(404).json({ success: false, message: 'Member not found.' });
    if (target.rows[0].role === 'owner') return res.status(403).json({ success: false, message: 'Cannot remove the workspace owner.' });

    await pool.query('DELETE FROM workspace_members WHERE workspace_id=$1 AND user_id=$2', [req.params.id, req.params.userId]);
    res.json({ success: true, message: 'Member removed.' });
  } catch { res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = { getWorkspaces, createWorkspace, getWorkspace, updateWorkspace, deleteWorkspace, updateMemberRole, removeMember };
