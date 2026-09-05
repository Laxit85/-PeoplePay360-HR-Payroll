require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testDBConnection } = require('./config/db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'PeoplePay360 Backend API (XAMPP MySQL) is operational',
    database: process.env.DB_NAME || 'peoplepay360',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`[Server] PeoplePay360 Backend running on port ${PORT}`);
  await testDBConnection();
});

module.exports = app;
