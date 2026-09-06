// server.js
require('dotenv').config();
const app = require('./src/app');
const { testDBConnection } = require('./src/config/db');
const { initPayrollScheduler } = require('./src/services/payrollScheduler');

const PORT = process.env.PORT || 4000;

app.listen(PORT, async () => {
  console.log(`[Server] PeoplePay360 Backend running on http://localhost:${PORT}`);
  await testDBConnection();
  initPayrollScheduler();
});

