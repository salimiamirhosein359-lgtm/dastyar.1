const { PrismaClient } = require('@prisma/client');
const { generateAIResponse, searchDocuments, getAvailableModels, saveChatHistory, loadChatHistory } = require('../services/ai.service');
const logger = require('../config/logger');
const prisma = new PrismaClient();

async function sendMessage(req, res) {
  try {
    const { conversationId } = req.params;
    const { content, model } = req.body;
    const userId = req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 50 } }
    });

    if (!conversation) return res.status(404).json({ error: 'گفتگو یافت نشد' });

    await prisma.message.create({
      data: { conversationId, role: 'user', content, model: model || 'auto' }
    });

    const contextMessages = conversation.messages.reverse().slice(0, 20);
    const context = contextMessages.map(m => ({ role: m.role, content: m.content }));

    const sources = await searchDocuments(content, userId);

    const aiResponse = await generateAIResponse(content, context, sources, model, userId);

    const saved = await prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: aiResponse.content,
        sources: JSON.stringify(aiResponse.sources || []),
        inputTokens: aiResponse.tokens?.input || null,
        outputTokens: aiResponse.tokens?.output || null,
        model: aiResponse.model || model
      }
    });

    // Save to user folder
    const allMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' }
    });
    try { saveChatHistory(userId, conversationId, allMessages); } catch {}

    // Update conversation title if first message
    const msgCount = await prisma.message.count({ where: { conversationId } });
    if (msgCount <= 2 && conversation.title === 'گفتگوی جدید') {
      const title = content.length > 50 ? content.substring(0, 50) + '...' : content;
      await prisma.conversation.update({ where: { id: conversationId }, data: { title } });
    }

    if (model && model !== conversation.model) {
      await prisma.conversation.update({ where: { id: conversationId }, data: { model } });
    }

    res.json({
      message: saved,
      sources: aiResponse.sources || [],
      tokens: aiResponse.tokens || null,
      model: aiResponse.model || model,
      provider: aiResponse.provider || null
    });
  } catch (error) {
    logger.error('sendMessage error:', error.message);
    res.status(500).json({ error: error.message || 'خطای داخلی سرور' });
  }
}

async function streamMessage(req, res) {
  try {
    const { conversationId } = req.params;
    const { content, model } = req.body;
    const userId = req.user.id;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 50 } }
    });

    if (!conversation) {
      res.write('data: {"error":"گفتگو یافت نشد"}\n\n');
      return res.end();
    }

    await prisma.message.create({
      data: { conversationId, role: 'user', content, model: model || 'auto' }
    });

    const contextMessages = conversation.messages.reverse().slice(0, 20);
    const context = contextMessages.map(m => ({ role: m.role, content: m.content }));

    const sources = await searchDocuments(content, userId);
    const aiResponse = await generateAIResponse(content, context, sources, model, userId);

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: aiResponse.content,
        sources: JSON.stringify(aiResponse.sources || []),
        inputTokens: aiResponse.tokens?.input || null,
        outputTokens: aiResponse.tokens?.output || null,
        model: aiResponse.model || model
      }
    });

    const allMessages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' }
    });
    try { saveChatHistory(userId, conversationId, allMessages); } catch {}

    res.write('data: ' + JSON.stringify({
      type: 'complete',
      message: assistantMessage,
      sources: aiResponse.sources || [],
      tokens: aiResponse.tokens || null,
      model: aiResponse.model || model,
      provider: aiResponse.provider || null
    }) + '\n\n');

    res.end('data: [DONE]\n\n');
  } catch (error) {
    logger.error('streamMessage error:', error.message);
    res.write('data: {"error":"خطا در دریافت پاسخ"}\n\n');
    res.end();
  }
}

async function getModels(req, res) {
  try {
    const models = getAvailableModels();
    res.json({ models });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch models' });
  }
}

module.exports = { sendMessage, streamMessage, getModels };
