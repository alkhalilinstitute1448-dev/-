const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const studentRoutes = require('./routes/students');
const batchRoutes = require('./routes/batches');
const examRoutes = require('./routes/exams');
const attendanceRoutes = require('./routes/attendance');
const curriculumRoutes = require('./routes/curriculum');
const gradeRoutes = require('./routes/grades');
const adminRoutes = require('./routes/admin');
const stageRoutes = require('./routes/stages');
const bookDeliveryRoutes = require('./routes/bookdelivery');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/curriculum', curriculumRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stages', stageRoutes);
app.use('/api/bookdelivery', bookDeliveryRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  const { migrate } = require('./models/db');
  await migrate();
  app.listen(PORT, () => {
    console.log(`Al-Khalil Academy API running on http://localhost:${PORT}`);
  });
}

start();
