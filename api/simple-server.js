// Ultra-minimal server for testing Railway deployment
const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

console.log('Starting simple server...');
console.log('PORT:', PORT);

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Simple server running', port: PORT });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Simple server listening on 0.0.0.0:${PORT}`);
});
