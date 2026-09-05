// src/modules/auth/auth.routes.js
// Owner: Person 1 — mounted at /api/auth in src/routes/index.js

const express = require('express');
const router = express.Router();
const controller = require('./auth.controller');
const authenticate = require('../../middleware/auth.middleware');

router.post('/register', controller.register);
router.post('/login', controller.login);
router.get('/me', authenticate, controller.me);

module.exports = router;
