import { memo, useCallback, useRef, useState } from 'react';
import { ROMAN, TOTAL_WEEKS, WEEKS_PER_YEAR, YEARS, formatDate, jitter, weekStart } from '../lib/weeks';
import type { Strings } from '../i18n';

interface CellsProps {
  lived: number;
  milestones: ReadonlyMap<number, string>;
  animKey: string;
}

/** Las 4.680 casillas. Memoizado: no se re-renderiza al tipear el nombre ni al mover el mouse. */
const Cells = memo(function Cells({ lived, milestones, animKey }: CellsProps) {
  // La animación de llenado dura ~1,6 s en total, sin importar cuántas semanas haya vividas.
  const step = lived > 0 ? 1600 / lived : 0;
  const rows = [];
  for (let r = 0; r < YEARS; r++) {
    const cells = [];
    for (let c = 0; c < WEEKS_PER_YEAR; c++) {
      const i = r * WEEKS_PER_YEAR + c;
      const state = i < lived ? 'l' : i === lived ? 'n' : 'f';
      const j = jitter(i);
      const cls = `c ${state}${milestones.has(i) ? ' m' : ''}${j ? ` j${j}` : ''}`;
      cells.push(
        <span
          key={i}
          className={cls}
          data-i={i}
          style={state === 'l' ? ({ '--d': `${Math.round(i * step)}ms` } as React.CSSProperties) : undefined}
        />,
      );
    }
    rows.push(
      <div key={r} className={r > 0 && r % 10 === 0 ? 'row decade' : 'row'}>
        <span className="year-label" aria-hidden="true">
          {r % 10 === 0 && r > 0 ? ROMAN[r / 10] : ''}
        </span>
        {cells}
      </div>,
    );
  }
  return (
    <div className="cells" key={animKey}>
      {rows}
    </div>
  );
});

interface WeekGridProps extends CellsProps {
  birth: number;
  t: Strings;
  label: string;
}

export function WeekGrid({ birth, lived, milestones, animKey, t, label }: WeekGridProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ i: number; x: number; y: number } | null>(null);

  // Un solo listener para toda la grilla en vez de 4.680.
  const onMove = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const raw = target.dataset.i;
    const wrap = wrapRef.current;
    if (raw === undefined || !wrap) return setTip(null);
    // offsetLeft/Top están en unidades del póster (sin zoom), relativas a .grid.
    setTip({
      i: Number(raw),
      x: target.offsetLeft + target.offsetWidth / 2,
      y: target.offsetTop,
    });
  }, []);

  const milestone = tip ? milestones.get(tip.i) : undefined;

  return (
    <div
      ref={wrapRef}
      className="grid"
      role="img"
      aria-label={label}
      onMouseMove={onMove}
      onMouseLeave={() => setTip(null)}
    >
      <Cells lived={Math.min(lived, TOTAL_WEEKS)} milestones={milestones} animKey={animKey} />
      {tip && (
        <div className="tooltip" style={{ left: tip.x, top: tip.y }} aria-hidden="true">
          <strong>{t.week(tip.i + 1)}</strong>
          <span>{formatDate(weekStart(birth, tip.i), t.locale)}</span>
          {milestone && <em>{milestone}</em>}
        </div>
      )}
    </div>
  );
}
