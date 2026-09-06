'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const EXAMPLES = [
  'تفاوت TCP و UDP چیست؟',
  'الگوریتم مرتب‌سازی سریع را توضیح بده',
  'قضیه پیthagoras چیست؟',
  'هوش مصنوعی چطور کار می‌کند؟',
];

export default function Hero() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/chat');
  }, [user, loading, router]);

  const handleSearch = () => {
    if (!query.trim()) return;
    if (user) {
      router.push(`/chat?q=${encodeURIComponent(query)}`);
    } else {
      sessionStorage.setItem('pendingQuery', query);
      router.push('/register');
    }
  };

  return (
    <div className="min-h-screen bg-lapis">
      {/* Header */}
      <header className="relative z-10">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gold to-gold-hover flex items-center justify-center shadow-lg shadow-gold/20 group-hover:shadow-gold/40 transition-shadow">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <span className="text-white text-lg font-extrabold tracking-tight block leading-none">دستیار</span>
              <span className="text-gold/60 text-[10px] font-medium leading-none"> هوش مصنوعی فارسی</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/chat" className="btn-primary !py-2.5 !px-5 text-sm">
                وارد شو
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-white/50 hover:text-white text-sm font-medium transition-colors px-3 py-2">
                  ورود
                </Link>
                <Link href="/register" className="btn-primary !py-2.5 !px-5 text-sm">
                  شروع رایگان
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pb-24 pt-16">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gold/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2.5 bg-white/[0.06] border border-white/[0.08] rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/50 text-xs font-medium">موتور پاسخ‌گوی هوش مصنوعی فارسی</span>
          </div>

          {/* Headline */}
          <h1 className="text-white text-4xl md:text-[52px] font-extrabold leading-[1.2] mb-6 tracking-tight">
            جواب سوالاتت رو
            <br />
            <span className="bg-gradient-to-l from-gold via-gold-light to-gold bg-clip-text text-transparent">با منابع معتبر</span> بگیر
          </h1>

          <p className="text-white/40 text-lg mb-12 max-w-lg mx-auto leading-7">
            از مقاله و کتاب تا آخرین تحقیقات — همه رو یکجا جستجو کن
          </p>

          {/* Search box */}
          <div className={`relative max-w-2xl mx-auto transition-all duration-300 ${focused ? 'scale-[1.01]' : ''}`}>
            <div className={`bg-white/[0.07] backdrop-blur-xl border border-white/[0.1] rounded-3xl transition-all duration-300 ${focused ? 'border-gold/30 bg-white/[0.1] shadow-2xl shadow-gold/5' : ''}`}>
              <div className="flex items-center px-5">
                <svg className="w-5 h-5 text-white/25 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="سوالت رو بپرس..."
                  className="flex-1 py-5 text-lg bg-transparent text-white placeholder-white/30 focus:outline-none"
                />
                <button
                  onClick={handleSearch}
                  disabled={!query.trim()}
                  className="shrink-0 px-6 py-3 rounded-2xl bg-gold hover:bg-gold-hover text-white font-bold text-sm transition-all duration-200 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  جستجو
                </button>
              </div>
            </div>
          </div>

          {/* Examples */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setQuery(ex)}
                className="text-xs text-white/30 hover:text-gold bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-gold/20 px-4 py-2 rounded-xl transition-all duration-200"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-white mb-3">چرا دستیار؟</h2>
            <p className="text-white/40 max-w-md mx-auto">
              پاسخ‌های دقیق‌تر، با منابع مشخص، بر اساس اسناد خودت
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                ),
                title: 'پاسخ مستند',
                desc: 'هر پاسخ با منابع و استناد مشخص ارائه میشه تا بتونی تأییدش کنی',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                ),
                title: 'چند مدل هوش مصنوعی',
                desc: 'از Qwen تا GPT — مدلی که مناسب کارت هست رو انتخاب کن',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                ),
                title: 'اسناد خودت',
                desc: 'فایل‌های PDF، Word و متنی خودت رو آپلود کن تا بر اساس اونا پاسخ بگیری',
              },
            ].map((f, i) => (
              <div
                key={f.title}
                className="group bg-white/[0.04] border border-white/[0.06] hover:border-gold/20 hover:bg-white/[0.07] rounded-3xl p-7 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center text-gold mb-5 group-hover:bg-gold/20 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-white font-bold text-base mb-2">{f.title}</h3>
                <p className="text-white/35 text-sm leading-7">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-white/20 text-sm">دستیار — موتور پاسخ‌گوی هوش مصنوعی</span>
          <Link href="/plans" className="text-gold/60 hover:text-gold text-sm transition-colors">پلن‌های اشتراک</Link>
        </div>
      </footer>
    </div>
  );
}
