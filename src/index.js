const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '12mb' }));

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const taskRequestRoutes = require('./routes/taskRequests');
const notificationRoutes = require('./routes/notifications');
const lessonRoutes = require('./routes/lessons');
const attendanceRoutes = require('./routes/attendance');
const captionRoutes = require('./routes/captions');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');
const archiveRoutes = require('./routes/archive');
const assistantRoutes = require('./routes/assistant');
const registrationRoutes = require('./routes/registrations');
const teamItemRoutes = require('./routes/teamItems');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/task-requests', taskRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/captions', captionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/team-items', teamItemRoutes);

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
