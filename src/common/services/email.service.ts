import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(email: string, name: string, verificationToken: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM') || 'noreply@taskloom.com',
      to: email,
      subject: 'Verify Your Email - TaskLoom',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #846BD2; padding: 30px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">TaskLoom</h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Welcome to TaskLoom, ${name}!</h2>
                      <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                        Thank you for signing up! Please verify your email address to activate your account and get started with TaskLoom.
                      </p>
                      <p style="color: #666666; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                        Click the button below to verify your email address:
                      </p>

                      <!-- Button -->
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td align="center" style="padding: 0 0 30px 0;">
                            <a href="${verificationUrl}" style="background-color: #846BD2; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: bold; display: inline-block;">
                              Verify Email Address
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #999999; line-height: 1.6; margin: 0; font-size: 14px;">
                        Or copy and paste this link in your browser:<br>
                        <a href="${verificationUrl}" style="color: #846BD2; word-break: break-all;">${verificationUrl}</a>
                      </p>

                      <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;">

                      <p style="color: #999999; line-height: 1.6; margin: 0; font-size: 14px;">
                        This verification link will expire in 24 hours. If you didn't create an account with TaskLoom, you can safely ignore this email.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center;">
                      <p style="color: #999999; margin: 0; font-size: 12px;">
                        © ${new Date().getFullYear()} TaskLoom. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM') || 'noreply@taskloom.com',
      to: email,
      subject: 'Reset Your Password - TaskLoom',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #846BD2; padding: 30px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">TaskLoom</h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px;">Password Reset Request</h2>
                      <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                        Hi ${name},
                      </p>
                      <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0; font-size: 16px;">
                        We received a request to reset your password for your TaskLoom account. Click the button below to reset your password:
                      </p>

                      <!-- Button -->
                      <table cellpadding="0" cellspacing="0" border="0" width="100%">
                        <tr>
                          <td align="center" style="padding: 0 0 30px 0;">
                            <a href="${resetUrl}" style="background-color: #846BD2; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: bold; display: inline-block;">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #999999; line-height: 1.6; margin: 0; font-size: 14px;">
                        Or copy and paste this link in your browser:<br>
                        <a href="${resetUrl}" style="color: #846BD2; word-break: break-all;">${resetUrl}</a>
                      </p>

                      <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;">

                      <p style="color: #999999; line-height: 1.6; margin: 0; font-size: 14px;">
                        This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center;">
                      <p style="color: #999999; margin: 0; font-size: 12px;">
                        © ${new Date().getFullYear()} TaskLoom. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}
