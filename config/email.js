const sendInviteEmail = async ({ toEmail, inviterName, workspaceName, role, inviteLink }) => {
  const roleLabel = role === 'admin' ? 'Admin' : role === 'editor' ? 'Editor' : 'Member';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #f5f4f1; margin: 0; padding: 40px 20px; }
    .card { background: #ffffff; border-radius: 16px; max-width: 520px; margin: 0 auto; padding: 40px; border: 1px solid #e8e6e0; }
    .logo-text { font-size: 18px; font-weight: 600; color: #1a1a18; }
    h1 { font-size: 22px; color: #1a1a18; margin: 0 0 12px; font-weight: 600; }
    p { color: #6b6a66; line-height: 1.7; margin: 0 0 20px; font-size: 15px; }
    .role-badge { display: inline-block; background: #d2f5e4; color: #0d5940; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 24px; }
    .btn { display: block; background: #0e8a5c; color: #ffffff; text-decoration: none; text-align: center; padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: 600; margin: 28px 0; }
    .divider { border: none; border-top: 1px solid #e8e6e0; margin: 28px 0; }
    .footer { font-size: 12px; color: #9e9c97; }
    .link { color: #0e8a5c; word-break: break-all; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <p class="logo-text">WorkOS</p>
    <h1>You're invited to join a workspace</h1>
    <p><strong>${inviterName}</strong> has invited you to collaborate on <strong>${workspaceName}</strong>.</p>
    <span class="role-badge">Your role: ${roleLabel}</span>
    <p>Click the button below to accept your invitation. This link expires in <strong>48 hours</strong>.</p>
    <a href="${inviteLink}" class="btn">Accept invitation →</a>
    <hr class="divider">
    <p class="footer">If you weren't expecting this, you can safely ignore this email.</p>
    <p class="footer">Or copy this link:<br><a href="${inviteLink}" class="link">${inviteLink}</a></p>
  </div>
</body>
</html>`;

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: 'WorkOS', email: process.env.SMTP_USER },
      to: [{ email: toEmail }],
      subject: `${inviterName} invited you to ${workspaceName} on WorkOS`,
      htmlContent: html,
      textContent: `${inviterName} invited you to join ${workspaceName} as ${roleLabel}.\n\nAccept here: ${inviteLink}\n\nThis link expires in 48 hours.`,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Brevo API error: ${err.message || response.status}`);
  }
};

module.exports = { sendInviteEmail };