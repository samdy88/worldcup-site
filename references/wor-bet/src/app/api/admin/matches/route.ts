import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { ensureInitialized } from '@/lib/init-app';

const MARKET_OPTIONS: Record<string, string[]> = {
  '1x2': ['主胜', '平局', '客胜'],
  ou25: ['大于 2.5 球', '小于等于 2.5 球'],
};

const MARKET_DESCRIPTIONS: Record<string, string> = {
  '1x2': '胜负平',
  ou25: '大小球 2.5',
};

export async function POST(request: Request) {
  ensureInitialized();
  try {
    const user = await getCurrentUser();
    if (!user || user.is_admin !== 1) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { homeTeam, awayTeam, roundName, kickoffTime, tournamentId } = await request.json();

    if (!homeTeam || !awayTeam || !kickoffTime) {
      return NextResponse.json(
        { error: '参数不完整' },
        { status: 400 }
      );
    }

    const db = getDb();

    const createMatchWithMarkets = db.transaction(() => {
      const matchResult = db
        .prepare(
          `INSERT INTO matches (tournament_id, home_team, away_team, round_name, kickoff_time, status)
           VALUES (?, ?, ?, ?, ?, 'upcoming')`
        )
        .run(tournamentId || null, homeTeam, awayTeam, roundName || null, kickoffTime);

      const matchId = matchResult.lastInsertRowid as number;

      const markets: Array<{ market_type: string; options: string[] }> = [];

      for (const [marketType, options] of Object.entries(MARKET_OPTIONS)) {
        const marketResult = db
          .prepare(
            `INSERT INTO markets (match_id, market_type, description) VALUES (?, ?, ?)`
          )
          .run(matchId, marketType, MARKET_DESCRIPTIONS[marketType]);

        const marketId = marketResult.lastInsertRowid as number;

        options.forEach((label, index) => {
          db.prepare(
            `INSERT INTO market_options (market_id, label, sort_order) VALUES (?, ?, ?)`
          ).run(marketId, label, index);
        });

        markets.push({ market_type: marketType, options });
      }

      return { matchId, markets };
    });

    const result = createMatchWithMarkets();

    return NextResponse.json({
      success: true,
      match: {
        id: result.matchId,
        home_team: homeTeam,
        away_team: awayTeam,
        round_name: roundName,
        kickoff_time: kickoffTime,
        status: 'upcoming',
        markets: result.markets,
      },
    });
  } catch (error) {
    console.error('Create match error:', error);
    return NextResponse.json(
      { error: '创建比赛失败' },
      { status: 500 }
    );
  }
}
