// src/app.js
require('dotenv').config();
const express = require('express');
const routes = require('./routes/index');
const errorHandler = require('./middleware/errorHandler.middleware');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api', routes);

// Must be mounted last
app.use(errorHandler);

module.exports = app;
