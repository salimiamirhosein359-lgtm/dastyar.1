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
    send: (conversationId: string, content: string, model?: string) =>
      request(`/chat/send/${conversationId}`, { method: 'POST', body: JSON.stringify({ content, model }) }),
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
  health: () => request('/health'),
};