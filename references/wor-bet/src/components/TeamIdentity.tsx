import { getTeamVisual, getFlagUrl } from '@/lib/teamVisuals';

interface TeamIdentityProps {
  name: string;
  align?: 'left' | 'right';
  size?: 'sm' | 'md';
  className?: string;
}

export default function TeamIdentity({ name, align = 'left', size = 'sm', className = '' }: TeamIdentityProps) {
  const visual = getTeamVisual(name);
  const isRight = align === 'right';
  const markSize = size === 'md' ? 'w-8 h-8' : 'w-6 h-6';
  const textSize = size === 'md' ? 'text-sm sm:text-base' : 'text-sm';
  const base = 'inline-flex items-center gap-1.5 min-w-0';
  const direction = isRight ? 'flex-row-reverse justify-end text-right' : 'justify-start text-left';
  const rootClass = [base, direction, className].filter(Boolean).join(' ');
  const markClass = [
    'shrink-0 inline-flex items-center justify-center rounded-full overflow-hidden',
    markSize,
  ].join(' ');

  return (
    <span className={rootClass} title={visual.label}>
      <span className={markClass} aria-label={visual.label}>
        {visual.kind === 'crest' ? (
          <img src={visual.value} alt={visual.label} className="w-full h-full object-contain p-0.5" loading="lazy" referrerPolicy="no-referrer" />
        ) : visual.kind === 'flag' ? (
          <img src={getFlagUrl(visual.value, 80)} alt={visual.label} className="w-full h-full object-cover rounded-full" loading="lazy" />
        ) : (
          <span className="leading-none select-none text-white/50 font-bold text-xs">{visual.value}</span>
        )}
      </span>
      <span className={['font-bold text-white truncate', textSize].join(' ')}>{name}</span>
    </span>
  );
}
