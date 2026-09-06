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
    <div className="flex flex-col h-full w-72 bg-[#0c1426] text-white">
      {/* Brand */}
      <div className="p-4">
        <Link href="/" className="flex items-center gap-3 group mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c9a44e] to-[#a8843f] flex items-center justify-center shadow-lg shadow-[#c9a44e]/20 group-hover:shadow-[#c9a44e]/40 transition-shadow">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-[15px] leading-tight">دستیار</span>
            <span className="text-[10px] text-white/25 leading-tight">Dastyar AI</span>
          </div>
        </Link>

        <button
          onClick={() => { onNew(); setMobileOpen(false); }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] hover:border-white/[0.15] text-white/70 hover:text-white font-bold text-sm transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          گفتگوی جدید
        </button>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/[0.06]" />

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3">
        {conversations.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-8 h-8 text-white/10 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.194-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
            <p className="text-white/15 text-xs">هنوز گفتگویی نداری</p>
          </div>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            onClick={() => { onSelect(c.id); setMobileOpen(false); }}
            className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 mb-0.5 ${
              currentId === c.id
                ? 'bg-white/[0.08] text-white'
                : 'text-white/35 hover:bg-white/[0.04] hover:text-white/55'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {currentId === c.id && (
                <span className="w-1 h-1 rounded-full bg-[#c9a44e] shrink-0" />
              )}
              <svg className="w-4 h-4 shrink-0 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
              <span className="truncate text-[13px]">{c.title || 'گفتگوی جدید'}</span>
            </div>
            <button
              onClick={(e) => handleDelete(c.id, e)}
              className="opacity-0 group-hover:opacity-100 text-white/10 hover:text-red-400 p-1 rounded-lg hover:bg-white/[0.06] transition-all shrink-0 ml-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div className="p-3 border-t border-white/[0.06]">
        {/* Nav links */}
        <div className="flex gap-1 mb-3">
          <Link href="/documents" onClick={() => setMobileOpen(false)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-white/30 hover:bg-white/[0.05] hover:text-white/50 text-xs transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            اسناد
          </Link>
          <Link href="/plans" onClick={() => setMobileOpen(false)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-white/30 hover:bg-white/[0.05] hover:text-white/50 text-xs transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
            اشتراک
          </Link>
        </div>

        {/* User row */}
        <div className="flex items-center justify-between bg-white/[0.03] rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#c9a44e]/20 to-[#c9a44e]/10 flex items-center justify-center text-[#c9a44e] text-xs font-bold shrink-0">
              {(user?.name || user?.email || '?')[0]}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-white/60 font-medium truncate max-w-[100px]">{user?.name || user?.email}</span>
              <span className="text-[10px] text-white/20 truncate max-w-[100px]">{user?.email}</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={toggle} className="p-2 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-all" title="تم">
              {dark ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
              )}
            </button>
            <button onClick={logout} className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-white/[0.06] transition-all" title="خروج">
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
        className="md:hidden fixed top-4 right-4 z-50 w-10 h-10 rounded-xl bg-[#0c1426] flex items-center justify-center text-white/70 shadow-lg border border-white/[0.08] hover:bg-[#142038] transition-colors"
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
