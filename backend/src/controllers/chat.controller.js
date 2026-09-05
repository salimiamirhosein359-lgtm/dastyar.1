const { PrismaClient } = require('@prisma/client');
const { generateAIResponse, streamAIResponse, searchDocuments, getAvailableModels, saveChatHistory, loadChatHistory, providers, getProviderForModel } = require('../services/ai.service');
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
      try {
        const titleModels = ['qwen3-8b', 'gpt-oss-20b', 'allam-7b'];
        const titleModel = titleModels.find(m => getProviderForModel(m)) || model || 'qwen3-8b';
        const titleResult = await (getProviderForModel(titleModel) || providers.groq).generate(titleModel, [
          { role: 'system', content: 'یک عنوان کوتاه ۳ تا ۵ کلمه‌ای برای این مکالمه بنویس. فقط عنوان را بنویس و هیچ توضیح اضافه نده. عنوان باید فارسی باشد.' },
          { role: 'user', content: content }
        ]);
        const title = titleResult.content.replace(/["'«»]/g, '').trim().substring(0, 80);
        await prisma.conversation.update({ where: { id: conversationId }, data: { title } });
      } catch {
        const title = content.length > 50 ? content.substring(0, 50) + '...' : content;
        await prisma.conversation.update({ where: { id: conversationId }, data: { title } });
      }
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
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 50 } }
    });

    if (!conversation) {
      res.write('data: ' + JSON.stringify({ type: 'error', error: 'گفتگو یافت نشد' }) + '\n\n');
      return res.end();
    }

    await prisma.message.create({
      data: { conversationId, role: 'user', content, model: model || 'auto' }
    });

    const contextMessages = conversation.messages.reverse().slice(0, 20);
    const context = contextMessages.map(m => ({ role: m.role, content: m.content }));
    const sources = await searchDocuments(content, userId);

    let fullContent = '';
    await streamAIResponse(content, context, sources, model, userId, (chunk) => {
      fullContent += chunk;
      res.write('data: ' + JSON.stringify({ type: 'chunk', content: chunk }) + '\n\n');
    });

    const saved = await prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: fullContent,
        sources: JSON.stringify(sources.map(d => ({ title: d.documentTitle || 'Unknown', documentId: d.documentId || null, chunkIndex: d.chunkIndex }))),
        model: model || 'auto'
      }
    });

    const allMessages = await prisma.message.findMany({ where: { conversationId }, orderBy: { createdAt: 'asc' } });
    try { saveChatHistory(userId, conversationId, allMessages); } catch {}

    const msgCount = await prisma.message.count({ where: { conversationId } });
    if (msgCount <= 2 && conversation.title === 'گفتگوی جدید') {
      try {
        const titleModels = ['qwen3-8b', 'gpt-oss-20b', 'allam-7b'];
        const titleModel = titleModels.find(m => getProviderForModel(m)) || model || 'qwen3-8b';
        const titleResult = await (getProviderForModel(titleModel) || providers.groq).generate(titleModel, [
          { role: 'system', content: 'یک عنوان کوتاه ۳ تا ۵ کلمه‌ای برای این مکالمه بنویس. فقط عنوان را بنویس و هیچ توضیح اضافه نده. عنوان باید فارسی باشد.' },
          { role: 'user', content: content }
        ]);
        const title = titleResult.content.replace(/["'«»]/g, '').trim().substring(0, 80);
        await prisma.conversation.update({ where: { id: conversationId }, data: { title } });
      } catch {
        const title = content.length > 50 ? content.substring(0, 50) + '...' : content;
        await prisma.conversation.update({ where: { id: conversationId }, data: { title } });
      }
    }
    if (model && model !== conversation.model) {
      await prisma.conversation.update({ where: { id: conversationId }, data: { model } });
    }

    res.write('data: ' + JSON.stringify({ type: 'done', message: saved, model: model || 'auto' }) + '\n\n');
    res.end();
  } catch (error) {
    logger.error('streamMessage error:', error.message);
    res.write('data: ' + JSON.stringify({ type: 'error', error: error.message || 'خطا در دریافت پاسخ' }) + '\n\n');
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
