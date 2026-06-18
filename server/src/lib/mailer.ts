import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || 'TaskFlow <noreply@taskflow.app>';

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.SMTP_USER) return false;
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
    return true;
  } catch (err) {
    console.error('Email send failed:', err);
    return false;
  }
}

export function taskAssignedEmail(taskTitle: string, projectName: string, assignerName: string): { subject: string; html: string } {
  return {
    subject: `New task assigned: ${taskTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6366f1;">New Task Assigned</h2>
        <p><strong>${assignerName}</strong> assigned you a task:</p>
        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px;">${taskTitle}</h3>
          <p style="margin: 0; color: #64748b;">Project: ${projectName}</p>
        </div>
        <p style="color: #94a3b8; font-size: 12px;">TaskFlow Notifications</p>
      </div>
    `,
  };
}

export function dueDateReminderEmail(taskTitle: string, dueDate: string): { subject: string; html: string } {
  return {
    subject: `Reminder: ${taskTitle} is due soon`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f59e0b;">Task Due Soon</h2>
        <div style="background: #fffbeb; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin: 0 0 8px;">${taskTitle}</h3>
          <p style="margin: 0; color: #92400e;">Due: ${dueDate}</p>
        </div>
        <p style="color: #94a3b8; font-size: 12px;">TaskFlow Notifications</p>
      </div>
    `,
  };
}
