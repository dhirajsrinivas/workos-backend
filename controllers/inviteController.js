const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/db');
const { sendInviteEmail } = require('../config/email');

// POST /api/workspace/:id/invite
const sendInvite = async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required.' });

    const validRoles = ['admin', 'editor', 'member'];
    if (!validRoles.includes(role))
      return res.status(400).json({ success: false, message: 'Role must be admin, editor, or member.' });

    // Get workspace info
    const ws = await pool.query('SELECT name FROM workspaces WHERE id=$1', [req.params.id]);
    if (!ws.rows.length) return res.status(404).json({ success: false, message: 'Workspace not found.' });

    // Check if already a member
    const existingUser = await pool.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (existingUser.rows.length) {
      const isMember = await pool.query(
        'SELECT id FROM workspace_members WHERE workspace_id=$1 AND user_id=$2',
        [req.params.id, existingUser.rows[0].id]
      );
      if (isMember.rows.length)
        return res.status(409).json({ success: false, message: 'This user is already a member of the workspace.' });
    }

    // Check for existing pending invite
    const existing = await pool.query(
      "SELECT id FROM workspace_invites WHERE workspace_id=$1 AND email=$2 AND status='pending' AND expires_at > NOW()",
      [req.params.id, email.toLowerCase()]
    );
    if (existing.rows.length)
      return res.status(409).json({ success: false, message: 'A pending invitation already exists for this email.' });

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO workspace_invites (workspace_id,invited_by,email,role,token,expires_at) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.params.id, req.user.id, email.toLowerCase(), role, token, expiresAt]
    );

    const inviteLink = `${process.env.FRONTEND_URL}/invite/${token}`;

    try {
      await sendInviteEmail({
        toEmail: email,
        inviterName: req.user.name,
        workspaceName: ws.rows[0].name,
        role,
        inviteLink,
      });
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
      // Still return success with invite link so owner can share manually
      return res.status(201).json({
        success: true,
        message: 'Invitation created, but email delivery failed. Share the link manually.',
        inviteLink,
        emailFailed: true,
      });
    }

    res.status(201).json({ success: true, message: `Invitation sent to ${email}.`, inviteLink });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/workspace/:id/invites
const listInvites = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT wi.*, u.name AS invited_by_name
      FROM workspace_invites wi
      JOIN users u ON wi.invited_by = u.id
      WHERE wi.workspace_id=$1
      ORDER BY wi.created_at DESC
    `, [req.params.id]);
    res.json({ success: true, invites: result.rows });
  } catch { res.status(500).json({ success: false, message: 'Server error.' }); }
};

// DELETE /api/workspace/:id/invites/:inviteId
const revokeInvite = async (req, res) => {
  try {
    await pool.query('DELETE FROM workspace_invites WHERE id=$1 AND workspace_id=$2', [req.params.inviteId, req.params.id]);
    res.json({ success: true, message: 'Invitation revoked.' });
  } catch { res.status(500).json({ success: false, message: 'Server error.' }); }
};

// GET /api/invite/:token  — public, get invite info
const getInviteInfo = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT wi.*, w.name AS workspace_name, w.icon, w.color, u.name AS invited_by_name
      FROM workspace_invites wi
      JOIN workspaces w ON wi.workspace_id=w.id
      JOIN users u ON wi.invited_by=u.id
      WHERE wi.token=$1
    `, [req.params.token]);

    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Invitation not found or already used.' });

    const invite = result.rows[0];
    if (invite.status !== 'pending')
      return res.status(410).json({ success: false, message: `This invitation has already been ${invite.status}.` });
    if (new Date(invite.expires_at) < new Date())
      return res.status(410).json({ success: false, message: 'This invitation has expired.' });

    res.json({ success: true, invite });
  } catch { res.status(500).json({ success: false, message: 'Server error.' }); }
};

// POST /api/invite/:token/accept  — requires auth
const acceptInvite = async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT wi.*, w.name AS workspace_name
      FROM workspace_invites wi JOIN workspaces w ON wi.workspace_id=w.id
      WHERE wi.token=$1 FOR UPDATE
    `, [req.params.token]);

    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Invitation not found.' });

    const invite = result.rows[0];
    if (invite.status !== 'pending')
      return res.status(410).json({ success: false, message: 'This invitation has already been used.' });
    if (new Date(invite.expires_at) < new Date())
      return res.status(410).json({ success: false, message: 'This invitation has expired.' });
    if (invite.email !== req.user.email)
      return res.status(403).json({ success: false, message: 'This invitation was sent to a different email address.' });

    await client.query('BEGIN');
    // Add to workspace
    await client.query(
      'INSERT INTO workspace_members (workspace_id,user_id,role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
      [invite.workspace_id, req.user.id, invite.role]
    );
    // Mark as accepted
    await client.query("UPDATE workspace_invites SET status='accepted' WHERE id=$1", [invite.id]);
    await client.query('COMMIT');

    res.json({ success: true, message: `You have joined ${invite.workspace_name}!`, workspaceId: invite.workspace_id });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Server error.' });
  } finally { client.release(); }
};

module.exports = { sendInvite, listInvites, revokeInvite, getInviteInfo, acceptInvite };
