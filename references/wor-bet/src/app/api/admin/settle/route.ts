import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ensureInitialized } from '@/lib/init-app';

export async function POST(request: Request) {
  ensureInitialized();
  try {
    const user = await getCurrentUser();
    if (!user || user.is_admin !== 1) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { matchId, resultHome, resultAway } = await request.json();

    if (!matchId || resultHome === undefined || resultAway === undefined) {
      return NextResponse.json(
        { error: '参数不完整' },
        { status: 400 }
      );
    }

    const home = Number(resultHome);
    const away = Number(resultAway);

    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      return NextResponse.json(
        { error: '比分格式不正确' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get match info
    const match = db
      .prepare('SELECT * FROM matches WHERE id = ?')
      .get(matchId) as {
      id: number;
      home_team: string;
      away_team: string;
      status: string;
    } | null;

    if (!match) {
      return NextResponse.json({ error: '比赛不存在' }, { status: 404 });
    }

    if (match.status === 'finished') {
      return NextResponse.json(
        { error: '比赛已结算' },
        { status: 400 }
      );
    }

    // Get all markets for this match
    const markets = db
      .prepare('SELECT * FROM markets WHERE match_id = ?')
      .all(matchId) as Array<{
      id: number;
      market_type: string;
      settled: number;
    }>;

    const settlementSummary: Array<{
      market_type: string;
      winning_option: string;
      total_payout: number;
      winner_count: number;
    }> = [];

    const settleMatch = db.transaction(() => {
      // Update match result
      db.prepare(
        'UPDATE matches SET status = ?, result_home = ?, result_away = ? WHERE id = ?'
      ).run('finished', home, away, matchId);

      for (const market of markets) {
        let winningLabel: string;

        // Determine winning option based on market type
        switch (market.market_type) {
          case '1x2':
            if (home > away) {
              winningLabel = '主胜';
            } else if (home < away) {
              winningLabel = '客胜';
            } else {
              winningLabel = '平局';
            }
            break;

          case 'ou25':
            if (home + away > 2.5) {
              winningLabel = '大于 2.5 球';
            } else {
              winningLabel = '小于等于 2.5 球';
            }
            break;

          case 'spread': {
            // Label format: "{home_team} -1.5" and "{away_team} +1.5"
            // -1.5 (home) wins if home - away >= 2
            // +1.5 (away) wins if home - away <= 1
            const diff = home - away;
            const homeMinusLabel = `${match.home_team} -1.5`;
            const awayPlusLabel = `${match.away_team} +1.5`;
            if (diff >= 2) {
              winningLabel = homeMinusLabel;
            } else {
              winningLabel = awayPlusLabel;
            }
            break;
          }

          case 'cs': {
            const scoreStr = `${home}:${away}`;
            const validScores = [
              '0:0', '1:0', '0:1', '1:1', '2:0', '0:2', '2:1', '1:2', '2:2',
            ];
            if (validScores.includes(scoreStr)) {
              winningLabel = scoreStr;
            } else {
              winningLabel = '其他';
            }
            break;
          }

          default:
            continue;
        }

        // Mark market as settled
        db.prepare(
          'UPDATE markets SET settled = 1, winning_option = ? WHERE id = ?'
        ).run(winningLabel, market.id);

        // Get the winning option
        const winningOption = db
          .prepare('SELECT id FROM market_options WHERE market_id = ? AND label = ?')
          .get(market.id, winningLabel) as { id: number } | null;

        let totalPayout = 0;
        let winnerCount = 0;

        if (winningOption) {
          // Get all bets on the winning option
          const winningBets = db
            .prepare('SELECT id, user_id, shares FROM bets WHERE market_option_id = ?')
            .all(winningOption.id) as Array<{
            id: number;
            user_id: number;
            shares: number;
          }>;

          for (const bet of winningBets) {
            const payout = bet.shares; // shares × $1
            db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(
              payout,
              bet.user_id
            );
            db.prepare(
              `INSERT INTO transactions (user_id, type, amount, ref_id) VALUES (?, ?, ?, ?)`
            ).run(bet.user_id, 'payout', payout, bet.id);
            totalPayout += payout;
            winnerCount++;
          }
        }

        settlementSummary.push({
          market_type: market.market_type,
          winning_option: winningLabel,
          total_payout: Math.round(totalPayout * 100) / 100,
          winner_count: winnerCount,
        });
      }
    });

    settleMatch();

    return NextResponse.json({
      success: true,
      match: {
        id: matchId,
        result_home: home,
        result_away: away,
      },
      settlements: settlementSummary,
    });
  } catch (error) {
    console.error('Settle match error:', error);
    return NextResponse.json(
      { error: '结算失败，请稍后再试' },
      { status: 500 }
    );
  }
}
