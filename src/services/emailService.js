/**
 * Email Service
 * 
 * Design Pattern: Strategy Pattern (can swap email providers)
 * 
 * Development: Uses Gmail SMTP with App Password
 * Production: Can switch to SendGrid, AWS SES, etc.
 * 
 * Gmail Setup:
 * 1. Enable 2FA on your Google account
 * 2. Generate App Password: https://myaccount.google.com/apppasswords
 * 3. Add to .env: EMAIL_USER and EMAIL_PASSWORD
 */

import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.from = process.env.EMAIL_FROM || 'noreply@idenlia.com';
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Initialize transporter
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize Email Transporter
   * 
   * Creates a nodemailer transporter based on environment.
   * - Development: Gmail SMTP
   * - Production: SendGrid, AWS SES, etc. (configure as needed)
   */
  initializeTransporter() {
    // Check if email credentials are configured
    const hasEmailConfig = process.env.EMAIL_USER && process.env.EMAIL_PASSWORD;
    
    if (!hasEmailConfig) {
      console.warn('⚠️ Email credentials not configured. Emails will be logged to console only.');
      console.warn('   To send real emails, add EMAIL_USER and EMAIL_PASSWORD to .env');
      return;
    }

    try {
      // Create Gmail transporter
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // true for 465, false for 587
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        // Gmail-specific settings
        tls: {
          rejectUnauthorized: false // Allow self-signed certificates (development only)
        }
      });

      console.log('✅ Email transporter initialized successfully');
      
      // Verify connection on startup
      this.verifyConnection();
      
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error);
      this.transporter = null;
    }
  }

  /**
   * Verify Email Connection
   * 
   * Tests SMTP connection to ensure credentials work.
   * This runs automatically when the service initializes.
   */
  async verifyConnection() {
    if (!this.transporter) return;

    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified - ready to send emails');
    } catch (error) {
      console.error('❌ SMTP connection failed:', error.message);
      console.error('   Check your EMAIL_USER and EMAIL_PASSWORD in .env');
      this.transporter = null;
    }
  }

  /**
   * Send Email
   * 
   * Sends email via configured transporter or logs to console.
   * 
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} html - HTML email content
   * @returns {Promise<Object>} - Send result
   */
  async send(to, subject, html) {
    // If no transporter (missing config or failed verification), log only
    if (!this.transporter) {
      console.log('\n📧 EMAIL (Console Only - No Transporter)');
      console.log('─────────────────────────────────────');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Content:', html);
      console.log('─────────────────────────────────────\n');
      return { success: true, mode: 'console' };
    }

    try {
      // Send actual email
      const info = await this.transporter.sendMail({
        from: `"Idenlia" <${this.from}>`,
        to,
        subject,
        html
      });

      console.log('✅ Email sent successfully');
      console.log('   Message ID:', info.messageId);
      console.log('   To:', to);
      console.log('   Subject:', subject);

      return { 
        success: true, 
        mode: 'smtp',
        messageId: info.messageId 
      };

    } catch (error) {
      console.error('❌ Failed to send email:', error.message);
      
      // Fallback to console logging
      console.log('\n📧 EMAIL (Failed to Send - Logging to Console)');
      console.log('─────────────────────────────────────');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Error:', error.message);
      console.log('─────────────────────────────────────\n');
      
      return { 
        success: false, 
        mode: 'console',
        error: error.message 
      };
    }
  }

  /**
   * Send Verification Email
   * 
   * Sends email with link to verify user's email address.
   * Link expires in 24 hours.
   * 
   * @param {Object} user - User object with email and name
   * @param {string} token - Verification token
   */
  async sendVerificationEmail(user, token) {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #4F46E5; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
            font-weight: bold;
          }
          .footer { 
            color: #999; 
            font-size: 12px; 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 1px solid #eee; 
          }
          .url-box {
            background: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
            word-break: break-all;
            font-size: 13px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 style="color: #4F46E5;">Welcome to Idenlia! 🎉</h2>
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>Thank you for registering with Idenlia. Please verify your email address by clicking the button below:</p>
          
          <a href="${verifyUrl}" class="button">Verify Email Address</a>
          
          <p>Or copy and paste this link into your browser:</p>
          <div class="url-box">${verifyUrl}</div>
          
          <div class="footer">
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account with Idenlia, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await this.send(user.email, '✅ Verify Your Email Address - Idenlia', html);
  }

  /**
   * Send Password Reset Email
   * 
   * Sends email with link to reset user's password.
   * Link expires in 1 hour.
   * 
   * @param {Object} user - User object with email and name
   * @param {string} token - Password reset token
   */
  async sendPasswordResetEmail(user, token) {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #DC2626; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
            font-weight: bold;
          }
          .warning {
            background: #FEF2F2;
            border-left: 4px solid #DC2626;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .footer { 
            color: #999; 
            font-size: 12px; 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 1px solid #eee; 
          }
          .url-box {
            background: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
            word-break: break-all;
            font-size: 13px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 style="color: #DC2626;">🔐 Password Reset Request</h2>
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>You requested to reset your password for your Idenlia account. Click the button below to set a new password:</p>
          
          <a href="${resetUrl}" class="button">Reset Password</a>
          
          <p>Or copy and paste this link into your browser:</p>
          <div class="url-box">${resetUrl}</div>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour for your security.
          </div>
          
          <div class="footer">
            <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
            <p>For security, we recommend changing your password regularly and using a strong, unique password.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    await this.send(user.email, '🔐 Password Reset Request - Idenlia', html);
  }
  
  /**
   * Send Welcome Email
   * 
   * Sends after successful email verification.
   * 
   * @param {Object} user - User object with email and name
   */
  async sendWelcomeEmail(user) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { 
            display: inline-block; 
            padding: 12px 24px; 
            background-color: #10B981; 
            color: white !important; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 20px 0;
            font-weight: bold;
          }
          .feature-list {
            background: #F0FDF4;
            border-left: 4px solid #10B981;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .feature-list ul {
            margin: 0;
            padding-left: 20px;
          }
          .feature-list li {
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 style="color: #10B981;">🎉 Welcome to Idenlia!</h2>
          <p>Hi <strong>${user.name}</strong>,</p>
          <p>Your email has been verified successfully. You're all set to start building better habits!</p>
          
          <div class="feature-list">
            <strong>✨ What you can do with Idenlia:</strong>
            <ul>
              <li>🎯 Create identity-based habits</li>
              <li>📊 Track your daily progress</li>
              <li>🔥 Build consistent routines</li>
              <li>📈 Visualize your growth over time</li>
            </ul>
          </div>
          
          <a href="${this.frontendUrl}/dashboard" class="button">Go to Dashboard</a>
          
          <p>Happy habit building! 💪</p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Need help getting started? Check out our <a href="${this.frontendUrl}/guide" style="color: #10B981;">quick start guide</a>.
          </p>
        </div>
      </body>
      </html>
    `;
    
    await this.send(user.email, '🎉 Welcome to Idenlia!', html);
  }
}

// Export singleton instance
export const emailService = new EmailService();