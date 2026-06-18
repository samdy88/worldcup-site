'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getMarketLabel, formatTime } from '@/lib/utils';
import TeamIdentity from '@/components/TeamIdentity';
import { formatMarketOptionLabel } from '@/lib/marketDisplay';

interface BalancePoint {
  time: string;
  balance: number;
  change: number;
  label: string;
}

interface PlayerBet {
  id: number;
  amount: number;
  odds: number;
  option_label: string;
  market_type: string;
  status: 'pending' | 'won' | 'lost' | 'settled';
  payout: number;
  estimated_payout: number;
  created_at: string;
  match: {
    id: number;
    home_team: string;
    away_team: string;
    round_name: string;
    status: string;
    result_home: number | null;
    result_away: number | null;
  };
}

interface PlayerData {
  player: {
    id: number;
    username: string;
    balance: number;
    unsettled_bets_value: number;
    total_assets: number;
    created_at: string;
  };
  stats: {
    total_bets: number;
    won_count: number;
    lost_count: number;
    pending_count: number;
    win_rate: number;
    total_staked: number;
    total_payout: number;
    net_profit: number;
  };
  balance_history: BalancePoint[];
  bets: PlayerBet[];
}

function formatDate(iso: string) {
  const d = new Date(iso + (iso.includes('Z') || iso.includes('+') ? '' : 'Z'));
  if (Number.isNaN(d.getTime())) return '未知时间';
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

function statusText(status: PlayerBet['status']) {
  if (status === 'won') return '✓ 中奖';
  if (status === 'lost') return '✗ 未中';
  if (status === 'pending') return '待结算';
  return '已结算';
}

function statusClass(status: PlayerBet['status']) {
  if (status === 'won') return 'bg-green-500/20 text-green-300 border-green-500/30';
  if (status === 'lost') return 'bg-red-500/20 text-red-300 border-red-500/30';
  if (status === 'pending') return 'bg-gold/15 text-gold border-gold/25';
  return 'bg-white/10 text-white/50 border-white/10';
}

function BalanceChart({ points }: { points: BalancePoint[] }) {
  const chart = useMemo(() => {
    const width = 640;
    const height = 220;
    const pad = 28;
    const values = points.length > 0 ? points.map((p) => p.balance) : [100];
    const min = Math.min.apply(null, values.concat([100]));
    const max = Math.max.apply(null, values.concat([100]));
    const span = Math.max(1, max - min);
    const coords = points.map((p, i) => {
      const x = points.length === 1 ? width / 2 : pad + (i / (points.length - 1)) * (width - pad * 2);
      const y = height - pad - ((p.balance - min) / span) * (height - pad * 2);
      return { x, y, point: p };
    });
    return {
      width,
      height,
      min,
      max,
      coords,
      polyline: coords.map((p) => p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' '),
    };
  }, [points]);

  if (points.length === 0) {
    return <div className="text-white/30 text-sm py-8 text-center">暂无资金变化记录</div>;
  }

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={'0 0 ' + chart.width + ' ' + chart.height} className="w-full h-40 sm:h-56">
        <defs>
          <linearGradient id="balanceLine" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <line x1="28" x2="612" y1="192" y2="192" stroke="rgba(255,255,255,0.08)" />
        <line x1="28" x2="612" y1="28" y2="28" stroke="rgba(255,255,255,0.06)" />
        <text x="30" y="20" fill="rgba(255,255,255,0.35)" fontSize="12">${chart.max.toFixed(2)}</text>
        <text x="30" y="210" fill="rgba(255,255,255,0.35)" fontSize="12">${chart.min.toFixed(2)}</text>
        <polyline points={chart.polyline} fill="none" stroke="url(#balanceLine)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {chart.coords.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="5" fill={p.point.change >= 0 ? '#f59e0b' : '#60a5fa'} stroke="#0a0e1a" strokeWidth="2" />
            <title>{p.point.label + ' ' + formatDate(p.point.time) + ' $' + p.point.balance.toFixed(2)}</title>
          </g>
        ))}
      </svg>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
        {points.slice(-4).map((p, idx) => (
          <div key={idx} className="rounded-lg bg-white/[0.03] border border-white/5 px-2.5 sm:px-3 py-2">
            <div className="text-white/30 text-[9px] sm:text-[10px]">{formatDate(p.time)}</div>
            <div className="text-white text-xs sm:text-sm font-bold">${p.balance.toFixed(2)}</div>
            <div className={p.change >= 0 ? 'text-green-300 text-[9px] sm:text-[10px]' : 'text-blue-300 text-[9px] sm:text-[10px]'}>
              {p.label}{p.change !== 0 ? ' ' + (p.change > 0 ? '+' : '') + '$' + p.change.toFixed(2) : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [data, setData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    params.then((resolved) => setPlayerId(resolved.id));
  }, [params]);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    fetch('/api/players/' + playerId)
      .then((r) => r.ok ? r.json() : r.json().then((body) => Promise.reject(new Error(body.error || '加载失败'))))
      .then((body) => setData(body))
      .catch((err) => setError(err.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [playerId]);

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-3 animate-bounce">📈</div>
        <p className="text-white/50">加载玩家档案...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">😔</div>
        <p className="text-red-300 mb-4">{error || '玩家不存在'}</p>
        <Link href="/leaderboard" className="btn-gold px-5 py-2">返回排行榜</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 relative z-10">
      <div className="mb-4 sm:mb-5">
        <Link href="/leaderboard" className="text-white/40 hover:text-gold text-xs sm:text-sm">← 返回排行榜</Link>
      </div>

      <div className="glass-card p-4 sm:p-5 mb-4 sm:mb-5 border-gold/20">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-white/35 text-[10px] sm:text-xs mb-0.5">玩家档案</p>
            <h1 className="text-xl sm:text-3xl font-black text-white">{data.player.username}</h1>
            <p className="text-white/30 text-[10px] sm:text-xs mt-0.5">加入时间 {formatDate(data.player.created_at)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:w-72">
            <div className="rounded-xl bg-white/[0.04] border border-white/5 p-2.5 sm:p-3">
              <p className="text-white/30 text-[9px] sm:text-[10px]">余额</p>
              <p className="text-gold font-black text-lg sm:text-xl">${data.player.balance.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] border border-white/5 p-2.5 sm:p-3">
              <p className="text-white/30 text-[9px] sm:text-[10px]">总资产</p>
              <p className="text-white font-black text-lg sm:text-xl">${data.player.total_assets.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-5">
        <StatCard label="总下注" value={String(data.stats.total_bets)} />
        <StatCard label="胜率" value={data.stats.win_rate.toFixed(1) + '%'} />
        <StatCard label="总投入" value={'$' + data.stats.total_staked.toFixed(2)} />
        <StatCard label="净盈亏" value={(data.stats.net_profit >= 0 ? '+$' : '-$') + Math.abs(data.stats.net_profit).toFixed(2)} highlight={data.stats.net_profit >= 0 ? 'good' : 'bad'} />
      </div>

      <div className="glass-card p-4 sm:p-5 mb-4 sm:mb-5">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2"><span>📈</span>总资产变化曲线</h2>
          <span className="text-white/30 text-[9px] sm:text-xs">总资产 = 余额 + 未结算投入</span>
        </div>
        <BalanceChart points={data.balance_history} />
      </div>

      <div className="glass-card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-white font-bold text-sm sm:text-base flex items-center gap-2"><span>📋</span>下注记录</h2>
          <span className="text-white/30 text-[9px] sm:text-xs">{data.bets.length} 笔</span>
        </div>

        {data.bets.length === 0 ? (
          <div className="text-center py-10 text-white/35">这个玩家还没有下注记录</div>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {data.bets.map((bet) => {
              const optionDisplay = formatMarketOptionLabel(bet.market_type, bet.option_label);
              return (
              <div key={bet.id} className="rounded-xl bg-white/[0.03] border border-white/5 p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                      <TeamIdentity name={bet.match.home_team} />
                      <span className="text-gold/50 font-black shrink-0">vs</span>
                      <TeamIdentity name={bet.match.away_team} />
                    </div>
                    <p className="text-white/30 text-[9px] sm:text-[10px] mt-0.5">{bet.match.round_name || '比赛'} · {formatDate(bet.created_at)}</p>
                  </div>
                  <span className={'shrink-0 text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border ' + statusClass(bet.status)}>{statusText(bet.status)}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                  <Detail label="玩法" value={getMarketLabel(bet.market_type)} />
                  <Detail label="选择" value={optionDisplay.accessible} strong />
                  <Detail label="投入" value={'$' + bet.amount.toFixed(2)} />
                  <Detail label="赔率" value={bet.odds.toFixed(2) + '倍'} />
                  <Detail label={bet.status === 'pending' ? '预计回报' : '实际回报'} value={'$' + bet.estimated_payout.toFixed(2)} strong={bet.status === 'won'} />
                </div>
                {bet.match.status === 'finished' && bet.match.result_home !== null && (
                  <div className="mt-2 sm:mt-3 text-[10px] sm:text-[11px] text-white/35 border-t border-white/5 pt-1.5 sm:pt-2 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span>赛果：</span>
                    <TeamIdentity name={bet.match.home_team} />
                    <span>{bet.match.result_home} : {bet.match.result_away}</span>
                    <TeamIdentity name={bet.match.away_team} />
                  </div>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: 'good' | 'bad' }) {
  const valueClass = highlight === 'good' ? 'text-green-300' : (highlight === 'bad' ? 'text-red-300' : 'text-white');
  return (
    <div className="glass-card p-2.5 sm:p-3 text-center">
      <p className="text-white/35 text-[9px] sm:text-[10px] mb-0.5">{label}</p>
      <p className={'font-black text-base sm:text-lg ' + valueClass}>{value}</p>
    </div>
  );
}

function Detail({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-black/15 px-2 sm:px-3 py-1.5 sm:py-2">
      <p className="text-white/30 text-[9px] sm:text-[10px] mb-px">{label}</p>
      <p className={strong ? 'text-gold font-bold truncate text-[10px] sm:text-xs' : 'text-white/65 truncate text-[10px] sm:text-xs'}>{value}</p>
    </div>
  );
}
