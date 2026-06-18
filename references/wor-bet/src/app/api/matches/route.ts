import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureInitialized } from '@/lib/init-app';

export async function GET() {
  ensureInitialized();
  try {
    const db = getDb();

    // Get all tournaments
    const tournaments = db
      .prepare('SELECT id, name, slug, icon, sport, start_date, end_date, status, sort_order FROM tournaments ORDER BY sort_order ASC')
      .all() as Array<{
        id: number;
        name: string;
        slug: string;
        icon: string;
        sport: string;
        start_date: string;
        end_date: string;
        status: string;
        sort_order: number;
      }>;

    const matches = db
      .prepare(
        `SELECT m.id, m.tournament_id, m.home_team, m.away_team, m.round_name, m.kickoff_time, m.status, m.result_home, m.result_away
         FROM matches m ORDER BY m.kickoff_time ASC`
      )
      .all() as Array<{
        id: number;
        tournament_id: number;
        home_team: string;
        away_team: string;
        round_name: string;
        kickoff_time: string;
        status: string;
        result_home: number | null;
        result_away: number | null;
      }>;

    const result = matches.map((match) => {
      const markets = db
        .prepare(
          `SELECT id, match_id, market_type, description, settled, winning_option
           FROM markets WHERE match_id = ?`
        )
        .all(match.id) as Array<{
          id: number;
          match_id: number;
          market_type: string;
          description: string;
          settled: number;
          winning_option: string | null;
        }>;

      const marketsWithOptions = markets.map((market) => {
        const options = db
          .prepare(
            `SELECT id, market_id, label, price, sort_order FROM market_options WHERE market_id = ? ORDER BY sort_order`
          )
          .all(market.id) as any[];

        return { ...market, options };
      });

      return { ...match, markets: marketsWithOptions };
    });

    return NextResponse.json({ tournaments, matches: result });
  } catch (error) {
    console.error('Get matches error:', error);
    return NextResponse.json(
      { error: '获取比赛数据失败' },
      { status: 500 }
    );
  }
}
