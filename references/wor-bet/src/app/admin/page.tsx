'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStatusLabel as statusLabel, formatTime as fmtTime } from '@/lib/utils';

interface Tournament {
  id: number;
  name: string;
  slug: string;
  icon: string;
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
}

export default function AdminPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  // Settle form
  const [settleMatchId, setSettleMatchId] = useState('');
  const [resultHome, setResultHome] = useState('');
  const [resultAway, setResultAway] = useState('');
  const [settleMsg, setSettleMsg] = useState('');
  const [settleError, setSettleError] = useState('');
  const [settling, setSettling] = useState(false);

  // Create match form
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [roundName, setRoundName] = useState('');
  const [kickoffTime, setKickoffTime] = useState('');
  const [selectedTournament, setSelectedTournament] = useState('');
  const [createMsg, setCreateMsg] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then((r) => r.ok ? r.json() : null),
      fetch('/api/matches').then((r) => r.json()),
    ]).then(([userData, matchData]) => {
      if (!userData?.user || userData.user.is_admin !== 1) {
        window.location.href = '/';
        return;
      }
      setIsAdmin(true);
      setMatches(matchData.matches || []);
      setTournaments(matchData.tournaments || []);
    }).finally(() => setLoading(false));
  }, [router]);

  const refreshMatches = async () => {
    const matchRes = await fetch('/api/matches');
    const matchData = await matchRes.json();
    setMatches(matchData.matches || []);
    setTournaments(matchData.tournaments || []);
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettling(true);
    setSettleMsg('');
    setSettleError('');

    try {
      const res = await fetch('/api/admin/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: Number(settleMatchId),
          resultHome: Number(resultHome),
          resultAway: Number(resultAway),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSettleError(data.error || '结算失败');
        return;
      }
      const count = data.settlements?.length || 0;
      setSettleMsg(`✅ 结算成功！${count} 个市场已结算`);
      await refreshMatches();
      setResultHome('');
      setResultAway('');
    } catch {
      setSettleError('网络错误');
    } finally {
      setSettling(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateMsg('');
    setCreateError('');

    try {
      const res = await fetch('/api/admin/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeam,
          awayTeam,
          roundName,
          kickoffTime,
          tournamentId: selectedTournament ? Number(selectedTournament) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || '创建失败');
        return;
      }
      const matchId = data.match?.id;
      setCreateMsg(`✅ 比赛已创建！ID: ${matchId}`);
      await refreshMatches();
      setHomeTeam('');
      setAwayTeam('');
      setRoundName('');
      setKickoffTime('');
    } catch {
      setCreateError('网络错误');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-3 animate-bounce">⚙️</div>
        <p className="text-white/50">加载中...</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  const upcomingMatches = matches.filter((m) => m.status === 'upcoming' || m.status === 'live');

  // Sort matches: upcoming/live first (by time), then finished
  const sortedMatches = [...matches].sort((a, b) => {
    const statusOrder: Record<string, number> = { live: 0, upcoming: 1, finished: 2 };
    const sa = statusOrder[a.status] ?? 3;
    const sb = statusOrder[b.status] ?? 3;
    if (sa !== sb) return sa - sb;
    return new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime();
  });

  const getTournamentName = (tid: number) => {
    const t = tournaments.find(t => t.id === tid);
    return t ? `${t.icon} ${t.name}` : '-';
  };

  const getStatusStyle = (status: string) => {
    if (status === 'upcoming') return 'bg-blue-500/20 text-blue-400';
    if (status === 'live') return 'bg-red-500/20 text-red-400';
    return 'bg-white/10 text-white/50';
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        ⚙️ 管理后台
      </h1>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Settle match */}
        <div className="glass-card p-5">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            🏁 结算比赛
          </h2>

          {upcomingMatches.length === 0 ? (
            <p className="text-white/40 text-sm">暂无可结算的比赛</p>
          ) : (
            <form onSubmit={handleSettle} className="space-y-3">
              <div>
                <label className="block text-white/50 text-xs mb-1">选择比赛</label>
                <select
                  value={settleMatchId}
                  onChange={(e) => setSettleMatchId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-gold/50"
                >
                  <option value="" className="bg-pitch-dark">请选择...</option>
                  {upcomingMatches.map((m) => (
                    <option key={m.id} value={m.id} className="bg-pitch-dark">
                      {m.home_team} vs {m.away_team} ({statusLabel(m.status)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/50 text-xs mb-1">主队得分</label>
                  <input
                    type="number"
                    min="0"
                    value={resultHome}
                    onChange={(e) => setResultHome(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-gold/50"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-white/50 text-xs mb-1">客队得分</label>
                  <input
                    type="number"
                    min="0"
                    value={resultAway}
                    onChange={(e) => setResultAway(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-gold/50"
                    placeholder="0"
                  />
                </div>
              </div>

              {settleMsg && <div className="text-green-400 text-xs p-2 bg-green-500/10 rounded-lg">{settleMsg}</div>}
              {settleError && <div className="text-red-400 text-xs p-2 bg-red-500/10 rounded-lg">{settleError}</div>}

              <button
                type="submit"
                disabled={settling}
                className="w-full btn-gold py-2.5 text-sm disabled:opacity-50"
              >
                {settling ? '结算中...' : '确认结算'}
              </button>
            </form>
          )}
        </div>

        {/* Create match */}
        <div className="glass-card p-5">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            ➕ 添加比赛
          </h2>

          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-white/50 text-xs mb-1">所属赛事</label>
              <select
                value={selectedTournament}
                onChange={(e) => setSelectedTournament(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-gold/50"
              >
                <option value="" className="bg-pitch-dark">无（独立比赛）</option>
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id} className="bg-pitch-dark">
                    {t.icon} {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-1">主队</label>
              <input
                type="text"
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-gold/50 placeholder-white/30"
                placeholder="例如: 巴西"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-1">客队</label>
              <input
                type="text"
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-gold/50 placeholder-white/30"
                placeholder="例如: 阿根廷"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-1">轮次</label>
              <input
                type="text"
                value={roundName}
                onChange={(e) => setRoundName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-gold/50 placeholder-white/30"
                placeholder="例如: 小组赛 A组"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-1">开赛时间</label>
              <input
                type="datetime-local"
                value={kickoffTime}
                onChange={(e) => setKickoffTime(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-gold/50"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            {createMsg && <div className="text-green-400 text-xs p-2 bg-green-500/10 rounded-lg">{createMsg}</div>}
            {createError && <div className="text-red-400 text-xs p-2 bg-red-500/10 rounded-lg">{createError}</div>}

            <button
              type="submit"
              disabled={creating}
              className="w-full btn-gold py-2.5 text-sm disabled:opacity-50"
            >
              {creating ? '创建中...' : '创建比赛'}
            </button>
          </form>
        </div>
      </div>

      {/* Match list overview */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-white mb-4">📊 比赛总览 ({matches.length})</h2>
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-white/40 font-medium px-4 py-2">赛事</th>
                  <th className="text-left text-white/40 font-medium px-4 py-2">比赛</th>
                  <th className="text-left text-white/40 font-medium px-4 py-2">轮次</th>
                  <th className="text-left text-white/40 font-medium px-4 py-2 hidden sm:table-cell">开赛</th>
                  <th className="text-center text-white/40 font-medium px-4 py-2">状态</th>
                  <th className="text-center text-white/40 font-medium px-4 py-2">比分</th>
                </tr>
              </thead>
              <tbody>
                {sortedMatches.map((m) => (
                  <tr key={m.id} className={`border-b border-white/5 ${m.status === 'finished' ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-2 text-white/50 text-xs">{getTournamentName(m.tournament_id)}</td>
                    <td className="px-4 py-2 text-white font-medium">
                      {m.home_team} vs {m.away_team}
                    </td>
                    <td className="px-4 py-2 text-white/50">{m.round_name || '-'}</td>
                    <td className="px-4 py-2 text-white/40 text-xs hidden sm:table-cell">{fmtTime(m.kickoff_time)}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusStyle(m.status)}`}>
                        {statusLabel(m.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center text-white/70">
                      {m.result_home !== null ? `${m.result_home} : ${m.result_away}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
