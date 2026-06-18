'use client';

import { useState, useEffect } from 'react';
import { priceToOdds, formatTime as fmtTime, getMarketLabel } from '@/lib/utils';
import TeamIdentity from '@/components/TeamIdentity';
import { formatMarketOptionLabel } from '@/lib/marketDisplay';

interface Bet {
  id: number;
  amount: number;
  shares: number;
  price_at_bet: number;
  created_at: string;
  option: { id: number; label: string };
  market: { id: number; type: string; description: string; settled: boolean; winning_option: string | null };
  match: { id: number; home_team: string; away_team: string; round_name: string; status: string };
  status: 'pending' | 'won' | 'lost';
  estimated_payout: number;
}

interface UserInfo {
  username: string;
  balance: number;
}

export default function ProfileClient() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'unsettled' | 'settled'>('unsettled');

  useEffect(() => {
    Promise.all([
      fetch('/api/bets').then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.ok ? r.json() : null),
    ]).then(([betData, userData]) => {
      setBets(betData.bets || []);
      if (userData?.user) {
        setUser({ username: userData.user.username, balance: userData.user.balance });
      }
    }).catch(() => {
      setError('加载失败，请刷新重试');
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-3 animate-bounce">📋</div>
        <p className="text-white/50">加载投注记录...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">😔</div>
        <p className="text-red-400 mb-4">{error}</p>
      </div>
    );
  }

  const unsettled = bets.filter((b) => b.status === 'pending');
  const settled = bets.filter((b) => b.status !== 'pending');

  const totalInvested = bets.reduce((s, b) => s + b.amount, 0);
  const totalWon = settled.filter((b) => b.status === 'won').reduce((s, b) => s + b.estimated_payout, 0);
  const totalLost = settled.filter((b) => b.status === 'lost').reduce((s, b) => s + b.amount, 0);
  const netPL = totalWon - totalLost;

  const formatDate = (iso: string) => {
    const d = new Date(iso + (iso.includes('Z') || iso.includes('+') ? '' : 'Z'));
    if (isNaN(d.getTime())) return '未知时间';
    const parts = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const month = parts.find(p => p.type === 'month')?.value ?? '??';
    const day = parts.find(p => p.type === 'day')?.value ?? '??';
    const hour = parts.find(p => p.type === 'hour')?.value ?? '??';
    const minute = parts.find(p => p.type === 'minute')?.value ?? '??';
    return `${month}月${day}日 ${hour}:${minute}`;
  };

  const activeBets = tab === 'unsettled' ? unsettled : settled;

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
      {/* User info */}
      {user && (
        <div className="glass-card p-4 sm:p-5 mb-4 sm:mb-6 flex items-center justify-between">
          <div>
            <p className="text-white/40 text-[10px] sm:text-xs">用户名</p>
            <p className="text-white font-bold text-base sm:text-lg">{user.username}</p>
          </div>
          <div className="text-right">
            <p className="text-white/40 text-[10px] sm:text-xs">当前余额</p>
            <p className="text-gold font-black text-xl sm:text-2xl">${user.balance.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Stats - 2x2 on mobile, 3 cols on desktop */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="glass-card p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] text-white/40 mb-0.5">总投入</p>
          <p className="text-white font-bold text-xs sm:text-sm">${totalInvested.toFixed(2)}</p>
        </div>
        <div className="glass-card p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] text-white/40 mb-0.5">总收益</p>
          <p className={`font-bold text-xs sm:text-sm ${totalWon > 0 ? 'text-green-400' : 'text-white/50'}`}>
            ${totalWon.toFixed(2)}
          </p>
        </div>
        <div className="glass-card p-2.5 sm:p-3 text-center">
          <p className="text-[9px] sm:text-[10px] text-white/40 mb-0.5">净盈亏</p>
          <p className={`font-bold text-xs sm:text-sm ${netPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {netPL >= 0 ? '+' : ''}${Math.abs(netPL).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white/5 rounded-lg p-1">
        <button
          onClick={() => setTab('unsettled')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            tab === 'unsettled' ? 'bg-gold/20 text-gold' : 'text-white/50 hover:text-white/70 active:bg-white/10'
          }`}
        >
          未结算 ({unsettled.length})
        </button>
        <button
          onClick={() => setTab('settled')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
            tab === 'settled' ? 'bg-gold/20 text-gold' : 'text-white/50 hover:text-white/70 active:bg-white/10'
          }`}
        >
          已结算 ({settled.length})
        </button>
      </div>

      {/* Bets list */}
      <div className="space-y-2.5 sm:space-y-3">
        {activeBets.map((bet) => {
          const isWon = bet.status === 'won';
          const isLost = bet.status === 'lost';
          const optionDisplay = formatMarketOptionLabel(bet.market.type, bet.option.label);

          return (
            <div
              key={bet.id}
              className={`glass-card p-3 sm:p-4 border-l-4 ${
                isWon ? 'border-l-green-500' : isLost ? 'border-l-red-500' : 'border-l-gold'
              }`}
            >
              {/* Match info */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                    <TeamIdentity name={bet.match.home_team} />
                    <span className="text-gold/50 font-black shrink-0">vs</span>
                    <TeamIdentity name={bet.match.away_team} />
                  </div>
                  {bet.match.round_name && (
                    <p className="text-white/30 text-[9px] sm:text-[10px] mt-0.5">{bet.match.round_name}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {bet.status === 'pending' && (
                    <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-gold/15 text-gold">待结算</span>
                  )}
                  {isWon && (
                    <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">✓ 中奖</span>
                  )}
                  {isLost && (
                    <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">✗ 未中</span>
                  )}
                </div>
              </div>

              {/* Bet details */}
              <div className="bg-white/[0.03] rounded-lg p-2.5 sm:p-3 text-[10px] sm:text-xs space-y-1 sm:space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-white/40">市场</span>
                  <span className="text-white/70">{getMarketLabel(bet.market.type)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">选择</span>
                  <span className="text-white font-medium text-right max-w-[60%] truncate">{optionDisplay.accessible}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">投入</span>
                  <span className="text-white">${bet.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">赔率</span>
                  <span className="text-gold font-medium">
                    {priceToOdds(bet.price_at_bet)} 倍
                  </span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-1 sm:pt-1.5">
                  <span className="text-white/40">
                    {bet.status === 'pending' ? '预计收益' : '实际收益'}
                  </span>
                  <span className={`font-bold ${
                    isWon ? 'text-green-400' : isLost ? 'text-red-400' : 'text-gold'
                  }`}>
                    {isWon ? `+$${bet.estimated_payout.toFixed(2)}` :
                     isLost ? '$0.00' :
                     `$${bet.estimated_payout.toFixed(2)}`}
                  </span>
                </div>
              </div>

              <p className="text-white/20 text-[9px] sm:text-[10px] mt-1.5 sm:mt-2">{formatDate(bet.created_at)}</p>
            </div>
          );
        })}
      </div>

      {activeBets.length === 0 && (
        <div className="text-center py-12">
          <div className="text-3xl mb-2">
            {tab === 'unsettled' ? '⏳' : '📜'}
          </div>
          <p className="text-white/40 text-sm">
            {tab === 'unsettled' ? '暂无未结算的投注' : '暂无已结算的投注'}
          </p>
        </div>
      )}
    </div>
  );
}
