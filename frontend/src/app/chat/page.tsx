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
  const [searching, setSearching] = useState(false);
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

  const searchWeb = async (query: string) => {
    setSearching(true);
    try {
      const d = await api.search(query);
      setWebResults(d.results || []);
    } catch { setWebResults([]); }
    setSearching(false);
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

    if (searchActive) {
      const searchQuery = text.replace(/جستجو|search|گوگل|google|وب|web|اینترنت|internet|پیدا کن|پیدا کردن/gi, '').trim() || text;
      searchWeb(searchQuery);
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
        (results) => setWebResults(results)
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
            <h1 className="text-lg font-extrabold text-ink flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gold/10 flex items-center justify-center text-gold text-sm">د</span>
              دستیار
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleDocs} className={`p-2 rounded-xl transition-all ${showDocs ? 'bg-gold/20 text-gold' : 'text-ink-muted hover:text-ink hover:bg-ink/5'}`} title="اسناد من">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </button>
            <ModelSelector models={models} value={model} onChange={setModel} />
          </div>
        </header>

        {/* Documents Panel */}
        {showDocs && (
          <div className="bg-white border border-stroke rounded-2xl p-4 mb-4 animate-fade-in shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-ink text-sm">اسناد من</h3>
              <Link href="/documents" className="text-xs text-gold hover:underline">مدیریت کامل</Link>
            </div>
            {docs.length === 0 ? (
              <p className="text-ink-muted text-xs py-3 text-center">هنوز سندی آپلود نشده</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {docs.filter(d => d.status === 'ready').map((d) => (
                  <div key={d.id} className="flex items-center gap-2 bg-paper rounded-xl px-3 py-2 text-xs">
                    <svg className="w-4 h-4 text-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <span className="truncate text-ink">{d.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Web Results */}
        {webResults.length > 0 && (
          <div className="bg-white border border-stroke rounded-2xl p-4 mb-4 animate-fade-in shadow-sm">
            <h3 className="font-bold text-ink text-sm mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
              نتایج جستجوی وب
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {webResults.map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noopener" className="block group">
                  <p className="text-sm font-bold text-ink group-hover:text-gold transition-colors truncate">{r.title}</p>
                  <p className="text-xs text-ink-muted line-clamp-2">{r.snippet}</p>
                  <p className="text-xs text-blue-500/60 truncate mt-0.5">{r.url}</p>
                </a>
              ))}
            </div>
            <button onClick={() => setWebResults([])} className="text-xs text-ink-muted hover:text-ink mt-2">بستن</button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-thin py-4">
          {messages.length === 0 && (
            <div className="text-center py-20 animate-fade-in">
              <div className="w-16 h-16 rounded-3xl bg-gold/10 flex items-center justify-center mx-auto mb-5 animate-float">
                <svg className="w-8 h-8 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-ink mb-2">هر سوالی داری بپرس</h2>
              <p className="text-ink-secondary text-sm max-w-sm mx-auto leading-7">
                پاسخ‌ها بر اساس اسناد آپلود شده و منابع معتبر ارائه می‌شن.
                <br />
                برای جستجوی وب کلمه «جستجو» یا «search» رو سوال اضافه کن.
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
          {searching && (
            <div className="flex items-center gap-2 py-2 px-3 text-xs text-blue-500 animate-fade-in">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              در حال جستجوی وب...
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
