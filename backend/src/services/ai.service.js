const OpenAI = require('openai');
const tls = require('tls');
const { getCache, setCache } = require('../config/redis');
const { hybridSearch } = require('./retrieval.service');
const logger = require('../config/logger');

// ─── Proxy Tunnel for Groq (1VPN free proxy) ────────────────
const PROXY_HOST = 'free-los-angeles-https-1.cloudburstcdn.com';
const PROXY_PORT = 443;
const PROXY_AUTH = 'Basic ' + Buffer.from('a2epfq5ugq0u:ptkx3fqg6v7n').toString('base64');

function groqProxyStream(apiPath, body, onChunk) {
  return new Promise((resolve, reject) => {
    const proxySocket = tls.connect(PROXY_PORT, PROXY_HOST, { servername: PROXY_HOST, timeout: 30000 }, () => {
      proxySocket.write([
        `CONNECT api.groq.com:443 HTTP/1.1`,
        `Host: api.groq.com:443`,
        `Proxy-Authorization: ${PROXY_AUTH}`,
        `Proxy-Connection: keep-alive`, ``, ``,
      ].join('\r\n'));
    });
    let headerBuf = '';
    const onProxyData = (chunk) => {
      headerBuf += chunk.toString();
      if (headerBuf.includes('\r\n\r\n') && headerBuf.includes('200')) {
        proxySocket.removeListener('data', onProxyData);
        const tlsSocket = tls.connect({ socket: proxySocket, servername: 'api.groq.com', timeout: 30000 }, () => {
          const bodyStr = JSON.stringify(body);
          const req = [
            `POST ${apiPath} HTTP/1.1`,
            `Host: api.groq.com`,
            `Authorization: Bearer ${process.env.GROQ_API_KEY}`,
            `Content-Type: application/json`,
            `Content-Length: ${Buffer.byteLength(bodyStr)}`,
            `Connection: close`,
            `Accept: text/event-stream`,
            ``, bodyStr,
          ].join('\r\n');
          tlsSocket.write(req);
        });
        let buf = '';
        let headersParsed = false;
        tlsSocket.on('data', (c) => {
          if (!headersParsed) {
            buf += c.toString();
            const idx = buf.indexOf('\r\n\r\n');
            if (idx >= 0) {
              headersParsed = true;
              const leftover = buf.substring(idx + 4);
              if (leftover) onChunk(leftover);
            }
          } else {
            onChunk(c.toString());
          }
        });
        tlsSocket.on('end', () => resolve());
        tlsSocket.on('error', reject);
      } else if (headerBuf.includes('\r\n\r\n')) {
        proxySocket.removeListener('data', onProxyData);
        reject(new Error('Proxy CONNECT failed: ' + headerBuf.split('\r\n')[0]));
      }
    };
    proxySocket.on('data', onProxyData);
    proxySocket.on('error', (e) => reject(new Error('Proxy error: ' + e.message)));
    proxySocket.on('timeout', () => { proxySocket.destroy(); reject(new Error('Proxy timeout')); });
  });
}

function groqProxyRequest(method, apiPath, body) {
  return new Promise((resolve, reject) => {
    const proxySocket = tls.connect(PROXY_PORT, PROXY_HOST, { servername: PROXY_HOST, timeout: 20000 }, () => {
      proxySocket.write([
        `CONNECT api.groq.com:443 HTTP/1.1`,
        `Host: api.groq.com:443`,
        `Proxy-Authorization: ${PROXY_AUTH}`,
        `Proxy-Connection: keep-alive`, ``, ``,
      ].join('\r\n'));
    });
    let headerBuf = '';
    const onProxyData = (chunk) => {
      headerBuf += chunk.toString();
      if (headerBuf.includes('\r\n\r\n') && headerBuf.includes('200')) {
        proxySocket.removeListener('data', onProxyData);
        const tlsSocket = tls.connect({ socket: proxySocket, servername: 'api.groq.com', timeout: 20000 }, () => {
          const headers = [
            `${method} ${apiPath} HTTP/1.1`,
            `Host: api.groq.com`,
            `Authorization: Bearer ${process.env.GROQ_API_KEY}`,
            `Connection: close`,
          ];
          if (body) {
            const bodyStr = JSON.stringify(body);
            headers.push(`Content-Type: application/json`);
            headers.push(`Content-Length: ${Buffer.byteLength(bodyStr)}`);
            headers.push(``, bodyStr);
          } else {
            headers.push(``, ``);
          }
          tlsSocket.write(headers.join('\r\n'));
        });
        let buf = '';
        tlsSocket.on('data', (c) => { buf += c.toString(); });
        tlsSocket.on('end', () => {
          const bodyStart = buf.indexOf('\r\n\r\n');
          const rawBody = bodyStart >= 0 ? buf.substring(bodyStart + 4) : buf;
          try {
            resolve(JSON.parse(rawBody));
          } catch {
            reject(new Error('Invalid JSON from Groq proxy: ' + rawBody.substring(0, 200)));
          }
        });
        tlsSocket.on('error', reject);
      } else if (headerBuf.includes('\r\n\r\n')) {
        proxySocket.removeListener('data', onProxyData);
        reject(new Error('Proxy CONNECT failed: ' + headerBuf.split('\r\n')[0]));
      }
    };
    proxySocket.on('data', onProxyData);
    proxySocket.on('error', (e) => reject(new Error('Proxy error: ' + e.message)));
    proxySocket.on('timeout', () => { proxySocket.destroy(); reject(new Error('Proxy timeout')); });
  });
}

// ─── Provider Configs ───────────────────────────────────────
const providers = {
  groq: {
    name: 'Groq',
    client: null,
    models: {
      'qwen3-8b': { name: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B (سریع+تصویر)', free: true },
      'gpt-oss-20b': { name: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (رایگان)', free: true },
      'gpt-oss-120b': { name: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B (دقیق)', free: true },
      'allam-7b': { name: 'allam-2-7b', label: 'Allam 2 7B (عربی)', free: true },
    },
    init() {
      this.client = !!process.env.GROQ_API_KEY;
    },
    async generate(modelId, messages, options = {}) {
      if (!this.client) throw new Error('Groq API key not configured');
      const model = this.models[modelId];
      if (!model) throw new Error('Model not found: ' + modelId);
      const res = await groqProxyRequest('POST', '/openai/v1/chat/completions', {
        model: model.name,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2048,
      });
      if (res.error) throw new Error(res.error.message || JSON.stringify(res.error));
      return {
        content: res.choices[0].message.content,
        tokens: { input: res.usage?.prompt_tokens || 0, output: res.usage?.completion_tokens || 0 },
        model: modelId,
        provider: 'groq',
      };
    },
    async stream(modelId, messages, onChunk, options = {}) {
      if (!this.client) throw new Error('Groq API key not configured');
      const model = this.models[modelId];
      if (!model) throw new Error('Model not found: ' + modelId);
      const body = {
        model: model.name,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2048,
        stream: true,
      };
      let fullContent = '';
      await groqProxyStream('/openai/v1/chat/completions', body, (chunk) => {
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          const data = line.replace('data: ', '').trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              onChunk(delta);
            }
          } catch {}
        }
      });
      return {
        content: fullContent,
        tokens: { input: 0, output: 0 },
        model: modelId,
        provider: 'groq',
      };
    },
    isAvailable() { return !!this.client; },
  },

  sambanova: {
    name: 'SambaNova',
    client: null,
    models: {
      'deepseek-v3': { name: 'DeepSeek-V3.1', label: 'DeepSeek V3.1', free: true },
      'llama-3.3-70b': { name: 'Meta-Llama-3.3-70B-Instruct', label: 'Llama 3.3 70B', free: true },
      'gemma-4-31b': { name: 'gemma-4-31B-it', label: 'Gemma 4 31B', free: true },
    },
    init() {
      const key = process.env.SAMBANOVA_API_KEY;
      if (key) {
        this.client = new OpenAI({ apiKey: key, baseURL: 'https://api.sambanova.ai/v1' });
      }
    },
    async generate(modelId, messages, options = {}) {
      if (!this.client) throw new Error('SambaNova API key not configured');
      const model = this.models[modelId];
      if (!model) throw new Error('Model not found: ' + modelId);
      const res = await this.client.chat.completions.create({
        model: model.name,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2048,
      });
      return {
        content: res.choices[0].message.content,
        tokens: { input: res.usage?.prompt_tokens || 0, output: res.usage?.completion_tokens || 0 },
        model: modelId,
        provider: 'sambanova',
      };
    },
    isAvailable() { return !!this.client; },
  },

  gemini: {
    name: 'Google Gemini',
    client: null,
    models: {
      'gemini-1.5-flash': { name: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (سریع)', free: true },
      'gemini-1.5-pro': { name: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (دقیق)', free: true },
    },
    init() {
      const key = process.env.GEMINI_API_KEY;
      if (key) {
        try {
          const { GoogleGenerativeAI } = require('@google/generative-ai');
          this.client = new GoogleGenerativeAI(key);
        } catch { this.client = null; }
      }
    },
    async generate(modelId, messages, options = {}) {
      if (!this.client) throw new Error('Gemini API key not configured');
      const model = this.models[modelId];
      if (!model) throw new Error('Model not found: ' + modelId);

      const systemMsg = messages.find(m => m.role === 'system');
      const chatMsgs = messages.filter(m => m.role !== 'system');

      const m = this.client.getGenerativeModel({
        model: model.name,
        systemInstruction: systemMsg?.content || undefined,
      });

      const history = chatMsgs.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const chat = m.startChat({ history });
      const lastMsg = chatMsgs[chatMsgs.length - 1];
      const result = await chat.sendMessage(lastMsg.content);
      const response = await result.response;

      return {
        content: response.text(),
        tokens: { input: response.usageMetadata?.promptTokenCount || 0, output: response.usageMetadata?.candidatesTokenCount || 0 },
        model: modelId,
        provider: 'gemini',
      };
    },
    isAvailable() { return !!this.client; },
  },

  openai: {
    name: 'OpenAI',
    client: null,
    models: {
      'gpt-4o-mini': { name: 'gpt-4o-mini', label: 'GPT-4o Mini', free: false },
      'gpt-4o': { name: 'gpt-4o', label: 'GPT-4o', free: false },
    },
    init() {
      const key = process.env.OPENAI_API_KEY;
      if (key && !key.includes('placeholder')) {
        this.client = new OpenAI({ apiKey: key });
      }
    },
    async generate(modelId, messages, options = {}) {
      if (!this.client) throw new Error('OpenAI API key not configured');
      const model = this.models[modelId];
      if (!model) throw new Error('Model not found: ' + modelId);
      const res = await this.client.chat.completions.create({
        model: model.name,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2048,
      });
      return {
        content: res.choices[0].message.content,
        tokens: { input: res.usage?.prompt_tokens || 0, output: res.usage?.completion_tokens || 0 },
        model: modelId,
        provider: 'openai',
      };
    },
    isAvailable() { return !!this.client; },
  },

  anthropic: {
    name: 'Anthropic',
    client: null,
    models: {
      'claude-3-haiku': { name: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', free: false },
    },
    init() {
      const key = process.env.ANTHROPIC_API_KEY;
      if (key) {
        try {
          const Anthropic = require('@anthropic-ai/sdk');
          this.client = new Anthropic({ apiKey: key });
        } catch { this.client = null; }
      }
    },
    async generate(modelId, messages, options = {}) {
      if (!this.client) throw new Error('Anthropic API key not configured');
      const model = this.models[modelId];
      if (!model) throw new Error('Model not found: ' + modelId);
      const systemMsg = messages.find(m => m.role === 'system');
      const chatMsgs = messages.filter(m => m.role !== 'system');
      const res = await this.client.messages.create({
        model: model.name,
        system: systemMsg?.content || '',
        messages: chatMsgs,
        max_tokens: options.maxTokens || 2048,
      });
      return {
        content: res.content[0].text,
        tokens: { input: res.usage?.input_tokens || 0, output: res.usage?.output_tokens || 0 },
        model: modelId,
        provider: 'anthropic',
      };
    },
    isAvailable() { return !!this.client; },
  },
};

// ─── System Prompt ──────────────────────────────────────────
function buildSystemPrompt(sourceDocs, userName, webResults = []) {
  let prompt = `تو دستیار هوش مصنوعی فارسی هستی به نام «دستیار».
قوانین مهم:
- همیشه فقط به فارسی یا انگلیسی پاسخ بده. هرگز به عربی، ترکی یا هیچ زبان دیگری پاسخ نده.
- اگر کاربر به زبانی غیر از فارسی و انگلیسی سوال کرد، باز هم فقط فارسی یا انگلیسی جواب بده.
- مخاطبانت دانشجو، پژوهشگر و حرفه‌ای هستند.
- پاسخ‌هایت دقیق، علمی و ساختاریافته باشد.
- از bullet point و فرمت مناسب استفاده کن.
- عنوان مکالمه را در ۳ تا ۵ کلمه خلاصه کن (فقط وقتی درخواست شد).`;

  if (userName) {
    prompt += `\nکاربر: ${userName}`;
  }

  if (sourceDocs && sourceDocs.length > 0) {
    prompt += `\n\nتو به اسناد زیر دسترسی داری. بر اساس این اسناد پاسخ بده.`;
    prompt += `\nاز فرمت [منبع: عنوان سند] برای استناد استفاده کن.`;
    prompt += `\n\nاسناد مرجع:\n`;
    sourceDocs.forEach((doc, i) => {
      prompt += `\n--- سند ${i + 1}: ${doc.documentTitle || 'ناشناس'} ---\n${doc.content}\n`;
    });
  }

  if (webResults && webResults.length > 0) {
    prompt += `\n\nنتایج جستجوی وب:\n`;
    webResults.forEach((r, i) => {
      prompt += `\n--- نتیجه ${i + 1}: ${r.title} ---\n${r.snippet}\nلینک: ${r.url}\n`;
    });
    prompt += `\nاز اطلاعات وب برای تکمیل پاسخ استفاده کن. حتماً منابع وب را با [منبع: لینک] ذکر کن.`;
  }

  if ((!sourceDocs || sourceDocs.length === 0) && (!webResults || webResults.length === 0)) {
    prompt += `\n\nپاسخ‌های دقیق و علمی بده. اگر اطلاعات دقیق نداری، صادقانه بگو.`;
  }

  return prompt;
}

// ─── Main Function ──────────────────────────────────────────
async function generateAIResponse(userMessage, conversationContext, sourceDocs = [], modelId = null, userId = null, triedModels = new Set(), webResults = []) {
  if (!modelId) {
    modelId = getBestAvailableModel();
  }

  if (!modelId || triedModels.has(modelId)) {
    throw new Error('هیچ مدل هوش مصنوعی در دسترس نیست. لطفاً API key تنظیم کنید.');
  }
  triedModels.add(modelId);

  const provider = getProviderForModel(modelId);
  if (!provider) {
    const fallback = getFallbackModel(modelId, triedModels);
    if (fallback) {
      return generateAIResponse(userMessage, conversationContext, sourceDocs, fallback.modelId, userId, triedModels, webResults);
    }
    throw new Error('هیچ مدل هوش مصنوعی در دسترس نیست.');
  }

  const userName = null;
  const systemPrompt = buildSystemPrompt(sourceDocs, userName, webResults);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationContext,
    { role: 'user', content: userMessage },
  ];

  const contextHash = JSON.stringify(conversationContext.map(m => m.content?.slice(0, 50)));
  const cacheKey = 'resp:' + require('crypto').createHash('md5')
    .update(userMessage + contextHash + JSON.stringify(sourceDocs.map(d => d.chunkId || d.content?.slice(0, 100))))
    .digest('hex');
  const cached = await getCache(cacheKey);
  if (cached) return { ...cached, cached: true };

  try {
    const result = await provider.generate(modelId, messages);

    const response = {
      content: result.content,
      sources: sourceDocs.map(d => ({
        title: d.documentTitle || 'Unknown',
        documentId: d.documentId || null,
        chunkIndex: d.chunkIndex,
      })),
      tokens: result.tokens,
      model: result.model,
      provider: result.provider,
    };

    await setCache(cacheKey, response, 3600);
    return response;
  } catch (error) {
    logger.error(`AI error [${provider.name}/${modelId}]:`, error.message);

    const fallback = getFallbackModel(modelId, triedModels);
    if (fallback) {
      logger.info(`Falling back to ${fallback.provider}/${fallback.modelId}`);
      return generateAIResponse(userMessage, conversationContext, sourceDocs, fallback.modelId, userId, triedModels);
    }

    if (error.status === 429) throw new Error('محدودیت تعداد درخواست. لطفاً چند لحظه صبر کنید.');
    throw new Error('خطا در دریافت پاسخ هوش مصنوعی: ' + error.message);
  }
}

async function streamAIResponse(userMessage, conversationContext, sourceDocs, modelId, userId, onChunk, webResults = []) {
  if (!modelId) modelId = getBestAvailableModel();
  const provider = getProviderForModel(modelId);
  if (!provider) throw new Error('هیچ مدل هوش مصنوعی در دسترس نیست.');

  const systemPrompt = buildSystemPrompt(sourceDocs, null, webResults);
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationContext,
    { role: 'user', content: userMessage },
  ];

  if (provider.stream) {
    return await provider.stream(modelId, messages, onChunk);
  }
  const result = await provider.generate(modelId, messages);
  onChunk(result.content);
  return result;
}

// ─── Model Selection Helpers ────────────────────────────────
function getBestAvailableModel() {
  if (providers.groq.isAvailable()) return 'gpt-oss-120b';
  if (providers.gemini.isAvailable()) return 'gemini-1.5-flash';
  if (providers.groq.isAvailable()) return 'qwen3-8b';
  if (providers.openai.isAvailable()) return 'gpt-4o-mini';
  if (providers.anthropic.isAvailable()) return 'claude-3-haiku';
  if (providers.sambanova.isAvailable()) return 'deepseek-v3';
  return null;
}

function getProviderForModel(modelId) {
  for (const [key, provider] of Object.entries(providers)) {
    if (provider.models[modelId] && provider.isAvailable()) return provider;
  }
  return null;
}

function getFallbackModel(currentModelId, triedModels = new Set()) {
  const fallbacks = {
    'qwen3-8b': 'gpt-oss-20b',
    'gpt-oss-20b': 'gpt-oss-120b',
    'gpt-oss-120b': 'allam-7b',
    'allam-7b': 'gemma-4-31b',
    'deepseek-v3': 'gemini-1.5-flash',
    'gemma-4-31b': 'gpt-oss-120b',
    'gemini-1.5-flash': 'gpt-oss-20b',
    'gemini-1.5-pro': 'gemini-1.5-flash',
    'gpt-4o-mini': 'gpt-oss-20b',
    'gpt-4o': 'gpt-4o-mini',
    'claude-3-haiku': 'gpt-oss-20b',
  };
  const fallbackId = fallbacks[currentModelId];
  if (fallbackId && !triedModels.has(fallbackId) && getProviderForModel(fallbackId)) {
    return { modelId: fallbackId, provider: getProviderForModel(fallbackId) };
  }
  return null;
}

async function searchDocuments(query, userId) {
  if (!userId) return [];
  try {
    return await hybridSearch(query, userId, 5);
  } catch (error) {
    logger.error('Search error:', error.message);
    return [];
  }
}

function getAvailableModels() {
  const available = [];
  for (const [key, provider] of Object.entries(providers)) {
    if (provider.isAvailable()) {
      for (const [modelId, model] of Object.entries(provider.models)) {
        available.push({
          id: modelId,
          name: model.label || model.name,
          provider: provider.name,
          free: model.free || false,
        });
      }
    }
  }
  return available;
}

// ─── Initialize ─────────────────────────────────────────────
Object.values(providers).forEach(p => { try { p.init(); } catch {} });

module.exports = {
  generateAIResponse,
  streamAIResponse,
  searchDocuments,
  getAvailableModels,
  providers,
  getProviderForModel,
};
