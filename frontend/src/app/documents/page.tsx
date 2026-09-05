'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface Doc {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  status: string;
  chunkCount: number;
  createdAt: string;
}

export default function Documents() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const refresh = () => api.documents.list().then((d) => setDocs(d.documents || [])).catch(() => {});

  useEffect(() => { if (user) refresh(); }, [user]);

  const upload = async () => {
    if (!text.trim() || !fileName.trim()) { setMsg('متن و نام فایل لازم است'); return; }
    setUploading(true); setMsg('');
    try {
      const res = await api.documents.upload({ content: text, fileName, fileType: 'text/plain' });
      setMsg('آپلود شد! در حال پردازش...');
      setText(''); setFileName('');
      refresh();
      const id = res.document.id;
      const timer = setInterval(async () => {
        try {
          const s = await api.documents.status(id);
          if (s.status === 'ready' || s.status === 'error') { clearInterval(timer); refresh(); }
        } catch { clearInterval(timer); }
      }, 3000);
    } catch (e: any) {
      setMsg('خطا: ' + e.message);
    } finally { setUploading(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('حذف شود؟')) return;
    try { await api.documents.delete(id); refresh(); } catch {}
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><span className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/chat" className="inline-flex items-center gap-1.5 text-ink-secondary hover:text-ink text-sm mb-6 transition-colors">
          <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
          بازگشت به چت
        </Link>

        <h1 className="text-2xl font-extrabold text-ink mb-1">اسناد من</h1>
        <p className="text-ink-secondary text-sm mb-8">فایل‌هایی که آپلود می‌کنی، مبنای پاسخ‌های دستیار قرار می‌گیرن</p>

        {/* Upload */}
        <div className="card mb-8">
          <h2 className="font-extrabold text-ink mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
            افزودن سند جدید
          </h2>
          <input
            className="input-field mb-3"
            placeholder="نام فایل (مثلاً: جزوه-ریاضی)"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
          />
          <textarea
            className="input-field mb-4"
            rows={5}
            placeholder="متن سند را اینجا بچسبان..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button onClick={upload} disabled={uploading} className="btn-primary">
            {uploading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                در حال آپلود...
              </span>
            ) : 'آپلود و ایندکس'}
          </button>
          {msg && <p className="text-sm text-ink-secondary mt-3">{msg}</p>}
        </div>

        {/* List */}
        <h2 className="font-extrabold text-ink mb-4">لیست اسناد</h2>
        <div className="space-y-3">
          {docs.length === 0 && (
            <div className="card text-center py-10">
              <svg className="w-10 h-10 text-ink-muted mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="text-ink-secondary text-sm">هنوز سندی آپلود نکرده‌ای</p>
            </div>
          )}
          {docs.map((d) => (
            <div key={d.id} className="card !p-4 flex items-center justify-between group">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  d.status === 'ready' ? 'bg-green-50 text-green-600' :
                  d.status === 'error' ? 'bg-red-50 text-red-500' :
                  'bg-gold/10 text-gold'
                }`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-ink text-sm truncate">{d.title}</p>
                  <p className="text-xs text-ink-muted">
                    {d.status === 'ready' ? `✓ آماده — ${d.chunkCount} تکه` :
                     d.status === 'error' ? '✕ خطا در پردازش' :
                     '⏳ در حال پردازش...'}
                  </p>
                </div>
              </div>
              <button onClick={() => remove(d.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs transition-all px-2 py-1">
                حذف
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
