import { Resend } from 'resend';
import { logger } from '../lib/logger';

export interface EmailService {
  sendPasswordReset(email: string, resetToken: string, expiresAt: string): Promise<void>;
  sendEmailVerification(email: string, verificationToken: string): Promise<void>;
}

const consoleEmailService: EmailService = {
  async sendPasswordReset(email, resetToken, expiresAt) {
    const resetUrl = `${process.env['APP_URL'] || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    logger.info(
      { email, expiresAt, resetUrl },
      'Password reset requested (email transport not configured — logging reset URL)',
    );
  },
  async sendEmailVerification(email, verificationToken) {
    const verifyUrl = `${process.env['APP_URL'] || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    logger.info(
      { email, verifyUrl },
      'Email verification requested (email transport not configured — logging verify URL)',
    );
  },
};

function createResendEmailService(apiKey: string, fromAddress: string): EmailService {
  const resend = new Resend(apiKey);

  return {
    async sendPasswordReset(email, resetToken, expiresAt) {
      const resetUrl = `${process.env['APP_URL'] || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      const expiresDate = new Date(expiresAt);
      const expiresIn = Math.max(1, Math.round((expiresDate.getTime() - Date.now()) / 60000));

      await resend.emails.send({
        from: fromAddress,
        to: email,
        subject: 'Reset your mstprmpt password',
        text: [
          'You requested a password reset.',
          '',
          `Click here to reset your password: ${resetUrl}`,
          '',
          `This link expires in ${expiresIn} minutes.`,
          '',
          'If you did not request this, ignore this email.',
        ].join('\n'),
        html: [
          '<p>You requested a password reset.</p>',
          `<p><a href="${resetUrl}">Click here to reset your password</a></p>`,
          `<p>This link expires in ${expiresIn} minutes.</p>`,
          '<p>If you did not request this, ignore this email.</p>',
        ].join('\n'),
      });

      logger.info({ email }, 'Password reset email sent via Resend');
    },

    async sendEmailVerification(email, verificationToken) {
      const verifyUrl = `${process.env['APP_URL'] || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

      await resend.emails.send({
        from: fromAddress,
        to: email,
        subject: 'Verify your mstprmpt email',
        text: [
          'Welcome to mstprmpt!',
          '',
          `Please verify your email: ${verifyUrl}`,
          '',
          'If you did not sign up, ignore this email.',
        ].join('\n'),
        html: [
          '<p>Welcome to mstprmpt!</p>',
          `<p><a href="${verifyUrl}">Verify your email address</a></p>`,
          '<p>If you did not sign up, ignore this email.</p>',
        ].join('\n'),
      });

      logger.info({ email }, 'Email verification sent via Resend');
    },
  };
}

let _emailService: EmailService | null = null;

export function getEmailService(): EmailService {
  if (_emailService) return _emailService;

  const resendApiKey = process.env['RESEND_API_KEY'];
  const emailFrom = process.env['EMAIL_FROM'] || 'mstprmpt <noreply@mstprmpt.com>';

  if (resendApiKey) {
    logger.info('Email transport: Resend');
    _emailService = createResendEmailService(resendApiKey, emailFrom);
  } else {
    logger.warn('RESEND_API_KEY not set — emails will be logged to console');
    _emailService = consoleEmailService;
  }

  return _emailService;
}
