import axiosInstance from '../config/axios';

// --- AUTH API ---
export const loginApi = async (email, password) => {
  const response = await axiosInstance.post('/auth/login', { email, password });
  return response.data;
};

export const getMeApi = async () => {
  const response = await axiosInstance.get('/auth/me');
  return response.data;
};

// --- EMPLOYEES API ---
export const getEmployeesApi = async (params = {}) => {
  const response = await axiosInstance.get('/employees', { params });
  return response.data;
};

export const getEmployeeByIdApi = async (id) => {
  const response = await axiosInstance.get(`/employees/${id}`);
  return response.data;
};

export const createEmployeeApi = async (employeeData) => {
  const response = await axiosInstance.post('/employees', employeeData);
  return response.data;
};

export const updateEmployeeApi = async (id, employeeData) => {
  const response = await axiosInstance.put(`/employees/${id}`, employeeData);
  return response.data;
};

export const deleteEmployeeApi = async (id) => {
  const response = await axiosInstance.delete(`/employees/${id}`);
  return response.data;
};

// --- DEPARTMENTS & ORG API ---
export const getDepartmentsApi = async () => {
  const response = await axiosInstance.get('/org/departments');
  return response.data;
};

export const createDepartmentApi = async (deptData) => {
  const response = await axiosInstance.post('/org/departments', deptData);
  return response.data;
};

export const getBranchesApi = async () => {
  const response = await axiosInstance.get('/org/branches');
  return response.data;
};

export const getJobPositionsApi = async (deptId) => {
  const response = await axiosInstance.get('/org/job-positions', { params: { department_id: deptId } });
  return response.data;
};

export const getRolesApi = async () => {
  const response = await axiosInstance.get('/org/roles');
  return response.data;
};

// --- ATTENDANCE API ---
export const getAttendanceLogsApi = async (params = {}) => {
  const response = await axiosInstance.get('/attendance', { params });
  return response.data;
};

export const clockInOutApi = async (actionData) => {
  const response = await axiosInstance.post('/attendance/clock', actionData);
  return response.data;
};

export const getAttendanceStatsApi = async () => {
  const response = await axiosInstance.get('/attendance/stats');
  return response.data;
};

export const correctAttendanceApi = async (id, data) => {
  const response = await axiosInstance.put(`/attendance/${id}/correct`, data);
  return response.data;
};

// --- TIME OFF / LEAVES API ---
export const getTimeOffRequestsApi = async (params = {}) => {
  const response = await axiosInstance.get('/time-off/requests', { params });
  return response.data;
};

export const createTimeOffRequestApi = async (requestData) => {
  const response = await axiosInstance.post('/time-off/requests', requestData);
  return response.data;
};

export const updateTimeOffStatusApi = async (id, statusData) => {
  const response = await axiosInstance.put(`/time-off/requests/${id}/status`, statusData);
  return response.data;
};

export const getTimeOffTypesApi = async () => {
  const response = await axiosInstance.get('/time-off/types');
  return response.data;
};

export const getTimeOffAllocationsApi = async (params = {}) => {
  const response = await axiosInstance.get('/time-off/allocations', { params });
  return response.data;
};

// --- SCHEDULES / SHIFTS API ---
export const getSchedulesApi = async (params = {}) => {
  const response = await axiosInstance.get('/schedules', { params });
  return response.data;
};

export const createScheduleApi = async (scheduleData) => {
  const response = await axiosInstance.post('/schedules', scheduleData);
  return response.data;
};

export const getWorkShiftsApi = async () => {
  const response = await axiosInstance.get('/schedules/shifts');
  return response.data;
};

// --- PAYROLL API ---
export const getPayrunsApi = async (params = {}) => {
  const response = await axiosInstance.get('/payruns', { params });
  return response.data;
};

export const getPayrunByIdApi = async (id) => {
  const response = await axiosInstance.get(`/payruns/${id}`);
  return response.data;
};

export const createPayrunApi = async (payrunData) => {
  const response = await axiosInstance.post('/payruns', payrunData);
  return response.data;
};

export const deletePayrunApi = async (id) => {
  const response = await axiosInstance.delete(`/payruns/${id}`);
  return response.data;
};

export const processPayrunApi = async (id) => {
  const response = await axiosInstance.post(`/payruns/${id}/process`);
  return response.data;
};

export const getSalaryStructuresApi = async () => {
  const response = await axiosInstance.get('/salary-structures');
  return response.data;
};

export const createSalaryStructureApi = async (structureData) => {
  const response = await axiosInstance.post('/salary-structures', structureData);
  return response.data;
};

// --- CONTRACTS API ---
export const getContractsApi = async (params = {}) => {
  const response = await axiosInstance.get('/contracts', { params });
  return response.data;
};

export const createContractApi = async (contractData) => {
  const response = await axiosInstance.post('/contracts', contractData);
  return response.data;
};

export const updateContractApi = async (id, contractData) => {
  const response = await axiosInstance.put(`/contracts/${id}`, contractData);
  return response.data;
};

export const deleteContractApi = async (id) => {
  const response = await axiosInstance.delete(`/contracts/${id}`);
  return response.data;
};

// --- USERS API (ADMIN ONLY) ---
export const getUsersApi = async () => {
  const response = await axiosInstance.get('/users');
  return response.data;
};

export const createUserApi = async (userData) => {
  const response = await axiosInstance.post('/users', userData);
  return response.data;
};

export const updateUserApi = async (id, userData) => {
  const response = await axiosInstance.put(`/users/${id}`, userData);
  return response.data;
};

export const toggleUserStatusApi = async (id) => {
  const response = await axiosInstance.put(`/users/${id}/toggle-status`);
  return response.data;
};

// --- PAYROLL EXTENDED ACTIONS ---
export const validatePayrunApi = async (id) => {
  const response = await axiosInstance.post(`/payruns/${id}/validate`);
  return response.data;
};

export const markPayrunPaidApi = async (id) => {
  const response = await axiosInstance.post(`/payruns/${id}/mark-paid`);
  return response.data;
};

export const sendPayslipsApi = async (id) => {
  const response = await axiosInstance.post(`/payruns/${id}/send-payslips`);
  return response.data;
};

export const triggerMonthlyDistributionApi = async (payload = {}) => {
  const response = await axiosInstance.post('/payruns/distribute-monthly', payload);
  return response.data;
};

export const getEligibleEmployeesApi = async (salaryStructureId, periodStart, periodEnd) => {
  const response = await axiosInstance.get('/payruns/eligible-employees', {
    params: {
      salary_structure_id: salaryStructureId,
      period_start: periodStart,
      period_end: periodEnd
    }
  });
  return response.data;
};

export const testPayrollEmailApi = async (email) => {
  const response = await axiosInstance.post('/payruns/test-email', { email });
  return response.data;
};

export const getMyLatestPayslipApi = async () => {
  const response = await axiosInstance.get('/payruns/my-latest-payslip');
  return response.data;
};

export const getMyPayslipsApi = async () => {
  const response = await axiosInstance.get('/payruns/my-payslips');
  return response.data;
};

export const getPayslipByIdApi = async (id) => {
  const response = await axiosInstance.get(`/payruns/payslips/${id}`);
  return response.data;
};

export const downloadPayslipPdfApi = async (id, filename = 'Payslip.pdf') => {
  const response = await axiosInstance.get(`/payruns/payslips/${id}/pdf`, {
    responseType: 'blob'
  });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

export const openPayslipPdfApi = async (id) => {
  const response = await axiosInstance.get(`/payruns/payslips/${id}/pdf`, {
    responseType: 'blob'
  });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => window.URL.revokeObjectURL(url), 10000);
};

export const getPayslipPdfUrl = (id) => {
  const token = localStorage.getItem('token');
  return `/api/payruns/payslips/${id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
};

// --- DASHBOARD API ---
export const getDashboardSummaryApi = async (params = {}) => {
  const response = await axiosInstance.get('/dashboard/stats', { params });
  return response.data;
};
