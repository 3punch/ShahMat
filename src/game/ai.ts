import { HEROES } from './heroes';
import {
  abilityTargets,
  applyAbility,
  canUseAbility,
  cloneState,
  isProtected,
  legalMoves,
  movePiece,
} from './engine';
import type { AbilityArg, GameState, MoveOption, PieceState, Side } from './types';

export interface AiPlan {
  ability?: { pieceId: string; arg: AbilityArg };
  move?: { pieceId: string; r: number; c: number };
}

const pieceValue = (p: PieceState): number => HEROES[p.heroId]?.cost ?? 1;

function threatened(s: GameState, p: PieceState): boolean {
  if (isProtected(s, p)) return false;
  const enemySide: Side = p.side === 'gold' ? 'azure' : 'gold';
  for (const q of Object.values(s.pieces)) {
    if (!q.alive || q.side !== enemySide) continue;
    const moves = legalMoves(s, q.id);
    if (moves.some((m) => m.r === p.r && m.c === p.c)) return true;
  }
  return false;
}

function distanceToEnemyShah(s: GameState, p: PieceState): number {
  const enemyShah = Object.values(s.pieces).find(
    (q) => q.alive && q.heroId === 'shah' && q.side !== p.side,
  );
  if (!enemyShah) return 0;
  return Math.max(Math.abs(p.r - enemyShah.r), Math.abs(p.c - enemyShah.c));
}

function pickAbility(s: GameState, side: Side): { pieceId: string; arg: AbilityArg } | undefined {
  const mine = Object.values(s.pieces).filter((p) => p.alive && p.side === side && p.cooldown === 0);
  let best: { pieceId: string; arg: AbilityArg; score: number } | undefined;

  for (const p of mine) {
    if (!canUseAbility(s, p.id)) continue;
    const ab = HEROES[p.heroId].ability;
    const targets = abilityTargets(s, p.id);

    if (ab.id === 'rostam-strike' || ab.id === 'arash-arrow' || ab.id === 'kaman-shot') {
      for (const t of targets) {
        if (!t.captureId) continue;
        const victim = s.pieces[t.captureId];
        const score = victim.heroId === 'shah' ? 10000 : pieceValue(victim) * 14;
        if (!best || score > best.score) best = { pieceId: p.id, arg: { targetPieceId: t.captureId }, score };
      }
    } else if (ab.id === 'esf-chain') {
      for (const t of targets) {
        if (!t.captureId) continue;
        const victim = s.pieces[t.captureId];
        if (pieceValue(victim) >= 4 || distanceToEnemyShah(s, victim) <= 2) {
          const score = pieceValue(victim) * 4;
          if (!best || score > best.score) best = { pieceId: p.id, arg: { targetPieceId: t.captureId }, score };
        }
      }
    } else if (ab.id === 'siavash-fire' || ab.id === 'faramarz-shield') {
      const candidate =
        ab.id === 'siavash-fire'
          ? p
          : Object.values(s.pieces).find(
              (q) => q.alive && q.side === side && targets.some((t) => t.captureId === q.id) && threatened(s, q),
            );
      if (candidate && threatened(s, candidate) && pieceValue(candidate) >= 3) {
        const score = pieceValue(candidate) * 5;
        if (!best || score > best.score) {
          best = { pieceId: p.id, arg: { targetPieceId: candidate.id }, score };
        }
      }
    }
    // قابلیت‌های دیگر (جابه‌جایی، زنده‌کردن و...) برای AI عمدی استفاده نمی‌شوند
  }
  if (best && best.score > 0) return { pieceId: best.pieceId, arg: best.arg };
  return undefined;
}

function scoreMove(s0: GameState, p: PieceState, mv: MoveOption): number {
  const s = cloneState(s0);
  let score = Math.random() * 1.2;

  const before = distanceToEnemyShah(s, p);
  const moved = movePiece(s, p.id, mv.r, mv.c);
  const me = moved.pieces[p.id];
  const dist = distanceToEnemyShah(moved, me);
  score += (before - dist) * 2.2;

  // کمی به سمت مرکز
  score += (3.5 - Math.abs(me.r - 3.5)) * 0.25 + (3.5 - Math.abs(me.c - 3.5)) * 0.25;

  if (mv.captureId) {
    const victim = s.pieces[mv.captureId];
    score += pieceValue(victim) * 12 + 25;
  }

  if (moved.winner === p.side) score += 100000;

  if (!isProtected(moved, me) && threatened(moved, me)) {
    score -= pieceValue(me) * 9;
  }
  return score;
}

export function aiPlan(s0: GameState, side: Side): AiPlan {
  const s = cloneState(s0);
  const plan: AiPlan = {};

  // قابلیت تهاجمی در صورت فرصت
  const ab = pickAbility(s, side);
  if (ab) {
    plan.ability = ab;
    const afterAb = applyAbility(s, ab.pieceId, ab.arg);
    if (afterAb.winner === side) {
      return plan; // همان قابلیت برد می‌آورد
    }
    plan.move = pickMove(afterAb, side);
    return plan;
  }

  plan.move = pickMove(s, side);
  return plan;
}

function pickMove(s: GameState, side: Side): { pieceId: string; r: number; c: number } | undefined {
  const mine = Object.values(s.pieces).filter((p) => p.alive && p.side === side);
  let best: { pieceId: string; r: number; c: number; score: number } | undefined;

  for (const p of mine) {
    for (const mv of legalMoves(s, p.id)) {
      const score = scoreMove(s, p, mv);
      if (!best || score > best.score) best = { pieceId: p.id, r: mv.r, c: mv.c, score };
    }
  }
  return best ? { pieceId: best.pieceId, r: best.r, c: best.c } : undefined;
}

/** چیدن تیم خودکار برای حریف کامپیوتر با همان بودجه */
export function aiDraft(teamSize: number, budget: number): string[] {
  const roster = Object.values(HEROES).filter((h) => h.id !== 'shah');
  const pool = [...roster].sort(() => Math.random() - 0.5);
  const team: string[] = [];
  let left = budget;

  // اول چند انتخاب قوی و متنوع
  for (const h of pool) {
    if (team.length >= teamSize) break;
    const remainingSlots = teamSize - team.length;
    const cheapestFill = remainingSlots - 1; // بقیه با سرباز پر می‌شوند
    if (h.cost + cheapestFill * 1 <= left && countOf(team, h.id) < 2) {
      team.push(h.id);
      left -= h.cost;
    }
  }
  while (team.length < teamSize) {
    team.push('sarbaz');
    left -= 1;
  }
  return team;
}

function countOf(arr: string[], v: string): number {
  return arr.filter((x) => x === v).length;
}

/** آرایش خودکار: شاه وسط ردیف جلویی خودی، بقیه پراکنده */
export function aiDeploy(army: string[]): { heroId: string; r: number; c: number }[] {
  const rows = [6, 7];
  const slots: { r: number; c: number }[] = [];
  for (const r of rows) for (let c = 0; c < 8; c++) slots.push({ r, c });
  // اولویت: شاه در (7,3) یا نزدیک‌ترین
  const shuffled = slots.sort(() => Math.random() - 0.5);
  const out: { heroId: string; r: number; c: number }[] = [];

  const shahSlot = shuffled.findIndex((s) => s.r === 7 && (s.c === 3 || s.c === 4));
  const shahPos = shahSlot >= 0 ? shuffled.splice(shahSlot, 1)[0] : shuffled.pop()!;
  out.push({ heroId: 'shah', r: shahPos.r, c: shahPos.c });

  const ordered = [...army].sort((a, b) => (HEROES[b].cost ?? 0) - (HEROES[a].cost ?? 0));
  for (const heroId of ordered) {
    const pos = shuffled.pop();
    if (!pos) break;
    out.push({ heroId, r: pos.r, c: pos.c });
  }
  return out;
}
