const API = process.env.NEXT_PUBLIC_API_URL || '/api';

async function request(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}

async function streamRequest(path: string, body: Record<string, any>, onChunk: (chunk: string) => void, onDone?: (data: any) => void, onWebResults?: (results: any[]) => void) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No reader available');
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'chunk') onChunk(parsed.content);
        if (parsed.type === 'webResults' && onWebResults) onWebResults(parsed.results);
        if (parsed.type === 'done' && onDone) onDone(parsed);
        if (parsed.type === 'error') throw new Error(parsed.error);
      } catch (e: any) {
        if (e.message && !e.message.includes('JSON')) throw e;
      }
    }
  }
}

export const api = {
  auth: {
    register: (body: { name: string; email: string; password: string }) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    profile: () => request('/auth/profile'),
  },
  conversations: {
    list: () => request('/conversations'),
    create: () => request('/conversations', { method: 'POST', body: '{}' }),
    get: (id: string) => request(`/conversations/${id}`),
    delete: (id: string) => request(`/conversations/${id}`, { method: 'DELETE' }),
    favorite: (id: string) => request(`/conversations/${id}/favorite`, { method: 'PUT' }),
    favorites: () => request('/conversations/favorites'),
  },
  chat: {
    send: (conversationId: string, content: string, model?: string, docIds?: string[]) =>
      request(`/chat/send/${conversationId}`, { method: 'POST', body: JSON.stringify({ content, model, documentIds: docIds }) }),
    stream: (conversationId: string, content: string, model: string, onChunk: (chunk: string) => void, onDone?: (data: any) => void, docIds?: string[], onWebResults?: (results: any[]) => void) =>
      streamRequest(`/chat/stream/${conversationId}`, { content, model, documentIds: docIds }, onChunk, onDone, onWebResults),
    models: () => request('/chat/models'),
  },
  documents: {
    list: () => request('/documents'),
    upload: (body: { content: string; fileName: string; fileType: string }) =>
      request('/documents/upload-json', { method: 'POST', body: JSON.stringify(body) }),
    get: (id: string) => request(`/documents/${id}`),
    status: (id: string) => request(`/documents/${id}/status`),
    delete: (id: string) => request(`/documents/${id}`, { method: 'DELETE' }),
  },
  search: (query: string) => request(`/search?q=${encodeURIComponent(query)}`),
  health: () => request('/health'),
};