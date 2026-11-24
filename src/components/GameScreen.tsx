import { useEffect, useState } from 'react';
import {
  abilityTargets,
  applyAbility,
  canUseAbility,
  createInitialState,
  endTurn,
  isStuck,
  legalMoves,
  movePiece,
  reviveCandidates,
} from '../game/engine';
import { aiPlan } from '../game/ai';
import { HEROES } from '../game/heroes';
import type { DeployedPiece, GameState, MoveOption } from '../game/types';
import { sideName, toFa } from '../lib/fa';
import Board from './Board';
import { Portrait } from './PieceIcon';

interface Props {
  mode: 'ai' | 'local';
  goldSetup: DeployedPiece[];
  azureSetup: DeployedPiece[];
  onExit: () => void;
}

function afterAction(s: GameState): GameState {
  if (s.winner) return s;
  const noBonus = s.flags.bonusMoves.length === 0;
  const anyAbility = Object.values(s.pieces).some(
    (p) => p.alive && p.side === s.turn && canUseAbility(s, p.id),
  );
  if (s.flags.movesUsed > 0 && noBonus && !anyAbility) return endTurn(s);
  return s;
}

export default function GameScreen({ mode, goldSetup, azureSetup, onExit }: Props) {
  const [state, setState] = useState<GameState>(() => createInitialState(goldSetup, azureSetup));
  const [selected, setSelected] = useState<string | null>(null);
  const [targeting, setTargeting] = useState<{ pieceId: string; capturedId?: string } | null>(null);
  const [revivePick, setRevivePick] = useState<string | null>(null);

  const humanTurn = mode === 'local' || state.turn === 'gold';

  /* ===== نوبت هوش مصنوعی ===== */
  useEffect(() => {
    if (state.winner || mode !== 'ai' || state.turn !== 'azure') return;
    const t = setTimeout(() => {
      setState((cur) => {
        if (cur.winner || cur.turn !== 'azure') return cur;
        const plan = aiPlan(cur, 'azure');
        let s = cur;
        if (plan.ability) s = applyAbility(s, plan.ability.pieceId, plan.ability.arg);
        if (plan.move) s = movePiece(s, plan.move.pieceId, plan.move.r, plan.move.c);
        return endTurn(s);
      });
    }, 650);
    return () => clearTimeout(t);
  }, [state, mode]);

  /* ===== اگر بازیکن هیچ کاری نتواند بکند، نوبت رد می‌شود ===== */
  useEffect(() => {
    if (state.winner || !humanTurn) return;
    if (!isStuck(state)) return;
    const t = setTimeout(() => setState((cur) => (cur.winner ? cur : endTurn(cur))), 900);
    return () => clearTimeout(t);
  }, [state, humanTurn]);

  const sel = selected ? state.pieces[selected] : null;
  const selHero = sel ? HEROES[sel.heroId] : null;
  const moveOptions: MoveOption[] = selected && !targeting ? legalMoves(state, selected) : [];
  const abilityOptions: MoveOption[] = targeting ? abilityTargets(state, targeting.pieceId) : [];

  function onSquareClick(r: number, c: number) {
    if (state.winner || !humanTurn) return;

    if (targeting) {
      const opts = abilityTargets(state, targeting.pieceId);
      const hit = opts.find((o) => o.r === r && o.c === c);
      const ab = HEROES[state.pieces[targeting.pieceId].heroId].ability;
      if (!hit) {
        setTargeting(null);
        return;
      }
      if (ab.target === 'revive') {
        if (!targeting.capturedId) return;
        const capturedId = targeting.capturedId;
        const pid = targeting.pieceId;
        setState((prev) => afterAction(applyAbility(prev, pid, { capturedId, r, c })));
        setTargeting(null);
        return;
      }
      if (ab.target === 'empty-square') {
        const pid = targeting.pieceId;
        setState((prev) => afterAction(applyAbility(prev, pid, { r, c })));
        setTargeting(null);
        return;
      }
      if (hit.captureId) {
        const pid = targeting.pieceId;
        const targetPieceId = hit.captureId;
        setState((prev) => afterAction(applyAbility(prev, pid, { targetPieceId })));
      }
      setTargeting(null);
      return;
    }

    const pid = state.board[r][c];
    if (pid && state.pieces[pid].side === state.turn) {
      setSelected((prev) => (prev === pid ? null : pid));
      return;
    }
    if (selected) {
      const mv = legalMoves(state, selected).find((m) => m.r === r && m.c === c);
      if (mv) {
        setState((prev) => afterAction(movePiece(prev, selected, r, c)));
        setSelected(null);
        return;
      }
    }
    setSelected(null);
  }

  function startAbility() {
    if (!selected || !sel || !selHero) return;
    if (!canUseAbility(state, selected)) return;
    const ab = selHero.ability;
    if (ab.target === 'self') {
      setState((prev) => afterAction(applyAbility(prev, selected, {})));
      return;
    }
    if (ab.target === 'revive') {
      const cands = reviveCandidates(state, selected);
      if (cands.length === 0) return;
      setRevivePick(selected);
      return;
    }
    setTargeting({ pieceId: selected });
  }

  const targetingHero = targeting ? HEROES[state.pieces[targeting.pieceId].heroId] : null;
  const readyAbilities = Object.values(state.pieces).filter(
    (p) => p.alive && p.side === state.turn && canUseAbility(state, p.id),
  ).length;

  return (
    <div className="game-layout">
      <div>
        <Board
          state={state}
          selected={selected}
          moveOptions={moveOptions}
          abilityOptions={abilityOptions}
          onSquareClick={onSquareClick}
          interactive={humanTurn && !state.winner}
        />
        {targeting && (
          <p className="hint" style={{ textAlign: 'center', marginTop: 10 }}>
            حالت هدف‌گیری: <b style={{ color: 'var(--teal)' }}>{targetingHero?.ability.name}</b> — روی هدف بزن یا برای
            لغو، دوباره روی صفحه بزن.
          </p>
        )}
      </div>

      <div className="side-panel">
        <div className="panel-card">
          <div className="turn-banner">
            <div className="turn-chip">
              <span className={`turn-dot ${state.turn}`} />
              {mode === 'ai' && state.turn === 'azure' ? 'نوبت کامپیوتر' : `نوبت ${sideName(state.turn)}`}
              <span className="hint">نوبت {toFa(state.turnNumber)}</span>
            </div>
            {humanTurn && !state.winner && (
              <button
                className="btn small secondary"
                onClick={() => {
                  setState((prev) => endTurn(prev));
                  setSelected(null);
                  setTargeting(null);
                }}
              >
                پایان نوبت
              </button>
            )}
          </div>
          {!humanTurn && !state.winner && <p className="hint">کامپیوتر در حال اندیشیدن است…</p>}
          {humanTurn && state.flags.movesUsed > 0 && !state.winner && (
            <p className="hint">
              حرکت انجام شد{readyAbilities > 0 ? ' — می‌توانی یک قابلیت هم استفاده کنی یا نوبت را تمام کنی.' : '.'}
            </p>
          )}
        </div>

        <div className="panel-card piece-info">
          {sel && selHero ? (
            <>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Portrait heroId={sel.heroId} size={54} />
                <div>
                  <h3>{selHero.name}</h3>
                  <div className="stat-row" style={{ marginBottom: 0 }}>
                    <span className="tag gold-tag">ارزش {toFa(selHero.cost)}</span>
                    {sel.cooldown > 0 && <span className="tag red-tag">بازیابی: {toFa(sel.cooldown)} نوبت</span>}
                    {sel.shieldUntil && <span className="tag blue-tag">سپردار</span>}
                    {sel.rootedUntil && <span className="tag red-tag">قفل‌شده</span>}
                    {sel.immuneUntil && <span className="tag gold-tag">مصون</span>}
                  </div>
                </div>
              </div>
              <p className="bio">{selHero.bio}</p>
              <div className="stat-row">
                <span className="tag">حرکت: {selHero.moveText}</span>
              </div>
              <button
                className="ability-btn"
                disabled={!humanTurn || !canUseAbility(state, sel.id) || !!targeting}
                onClick={startAbility}
              >
                ✦ {selHero.ability.name}
              </button>
              <p className="ability-desc">
                {selHero.ability.text}
                {sel.cooldown > 0 ? ` (آماده پس از ${toFa(sel.cooldown)} نوبت دیگر)` : ' — آماده‌ی استفاده'}
              </p>
            </>
          ) : (
            <p className="hint">
              یکی از مهره‌های خودت را انتخاب کن تا حرکت‌ها و قابلیتش را ببینی. هر نوبت: یک حرکت + حداکثر یک قابلیت.
            </p>
          )}
        </div>

        <div className="panel-card">
          <p className="section-title">اسیران میدان</p>
          <div className="hint">مهره‌های از‌دست‌رفته‌ی طلایی:</div>
          <div className="captured-row">
            {state.captured
              .map((id) => state.pieces[id])
              .filter((p) => p.side === 'gold')
              .map((p) => (
                <Portrait key={p.id} heroId={p.heroId} size={34} />
              ))}
          </div>
          <div className="hint">مهره‌های از‌دست‌رفته‌ی لاجوردی:</div>
          <div className="captured-row">
            {state.captured
              .map((id) => state.pieces[id])
              .filter((p) => p.side === 'azure')
              .map((p) => (
                <Portrait key={p.id} heroId={p.heroId} size={34} />
              ))}
          </div>
        </div>

        <div className="panel-card">
          <p className="section-title">تاریخچه‌ی نبرد</p>
          <div className="log-list">
            {state.log
              .slice(-12)
              .reverse()
              .map((l, i) => (
                <div key={i} className={`log-item ${l.side}`}>
                  {l.text}
                </div>
              ))}
          </div>
        </div>

        <button className="btn secondary wide" onClick={onExit}>
          ↺ بازگشت به منو
        </button>
      </div>

      {state.winner && (
        <div className="overlay">
          <div className="dialog">
            <h2>{state.winner === 'gold' ? 'طلایی پیروز شد!' : 'لاجوردی پیروز شد!'}</h2>
            <p>
              شاه {sideName(state.winner === 'gold' ? 'azure' : 'gold')} بر زمین افتاد. {sideName(state.winner)} فرمانروای
              میدان است.
            </p>
            <div className="row">
              <button className="btn" onClick={onExit}>
                بازی جدید
              </button>
            </div>
          </div>
        </div>
      )}

      {revivePick && (
        <div className="overlay">
          <div className="dialog">
            <h2>مهر سیمرغ</h2>
            <p>کدام مهره را به میدان بازگردانیم؟ سپس خانه‌ای خالی کنار زال را انتخاب کن.</p>
            <div className="revive-list">
              {reviveCandidates(state, revivePick).map((p) => (
                <button
                  key={p.id}
                  className="revive-item"
                  onClick={() => {
                    setTargeting({ pieceId: revivePick, capturedId: p.id });
                    setRevivePick(null);
                  }}
                >
                  <Portrait heroId={p.heroId} size={38} />
                  {HEROES[p.heroId].name}
                </button>
              ))}
            </div>
            <div className="row">
              <button className="btn secondary" onClick={() => setRevivePick(null)}>
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
