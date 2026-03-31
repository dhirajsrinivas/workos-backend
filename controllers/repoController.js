const { pool } = require('../config/db');

const checkAccess = async (wsId, userId) => {
  const r = await pool.query('SELECT role FROM workspace_members WHERE workspace_id=$1 AND user_id=$2', [wsId, userId]);
  return r.rows[0] || null;
};

/* GET /api/workspace/:id/repo/items — get full tree */
const getItems = async (req, res) => {
  try {
    const access = await checkAccess(req.params.id, req.user.id);
    if (!access) return res.status(403).json({ success: false, message: 'Access denied.' });

    const result = await pool.query(
      `SELECT i.*, u.name AS created_by_name
       FROM repo_items i
       LEFT JOIN users u ON i.created_by = u.id
       WHERE i.workspace_id = $1
       ORDER BY i.type DESC, i.name ASC`,
      [req.params.id]
    );
    res.json({ success: true, items: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* POST /api/workspace/:id/repo/items — create file or folder */
const createItem = async (req, res) => {
  try {
    const access = await checkAccess(req.params.id, req.user.id);
    if (!access || !['owner','admin','editor'].includes(access.role))
      return res.status(403).json({ success: false, message: 'Editor access required.' });

    const { type, name, parent_id, content, language } = req.body;
    if (!type || !name) return res.status(400).json({ success: false, message: 'Type and name are required.' });
    if (!['file','folder'].includes(type)) return res.status(400).json({ success: false, message: 'Type must be file or folder.' });

    // Check name uniqueness within same parent
    const exists = await pool.query(
      'SELECT id FROM repo_items WHERE workspace_id=$1 AND parent_id IS NOT DISTINCT FROM $2 AND name=$3',
      [req.params.id, parent_id || null, name]
    );
    if (exists.rows.length > 0)
      return res.status(409).json({ success: false, message: `A ${type} named "${name}" already exists here.` });

    const result = await pool.query(
      `INSERT INTO repo_items (workspace_id, parent_id, type, name, content, language, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.params.id, parent_id || null, type, name.trim(), content || '', language || 'plaintext', req.user.id]
    );
    res.status(201).json({ success: true, item: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* PUT /api/workspace/:id/repo/items/:itemId — update file content or rename */
const updateItem = async (req, res) => {
  try {
    const access = await checkAccess(req.params.id, req.user.id);
    if (!access || !['owner','admin','editor'].includes(access.role))
      return res.status(403).json({ success: false, message: 'Editor access required.' });

    const { name, content, language } = req.body;
    const result = await pool.query(
      `UPDATE repo_items SET
        name = COALESCE($1, name),
        content = COALESCE($2, content),
        language = COALESCE($3, language),
        updated_at = NOW()
       WHERE id = $4 AND workspace_id = $5 RETURNING *`,
      [name, content, language, req.params.itemId, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Item not found.' });
    res.json({ success: true, item: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* DELETE /api/workspace/:id/repo/items/:itemId */
const deleteItem = async (req, res) => {
  try {
    const access = await checkAccess(req.params.id, req.user.id);
    if (!access || !['owner','admin','editor'].includes(access.role))
      return res.status(403).json({ success: false, message: 'Editor access required.' });

    await pool.query('DELETE FROM repo_items WHERE id=$1 AND workspace_id=$2', [req.params.itemId, req.params.id]);
    res.json({ success: true, message: 'Deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* GET /api/workspace/:id/repo/commits — get last commit */
const getCommits = async (req, res) => {
  try {
    const access = await checkAccess(req.params.id, req.user.id);
    if (!access) return res.status(403).json({ success: false, message: 'Access denied.' });

    const result = await pool.query(
      'SELECT id, author_name, message, created_at FROM repo_commits WHERE workspace_id=$1 ORDER BY created_at DESC LIMIT 20',
      [req.params.id]
    );
    res.json({ success: true, commits: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* POST /api/workspace/:id/repo/commits — save commit snapshot */
const createCommit = async (req, res) => {
  try {
    const access = await checkAccess(req.params.id, req.user.id);
    if (!access || !['owner','admin','editor'].includes(access.role))
      return res.status(403).json({ success: false, message: 'Editor access required.' });

    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Commit message is required.' });

    // Snapshot current state of all items
    const items = await pool.query(
      'SELECT * FROM repo_items WHERE workspace_id=$1 ORDER BY type DESC, name ASC',
      [req.params.id]
    );

    const result = await pool.query(
      'INSERT INTO repo_commits (workspace_id, author_id, author_name, message, snapshot) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, req.user.id, req.user.name, message.trim(), JSON.stringify(items.rows)]
    );

    res.status(201).json({ success: true, commit: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

/* POST /api/workspace/:id/repo/commits/:commitId/restore — restore from commit */
const restoreCommit = async (req, res) => {
  const client = await pool.connect();
  try {
    const access = await checkAccess(req.params.id, req.user.id);
    if (!access || !['owner','admin'].includes(access.role))
      return res.status(403).json({ success: false, message: 'Admin access required to restore.' });

    const commit = await pool.query(
      'SELECT * FROM repo_commits WHERE id=$1 AND workspace_id=$2',
      [req.params.commitId, req.params.id]
    );
    if (!commit.rows.length) return res.status(404).json({ success: false, message: 'Commit not found.' });

    const snapshot = commit.rows[0].snapshot;

    await client.query('BEGIN');
    await client.query('DELETE FROM repo_items WHERE workspace_id=$1', [req.params.id]);

    // Restore items — need to handle parent_id references carefully
    const idMap = {};
    const rootItems = snapshot.filter(i => !i.parent_id);
    const childItems = snapshot.filter(i => i.parent_id);

    for (const item of rootItems) {
      const r = await client.query(
        'INSERT INTO repo_items (workspace_id, parent_id, type, name, content, language, created_by, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
        [req.params.id, null, item.type, item.name, item.content||'', item.language||'plaintext', item.created_by, item.created_at]
      );
      idMap[item.id] = r.rows[0].id;
    }

    for (const item of childItems) {
      const newParentId = idMap[item.parent_id] || null;
      const r = await client.query(
        'INSERT INTO repo_items (workspace_id, parent_id, type, name, content, language, created_by, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',
        [req.params.id, newParentId, item.type, item.name, item.content||'', item.language||'plaintext', item.created_by, item.created_at]
      );
      idMap[item.id] = r.rows[0].id;
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Restored from commit.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally {
    client.release();
  }
};

module.exports = { getItems, createItem, updateItem, deleteItem, getCommits, createCommit, restoreCommit };
