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

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [models, setModels] = useState<any[]>([]);
  const [model, setModel] = useState('gpt-4o-mini');
  const [refreshKey, setRefreshKey] = useState(0);
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

  // Check for pending query from hero page
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
  };

  const send = async (text: string) => {
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
          <div>
            <h1 className="text-lg font-extrabold text-ink flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-gold/10 flex items-center justify-center text-gold text-sm">د</span>
              دستیار
            </h1>
          </div>
          <ModelSelector models={models} value={model} onChange={setModel} />
        </header>

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
                از بخش «اسناد من» فایل اضافه کن.
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
          <ChatInput onSend={send} loading={sending} />
        </div>
      </main>
    </div>
  );
}
