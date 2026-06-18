/**
 * Shared utilities for the World Cup betting app.
 * All labels are in Chinese; odds helpers convert API price (0–1) to display values.
 */

/**
 * Converts an API price (0–1 probability) to a formatted odds string with 2 decimal places.
 * Returns "0.00" if the price is invalid (≤ 0).
 */
export function priceToOdds(price: number): string {
  if (price <= 0) return '0.00';
  return (1 / price).toFixed(2);
}

/**
 * Returns a formatted odds string like "2.50倍" from an API price.
 */
export function formatOdds(price: number): string {
  return `${priceToOdds(price)}倍`;
}

/**
 * Maps a market type key to its Chinese label.
 */
export function getMarketLabel(marketType: string): string {
  switch (marketType) {
    case '1x2':
      return '胜负';
    case 'spread':
      return '让球';
    case 'ou25':
      return '大小2.5球';
    case 'cs':
      return '正确比分';
    default:
      return marketType;
  }
}

/**
 * Maps a result key to its Chinese label.
 */
export function getResultLabel(result: string): string {
  switch (result) {
    case 'home':
      return '主胜';
    case 'draw':
      return '平局';
    case 'away':
      return '客胜';
    case 'over':
      return '大于2.5球';
    case 'under':
      return '小于2.5球';
    default:
      return result;
  }
}

/**
 * Maps a match status key to its Chinese label.
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'upcoming':
      return '未开始';
    case 'live':
      return '进行中';
    case 'finished':
      return '已结束';
    default:
      return status;
  }
}

/**
 * Returns a Tailwind text-color class based on the API price.
 * High odds (big payout) → gold (exciting), mid → white, low → muted blue.
 */
export function oddsColor(price: number): string {
  if (price <= 0) return 'text-gray-500';
  if (price >= 0.6) return 'text-gray-200';       // heavy favorite → clean white
  if (price >= 0.35) return 'text-blue-300';      // mid range → sporty blue
  return 'text-amber-300';                         // underdog (big payout) → gold
}

/**
 * Formats an ISO date string to 'MM月DD日 HH:mm' in Beijing time (UTC+8).
 * Returns '时间待定' if the input cannot be parsed.
 */
export function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '时间待定';
  // Use toLocaleString with Asia/Shanghai timezone for Beijing time
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const month = parts.find(p => p.type === 'month')?.value ?? '??';
  const day = parts.find(p => p.type === 'day')?.value ?? '??';
  const hour = parts.find(p => p.type === 'hour')?.value ?? '??';
  const minute = parts.find(p => p.type === 'minute')?.value ?? '??';

  return `${month}月${day}日 ${hour}:${minute}`;
}
