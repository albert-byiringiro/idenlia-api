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
}