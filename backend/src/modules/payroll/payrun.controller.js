// src/modules/payroll/payrun.controller.js
// Owner: Person 4
// Two-step wizard: step 1 (create) does NOT write payslips to DB, step 2
// (compute) does, inside a transaction, and never crashes the whole batch
// if one employee fails.

const pool = require('../../config/db');
const payrollEngine = require('./payrollEngine.service');
const contractResolver = require('../employee/contractResolver.service');
const attendanceService = require('../attendance/attendance.service');
const leaveBalanceService = require('../timeoff/leaveBalance.service');

// Step 1: create a draft payrun (no payslips yet)
async function create(req, res, next) {
  try {
    const { periodStart, periodEnd } = req.body;
    const [result] = await pool.query(
      `INSERT INTO payruns (period_start, period_end, status) VALUES (:periodStart, :periodEnd, 'draft')`,
      { periodStart, periodEnd }
    );
    res.status(201).json({ id: result.insertId, status: 'draft' });
  } catch (err) {
    next(err);
  }
}

// Step 2: compute payslips for every active employee, one failure doesn't stop the batch
async function compute(req, res, next) {
  try {
    const payrunId = req.params.id;
    const [payrunRows] = await pool.query('SELECT * FROM payruns WHERE id = :id', { id: payrunId });
    const payrun = payrunRows[0];
    if (!payrun) return res.status(404).json({ error: 'Payrun not found' });

    const [employees] = await pool.query("SELECT id FROM employees WHERE status = 'active'");

    const results = [];
    for (const employee of employees) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        const contract = await contractResolver.resolveContractForPeriod(
          employee.id, payrun.period_start, payrun.period_end
        );
        const worked = await attendanceService.getWorkedDays(employee.id, payrun.period_start, payrun.period_end);
        const leave = await leaveBalanceService.getApprovedLeave(employee.id, payrun.period_start, payrun.period_end);

        const salary = await payrollEngine.computeSalary({
          wage: contract.wage,
          salaryStructureId: contract.salary_structure_id,
          workedDays: worked.workedDays,
          totalHours: worked.totalHours,
          unpaidDays: leave.unpaidDays,
          paidDays: leave.paidDays,
        });

        await connection.query(
          `INSERT INTO payslips (payrun_id, employee_id, contract_id, gross_pay, net_pay, computation_json, status)
           VALUES (:payrunId, :employeeId, :contractId, :grossPay, :netPay, :computationJson, 'computed')`,
          {
            payrunId,
            employeeId: employee.id,
            contractId: contract.id,
            grossPay: salary.grossPay,
            netPay: salary.netPay,
            computationJson: JSON.stringify(salary.breakdown),
          }
        );

        await connection.commit();
        results.push({ employeeId: employee.id, status: 'computed' });
      } catch (err) {
        await connection.rollback();
        // Don't crash the batch — record the failure and move to the next employee
        await pool.query(
          `INSERT INTO payslips (payrun_id, employee_id, contract_id, status, error_message)
           VALUES (:payrunId, :employeeId, NULL, 'failed', :errorMessage)`,
          { payrunId, employeeId: employee.id, errorMessage: err.message }
        );
        results.push({ employeeId: employee.id, status: 'failed', error: err.message });
      } finally {
        connection.release();
      }
    }

    await pool.query("UPDATE payruns SET status = 'computed' WHERE id = :id", { id: payrunId });
    res.json({ payrunId, results });
  } catch (err) {
    next(err);
  }
}

// Blocked if there are unresolved (failed) payslips
async function validate(req, res, next) {
  try {
    const payrunId = req.params.id;
    const [failed] = await pool.query(
      "SELECT * FROM payslips WHERE payrun_id = :payrunId AND status = 'failed'",
      { payrunId }
    );
    if (failed.length > 0) {
      return res.status(400).json({ error: 'Payrun has unresolved failed payslips', failed });
    }
    await pool.query("UPDATE payruns SET status = 'validated' WHERE id = :id", { id: payrunId });
    res.json({ validated: true });
  } catch (err) {
    next(err);
  }
}

async function markPaid(req, res, next) {
  try {
    await pool.query("UPDATE payruns SET status = 'paid' WHERE id = :id", { id: req.params.id });
    res.json({ paid: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, compute, validate, markPaid };
