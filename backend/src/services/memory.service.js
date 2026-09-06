const logger = require('../config/logger');

function detectFollowUp(messages) {
  if (messages.length < 2) return { isFollowUp: false, topic: null };

  const lastUserMsg = messages.filter(m => m.role === 'user').slice(-1)[0];
  if (!lastUserMsg) return { isFollowUp: false, topic: null };

  const followUpPatterns = [
    /این (چی|چه|کجاست|کدوم)/i,
    /بیشتر (توضیح|بگو|توضیح بده)/i,
    /چرا (این|اون|اینطور|آنطور)/i,
    /چطوری|چگونه|روشش/,
    /مثال.*بده|例/i,
    /对比|مقایسه/i,
    /contained|شامل|شامل/i,
    /ink|ia|clude|اشاره.*کن/i,
    /در مورد.*بیشتر|more about/i,
    /ادامه|continue|follow/i,
    /similar|مشابه|مانند/i,
    /opposite|متضاد|خلاف/i,
    /benefit|مزیت|فواید/i,
    /drawback|عیب|معایب/i,
    /cost|هزینه|قیمت/i,
    /when|کی|چه زمان/i,
    /where|کجا|چه مکان/i,
    /who|چه کسی|چه کسانی/i,
  ];

  const isFollowUp = followUpPatterns.some(p => p.test(lastUserMsg.content));

  const topic = extractTopic(messages);

  return { isFollowUp, topic };
}

function extractTopic(messages) {
  const userMessages = messages.filter(m => m.role === 'user').slice(-3);
  if (userMessages.length === 0) return null;

  const allText = userMessages.map(m => m.content).join(' ');
  const words = allText.split(/\s+/).filter(w => w.length > 3);
  const wordFreq = {};
  for (const word of words) {
    const w = word.toLowerCase();
    wordFreq[w] = (wordFreq[w] || 0) + 1;
  }

  const sorted = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, 3).map(([word]) => word).join(' ');
}

function buildContextualSearchQuery(originalQuery, conversationContext, topic) {
  let searchQuery = originalQuery;

  if (topic && !originalQuery.includes(topic)) {
    searchQuery = `${topic} ${originalQuery}`;
  }

  const contextSnippet = conversationContext.slice(-2).map(m => m.content).join(' ');
  if (contextSnippet.length > 0) {
    const keyTerms = contextSnippet.split(/\s+/).filter(w => w.length > 4).slice(0, 5);
    for (const term of keyTerms) {
      if (!searchQuery.includes(term)) {
        searchQuery += ` ${term}`;
      }
    }
  }

  return searchQuery.substring(0, 300);
}

function shouldReSearch(isFollowUp, intent, lastSearchQuery, newQuery) {
  if (!isFollowUp) return true;

  const searchIntents = ['factual', 'research', 'comparison', 'explanation'];
  if (!searchIntents.includes(intent)) return false;

  if (lastSearchQuery) {
    const similarity = computeQuerySimilarity(lastSearchQuery, newQuery);
    if (similarity > 0.7) return false;
  }

  return true;
}

function computeQuerySimilarity(q1, q2) {
  const words1 = new Set(q1.toLowerCase().split(/\s+/));
  const words2 = new Set(q2.toLowerCase().split(/\s+/));
  const intersection = [...words1].filter(w => words2.has(w));
  const union = new Set([...words1, ...words2]);
  return intersection.length / union.size;
}

module.exports = { detectFollowUp, extractTopic, buildContextualSearchQuery, shouldReSearch };
