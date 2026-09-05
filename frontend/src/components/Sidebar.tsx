'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface Conversation {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
}

export default function Sidebar({
  currentId,
  onSelect,
  onNew,
  refreshKey,
}: {
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  refreshKey: number;
}) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.conversations.list().then((d) => setConversations(d.conversations || [])).catch(() => {});
  }, [user, refreshKey]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('این گفتگو حذف شود؟')) return;
    try {
      await api.conversations.delete(id);
      setConversations((c) => c.filter((x) => x.id !== id));
      if (currentId === id) onNew();
    } catch {}
  };

  const sidebarContent = (
    <div className="flex flex-col h-full w-72 bg-lapis text-white">
      {/* Header */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gold/20 flex items-center justify-center">
              <span className="text-gold text-lg font-extrabold">د</span>
            </div>
            <span className="font-extrabold text-base">دستیار</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-white/40 hover:text-white p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <button onClick={() => { onNew(); setMobileOpen(false); }} className="w-full py-3 rounded-2xl bg-gold hover:bg-gold-hover text-white font-bold text-sm transition-all duration-200 shadow-sm">
          + گفتگوی جدید
        </button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-1">
        {conversations.length === 0 && (
          <p className="text-center text-white/20 text-xs py-10">هنوز گفتگویی نداری</p>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            onClick={() => { onSelect(c.id); setMobileOpen(false); }}
            className={`group flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer text-sm transition-all duration-150 mb-0.5 ${
              currentId === c.id
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:bg-white/5 hover:text-white/70'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {currentId === c.id && <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />}
              <span className="truncate">{c.title || 'گفتگوی جدید'}</span>
            </div>
            <button
              onClick={(e) => handleDelete(c.id, e)}
              className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 px-1 transition-opacity shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 space-y-2">
        <Link href="/documents" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white/50 hover:bg-white/5 hover:text-white/70 text-sm transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          اسناد من
        </Link>
        <Link href="/plans" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white/50 hover:bg-white/5 hover:text-white/70 text-sm transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
          اشتراک
        </Link>

        <div className="flex items-center justify-between pt-2 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gold/20 flex items-center justify-center text-gold text-xs font-bold shrink-0">
              {(user?.name || user?.email || '?')[0]}
            </div>
            <span className="text-xs text-white/40 truncate">{user?.name || user?.email}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggle} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all" title="تم">
              {dark ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
              )}
            </button>
            <button onClick={() => { logout(); }} className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/5 transition-all" title="خروج">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 right-4 z-50 w-10 h-10 rounded-xl bg-lapis flex items-center justify-center text-white shadow-lg"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Desktop */}
      <aside className="hidden md:block h-screen sticky top-0 shrink-0">{sidebarContent}</aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="h-full animate-slide-up">{sidebarContent}</div>
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
