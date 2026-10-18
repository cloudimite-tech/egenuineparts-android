// Quick SMTP check — uses the same settings as the backend's MailService.
// Usage (from the backend folder):  node --env-file=.env scripts/test-smtp.js you@example.com
const nodemailer = require('nodemailer');

const to = process.argv[2];
const { SMTP_HOST, SMTP_PORT = '465', SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
if (!to) { console.error('Usage: node --env-file=.env scripts/test-smtp.js you@example.com'); process.exit(1); }
const missing = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'].filter((k) => !process.env[k]);
if (missing.length) { console.error('Missing in .env:', missing.join(', ')); process.exit(1); }

const port = Number(SMTP_PORT);
const transporter = nodemailer.createTransport({
  host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS },
});
const from = MAIL_FROM || `AutoGuide <${SMTP_USER}>`;

(async () => {
  console.log(`Connecting to ${SMTP_HOST}:${port} as ${SMTP_USER} ...`);
  try {
    await transporter.verify();
    console.log('✓ Login OK');
    const info = await transporter.sendMail({
      from, to, subject: 'AutoGuide SMTP test',
      text: 'If you can read this, AutoGuide email sending works.',
    });
    console.log(`✓ Sent from "${from}" to ${to} (id ${info.messageId})`);
    console.log('Check the inbox (and Spam).');
  } catch (e) {
    console.error('✗ Failed:', e.message);
    if (/535|auth/i.test(e.message)) console.error('  → Wrong username/app password, wrong region host (smtp.zoho.com vs .in/.eu), or SMTP access is off for this Zoho account/plan.');
    if (/553|554|relay|sender/i.test(e.message)) console.error('  → MAIL_FROM must use the same address as SMTP_USER (or an alias set up on it in Zoho).');
    if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(e.message)) console.error('  → Cannot reach the server — check SMTP_HOST/SMTP_PORT, or your network blocks port 465 (try SMTP_PORT=587).');
    process.exit(1);
  }
})();
