'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface UserInfo {
  id: number;
  username: string;
  balance: number;
  is_admin: number;
}

export default function Navbar() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const pathname = usePathname();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser, pathname]);

  // Hide navbar on login page
  if (pathname === '/login') return null;

  const navItems = [
    { href: '/', label: '首页', icon: HomeIcon, active: pathname === '/' },
    { href: '/leaderboard', label: '排行', icon: TrophyIcon, active: pathname === '/leaderboard' },
    { href: '/profile', label: '投注', icon: ClipboardIcon, active: pathname === '/profile' },
  ];

  if (user?.is_admin === 1) {
    navItems.push({ href: '/admin', label: '管理', icon: GearIcon, active: pathname === '/admin' });
  }

  return (
    <>
      {/* ── Desktop top nav (hidden on mobile) ──────────── */}
      <nav className="hidden md:block sticky top-0 z-50 bg-pitch-dark/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <span className="text-2xl">⚽</span>
              <span className="text-lg font-bold text-gold tracking-tight">体育竞猜</span>
            </Link>

            <div className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    item.active
                      ? 'bg-gold/20 text-gold font-medium'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {user && (
              <div className="flex items-center gap-3">
                <div className="text-sm text-white/70">
                  <span className="text-white font-medium">{user.username}</span>
                  <span className="mx-1.5">·</span>
                  <span className="text-gold font-bold">${user.balance.toFixed(2)}</span>
                </div>
                <button
                  onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login'; }}
                  className="px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
                >
                  退出
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Mobile top bar (compact user info) ──────────── */}
      <div className="md:hidden sticky top-0 z-50 bg-pitch-dark/80 backdrop-blur-xl border-b border-white/10 safe-top">
        <div className="flex items-center justify-between h-12 px-4">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-xl">⚽</span>
            <span className="text-sm font-bold text-gold">体育竞猜</span>
          </Link>
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50">{user.username}</span>
              <span className="text-xs font-bold text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                ${user.balance.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile bottom nav (App-style) ───────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-pitch-dark/95 backdrop-blur-xl border-t border-white/10 bottom-nav">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors ${
                  item.active ? 'text-gold' : 'text-white/40 active:text-white/60'
                }`}
              >
                <Icon active={item.active} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          {/* Logout as last item */}
          {user && (
            <button
              onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = '/login'; }}
              className="flex flex-col items-center justify-center gap-0.5 w-16 h-full text-white/25 active:text-white/50 transition-colors"
            >
              <LogoutIcon />
              <span className="text-[10px]">退出</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}

/* ── Inline SVG icons (no external deps) ─────────────── */

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function TrophyIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-4.5A3.375 3.375 0 0019.875 10.875 3.375 3.375 0 0016.5 7.5H16.5V3.75h-9V7.5H7.5A3.375 3.375 0 004.125 10.875 3.375 3.375 0 007.5 14.25v4.5m9-12v1.5m-9-1.5v1.5" />
    </svg>
  );
}

function ClipboardIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  );
}

function GearIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 0 : 1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  );
}
