import { describe, expect, it } from 'vitest';
import {
  abilityTargets,
  applyAbility,
  createInitialState,
  endTurn,
  legalMoves,
  movePiece,
} from './engine';
import type { DeployedPiece, GameState } from './types';

function baseState(): GameState {
  const gold: DeployedPiece[] = [
    { heroId: 'shah', r: 7, c: 4 },
    { heroId: 'rostam', r: 6, c: 3 },
    { heroId: 'sarbaz', r: 6, c: 4 },
    { heroId: 'arash', r: 7, c: 2 },
    { heroId: 'zal', r: 7, c: 5 },
  ];
  const azure: DeployedPiece[] = [
    { heroId: 'shah', r: 0, c: 4 },
    { heroId: 'sohrab', r: 1, c: 3 },
    { heroId: 'sarbaz', r: 1, c: 4 },
    { heroId: 'giv', r: 0, c: 2 },
    { heroId: 'siavash', r: 0, c: 5 },
  ];
  return createInitialState(gold, azure);
}

function findPiece(s: GameState, heroId: string, side: 'gold' | 'azure') {
  return Object.values(s.pieces).find((p) => p.heroId === heroId && p.side === side)!;
}

describe('engine', () => {
  it('سرباز به سمت دشمن حرکت می‌کند و به عقب نمی‌رود', () => {
    const s = baseState();
    const sarbaz = findPiece(s, 'sarbaz', 'gold');
    const targets = legalMoves(s, sarbaz.id).map((m) => `${m.r},${m.c}`);
    expect(targets).toContain('5,4');
    expect(targets).toContain('5,3');
    expect(targets).toContain('5,5');
    expect(targets).toContain('6,5');
    expect(targets).not.toContain('7,4');
  });

  it('حرکت کشویی با برخورد به مهره متوقف می‌شود', () => {
    const gold: DeployedPiece[] = [
      { heroId: 'shah', r: 7, c: 4 },
      { heroId: 'rostam', r: 6, c: 3 },
    ];
    const azure: DeployedPiece[] = [
      { heroId: 'shah', r: 0, c: 4 },
      { heroId: 'sohrab', r: 2, c: 3 },
      { heroId: 'sarbaz', r: 4, c: 3 },
    ];
    let s = createInitialState(gold, azure);
    s = endTurn(s); // نوبت لاجوردی
    const sohrab = findPiece(s, 'sohrab', 'azure');
    const down = legalMoves(s, sohrab.id)
      .filter((m) => m.c === 3 && m.r > 2)
      .map((m) => m.r);
    expect(down).toEqual([3]); // پشت سرباز خودی در (4,3) متوقف می‌شود
  });

  it('گرفتن شاه = پایان بازی', () => {
    let s = baseState();
    const rostam = findPiece(s, 'rostam', 'gold');
    const p = s.pieces[rostam.id];
    s.board[p.r][p.c] = null;
    p.r = 1;
    p.c = 5;
    s.board[1][5] = p.id;
    const shah = findPiece(s, 'shah', 'azure');
    const hit = legalMoves(s, p.id).find((m) => m.captureId === shah.id);
    expect(hit).toBeTruthy();
    s = movePiece(s, p.id, hit!.r, hit!.c);
    expect(s.winner).toBe('gold');
  });

  it('تیر آرش در خط دید مستقیم کار می‌کند و از پشت مهره عبور نمی‌کند', () => {
    const gold: DeployedPiece[] = [
      { heroId: 'shah', r: 7, c: 4 },
      { heroId: 'arash', r: 7, c: 2 },
    ];
    const azure: DeployedPiece[] = [
      { heroId: 'shah', r: 0, c: 4 },
      { heroId: 'sohrab', r: 5, c: 2 },
      { heroId: 'sarbaz', r: 2, c: 2 },
    ];
    const s = createInitialState(gold, azure);
    const arash = findPiece(s, 'arash', 'gold');
    const sohrab = findPiece(s, 'sohrab', 'azure');
    const sarbaz = findPiece(s, 'sarbaz', 'azure');
    const targets = abilityTargets(s, arash.id);
    expect(targets.map((t) => t.captureId)).toContain(sohrab.id);
    expect(targets.map((t) => t.captureId)).not.toContain(sarbaz.id); // پشت سهراب پنهان است
  });

  it('سپر فرامرز از گرفته‌شدن جلوگیری می‌کند', () => {
    const gold: DeployedPiece[] = [
      { heroId: 'shah', r: 7, c: 4 },
      { heroId: 'faramarz', r: 6, c: 3 },
      { heroId: 'sarbaz', r: 6, c: 4 },
    ];
    const azure: DeployedPiece[] = [
      { heroId: 'shah', r: 0, c: 4 },
      { heroId: 'sohrab', r: 2, c: 4 },
    ];
    let s = createInitialState(gold, azure);
    const faramarz = findPiece(s, 'faramarz', 'gold');
    const sarbaz = findPiece(s, 'sarbaz', 'gold');
    s = applyAbility(s, faramarz.id, { targetPieceId: sarbaz.id });
    s = endTurn(s);
    const sohrab = findPiece(s, 'sohrab', 'azure');
    expect(legalMoves(s, sohrab.id).some((m) => m.captureId === sarbaz.id)).toBe(false);
  });

  it('زنجیر اسفندیار حرکت دشمن را قفل می‌کند', () => {
    const gold: DeployedPiece[] = [
      { heroId: 'shah', r: 7, c: 4 },
      { heroId: 'esfandiar', r: 6, c: 3 },
    ];
    const azure: DeployedPiece[] = [
      { heroId: 'shah', r: 0, c: 4 },
      { heroId: 'sohrab', r: 3, c: 3 },
    ];
    let s = createInitialState(gold, azure);
    const esf = findPiece(s, 'esfandiar', 'gold');
    const sohrab = findPiece(s, 'sohrab', 'azure');
    s = applyAbility(s, esf.id, { targetPieceId: sohrab.id });
    s = endTurn(s);
    expect(legalMoves(s, sohrab.id).length).toBe(0);
  });

  it('مهر سیمرغ مهره‌ی افتاده را زنده می‌کند', () => {
    const gold: DeployedPiece[] = [
      { heroId: 'shah', r: 7, c: 4 },
      { heroId: 'zal', r: 7, c: 5 },
      { heroId: 'sarbaz', r: 6, c: 4 },
      { heroId: 'rostam', r: 6, c: 3 },
    ];
    const azure: DeployedPiece[] = [
      { heroId: 'shah', r: 0, c: 4 },
      { heroId: 'sohrab', r: 2, c: 4 },
    ];
    let s = createInitialState(gold, azure);
    const sarbaz = findPiece(s, 'sarbaz', 'gold');
    s = movePiece(s, sarbaz.id, 5, 4);
    s = endTurn(s);
    const sohrab = findPiece(s, 'sohrab', 'azure');
    s = movePiece(s, sohrab.id, 5, 4);
    expect(s.captured.length).toBe(1);
    s = endTurn(s);

    const zal = findPiece(s, 'zal', 'gold');
    const squares = abilityTargets(s, zal.id);
    expect(squares.length).toBeGreaterThan(0);
    const sq = squares[0];
    s = applyAbility(s, zal.id, { capturedId: s.captured[0], r: sq.r, c: sq.c });
    expect(s.captured.length).toBe(0);
    const back = Object.values(s.pieces).find((p) => p.heroId === 'sarbaz' && p.side === 'gold')!;
    expect(back.alive).toBe(true);
    expect(s.board[sq.r][sq.c]).toBe(back.id);
  });

  it('قابلیت خشم بیژن فقط قبل از حرکت مجاز است', () => {
    const gold: DeployedPiece[] = [
      { heroId: 'shah', r: 7, c: 4 },
      { heroId: 'bijan', r: 7, c: 3 },
    ];
    const azure: DeployedPiece[] = [{ heroId: 'shah', r: 0, c: 4 }];
    let st = createInitialState(gold, azure);
    const bijan = findPiece(st, 'bijan', 'gold');
    st = movePiece(st, bijan.id, 6, 2); // حرکت قطری
    expect(st.flags.movesUsed).toBe(1);
    const after = applyAbility(st, bijan.id, {});
    expect(after.flags.abilityUsed).toBe(false);
  });

  it('الهام شاهانه یک حرکت جایزه می‌دهد', () => {
    const gold: DeployedPiece[] = [{ heroId: 'shah', r: 7, c: 4 }];
    const azure: DeployedPiece[] = [{ heroId: 'shah', r: 0, c: 4 }];
    let s = createInitialState(gold, azure);
    const shah = findPiece(s, 'shah', 'gold');
    s = movePiece(s, shah.id, 6, 4);
    expect(legalMoves(s, shah.id).length).toBe(0); // بدون قابلیت، حرکت دوم نیست
    s = applyAbility(s, shah.id, {});
    const second = legalMoves(s, shah.id);
    expect(second.length).toBeGreaterThan(0);
    s = movePiece(s, shah.id, 5, 4);
    expect(s.pieces[shah.id].r).toBe(5);
    expect(legalMoves(s, shah.id).length).toBe(0);
  });
});
