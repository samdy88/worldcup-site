export type TeamVisualKind = 'flag' | 'crest' | 'fallback';

export interface TeamVisual {
  kind: TeamVisualKind;
  value: string;       // URL for crest, country code for flag
  label: string;
}

export const settlementBasisText = '所有足球盘口均按常规90分钟加伤停补时的官方比分结算，不包含加时赛和点球大战。决赛如果90分钟打平，即胜负盘的平局赢；让球和大小2.5球也只看90分钟加伤停补时内的比分。';

// 中文队名 → ISO 3166-1 alpha-2 国家代码
// 使用 flagcdn.com 或 flagpedia.net 的 PNG 国旗图片
const FLAG_CODE_MAP: Record<string, string> = {
  '乌兹别克斯坦': 'uz',
  '乌拉圭': 'uy',
  '伊拉克': 'iq',
  '伊朗': 'ir',
  '佛得角': 'cv',
  '克罗地亚': 'hr',
  '刚果民主共和国': 'cd',
  '刚果（金）': 'cd',
  '加拿大': 'ca',
  '加纳': 'gh',
  '南非': 'za',
  '卡塔尔': 'qa',
  '厄瓜多尔': 'ec',
  '哥伦比亚': 'co',
  '土耳其': 'tr',
  '埃及': 'eg',
  '塞内加尔': 'sn',
  '墨西哥': 'mx',
  '奥地利': 'at',
  '巴拉圭': 'py',
  '巴拿马': 'pa',
  '巴西': 'br',
  '库拉索': 'cw',
  '德国': 'de',
  '挪威': 'no',
  '捷克': 'cz',
  '摩洛哥': 'ma',
  '新西兰': 'nz',
  '日本': 'jp',
  '比利时': 'be',
  '沙特': 'sa',
  '法国': 'fr',
  '波斯尼亚和黑塞哥维那': 'ba',
  '波黑': 'ba',
  '海地': 'ht',
  '澳大利亚': 'au',
  '瑞典': 'se',
  '瑞士': 'ch',
  '科特迪瓦': 'ci',
  '突尼斯': 'tn',
  '约旦': 'jo',
  '美国': 'us',
  '苏格兰': 'gb-sct',
  '英格兰': 'gb-eng',
  '荷兰': 'nl',
  '葡萄牙': 'pt',
  '西班牙': 'es',
  '阿尔及利亚': 'dz',
  '阿根廷': 'ar',
  '韩国': 'kr',
  '哥斯达黎加': 'cr',
};

/** 获取国旗图片 URL */
export function getFlagUrl(code: string, width: number = 40): string {
  return `https://flagcdn.com/w${width}/${code}.png`;
}

const CREST_MAP: Record<string, string> = {
  '巴黎圣日耳曼': 'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg',
  '阿森纳': 'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg',
  '皇家马德里': 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg',
  '拜仁慕尼黑': 'https://upload.wikimedia.org/wikipedia/commons/1/1f/FC_Bayern_München_logo_%282017%29.svg',
  '曼城': 'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg',
  '巴塞罗那': 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg',
  '国际米兰': 'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg',
};

export function getTeamVisual(teamName: string): TeamVisual {
  const normalized = teamName.trim();
  const crest = CREST_MAP[normalized];
  if (crest) return { kind: 'crest', value: crest, label: normalized + ' 队徽' };

  const flagCode = FLAG_CODE_MAP[normalized];
  if (flagCode) return { kind: 'flag', value: flagCode, label: normalized + ' 国旗' };

  return { kind: 'fallback', value: normalized.slice(0, 2) || '?', label: normalized + ' 标识' };
}
