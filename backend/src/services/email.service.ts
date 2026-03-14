import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import logger from '../utils/logger';

const MAGIC_LINK_EXPIRY_MINUTES = 15;
const APP_SCHEME = process.env.MAGIC_LINK_APP_SCHEME || 'traverse';

function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true';

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: port ? parseInt(port, 10) : 587,
      secure,
      auth: { user, pass },
    });
  }
  return null;
}

const transporter = getTransporter();

export function getMagicLinkExpiryMinutes(): number {
  return MAGIC_LINK_EXPIRY_MINUTES;
}

export async function sendMagicLinkEmail(to: string, token: string, isSignup: boolean): Promise<void> {
  const baseUrl = process.env.MAGIC_LINK_BASE_URL;
  const link =
    baseUrl && baseUrl.startsWith('http')
      ? `${baseUrl.replace(/\/$/, '')}/auth/verify?token=${encodeURIComponent(token)}`
      : `${APP_SCHEME}://auth/verify?token=${encodeURIComponent(token)}`;

  const subject = isSignup ? 'Complete your Traverse signup' : 'Log in to Traverse';
  const html = `
    <p>${isSignup ? 'Click the link below to complete your account.' : 'Click the link below to log in to your account.'}</p>
    <p><a href="${link}">${link}</a></p>
    <p>This link expires in ${MAGIC_LINK_EXPIRY_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>
  `.trim();

  if (transporter) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'Traverse <noreply@traverseapp.co>',
      to,
      subject,
      html,
      text: html.replace(/<[^>]+>/g, ''),
    });
    logger.info('Magic link email sent to %s', to);
  } else {
    logger.info('[Magic link – no SMTP] To: %s | %s', to, link);
  }
}
