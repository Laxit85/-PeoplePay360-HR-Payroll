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
  if (contracts.length > 0) return contracts[0];

  const [fallback] = await pool.execute(
    `SELECT c.*, ss.name AS salary_structure_name 
     FROM contracts c 
     JOIN salary_structures ss ON c.salary_structure_id = ss.id 
     WHERE c.employee_id = ? AND c.status = 'ACTIVE' 
     ORDER BY c.id DESC LIMIT 1`,
    [employeeId]
  );
  return fallback[0] || null;
}

/**
 * Computes scheduled working days, attendance worked days, and unpaid leaves
 * bounded by active contract duration and in (9am) / out (6pm) attendance logs
 */
async function computeAttendanceAndLeaves(employeeId, periodStart, periodEnd, contract = null) {
  let activeContract = contract;
  if (!activeContract) {
    activeContract = await resolveActiveContract(employeeId, periodStart, periodEnd);
  }

  const pStart = new Date(periodStart);
  const pEnd = new Date(periodEnd);

  let effectiveStart = pStart;
  if (activeContract && activeContract.start_date) {
    const cStart = new Date(activeContract.start_date);
    if (cStart > pStart) {
      effectiveStart = cStart;
    }
  }

  let effectiveEnd = pEnd;
  if (activeContract && activeContract.end_date) {
    const cEnd = new Date(activeContract.end_date);
    if (cEnd < pEnd) {
      effectiveEnd = cEnd;
    }
  }

  const effectiveStartStr = effectiveStart.toISOString().split('T')[0];
  const effectiveEndStr = effectiveEnd.toISOString().split('T')[0];

  // Scheduled work days (Mon-Fri) within effective contract period
  let scheduledWorkDays = 0;
  let curr = new Date(effectiveStart);
  while (curr <= effectiveEnd) {
    const day = curr.getDay();
    if (day !== 0 && day !== 6) scheduledWorkDays++; // Exclude Sun and Sat
    curr.setDate(curr.getDate() + 1);
  }

  // Count approved attendance check-in records and hours in effective contract period
  const [attRows] = await pool.execute(
    `SELECT 
       attendance_date, 
       check_in, 
       check_out, 
       worked_hours,
       TIMESTAMPDIFF(MINUTE, check_in, check_out) / 60.0 AS calc_hours
     FROM attendances 
     WHERE employee_id = ? AND attendance_date BETWEEN ? AND ?
       AND check_in IS NOT NULL`,
    [employeeId, effectiveStartStr, effectiveEndStr]
  );

  let totalWorkedHours = 0;
  let attendedDaysCount = 0;

  for (const att of attRows) {
    // Standard shift: 9:00 AM (09:00:00) to 6:00 PM (18:00:00) -> 8 worked hours
    const hrs = att.worked_hours != null ? parseFloat(att.worked_hours) : (parseFloat(att.calc_hours) || 8.0);
    totalWorkedHours += hrs;
    if (hrs >= 7.0) {
      attendedDaysCount += 1.0;
    } else if (hrs >= 3.5) {
      attendedDaysCount += 0.5;
    } else if (hrs > 0) {
      attendedDaysCount += Math.round((hrs / 8.0) * 10) / 10;
    }
  }

  const workedDays = attRows.length > 0 ? Math.min(attendedDaysCount, scheduledWorkDays) : scheduledWorkDays;
  const workedHours = totalWorkedHours > 0 ? Math.round(totalWorkedHours * 100) / 100 : (workedDays * 8.0);

  // Query approved UNPAID leaves in effective period
  const [[{ unpaid_leave_days }]] = await pool.execute(
    `SELECT COALESCE(SUM(tor.duration), 0) AS unpaid_leave_days 
     FROM time_off_requests tor 
     JOIN time_off_types tot ON tor.time_off_type_id = tot.id 
     WHERE tor.employee_id = ? AND tot.is_unpaid = 1 AND tor.status = 'APPROVED' 
       AND tor.date_from <= ? AND tor.date_to >= ?`,
    [employeeId, effectiveEndStr, effectiveStartStr]
  );

  const finalUnpaidDays = parseFloat(unpaid_leave_days || 0);
  const finalWorkedDays = Math.max(0, workedDays - finalUnpaidDays);
  const finalWorkedHours = Math.max(0, workedHours - (finalUnpaidDays * 8.0));

  return {
    scheduledWorkDays: scheduledWorkDays || 22,
    workedDays: finalWorkedDays,
    workedHours: finalWorkedHours,
    effectivePeriodStart: effectiveStartStr,
    effectivePeriodEnd: effectiveEndStr,
    unpaidLeaveDays: finalUnpaidDays
  };
}

/**
 * Evaluates ordered salary rules in a sequenced DAG pipeline
 * Daily Wage = Monthly Wage / Scheduled Days
 * Earned Wage = Daily Wage * Present Days (Worked Days)
 */
function evaluateSalaryRules(rules, wage, scheduledWorkDays, workedDays, unpaidLeaveDays) {
  const numWage = parseFloat(wage) || 0;
  const numScheduledDays = parseFloat(scheduledWorkDays) || 22;
  const numWorkedDays = parseFloat(workedDays) || 0;

  // Calculate salary per day = monthly wage / scheduled days in period
  const perDayWage = numScheduledDays > 0 ? (numWage / numScheduledDays) : numWage;
  // Earned salary based on days present
  const earnedWage = Math.round(perDayWage * numWorkedDays * 100) / 100;
  const prorationFactor = numScheduledDays > 0 ? (numWorkedDays / numScheduledDays) : 1.0;

  const context = {
    wage: numWage,
    perDayWage: Math.round(perDayWage * 100) / 100,
    earnedWage,
    prorationFactor,
    workedDays: numWorkedDays,
    scheduledWorkDays: numScheduledDays,
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
        const baseAmount = context.rules[baseKey] !== undefined ? context.rules[baseKey] : context.earnedWage;
        amount = (baseAmount * parseFloat(rule.percentage_rate || 0)) / 100;
        break;

      case 'FORMULA':
        if (rule.code === 'BASIC') {
          amount = context.earnedWage * 0.50; // Standard 50% of earned wage
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
    perDayWage: context.perDayWage,
    earnedWage: context.earnedWage,
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
      severity: 'WARNING',
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
      severity: 'WARNING',
      message: `Employee ${employee.employee_code} already has a validated/paid payslip for an overlapping period.`
    });
  }

  // 4. Negative Net Salary Warning
  if (netSalary < 0) {
    warnings.push({
      employee_id: empId,
      warning_type: 'NEGATIVE_NET_SALARY',
      severity: 'WARNING',
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
