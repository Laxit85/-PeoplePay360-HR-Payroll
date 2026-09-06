const cron = require('node-cron');
const { pool } = require('../config/db');
const { generatePayslipPDF } = require('./pdfService');
const { sendPayslipEmail } = require('./emailService');

/**
 * Checks if a given date is the final day of its month
 */
function isLastDayOfMonth(date = new Date()) {
  const nextDay = new Date(date.getTime());
  nextDay.setDate(nextDay.getDate() + 1);
  return nextDay.getDate() === 1;
}

/**
 * Runs the monthly payroll email delivery job.
 * Iterates through all eligible payslips in the specified or current month's validated/paid payrun,
 * constructs the itemized breakdown (Basic Salary + Allowances + Deductions),
 * generates the PDF payslip, and emails each employee.
 *
 * @param {Object} options
 * @param {number} [options.payrunId] - Optional specific payrun ID
 * @param {boolean} [options.force=false] - If true, re-sends even if already marked SENT
 */
async function runMonthlyPayrollEmailJob(options = {}) {
  const { payrunId, force = false } = options;
  console.log(`[Payroll Scheduler] Starting monthly email distribution (Force: ${force}, PayrunId: ${payrunId || 'auto'})...`);

  let targetPayrun = null;

  if (payrunId) {
    const [[p]] = await pool.execute('SELECT * FROM payruns WHERE id = ?', [payrunId]);
    targetPayrun = p;
  } else {
    // Find the most recent VALIDATED or PAID payrun covering the current period or recent month
    const [rows] = await pool.execute(`
      SELECT * FROM payruns 
      WHERE status IN ('VALIDATED', 'PAID')
      ORDER BY period_end DESC, id DESC 
      LIMIT 1
    `);
    if (rows.length > 0) {
      targetPayrun = rows[0];
    }
  }

  if (!targetPayrun) {
    console.log('[Payroll Scheduler] No validated or paid payrun found for distribution.');
    return {
      success: false,
      message: 'No validated or paid payrun found to distribute payslips from.',
      total: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      results: []
    };
  }

  console.log(`[Payroll Scheduler] Processing Payrun #${targetPayrun.id}: "${targetPayrun.name}" (${targetPayrun.period_start} to ${targetPayrun.period_end})`);

  // Fetch all payslips for this payrun with full employee master data
  const [payslips] = await pool.execute(
    `SELECT 
       ps.*, 
       e.employee_code, 
       e.first_name, 
       e.last_name, 
       e.email,
       e.bank_name,
       e.bank_account_no,
       d.name AS department_name,
       jp.title AS job_position_title,
       c.wage AS contract_wage,
       c.reference_name AS contract_reference
     FROM payslips ps
     JOIN employees e ON ps.employee_id = e.id
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN job_positions jp ON e.job_position_id = jp.id
     LEFT JOIN contracts c ON ps.contract_id = c.id
     WHERE ps.payrun_id = ?`,
    [targetPayrun.id]
  );

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const deliveryResults = [];

  for (const slip of payslips) {
    // Check email presence
    if (!slip.email || !slip.email.trim()) {
      failed++;
      deliveryResults.push({
        employee_code: slip.employee_code,
        employee_name: `${slip.first_name} ${slip.last_name}`,
        email: null,
        status: 'FAILED',
        reason: 'Employee has no email address in database'
      });
      continue;
    }

    // Check if already sent and not forcing re-send
    if (!force && slip.delivery_status === 'SENT') {
      skipped++;
      deliveryResults.push({
        employee_code: slip.employee_code,
        employee_name: `${slip.first_name} ${slip.last_name}`,
        email: slip.email,
        status: 'SKIPPED',
        reason: 'Already sent previously'
      });
      continue;
    }

    try {
      // Query itemized lines
      const [lines] = await pool.execute(
        'SELECT * FROM payslip_lines WHERE payslip_id = ? ORDER BY sequence ASC',
        [slip.id]
      );

      // Separate lines into Basic Salary, Allowances, and Deductions
      const basicLines = lines.filter(l => l.category === 'BASIC');
      const allowanceLines = lines.filter(l => l.category === 'ALLOWANCE');
      const deductionLines = lines.filter(l => l.category === 'DEDUCTION');

      const basicSalary = basicLines.reduce((acc, l) => acc + Number(l.amount || 0), 0);
      const totalAllowances = allowanceLines.reduce((acc, l) => acc + Number(l.amount || 0), 0);
      const totalDeductions = deductionLines.reduce((acc, l) => acc + Number(l.amount || 0), 0);

      // Generate the official PDF payslip attachment
      const pdfBuffer = await generatePayslipPDF(slip, lines, slip, { wage: slip.contract_wage }, targetPayrun);

      // Dispatch email with itemized payload
      const emailResult = await sendPayslipEmail({
        employeeEmail: slip.email.trim(),
        employeeName: `${slip.first_name} ${slip.last_name}`,
        employeeCode: slip.employee_code,
        departmentName: slip.department_name,
        jobTitle: slip.job_position_title,
        periodName: targetPayrun.name,
        periodStart: slip.period_start,
        periodEnd: slip.period_end,
        basicSalary,
        basicLines,
        allowanceLines,
        totalAllowances,
        grossSalary: Number(slip.gross_salary || (basicSalary + totalAllowances)),
        deductionLines,
        totalDeductions: Number(slip.total_deductions || totalDeductions),
        netSalary: Number(slip.net_salary),
        bankName: slip.bank_name,
        bankAccount: slip.bank_account_no,
        pdfBuffer
      });

      if (emailResult.success) {
        sent++;
        await pool.execute(
          'UPDATE payslips SET delivery_status = "SENT", sent_at = NOW() WHERE id = ?',
          [slip.id]
        );
        deliveryResults.push({
          employee_code: slip.employee_code,
          employee_name: `${slip.first_name} ${slip.last_name}`,
          email: slip.email,
          status: 'SENT',
          messageId: emailResult.messageId,
          previewUrl: emailResult.previewUrl
        });
      } else {
        failed++;
        await pool.execute(
          'UPDATE payslips SET delivery_status = "FAILED" WHERE id = ?',
          [slip.id]
        );
        deliveryResults.push({
          employee_code: slip.employee_code,
          employee_name: `${slip.first_name} ${slip.last_name}`,
          email: slip.email,
          status: 'FAILED',
          error: emailResult.error
        });
      }
    } catch (err) {
      console.error(`[Payroll Scheduler] Error processing payslip for ${slip.employee_code}:`, err.message);
      failed++;
      deliveryResults.push({
        employee_code: slip.employee_code,
        employee_name: `${slip.first_name} ${slip.last_name}`,
        email: slip.email,
        status: 'FAILED',
        error: err.message
      });
    }
  }

  console.log(`[Payroll Scheduler] Distribution finished: ${sent} sent, ${failed} failed, ${skipped} skipped.`);

  return {
    success: true,
    payrunId: targetPayrun.id,
    payrunName: targetPayrun.name,
    total: payslips.length,
    sent,
    failed,
    skipped,
    results: deliveryResults
  };
}

/**
 * Initializes the background node-cron scheduler for end-of-month automatic payroll distribution.
 */
function initPayrollScheduler() {
  // Default: runs at 23:59 on days 28-31 of every month, checking if today is the month's last day.
  // Can also be overridden in .env with e.g. PAYROLL_CRON_SCHEDULE="0 20 28-31 * *" or "*/10 * * * *" for testing.
  const cronExpression = process.env.PAYROLL_CRON_SCHEDULE || '59 23 28-31 * *';

  console.log(`[Scheduler] Initializing End-of-Month Payroll Cron with expression: "${cronExpression}"`);

  cron.schedule(cronExpression, async () => {
    const today = new Date();
    // If running default 28-31 wildcard, ensure it only triggers on the exact last day of the month
    if (!process.env.PAYROLL_CRON_SCHEDULE && !isLastDayOfMonth(today)) {
      return;
    }

    console.log(`[Scheduler] 🔔 End-of-Month Payroll Trigger activated on ${today.toISOString().split('T')[0]}`);
    try {
      await runMonthlyPayrollEmailJob({ force: false });
    } catch (err) {
      console.error('[Scheduler] Scheduled monthly payroll email job encountered an error:', err);
    }
  });
}

module.exports = {
  initPayrollScheduler,
  runMonthlyPayrollEmailJob,
  isLastDayOfMonth
};
