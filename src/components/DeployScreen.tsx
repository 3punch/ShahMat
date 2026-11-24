import { useState } from 'react';
import { HEROES } from '../game/heroes';
import type { DeployedPiece } from '../game/types';
import { BOARD_SIZE } from '../game/types';
import { sideName, toFa } from '../lib/fa';
import { Portrait } from './PieceIcon';

interface Props {
  army: string[];
  side: 'gold' | 'azure';
  onConfirm: (setup: DeployedPiece[]) => void;
}

export default function DeployScreen({ army, side, onConfirm }: Props) {
  const homeRows = side === 'gold' ? [6, 7] : [0, 1];
  const tray: string[] = ['shah', ...army];
  const [placed, setPlaced] = useState<DeployedPiece[]>([]);
  const [selectedHero, setSelectedHero] = useState<string | null>(null);

  const placedCounts: Record<string, number> = {};
  placed.forEach((p) => (placedCounts[p.heroId] = (placedCounts[p.heroId] ?? 0) + 1));
  const trayCounts: Record<string, number> = {};
  tray.forEach((id) => (trayCounts[id] = (trayCounts[id] ?? 0) + 1));

  const remaining = (heroId: string) => (trayCounts[heroId] ?? 0) - (placedCounts[heroId] ?? 0);

  const clickSquare = (r: number, c: number) => {
    const existing = placed.find((p) => p.r === r && p.c === c);
    if (existing) {
      setPlaced(placed.filter((p) => !(p.r === r && p.c === c)));
      return;
    }
    if (!selectedHero || !homeRows.includes(r)) return;
    if (remaining(selectedHero) <= 0) return;
    setPlaced([...placed, { heroId: selectedHero, r, c }]);
    if (remaining(selectedHero) - 1 <= 0) setSelectedHero(null);
  };

  const allPlaced = placed.length === tray.length;
  const uniqueTray = Array.from(new Set(tray));

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <h2>آرایش سپاه {sideName(side)}</h2>
          <p>
            مهره‌ها را روی دو ردیف خودی بچین. اول از سمت راست یک مهره انتخاب کن، بعد روی خانه بزن. برای برداشتن مهره،
            روی خانه‌اش بزن.
          </p>
        </div>
        <div className="budget-pill">
          چیده‌شده: {toFa(placed.length)} از {toFa(tray.length)}
        </div>
      </div>

      <div className="deploy-layout">
        <div>
          <div className="board-frame">
            <div className="board">
              {Array.from({ length: BOARD_SIZE }).flatMap((_, r) =>
                Array.from({ length: BOARD_SIZE }).map((__, c) => {
                  const isHome = homeRows.includes(r);
                  const piece = placed.find((p) => p.r === r && p.c === c);
                  return (
                    <button
                      key={`${r},${c}`}
                      className={`sq ${(r + c) % 2 === 0 ? 'light' : 'dark'} ${
                        isHome ? 'clickable' : ''
                      } ${selectedHero && isHome && !piece ? 'target-ability' : ''}`}
                      onClick={() => clickSquare(r, c)}
                      disabled={!isHome}
                    >
                      {piece && (
                        <div className={`piece ${side}`} style={{ top: 0, left: 0, width: '100%', height: '100%' }}>
                          <div className="piece-disc">
                            <Portrait heroId={piece.heroId} />
                            {piece.heroId === 'shah' && (
                              <svg className="crown" viewBox="0 0 48 40" fill="none">
                                <path
                                  d="M4 34 L2 10 L14 20 L24 4 L34 20 L46 10 L44 34 Z"
                                  fill="#f6d774"
                                  stroke="#8a6a14"
                                  strokeWidth="2.5"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                }),
              )}
            </div>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>
            ردیف‌های مجاز برای {sideName(side)}: {side === 'gold' ? '۶ و ۷ (پایین صفحه)' : '۱ و ۲ (بالای صفحه)'}
          </p>
        </div>

        <div className="team-panel">
          <h3>مهره‌های تو</h3>
          <div className="tray">
            {uniqueTray.map((id) => (
              <button
                key={id}
                className={`tray-item ${selectedHero === id ? 'active' : ''} ${remaining(id) <= 0 ? 'disabled' : ''}`}
                onClick={() => setSelectedHero(remaining(id) > 0 ? id : null)}
                disabled={remaining(id) <= 0}
              >
                <Portrait heroId={id} size={44} />
                <span>{HEROES[id].name}</span>
                <span className="cnt">×{toFa(remaining(id))}</span>
              </button>
            ))}
          </div>
          <div className="stat-row">
            <span className="tag gold-tag">شروع‌کننده: سپاه طلایی</span>
          </div>
          <button className="btn wide" disabled={!allPlaced} onClick={() => onConfirm(placed)}>
            {allPlaced ? 'آرایش کامل است — ادامه' : 'همه‌ی مهره‌ها را بچین'}
          </button>
          <p className="hint">
            نکته: شاه را جای امن بگذار؛ اگر شاه بیفتد، بازی تمام است. قرارگیری پهلوانان قوی در جلوی میدان معمولاً بهتر
            است.
          </p>
        </div>
      </div>
    </div>
  );
}
