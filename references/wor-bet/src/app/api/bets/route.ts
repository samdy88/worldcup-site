import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ensureInitialized } from '@/lib/init-app';

export async function GET() {
  ensureInitialized();
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const db = getDb();

    const bets = db
      .prepare(
        `SELECT
          b.id, b.amount, b.shares, b.price_at_bet, b.created_at,
          mo.id as option_id, mo.label as option_label,
          m.id as market_id, m.market_type, m.description as market_description,
          ma.id as match_id, ma.home_team, ma.away_team, ma.round_name, ma.status as match_status,
          mk.settled, mk.winning_option
         FROM bets b
         JOIN market_options mo ON b.market_option_id = mo.id
         JOIN markets m ON mo.market_id = m.id
         JOIN matches ma ON m.match_id = ma.id
         LEFT JOIN markets mk ON mo.market_id = mk.id
         WHERE b.user_id = ?
         ORDER BY b.created_at DESC`
      )
      .all(user.userId) as Array<{
      id: number;
      amount: number;
      shares: number;
      price_at_bet: number;
      created_at: string;
      option_id: number;
      option_label: string;
      market_id: number;
      market_type: string;
      market_description: string;
      match_id: number;
      home_team: string;
      away_team: string;
      round_name: string;
      match_status: string;
      settled: number;
      winning_option: string | null;
    }>;

    const formattedBets = bets.map((bet) => {
      const isWinning = bet.settled === 1 && bet.option_label === bet.winning_option;
      const isLost = bet.settled === 1 && bet.option_label !== bet.winning_option;

      return {
        id: bet.id,
        amount: bet.amount,
        shares: bet.shares,
        price_at_bet: bet.price_at_bet,
        created_at: bet.created_at,
        option: {
          id: bet.option_id,
          label: bet.option_label,
        },
        market: {
          id: bet.market_id,
          type: bet.market_type,
          description: bet.market_description,
          settled: bet.settled === 1,
          winning_option: bet.winning_option,
        },
        match: {
          id: bet.match_id,
          home_team: bet.home_team,
          away_team: bet.away_team,
          round_name: bet.round_name,
          status: bet.match_status,
        },
        status: bet.settled === 1
          ? (isWinning ? 'won' : (isLost ? 'lost' : 'settled'))
          : 'pending',
        estimated_payout: bet.settled === 1
          ? (isWinning ? Math.round(bet.shares * 100) / 100 : 0)
          : Math.round(bet.shares * 100) / 100,
      };
    });

    return NextResponse.json({ bets: formattedBets });
  } catch (error) {
    console.error('Get bets error:', error);
    return NextResponse.json(
      { error: '获取投注记录失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  ensureInitialized();
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { marketOptionId, amount } = await request.json();

    if (!marketOptionId || !amount) {
      return NextResponse.json(
        { error: '参数不完整' },
        { status: 400 }
      );
    }

    const betAmount = Number(amount);
    if (isNaN(betAmount) || betAmount <= 0) {
      return NextResponse.json(
        { error: '投注金额必须大于0' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get the option and its market/match info
    const option = db
      .prepare(
        `SELECT mo.id, mo.label, mo.price, mo.market_id, m.market_type, m.match_id, m.description as market_description
         FROM market_options mo
         JOIN markets m ON mo.market_id = m.id
         WHERE mo.id = ?`
      )
      .get(marketOptionId) as {
      id: number;
      label: string;
      price: number;
      market_id: number;
      market_type: string;
      match_id: number;
      market_description: string;
    } | null;

    if (!option) {
      return NextResponse.json(
        { error: '选项不存在' },
        { status: 404 }
      );
    }

    // Check match is upcoming
    const match = db
      .prepare('SELECT id, status FROM matches WHERE id = ?')
      .get(option.match_id) as { id: number; status: string } | null;

    if (!match || match.status !== 'upcoming') {
      return NextResponse.json(
        { error: '该比赛已开始或结束，无法投注' },
        { status: 400 }
      );
    }

    // Check if market is already settled
    const market = db
      .prepare('SELECT id, settled FROM markets WHERE id = ?')
      .get(option.market_id) as { id: number; settled: number } | null;

    if (!market || market.settled === 1) {
      return NextResponse.json(
        { error: '该市场已结算' },
        { status: 400 }
      );
    }

    // Check user balance
    const userRow = db
      .prepare('SELECT balance FROM users WHERE id = ?')
      .get(user.userId) as { balance: number } | null;

    if (!userRow || userRow.balance < betAmount) {
      return NextResponse.json(
        { error: '余额不足' },
        { status: 400 }
      );
    }

    // Check if user already bet on this market
    const existingBet = db
      .prepare(
        `SELECT b.id FROM bets b
         JOIN market_options mo ON b.market_option_id = mo.id
         WHERE b.user_id = ? AND mo.market_id = ?`
      )
      .get(user.userId, option.market_id);

    if (existingBet) {
      return NextResponse.json(
        { error: '您已在此市场下注，不能重复投注' },
        { status: 400 }
      );
    }

    // Fixed price from database (Polymarket style — price = probability)
    const price = option.price;
    const shares = betAmount / price;

    // Execute transaction
    const placeBet = db.transaction(() => {
      db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(
        betAmount,
        user.userId
      );

      const betResult = db
        .prepare(
          `INSERT INTO bets (user_id, market_option_id, amount, shares, price_at_bet)
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(user.userId, marketOptionId, betAmount, shares, price);

      db.prepare(
        `INSERT INTO transactions (user_id, type, amount, ref_id) VALUES (?, ?, ?, ?)`
      ).run(user.userId, 'bet', -betAmount, betResult.lastInsertRowid as number);

      return betResult;
    });

    const betResult = placeBet();

    const updatedUser = db
      .prepare('SELECT balance FROM users WHERE id = ?')
      .get(user.userId) as { balance: number };

    return NextResponse.json({
      success: true,
      bet: {
        id: betResult.lastInsertRowid,
        amount: betAmount,
        shares: Math.round(shares * 100) / 100,
        price_at_bet: Math.round(price * 1000) / 1000,
        estimated_payout: Math.round(shares * 100) / 100,
        option_label: option.label,
        market_description: option.market_description,
      },
      balance: updatedUser.balance,
    });
  } catch (error) {
    console.error('Place bet error:', error);
    return NextResponse.json(
      { error: '投注失败，请稍后再试' },
      { status: 500 }
    );
  }
}
