// src/modules/payroll/payslip.controller.js
// Owner: Person 4

const pool = require('../../config/db');
const { generatePayslipPdf } = require('./pdf.service');
const { sendBulkPayslips } = require('./email.service');

async function listByPayrun(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, e.full_name, e.id AS employee_id
       FROM payslips p
       JOIN employees e ON e.id = p.employee_id
       WHERE p.payrun_id = :payrunId`,
      { payrunId: req.params.payrunId }
    );
    res.json({ payslips: rows });
  } catch (err) {
    next(err);
  }
}

async function downloadPdf(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, e.full_name, e.id AS employee_id
       FROM payslips p JOIN employees e ON e.id = p.employee_id
       WHERE p.id = :id`,
      { id: req.params.id }
    );
    const payslip = rows[0];
    if (!payslip) return res.status(404).json({ error: 'Payslip not found' });

    const pdfBuffer = await generatePayslipPdf(payslip, payslip);
    res.set('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

// Send Payslips: reports per-employee success/failure, doesn't silently fail
async function sendForPayrun(req, res, next) {
  try {
    const payrunId = req.params.payrunId;
    const [rows] = await pool.query(
      `SELECT p.*, e.full_name, u.email
       FROM payslips p
       JOIN employees e ON e.id = p.employee_id
       LEFT JOIN users u ON u.employee_id = e.id
       WHERE p.payrun_id = :payrunId AND p.status = 'computed'`,
      { payrunId }
    );

    const jobs = [];
    for (const row of rows) {
      const pdfBuffer = await generatePayslipPdf(row, row);
      jobs.push({ employeeId: row.employee_id, to: row.email, employeeName: row.full_name, pdfBuffer });
    }

    const results = await sendBulkPayslips(jobs);

    const sentIds = results.filter((r) => r.sent).map((r) => r.employeeId);
    if (sentIds.length) {
      await pool.query(
        `UPDATE payslips SET status = 'sent'
         WHERE payrun_id = :payrunId AND employee_id IN (:sentIds)`,
        { payrunId, sentIds }
      );
    }

    await pool.query("UPDATE payruns SET status = 'sent' WHERE id = :id", { id: payrunId });
    res.json({ results });
  } catch (err) {
    next(err);
  }
}

module.exports = { listByPayrun, downloadPdf, sendForPayrun };
