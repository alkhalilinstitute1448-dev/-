const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/connection-status', async (req, res) => {
  try {
    const { query } = require('./models/db');
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
    await Promise.race([query('SELECT 1'), timeout]);
    res.json({ backend: true, database: true });
  } catch {
    res.json({ backend: true, database: false });
  }
});

const clientPath = path.join(__dirname, '..', 'website', 'dist');
app.use(express.static(clientPath));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(clientPath, 'index.html'));
});

async function start() {
  try {
    const { migrate } = require('./models/db');
    const migrateTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('migrate timeout')), 25000));
    await Promise.race([migrate(), migrateTimeout]);
  } catch (err) {
    console.error('Database migration failed (continuing anyway):', err.message);
  }
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
