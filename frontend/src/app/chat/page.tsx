'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import ModelSelector from '@/components/ModelSelector';

interface Message {
  id: string;
  role: string;
  content: string;
  sources?: string | null;
  model?: string | null;
  createdAt: string;
}

interface WebResult {
  title: string;
  snippet: string;
  url: string;
}

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  const [model, setModel] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [searchActive, setSearchActive] = useState(false);
  const [deepResearch, setDeepResearch] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    api.chat.models().then((d) => {
      setModels(d.models || []);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const q = sessionStorage.getItem('pendingQuery');
    if (q && user) {
      sessionStorage.removeItem('pendingQuery');
      send(q);
    }
  }, [user]);

  const loadConversation = async (id: string) => {
    setCurrentId(id);
    try {
      const d = await api.conversations.get(id);
      const conv = d.conversation || d;
      setMessages(conv.messages || []);
    } catch { setMessages([]); }
  };

  const newChat = () => {
    setCurrentId(null);
    setMessages([]);
    setWebResults([]);
  };

  const send = async (text: string, docIds: string[] = []) => {
    let convId = currentId;
    if (!convId) {
      try {
        const d = await api.conversations.create();
        convId = d.conversation?.id;
        setCurrentId(convId);
        setRefreshKey((k) => k + 1);
      } catch { return; }
    }

    const tempUser: Message = { id: 'tmp-u-' + Date.now(), role: 'user', content: text, createdAt: new Date().toISOString() };
    const tempAssistant: Message = { id: 'tmp-a-' + Date.now(), role: 'assistant', content: '', createdAt: new Date().toISOString() };
    setMessages((m) => [...m, tempUser, tempAssistant]);
    setSending(true);

    try {
      await api.chat.stream(convId!, text, model,
        (chunk) => {
          setMessages((m) => {
            const updated = [...m];
            const last = updated[updated.length - 1];
            if (last && last.id.startsWith('tmp-a-')) {
              updated[updated.length - 1] = { ...last, content: last.content + chunk };
            }
            return updated;
          });
        },
        (done) => {
          setMessages((m) => {
            const updated = [...m];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].id.startsWith('tmp-a-')) {
              updated[lastIdx] = done.message || { ...updated[lastIdx], id: 'msg-' + Date.now() };
            }
            return updated;
          });
          setRefreshKey((k) => k + 1);
        },
        docIds.length > 0 ? docIds : undefined,
        (results) => {
          if (results && results.length > 0) {
            setWebResults(results);
          }
        },
        searchActive,
        deepResearch
      );
    } catch (e: any) {
      setMessages((m) => {
        const filtered = m.filter((x) => !x.id.startsWith('tmp-a-'));
        return [...filtered, {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: 'متأسفانه خطایی رخ داد: ' + (e.message || 'پاسخ ناموفق بود'),
          createdAt: new Date().toISOString(),
        }];
      });
    } finally { setSending(false); }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="flex items-center gap-3">
          <span className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          <span className="text-ink-secondary text-sm">در حال بارگذاری...</span>
        </div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#f5f3ee]">
      <Sidebar currentId={currentId} onSelect={loadConversation} onNew={newChat} refreshKey={refreshKey} />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-[#f5f3ee]/80 backdrop-blur-xl border-b border-stroke">
          <div className="flex items-center justify-between h-14 px-4 md:px-6 max-w-5xl mx-auto">
            {/* Right side - brand */}
          <div className="flex items-center gap-3">
            {currentId && messages.length > 0 && (
              <div className="hidden md:flex items-center gap-1.5">
                <span className="text-xs text-ink-muted/50">گفتگو فعال</span>
              </div>
            )}
          </div>

            {/* Left side - model */}
            <ModelSelector models={models} value={model} onChange={setModel} />
          </div>
        </div>

        {/* Web results panel */}
        {webResults.length > 0 && (
          <div className="max-w-5xl mx-auto w-full px-4 pt-3 animate-fade-in">
            <div className="bg-white border border-stroke rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-extrabold text-ink text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                  نتایج جستجوی وب
                </h3>
                <button onClick={() => setWebResults([])} className="text-ink-muted hover:text-ink p-1.5 rounded-lg hover:bg-stroke-light transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {webResults.map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noopener" className="group bg-paper rounded-xl px-3 py-2.5 hover:bg-gold/5 transition-colors border border-transparent hover:border-gold/10">
                    <p className="text-sm font-bold text-ink group-hover:text-gold transition-colors truncate">{r.title}</p>
                    <p className="text-xs text-ink-muted line-clamp-2 mt-0.5">{r.snippet}</p>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-5xl mx-auto w-full px-4 py-6">
            {messages.length === 0 && (
              <div className="text-center py-20 animate-fade-in">
                <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-gold/15 via-gold/8 to-transparent flex items-center justify-center mx-auto mb-8 animate-float">
                  <svg className="w-10 h-10 text-gold/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-extrabold text-ink mb-3">چطور می‌تونم کمکت کنم؟</h2>
                <p className="text-ink-secondary text-sm max-w-sm mx-auto leading-7">
                  سوال بپرس، سند آپلود کن، یا توی تحقیقت کمکت کنم.
                </p>
              </div>
            )}
            {messages.map((m) => (
              <ChatMessage key={m.id} role={m.role} content={m.content} sources={(m as any).sources} />
            ))}
            {sending && (
              <div className="flex justify-start mb-6 animate-fade-in">
                <div className="max-w-[92%] w-full">
                  <div className="bg-white border border-stroke rounded-3xl rounded-tl-xl px-6 py-5 shadow-card">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-gold animate-pulse-dot" style={{ animationDelay: '0s' }} />
                      <span className="w-2 h-2 rounded-full bg-gold animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
                      <span className="w-2 h-2 rounded-full bg-gold animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="sticky bottom-0 bg-gradient-to-t from-[#f5f3ee] via-[#f5f3ee] to-transparent pt-6 pb-4">
          <div className="max-w-3xl mx-auto w-full px-4">
            <ChatInput
              onSend={send}
              loading={sending}
              searchActive={searchActive}
              onSearchToggle={() => setSearchActive(!searchActive)}
              deepResearch={deepResearch}
              onDeepResearchToggle={() => { setDeepResearch(!deepResearch); if (!deepResearch) setSearchActive(true); }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
