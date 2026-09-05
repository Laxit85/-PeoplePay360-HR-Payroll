// server.js
require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`PeoplePay360 API listening on http://localhost:${PORT}`);
});
