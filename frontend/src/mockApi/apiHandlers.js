// Mock API Business Logic Engine & Handlers for HRMS OXP — Indian Employee & Department Dataset

import { db } from './db';

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export async function mockLogin(email, password) {
  await delay();
  const data = db.get();
  const user = data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    throw new Error('Invalid email or password');
  }
  const employee = data.employees.find((e) => e.id === user.employeeId);
  return {
    token: `jwt-mock-token-${user.id}-${Date.now()}`,
    user: {
      ...user,
      employeeName: employee?.name || user.name,
      avatarUrl: employee?.avatarUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    },
  };
}

// ---------------- DEPARTMENTS MANAGEMENT ----------------
export async function getMockDepartments() {
  await delay();
  const data = db.get();
  const depts = data.departments || [];
  return depts.map((d) => {
    const headcount = data.employees.filter(
      (e) => e.department.toLowerCase() === d.name.toLowerCase()
    ).length;
    return {
      ...d,
      headcount,
    };
  });
}

export async function saveMockDepartment(deptData) {
  await delay();
  const data = db.get();
  if (!data.departments) data.departments = [];

  if (deptData.id) {
    const idx = data.departments.findIndex((d) => d.id === deptData.id);
    if (idx !== -1) {
      data.departments[idx] = { ...data.departments[idx], ...deptData };
    }
  } else {
    const newDept = {
      id: `dept-${Date.now()}`,
      status: 'Active',
      company: 'OXP Global India Pvt Ltd',
      ...deptData,
    };
    data.departments.push(newDept);
  }
  db.save(data);
  return true;
}

export async function deleteMockDepartment(id) {
  await delay();
  const data = db.get();
  if (data.departments) {
    data.departments = data.departments.filter((d) => d.id !== id);
    db.save(data);
  }
  return true;
}

// ---------------- USER MANAGEMENT ----------------
export async function getMockUsers() {
  await delay();
  return db.get().users;
}

export async function createMockUser(userPayload) {
  await delay();
  const data = db.get();
  const newUser = {
    id: `u-${Date.now()}`,
    ...userPayload,
  };
  data.users.push(newUser);
  db.save(data);
  return newUser;
}

// ---------------- EMPLOYEES & CONTRACTS ----------------
export async function getMockEmployees(query = '') {
  await delay();
  const data = db.get();
  let list = data.employees.map((emp) => {
    const contracts = data.contracts.filter((c) => c.employeeId === emp.id);
    const attendance = data.attendance.filter((a) => a.employeeId === emp.id);
    const timeoff = data.timeOffRequests.filter((t) => t.employeeId === emp.id);
    const allocations = data.allocations.filter((al) => al.employeeId === emp.id);
    return {
      ...emp,
      counts: {
        contracts: contracts.length,
        attendance: attendance.length,
        timeoff: timeoff.length,
        allocations: allocations.length,
      },
    };
  });

  if (query) {
    const q = query.toLowerCase();
    list = list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.jobTitle.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q) ||
        e.workEmail.toLowerCase().includes(q)
    );
  }
  return list;
}

export async function getMockEmployeeById(id) {
  await delay();
  const data = db.get();
  const emp = data.employees.find((e) => e.id === id);
  if (!emp) throw new Error('Employee not found');
  const contracts = data.contracts.filter((c) => c.employeeId === id);
  const attendance = data.attendance.filter((a) => a.employeeId === id);
  const timeoff = data.timeOffRequests.filter((t) => t.employeeId === id);
  const allocations = data.allocations.filter((al) => al.employeeId === id);

  return {
    ...emp,
    contracts,
    attendance,
    timeoff,
    allocations,
    counts: {
      contracts: contracts.length,
      attendance: attendance.length,
      timeoff: timeoff.length,
      allocations: allocations.length,
    },
  };
}

export async function createMockEmployee(empData) {
  await delay();
  const data = db.get();
  const newEmp = {
    id: `emp-${Date.now()}`,
    ...empData,
    avatarUrl: empData.avatarUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80',
    privateInfo: empData.privateInfo || {},
    hrSettings: empData.hrSettings || { scheduleId: 'sched-1' },
  };
  data.employees.push(newEmp);
  db.save(data);
  return newEmp;
}

export async function updateMockEmployee(id, empData) {
  await delay();
  const data = db.get();
  const index = data.employees.findIndex((e) => e.id === id);
  if (index === -1) throw new Error('Employee not found');
  data.employees[index] = { ...data.employees[index], ...empData };
  db.save(data);
  return data.employees[index];
}

// ---------------- CONTRACTS ----------------
export async function getMockContracts(employeeId = null) {
  await delay();
  const data = db.get();
  let list = data.contracts.map((c) => {
    const emp = data.employees.find((e) => e.id === c.employeeId);
    return { ...c, employeeName: emp?.name || 'Unknown' };
  });
  if (employeeId) {
    list = list.filter((c) => c.employeeId === employeeId);
  }
  return list;
}

export async function saveMockContract(contractData) {
  await delay();
  const data = db.get();

  if (contractData.status === 'Running') {
    const existingRunning = data.contracts.find(
      (c) =>
        c.employeeId === contractData.employeeId &&
        c.status === 'Running' &&
        c.id !== contractData.id
    );
    if (existingRunning) {
      throw new Error(
        `Employee already has an active Running contract (${existingRunning.jobPosition}). Only one Running contract is permitted per employee at any given time.`
      );
    }
  }

  if (contractData.id) {
    const idx = data.contracts.findIndex((c) => c.id === contractData.id);
    if (idx !== -1) {
      data.contracts[idx] = { ...data.contracts[idx], ...contractData };
    }
  } else {
    const newContract = {
      id: `cnt-${Date.now()}`,
      ...contractData,
    };
    data.contracts.push(newContract);
  }
  db.save(data);
  return true;
}

// ---------------- WORKING SCHEDULES ----------------
export async function getMockSchedules() {
  await delay();
  return db.get().schedules;
}

export async function saveMockSchedule(schedData) {
  await delay();
  const data = db.get();
  if (schedData.id) {
    const idx = data.schedules.findIndex((s) => s.id === schedData.id);
    if (idx !== -1) data.schedules[idx] = { ...data.schedules[idx], ...schedData };
  } else {
    data.schedules.push({ id: `sched-${Date.now()}`, ...schedData });
  }
  db.save(data);
  return true;
}

// ---------------- ATTENDANCE ----------------
export async function getMockAttendance(employeeId = null) {
  await delay();
  const data = db.get();
  let list = data.attendance.map((a) => {
    const emp = data.employees.find((e) => e.id === a.employeeId);
    return { ...a, employeeName: emp?.name || 'Unknown' };
  });
  if (employeeId) {
    list = list.filter((a) => a.employeeId === employeeId);
  }
  return list.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function toggleCheckInOut(employeeId) {
  await delay();
  const data = db.get();
  const todayStr = new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  let session = data.attendance.find(
    (a) => a.employeeId === employeeId && a.date === todayStr && !a.checkOut
  );

  if (session) {
    session.checkOut = nowIso;
    const checkInTime = new Date(session.checkIn).getTime();
    const checkOutTime = new Date(nowIso).getTime();
    const diffHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
    session.workedHours = Number(diffHours.toFixed(2));
    if (session.workedHours > 9.0) {
      session.status = 'Overtime';
    } else {
      session.status = 'Present';
    }
  } else {
    const hour = new Date().getHours();
    const status = hour >= 10 ? 'Late' : 'Present';
    session = {
      id: `att-${Date.now()}`,
      employeeId,
      date: todayStr,
      checkIn: nowIso,
      checkOut: null,
      workedHours: 0,
      status,
    };
    data.attendance.unshift(session);
  }

  db.save(data);
  return session;
}

export async function correctMockAttendance(attData) {
  await delay();
  const data = db.get();
  const idx = data.attendance.findIndex((a) => a.id === attData.id);
  if (idx !== -1) {
    data.attendance[idx] = { ...data.attendance[idx], ...attData };
    db.save(data);
  }
  return true;
}

// ---------------- TIME OFF ----------------
export async function getTimeOffTypes() {
  await delay();
  return db.get().timeOffTypes;
}

export async function getTimeOffAllocations(employeeId = null) {
  await delay();
  const data = db.get();
  let list = data.allocations.map((al) => {
    const emp = data.employees.find((e) => e.id === al.employeeId);
    const type = data.timeOffTypes.find((t) => t.id === al.timeOffTypeId);
    return {
      ...al,
      employeeName: emp?.name || 'Unknown',
      typeName: type?.name || 'Unknown',
      typeCode: type?.code || '',
    };
  });
  if (employeeId) list = list.filter((al) => al.employeeId === employeeId);
  return list;
}

export async function getTimeOffRequests(employeeId = null) {
  await delay();
  const data = db.get();
  let list = data.timeOffRequests.map((tr) => {
    const emp = data.employees.find((e) => e.id === tr.employeeId);
    const type = data.timeOffTypes.find((t) => t.id === tr.timeOffTypeId);
    return {
      ...tr,
      employeeName: emp?.name || 'Unknown',
      typeName: type?.name || 'Unknown',
      typeCode: type?.code || '',
      requiresAllocation: type?.requiresAllocation ?? true,
    };
  });
  if (employeeId) list = list.filter((tr) => tr.employeeId === employeeId);
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function createTimeOffRequest(reqData) {
  await delay();
  const data = db.get();
  const type = data.timeOffTypes.find((t) => t.id === reqData.timeOffTypeId);

  if (type?.requiresAllocation) {
    const alloc = data.allocations.find(
      (al) => al.employeeId === reqData.employeeId && al.timeOffTypeId === reqData.timeOffTypeId
    );
    if (!alloc || alloc.remaining < reqData.numberOfDays) {
      throw new Error(
        `Insufficient balance for ${type.name}. Remaining balance: ${alloc ? alloc.remaining : 0} days, requested: ${reqData.numberOfDays} days.`
      );
    }
  }

  const newReq = {
    id: `tor-${Date.now()}`,
    ...reqData,
    status: 'To Approve',
    createdAt: new Date().toISOString(),
  };
  data.timeOffRequests.unshift(newReq);
  db.save(data);
  return newReq;
}

export async function updateTimeOffStatus(id, newStatus) {
  await delay();
  const data = db.get();
  const req = data.timeOffRequests.find((r) => r.id === id);
  if (!req) throw new Error('Request not found');

  if (req.status === 'To Approve' && newStatus === 'Approved') {
    const type = data.timeOffTypes.find((t) => t.id === req.timeOffTypeId);
    if (type?.requiresAllocation) {
      const alloc = data.allocations.find(
        (al) => al.employeeId === req.employeeId && al.timeOffTypeId === req.timeOffTypeId
      );
      if (alloc) {
        alloc.taken += req.numberOfDays;
        alloc.remaining = Math.max(0, alloc.allocated - alloc.taken);
      }
    }
  }

  req.status = newStatus;
  db.save(data);
  return req;
}

// ---------------- PAYROLL — STRUCTURES & RULES ----------------
export async function getSalaryStructures() {
  await delay();
  const data = db.get();
  return data.salaryStructures.map((s) => {
    const rules = data.salaryRules.filter((r) => s.ruleIds.includes(r.id));
    return { ...s, rules };
  });
}

export async function getSalaryRules() {
  await delay();
  const data = db.get();
  return data.salaryRules.sort((a, b) => a.sequence - b.sequence);
}

export async function saveSalaryRule(ruleData) {
  await delay();
  const data = db.get();
  if (ruleData.id) {
    const idx = data.salaryRules.findIndex((r) => r.id === ruleData.id);
    if (idx !== -1) data.salaryRules[idx] = { ...data.salaryRules[idx], ...ruleData };
  } else {
    data.salaryRules.push({ id: `rule-${Date.now()}`, ...ruleData });
  }
  db.save(data);
  return true;
}

// ---------------- PAYRUN WIZARD & PAYROLL PROCESSING ----------------
export async function fetchEligibleEmployeesForPayrun(periodStart, periodEnd) {
  await delay();
  const data = db.get();

  const eligible = [];
  data.employees.forEach((emp) => {
    const activeContract = data.contracts.find((c) => {
      if (c.employeeId !== emp.id || c.status !== 'Running') return false;
      const cStart = new Date(c.startDate);
      const cEnd = new Date(c.endDate);
      const pStart = new Date(periodStart);
      const pEnd = new Date(periodEnd);
      return cStart <= pEnd && cEnd >= pStart;
    });

    if (activeContract) {
      const sched = data.schedules.find((s) => s.id === activeContract.workingScheduleId);
      eligible.push({
        employeeId: emp.id,
        employeeName: emp.name,
        jobPosition: activeContract.jobPosition,
        department: emp.department,
        contractId: activeContract.id,
        wage: activeContract.wage,
        startDate: activeContract.startDate,
        workingHours: sched ? `${sched.hoursPerWeek}h/wk` : '40h/wk',
        hasBankDetails: Boolean(emp.bankName && emp.accountNumber),
      });
    }
  });

  return eligible;
}

export async function createPayrun(payload) {
  await delay();
  const data = db.get();
  const { periodStart, periodEnd, salaryStructureId, selectedEmployeeIds } = payload;

  const newPayrun = {
    id: `pr-${Date.now()}`,
    name: `Pay Run — ${new Date(periodStart).toLocaleString('en-US', { month: 'long', year: 'numeric' })}`,
    periodStart,
    periodEnd,
    salaryStructureId,
    status: 'Draft',
    totalGross: 0,
    totalNet: 0,
    payslipCount: selectedEmployeeIds.length,
    selectedEmployeeIds,
    createdAt: new Date().toISOString(),
  };

  data.payruns.unshift(newPayrun);
  db.save(data);
  return newPayrun;
}

export async function getPayruns() {
  await delay();
  return db.get().payruns;
}

export async function getPayrunById(id) {
  await delay();
  const data = db.get();
  const pr = data.payruns.find((p) => p.id === id);
  if (!pr) throw new Error('Payrun not found');
  const payslips = data.payslips.filter((ps) => ps.payrunId === id);
  return { ...pr, payslips };
}

// ---------------- SALARY COMPUTATION ENGINE ----------------
export async function computePayrun(payrunId) {
  await delay(300);
  const data = db.get();
  const pr = data.payruns.find((p) => p.id === payrunId);
  if (!pr) throw new Error('Payrun not found');

  const struct = data.salaryStructures.find((s) => s.id === pr.salaryStructureId) || data.salaryStructures[0];
  const rules = data.salaryRules.filter((r) => struct.ruleIds.includes(r.id)).sort((a, b) => a.sequence - b.sequence);

  const newPayslips = [];
  let aggregateGross = 0;
  let aggregateNet = 0;

  const targetEmpIds = pr.selectedEmployeeIds || data.employees.map((e) => e.id);

  targetEmpIds.forEach((empId) => {
    const emp = data.employees.find((e) => e.id === empId);
    if (!emp) return;

    const contract = data.contracts.find(
      (c) => c.employeeId === empId && c.status === 'Running'
    );

    const warnings = [];
    if (!emp.bankName || !emp.accountNumber) {
      warnings.push('Missing bank account information');
    }

    const duplicate = data.payslips.find(
      (ps) => ps.employeeId === empId && ps.periodStart === pr.periodStart && ps.payrunId !== pr.id
    );
    if (duplicate) {
      warnings.push('Duplicate payslip detected for the same period');
    }

    const wage = contract ? contract.wage : 5000;
    let basic = 0;
    let allowances = 0;
    let deductions = 0;
    const ruleLineItems = [];

    rules.forEach((rule) => {
      let amount = 0;
      if (rule.computationMethod === 'Fixed Amount') {
        amount = rule.fixedAmount;
      } else if (rule.computationMethod === 'Percentage') {
        let base = wage;
        if (rule.percentageBase === 'Basic') base = basic || wage * 0.6;
        if (rule.percentageBase === 'Gross') base = basic + allowances;
        amount = (base * rule.amountPercentage) / 100;
      } else if (rule.computationMethod === 'Formula') {
        amount = 0;
      }

      amount = Number(amount.toFixed(2));

      if (rule.category === 'Basic') basic += amount;
      else if (rule.category === 'Allowance') allowances += amount;
      else if (rule.category === 'Deduction') deductions += amount;

      ruleLineItems.push({
        code: rule.code,
        name: rule.name,
        category: rule.category,
        amount,
      });
    });

    const gross = Number((basic + allowances).toFixed(2));
    const net = Number((gross - deductions).toFixed(2));

    aggregateGross += gross;
    aggregateNet += net;

    const payslip = {
      id: `ps-${pr.id}-${emp.id}`,
      payrunId: pr.id,
      employeeId: emp.id,
      employeeName: emp.name,
      jobPosition: emp.jobTitle,
      department: emp.department,
      contractId: contract?.id || 'none',
      periodStart: pr.periodStart,
      periodEnd: pr.periodEnd,
      workedDays: 22,
      basic,
      allowances,
      deductions,
      gross,
      net,
      status: 'Computed',
      ruleLineItems,
      warnings,
    };

    newPayslips.push(payslip);
  });

  data.payslips = data.payslips.filter((ps) => ps.payrunId !== payrunId).concat(newPayslips);

  pr.status = 'Computed';
  pr.totalGross = Number(aggregateGross.toFixed(2));
  pr.totalNet = Number(aggregateNet.toFixed(2));
  pr.payslipCount = newPayslips.length;

  db.save(data);
  return { payrun: pr, payslips: newPayslips };
}

export async function validatePayrun(payrunId) {
  await delay(200);
  const data = db.get();
  const pr = data.payruns.find((p) => p.id === payrunId);
  if (!pr) throw new Error('Payrun not found');

  pr.status = 'Validated';
  data.payslips.filter((ps) => ps.payrunId === payrunId).forEach((ps) => (ps.status = 'Validated'));

  db.save(data);
  return pr;
}

export async function markPayrunPaid(payrunId) {
  await delay(200);
  const data = db.get();
  const pr = data.payruns.find((p) => p.id === payrunId);
  if (!pr) throw new Error('Payrun not found');

  pr.status = 'Paid';
  data.payslips.filter((ps) => ps.payrunId === payrunId).forEach((ps) => (ps.status = 'Paid'));

  db.save(data);
  return pr;
}

export async function getPayslipById(id) {
  await delay();
  const data = db.get();
  const ps = data.payslips.find((p) => p.id === id);
  if (!ps) throw new Error('Payslip not found');
  const emp = data.employees.find((e) => e.id === ps.employeeId);
  return { ...ps, employee: emp };
}

// ---------------- DASHBOARD AGGREGATOR ----------------
export async function getDashboardData(filters = {}) {
  await delay();
  const data = db.get();
  const { department, employeeType } = filters;

  let employees = data.employees;
  if (department && department !== 'All') {
    employees = employees.filter((e) => e.department === department);
  }
  if (employeeType && employeeType !== 'All') {
    employees = employees.filter((e) => e.employeeType === employeeType);
  }

  const empIds = new Set(employees.map((e) => e.id));
  const payslips = data.payslips.filter((ps) => empIds.has(ps.employeeId));
  const timeoff = data.timeOffRequests.filter((t) => empIds.has(t.employeeId));
  const attendance = data.attendance.filter((a) => empIds.has(a.employeeId));

  const totalNetPaid = payslips.reduce((sum, p) => sum + p.net, 0);
  const avgSalary = employees.length ? totalNetPaid / employees.length : 0;
  const approvedTimeOffDays = timeoff
    .filter((t) => t.status === 'Approved')
    .reduce((sum, t) => sum + t.numberOfDays, 0);

  const presentCount = attendance.filter((a) => a.status === 'Present' || a.status === 'Overtime').length;
  const attHealth = attendance.length ? Math.round((presentCount / attendance.length) * 100) : 95;

  const alerts = [];
  const missingBank = employees.filter((e) => !e.bankName || !e.accountNumber);
  if (missingBank.length) {
    alerts.push({ id: 'alt-1', type: 'warning', text: `${missingBank.length} employees missing bank account details.` });
  }

  const unvalidated = data.payruns.filter((p) => p.status === 'Draft' || p.status === 'Computed');
  if (unvalidated.length) {
    alerts.push({ id: 'alt-2', type: 'attention', text: `${unvalidated.length} pay runs still not validated.` });
  }

  alerts.push({ id: 'alt-3', type: 'danger', text: '1 duplicate payslip warning detected in September batch.' });

  const deptCostMap = {};
  payslips.forEach((ps) => {
    const dept = ps.department || 'Other';
    deptCostMap[dept] = (deptCostMap[dept] || 0) + ps.gross;
  });
  const deptCostChart = Object.keys(deptCostMap).map((dept) => ({
    department: dept,
    grossCost: deptCostMap[dept],
  }));
  if (!deptCostChart.length) {
    deptCostChart.push(
      { department: 'Executive', grossCost: 15000 },
      { department: 'Engineering', grossCost: 17600 },
      { department: 'Human Resources', grossCost: 16300 },
      { department: 'Finance & Payroll', grossCost: 16700 }
    );
  }

  const trendChart = [
    { month: 'May', netPaid: 48200 },
    { month: 'Jun', netPaid: 49500 },
    { month: 'Jul', netPaid: 51200 },
    { month: 'Aug', netPaid: 52140 },
    { month: 'Sep', netPaid: 53800 },
  ];

  const statusSplitChart = [
    { name: 'Paid', value: payslips.filter((p) => p.status === 'Paid').length || 7, color: '#C5A059' },
    { name: 'Validated', value: payslips.filter((p) => p.status === 'Validated').length || 2, color: '#38BDF8' },
    { name: 'Computed', value: payslips.filter((p) => p.status === 'Computed').length || 3, color: '#94A3B8' },
    { name: 'Warning', value: missingBank.length || 1, color: '#BE123C' },
  ];

  return {
    kpis: {
      totalNetPaid,
      payslipsGenerated: payslips.length || 8,
      avgSalary,
      approvedTimeOffDays,
      attHealth,
    },
    alerts,
    deptCostChart,
    trendChart,
    statusSplitChart,
  };
}
