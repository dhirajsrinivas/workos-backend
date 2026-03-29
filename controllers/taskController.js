const { pool } = require('../config/db');

const getTasks = async (req, res) => {
  try {
    const { status, priority } = req.query;
    let query = `
      SELECT t.*, u.name AS assigned_name, u.avatar_initials AS assigned_initials, c.name AS creator_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to=u.id
      LEFT JOIN users c ON t.created_by=c.id
      WHERE t.workspace_id=$1
    `;
    const params = [req.params.id];
    if (status) { params.push(status); query += ` AND t.status=$${params.length}`; }
    if (priority) { params.push(priority); query += ` AND t.priority=$${params.length}`; }
    query += ' ORDER BY t.created_at DESC';
    const result = await pool.query(query, params);
    res.json({ success: true, tasks: result.rows });
  } catch { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const createTask = async (req, res) => {
  try {
    const { title, description, status, priority, assigned_to, due_date } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Task title is required.' });
    const result = await pool.query(
      'INSERT INTO tasks (title,description,status,priority,workspace_id,assigned_to,created_by,due_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [title.trim(), description || '', status || 'todo', priority || 'medium', req.params.id, assigned_to || null, req.user.id, due_date || null]
    );
    res.status(201).json({ success: true, task: result.rows[0] });
  } catch { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const updateTask = async (req, res) => {
  try {
    const { title, description, status, priority, assigned_to, due_date } = req.body;
    const result = await pool.query(
      `UPDATE tasks SET title=COALESCE($1,title),description=COALESCE($2,description),status=COALESCE($3,status),
       priority=COALESCE($4,priority),assigned_to=COALESCE($5,assigned_to),due_date=COALESCE($6,due_date),updated_at=NOW()
       WHERE id=$7 AND workspace_id=$8 RETURNING *`,
      [title, description, status, priority, assigned_to, due_date, req.params.taskId, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Task not found.' });
    res.json({ success: true, task: result.rows[0] });
  } catch { res.status(500).json({ success: false, message: 'Server error.' }); }
};

const deleteTask = async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id=$1 AND workspace_id=$2', [req.params.taskId, req.params.id]);
    res.json({ success: true, message: 'Task deleted.' });
  } catch { res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = { getTasks, createTask, updateTask, deleteTask };
