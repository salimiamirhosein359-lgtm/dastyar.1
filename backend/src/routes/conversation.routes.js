const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const {
  createConversation,
  getConversations,
  getConversation,
  deleteConversation,
  deleteAllConversations,
  favoriteConversation,
  getFavorites,
  shareConversation,
  getSharedConversation,
  getAllUsers,
  deleteUser
} = require('../controllers/conversation.controller');

router.use(authMiddleware);

router.post('/', createConversation);
router.get('/', getConversations);
router.get('/favorites', getFavorites);

router.get('/:conversationId', getConversation);
router.delete('/:conversationId', deleteConversation);
router.delete('/', deleteAllConversations);

router.put('/:conversationId/favorite', favoriteConversation);
router.post('/:id/share', shareConversation);

router.get('/share/:token', getSharedConversation);

router.get('/admin/users', roleMiddleware('ADMIN'), getAllUsers);
router.delete('/admin/users/:id', roleMiddleware('ADMIN'), deleteUser);

module.exports = router;
