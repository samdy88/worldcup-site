'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedDisclaimer, setAgreedDisclaimer] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '操作失败');
        return;
      }

      window.location.href = '/';
    } catch {
      setError('网络错误，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center pitch-pattern px-4 py-8">
      <div className="glass-card border-gold/20 p-6 sm:p-8 w-full max-w-md mx-auto animate-slide-up">
        {/* Decorative top bar */}
        <div className="h-1 bg-gradient-to-r from-gold-dark via-gold to-gold-light rounded-t-xl -mt-6 sm:-mt-8 -mx-6 sm:-mx-8 mb-5 sm:mb-6" />

        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">⚽ 体育竞猜</h1>
          <p className="text-gold/60 text-sm">2026 FIFA 世界杯 · 欧冠</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/50 text-sm font-medium mb-1.5">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all"
              placeholder="输入用户名"
              required
              minLength={3}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-white/50 text-sm font-medium mb-1.5">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-all"
              placeholder="输入密码"
              required
              minLength={6}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
            />
          </div>

          {error && (
            <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-4 py-2.5 text-red-300 text-sm">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (isRegister && !agreedDisclaimer)}
            className="w-full btn-gold py-3.5 text-base"
          >
            {loading ? '处理中...' : isRegister ? '注册账号' : '登录'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-white/40 hover:text-gold text-sm transition-colors active:text-gold/80"
          >
            {isRegister ? '已有账号？点击登录' : '没有账号？点击注册'}
          </button>
        </div>

        {/* Disclaimer notice */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5 mb-3">
            <p className="text-amber-200/70 text-[10px] sm:text-[11px] leading-relaxed text-center">
              ⚠️ 本平台为<strong className="text-amber-200/90">纯虚拟模拟器</strong>，
              所有「货币」仅供娱乐，<strong className="text-amber-200/90">无任何真实价值</strong>，
              不涉及真实金钱交易、赌博或金融活动。
            </p>
          </div>
          {isRegister && (
            <label className="flex items-start gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreedDisclaimer}
                onChange={(e) => setAgreedDisclaimer(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-amber-500/50 bg-white/10 text-amber-500 focus:ring-amber-500/50 accent-amber-500 shrink-0"
              />
              <span className="text-white/40 text-[10px] sm:text-[11px] leading-relaxed group-hover:text-white/50">
                我已阅读并同意
                <a href="/disclaimer" target="_blank" className="text-amber-300/70 hover:text-amber-300 underline underline-offset-2 mx-0.5">
                  《免责声明》
                </a>
                ，确认本平台为纯虚拟模拟器，不涉及真实金钱。
              </span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
