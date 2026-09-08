const { PrismaClient } = require('@prisma/client');
const { generateAIResponse, streamAIResponse, searchDocuments, getAvailableModels, providers, getProviderForModel } = require('../services/ai.service');
const { searchWeb } = require('../services/search.service');
const { rewriteQuery } = require('../services/query.service');
const { rerankResults } = require('../services/rerank.service');
const { selectModel } = require('../services/model-router.service');
const { detectFollowUp, buildContextualSearchQuery, shouldReSearch } = require('../services/memory.service');
const { deepResearch } = require('../services/deep-research.service');
const logger = require('../config/logger');
const prisma = new PrismaClient();

async function getDocumentContent(docIds, userId) {
  if (!docIds || docIds.length === 0) return [];
  const docs = await prisma.document.findMany({
    where: { id: { in: docIds }, userId },
    select: { id: true, title: true, content: true }
  });
  return docs.map(d => ({
    documentTitle: d.title,
    documentId: d.id,
    content: (d.content || '').substring(0, 8000)
  }));
}

function validateModelChoice(requestedModelId) {
  if (!requestedModelId || requestedModelId === 'auto') return null;
  return getAvailableModels().some(model => model.id === requestedModelId) ? requestedModelId : null;
}

async function sendMessage(req, res) {
  try {
    const { conversationId } = req.params;
    const { content, model: requestedModel, documentIds } = req.body;
    const model = validateModelChoice(requestedModel);
    const userId = req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 20 } }
    });

    if (!conversation) return res.status(404).json({ error: 'گفتگو یافت نشد' });

    await prisma.message.create({
      data: { conversationId, role: 'user', content, model: model || 'auto' }
    });

    const contextMessages = conversation.messages.slice(0, 20).reverse();
    const context = contextMessages.map(m => ({ role: m.role, content: m.content }));

    let sources = await searchDocuments(content, userId);
    const docSources = await getDocumentContent(documentIds, userId);
    sources = [...docSources, ...sources];

    let webResults = [];
    try {
      webResults = await searchWeb(content, 5);
    } catch (e) {
      logger.error('Web search failed:', e.message);
    }

    const aiResponse = await generateAIResponse(content, context, sources, model, userId, new Set(), webResults);

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

    const msgCount = await prisma.message.count({ where: { conversationId } });
    if (msgCount <= 2 && conversation.title.includes('جدید')) {
      const title = content.length > 60 ? content.substring(0, 60).trim() + '...' : content.trim();
      await prisma.conversation.update({ where: { id: conversationId }, data: { title } }).catch(() => {});
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
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({ error: isDev ? error.message : 'خطای داخلی سرور' });
  }
}

async function streamMessage(req, res) {
  try {
    const { conversationId } = req.params;
    const { content, model: requestedModel, documentIds, searchActive, deepResearchMode } = req.body;
    const userId = req.user.id;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 20 } }
    });

    if (!conversation) {
      res.write('data: ' + JSON.stringify({ type: 'error', error: 'گفتگو یافت نشد' }) + '\n\n');
      return res.end();
    }

    await prisma.message.create({
      data: { conversationId, role: 'user', content, model: model || 'auto' }
    });

    const contextMessages = conversation.messages.slice(0, 20).reverse();
    const context = contextMessages.map(m => ({ role: m.role, content: m.content }));

    const queryInfo = await rewriteQuery(content, context);
    const model = validateModelChoice(requestedModel);
    const modelRoute = selectModel(queryInfo, model);
    const selectedModel = modelRoute.modelId;

    const followUpInfo = detectFollowUp(contextMessages);
    let searchQuery = queryInfo.searchQuery;
    if (followUpInfo.isFollowUp) {
      searchQuery = buildContextualSearchQuery(queryInfo.searchQuery, context, followUpInfo.topic);
      logger.info(`[Memory] Follow-up detected, topic="${followUpInfo.topic}" enhancedQuery="${searchQuery.substring(0, 80)}"`);
    }

    logger.info(`[QueryRewrite] intent=${queryInfo.intent} search="${searchQuery.substring(0, 80)}"`);
    logger.info(`[ModelRouter] selected=${selectedModel} reason=${modelRoute.reason}`);

    let sources = await searchDocuments(searchQuery, userId);
    const docSources = await getDocumentContent(documentIds, userId);
    sources = [...docSources, ...sources];

    let webResults = [];
    if (searchActive || deepResearchMode) {
      try {
        if (deepResearchMode) {
          logger.info(`[DeepResearch] Mode activated for: "${content.substring(0, 50)}"`);
          res.write('data: ' + JSON.stringify({ type: 'deepResearchStart', message: 'در حال تحقیق عمیق...' }) + '\n\n');

          const researchResult = await deepResearch(content, context, {
            maxIterations: 3,
            sourceDocs: sources,
            onProgress: (progress) => {
              res.write('data: ' + JSON.stringify({ type: 'progress', ...progress }) + '\n\n');
            }
          });
          webResults = researchResult.allSources || researchResult.sources || [];
          logger.info(`[DeepResearch] Complete: ${webResults.length} sources from ${researchResult.iterations} iterations`);
        } else {
          const shouldSearch = shouldReSearch(followUpInfo.isFollowUp, queryInfo.intent, null, content);
          if (shouldSearch) {
            webResults = await searchWeb(searchQuery, 8);
            if (webResults.length === 0 && queryInfo.expandedQuery !== queryInfo.searchQuery) {
              webResults = await searchWeb(queryInfo.expandedQuery, 8);
            }
            webResults = rerankResults(searchQuery, webResults).slice(0, 5);
          }
        }
      } catch (e) {
        logger.error('Web search failed:', e.message);
      }
    }

    if (webResults.length > 0) {
      res.write('data: ' + JSON.stringify({ type: 'webResults', results: webResults }) + '\n\n');
    }

    let fullContent = '';
    await streamAIResponse(content, context, sources, selectedModel, userId, (chunk) => {
      fullContent += chunk;
      res.write('data: ' + JSON.stringify({ type: 'chunk', content: chunk }) + '\n\n');
    }, webResults, queryInfo);

    const saved = await prisma.message.create({
      data: {
        conversationId,
        role: 'assistant',
        content: fullContent,
        sources: JSON.stringify(sources.map(d => ({ title: d.documentTitle || 'Unknown', documentId: d.documentId || null, chunkIndex: d.chunkIndex }))),
        model: model || 'auto'
      }
    });

    const msgCount = await prisma.message.count({ where: { conversationId } });
    if (msgCount <= 2 && conversation.title.includes('جدید')) {
      const title = content.length > 60 ? content.substring(0, 60).trim() + '...' : content.trim();
      await prisma.conversation.update({ where: { id: conversationId }, data: { title } }).catch(() => {});
    }
    if (model && model !== conversation.model) {
      await prisma.conversation.update({ where: { id: conversationId }, data: { model } });
    }

    res.write('data: ' + JSON.stringify({ type: 'done', message: saved, model: selectedModel || 'auto' }) + '\n\n');
    res.end();
  } catch (error) {
    logger.error('streamMessage error:', error.message);
    const isDev = process.env.NODE_ENV !== 'production';
    const safeMsg = isDev ? error.message : 'خطا در دریافت پاسخ';
    res.write('data: ' + JSON.stringify({ type: 'error', error: safeMsg }) + '\n\n');
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

module.exports = { sendMessage, streamMessage, getModels, validateModelChoice };
