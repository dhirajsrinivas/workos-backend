const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

// POST /api/workspace/:id/files
const uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const result = await pool.query(
      'INSERT INTO workspace_files (workspace_id,uploaded_by,filename,original_name,file_path,file_size,mime_type) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [req.params.id, req.user.id, req.file.filename, req.file.originalname, req.file.path, req.file.size, req.file.mimetype || 'text/plain']
    );

    res.status(201).json({ success: true, message: 'File uploaded successfully.', file: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/workspace/:id/files
const listFiles = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT wf.*, u.name AS uploader_name, u.avatar_initials AS uploader_initials
      FROM workspace_files wf
      JOIN users u ON wf.uploaded_by = u.id
      WHERE wf.workspace_id=$1
      ORDER BY wf.created_at DESC
    `, [req.params.id]);
    res.json({ success: true, files: result.rows });
  } catch { res.status(500).json({ success: false, message: 'Server error.' }); }
};

// GET /api/workspace/:id/files/:fileId/content
const getFileContent = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM workspace_files WHERE id=$1 AND workspace_id=$2',
      [req.params.fileId, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'File not found.' });

    const file = result.rows[0];
    if (!fs.existsSync(file.file_path))
      return res.status(404).json({ success: false, message: 'File not found on server.' });

    const content = fs.readFileSync(file.file_path, 'utf-8');
    res.json({ success: true, file: { ...file, content } });
  } catch { res.status(500).json({ success: false, message: 'Server error.' }); }
};

// GET /api/workspace/:id/files/:fileId/download
const downloadFile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM workspace_files WHERE id=$1 AND workspace_id=$2',
      [req.params.fileId, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'File not found.' });
    const file = result.rows[0];
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    res.setHeader('Content-Type', 'text/plain');
    res.sendFile(path.resolve(file.file_path));
  } catch { res.status(500).json({ success: false, message: 'Server error.' }); }
};

// DELETE /api/workspace/:id/files/:fileId
const deleteFile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM workspace_files WHERE id=$1 AND workspace_id=$2',
      [req.params.fileId, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'File not found.' });

    const file = result.rows[0];
    // Only owner/admin or the uploader can delete
    if (file.uploaded_by !== req.user.id && !['owner', 'admin'].includes(req.memberRole)) {
      return res.status(403).json({ success: false, message: 'You can only delete files you uploaded.' });
    }

    if (fs.existsSync(file.file_path)) fs.unlinkSync(file.file_path);
    await pool.query('DELETE FROM workspace_files WHERE id=$1', [file.id]);
    res.json({ success: true, message: 'File deleted.' });
  } catch { res.status(500).json({ success: false, message: 'Server error.' }); }
};

module.exports = { uploadFile, listFiles, getFileContent, downloadFile, deleteFile };
