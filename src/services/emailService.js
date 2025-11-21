/**
 * Email Service
 * Design Pattern: Strategy Pattern (can swap email providers)
 * 
 * For development: Use console logging
 * For production: Integrate with SendGrid, AWS SES, etc.
 */

class EmailService {
    constructor() {
        this.from = process.env.EMAIL_FROM || 'noreply@idenlia.com';
        this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    }

    /**
     * Send email (implement with real service in production)
     */

    async send(to, subject, html) {
        // Development: Just log
        if (process.env.NODE_ENV === 'development') {
            console.log('\n📧 EMAIL SENT');
            console.log('To:', to);
            console.log('Subject:', subject);
            console.log('Content:', html);
            console.log('---\n');
            return { success: true };
        }

        // Production: Implement with real email service
        // example with sendgrid:
        // const msg = { to, from: this.from, subject, html };
        // await sgMail.send(msg)

        return { success: true }
    }

  /**
   * Send verification email
   */
  async sendVerificationEmail(user, token) {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Idenlia, ${user.name}!</h2>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <a href="${verifyUrl}" 
           style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
          Verify Email Address
        </a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${verifyUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This link will expire in 24 hours. If you didn't create an account, please ignore this email.
        </p>
      </div>
    `;
    
    await this.send(user.email, 'Verify Your Email Address', html);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, token) {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hi ${user.name},</p>
        <p>You requested to reset your password. Click the button below to set a new password:</p>
        <a href="${resetUrl}" 
           style="display: inline-block; padding: 12px 24px; background-color: #DC2626; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
          Reset Password
        </a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
        </p>
      </div>
    `;
    
    await this.send(user.email, 'Password Reset Request', html);
  }
  
    /**
   * Send welcome email (after verification)
   */
  async sendWelcomeEmail(user) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Idenlia! 🎉</h2>
        <p>Hi ${user.name},</p>
        <p>Your email has been verified successfully. You're all set to start building better habits!</p>
        <p>Here's what you can do:</p>
        <ul>
          <li>Create your identity-based habits</li>
          <li>Track your daily progress</li>
          <li>Build consistent routines</li>
        </ul>
        <a href="${this.frontendUrl}/dashboard" 
           style="display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
          Go to Dashboard
        </a>
        <p>Happy habit building!</p>
      </div>
    `;
    
    await this.send(user.email, 'Welcome to Idenlia!', html);
  }
}


export const emailService = new EmailService();