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
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-lapis relative overflow-hidden">
        <div className="absolute inset-0 girih-pattern opacity-[0.04]" />
        <div className="relative max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gold/20 flex items-center justify-center">
              <span className="text-gold text-xl font-extrabold">د</span>
            </div>
            <span className="text-white text-lg font-extrabold tracking-tight">دستیار</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/" className="btn-primary !py-2.5 !px-5 text-sm">
                وارد شو
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-white/70 hover:text-white text-sm font-medium transition-colors">
                  ورود
                </Link>
                <Link href="/register" className="btn-primary !py-2.5 !px-5 text-sm">
                  ثبت‌نام رایگان
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-lapis relative overflow-hidden pb-20 pt-8">
        <div className="absolute inset-0 girih-pattern opacity-[0.03]" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-gold/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="text-white/70 text-xs font-medium">موتور پاسخ‌گوی هوش مصنوعی فارسی</span>
          </div>

          <h1 className="text-white text-4xl md:text-5xl font-extrabold leading-tight mb-4 animate-slide-up">
            جواب سوالاتت رو
            <br />
            <span className="text-gold">با منابع معتبر</span> بگیر
          </h1>

          <p className="text-white/50 text-lg mb-10 max-w-xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            از مقاله و کتاب تا آخرین تحقیقات — همه رو یکجا جستجو کن
          </p>

          {/* Search box */}
          <div
            className={`relative max-w-2xl mx-auto transition-all duration-300 ${
              focused ? 'scale-[1.02]' : 'scale-100'
            }`}
          >
            <div className={`bg-white rounded-3xl shadow-lg transition-all duration-300 ${
              focused ? 'shadow-xl ring-2 ring-gold/30' : 'shadow-card'
            }`}>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-ink-muted mr-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="سوالت رو بپرس..."
                  className="flex-1 py-4 text-lg bg-transparent text-ink placeholder-ink-muted focus:outline-none"
                />
                <button
                  onClick={handleSearch}
                  disabled={!query.trim()}
                  className="ml-3 mr-2 px-6 py-3 rounded-2xl bg-gold hover:bg-gold-hover text-white font-bold text-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  جستجو
                </button>
              </div>
            </div>
          </div>

          {/* Examples */}
          <div className="mt-6 flex flex-wrap justify-center gap-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <span className="text-white/30 text-xs ml-1 self-center">مثال:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => { setQuery(ex); }}
                className="text-xs text-white/40 hover:text-gold bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl transition-all duration-200"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Girih divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-ink mb-3">چرا دستیار؟</h2>
            <p className="text-ink-secondary max-w-md mx-auto">
              پاسخ‌های دقیق‌تر، با منابع مشخص، بر اساس اسناد خودت
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                ),
                title: 'پاسخ مستند',
                desc: 'هر پاسخ با منابع و استناد مشخص ارائه می‌شه تا بتونی تأییدش کنی',
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                ),
                title: 'چند مدل هوش مصنوعی',
                desc: 'از GPT-4o تا Claude و Gemini — مدلی که مناسب کارت هست رو انتخاب کن',
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
                className="card hover:shadow-card-hover transition-all duration-300 group"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center text-gold mb-4 group-hover:bg-gold/20 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-lg font-extrabold text-ink mb-2">{f.title}</h3>
                <p className="text-ink-secondary text-sm leading-7">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stroke py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-ink-muted text-sm">دستیار — موتور پاسخ‌گوی هوش مصنوعی</span>
          <Link href="/plans" className="text-gold text-sm hover:underline">پلن‌های اشتراک</Link>
        </div>
      </footer>
    </div>
  );
}
