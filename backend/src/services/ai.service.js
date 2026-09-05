const OpenAI = require('openai');
const { getCache, setCache } = require('../config/redis');
const { hybridSearch } = require('./retrieval.service');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');

// ─── Provider Configs ───────────────────────────────────────
const providers = {
  groq: {
    name: 'Groq',
    client: null,
    models: {
      'llama-3.3-70b': { name: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (سریع)', free: true },
      'llama-3.1-8b': { name: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (سریع)', free: true },
      'deepseek-r1-70b': { name: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 70B (دقیق)', free: true },
    },
    init() {
      const key = process.env.GROQ_API_KEY;
      if (key) {
        this.client = new OpenAI({ apiKey: key, baseURL: 'https://api.groq.com/openai/v1' });
      }
    },
    async generate(modelId, messages, options = {}) {
      if (!this.client) throw new Error('Groq API key not configured');
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

// ─── User Data Folders ──────────────────────────────────────
const USERS_DIR = process.env.USERS_DATA_DIR || '/var/data/dastyar/users';

function getUserDir(userId) {
  const dir = path.join(USERS_DIR, userId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    fs.mkdirSync(path.join(dir, 'chats'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'documents'), { recursive: true });
  }
  return dir;
}

function saveChatHistory(userId, conversationId, messages) {
  const dir = getUserDir(userId);
  const filePath = path.join(dir, 'chats', `${conversationId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(messages, null, 2), 'utf-8');
}

function loadChatHistory(userId, conversationId) {
  const filePath = path.join(getUserDir(userId), 'chats', `${conversationId}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return [];
}

// ─── System Prompt ──────────────────────────────────────────
function buildSystemPrompt(sourceDocs, userName) {
  let prompt = `تو دستیار هوش مصنوعی فارسی هستی به نام «دستیار».
مخاطبانت دانشجو، پژوهشگر و حرفه‌ای هستند.
به فارسی پاسخ بده مگر اینکه کاربر به زبان دیگری سوال کند.
پاسخ‌هایت دقیق، علمی و ساختاریافته باشد.
از bullet point و فرمت مناسب استفاده کن.`;

  if (userName) {
    prompt += `\nکاربر: ${userName}`;
  }

  if (sourceDocs && sourceDocs.length > 0) {
    prompt += `\n\nتو به اسناد زیر دسترسی داری. فقط بر اساس این اسناد پاسخ بده. اگر جواب در اسناد نبود، صادقانه بگو.`;
    prompt += `\nاز فرمت [منبع: عنوان سند] برای استناد استفاده کن.`;
    prompt += `\n\nاسناد مرجع:\n`;
    sourceDocs.forEach((doc, i) => {
      prompt += `\n--- سند ${i + 1}: ${doc.documentTitle || 'ناشناس'} ---\n${doc.content}\n`;
    });
  } else {
    prompt += `\n\nپاسخ‌های دقیق و علمی بده. اگر اطلاعات دقیق نداری، صادقانه بگو.`;
  }

  return prompt;
}

// ─── Main Function ──────────────────────────────────────────
async function generateAIResponse(userMessage, conversationContext, sourceDocs = [], modelId = null, userId = null) {
  // Determine best available model
  if (!modelId) {
    modelId = getBestAvailableModel();
  }

  const provider = getProviderForModel(modelId);
  if (!provider) throw new Error('هیچ مدل هوش مصنوعی در دسترس نیست. لطفاً API key تنظیم کنید.');

  const userName = null; // Could be fetched from DB
  const systemPrompt = buildSystemPrompt(sourceDocs, userName);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationContext,
    { role: 'user', content: userMessage },
  ];

  // Cache check
  const cacheKey = 'resp:' + require('crypto').createHash('md5')
    .update(userMessage + JSON.stringify(sourceDocs.map(d => d.chunkId || d.content?.slice(0, 100))))
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

    // Fallback to next provider
    const fallback = getFallbackModel(modelId);
    if (fallback) {
      logger.info(`Falling back to ${fallback.provider}/${fallback.modelId}`);
      return generateAIResponse(userMessage, conversationContext, sourceDocs, fallback.modelId, userId);
    }

    if (error.status === 429) throw new Error('محدودیت تعداد درخواست. لطفاً چند لحظه صبر کنید.');
    throw new Error('خطا در دریافت پاسخ هوش مصنوعی: ' + error.message);
  }
}

// ─── Model Selection Helpers ────────────────────────────────
function getBestAvailableModel() {
  // Priority: Groq (fast) > SambaNova (strong) > Gemini > OpenAI > Anthropic
  if (providers.groq.isAvailable()) return 'llama-3.3-70b';
  if (providers.sambanova.isAvailable()) return 'deepseek-v3';
  if (providers.gemini.isAvailable()) return 'gemini-1.5-flash';
  if (providers.openai.isAvailable()) return 'gpt-4o-mini';
  if (providers.anthropic.isAvailable()) return 'claude-3-haiku';
  return null;
}

function getProviderForModel(modelId) {
  for (const [key, provider] of Object.entries(providers)) {
    if (provider.models[modelId] && provider.isAvailable()) return provider;
  }
  return null;
}

function getFallbackModel(currentModelId) {
  const fallbacks = {
    'llama-3.3-70b': 'deepseek-v3',
    'llama-3.1-8b': 'llama-3.3-70b',
    'deepseek-r1-70b': 'llama-3.3-70b',
    'deepseek-v3': 'gemini-1.5-flash',
    'gemma-4-31b': 'deepseek-v3',
    'gemini-1.5-flash': 'deepseek-v3',
    'gemini-1.5-pro': 'gemini-1.5-flash',
    'gpt-4o-mini': 'deepseek-v3',
    'gpt-4o': 'gpt-4o-mini',
    'claude-3-haiku': 'deepseek-v3',
  };
  const fallbackId = fallbacks[currentModelId];
  if (fallbackId && getProviderForModel(fallbackId)) {
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
  searchDocuments,
  getAvailableModels,
  getUserDir,
  saveChatHistory,
  loadChatHistory,
  providers,
};
