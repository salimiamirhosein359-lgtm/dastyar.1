const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const { generateShareToken } = require('../utils/token');
const logger = require('../config/logger');
const prisma = new PrismaClient();

async function createConversation(req, res) {
  try {
    const { title } = req.body;
    const conversation = await prisma.conversation.create({
      data: { userId: req.user.id, title: title || 'گفتجوی جدید' },
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 1 } }
    });
    res.status(201).json({ conversation });
  } catch (error) {
    logger.error('Create conversation error:', error);
    res.status(500).json({ error: 'خطایی در سرور رخ داده است' });
  }
}

async function getConversations(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const where = { userId: req.user.id };
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          messages: { select: { id: true, role: true, content: true }, orderBy: { createdAt: 'desc' }, take: 1 }
        },
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.conversation.count({ where })
    ]);
    res.json({
      conversations: conversations.map(c => ({
        id: c.id, title: c.title, summary: c.summary,
        lastMessage: c.messages[0] || null,
        messageCount: c.messages.length,
        createdAt: c.createdAt, updatedAt: c.updatedAt
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logger.error('Get conversations error:', error);
    res.status(500).json({ error: 'خطایی در سرور رخ داده است' });
  }
}

async function getConversation(req, res) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.conversationId, userId: req.user.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
    if (!conversation) return res.status(404).json({ error: 'گفتجو یافت نشد' });
    res.json({ conversation });
  } catch (error) {
    logger.error('Get conversation error:', error);
    res.status(500).json({ error: 'خطایی در سرور رخ داده است' });
  }
}

async function deleteConversation(req, res) {
  try {
    await prisma.conversation.delete({ where: { id: req.params.conversationId, userId: req.user.id } });
    res.json({ message: 'گفتجو با موفقیت حذف شد' });
  } catch (error) {
    logger.error('Delete conversation error:', error);
    res.status(500).json({ error: 'خطایی در سرور رخ داده است' });
  }
}

async function deleteAllConversations(req, res) {
  try {
    await prisma.conversation.deleteMany({ where: { userId: req.user.id } });
    res.json({ message: 'تمام گفتجوها حذف شدند' });
  } catch (error) {
    logger.error('Delete all conversations error:', error);
    res.status(500).json({ error: 'خطایی در سرور رخ داده است' });
  }
}

async function favoriteConversation(req, res) {
  try {
    const { conversationId } = req.params;
    const existing = await prisma.favorite.findUnique({
      where: { userId_conversationId: { userId: req.user.id, conversationId } }
    });
    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      res.json({ message: 'از علاقه‌مندی‌ها حذف شد' });
    } else {
      await prisma.favorite.create({ data: { userId: req.user.id, conversationId } });
      res.status(201).json({ message: 'به علاقه‌مندی‌ها اضافه شد' });
    }
  } catch (error) {
    logger.error('Favorite error:', error);
    res.status(500).json({ error: 'خطایی در سرور رخ داده است' });
  }
}

async function getFavorites(req, res) {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.id },
      include: {
        conversation: {
          select: {
            id: true, title: true, summary: true,
            messages: { select: { role: true, content: true, sources: true } },
            createdAt: true, updatedAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ favorites: favorites.map(f => f.conversation) });
  } catch (error) {
    logger.error('Get favorites error:', error);
    res.status(500).json({ error: 'خطایی در سرور رخ داده است' });
  }
}

async function shareConversation(req, res) {
  try {
    const { id } = req.params;
    const { isVisible = true, expiresInDays = 7 } = req.body;
    const conversation = await prisma.conversation.findUnique({ where: { id, userId: req.user.id } });
    if (!conversation) return res.status(404).json({ error: 'گفتجو یافت نشد' });
    const token = generateShareToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + Math.min(expiresInDays, 30));
    await prisma.share.create({ data: { conversationId: id, sharedBy: req.user.id, token, isVisible, expiresAt } });
    res.status(201).json({
      message: 'لینک اشتراک‌گذاری ساخته شد',
      shareUrl: (process.env.FRONTEND_URL || 'http://localhost:3000') + '/share/' + token,
      expiresAt
    });
  } catch (error) {
    logger.error('Share error:', error);
    res.status(500).json({ error: 'خطایی در سرور رخ داده است' });
  }
}

async function getSharedConversation(req, res) {
  try {
    const share = await prisma.share.findUnique({
      where: { token: req.params.token },
      include: {
        conversation: {
          include: {
            messages: { orderBy: { createdAt: 'asc' } },
            user: { select: { name: true } }
          }
        }
      }
    });
    if (!share || !share.isVisible) return res.status(404).json({ error: 'اشتراک‌گذاری یافت نشد یا غیرفعال شده' });
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return res.status(410).json({ error: 'لینک اشتراک‌گذاری منقضی شده است' });
    }
    res.json({ conversation: share.conversation });
  } catch (error) {
    logger.error('Get shared conversation error:', error);
    res.status(500).json({ error: 'خطایی در سرور رخ داده است' });
  }
}

async function getAllUsers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const where = req.query.role ? { role: req.query.role } : {};
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, name: true, email: true, role: true, bio: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.user.count({ where })
    ]);
    res.json({
      users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({ error: 'خطایی در سرور رخ داده است' });
  }
}

async function deleteUser(req, res) {
  try {
    const targetId = req.params.id;
    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'نمی‌توانید خودتان را حذف کنید' });
    }
    const targetUser = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true } });
    if (!targetUser) return res.status(404).json({ error: 'کاربر یافت نشد' });
    if (targetUser.role === 'ADMIN') {
      return res.status(403).json({ error: 'حذف ادمین مجاز نیست' });
    }
    await prisma.conversation.deleteMany({ where: { userId: targetId } });
    await prisma.favorite.deleteMany({ where: { userId: targetId } });
    await prisma.user.delete({ where: { id: targetId } });
    res.json({ message: 'کاربر و اطلاعاتش حذف شد' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ error: 'خطایی در سرور رخ داده است' });
  }
}

module.exports = {
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
};
