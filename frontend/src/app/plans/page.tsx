'use client';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const PLANS = [
  {
    name: 'رایگان',
    price: '۰',
    period: '',
    features: ['۱۰ سوال در روز', 'مدل GPT-4o Mini', 'آپلود ۳ سند', 'پشتیبانی ایمیلی'],
    cta: 'شروع رایگان',
    highlight: false,
    href: '/register',
  },
  {
    name: 'پرو',
    price: '۹۹٬۰۰۰',
    period: '/ماه',
    features: ['سوال نامحدود', 'GPT-4o, Claude, Gemini', 'آپلود نامحدود سند', 'پشتیبانی اولویت‌دار', 'تاریخچه گفتگو'],
    cta: 'به‌زودی',
    highlight: true,
    href: '#',
  },
  {
    name: 'پرو سالانه',
    price: '۹۹۰٬۰۰۰',
    period: '/سال',
    features: ['همه امکانات پرو', '۲ ماه اشتراک رایگان', 'پشتیبانی اختصاصی', 'API دسترسی'],
    cta: 'به‌زودی',
    highlight: false,
    href: '#',
  },
];

export default function Plans() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Link href="/chat" className="inline-flex items-center gap-1.5 text-ink-secondary hover:text-ink text-sm mb-6 transition-colors">
            <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
            بازگشت
          </Link>
          <div className="inline-flex items-center gap-2 bg-gold/10 rounded-full px-4 py-1.5 mb-4">
            <svg className="w-4 h-4 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="text-gold text-xs font-bold">پرداخت از طریق زرین‌پال — به‌زودی</span>
          </div>
          <h1 className="text-3xl font-extrabold text-ink mb-3">پلن اشتراکت رو انتخاب کن</h1>
          <p className="text-ink-secondary max-w-md mx-auto">
            از رایگان شروع کن، هر وقت به امکانات بیشتر نیاز داشتی ارتقا بده
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 items-start">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`card relative transition-all duration-300 ${
                p.highlight
                  ? 'ring-2 ring-gold shadow-glow scale-[1.02]'
                  : 'hover:shadow-card-hover'
              }`}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold text-white text-[10px] font-bold rounded-full px-3 py-1">
                  پیشنهاد ما
                </div>
              )}
              <div className="text-center pt-2 pb-1">
                <h2 className="text-lg font-extrabold text-ink">{p.name}</h2>
                <div className="mt-3 mb-1">
                  <span className="text-3xl font-extrabold text-ink">{p.price}</span>
                  <span className="text-sm text-ink-secondary mr-1">تومان{p.period}</span>
                </div>
              </div>
              <div className="border-t border-stroke my-4" />
              <ul className="space-y-3 mb-6">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-ink-secondary">
                    <svg className="w-4 h-4 text-gold shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              {user ? (
                <Link
                  href={p.href}
                  className={`block text-center ${p.highlight ? 'btn-primary' : 'btn-outline'}`}
                >
                  {p.cta}
                </Link>
              ) : (
                <Link href="/register" className={`block text-center ${p.highlight ? 'btn-primary' : 'btn-outline'}`}>
                  {p.name === 'رایگان' ? 'شروع کن' : p.cta}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
