const { pool } = require('../config/db');

/**
 * Resolves the single valid contract for an employee during the pay period
 */
async function resolveActiveContract(employeeId, periodStart, periodEnd) {
  const [contracts] = await pool.execute(
    `SELECT c.*, ss.name AS salary_structure_name 
     FROM contracts c 
     JOIN salary_structures ss ON c.salary_structure_id = ss.id 
     WHERE c.employee_id = ? AND c.status = 'ACTIVE' 
       AND c.start_date <= ? AND (c.end_date IS NULL OR c.end_date >= ?) 
     LIMIT 1`,
    [employeeId, periodEnd, periodStart]
  );
  return contracts[0] || null;
}

/**
 * Computes scheduled working days, attendance worked days, and unpaid leaves
 */
async function computeAttendanceAndLeaves(employeeId, periodStart, periodEnd) {
  const pStart = new Date(periodStart);
  const pEnd = new Date(periodEnd);

  // Approximate default standard work days (Mon-Fri) in period
  let scheduledWorkDays = 0;
  let curr = new Date(pStart);
  while (curr <= pEnd) {
    const day = curr.getDay();
    if (day !== 0 && day !== 6) scheduledWorkDays++; // Exclude Sun and Sat
    curr.setDate(curr.getDate() + 1);
  }

  // Count approved attendance check-in records in this period
  const [[{ attended_days }]] = await pool.execute(
    `SELECT COUNT(DISTINCT attendance_date) AS attended_days 
     FROM attendances 
     WHERE employee_id = ? AND attendance_date BETWEEN ? AND ?`,
    [employeeId, periodStart, periodEnd]
  );

  const workedDays = attended_days > 0 ? Math.min(attended_days, scheduledWorkDays) : scheduledWorkDays;

  // Query approved UNPAID leaves in period
  const [[{ unpaid_leave_days }]] = await pool.execute(
    `SELECT COALESCE(SUM(tor.duration), 0) AS unpaid_leave_days 
     FROM time_off_requests tor 
     JOIN time_off_types tot ON tor.time_off_type_id = tot.id 
     WHERE tor.employee_id = ? AND tot.is_unpaid = 1 AND tor.status = 'APPROVED' 
       AND tor.date_from <= ? AND tor.date_to >= ?`,
    [employeeId, periodEnd, periodStart]
  );

  const finalUnpaidDays = parseFloat(unpaid_leave_days || 0);

  return {
    scheduledWorkDays: scheduledWorkDays || 22,
    workedDays: Math.max(0, workedDays - finalUnpaidDays),
    unpaidLeaveDays: finalUnpaidDays
  };
}

/**
 * Evaluates ordered salary rules in a sequenced DAG pipeline
 */
function evaluateSalaryRules(rules, wage, scheduledWorkDays, workedDays, unpaidLeaveDays) {
  const prorationFactor = scheduledWorkDays > 0 ? (workedDays / scheduledWorkDays) : 1.0;

  const context = {
    wage: parseFloat(wage),
    prorationFactor,
    workedDays,
    unpaidLeaveDays,
    rules: {},
    categories: {
      BASIC: 0,
      ALLOWANCE: 0,
      GROSS: 0,
      DEDUCTION: 0,
      NET: 0
    }
  };

  const sortedRules = [...rules].sort((a, b) => a.sequence - b.sequence);
  const generatedLines = [];

  for (const rule of sortedRules) {
    let amount = 0;
    const compType = rule.computation_type;

    switch (compType) {
      case 'FIXED':
        amount = parseFloat(rule.fixed_amount || 0);
        break;

      case 'PERCENTAGE':
        const baseKey = (rule.percentage_base_code || 'BASIC').toUpperCase();
        const baseAmount = context.rules[baseKey] !== undefined ? context.rules[baseKey] : context.wage;
        amount = (baseAmount * parseFloat(rule.percentage_rate || 0)) / 100;
        break;

      case 'FORMULA':
        if (rule.code === 'BASIC') {
          amount = context.wage * prorationFactor;
        } else if (rule.code === 'GROSS') {
          amount = context.categories.BASIC + context.categories.ALLOWANCE;
        } else if (rule.code === 'NET') {
          amount = context.categories.GROSS - context.categories.DEDUCTION;
        } else if (rule.formula_expression) {
          try {
            const expr = rule.formula_expression
              .replace(/GROSS/g, context.categories.GROSS)
              .replace(/DEDUCTIONS/g, context.categories.DEDUCTION)
              .replace(/BASIC/g, context.rules['BASIC'] || 0);
            amount = Function(`'use strict'; return (${expr})`)();
          } catch (e) {
            amount = 0;
          }
        }
        break;
      default:
        amount = 0;
    }

    amount = Math.round(amount * 100) / 100;

    context.rules[rule.code] = amount;
    if (context.categories[rule.category] !== undefined) {
      context.categories[rule.category] += amount;
    }

    generatedLines.push({
      salary_rule_id: rule.id,
      rule_code: rule.code,
      rule_name: rule.name,
      category: rule.category,
      sequence: rule.sequence,
      rate_or_percentage: rule.percentage_rate ? parseFloat(rule.percentage_rate) : null,
      amount
    });
  }

  const grossSalary = context.categories.GROSS || (context.rules['GROSS'] || context.categories.BASIC + context.categories.ALLOWANCE);
  const totalDeductions = context.categories.DEDUCTION || 0;
  const netSalary = context.rules['NET'] !== undefined ? context.rules['NET'] : (grossSalary - totalDeductions);

  return {
    lines: generatedLines,
    grossSalary,
    totalDeductions,
    netSalary: Math.max(0, netSalary)
  };
}

/**
 * Scans for compliance anomalies and warnings
 */
async function scanWarnings(employee, contract, netSalary, payrunId, periodStart, periodEnd) {
  const warnings = [];
  const empId = employee.employee_id || employee.emp_id || employee.id;

  // 1. Missing Bank Account
  if (!employee.bank_account_no) {
    warnings.push({
      employee_id: empId,
      warning_type: 'MISSING_BANK_ACCOUNT',
      severity: 'WARNING',
      message: `Employee ${employee.employee_code} (${employee.first_name} ${employee.last_name}) has no bank account number configured.`
    });
  }

  // 2. No Active Contract
  if (!contract) {
    warnings.push({
      employee_id: empId,
      warning_type: 'NO_ACTIVE_CONTRACT',
      severity: 'CRITICAL',
      message: `Employee ${employee.employee_code} has no active contract for the period.`
    });
  }

  // 3. Duplicate Payslip Detection
  const [existingSlips] = await pool.execute(
    `SELECT id FROM payslips 
     WHERE employee_id = ? AND payrun_id != ? 
       AND period_start <= ? AND period_end >= ? 
       AND status IN ('VALIDATED', 'PAID')`,
    [empId, payrunId, periodEnd, periodStart]
  );

  if (existingSlips.length > 0) {
    warnings.push({
      employee_id: empId,
      warning_type: 'DUPLICATE_PAYSLIP',
      severity: 'CRITICAL',
      message: `Employee ${employee.employee_code} already has a validated/paid payslip for an overlapping period.`
    });
  }

  // 4. Negative Net Salary Warning
  if (netSalary < 0) {
    warnings.push({
      employee_id: empId,
      warning_type: 'NEGATIVE_NET_SALARY',
      severity: 'CRITICAL',
      message: `Calculated net salary for ${employee.employee_code} is negative.`
    });
  }

  return warnings;
}

module.exports = {
  resolveActiveContract,
  computeAttendanceAndLeaves,
  evaluateSalaryRules,
  scanWarnings
};
