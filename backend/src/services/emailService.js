const nodemailer = require('nodemailer');

async function getTransporter() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Fallback to auto-created test account for hackathon demonstration
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
}

async function sendPayslipEmail(employeeEmail, employeeName, periodName, pdfBuffer) {
  try {
    const transporter = await getTransporter();

    const mailOptions = {
      from: '"PeoplePay360 Payroll Ops" <payroll@peoplepay360.internal>',
      to: employeeEmail,
      subject: `Official Payslip Statement - ${periodName}`,
      text: `Hello ${employeeName},\n\nYour payslip for ${periodName} has been processed and is attached as a PDF.\n\nThank you,\nPayroll Operations Team`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #0369a1;">PeoplePay360 Payroll Notification</h2>
          <p>Dear <strong>${employeeName}</strong>,</p>
          <p>Your official salary payslip for <strong>${periodName}</strong> is ready and attached to this email.</p>
          <div style="background-color: #f1f5f9; padding: 12px; border-radius: 6px; margin: 16px 0;">
            <p style="margin: 0; font-size: 13px; color: #475569;">
              Please review the attached PDF for itemized earnings, allowances, and statutory deductions.
            </p>
          </div>
          <p style="font-size: 12px; color: #94a3b8;">This is an automated notification from PeoplePay360.</p>
        </div>
      `,
      attachments: [
        {
          filename: `Payslip_${periodName.replace(/\s+/g, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || null
    };
  } catch (error) {
    console.error(`[Email Service Error] Failed to send to ${employeeEmail}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  sendPayslipEmail
};
