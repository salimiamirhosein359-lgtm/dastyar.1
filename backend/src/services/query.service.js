const { providers, getProviderForModel } = require('./ai.service');
const logger = require('../config/logger');

async function rewriteQuery(originalQuery, conversationContext = []) {
  try {
    const provider = getProviderForModel('qwen3-8b') || providers.groq;
    if (!provider || !provider.isAvailable()) return { searchQuery: originalQuery, intent: 'general', keywords: [] };

    const contextSnippet = conversationContext.length > 0
      ? conversationContext.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')
      : '';

    const prompt = `You are a search query optimizer for a Persian research assistant.
Analyze the user query and return a JSON object with these fields:
- "searchQuery": An optimized English+Persian search query for web search (remove conversational filler, extract key terms, add synonyms)
- "intent": One of: "factual", "comparison", "definition", "explanation", "research", "code", "math", "creative"
- "keywords": Array of 3-5 important keywords from the query
- "isFollowUp": true if this is a follow-up question that depends on previous context
- "expandedQuery": An expanded version with related search terms

RULES:
- Always output valid JSON only, no markdown
- If the query is in Persian, translate key terms to English too for better web search
- Remove words like "بگو", "توضیح بده", "لطفاً", "می‌خوام" etc.
- Keep the core information seeking part

${contextSnippet ? `Conversation context:\n${contextSnippet}` : ''}

User query: "${originalQuery}"`;

    const result = await provider.generate('qwen3-8b', [
      { role: 'system', content: prompt },
      { role: 'user', content: originalQuery }
    ]);

    const text = result.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(text);

    logger.info(`[QueryUnderstanding] original="${originalQuery}" → search="${parsed.searchQuery}" intent=${parsed.intent}`);
    return {
      searchQuery: parsed.searchQuery || originalQuery,
      intent: parsed.intent || 'general',
      keywords: parsed.keywords || [],
      isFollowUp: parsed.isFollowUp || false,
      expandedQuery: parsed.expandedQuery || originalQuery,
      originalQuery
    };
  } catch (error) {
    logger.error('Query rewrite failed:', error.message);
    return { searchQuery: originalQuery, intent: 'general', keywords: [], isFollowUp: false, expandedQuery: originalQuery, originalQuery };
  }
}

module.exports = { rewriteQuery };
