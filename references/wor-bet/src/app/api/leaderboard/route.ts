import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureInitialized } from '@/lib/init-app';

export async function GET() {
  ensureInitialized();
  try {
    const db = getDb();

    const users = db
      .prepare('SELECT id, username, balance FROM users ORDER BY balance DESC')
      .all() as Array<{
      id: number;
      username: string;
      balance: number;
    }>;

    const leaderboard = users.map((user) => {
      // 未结算投注按投入金额计算（不算假设胜利资金）
      const unsettledRow = db
        .prepare(
          `SELECT COALESCE(SUM(b.amount), 0) as total_unsettled
           FROM bets b
           JOIN market_options mo ON b.market_option_id = mo.id
           JOIN markets m ON mo.market_id = m.id
           WHERE b.user_id = ? AND m.settled = 0`
        )
        .get(user.id) as { total_unsettled: number };

      const unsettledValue = unsettledRow.total_unsettled;
      const totalAssets = user.balance + unsettledValue;

      return {
        id: user.id,
        username: user.username,
        balance: Math.round(user.balance * 100) / 100,
        unsettled_bets_value: Math.round(unsettledValue * 100) / 100,
        total_assets: Math.round(totalAssets * 100) / 100,
      };
    });

    // Sort by total assets descending
    leaderboard.sort((a, b) => b.total_assets - a.total_assets);

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return NextResponse.json(
      { error: '获取排行榜失败' },
      { status: 500 }
    );
  }
}
