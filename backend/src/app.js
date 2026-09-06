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

// Serve Frontend Static Bundle if built
const path = require('path');
const fs = require('fs');
const frontendDist = path.join(__dirname, '../../frontend/dist');

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send(`
      <div style="font-family: Arial, sans-serif; padding: 40px; text-align: center; color: #1e293b;">
        <h1 style="color: #4f46e5;">PeoplePay360 Backend API</h1>
        <p style="font-size: 16px; color: #64748b;">Backend is online on port 4000 and connected to MySQL.</p>
        <div style="margin-top: 24px;">
          <a href="/api/health" style="display: inline-block; padding: 10px 20px; background: #4f46e5; color: white; border-radius: 6px; text-decoration: none; font-weight: bold; margin-right: 12px;">Health Check &rarr;</a>
          <a href="http://localhost:3000" style="display: inline-block; padding: 10px 20px; background: #0ea5e9; color: white; border-radius: 6px; text-decoration: none; font-weight: bold;">Open React Frontend (Port 3000) &rarr;</a>
        </div>
      </div>
    `);
  });
}

// Centralized Error Handler (must be mounted last)
app.use(errorHandler);

module.exports = app;
