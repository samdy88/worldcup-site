export interface MarketOptionDisplay {
  primary: string;
  secondary?: string;
  accessible: string;
}

function parseSpreadLabel(label: string): { team: string; side: 'favorite' | 'underdog' } | null {
  const trimmed = label.trim();
  const match = trimmed.match(/^(.+?)\s+([+-])\d+(?:\.\d+)?$/);
  if (!match) return null;
  return {
    team: match[1].trim(),
    side: match[2] === '-' ? 'favorite' : 'underdog',
  };
}

export function formatSpreadOptionLabel(label: string): MarketOptionDisplay {
  const parsed = parseSpreadLabel(label);
  if (!parsed) {
    return { primary: label, accessible: label };
  }

  if (parsed.side === 'favorite') {
    const primary = `${parsed.team}需赢2球以上`;
    const secondary = '90分钟内赢1球不算赢';
    return { primary, secondary, accessible: `${primary}，${secondary}` };
  }

  const primary = `${parsed.team}不输2球就赢`;
  const secondary = '赢球、打平、只输1球都算赢';
  return { primary, secondary, accessible: `${primary}，${secondary}` };
}

export function formatMarketOptionLabel(marketType: string, label: string): MarketOptionDisplay {
  if (marketType === 'spread') return formatSpreadOptionLabel(label);
  return { primary: label, accessible: label };
}

export function getSpreadOptionHint(label: string): string {
  const parsed = parseSpreadLabel(label);
  if (!parsed) return '只看常规90分钟+伤停补时：按页面口语化说明判断是否赢。';

  if (parsed.side === 'favorite') {
    return `只看常规90分钟+伤停补时：${parsed.team}必须赢2球或更多才算赢。`;
  }

  return `只看常规90分钟+伤停补时：${parsed.team}赢球、打平、或只输1球都算赢；输2球或更多才算输。`;
}
