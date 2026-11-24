import { toFa } from '../lib/fa';
import { HEROES } from './heroes';
import type {
  AbilityArg,
  DeployedPiece,
  GameState,
  MoveOption,
  PieceState,
  Side,
  TurnFlags,
} from './types';
import { BOARD_SIZE } from './types';

export function cloneState(s: GameState): GameState {
  return {
    board: s.board.map((row) => [...row]),
    pieces: Object.fromEntries(
      Object.entries(s.pieces).map(([k, v]) => [k, { ...v }]),
    ),
    captured: [...s.captured],
    turn: s.turn,
    turnNumber: s.turnNumber,
    winner: s.winner,
    log: [...s.log],
    flags: { ...s.flags, bonusMoves: [...s.flags.bonusMoves] },
    reviveUsed: { ...s.reviveUsed },
  };
}

export function onBoard(r: number, c: number): boolean {
  return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
}

export function chebyshev(a: PieceState | { r: number; c: number }, b: { r: number; c: number }): number {
  return Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c));
}

/** آیا مهره در برابر گرفته‌شدن محافظت دارد؟ (مصونیت یا سپر) */
export function isProtected(s: GameState, p: PieceState): boolean {
  const t = s.turnNumber;
  return Boolean((p.immuneUntil && t < p.immuneUntil) || (p.shieldUntil && t < p.shieldUntil));
}

function isRooted(s: GameState, p: PieceState): boolean {
  return Boolean(p.rootedUntil && s.turnNumber < p.rootedUntil);
}

function freshFlags(): TurnFlags {
  return {
    movesUsed: 0,
    abilityUsed: false,
    bonusMoves: [],
    bijanBuff: null,
    sohrabChainActive: false,
    sohrabExtraUsed: false,
  };
}

function pieceDir(stepDr: number, fwd: boolean | undefined, side: Side): number {
  if (!fwd) return stepDr;
  return side === 'gold' ? -Math.abs(stepDr) : Math.abs(stepDr);
}

/** آیا این مهره الان (در نوبت جاری) می‌تواند حرکت کند؟ */
export function canMoveNow(s: GameState, p: PieceState): boolean {
  if (s.winner || !p.alive) return false;
  if (p.side !== s.turn) return false;
  if (isRooted(s, p)) return false;
  return s.flags.movesUsed === 0 || s.flags.bonusMoves.includes(p.id);
}

export function legalMoves(s: GameState, pieceId: string): MoveOption[] {
  const p = s.pieces[pieceId];
  if (!p || !canMoveNow(s, p)) return [];
  const hero = HEROES[p.heroId];
  const boost = s.flags.bijanBuff === pieceId ? 2 : 0;
  const out: MoveOption[] = [];
  const seen = new Set<string>();

  const push = (r: number, c: number, captureId?: string) => {
    const key = `${r},${c}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(captureId ? { r, c, captureId } : { r, c });
  };

  for (const st of hero.steps) {
    const dr = pieceDir(st.dr, st.fwd, p.side);
    if (st.kind === 'jump') {
      const nr = p.r + dr;
      const nc = p.c + st.dc;
      if (!onBoard(nr, nc)) continue;
      const occ = s.board[nr][nc];
      if (!occ) push(nr, nc);
      else {
        const op = s.pieces[occ];
        if (op.side !== p.side && !isProtected(s, op)) push(nr, nc, occ);
      }
    } else {
      for (let k = 1; k <= st.range + boost; k++) {
        const nr = p.r + dr * k;
        const nc = p.c + st.dc * k;
        if (!onBoard(nr, nc)) break;
        const occ = s.board[nr][nc];
        if (!occ) {
          push(nr, nc);
        } else {
          const op = s.pieces[occ];
          if (op.side !== p.side && !isProtected(s, op)) push(nr, nc, occ);
          break;
        }
      }
    }
  }
  return out;
}

function capturePiece(s: GameState, captor: PieceState, targetId: string): void {
  const target = s.pieces[targetId];
  if (!target || !target.alive) return;
  target.alive = false;
  s.board[target.r][target.c] = null;
  s.captured.push(targetId);
  s.log.push({
    side: captor.side,
    text: `${HEROES[captor.heroId].name}، ${HEROES[target.heroId].name} را از میدان به در کرد.`,
  });
  if (target.heroId === 'shah') {
    s.winner = captor.side;
    s.log.push({
      side: 'system',
      text: captor.side === 'gold' ? 'شاه لاجوردی افتاد! سپاه طلایی پیروز شد.' : 'شاه طلایی افتاد! سپاه لاجوردی پیروز شد.',
    });
  }
}

/** حرکت عادی مهره (با گرفتن احتمالی) */
export function movePiece(s0: GameState, pieceId: string, r: number, c: number): GameState {
  const s = cloneState(s0);
  const p = s.pieces[pieceId];
  if (!p) return s;
  const mv = legalMoves(s, pieceId).find((m) => m.r === r && m.c === c);
  if (!mv) return s;

  const isBonus = s.flags.movesUsed > 0;
  const from = { r: p.r, c: p.c };
  const heroName = HEROES[p.heroId].name;

  if (isBonus) {
    s.flags.bonusMoves = s.flags.bonusMoves.filter((id) => id !== pieceId);
  } else {
    s.flags.movesUsed = 1;
  }

  s.board[from.r][from.c] = null;
  if (mv.captureId) capturePiece(s, p, mv.captureId);
  p.r = r;
  p.c = c;
  s.board[r][c] = pieceId;

  if (s.flags.bijanBuff === pieceId) s.flags.bijanBuff = null;

  if (!mv.captureId) {
    s.log.push({ side: p.side, text: `${heroName} به خانه‌ی ${squareName(r, c)} رفت.` });
  }

  // شور جنگ سهراب: با گرفتن، حرکت جایزه
  if (
    mv.captureId &&
    s.flags.sohrabChainActive &&
    !s.flags.sohrabExtraUsed &&
    p.heroId === 'sohrab' &&
    !s.winner
  ) {
    s.flags.sohrabExtraUsed = true;
    s.flags.bonusMoves.push(pieceId);
    s.log.push({ side: p.side, text: 'شور جنگ! سهراب باز هم می‌تواند حرکت کند.' });
  }
  return s;
}

export function squareName(r: number, c: number): string {
  return `${toFa(r + 1)}، ${toFa(c + 1)}`;
}

/** خانه‌های هدف قابلیت (برای هایلایت UI). captureId شناسه‌ی مهره‌ی هدف است. */
export function abilityTargets(s0: GameState, pieceId: string): MoveOption[] {
  const s = s0;
  const p = s.pieces[pieceId];
  if (!p || !p.alive || s.flags.abilityUsed || p.cooldown > 0 || s.winner) return [];
  if (p.side !== s.turn) return [];
  const ab = HEROES[p.heroId].ability;
  const out: MoveOption[] = [];

  switch (ab.target) {
    case 'self':
      return [{ r: p.r, c: p.c }];
    case 'enemy-piece': {
      for (const q of Object.values(s.pieces)) {
        if (q.alive && q.side !== p.side && chebyshev(p, q) <= (ab.range ?? 1) && !isProtected(s, q)) {
          out.push({ r: q.r, c: q.c, captureId: q.id });
        }
      }
      return out;
    }
    case 'ally-piece': {
      for (const q of Object.values(s.pieces)) {
        if (q.alive && q.side === p.side && chebyshev(p, q) <= (ab.range ?? 1)) {
          out.push({ r: q.r, c: q.c, captureId: q.id });
        }
      }
      return out;
    }
    case 'enemy-los': {
      const range = ab.losRange ?? 4;
      const dirs: [number, number][] = [
        [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1],
      ];
      for (const [dr, dc] of dirs) {
        for (let k = 1; k <= range; k++) {
          const nr = p.r + dr * k;
          const nc = p.c + dc * k;
          if (!onBoard(nr, nc)) break;
          const occ = s.board[nr][nc];
          if (occ) {
            const op = s.pieces[occ];
            if (op.side !== p.side && !isProtected(s, op)) out.push({ r: nr, c: nc, captureId: occ });
            break;
          }
        }
      }
      return out;
    }
    case 'enemy-swap': {
      for (const q of Object.values(s.pieces)) {
        if (
          q.alive && q.side !== p.side && q.heroId !== 'shah' &&
          chebyshev(p, q) <= (ab.range ?? 1)
        ) {
          out.push({ r: q.r, c: q.c, captureId: q.id });
        }
      }
      return out;
    }
    case 'ally-swap': {
      for (const q of Object.values(s.pieces)) {
        if (q.alive && q.side === p.side && q.id !== p.id && chebyshev(p, q) <= (ab.range ?? 1)) {
          out.push({ r: q.r, c: q.c, captureId: q.id });
        }
      }
      return out;
    }
    case 'empty-square': {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (!s.board[r][c] && chebyshev(p, { r, c }) <= (ab.range ?? 1)) out.push({ r, c });
        }
      }
      return out;
    }
    case 'revive': {
      if (s.reviveUsed[pieceId]) return [];
      const fallen = s.captured
        .map((id) => s.pieces[id])
        .filter((q) => q.side === p.side);
      if (fallen.length === 0) return [];
      // مرحله‌ی اول: انتخاب مهره‌ی افتاده (توی UI با دیالوگ) — مرحله‌ی دوم: خانه‌ی خالی کنار زال
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (!s.board[r][c] && chebyshev(p, { r, c }) <= 1) out.push({ r, c });
        }
      }
      return out;
    }
  }
}

/** مهره‌های افتاده‌ی قابل زنده‌شدن با مهر سیمرغ */
export function reviveCandidates(s: GameState, pieceId: string): PieceState[] {
  const p = s.pieces[pieceId];
  if (!p || s.reviveUsed[pieceId]) return [];
  return s.captured.map((id) => s.pieces[id]).filter((q) => q.side === p.side);
}

export function canUseAbility(s: GameState, pieceId: string): boolean {
  const p = s.pieces[pieceId];
  if (!p || !p.alive || s.winner) return false;
  if (p.side !== s.turn) return false;
  if (s.flags.abilityUsed || p.cooldown > 0) return false;
  const ab = HEROES[p.heroId].ability;
  if (ab.id === 'bijan-rage' && s.flags.movesUsed > 0) return false; // باید قبل از حرکت باشد
  if (ab.id === 'zal-revive') return abilityTargets(s, pieceId).length > 0;
  return abilityTargets(s, pieceId).length > 0;
}

export function applyAbility(s0: GameState, pieceId: string, arg: AbilityArg): GameState {
  const s = cloneState(s0);
  const p = s.pieces[pieceId];
  if (!p || !canUseAbility(s, pieceId)) return s;
  const ab = HEROES[p.heroId].ability;

  switch (ab.id) {
    case 'rostam-strike':
    case 'arash-arrow':
    case 'kaman-shot': {
      if (!arg.targetPieceId) return s0;
      const target = s.pieces[arg.targetPieceId];
      if (!target || !target.alive) return s;
      const ok = abilityTargets(s, pieceId).some((t) => t.captureId === arg.targetPieceId);
      if (!ok) return s0;
      capturePiece(s, p, arg.targetPieceId);
      s.log.push({
        side: p.side,
        text:
          ab.id === 'rostam-strike'
            ? 'گرز دستان فرود آمد!'
            : ab.id === 'arash-arrow'
              ? 'تیر آرش رها شد!'
              : 'تیر کماندار نشست!',
      });
      break;
    }
    case 'esf-chain': {
      if (!arg.targetPieceId) return s0;
      const target = s.pieces[arg.targetPieceId];
      const ok = abilityTargets(s, pieceId).some((t) => t.captureId === arg.targetPieceId);
      if (!ok || !target) return s0;
      target.rootedUntil = s.turnNumber + 2;
      s.log.push({ side: p.side, text: `زنجیر اسفندیار، ${HEROES[target.heroId].name} را قفل کرد.` });
      break;
    }
    case 'siavash-fire': {
      p.immuneUntil = s.turnNumber + 2;
      s.log.push({ side: p.side, text: 'آزمون آتش! سیاوش تا نوبت بعدی مصون است.' });
      break;
    }
    case 'faramarz-shield': {
      if (!arg.targetPieceId) return s0;
      const ok = abilityTargets(s, pieceId).some((t) => t.captureId === arg.targetPieceId);
      const target = s.pieces[arg.targetPieceId];
      if (!ok || !target) return s0;
      target.shieldUntil = s.turnNumber + 2;
      s.log.push({ side: p.side, text: `سپر خاندان بر سر ${HEROES[target.heroId].name} نشست.` });
      break;
    }
    case 'gordafarid-trick': {
      if (!arg.targetPieceId) return s0;
      const ok = abilityTargets(s, pieceId).some((t) => t.captureId === arg.targetPieceId);
      const target = s.pieces[arg.targetPieceId];
      if (!ok || !target) return s0;
      const tr = target.r;
      const tc = target.c;
      target.r = p.r;
      target.c = p.c;
      p.r = tr;
      p.c = tc;
      s.board[p.r][p.c] = p.id;
      s.board[target.r][target.c] = target.id;
      s.log.push({ side: p.side, text: 'نیرنگ جنگ! گردافرید جایش را با دشمن عوض کرد.' });
      break;
    }
    case 'toos-formation': {
      if (!arg.targetPieceId) return s0;
      const ok = abilityTargets(s, pieceId).some((t) => t.captureId === arg.targetPieceId);
      const target = s.pieces[arg.targetPieceId];
      if (!ok || !target) return s0;
      const tr = target.r;
      const tc = target.c;
      target.r = p.r;
      target.c = p.c;
      p.r = tr;
      p.c = tc;
      s.board[p.r][p.c] = p.id;
      s.board[target.r][target.c] = target.id;
      s.log.push({ side: p.side, text: 'آرایش سپاه! طوس با هم‌تیمی‌اش جابه‌جا شد.' });
      break;
    }
    case 'bijan-rage': {
      s.flags.bijanBuff = pieceId;
      s.log.push({ side: p.side, text: 'خشم بیژن! بُرد حرکت این نوبت بیشتر شد.' });
      break;
    }
    case 'giv-courier': {
      const r = arg.r ?? -1;
      const c = arg.c ?? -1;
      const ok = abilityTargets(s, pieceId).some((t) => t.r === r && t.c === c);
      if (!ok) return s0;
      s.board[p.r][p.c] = null;
      p.r = r;
      p.c = c;
      s.board[r][c] = pieceId;
      s.log.push({ side: p.side, text: 'پیک تند! گیو در یک چشم‌به‌هم‌زدن جابه‌جا شد.' });
      break;
    }
    case 'zal-revive': {
      const capturedId = arg.capturedId;
      const r = arg.r ?? -1;
      const c = arg.c ?? -1;
      if (!capturedId || s.reviveUsed[pieceId]) return s0;
      const fallen = s.pieces[capturedId];
      if (!fallen || fallen.alive || fallen.side !== p.side) return s0;
      const okSquare = abilityTargets(s, pieceId).some((t) => t.r === r && t.c === c);
      if (!okSquare) return s0;
      fallen.alive = true;
      fallen.r = r;
      fallen.c = c;
      fallen.cooldown = 0;
      fallen.rootedUntil = undefined;
      s.board[r][c] = capturedId;
      s.captured = s.captured.filter((id) => id !== capturedId);
      s.reviveUsed[pieceId] = true;
      s.log.push({ side: p.side, text: `مهر سیمرغ! ${HEROES[fallen.heroId].name} به میدان بازگشت.` });
      break;
    }
    case 'royal-inspiration':
    case 'sarbaz-daring': {
      s.flags.bonusMoves.push(pieceId);
      s.log.push({
        side: p.side,
        text: ab.id === 'royal-inspiration' ? 'الهام شاهانه! کی‌خسرو باز هم راه می‌رود.' : 'جسارت سرباز! یک گام دیگر.',
      });
      break;
    }
    case 'sohrab-fury': {
      s.flags.sohrabChainActive = true;
      s.log.push({ side: p.side, text: 'شور جنگ! سهراب آماده‌ی یورش دوباره است.' });
      break;
    }
    default:
      return s0;
  }

  p.cooldown = ab.cooldown;
  s.flags.abilityUsed = true;
  return s;
}

/** پایان نوبت: تعویض سمت، کاهش بازیابی‌ها، پاک‌سازی اثرهای منقضی */
export function endTurn(s0: GameState): GameState {
  const s = cloneState(s0);
  if (s.winner) return s;
  s.flags = freshFlags();
  s.turn = s.turn === 'gold' ? 'azure' : 'gold';
  s.turnNumber += 1;

  for (const p of Object.values(s.pieces)) {
    if (!p.alive) continue;
    if (p.side === s.turn && p.cooldown > 0) p.cooldown -= 1;
    if (p.immuneUntil && p.immuneUntil <= s.turnNumber) p.immuneUntil = undefined;
    if (p.shieldUntil && p.shieldUntil <= s.turnNumber) p.shieldUntil = undefined;
    if (p.rootedUntil && p.rootedUntil <= s.turnNumber) p.rootedUntil = undefined;
  }
  return s;
}

export function armyCost(heroIds: string[]): number {
  return heroIds.reduce((sum, id) => sum + (HEROES[id]?.cost ?? 0), 0);
}

function freshBoard(): (string | null)[][] {
  return Array.from({ length: BOARD_SIZE }, () => Array<string | null>(BOARD_SIZE).fill(null));
}

export function createInitialState(gold: DeployedPiece[], azure: DeployedPiece[]): GameState {
  const board = freshBoard();
  const pieces: Record<string, PieceState> = {};
  const counters: Record<string, number> = {};

  const place = (d: DeployedPiece, side: Side) => {
    const n = (counters[`${side}-${d.heroId}`] = (counters[`${side}-${d.heroId}`] ?? 0) + 1);
    const id = `${side === 'gold' ? 'g' : 'a'}-${d.heroId}-${n}`;
    pieces[id] = {
      id,
      heroId: d.heroId,
      side,
      r: d.r,
      c: d.c,
      cooldown: 0,
      alive: true,
    };
    board[d.r][d.c] = id;
  };

  gold.forEach((d) => place(d, 'gold'));
  azure.forEach((d) => place(d, 'azure'));

  return {
    board,
    pieces,
    captured: [],
    turn: 'gold',
    turnNumber: 1,
    winner: null,
    log: [{ side: 'system', text: 'شیپور نبرد نواخته شد. سپاه طلایی آغاز می‌کند.' }],
    flags: freshFlags(),
    reviveUsed: {},
  };
}

/** آیا بازیکن نوبت‌ فعلی هیچ کاری نمی‌تواند بکند؟ */
export function isStuck(s: GameState): boolean {
  const mine = Object.values(s.pieces).filter((p) => p.alive && p.side === s.turn);
  for (const p of mine) {
    if (legalMoves(s, p.id).length > 0) return false;
    if (canUseAbility(s, p.id)) return false;
  }
  return true;
}
