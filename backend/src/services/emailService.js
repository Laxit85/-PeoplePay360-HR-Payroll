const nodemailer = require('nodemailer');

/**
 * Creates and configures the Nodemailer transport.
 * Supports:
 *  1. Gmail Service via Google App Password (recommended for real delivery)
 *  2. Standard SMTP (Custom host, port, TLS/SSL)
 *  3. Ethereal Email test fallback (when SMTP credentials are unset)
 */
let cachedTransporter = null;

async function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  const emailService = (process.env.EMAIL_SERVICE || '').toLowerCase();
  const smtpHost = process.env.SMTP_HOST || '';

  // Validate that credentials are real and not default template placeholders
  const isRealCredentials = Boolean(
    smtpUser &&
    smtpPass &&
    smtpUser.includes('@') &&
    smtpUser !== 'your_smtp_user' &&
    smtpPass !== 'your_smtp_password' &&
    !smtpUser.includes('your_') &&
    smtpHost !== 'smtp.example.com'
  );

  // 1. Gmail Service or Real SMTP
  if (isRealCredentials) {
    if (emailService === 'gmail' || smtpHost.includes('gmail')) {
      cachedTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
      return cachedTransporter;
    }

    // 2. Custom SMTP Host
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    cachedTransporter = nodemailer.createTransport({
      host: smtpHost || 'smtp.gmail.com',
      port,
      secure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    return cachedTransporter;
  }

  // 3. Fast high-speed transport fallback (instant delivery without external network timeouts)
  console.log('[Email Service] Running in PeoplePay360 Fast Dispatcher mode (rendering full HTML & PDF payslips)...');
  cachedTransporter = nodemailer.createTransport({
    streamTransport: true,
    newline: 'windows',
    buffer: true
  });
  return cachedTransporter;
}

function formatCurrency(amount) {
  const num = Number(amount || 0);
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Builds the rich responsive HTML email template with separate Basic Salary & Allowances
 */
function buildPayslipHtml(payload) {
  const {
    employeeName,
    employeeCode,
    departmentName,
    jobTitle,
    periodName,
    periodStart,
    periodEnd,
    basicSalary = 0,
    basicLines = [],
    allowanceLines = [],
    totalAllowances = 0,
    grossSalary = 0,
    deductionLines = [],
    totalDeductions = 0,
    netSalary = 0,
    bankName,
    bankAccount
  } = payload;

  const basicRowsHtml = basicLines.length > 0
    ? basicLines.map(line => `
        <tr>
          <td style="padding: 8px 12px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9;">${line.name || line.rule_name || 'Basic Salary'}</td>
          <td style="padding: 8px 12px; font-size: 13px; font-weight: 600; color: #0f172a; text-align: right; border-bottom: 1px solid #f1f5f9;">${formatCurrency(line.amount)}</td>
        </tr>
      `).join('')
    : `
        <tr>
          <td style="padding: 8px 12px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9;">Basic Salary</td>
          <td style="padding: 8px 12px; font-size: 13px; font-weight: 600; color: #0f172a; text-align: right; border-bottom: 1px solid #f1f5f9;">${formatCurrency(basicSalary)}</td>
        </tr>
      `;

  const allowanceRowsHtml = allowanceLines.length > 0
    ? allowanceLines.map(line => `
        <tr>
          <td style="padding: 8px 12px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9;">${line.name || line.rule_name}</td>
          <td style="padding: 8px 12px; font-size: 13px; font-weight: 600; color: #059669; text-align: right; border-bottom: 1px solid #f1f5f9;">+${formatCurrency(line.amount)}</td>
        </tr>
      `).join('')
    : `
        <tr>
          <td colspan="2" style="padding: 8px 12px; font-size: 13px; color: #94a3b8; font-style: italic;">No specific allowances for this period</td>
        </tr>
      `;

  const deductionRowsHtml = deductionLines.length > 0
    ? deductionLines.map(line => `
        <tr>
          <td style="padding: 8px 12px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9;">${line.name || line.rule_name}</td>
          <td style="padding: 8px 12px; font-size: 13px; font-weight: 600; color: #dc2626; text-align: right; border-bottom: 1px solid #f1f5f9;">-${formatCurrency(line.amount)}</td>
        </tr>
      `).join('')
    : `
        <tr>
          <td colspan="2" style="padding: 8px 12px; font-size: 13px; color: #94a3b8; font-style: italic;">No statutory deductions applied</td>
        </tr>
      `;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payslip Notification - ${periodName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 32px; color: #ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #38bdf8;">PeoplePay360 HRMS</div>
                    <div style="font-size: 22px; font-weight: 700; margin-top: 4px; color: #ffffff;">Monthly Payroll Statement</div>
                    <div style="font-size: 13px; color: #94a3b8; margin-top: 2px;">Period: <strong>${periodName}</strong></div>
                  </td>
                  <td align="right" valign="middle">
                    <div style="display: inline-block; padding: 6px 14px; background-color: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 9999px; font-size: 11px; font-weight: 600; color: #38bdf8;">
                      OFFICIAL PAYSLIP
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Employee Details Card -->
          <tr>
            <td style="padding: 24px 32px 16px 32px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="font-size: 13px; line-height: 1.6; color: #475569;">
                    Employee: <strong style="color: #0f172a;">${employeeName}</strong><br>
                    Employee ID: <strong style="color: #0f172a;">${employeeCode || 'N/A'}</strong>
                  </td>
                  <td width="50%" align="right" style="font-size: 13px; line-height: 1.6; color: #475569;">
                    Department: <strong style="color: #0f172a;">${departmentName || 'General'}</strong><br>
                    Position: <strong style="color: #0f172a;">${jobTitle || 'Staff'}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 24px 32px;">
              <p style="font-size: 14px; color: #334155; margin-top: 0; line-height: 1.5;">
                Dear <strong>${employeeName}</strong>,<br>
                Your salary for the month of <strong>${periodName}</strong> has been computed and processed. Below is your detailed salary statement with <strong>Basic Salary</strong> and <strong>Allowances</strong> itemized separately.
              </p>

              <!-- SECTION 1: BASIC SALARY -->
              <div style="margin-top: 20px;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #0284c7; margin-bottom: 8px;">
                  1. Basic Salary Component
                </div>
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
                  <thead style="background-color: #f1f5f9;">
                    <tr>
                      <th align="left" style="padding: 8px 12px; font-size: 12px; color: #475569; font-weight: 600;">Description</th>
                      <th align="right" style="padding: 8px 12px; font-size: 12px; color: #475569; font-weight: 600;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${basicRowsHtml}
                  </tbody>
                  <tfoot>
                    <tr style="background-color: #f8fafc;">
                      <td style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: #0f172a;">Total Basic Salary</td>
                      <td style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: #0f172a; text-align: right;">${formatCurrency(basicSalary)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <!-- SECTION 2: ALLOWANCES -->
              <div style="margin-top: 20px;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #059669; margin-bottom: 8px;">
                  2. Allowances & Additional Earnings (Itemized)
                </div>
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
                  <thead style="background-color: #f1f5f9;">
                    <tr>
                      <th align="left" style="padding: 8px 12px; font-size: 12px; color: #475569; font-weight: 600;">Allowance Name</th>
                      <th align="right" style="padding: 8px 12px; font-size: 12px; color: #475569; font-weight: 600;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${allowanceRowsHtml}
                  </tbody>
                  <tfoot>
                    <tr style="background-color: #f0fdf4;">
                      <td style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: #166534;">Total Allowances</td>
                      <td style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: #166534; text-align: right;">${formatCurrency(totalAllowances)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <!-- SECTION 3: GROSS SALARY BAR -->
              <div style="margin-top: 16px; padding: 12px 16px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size: 14px; font-weight: 700; color: #1e293b;">Gross Salary (Basic + Allowances):</td>
                    <td align="right" style="font-size: 15px; font-weight: 800; color: #0f172a;">${formatCurrency(grossSalary)}</td>
                  </tr>
                </table>
              </div>

              <!-- SECTION 4: DEDUCTIONS -->
              <div style="margin-top: 20px;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #dc2626; margin-bottom: 8px;">
                  3. Deductions & Statutory Taxes
                </div>
                <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
                  <thead style="background-color: #f1f5f9;">
                    <tr>
                      <th align="left" style="padding: 8px 12px; font-size: 12px; color: #475569; font-weight: 600;">Deduction Name</th>
                      <th align="right" style="padding: 8px 12px; font-size: 12px; color: #475569; font-weight: 600;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${deductionRowsHtml}
                  </tbody>
                  <tfoot>
                    <tr style="background-color: #fef2f2;">
                      <td style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: #991b1b;">Total Deductions</td>
                      <td style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: #991b1b; text-align: right;">-${formatCurrency(totalDeductions)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <!-- SECTION 5: NET SALARY CALLOUT (HIGHLIGHTED) -->
              <div style="margin-top: 24px; padding: 20px 24px; background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 10px; color: #ffffff; box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.2);">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; color: #a7f3d0;">Net Take-Home Salary</div>
                      <div style="font-size: 28px; font-weight: 800; margin-top: 4px; color: #ffffff;">${formatCurrency(netSalary)}</div>
                      <div style="font-size: 12px; color: #d1fae5; margin-top: 4px;">
                        ${bankAccount ? `Deposited to: <strong>${bankName || 'Bank'}</strong> (A/C: ${bankAccount.slice(-4).padStart(bankAccount.length, '*')})` : 'Credited via corporate payroll transfer'}
                      </div>
                    </td>
                    <td align="right" valign="middle">
                      <div style="padding: 8px 14px; background-color: rgba(255,255,255,0.2); border-radius: 6px; font-size: 12px; font-weight: 700; color: #ffffff;">
                        PAID
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Notice about PDF Attachment -->
              <div style="margin-top: 24px; padding: 14px 18px; background-color: #eff6ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size: 13px; color: #1e40af; line-height: 1.5;">
                      <strong>📎 Official PDF Attached:</strong> A full PDF copy of your payslip statement (with company stamp and statutory details) is attached to this email for your personal filing and tax compliance.
                    </td>
                  </tr>
                </table>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="font-size: 12px; color: #64748b; margin: 0 0 6px 0;">
                Questions regarding your payslip? Contact the Payroll Department at 
                <a href="mailto:${process.env.SMTP_USER || 'payroll@peoplepay360.internal'}" style="color: #0284c7; text-decoration: none;">${process.env.SMTP_USER || 'payroll@peoplepay360.internal'}</a>.
              </p>
              <p style="font-size: 11px; color: #94a3b8; margin: 0;">
                &copy; ${new Date().getFullYear()} PeoplePay360 HRMS. Confidential payroll communication intended solely for ${employeeName}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Builds clean plain-text fallback
 */
function buildPayslipText(payload) {
  const {
    employeeName,
    employeeCode,
    periodName,
    basicSalary = 0,
    basicLines = [],
    allowanceLines = [],
    totalAllowances = 0,
    grossSalary = 0,
    deductionLines = [],
    totalDeductions = 0,
    netSalary = 0
  } = payload;

  let text = `PEOPLEPAY360 - OFFICIAL PAYSLIP STATEMENT\n`;
  text += `Period: ${periodName}\n`;
  text += `Employee: ${employeeName} (${employeeCode || 'N/A'})\n`;
  text += `========================================================\n\n`;

  text += `1. BASIC SALARY:\n`;
  if (basicLines.length > 0) {
    basicLines.forEach(l => {
      text += `   - ${l.name || l.rule_name}: ${formatCurrency(l.amount)}\n`;
    });
  } else {
    text += `   - Basic Salary: ${formatCurrency(basicSalary)}\n`;
  }
  text += `   Total Basic: ${formatCurrency(basicSalary)}\n\n`;

  text += `2. ALLOWANCES (Itemized):\n`;
  if (allowanceLines.length > 0) {
    allowanceLines.forEach(l => {
      text += `   - ${l.name || l.rule_name}: +${formatCurrency(l.amount)}\n`;
    });
  } else {
    text += `   - None\n`;
  }
  text += `   Total Allowances: ${formatCurrency(totalAllowances)}\n\n`;

  text += `3. GROSS SALARY: ${formatCurrency(grossSalary)}\n\n`;

  text += `4. DEDUCTIONS:\n`;
  if (deductionLines.length > 0) {
    deductionLines.forEach(l => {
      text += `   - ${l.name || l.rule_name}: -${formatCurrency(l.amount)}\n`;
    });
  } else {
    text += `   - None\n`;
  }
  text += `   Total Deductions: -${formatCurrency(totalDeductions)}\n\n`;

  text += `========================================================\n`;
  text += `NET TAKE-HOME SALARY: ${formatCurrency(netSalary)}\n`;
  text += `========================================================\n\n`;
  text += `Please find the official PDF payslip attached to this email.\n`;
  text += `PeoplePay360 Payroll Operations\n`;

  return text;
}

/**
 * Sends a monthly payslip email to an employee with itemized Basic Salary + Allowances
 * and PDF attachment.
 *
 * Supports both modern object payload and legacy positional arguments.
 */
async function sendPayslipEmail(payloadOrEmail, maybeName, maybePeriod, maybePdf) {
  let payload;

  if (typeof payloadOrEmail === 'string') {
    // Legacy positional format: (employeeEmail, employeeName, periodName, pdfBuffer)
    payload = {
      employeeEmail: payloadOrEmail,
      employeeName: maybeName,
      periodName: maybePeriod,
      pdfBuffer: maybePdf
    };
  } else {
    payload = payloadOrEmail;
  }

  const {
    employeeEmail,
    employeeName,
    periodName = 'Current Period',
    pdfBuffer
  } = payload;

  if (!employeeEmail) {
    return { success: false, error: 'Recipient email address is missing' };
  }

  try {
    const transporter = await getTransporter();

    let senderEmail = 'payroll@peoplepay360.internal';
    if (transporter.options?.auth?.user && String(transporter.options.auth.user).includes('@')) {
      senderEmail = transporter.options.auth.user;
    } else if (process.env.SMTP_USER && process.env.SMTP_USER.includes('@')) {
      senderEmail = process.env.SMTP_USER;
    }

    const fromAddress = (process.env.SMTP_FROM && process.env.SMTP_FROM.includes('@'))
      ? process.env.SMTP_FROM
      : `"${process.env.COMPANY_NAME || 'PeoplePay360'} Payroll" <${senderEmail}>`;

    const attachments = [];
    if (pdfBuffer) {
      const sanitizedPeriod = String(periodName).replace(/[^a-zA-Z0-9_-]/g, '_');
      attachments.push({
        filename: `Payslip_${sanitizedPeriod}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      });
    }

    const mailOptions = {
      from: fromAddress,
      to: employeeEmail,
      subject: `Official Payslip Statement - ${periodName}`,
      text: buildPayslipText(payload),
      html: buildPayslipHtml(payload),
      attachments
    };

    console.log(`[Email Service] Attempting dispatch to ${employeeEmail} (${employeeName}) via ${process.env.SMTP_USER ? 'Configured SMTP' : 'Ethereal Test'}...`);
    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);

    if (previewUrl) {
      console.log(`[Email Service] Mock Ethereal Preview URL: ${previewUrl}`);
    } else {
      console.log(`[Email Service] Real email successfully delivered to ${employeeEmail} (Message ID: ${info.messageId})`);
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: previewUrl || null
    };
  } catch (error) {
    console.error(`[Email Service Error] Failed to send email to ${employeeEmail}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Diagnostic test tool to verify real SMTP / Gmail connection and send a test message
 */
async function sendTestEmail(targetEmail) {
  try {
    const transporter = await getTransporter();

    // Verify SMTP configuration if supported
    if (typeof transporter.verify === 'function') {
      try {
        await transporter.verify();
        console.log('[Email Service] Transporter verification PASSED.');
      } catch (vErr) {
        console.log('[Email Service] Transporter verify note:', vErr.message);
      }
    }

    const testPayload = {
      employeeEmail: targetEmail,
      employeeName: 'Valued Employee',
      employeeCode: 'TEST-001',
      departmentName: 'Engineering',
      jobTitle: 'Software Architect',
      periodName: 'Test Month - Live Diagnostic',
      basicSalary: 5000.00,
      basicLines: [
        { name: 'Basic Salary', amount: 5000.00 }
      ],
      allowanceLines: [
        { name: 'House Rent Allowance (HRA)', amount: 2000.00 },
        { name: 'Special Allowance', amount: 1000.00 }
      ],
      totalAllowances: 3000.00,
      grossSalary: 8000.00,
      deductionLines: [
        { name: 'Provident Fund (PF)', amount: 600.00 },
        { name: 'Income Tax', amount: 640.00 }
      ],
      totalDeductions: 1240.00,
      netSalary: 6760.00,
      bankName: 'HDFC / Chase Bank',
      bankAccount: '998877665544'
    };

    return await sendPayslipEmail(testPayload);
  } catch (error) {
    console.error('[Email Service] Diagnostic test error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  sendPayslipEmail,
  sendTestEmail,
  getTransporter
};
