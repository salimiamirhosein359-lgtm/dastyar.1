let redisClient = null;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function connectRedis() {
  try {
    const { createClient } = await import('redis');
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on('error', (err) => console.log('Redis Error (non-fatal):', err.message));
    await redisClient.connect();
    console.log('✅ Redis connected');
    return redisClient;
  } catch (error) {
    console.warn('⚠️  Redis unavailable, running without cache:', error.message);
    return null;
  }
}

async function getCache(key) {
  if (!redisClient) return null;
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch { return null; }
}

async function setCache(key, value, ttl = 3600) {
  if (!redisClient) return;
  try { await redisClient.setEx(key, ttl, JSON.stringify(value)); }
  catch {}
}

async function invalidateCache(key) {
  if (!redisClient) return;
  try { await redisClient.del(key); }
  catch {}
}

async function disconnectRedis() {
  if (redisClient) await redisClient.quit();
}

module.exports = { connectRedis, getCache, setCache, invalidateCache, disconnectRedis };
