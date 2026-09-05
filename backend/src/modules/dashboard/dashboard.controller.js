// src/modules/dashboard/dashboard.controller.js
// Owner: Everyone

const dashboardService = require('./dashboard.service');

async function headcount(req, res, next) {
  try {
    const rows = await dashboardService.headcountKpis(req.query);
    res.json({ headcount: rows });
  } catch (err) {
    next(err);
  }
}

async function attendanceExceptions(req, res, next) {
  try {
    const { periodStart, periodEnd, ...filters } = req.query;
    const rows = await dashboardService.attendanceExceptionsChart({ periodStart, periodEnd, ...filters });
    res.json({ exceptions: rows });
  } catch (err) {
    next(err);
  }
}

async function payrollCost(req, res, next) {
  try {
    const { periodStart, periodEnd } = req.query;
    const rows = await dashboardService.payrollCostChart({ periodStart, periodEnd });
    res.json({ payrollCost: rows });
  } catch (err) {
    next(err);
  }
}

async function leaveUsage(req, res, next) {
  try {
    const { periodStart, periodEnd, ...filters } = req.query;
    const rows = await dashboardService.leaveUsageChart({ periodStart, periodEnd, ...filters });
    res.json({ leaveUsage: rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { headcount, attendanceExceptions, payrollCost, leaveUsage };
