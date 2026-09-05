'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'ورود ناموفق بود');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-lapis relative overflow-hidden flex items-center justify-center px-4">
      <div className="absolute inset-0 girih-pattern opacity-[0.03]" />
      <div className="absolute top-20 left-20 w-80 h-80 bg-gold/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-20 w-60 h-60 bg-gold/5 rounded-full blur-3xl" />

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gold/20 flex items-center justify-center">
              <span className="text-gold text-2xl font-extrabold">د</span>
            </div>
          </Link>
          <h1 className="text-white text-3xl font-extrabold mb-2">خوش آمدی</h1>
          <p className="text-white/40 text-sm">برای ادامه وارد حساب شو</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 shadow-xl">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-ink mb-2">ایمیل</label>
              <input
                type="email"
                className="input-field"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink mb-2">رمز عبور</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
                autoComplete="current-password"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  در حال ورود...
                </span>
              ) : 'ورود'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-stroke text-center">
            <span className="text-ink-secondary text-sm">حساب نداری؟ </span>
            <Link href="/register" className="text-gold font-bold text-sm hover:underline">
              ثبت‌نام رایگان
            </Link>
          </div>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          با ورود، <span className="text-white/30">شرایط استفاده</span> رو می‌پذیری
        </p>
      </div>
    </div>
  );
}
