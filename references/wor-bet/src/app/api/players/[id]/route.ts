import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureInitialized } from '@/lib/init-app';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  ensureInitialized();

  try {
    const { id } = await context.params;
    const playerId = Number(id);
    if (!Number.isInteger(playerId) || playerId <= 0) {
      return NextResponse.json({ error: '玩家ID不正确' }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare('SELECT id, username, balance, created_at FROM users WHERE id = ?').get(playerId) as {
      id: number;
      username: string;
      balance: number;
      created_at: string;
    } | null;

    if (!user) {
      return NextResponse.json({ error: '玩家不存在' }, { status: 404 });
    }

    // 未结算投注按投入金额计算（不算假设胜利资金）
    const unsettledRow = db.prepare(
      'SELECT COALESCE(SUM(b.amount), 0) AS total_unsettled ' +
      'FROM bets b ' +
      'JOIN market_options mo ON b.market_option_id = mo.id ' +
      'JOIN markets m ON mo.market_id = m.id ' +
      'WHERE b.user_id = ? AND m.settled = 0'
    ).get(playerId) as { total_unsettled: number };

    const rawBets = db.prepare(
      'SELECT b.id, b.amount, b.shares, b.price_at_bet, b.created_at, ' +
      'mo.label AS option_label, m.market_type, m.settled, m.winning_option, ' +
      'ma.id AS match_id, ma.home_team, ma.away_team, ma.round_name, ma.status AS match_status, ma.result_home, ma.result_away ' +
      'FROM bets b ' +
      'JOIN market_options mo ON b.market_option_id = mo.id ' +
      'JOIN markets m ON mo.market_id = m.id ' +
      'JOIN matches ma ON m.match_id = ma.id ' +
      'WHERE b.user_id = ? ' +
      'ORDER BY b.created_at DESC, b.id DESC'
    ).all(playerId) as Array<{
      id: number;
      amount: number;
      shares: number;
      price_at_bet: number;
      created_at: string;
      option_label: string;
      market_type: string;
      settled: number;
      winning_option: string | null;
      match_id: number;
      home_team: string;
      away_team: string;
      round_name: string;
      match_status: string;
      result_home: number | null;
      result_away: number | null;
    }>;

    const bets = rawBets.map((bet) => {
      const won = bet.settled === 1 && bet.option_label === bet.winning_option;
      const lost = bet.settled === 1 && bet.option_label !== bet.winning_option;
      return {
        id: bet.id,
        amount: round2(bet.amount),
        odds: round2(1 / bet.price_at_bet),
        option_label: bet.option_label,
        market_type: bet.market_type,
        status: bet.settled === 0 ? 'pending' : (won ? 'won' : (lost ? 'lost' : 'settled')),
        payout: won ? round2(bet.shares) : 0,
        estimated_payout: bet.settled === 0 ? round2(bet.shares) : (won ? round2(bet.shares) : 0),
        created_at: bet.created_at,
        match: {
          id: bet.match_id,
          home_team: bet.home_team,
          away_team: bet.away_team,
          round_name: bet.round_name,
          status: bet.match_status,
          result_home: bet.result_home,
          result_away: bet.result_away,
        },
      };
    });

    const transactions = db.prepare(
      'SELECT id, type, amount, ref_id, created_at FROM transactions WHERE user_id = ? ORDER BY created_at ASC, id ASC'
    ).all(playerId) as Array<{
      id: number;
      type: string;
      amount: number;
      ref_id: number | null;
      created_at: string;
    }>;

    // 构建资金变化曲线：追踪总资产（余额 + 未结算投入）
    // 需要按时间顺序追踪每笔交易后的余额和未结算投入
    const allBets = db.prepare(
      'SELECT b.amount, b.created_at, b.id, m.settled, m.winning_option, mo.label AS option_label ' +
      'FROM bets b ' +
      'JOIN market_options mo ON b.market_option_id = mo.id ' +
      'JOIN markets m ON mo.market_id = m.id ' +
      'WHERE b.user_id = ? ' +
      'ORDER BY b.created_at ASC, b.id ASC'
    ).all(playerId) as Array<{
      amount: number; created_at: string; id: number;
      settled: number; winning_option: string | null; option_label: string;
    }>;

    // 合并交易和下注事件，按时间排序
    interface TimelineEvent {
      time: string;
      type: 'init' | 'bet' | 'payout';
      amount: number; // 对余额的影响
      betAmount?: number; // 下注金额
      betSettled?: boolean;
      label: string;
    }

    const events: TimelineEvent[] = [
      { time: user.created_at, type: 'init', amount: 0, label: '初始虚拟资金' },
    ];

    for (const tx of transactions) {
      events.push({
        time: tx.created_at,
        type: tx.type === 'bet' ? 'bet' : 'payout',
        amount: tx.amount,
        label: tx.type === 'bet' ? '下注' : '派奖',
      });
    }

    // 按时间排序
    events.sort((a, b) => a.time.localeCompare(b.time));

    let runningBalance = 100;
    let unsettledInvested = 0;
    const balanceHistory: Array<{ time: string; balance: number; change: number; label: string }> = [];

    // 建立下注ID到下注信息的映射，用于追踪未结算投入
    const betMap = new Map<number, { amount: number; settled: boolean }>();
    for (const bet of allBets) {
      betMap.set(bet.id, { amount: bet.amount, settled: bet.settled === 1 });
    }

    for (const evt of events) {
      runningBalance += evt.amount;

      if (evt.type === 'bet') {
        // 下注：增加未结算投入
        unsettledInvested += Math.abs(evt.amount);
      } else if (evt.type === 'payout') {
        // 派奖：减少对应的未结算投入（找到对应的已结算下注金额）
        // payout 是正数（净赚部分 + 本金返还），需要从 unsettled 中扣除本金
        // 派奖金额 = 净赚，但余额变化 = 净赚，而之前下注时余额已扣除本金
        // 实际上 payout 交易的 amount 就是 shares（赢时）或 0（输时）
        // 下注时 unsettledInvested += amount，结算时需要减去该笔 amount
        // 简化处理：按时间顺序，每个 payout 减去对应 bet 的 amount
        // 通过 ref_id 找到对应的 bet
        const payoutTx = transactions.find(t => t.type === 'payout' && t.created_at === evt.time);
        if (payoutTx?.ref_id) {
          const betInfo = betMap.get(payoutTx.ref_id);
          if (betInfo) {
            unsettledInvested -= betInfo.amount;
          }
        }
      }

      const totalAssets = runningBalance + unsettledInvested;
      balanceHistory.push({
        time: evt.time,
        balance: round2(totalAssets),
        change: round2(evt.amount),
        label: evt.label,
      });
    }

    const wonCount = bets.filter((b) => b.status === 'won').length;
    const lostCount = bets.filter((b) => b.status === 'lost').length;
    const pendingCount = bets.filter((b) => b.status === 'pending').length;
    const totalStaked = bets.reduce((sum, b) => sum + b.amount, 0);
    const totalPayout = bets.reduce((sum, b) => sum + b.payout, 0);

    return NextResponse.json({
      player: {
        id: user.id,
        username: user.username,
        balance: round2(user.balance),
        unsettled_bets_value: round2(unsettledRow.total_unsettled),
        total_assets: round2(user.balance + unsettledRow.total_unsettled),
        created_at: user.created_at,
      },
      stats: {
        total_bets: bets.length,
        won_count: wonCount,
        lost_count: lostCount,
        pending_count: pendingCount,
        win_rate: wonCount + lostCount > 0 ? round2((wonCount / (wonCount + lostCount)) * 100) : 0,
        total_staked: round2(totalStaked),
        total_payout: round2(totalPayout),
        net_profit: round2(user.balance - 100),
      },
      balance_history: balanceHistory,
      bets,
    });
  } catch (error) {
    console.error('Get player profile error:', error);
    return NextResponse.json({ error: '获取玩家页面失败' }, { status: 500 });
  }
}
