import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(template: EmailTemplate): Promise<{ success: boolean; error?: string }> {
  if (!resend || !RESEND_API_KEY) {
    console.warn('Resend API key not configured. Email not sent.');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: template.to,
      subject: template.subject,
      html: template.html,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: 'Failed to send email' };
    }

    console.log('Email sent successfully:', data);
    return { success: true };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: 'Email service error' };
  }
}

export function getWelcomeEmailTemplate(username: string, email: string): EmailTemplate {
  return {
    to: email,
    subject: 'Welcome to LEGACY - Your Web3 Journey Begins!',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            ul { padding-left: 20px; }
            li { margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Welcome to LEGACY!</h1>
            </div>
            <div class="content">
              <h2>Hello ${username}!</h2>
              <p>Welcome to LEGACY, the gamified Web3 education platform for sports professionals.</p>
              <p><strong>Get started by:</strong></p>
              <ul>
                <li>Complete your first lesson to earn XP</li>
                <li>Reach 99 XP to unlock profile editing</li>
                <li>Complete daily missions for bonus rewards</li>
                <li>Build your 7-day streak for 222 XP bonus</li>
              </ul>
              <p style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://legacy.com'}/dashboard" class="button" style="color: white;">Go to Dashboard</a>
              </p>
              <p>Happy learning!</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 LEGACY. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Welcome to LEGACY, ${username}! Start your Web3 journey today. Visit your dashboard to get started.`
  };
}

export function getStreakBonusEmailTemplate(username: string, email: string, days: number, bonus: number): EmailTemplate {
  return {
    to: email,
    subject: `🔥 ${days}-Day Streak Complete! Bonus XP Awarded`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
            .streak { text-align: center; padding: 20px; background: #fff7ed; border-radius: 8px; margin: 20px 0; }
            .streak-number { font-size: 48px; font-weight: bold; color: #ea580c; margin: 10px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #ea580c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔥 Streak Bonus!</h1>
            </div>
            <div class="content">
              <h2>Amazing, ${username}!</h2>
              <div class="streak">
                <div class="streak-number">${days} Days</div>
                <p style="margin: 5px 0;"><strong>Bonus: +${bonus} XP</strong></p>
              </div>
              <p>You've maintained a ${days}-day learning streak! Your dedication is inspiring.</p>
              <p>Keep logging in daily to maintain your momentum!</p>
              <p style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://legacy.com'}/dashboard" class="button" style="color: white;">Continue Your Streak</a>
              </p>
            </div>
            <div class="footer">
              <p>&copy; 2025 LEGACY. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Congratulations ${username}! You've completed a ${days}-day streak and earned +${bonus} XP bonus!`
  };
}
