import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const secure = process.env.SMTP_SECURE === 'true';
const from = process.env.MAIL_FROM || user || 'noreply@localhost';
const appName = process.env.APP_NAME || 'Cinema Booking';
const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

function isSmtpConfigured() {
  return Boolean(host && user && pass);
}

function createTransport() {
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  if (!isSmtpConfigured()) {
    console.warn(
      '[mail] SMTP chưa cấu hình (SMTP_HOST/USER/PASS). Nội dung email:\n',
      { to: opts.to, subject: opts.subject, text: opts.text || opts.html }
    );
    return { sent: false, reason: 'smtp_not_configured' as const };
  }

  try {
    const transport = createTransport();
    const info = await transport.sendMail({
      from: `"${appName}" <${from}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    console.log('[mail] Đã gửi:', info.messageId, '→', opts.to);
    return { sent: true as const, messageId: info.messageId };
  } catch (err) {
    console.error('[mail] Lỗi gửi email:', err);
    // Dev: vẫn in nội dung để test được
    console.warn('[mail] Fallback content:', {
      to: opts.to,
      subject: opts.subject,
      text: opts.text || opts.html,
    });
    return { sent: false, reason: 'send_failed' as const, error: err };
  }
}

export async function sendEmailVerification(email: string, token: string) {
  const link = `${appUrl}/xac-thuc-email?token=${encodeURIComponent(token)}`;
  return sendMail({
    to: email,
    subject: `[${appName}] Xác thực email`,
    text: `Mở link để xác thực tài khoản (hết hạn 24h):\n${link}`,
    html: `
      <p>Xin chào,</p>
      <p>Nhấn nút bên dưới để xác thực email (hết hạn 24 giờ):</p>
      <p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Xác thực email</a></p>
      <p>Hoặc copy link:<br/><code>${link}</code></p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `${appUrl}/dat-lai-mat-khau?token=${encodeURIComponent(token)}`;
  return sendMail({
    to: email,
    subject: `[${appName}] Đặt lại mật khẩu`,
    text: `Đặt lại mật khẩu (hết hạn 1 giờ):\n${link}`,
    html: `
      <p>Xin chào,</p>
      <p>Nhấn nút để đặt lại mật khẩu (hết hạn 1 giờ):</p>
      <p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Đặt lại mật khẩu</a></p>
      <p>Hoặc copy link:<br/><code>${link}</code></p>
      <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    `,
  });
}