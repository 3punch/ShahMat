import { useState } from 'react';
import { DRAFTABLE_HEROES, HEROES, SHAH } from '../game/heroes';
import type { HeroDef } from '../game/types';
import { BUDGET, MAX_COPIES, TEAM_SIZE } from '../game/types';
import { armyCost } from '../game/engine';
import { sideName, toFa } from '../lib/fa';
import { Portrait } from './PieceIcon';

interface Props {
  side: 'gold' | 'azure';
  onConfirm: (army: string[]) => void;
}

export default function DraftScreen({ side, onConfirm }: Props) {
  const [team, setTeam] = useState<string[]>([]);

  const spent = armyCost(team);
  const left = BUDGET - spent;

  const countOf = (id: string) => team.filter((x) => x === id).length;

  const add = (h: HeroDef) => {
    if (team.length >= TEAM_SIZE) return;
    if (countOf(h.id) >= MAX_COPIES) return;
    if (spent + h.cost > BUDGET) return;
    // همیشه باید جا برای پرکردن با ارزان‌ترین مهره (سرباز) بماند
    const remainingSlots = TEAM_SIZE - team.length - 1;
    if (spent + h.cost + remainingSlots * 1 > BUDGET) return;
    setTeam([...team, h.id]);
  };

  const removeAt = (idx: number) => setTeam(team.filter((_, i) => i !== idx));

  const ready = team.length === TEAM_SIZE && spent <= BUDGET;

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <h2>چیدن سپاه {sideName(side)}</h2>
          <p>
            {toFa(TEAM_SIZE)} قهرمان انتخاب کن (شاه رایگان اضافه می‌شود). روی کارت‌ها بزن تا به تیمت اضافه شوند.
          </p>
        </div>
        <div className="budget-pill">
          بودجه‌ی باقی‌مانده: {toFa(left)} از {toFa(BUDGET)} امتیاز
        </div>
      </div>

      <div className="draft-layout">
        <div className="hero-grid">
          <div className="hero-card" style={{ opacity: 0.95, borderColor: 'rgba(217,179,74,0.5)' }}>
            <div className="hero-card-top">
              <Portrait heroId="shah" size={52} />
              <div>
                <p className="hero-name">{SHAH.name} (شاه)</p>
                <span className="hero-cost">رایگان · اجباری</span>
              </div>
            </div>
            <div className="hero-move">حرکت: {SHAH.moveText}</div>
            <div className="hero-ability">
              <b>{SHAH.ability.name}</b> ({toFa(SHAH.ability.cooldown)}): {SHAH.ability.text}
            </div>
          </div>

          {DRAFTABLE_HEROES.map((h) => {
            const cnt = countOf(h.id);
            const can =
              team.length < TEAM_SIZE &&
              cnt < MAX_COPIES &&
              spent + h.cost <= BUDGET &&
              spent + h.cost + (TEAM_SIZE - team.length - 1) * 1 <= BUDGET;
            return (
              <button
                key={h.id}
                className={`hero-card ${can ? '' : 'disabled'}`}
                onClick={() => can && add(h)}
                disabled={!can}
              >
                <div className="hero-card-top">
                  <Portrait heroId={h.id} size={52} />
                  <div>
                    <p className="hero-name">{h.name}</p>
                    <span className="hero-cost">
                      {toFa(h.cost)} امتیاز{cnt > 0 ? ` · انتخاب‌شده: ${toFa(cnt)}` : ''}
                    </span>
                  </div>
                </div>
                <div className="hero-move">حرکت: {h.moveText}</div>
                <div className="hero-ability">
                  <b>{h.ability.name}</b> ({toFa(h.ability.cooldown)}): {h.ability.text}
                </div>
              </button>
            );
          })}
        </div>

        <div className="team-panel">
          <h3>
            سپاه تو ({toFa(team.length)}/{toFa(TEAM_SIZE)})
          </h3>
          <div className="team-slots">
            <div className="team-slot filled" style={{ cursor: 'default', borderColor: 'rgba(217,179,74,0.55)' }}>
              <Portrait heroId="shah" size={30} />
              <span>{SHAH.name} (شاه)</span>
            </div>
            {Array.from({ length: TEAM_SIZE }).map((_, i) => {
              const id = team[i];
              if (!id) return <div className="team-slot" key={i}>خالی</div>;
              return (
                <div className="team-slot filled" key={i} onClick={() => removeAt(i)} title="برای حذف بزن">
                  <Portrait heroId={id} size={30} />
                  <span>
                    {HEROES[id].name} · {toFa(HEROES[id].cost)}
                  </span>
                  <span className="rm">حذف ✕</span>
                </div>
              );
            })}
          </div>
          <div className="stat-row">
            <span className="tag gold-tag">هزینه: {toFa(spent)}</span>
            <span className="tag">مانده: {toFa(left)}</span>
          </div>
          <button className="btn wide" disabled={!ready} onClick={() => onConfirm(team)}>
            آماده است — ادامه
          </button>
          <p className="hint">
            نکته: تیم می‌تواند حداکثر {toFa(MAX_COPIES)} نسخه از هر قهرمان داشته باشد. سرباز ارزان‌ترین مهره برای پرکردن
            جای خالی است.
          </p>
        </div>
      </div>
    </div>
  );
}
