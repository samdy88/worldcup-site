import assert from 'node:assert/strict';
import { getTeamVisual, settlementBasisText } from '../src/lib/teamVisuals';
import { formatMarketOptionLabel, formatSpreadOptionLabel, getSpreadOptionHint } from '../src/lib/marketDisplay';

assert.equal(getTeamVisual('墨西哥').kind, 'flag');
assert.equal(getTeamVisual('墨西哥').value, '🇲🇽');
assert.equal(getTeamVisual('波黑').value, '🇧🇦');
assert.equal(getTeamVisual('波斯尼亚和黑塞哥维那').value, '🇧🇦');
assert.equal(getTeamVisual('巴黎圣日耳曼').kind, 'crest');
assert.match(getTeamVisual('巴黎圣日耳曼').value, /Paris_Saint-Germain/);
assert.equal(getTeamVisual('未知球队').kind, 'fallback');
assert.equal(settlementBasisText.includes('常规90分钟'), true);
assert.equal(settlementBasisText.includes('不包含加时赛'), true);
assert.equal(settlementBasisText.includes('点球大战'), true);

const mexicoMinus = formatSpreadOptionLabel('墨西哥 -1.5');
assert.equal(mexicoMinus.primary, '墨西哥需赢2球以上');
assert.equal(mexicoMinus.secondary, '90分钟内赢1球不算赢');
assert.equal(mexicoMinus.accessible, '墨西哥需赢2球以上，90分钟内赢1球不算赢');

const southAfricaPlus = formatSpreadOptionLabel('南非 +1.5');
assert.equal(southAfricaPlus.primary, '南非不输2球就赢');
assert.equal(southAfricaPlus.secondary, '赢球、打平、只输1球都算赢');
assert.equal(southAfricaPlus.accessible, '南非不输2球就赢，赢球、打平、只输1球都算赢');

assert.equal(formatMarketOptionLabel('spread', '南非 +1.5').primary, '南非不输2球就赢');
assert.equal(formatMarketOptionLabel('1x2', '平局').primary, '平局');
assert.equal(getSpreadOptionHint('墨西哥 -1.5'), '只看常规90分钟+伤停补时：墨西哥必须赢2球或更多才算赢。');
assert.equal(getSpreadOptionHint('南非 +1.5'), '只看常规90分钟+伤停补时：南非赢球、打平、或只输1球都算赢；输2球或更多才算输。');
assert.equal(/[+-]\d/.test(formatMarketOptionLabel('spread', '南非 +1.5').accessible), false);

console.log('team visuals, settlement basis, and market display checks passed');
