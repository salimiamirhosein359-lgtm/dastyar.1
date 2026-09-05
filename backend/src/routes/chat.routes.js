const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { sendMessage, streamMessage, getModels } = require('../controllers/chat.controller');

router.get('/chat/models', authMiddleware, getModels);
router.post('/chat/send/:conversationId', authMiddleware, sendMessage);
router.post('/chat/stream/:conversationId', authMiddleware, streamMessage);

module.exports = router;