import { BOARD_SIZE } from '../game/types';
import type { GameState, MoveOption } from '../game/types';
import PieceIcon from './PieceIcon';

interface Props {
  state: GameState;
  selected: string | null;
  moveOptions: MoveOption[];
  abilityOptions: MoveOption[];
  onSquareClick: (r: number, c: number) => void;
  interactive?: boolean;
  lastMove?: { r: number; c: number } | null;
  /** برای حالت دیپلوی: فقط این خانه‌ها قابل کلیک‌اند */
  enabledSquares?: (r: number, c: number) => boolean;
}

export default function Board({
  state,
  selected,
  moveOptions,
  abilityOptions,
  onSquareClick,
  interactive = true,
  lastMove = null,
  enabledSquares,
}: Props) {
  const moveMap = new Map(moveOptions.map((m) => [`${m.r},${m.c}`, m]));
  const abilityMap = new Map(abilityOptions.map((m) => [`${m.r},${m.c}`, m]));

  const squares = [];
  const pieces = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const key = `${r},${c}`;
      const mv = moveMap.get(key);
      const ab = abilityMap.get(key);
      const pid = state.board[r][c];
      const isSel = selected && pid === selected;
      const enabled = interactive && (!enabledSquares || enabledSquares(r, c));

      let cls = `sq ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
      if (isSel) cls += ' selected';
      if (mv && mv.captureId) cls += ' target-capture';
      else if (mv) cls += ' target-move';
      if (ab && ab.captureId) cls += ' target-capture';
      else if (ab) cls += ' target-ability';
      if (enabled && (mv || ab || (enabledSquares && !pid) || (pid && !selected))) cls += ' clickable';
      if (lastMove && lastMove.r === r && lastMove.c === c) cls += ' last-moved';

      squares.push(
        <button
          key={key}
          className={cls}
          onClick={() => interactive && onSquareClick(r, c)}
          aria-label={`خانه ${r + 1}، ${c + 1}`}
          disabled={!interactive}
        />,
      );

      if (pid) {
        const p = state.pieces[pid];
        pieces.push(
          <div
            key={pid}
            className={`piece ${p.side} ${p.cooldown > 0 ? 'dim' : ''} ${
              selected === pid ? 'last-moved' : ''
            }`}
            style={{ top: `${r * 12.5}%`, left: `${c * 12.5}%` }}
          >
            <PieceIcon piece={p} />
          </div>,
        );
      }
    }
  }

  return (
    <div className="board-frame">
      <div className="board">
        {squares}
        {pieces}
      </div>
    </div>
  );
}
