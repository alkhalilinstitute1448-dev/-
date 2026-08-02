const express = require('express');
const { verifyToken, requirePermission } = require('../middleware/auth');
const router = express.Router();

router.get('/', verifyToken, requirePermission('assistant.view'), (req, res) => {
  res.json({
    ready: false,
    message: 'المساعد الذكي قيد التطوير — سيتم تفعيله قريبًا',
  });
});

router.post('/chat', verifyToken, requirePermission('assistant.view'), (req, res) => {
  res.status(501).json({ error: 'المساعد الذكي غير متوفر بعد — هذه الميزة قيد التطوير' });
});

module.exports = router;
