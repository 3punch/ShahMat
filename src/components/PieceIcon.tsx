import { HEROES } from '../game/heroes';
import type { PieceState } from '../game/types';
import { toFa } from '../lib/fa';

interface Props {
  piece: PieceState;
  showStatus?: boolean;
  size?: number;
}

export function Portrait({ heroId, size = 44 }: { heroId: string; size?: number }) {
  const hero = HEROES[heroId];
  return (
    <div className="portrait" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      <span>{hero?.name?.charAt(0) ?? '؟'}</span>
      {hero?.portrait && (
        <img
          src={`${import.meta.env.BASE_URL}${hero.portrait}`}
          alt={hero.name}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
    </div>
  );
}

export function CrownIcon() {
  return (
    <svg className="crown" viewBox="0 0 48 40" fill="none">
      <path
        d="M4 34 L2 10 L14 20 L24 4 L34 20 L46 10 L44 34 Z"
        fill="#f6d774"
        stroke="#8a6a14"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect x="4" y="32" width="40" height="6" rx="2" fill="#d9b34a" stroke="#8a6a14" strokeWidth="2" />
    </svg>
  );
}

export default function PieceIcon({ piece, showStatus = true, size }: Props) {
  const isShah = piece.heroId === 'shah';
  const status: string[] = [];
  if (showStatus && piece.shieldUntil) status.push('st-shield');
  if (showStatus && piece.rootedUntil) status.push('st-root');
  if (showStatus && piece.immuneUntil) status.push('st-immune');

  return (
    <div
      className={`piece ${piece.side} ${piece.cooldown > 0 ? 'dim' : ''}`}
      style={size ? { width: size, height: size } : undefined}
    >
      <div className="piece-disc">
        <Portrait heroId={piece.heroId} />
        {isShah && <CrownIcon />}
        {showStatus && piece.cooldown > 0 && (
          <span className="badge cd" title="نوبت تا آماده‌شدن قابلیت">
            {toFa(piece.cooldown)}
          </span>
        )}
        {status.includes('st-shield') && <span className="badge st-shield" title="سپر">س</span>}
        {status.includes('st-root') && <span className="badge st-root" title="قفل‌شده">ز</span>}
        {status.includes('st-immune') && <span className="badge st-immune" title="مصون">م</span>}
      </div>
    </div>
  );
}

export function heroTitle(heroId: string): string {
  return HEROES[heroId]?.name ?? heroId;
}
