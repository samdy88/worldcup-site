'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LeaderboardEntry {
  id: number;
  username: string;
  balance: number;
  unsettled_bets_value: number;
  total_assets: number;
}

export default function LeaderboardClient() {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/leaderboard').then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.ok ? r.json() : null),
    ]).then(([lbData, userData]) => {
      setData(lbData.leaderboard || []);
      if (userData?.user?.id) setCurrentUserId(userData.user.id);
    }).catch(() => {
      setError('加载失败，请刷新重试');
    }).finally(() => setLoading(false));
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-3 animate-bounce">🏆</div>
        <p className="text-white/50">加载排行榜...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">😔</div>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-3xl font-bold text-white flex items-center justify-center gap-2">
          🏆 排行榜
        </h1>
        <p className="text-white/40 text-xs sm:text-sm mt-1">谁是竞猜之王？</p>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🏆</div>
          <p className="text-white/40">暂无数据</p>
          <p className="text-white/20 text-sm mt-1">等待玩家加入</p>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {data.length >= 3 && (
            <div className="flex items-end justify-center gap-2 sm:gap-3 mb-6 sm:mb-8">
              {/* 2nd place */}
              <div className="text-center">
                <div className="text-2xl sm:text-3xl mb-1">🥈</div>
                <Link href={'/players/' + data[1].id} className="glass-card block px-3 sm:px-4 pt-2.5 sm:pt-3 pb-3 sm:pb-4 border-gray-400/20 w-24 sm:w-28 hover:border-gray-300/40 hover:bg-white/10 transition-all">
                  <p className="text-white font-bold text-xs sm:text-sm truncate">{data[1].username}</p>
                  <p className="text-white/50 text-[10px] sm:text-xs mt-1">${data[1].total_assets.toFixed(0)}</p>
                  <p className="text-white/25 text-[9px] sm:text-[10px] mt-0.5">查看档案</p>
                </Link>
              </div>
              {/* 1st place */}
              <div className="text-center">
                <div className="text-3xl sm:text-4xl mb-1">🥇</div>
                <Link href={'/players/' + data[0].id} className="glass-card block px-4 sm:px-5 pt-3 sm:pt-4 pb-4 sm:pb-5 border-gold/30 w-28 sm:w-32 hover:border-gold/50 hover:bg-gold/10 transition-all">
                  <p className="text-gold font-bold text-sm sm:text-base truncate">{data[0].username}</p>
                  <p className="text-gold/70 text-xs sm:text-sm mt-1 font-bold">${data[0].total_assets.toFixed(0)}</p>
                  <p className="text-gold/35 text-[9px] sm:text-[10px] mt-0.5">查看档案</p>
                </Link>
              </div>
              {/* 3rd place */}
              <div className="text-center">
                <div className="text-2xl sm:text-3xl mb-1">🥉</div>
                <Link href={'/players/' + data[2].id} className="glass-card block px-3 sm:px-4 pt-2 pb-2.5 sm:pb-3 border-amber-700/20 w-24 sm:w-28 hover:border-amber-500/40 hover:bg-white/10 transition-all">
                  <p className="text-white font-bold text-xs sm:text-sm truncate">{data[2].username}</p>
                  <p className="text-white/50 text-[10px] sm:text-xs mt-1">${data[2].total_assets.toFixed(0)}</p>
                  <p className="text-white/25 text-[9px] sm:text-[10px] mt-0.5">查看档案</p>
                </Link>
              </div>
            </div>
          )}

          {/* Full ranking list - card style on mobile, table on desktop */}
          {/* Mobile: card layout */}
          <div className="sm:hidden space-y-2">
            {data.map((entry, idx) => {
              const isMe = entry.id === currentUserId;
              return (
                <Link
                  key={entry.id}
                  href={'/players/' + entry.id}
                  className={`glass-card flex items-center gap-3 px-3 py-2.5 transition-all active:bg-white/10 ${
                    isMe ? 'border-blue-500/30 bg-blue-500/10' : ''
                  }`}
                >
                  <div className="shrink-0 w-8 text-center">
                    {idx < 3 ? (
                      <span className="text-lg">{medals[idx]}</span>
                    ) : (
                      <span className="text-white/40 text-sm">{idx + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${isMe ? 'text-gold' : 'text-white'}`}>
                      {entry.username}
                      {isMe && <span className="text-[10px] text-gold/60 ml-1">(我)</span>}
                    </p>
                    <p className="text-white/30 text-[10px]">持仓 ${entry.unsettled_bets_value.toFixed(0)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white font-bold text-sm">${entry.total_assets.toFixed(0)}</p>
                    <p className="text-white/25 text-[9px]">总资产</p>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop: table layout */}
          <div className="hidden sm:block glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-white/40 font-medium px-4 py-3 w-16">排名</th>
                    <th className="text-left text-white/40 font-medium px-4 py-3">用户名</th>
                    <th className="text-right text-white/40 font-medium px-4 py-3">余额</th>
                    <th className="text-right text-white/40 font-medium px-4 py-3 hidden sm:table-cell">持仓市值</th>
                    <th className="text-right text-white/40 font-medium px-4 py-3">总资产</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((entry, idx) => {
                    const isMe = entry.id === currentUserId;
                    const rowColors = [
                      'bg-gold/15 border-gold/30',
                      'bg-gray-400/10 border-gray-400/20',
                      'bg-amber-700/10 border-amber-700/20',
                    ];
                    const topStyle = idx < 3 ? rowColors[idx] : '';
                    return (
                      <tr
                        key={entry.id}
                        className={`border-b border-white/5 transition-colors hover:bg-white/5 ${
                          isMe ? 'bg-blue-500/15 border-blue-500/30' : topStyle
                        }`}
                      >
                        <td className="px-4 py-3">
                          {idx < 3 ? (
                            <span className="text-lg">{medals[idx]}</span>
                          ) : (
                            <span className="text-white/40">{idx + 1}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={'/players/' + entry.id} className={`font-medium hover:underline underline-offset-4 ${isMe ? 'text-gold' : 'text-white'}`}>
                            {entry.username}
                            {isMe && <span className="text-xs text-gold/60 ml-1">(我)</span>}
                            <span className="text-[10px] text-white/25 ml-2">查看</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right text-white/70">${entry.balance.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-white/50 hidden sm:table-cell">
                          ${entry.unsettled_bets_value.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-white">
                          ${entry.total_assets.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
