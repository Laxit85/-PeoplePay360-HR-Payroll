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

// --- DASHBOARD API ---
export const getDashboardSummaryApi = async () => {
  const response = await axiosInstance.get('/dashboard/stats');
  return response.data;
};
