// src/modules/payroll/email.service.js
// Owner: Person 4
// Requires: npm install nodemailer (add when you start on the real send flow,
// same reasoning as pdf.service.js — keep the base scaffold dependency-light).

async function sendPayslipEmail({ to, employeeName, pdfBuffer }) {
  const nodemailer = require('nodemailer');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject: 'Your Payslip',
    text: `Hi ${employeeName}, please find your payslip attached.`,
    attachments: [{ filename: 'payslip.pdf', content: pdfBuffer }],
  });
}

/**
 * sendBulkPayslips(payslips) — reports per-employee success/failure,
 * never silently fails, never throws for a single bad email.
 */
async function sendBulkPayslips(payslips) {
  const results = [];
  for (const p of payslips) {
    try {
      await sendPayslipEmail(p);
      results.push({ employeeId: p.employeeId, sent: true });
    } catch (err) {
      results.push({ employeeId: p.employeeId, sent: false, error: err.message });
    }
  }
  return results;
}

module.exports = { sendPayslipEmail, sendBulkPayslips };
