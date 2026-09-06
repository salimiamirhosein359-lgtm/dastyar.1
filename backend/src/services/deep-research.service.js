const { searchWeb } = require('./search.service');
const { rerankResults } = require('./rerank.service');
const { rewriteQuery } = require('./query.service');
const logger = require('../config/logger');

const MAX_ITERATIONS = 3;
const MAX_SOURCES_PER_ITERATION = 5;

async function analyzeInformationGaps(query, collectedSources, queryInfo) {
  const sourcesSummary = collectedSources.map((s, i) => `[${i+1}] ${s.title}: ${s.snippet?.substring(0, 100)}`).join('\n');

  return {
    hasGaps: collectedSources.length < 3,
    suggestedQueries: [query],
    reason: collectedSources.length < 3 ? 'insufficient_sources' : 'enough_sources'
  };
}

function computeSourceOverlap(sources) {
  const seen = new Set();
  const unique = [];
  for (const s of sources) {
    const key = s.url || s.title;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(s);
    }
  }
  return unique;
}

async function deepResearch(query, conversationContext = [], options = {}) {
  const { maxIterations = MAX_ITERATIONS, onProgress = null } = options;
  const allSources = [];
  const searchQueries = [];
  let iteration = 0;

  const queryInfo = await rewriteQuery(query, conversationContext);
  let currentSearchQuery = queryInfo.searchQuery;

  logger.info(`[DeepResearch] Starting deep research: "${query}" (max ${maxIterations} iterations)`);

  while (iteration < maxIterations) {
    iteration++;
    logger.info(`[DeepResearch] Iteration ${iteration}/${maxIterations}: "${currentSearchQuery.substring(0, 60)}"`);
    searchQueries.push(currentSearchQuery);

    if (onProgress) {
      onProgress({ type: 'iteration', iteration, query: currentSearchQuery, totalSources: allSources.length });
    }

    try {
      const results = await searchWeb(currentSearchQuery, MAX_SOURCES_PER_ITERATION);
      const ranked = rerankResults(currentSearchQuery, results);

      for (const r of ranked) {
        if (!allSources.find(s => s.url === r.url)) {
          allSources.push(r);
        }
      }

      logger.info(`[DeepResearch] Iteration ${iteration}: found ${results.length} results, total unique: ${allSources.length}`);
    } catch (e) {
      logger.error(`[DeepResearch] Search failed in iteration ${iteration}:`, e.message);
    }

    const gapAnalysis = await analyzeInformationGaps(query, allSources, queryInfo);

    if (!gapAnalysis.hasGaps || iteration >= maxIterations) {
      logger.info(`[DeepResearch] Research complete: ${allSources.length} sources after ${iteration} iterations`);
      break;
    }

    if (gapAnalysis.suggestedQueries.length > 0) {
      currentSearchQuery = gapAnalysis.suggestedQueries[0];
    } else {
      break;
    }
  }

  const uniqueSources = computeSourceOverlap(allSources);
  const finalSources = uniqueSources.slice(0, 10);

  return {
    sources: finalSources,
    iterations: iteration,
    queries: searchQueries,
    queryInfo
  };
}

module.exports = { deepResearch };
