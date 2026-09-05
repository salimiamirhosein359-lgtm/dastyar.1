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
  const key = 'emb:' + EMBEDDING_MODEL + ':' + hashText(text);
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
  const results = new Array(texts.length).fill(null);
  const uncachedIndices = [];

  const cacheChecks = await Promise.all(
    texts.map(async (text, i) => {
      const key = 'emb:' + EMBEDDING_MODEL + ':' + hashText(text);
      const cached = await getCache(key);
      if (cached) {
        results[i] = cached;
      } else {
        uncachedIndices.push(i);
      }
      return { i, cached };
    })
  );

  if (uncachedIndices.length > 0) {
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: uncachedIndices.map(i => texts[i].replace(/\n/g, ' '))
      });
      for (let j = 0; j < uncachedIndices.length; j++) {
        const originalIdx = uncachedIndices[j];
        const embedding = response.data[j].embedding;
        const key = 'emb:' + EMBEDDING_MODEL + ':' + hashText(texts[originalIdx]);
        setCache(key, embedding, 86400);
        results[originalIdx] = embedding;
      }
    } catch (error) {
      logger.error('Batch embedding error:', error.message);
      throw error;
    }
  }

  return results;
}

module.exports = { getEmbedding, getEmbeddings };
