require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testDBConnection } = require('./config/db');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const orgRoutes = require('./routes/orgRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const contractRoutes = require('./routes/contractRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const timeOffRoutes = require('./routes/timeOffRoutes');
const salaryStructureRoutes = require('./routes/salaryStructureRoutes');
const payrunRoutes = require('./routes/payrunRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../../frontend')));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/org', orgRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/working-schedules', scheduleRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/time-off', timeOffRoutes);
app.use('/api/salary-structures', salaryStructureRoutes);
app.use('/api/payruns', payrunRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'PeoplePay360 Backend API (XAMPP MySQL) is fully operational',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`[Server] PeoplePay360 Backend running on port ${PORT}`);
  await testDBConnection();
});

module.exports = app;
