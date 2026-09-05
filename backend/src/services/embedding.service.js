const OpenAI = require('openai');
const crypto = require('crypto');
const { getCache, setCache } = require('../config/redis');
const logger = require('../config/logger');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const EMBEDDING_MODEL = 'text-embedding-ada-002';

function hashText(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

async function getEmbedding(text) {
  const key = 'emb:' + hashText(text);
  const cached = await getCache(key);
  if (cached) return cached;

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.replace(/\n/g, ' ')
    });
    const embedding = response.data[0].embedding;
    await setCache(key, embedding, 86400);
    return embedding;
  } catch (error) {
    logger.error('Embedding generation error:', error.message);
    throw error;
  }
}

async function getEmbeddings(texts) {
  const results = [];
  const uncached = [];

  for (const text of texts) {
    const key = 'emb:' + hashText(text);
    const cached = await getCache(key);
    if (cached) {
      results.push({ text, embedding: cached, cached: true });
    } else {
      uncached.push({ text, key });
      results.push({ text, embedding: null, cached: false });
    }
  }

  if (uncached.length > 0) {
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: uncached.map(u => u.text.replace(/\n/g, ' '))
      });
      response.data.forEach((item, i) => {
        const embedding = item.embedding;
        setCache(uncached[i].key, embedding, 86400);
        const idx = results.findIndex(r => r.text === uncached[i].text && !r.cached);
        if (idx !== -1) results[idx] = { text: uncached[i].text, embedding, cached: false };
      });
    } catch (error) {
      logger.error('Batch embedding error:', error.message);
      throw error;
    }
  }

  return results.map(r => r.embedding).filter(Boolean);
}

module.exports = { getEmbedding, getEmbeddings };