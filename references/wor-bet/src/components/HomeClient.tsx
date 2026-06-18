'use client';

import { useState, useEffect, useCallback } from 'react';
import BetModal from './BetModal';
import TeamIdentity from './TeamIdentity';
import { priceToOdds, oddsColor, formatTime, getMarketLabel } from '@/lib/utils';
import { settlementBasisText } from '@/lib/teamVisuals';
import { formatMarketOptionLabel } from '@/lib/marketDisplay';

interface Tournament {
  id: number;
  name: string;
  slug: string;
  icon: string;
  sport: string;
}

interface Option {
  id: number;
  label: string;
  price: number;
}

interface Market {
  id: number;
  market_type: string;
  description: string;
  settled: number;
  winning_option: string | null;
  options: Option[];
}

interface Match {
  id: number;
  tournament_id: number;
  home_team: string;
  away_team: string;
  round_name: string;
  kickoff_time: string;
  status: string;
  result_home: number | null;
  result_away: number | null;
  markets: Market[];
}

interface Bet {
  id: number;
  market: { id: number };
}

interface BetModalState {
  match: Match;
  market: Market;
  option: Option;
}

// ─── 玩法说明组件 ────────────────────────────────────────
function RulesGuide() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mb-4 glass-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-white/70">
          <span className="text-base">📖</span>
          玩法说明
        </span>
        <svg
          className={`w-4 h-4 text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3 animate-fade-in">
          {/* 胜负 */}
          <div className="flex gap-3">
            <div className="shrink-0 w-14 text-right">
              <span className="text-xs font-bold text-gold/80 px-1.5 py-0.5 rounded bg-gold/10">胜负</span>
            </div>
            <div className="text-white/50 text-xs leading-relaxed">
              猜常规时间赛果。<strong className="text-white/70">主胜</strong> = 主队赢球；<strong className="text-white/70">平局</strong> = 90分钟加伤停补时后打平；<strong className="text-white/70">客胜</strong> = 客队赢球。
              <br />决赛如果进入加时或点球，胜负盘仍按加时前的比分结算。
              <br />赔率 <strong className="text-white/70">2.50倍</strong> 表示投 $1 赢回 $2.50（净赚 $1.50）。
            </div>
          </div>

          {/* 让球 */}
          <div className="flex gap-3">
            <div className="shrink-0 w-14 text-right">
              <span className="text-xs font-bold text-blue-300/80 px-1.5 py-0.5 rounded bg-blue-500/10">让球</span>
            </div>
            <div className="text-white/50 text-xs leading-relaxed">
              强队需要在常规90分钟加伤停补时内赢够球数才算胜出。
              <br />例：按钮写着 <strong className="text-white/70">巴西需赢2球以上</strong>，巴西 2:0、3:1 才算赢。
              <br />如果写着 <strong className="text-white/70">对手不输2球就赢</strong>，对手赢球、打平、或只输 1 球都算赢。
              <br />加时赛和点球大战进球不计入让球结算。
            </div>
          </div>

          {/* 大小球 */}
          <div className="flex gap-3">
            <div className="shrink-0 w-14 text-right">
              <span className="text-xs font-bold text-amber-300/80 px-1.5 py-0.5 rounded bg-amber-500/10">大小球</span>
            </div>
            <div className="text-white/50 text-xs leading-relaxed">
              猜双方常规90分钟加伤停补时内总进球数是否超过 2.5 球。
              <br /><strong className="text-white/70">大于 2.5</strong>：总进球 ≥ 3（如 2:1、3:0）。
              <br /><strong className="text-white/70">小于 2.5</strong>：总进球 ≤ 2（如 1:0、0:0）。
              <br />加时赛和点球大战进球不计入。
            </div>
          </div>

          {/* 通用规则 */}
          <div className="mt-2 pt-2 border-t border-white/5 text-white/30 text-[10px]">
            💡 每个盘口每人只能投注一次。{settlementBasisText} 赔率随市场实时变动，以下注时赔率为准。
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 行内规则提示 ────────────────────────────────────────
function InlineRule({ type }: { type: string }) {
  const [open, setOpen] = useState(false);
  const tips: Record<string, string> = {
    '胜负': '只看常规90分钟+伤停补时：主胜=左侧主场球队赢；平局=90分钟打平；客胜=右侧客场球队赢。加时/点球不计入。',
    '让球': '只看常规90分钟+伤停补时：一边是"需赢2球以上"，另一边是"不输2球就赢"。按按钮文字判断。',
    '大小2.5': '只看常规90分钟+伤停补时：两队总进球 ≥3 是大于2.5；总进球 ≤2 是小于等于2.5。',
  };
  const tip = tips[type];
  if (!tip) return null;

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="text-[10px] text-blue-300/70 hover:text-blue-200 ml-1 px-1 rounded-full bg-blue-500/10 border border-blue-400/20 min-w-[18px] min-h-[18px] inline-flex items-center justify-center"
        aria-label={type + '规则说明'}
      >
        ⓘ
      </button>
      {open && (
        <span className="absolute left-0 top-6 z-30 w-56 sm:w-64 rounded-lg border border-blue-400/25 bg-[#07111f]/95 px-3 py-2 text-[11px] leading-relaxed text-white/75 shadow-2xl shadow-black/40 backdrop-blur">
          {tip}
        </span>
      )}
    </span>
  );
}

export default function HomeClient({ username, balance: initialBalance }: { username: string; balance: number }) {
  const [balance, setBalance] = useState(initialBalance);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [betMarketIds, setBetMarketIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<BetModalState | null>(null);
  const [activeTournament, setActiveTournament] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [matchRes, betRes] = await Promise.all([
        fetch('/api/matches'),
        fetch('/api/bets'),
      ]);
      if (matchRes.ok) {
        const data = await matchRes.json();
        setTournaments(data.tournaments || []);
        setMatches(data.matches || []);
      }
      if (betRes.ok) {
        const data = await betRes.json();
        const ids = new Set<number>((data.bets || []).map((b: Bet) => b.market.id));
        setBetMarketIds(ids);
      }
      setLastRefresh(new Date());
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto refresh every 60s
  useEffect(() => {
    const timer = setInterval(() => {
      fetch('/api/matches')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.matches) {
            setMatches(data.matches);
            if (data.tournaments) setTournaments(data.tournaments);
            setLastRefresh(new Date());
          }
        })
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  // Filter by tournament
  const filtered = activeTournament
    ? matches.filter(m => m.tournament_id === activeTournament)
    : matches;

  // Separate: only regular matches (no outright), split by status
  const upcomingMatches = filtered.filter(m => m.status !== 'finished');
  const finishedMatches = filtered.filter(m => m.status === 'finished');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">⚽</div>
          <p className="text-white/50">加载比赛中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">😔</div>
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={fetchData} className="btn-gold">重新加载</button>
      </div>
    );
  }

  // ─── 对阵盘：卡片直接显示赔率 ────────────────────────────────────────

  const renderMatchCard = (match: Match) => {
    const tournament = tournaments.find(t => t.id === match.tournament_id);
    const mainMarket = match.markets.find(mk => mk.market_type === '1x2');
    const spreadMarket = match.markets.find(mk => mk.market_type === 'spread');
    const ouMarket = match.markets.find(mk => mk.market_type === 'ou25');

    return (
      <div key={match.id} className="glass-card overflow-hidden">
        {/* 顶部赛事信息栏 */}
        <div className="px-3 sm:px-4 py-2 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
          <span className="text-[10px] sm:text-[11px] text-white/40 truncate">
            {tournament?.icon} {tournament?.name}
            {match.round_name && ` · ${match.round_name}`}
          </span>
          <span className="text-[10px] sm:text-[11px] text-white/30 shrink-0 ml-2">{formatTime(match.kickoff_time)}</span>
        </div>

        {/* 队伍 + 赔率 */}
        <div className="p-3 sm:p-4">
          {/* 主盘口：队伍信息 */}
          {mainMarket && (
            <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 sm:gap-2 items-center mb-3">
              <div className="text-right min-w-0">
                <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] text-blue-200/70 bg-blue-500/10 border border-blue-400/20 rounded-full px-1.5 py-px mb-0.5">主场</span>
                <TeamIdentity name={match.home_team} align="right" size="md" />
              </div>
              <div className="text-center px-1 sm:px-2">
                <span className="text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full bg-gold/15 text-gold/70 border border-gold/20">VS</span>
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] text-amber-200/70 bg-amber-500/10 border border-amber-400/20 rounded-full px-1.5 py-px mb-0.5">客场</span>
                <TeamIdentity name={match.away_team} align="left" size="md" />
              </div>
            </div>
          )}

          {/* 赔率按钮行 */}
          <div className="space-y-2">
            {mainMarket && renderOddsRow('胜负', mainMarket, match)}
            {spreadMarket && renderOddsRow('让球', spreadMarket, match)}
            {ouMarket && renderOddsRow('大小2.5', ouMarket, match)}
          </div>
        </div>
      </div>
    );
  };

  const renderOddsRow = (label: string, market: Market, match: Match) => {
    const hasBet = betMarketIds.has(market.id);
    const cols = market.options.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

    return (
      <div>
        <div className="flex items-center gap-1 mb-1">
          <span className="text-[10px] text-white/30 font-medium">{label}</span>
          <InlineRule type={label} />
          {hasBet && <span className="text-[9px] text-gold/60">已下注✓</span>}
        </div>
        <div className={`grid ${cols} gap-1.5 sm:gap-2`}>
          {market.options.map(opt => {
            const odds = priceToOdds(opt.price);
            const display = formatMarketOptionLabel(market.market_type, opt.label);
            return (
              <button
                key={opt.id}
                onClick={() => !hasBet && setModal({ match, market, option: opt })}
                disabled={hasBet}
                aria-label={`${display.accessible} ${odds}倍`}
                className={`btn-price py-2 px-1.5 sm:px-2 ${hasBet ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="text-[10px] sm:text-[11px] text-white/50 leading-tight line-clamp-2">{display.primary}</div>
                {display.secondary && <div className="text-[9px] text-white/35 leading-tight mt-0.5 line-clamp-1">{display.secondary}</div>}
                <div className={`text-sm sm:text-base font-bold ${oddsColor(opt.price)}`}>{odds}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── 已结束比赛 ──────────────────────────────────────────────────────────

  const renderFinishedSection = () => {
    if (finishedMatches.length === 0) return null;
    return (
      <div className="mb-6 sm:mb-8">
        <h2 className="text-base sm:text-lg font-bold text-white/60 mb-3 sm:mb-4 flex items-center gap-2">
          <span className="text-lg sm:text-xl">📊</span>
          比赛结果
          <span className="text-xs sm:text-sm text-white/30 font-normal ml-1">({finishedMatches.length})</span>
        </h2>
        <div className="space-y-2">
          {finishedMatches.map(match => {
            const tournament = tournaments.find(t => t.id === match.tournament_id);
            return (
              <div key={match.id} className="glass-card px-3 sm:px-4 py-2.5 sm:py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-sm min-w-0 overflow-hidden">
                    <span className={(match.result_home ?? 0) > (match.result_away ?? 0) ? 'text-gold' : 'text-white/70'}>
                      <TeamIdentity name={match.home_team} align="left" />
                    </span>
                    <span className="text-white/90 font-black text-base sm:text-lg px-1 py-0.5 rounded bg-white/5 shrink-0">
                      {match.result_home ?? '-'} : {match.result_away ?? '-'}
                    </span>
                    <span className={(match.result_away ?? 0) > (match.result_home ?? 0) ? 'text-gold' : 'text-white/70'}>
                      <TeamIdentity name={match.away_team} align="left" />
                    </span>
                    {match.result_home === match.result_away && match.result_home !== null && (
                      <span className="text-[9px] sm:text-[10px] text-amber-300/60 px-1 py-0.5 rounded bg-amber-300/10 shrink-0">平局</span>
                    )}
                  </div>
                  <div className="text-right shrink-0 hidden sm:block">
                    <div className="text-[10px] text-white/25">
                      {tournament?.icon} {match.round_name}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Tab 栏 ────────────────────────────────────────────────────────────

  const tournamentCounts: Record<number, { total: number }> = {};
  for (const m of matches) {
    if (!tournamentCounts[m.tournament_id]) tournamentCounts[m.tournament_id] = { total: 0 };
    tournamentCounts[m.tournament_id].total++;
  }

  const tabBase = 'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap';
  const tabActive = 'bg-gold/20 text-gold border border-gold/30';
  const tabInactive = 'bg-white/5 text-white/50 hover:bg-white/10 active:bg-white/15';

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4 relative z-10">
      {/* Welcome banner - compact */}
      <div className="mb-3 sm:mb-4 flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight">
            ⚽ 体育竞猜
          </h1>
          <p className="text-white/30 text-[10px] sm:text-xs mt-0.5">
            欢迎，<span className="text-white/60">{username}</span>
          </p>
        </div>
        <div className="glass-card px-3 sm:px-4 py-1.5 sm:py-2 text-right shrink-0">
          <div className="text-[9px] sm:text-[10px] text-white/30 uppercase tracking-wider">余额</div>
          <div className="text-base sm:text-lg font-black text-gold">${balance.toFixed(2)}</div>
        </div>
      </div>

      {/* Rules guide */}
      <RulesGuide />

      {/* Tournament tabs - scrollable on mobile */}
      {tournaments.length > 0 && (
        <div className="mb-3 sm:mb-4 flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
          <button
            onClick={() => setActiveTournament(null)}
            className={`${tabBase} ${activeTournament === null ? tabActive : tabInactive}`}
          >
            全部 <span className="opacity-60">({matches.length})</span>
          </button>
          {tournaments.map(t => {
            const counts = tournamentCounts[t.id];
            return (
              <button
                key={t.id}
                onClick={() => setActiveTournament(activeTournament === t.id ? null : t.id)}
                className={`${tabBase} ${activeTournament === t.id ? tabActive : tabInactive}`}
              >
                {t.icon} {t.name} <span className="opacity-60">({counts?.total ?? 0})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 已结束比赛 */}
      {renderFinishedSection()}

      {/* 进行中 / 即将开始的比赛 */}
      {upcomingMatches.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <h2 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
            <span className="text-lg sm:text-xl">🏟️</span>
            比赛投注
            <span className="text-xs sm:text-sm text-white/30 font-normal ml-1">({upcomingMatches.length})</span>
          </h2>
          <div className="space-y-3">
            {upcomingMatches.map(match => renderMatchCard(match))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">⚽</div>
          <p className="text-white/40">暂无比赛数据</p>
          <p className="text-white/20 text-sm mt-1">赔率同步启动后将自动拉取赛事</p>
        </div>
      )}

      <div className="text-center text-white/20 text-[10px] mt-4 sm:mt-6 pb-2 sm:pb-4">
        赔率每分钟自动刷新 · 上次更新 {lastRefresh.toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}
      </div>

      {modal && (
        <BetModal
          matchInfo={{ home_team: modal.match.home_team, away_team: modal.match.away_team, kickoff_time: modal.match.kickoff_time }}
          marketInfo={{ type: modal.market.market_type, description: modal.market.description }}
          option={modal.option}
          balance={balance}
          onClose={() => setModal(null)}
          onSuccess={(newBalance) => {
            setBalance(newBalance);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
