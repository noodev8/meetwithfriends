/*
=======================================================================================================================================
Email Service
=======================================================================================================================================
Handles sending emails via Resend API.
=======================================================================================================================================
*/

const { Resend } = require('resend');
const config = require('../config/config');

// Initialize Resend client
const resend = new Resend(config.email.resendApiKey);

/*
=======================================================================================================================================
sendPasswordResetEmail
=======================================================================================================================================
Sends a password reset email with a link to reset the password.
=======================================================================================================================================
*/
async function sendPasswordResetEmail(email, token) {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;

    try {
        const { data, error } = await resend.emails.send({
            from: `${config.email.fromName} <${config.email.from}>`,
            to: email,
            subject: 'Reset Your Password',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Reset Your Password</h2>
                    <p style="color: #666; font-size: 16px;">
                        You requested to reset your password for your Meet With Friends account.
                    </p>
                    <p style="color: #666; font-size: 16px;">
                        Click the button below to set a new password. This link will expire in 1 hour.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}"
                           style="background-color: #2563eb; color: white; padding: 12px 24px;
                                  text-decoration: none; border-radius: 8px; font-weight: bold;
                                  display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #999; font-size: 14px;">
                        If you didn't request this, you can safely ignore this email.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #999; font-size: 12px;">
                        If the button doesn't work, copy and paste this link into your browser:<br>
                        <a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a>
                    </p>
                </div>
            `
        });

        if (error) {
            console.error('Resend error:', error);
            return { success: false, error };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Email send error:', error);
        return { success: false, error };
    }
}

module.exports = {
    sendPasswordResetEmail
};
