/**
 * 赔率同步模块
 * 
 * 从 The Odds API (the-odds-api.com) 拉取实时赔率，
 * 转换为 Polymarket 风格的概率价格 (0~1)，更新到 market_options.price。
 * 
 * 支持的盘口:
 * - 1x2 (胜负平): 从 moneyline 赔率转换
 * - ou25 (大小球): 从 totals 赔率转换
 * - cs (正确比分): 基于进球期望估算（API 通常不提供精确比分盘口）
 * 
 * 用法:
 * - GET /api/cron/update-odds — 手动触发或被 cron 调用
 * - 环境变量 ODDS_API_KEY 必须设置
 */

import { getDb } from './db';

const ODDS_API_BASE = 'https://api.the-odds-api.com/v4';

interface OddsOutcome {
  name: string;
  price: number; // American odds, e.g. +150, -200
}

interface OddsMarket {
  key: string;
  outcomes: OddsOutcome[];
}

interface OddsMatch {
  id: string;
  sport_key: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: Array<{
    markets: OddsMarket[];
  }>;
}

/**
 * 美式赔率转概率 (Polymarket 价格)
 * +150 → 概率 40% → 价格 $0.40
 * -200 → 概率 66.7% → 价格 $0.67
 */
function americanToProbability(american: number): number {
  if (american > 0) {
    return 100 / (american + 100);
  } else {
    return Math.abs(american) / (Math.abs(american) + 100);
  }
}

/**
 * Decimal 赔率转概率
 */
function decimalToProbability(decimal: number): number {
  return 1 / decimal;
}

/**
 * 从 The Odds API 拉取赔率并更新数据库
 */
export async function updateOddsFromAPI(apiKey: string): Promise<{
  updated: number;
  errors: string[];
}> {
  const db = getDb();
  const errors: string[] = [];
  let updated = 0;

  // 获取所有 upcoming 的比赛
  const upcomingMatches = db
    .prepare(`SELECT id, home_team, away_team FROM matches WHERE status = 'upcoming'`)
    .all() as Array<{ id: number; home_team: string; away_team: string }>;

  if (upcomingMatches.length === 0) {
    return { updated: 0, errors: ['没有即将开始的比赛'] };
  }

  // 从 API 获取足球赔率 — 使用 soccer_euro_championship 或 soccer_world_cup
  // 尝试多个赛事 key
  const sportKeys = [
    'soccer_euro_championship',
    'soccer_world_cup',
    'soccer_fifa_world_cup',
    'upcoming', // fallback
  ];

  let apiMatches: OddsMatch[] = [];

  for (const sportKey of sportKeys) {
    try {
      const url = `${ODDS_API_BASE}/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=eu&markets=h2h,totals&oddsFormat=american`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      
      if (res.ok) {
        apiMatches = await res.json() as OddsMatch[];
        break;
      }
    } catch {
      // try next sport key
    }
  }

  if (apiMatches.length === 0) {
    return { updated: 0, errors: ['无法从 API 获取赔率数据'] };
  }

  // 构建 API 赔率索引 (team name → markets)
  const oddsMap = new Map<string, { h2h: Map<string, number>; totals: { over: number; under: number } | null }>();

  for (const apiMatch of apiMatches) {
    const h2hOdds = new Map<string, number>();
    let totals: { over: number; under: number } | null = null;

    // 取第一个有数据的 bookmaker
    for (const bookmaker of apiMatch.bookmakers || []) {
      for (const market of bookmaker.markets || []) {
        if (market.key === 'h2h') {
          for (const outcome of market.outcomes) {
            h2hOdds.set(outcome.name, outcome.price);
          }
        }
        if (market.key === 'totals' && !totals) {
          const overOutcome = market.outcomes.find(o => o.name === 'Over');
          const underOutcome = market.outcomes.find(o => o.name === 'Under');
          if (overOutcome && underOutcome) {
            totals = {
              over: overOutcome.price,
              under: underOutcome.price,
            };
          }
        }
      }
      if (h2hOdds.size > 0) break; // 取到数据就停
    }

    // 用 home_team + away_team 作为 key
    const key = `${apiMatch.home_team}|${apiMatch.away_team}`;
    oddsMap.set(key, { h2h: h2hOdds, totals });
  }

  // 更新每场比赛的盘口价格
  for (const match of upcomingMatches) {
    // 尝试多种匹配方式
    const exactKey = `${match.home_team}|${match.away_team}`;
    let odds = oddsMap.get(exactKey);

    // 模糊匹配: 反过来试试
    if (!odds) {
      const reverseKey = `${match.away_team}|${match.home_team}`;
      odds = oddsMap.get(reverseKey);
    }

    if (!odds || odds.h2h.size === 0) {
      errors.push(`${match.home_team} vs ${match.away_team}: 未找到赔率`);
      continue;
    }

    // 更新 1x2 盘口
    const x1x2Market = db
      .prepare(`SELECT id FROM markets WHERE match_id = ? AND market_type = '1x2'`)
      .get(match.id) as { id: number } | null;

    if (x1x2Market) {
      const options = db
        .prepare(`SELECT id, label FROM market_options WHERE market_id = ?`)
        .all(x1x2Market.id) as Array<{ id: number; label: string }>;

      for (const opt of options) {
        let americanOdds: number | undefined;
        if (opt.label === '主胜') {
          americanOdds = odds.h2h.get(match.home_team);
        } else if (opt.label === '客胜') {
          americanOdds = odds.h2h.get(match.away_team);
        } else if (opt.label === '平局') {
          americanOdds = odds.h2h.get('Draw');
        }

        if (americanOdds !== undefined) {
          const price = Math.max(0.02, Math.min(0.98, americanToProbability(americanOdds)));
          db.prepare('UPDATE market_options SET price = ? WHERE id = ?').run(
            Math.round(price * 1000) / 1000,
            opt.id
          );
          updated++;
        }
      }
    }

    // 更新 ou25 盘口
    const ou25Market = db
      .prepare(`SELECT id FROM markets WHERE match_id = ? AND market_type = 'ou25'`)
      .get(match.id) as { id: number } | null;

    if (ou25Market && odds.totals) {
      const options = db
        .prepare(`SELECT id, label FROM market_options WHERE market_id = ?`)
        .all(ou25Market.id) as Array<{ id: number; label: string }>;

      for (const opt of options) {
        let americanOdds: number | undefined;
        if (opt.label === '大于 2.5 球') {
          americanOdds = odds.totals.over;
        } else if (opt.label === '小于等于 2.5 球') {
          americanOdds = odds.totals.under;
        }

        if (americanOdds !== undefined) {
          const price = Math.max(0.02, Math.min(0.98, americanToProbability(americanOdds)));
          db.prepare('UPDATE market_options SET price = ? WHERE id = ?').run(
            Math.round(price * 1000) / 1000,
            opt.id
          );
          updated++;
        }
      }
    }

    // 正确比分盘口 — 基于胜负概率估算
    // 大多数 API 不提供精确比分盘口，这里用启发式方法
    const csMarket = db
      .prepare(`SELECT id FROM markets WHERE match_id = ? AND market_type = 'cs'`)
      .get(match.id) as { id: number } | null;

    if (csMarket) {
      // 取胜负概率来估算比分概率
      const homeWinOpt = db
        .prepare(`SELECT price FROM market_options WHERE market_id = ? AND label = '主胜'`)
        .get(x1x2Market?.id) as { price: number } | null;
      
      const homeWinProb = homeWinOpt?.price || 0.4;
      
      // 简单模型: 基于主胜概率分配比分
      const csPrices: Record<string, number> = {
        '1:0': homeWinProb * 0.28,
        '2:0': homeWinProb * 0.18,
        '2:1': homeWinProb * 0.22,
        '0:0': 0.12,
        '1:1': 0.14,
        '0:1': (1 - homeWinProb) * 0.22,
        '0:2': (1 - homeWinProb) * 0.18,
        '1:2': (1 - homeWinProb) * 0.28,
        '2:2': 0.06,
        '其他': 0.15,
      };

      const csOptions = db
        .prepare(`SELECT id, label FROM market_options WHERE market_id = ?`)
        .all(csMarket.id) as Array<{ id: number; label: string }>;

      for (const opt of csOptions) {
        const p = csPrices[opt.label];
        if (p !== undefined) {
          const price = Math.max(0.02, Math.min(0.98, p));
          db.prepare('UPDATE market_options SET price = ? WHERE id = ?').run(
            Math.round(price * 1000) / 1000,
            opt.id
          );
          updated++;
        }
      }
    }
  }

  return { updated, errors };
}

/**
 * 获取赔率 API 状态
 */
export function getOddsApiStatus(): { configured: boolean; keySource: string } {
  const key = process.env.ODDS_API_KEY;
  return {
    configured: !!key,
    keySource: key ? 'env' : 'not set',
  };
}
