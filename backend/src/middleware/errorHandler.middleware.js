// src/middleware/errorHandler.middleware.js
// Owner: Person 1
// Mounted last in app.js. Every controller should call next(err) on failure
// instead of building its own error response.

function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  // MySQL-specific niceties so the frontend gets useful messages
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Duplicate entry' });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ error: 'Referenced record does not exist' });
  }

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
