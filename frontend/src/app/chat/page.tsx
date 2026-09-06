'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  const [model, setModel] = useState('qwen3-8b');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDocs, setShowDocs] = useState(false);
  const [docs, setDocs] = useState<any[]>([]);
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [searchActive, setSearchActive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    api.chat.models().then((d) => {
      setModels(d.models || []);
      if (d.models?.length > 0) setModel(d.models[0].id);
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

  const loadDocs = async () => {
    try {
      const d = await api.documents.list();
      setDocs(d.documents || []);
    } catch {}
  };

  const toggleDocs = () => {
    if (!showDocs) loadDocs();
    setShowDocs(!showDocs);
  };

  const loadConversation = async (id: string) => {
    setCurrentId(id);
    setShowDocs(false);
    try {
      const d = await api.conversations.get(id);
      const conv = d.conversation || d;
      setMessages(conv.messages || []);
    } catch { setMessages([]); }
  };

  const newChat = () => {
    setCurrentId(null);
    setMessages([]);
    setShowDocs(false);
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
        }
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
    <div className="flex min-h-screen bg-paper">
      <Sidebar currentId={currentId} onSelect={loadConversation} onNew={newChat} refreshKey={refreshKey} />

      <main className="flex-1 flex flex-col min-h-screen max-w-4xl mx-auto w-full px-4 pb-4">
        {/* Header */}
        <header className="flex items-center justify-between py-4 pr-14 md:pr-0 shrink-0">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gold to-gold-hover flex items-center justify-center shadow-sm shadow-gold/15">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <span className="text-sm font-extrabold text-ink">دستیار</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleDocs} className={`p-2 rounded-xl transition-all duration-200 ${showDocs ? 'bg-gold/10 text-gold' : 'text-ink-muted hover:text-ink-secondary hover:bg-ink/[0.03]'}`} title="اسناد من">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </button>
            <ModelSelector models={models} value={model} onChange={setModel} />
          </div>
        </header>

        {/* Docs panel */}
        {showDocs && (
          <div className="bg-white border border-stroke rounded-2xl p-4 mb-4 animate-fade-in shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-ink text-sm">اسناد من</h3>
              <Link href="/documents" className="text-xs text-gold hover:underline">مدیریت کامل</Link>
            </div>
            {docs.length === 0 ? (
              <p className="text-ink-muted text-xs py-3 text-center bg-paper rounded-xl">هنوز سندی آپلود نشده</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {docs.filter(d => d.status === 'ready').map((d) => (
                  <div key={d.id} className="flex items-center gap-2 bg-paper rounded-xl px-3 py-2 text-xs">
                    <svg className="w-4 h-4 text-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span className="truncate text-ink">{d.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Web results panel */}
        {webResults.length > 0 && (
          <div className="bg-white border border-stroke rounded-2xl p-4 mb-4 animate-fade-in shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-ink text-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
                نتایج جستجوی وب
              </h3>
              <button onClick={() => setWebResults([])} className="text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-ink/[0.03] transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {webResults.map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noopener" className="block group bg-paper rounded-xl px-3 py-2.5 hover:bg-gold/5 transition-colors">
                  <p className="text-sm font-bold text-ink group-hover:text-gold transition-colors truncate">{r.title}</p>
                  <p className="text-xs text-ink-muted line-clamp-2 mt-0.5">{r.snippet}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin py-4">
          {messages.length === 0 && (
            <div className="text-center py-24 animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-gold/15 to-gold/5 flex items-center justify-center mx-auto mb-6 animate-float">
                <svg className="w-8 h-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <h2 className="text-xl font-extrabold text-ink mb-2">هر سوالی داری بپرس</h2>
              <p className="text-ink-secondary text-sm max-w-sm mx-auto leading-7">
                پاسخ‌ها بر اساس اسناد آپلود شده و منابع معتبر ارائه می‌شن.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <ChatMessage key={m.id} role={m.role} content={m.content} sources={(m as any).sources} />
          ))}
          {sending && (
            <div className="flex gap-2 py-4 px-2 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse-dot" style={{ animationDelay: '0s' }} />
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
              <span className="w-2 h-2 rounded-full bg-gold animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="sticky bottom-0 pt-2 pb-1 bg-paper">
          <ChatInput
            onSend={send}
            loading={sending}
            searchActive={searchActive}
            onSearchToggle={() => setSearchActive(!searchActive)}
          />
        </div>
      </main>
    </div>
  );
}
