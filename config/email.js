const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendInviteEmail = async ({ toEmail, inviterName, workspaceName, role, inviteLink }) => {
  const roleLabel = role === 'admin' ? 'Admin' : role === 'editor' ? 'Editor' : 'Member';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #f5f4f1; margin: 0; padding: 40px 20px; }
    .card { background: #ffffff; border-radius: 16px; max-width: 520px; margin: 0 auto; padding: 40px; border: 1px solid #e8e6e0; }
    .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }
    .logo-mark { width: 36px; height: 36px; background: #185FA5; border-radius: 9px; display: flex; align-items: center; justify-content: center; }
    .logo-text { font-size: 18px; font-weight: 600; color: #1a1a18; }
    h1 { font-size: 22px; color: #1a1a18; margin: 0 0 12px; font-weight: 600; }
    p { color: #6b6a66; line-height: 1.7; margin: 0 0 20px; font-size: 15px; }
    .role-badge { display: inline-block; background: #E6F1FB; color: #0C447C; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 24px; }
    .btn { display: block; background: #185FA5; color: #ffffff; text-decoration: none; text-align: center; padding: 14px 28px; border-radius: 10px; font-size: 15px; font-weight: 600; margin: 28px 0; }
    .divider { border: none; border-top: 1px solid #e8e6e0; margin: 28px 0; }
    .footer { font-size: 12px; color: #9e9c97; }
    .link { color: #185FA5; word-break: break-all; font-size: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="logo-mark">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="2" width="7" height="7" rx="2" fill="white"/>
          <rect x="11" y="2" width="7" height="7" rx="2" fill="white" opacity=".6"/>
          <rect x="2" y="11" width="7" height="7" rx="2" fill="white" opacity=".6"/>
          <rect x="11" y="11" width="7" height="7" rx="2" fill="white" opacity=".3"/>
        </svg>
      </div>
      <span class="logo-text">WorkOS</span>
    </div>

    <h1>You're invited to join a workspace</h1>
    <p><strong>${inviterName}</strong> has invited you to collaborate on <strong>${workspaceName}</strong>.</p>
    <span class="role-badge">Your role: ${roleLabel}</span>

    <p>Click the button below to accept your invitation. This link expires in <strong>48 hours</strong>.</p>

    <a href="${inviteLink}" class="btn">Accept invitation →</a>

    <hr class="divider">
    <p class="footer">If you weren't expecting this invitation, you can safely ignore this email.</p>
    <p class="footer">Or paste this link in your browser:<br><a href="${inviteLink}" class="link">${inviteLink}</a></p>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'WorkOS <noreply@workos.app>',
    to: toEmail,
    subject: `${inviterName} invited you to ${workspaceName} on WorkOS`,
    html,
    text: `${inviterName} invited you to join ${workspaceName} as ${roleLabel}.\n\nAccept here: ${inviteLink}\n\nThis link expires in 48 hours.`,
  });
};

module.exports = { sendInviteEmail };
