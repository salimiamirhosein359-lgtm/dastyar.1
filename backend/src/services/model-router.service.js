const logger = require('../config/logger');

const MODEL_ROUTES = {
  query_rewrite: { preferred: 'qwen3-8b', fallback: 'gpt-oss-20b', maxTokens: 256 },
  simple_qa: { preferred: 'qwen3-8b', fallback: 'gpt-oss-20b', maxTokens: 1024 },
  complex_qa: { preferred: 'gpt-oss-120b', fallback: 'qwen3-8b', maxTokens: 2048 },
  research: { preferred: 'gpt-oss-120b', fallback: 'gpt-oss-20b', maxTokens: 4096 },
  code: { preferred: 'qwen3-8b', fallback: 'gpt-oss-20b', maxTokens: 2048 },
  math: { preferred: 'gpt-oss-120b', fallback: 'qwen3-8b', maxTokens: 2048 },
  creative: { preferred: 'gpt-oss-120b', fallback: 'qwen3-8b', maxTokens: 2048 },
  translation: { preferred: 'qwen3-8b', fallback: 'gpt-oss-20b', maxTokens: 2048 },
  summary: { preferred: 'qwen3-8b', fallback: 'gpt-oss-20b', maxTokens: 1024 },
  general: { preferred: 'qwen3-8b', fallback: 'gpt-oss-20b', maxTokens: 2048 }
};

function selectModel(queryInfo, userSelectedModel = null) {
  if (userSelectedModel) {
    const route = MODEL_ROUTES[queryInfo?.intent] || MODEL_ROUTES.general;
    return {
      modelId: userSelectedModel,
      maxTokens: route.maxTokens,
      reason: 'user_selected'
    };
  }

  const intent = queryInfo?.intent || 'general';
  const route = MODEL_ROUTES[intent] || MODEL_ROUTES.general;

  return {
    modelId: route.preferred,
    fallbackModelId: route.fallback,
    maxTokens: route.maxTokens,
    reason: `intent_${intent}`
  };
}

function getComplexityScore(query) {
  let score = 0;
  if (query.length > 200) score += 2;
  else if (query.length > 100) score += 1;
  const complexKeywords = ['تحلیل', 'مقایسه', 'ارزیابی', 'بررسی جامع', ' research', 'analyze', 'compare', 'evaluate', 'پیچیده', 'پیشرفته'];
  for (const kw of complexKeywords) {
    if (query.toLowerCase().includes(kw)) score += 1;
  }
  if (query.split('?').length > 2 || query.split('؟').length > 2) score += 1;
  return score;
}

function selectModelByComplexity(query, userSelectedModel = null) {
  if (userSelectedModel) return { modelId: userSelectedModel, reason: 'user_selected' };

  const complexity = getComplexityScore(query);
  if (complexity >= 3) return { modelId: 'gpt-oss-120b', reason: 'high_complexity' };
  if (complexity >= 1) return { modelId: 'gpt-oss-20b', reason: 'medium_complexity' };
  return { modelId: 'qwen3-8b', reason: 'low_complexity' };
}

module.exports = { selectModel, selectModelByComplexity, MODEL_ROUTES };
