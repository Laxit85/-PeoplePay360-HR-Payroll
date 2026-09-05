// src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes/index');
const errorHandler = require('./middleware/errorHandler.middleware');

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoints
const healthHandler = (req, res) => res.status(200).json({
  status: 'OK',
  message: 'PeoplePay360 Backend API (XAMPP MySQL) is operational',
  database: process.env.DB_NAME || 'peoplepay360',
  timestamp: new Date().toISOString()
});

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// API Routes
app.use('/api', routes);

// Centralized Error Handler (must be mounted last)
app.use(errorHandler);

module.exports = app;
