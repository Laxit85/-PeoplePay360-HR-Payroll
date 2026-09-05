// src/modules/payroll/payrollEngine.service.js
// Owner: Person 4
// ⭐ Core engine. Built and unit-testable with fake input before the real
// contractResolver/attendanceService/leaveBalanceService exist (see Day 1 note
// in the team-division doc).

const pool = require('../../db/pool');

/**
 * Runs a salary structure's ordered rules against a computation context.
 * Each rule's `formula` is a small JS expression string evaluated with the
 * context variables in scope, e.g. "wage * 0.4" or "wage - (wage * 0.12)".
 *
 * NOTE: `new Function` is used here for scaffold simplicity. Before shipping
 * to production, replace with a sandboxed expression evaluator (e.g. mathjs
 * `evaluate`) so arbitrary code can't be injected via the formula field.
 */
function evaluateFormula(formula, context) {
  const keys = Object.keys(context);
  const values = Object.values(context);
  // eslint-disable-next-line no-new-func
  const fn = new Function(...keys, `return (${formula});`);
  return fn(...values);
}

async function getStructureRules(structureId) {
  const [rows] = await pool.query(
    `SELECT sr.*, ssr.sequence AS structure_sequence
     FROM salary_structure_rules ssr
     JOIN salary_rules sr ON sr.id = ssr.salary_rule_id
     WHERE ssr.salary_structure_id = :structureId
     ORDER BY ssr.sequence`,
    { structureId }
  );
  return rows;
}

/**
 * computeSalary({ wage, salaryStructureId, workedDays, totalHours, unpaidDays, paidDays })
 * → { grossPay, netPay, breakdown: [{ code, label, amount }] }
 */
async function computeSalary(context) {
  const { salaryStructureId } = context;
  const rules = await getStructureRules(salaryStructureId);

  const breakdown = [];
  let runningContext = { ...context, gross: 0, net: 0 };

  for (const rule of rules) {
    const amount = evaluateFormula(rule.formula, runningContext);
    breakdown.push({ code: rule.code, label: rule.label, amount });
    runningContext = {
      ...runningContext,
      [rule.code.toLowerCase()]: amount,
      gross: runningContext.gross + (amount > 0 ? amount : 0),
      net: runningContext.net + amount,
    };
  }

  return {
    grossPay: runningContext.gross,
    netPay: runningContext.net,
    breakdown,
  };
}

module.exports = { computeSalary, evaluateFormula, getStructureRules };
