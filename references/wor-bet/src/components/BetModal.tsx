'use client';

import { useState, useEffect, useRef } from 'react';
import { priceToOdds as calcOdds, getMarketLabel, formatTime } from '@/lib/utils';
import { settlementBasisText } from '@/lib/teamVisuals';
import { formatMarketOptionLabel, getSpreadOptionHint } from '@/lib/marketDisplay';
import TeamIdentity from './TeamIdentity';

interface BetModalProps {
  matchInfo: { home_team: string; away_team: string; kickoff_time?: string };
  marketInfo: { type: string; description: string };
  option: { id: number; label: string; price: number };
  balance: number;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

export default function BetModal({ matchInfo, marketInfo, option, balance, onClose, onSuccess }: BetModalProps) {
  const [amount, setAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const isOutright = matchInfo.away_team === '其他';
  const safeOdds = option.price > 0 ? (1 / option.price) : 0;
  const estimatedReturn = amount * safeOdds;
  const estimatedProfit = estimatedReturn - amount;
  const isValid = amount > 0 && amount <= balance && safeOdds > 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const quickAmounts = [5, 10, 25, 50];

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketOptionId: option.id, amount }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '投注失败');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess(data.balance);
        onCloseRef.current();
      }, 1500);
    } catch {
      setError('网络错误，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const oddsDisplay = calcOdds(option.price);

  const displayOption = formatMarketOptionLabel(marketInfo.type, option.label);

  const selectionLabel = isOutright
    ? `${matchInfo.home_team} ${option.label === '是' ? '赢' : '不赢'}`
    : displayOption.accessible;

  const matchLabel = isOutright
    ? matchInfo.home_team
    : `${matchInfo.home_team} vs ${matchInfo.away_team}`;

  const selectionHint = (() => {
    if (marketInfo.type === '1x2') {
      if (option.label === '主胜') return '你选择的是：主场球队在常规90分钟+伤停补时内获胜';
      if (option.label === '客胜') return '你选择的是：客场球队在常规90分钟+伤停补时内获胜';
      if (option.label === '平局') return '你选择的是：常规90分钟+伤停补时后双方打平；即使加时或点球分出胜负，平局仍算赢';
    }
    if (marketInfo.type === 'spread') return getSpreadOptionHint(option.label);
    if (marketInfo.type === 'ou25') {
      if (option.label.includes('大于')) return '大于2.5：只看常规90分钟+伤停补时，双方总进球 ≥ 3 球算赢';
      return '小于等于2.5：只看常规90分钟+伤停补时，双方总进球 ≤ 2 球算赢';
    }
    return '';
  })();

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-md glass-card border-gold/30 overflow-hidden mobile-sheet sm:animate-slide-up sm:rounded-xl sm:relative sm:bottom-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-2 pb-0">
          <div className="w-9 h-1 rounded-full bg-white/20" />
        </div>

        <div className="h-1 bg-gradient-to-r from-gold-dark via-gold to-gold-light" />
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">🎯 下注确认</h3>
              <p className="text-white/50 text-xs sm:text-sm mt-0.5">{matchLabel}</p>
            </div>
            <button onClick={onClose} aria-label="关闭" className="text-white/40 hover:text-white transition-colors p-1 -mr-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {success ? (
            <div className="text-center py-6 sm:py-8 animate-fade-in">
              <div className="text-5xl mb-3">🎉</div>
              <p className="text-xl font-bold text-gold">投注成功！</p>
              <p className="text-white/60 text-sm mt-2">祝你好运！🏆</p>
            </div>
          ) : (
            <>
              {/* Selection summary */}
              {!isOutright && (
                <div className="grid grid-cols-[1fr_auto_1fr] gap-1.5 sm:gap-2 items-center mb-3 rounded-lg bg-white/[0.03] border border-white/5 p-2.5 sm:p-3">
                  <div className="text-right min-w-0">
                    <span className="inline-block text-[9px] sm:text-[10px] text-blue-200/75 bg-blue-500/10 border border-blue-400/20 rounded-full px-1.5 py-px mb-0.5">主场</span>
                    <TeamIdentity name={matchInfo.home_team} align="right" />
                  </div>
                  <span className="text-[10px] font-black text-gold/60 px-1 sm:px-2">VS</span>
                  <div className="min-w-0">
                    <span className="inline-block text-[9px] sm:text-[10px] text-amber-200/75 bg-amber-500/10 border border-amber-400/20 rounded-full px-1.5 py-px mb-0.5">客场</span>
                    <TeamIdentity name={matchInfo.away_team} align="left" />
                  </div>
                </div>
              )}

              <div className="bg-white/5 rounded-lg p-3 sm:p-4 mb-4 space-y-1.5 sm:space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">市场</span>
                  <span className="text-white font-medium">
                    {isOutright ? '冠军盘' : getMarketLabel(marketInfo.type)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">选择</span>
                  <span className="text-gold font-bold">{selectionLabel}</span>
                </div>
                {selectionHint && (
                  <div className="rounded-md bg-blue-500/10 border border-blue-400/20 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-[11px] text-blue-100/75 leading-relaxed">
                    {selectionHint}
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">赔率</span>
                  <span className="text-gold font-bold text-base">{oddsDisplay} 倍</span>
                </div>
                {matchInfo.kickoff_time && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">⏱ 开赛时间</span>
                    <span className="text-white/70">{formatTime(matchInfo.kickoff_time)}</span>
                  </div>
                )}
                <div className="text-[10px] sm:text-xs text-white/30 pt-1 border-t border-white/10">
                  💡 投 $1 → 赢了得 ${oddsDisplay} · {settlementBasisText}
                </div>
              </div>

              {/* Amount input */}
              <div className="mb-3 sm:mb-4">
                <label className="block text-sm text-white/60 mb-1.5 sm:mb-2">投入金额</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="decimal"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value) || 0)}
                    className="w-full pl-7 pr-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white text-lg font-bold focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 placeholder-white/30"
                    placeholder="0"
                  />
                </div>

                <div className="flex gap-1.5 sm:gap-2 mt-2">
                  {quickAmounts.map((qa) => (
                    <button
                      key={qa}
                      onClick={() => setAmount(Math.min(qa, balance))}
                      disabled={qa > balance}
                      className="flex-1 py-2 text-xs rounded-md bg-white/10 hover:bg-white/20 active:bg-white/25 text-white/70 disabled:opacity-30 transition-all"
                    >
                      ${qa}
                    </button>
                  ))}
                  <button
                    onClick={() => setAmount(Math.floor(balance))}
                    className="flex-1 py-2 text-xs rounded-md bg-gold/20 hover:bg-gold/30 active:bg-gold/40 text-gold font-medium transition-all"
                  >
                    全部
                  </button>
                </div>
              </div>

              {/* Calculation */}
              {amount > 0 && (
                <div className="bg-white/5 rounded-lg p-3 mb-3 text-sm space-y-1.5 animate-fade-in">
                  <div className="flex justify-between">
                    <span className="text-white/50">投入</span>
                    <span className="text-white">${amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">赔率</span>
                    <span className="text-gold font-bold">{oddsDisplay} 倍</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">赢了收回</span>
                    <span className="text-white font-medium">${estimatedReturn.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-1.5">
                    <span className="text-white/50">净赚</span>
                    <span className="text-green-400 font-bold">+${estimatedProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">可用余额</span>
                    <span className={`${amount > balance ? 'text-red-400' : 'text-white/70'}`}>
                      ${balance.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/15 border border-red-500/30 rounded-lg px-3 py-2 text-red-300 text-sm mb-3">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!isValid || loading}
                className="w-full btn-gold py-3 text-base disabled:opacity-40"
              >
                {loading ? '处理中...' : isValid ? `确认投注 $${amount.toFixed(2)}` : '请输入金额'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
