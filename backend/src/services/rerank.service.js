const logger = require('../config/logger');

function computeTFIDFScore(query, text) {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const textLower = text.toLowerCase();
  let score = 0;
  for (const word of queryWords) {
    const regex = new RegExp(word, 'gi');
    const matches = textLower.match(regex);
    if (matches) {
      score += matches.length * (1 + Math.log(1 + matches.length));
    }
  }
  return score;
}

function computeFreshnessScore(dateStr) {
  if (!dateStr) return 0.5;
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const daysDiff = (now - date) / (1000 * 60 * 60 * 24);
    if (daysDiff < 30) return 1.0;
    if (daysDiff < 180) return 0.8;
    if (daysDiff < 365) return 0.6;
    return 0.3;
  } catch { return 0.5; }
}

function computeAuthorityScore(url) {
  if (!url) return 0.3;
  const highAuthority = ['edu', 'gov', 'org', 'wikipedia.org', 'scholar.google', 'github.com', 'stackoverflow.com', 'arxiv.org', 'ieee.org', 'acm.org', 'springer.com', 'nature.com', 'sciencedirect.com'];
  const mediumAuthority = ['medium.com', 'dev.to', 'reddit.com', 'quora.com', 'linkedin.com', 'bbc.com', 'reuters.com', 'apnews.com'];
  const urlLower = url.toLowerCase();
  if (highAuthority.some(d => urlLower.includes(d))) return 1.0;
  if (mediumAuthority.some(d => urlLower.includes(d))) return 0.7;
  return 0.5;
}

function computeStructureScore(text) {
  if (!text) return 0.2;
  let score = 0.5;
  if (text.length > 100) score += 0.1;
  if (text.length > 300) score += 0.1;
  if (/\d/.test(text)) score += 0.1;
  if (/[A-Z]/.test(text) && /[a-z]/.test(text)) score += 0.1;
  return Math.min(score, 1.0);
}

function computeRelevanceScore(query, result) {
  const titleScore = computeTFIDFScore(query, result.title || '') * 2.0;
  const snippetScore = computeTFIDFScore(query, result.snippet || '') * 1.0;
  const freshness = computeFreshnessScore(result.date);
  const authority = computeAuthorityScore(result.url);
  const structure = computeStructureScore(result.snippet);

  const totalScore = (titleScore + snippetScore) * 0.5 + freshness * 0.2 + authority * 0.2 + structure * 0.1;
  return { totalScore, titleScore, snippetScore, freshness, authority, structure };
}

function rerankResults(query, results) {
  if (!results || results.length === 0) return [];

  const scored = results.map(result => {
    const scores = computeRelevanceScore(query, result);
    return { ...result, relevanceScore: scores.totalScore, scoreBreakdown: scores };
  });

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  logger.info(`[rerank] Query: "${query.substring(0, 50)}" → ${scored.length} results ranked`);
  if (scored.length > 0) {
    logger.info(`[rerank] Top result: "${scored[0].title?.substring(0, 50)}" score=${scored[0].relevanceScore.toFixed(3)}`);
  }

  return scored;
}

module.exports = { rerankResults };
