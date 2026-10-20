import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

// Sends email over SMTP. Works with a Gmail app password today, and with
// Brevo / Resend / Amazon SES / Zoho later - just change the SMTP_* settings.
//   SMTP_HOST, SMTP_PORT (465 or 587), SMTP_USER, SMTP_PASS, MAIL_FROM
// Without SMTP settings (local development) codes are printed to the log.
@Injectable()
export class MailService {
  private readonly log = new Logger('Mail');
  private transporter = process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: Number(process.env.SMTP_PORT || 465) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })
    : null;

  get configured() {
    return !!this.transporter;
  }

  async send(to: string, subject: string, text: string, html: string) {
    if (!this.transporter) {
      if (process.env.VERCEL) this.log.error('SMTP is not configured - emails cannot be sent. Set SMTP_* in Vercel.');
      else this.log.warn(`[dev email to ${to}] ${subject}\n${text}`);
      return;
    }
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM || `AutoGuide <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
  }

  async sendCode(to: string, purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD' | 'CHANGE_EMAIL', code: string) {
    const subject =
      purpose === 'RESET_PASSWORD' ? `${code} is your AutoGuide password reset code` : `${code} is your AutoGuide verification code`;
    const intro =
      purpose === 'RESET_PASSWORD'
        ? 'Use this code to reset your password:'
        : purpose === 'CHANGE_EMAIL'
          ? 'Use this code to confirm this as the new email for your AutoGuide account:'
          : 'Use this code to verify your email address:';
    const text = `${intro}\n\n${code}\n\nThe code expires in 10 minutes. If you didn’t request it, you can ignore this email - never share this code with anyone, including sellers.\n\nAutoGuide\n© ${new Date().getFullYear()} AutoGuide. All rights reserved. Developed by MonolythCode.`;
    const html = `<!doctype html><html><body style="margin:0;background:#F4F4F6;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111114">
<div style="max-width:480px;margin:0 auto;padding:24px">
<div style="background:linear-gradient(135deg,#161314,#231F20);color:#fff;padding:16px 20px;border-radius:14px 14px 0 0;border-bottom:3px solid #E5120B;font-weight:900;font-size:18px">Auto<span style="color:#FF5A50">Guide</span></div>
<div style="background:#fff;padding:24px;border-radius:0 0 14px 14px">
<p style="margin:0 0 12px">${intro}</p>
<p style="font-size:34px;font-weight:900;letter-spacing:8px;margin:8px 0 16px;color:#231F20">${code}</p>
<p style="color:#6B6B73;font-size:13px;margin:0">The code expires in 10 minutes. If you didn’t request it, you can ignore this email. Never share this code with anyone, including sellers.</p>
</div><p style="text-align:center;color:#9A9AA3;font-size:11px;margin:14px 0 0">© ${new Date().getFullYear()} AutoGuide. All rights reserved. Developed by MonolythCode.</p></div></body></html>`;
    await this.send(to, subject, text, html);
  }

  /** Security notice to the account's (old) address after a sensitive change. */
  async sendNotice(to: string, title: string, message: string) {
    const text = `${message}\n\nIf this wasn’t you, reset your password in the app straight away and contact support@monolythcode.com.\n\nAutoGuide\n© ${new Date().getFullYear()} AutoGuide. All rights reserved. Developed by MonolythCode.`;
    const html = `<!doctype html><html><body style="margin:0;background:#F4F4F6;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111114">
<div style="max-width:480px;margin:0 auto;padding:24px">
<div style="background:linear-gradient(135deg,#161314,#231F20);color:#fff;padding:16px 20px;border-radius:14px 14px 0 0;border-bottom:3px solid #E5120B;font-weight:900;font-size:18px">Auto<span style="color:#FF5A50">Guide</span></div>
<div style="background:#fff;padding:24px;border-radius:0 0 14px 14px"><h2 style="margin:0 0 10px;font-size:18px">${title}</h2>
<p style="margin:0 0 12px">${message}</p>
<p style="color:#6B6B73;font-size:13px;margin:0">If this wasn’t you, reset your password in the app straight away and contact support@monolythcode.com.</p>
</div><p style="text-align:center;color:#9A9AA3;font-size:11px;margin:14px 0 0">© ${new Date().getFullYear()} AutoGuide. All rights reserved. Developed by MonolythCode.</p></div></body></html>`;
    await this.send(to, `AutoGuide: ${title}`, text, html).catch(() => {});
  }

  /** Everyday notification (appointments, service requests). */
  async sendInfo(to: string, title: string, message: string) {
    const e = (v: string) => v.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
    const text = `${message}\n\nAutoGuide\n© ${new Date().getFullYear()} AutoGuide. All rights reserved. Developed by MonolythCode.`;
    const html = `<!doctype html><html><body style="margin:0;background:#F4F4F6;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111114">
<div style="max-width:480px;margin:0 auto;padding:24px">
<div style="background:linear-gradient(135deg,#161314,#231F20);color:#fff;padding:16px 20px;border-radius:14px 14px 0 0;border-bottom:3px solid #E5120B;font-weight:900;font-size:18px">Auto<span style="color:#FF5A50">Guide</span></div>
<div style="background:#fff;padding:24px;border-radius:0 0 14px 14px"><h2 style="margin:0 0 10px;font-size:18px">${e(title)}</h2>
<p style="margin:0">${e(message)}</p>
</div><p style="text-align:center;color:#9A9AA3;font-size:11px;margin:14px 0 0">© ${new Date().getFullYear()} AutoGuide. All rights reserved. Developed by MonolythCode.</p></div></body></html>`;
    await this.send(to, `AutoGuide: ${title}`, text, html).catch(() => {});
  }
}
