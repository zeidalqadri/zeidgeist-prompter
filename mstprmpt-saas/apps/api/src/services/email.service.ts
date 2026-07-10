import { logger } from '../lib/logger';

export interface EmailService {
  sendPasswordReset(email: string, resetToken: string, expiresAt: string): Promise<void>;
}

const consoleEmailService: EmailService = {
  async sendPasswordReset(email, resetToken, expiresAt) {
    const resetUrl = `${process.env['APP_URL'] || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    logger.info(
      { email, expiresAt, resetUrl },
      'Password reset requested (email transport not configured — logging reset URL)',
    );
  },
};

export function getEmailService(): EmailService {
  return consoleEmailService;
}
