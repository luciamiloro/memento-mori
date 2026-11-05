import { memo, useCallback, useRef, useState } from 'react';
import { ROMAN, WEEKS_PER_YEAR, formatDate, jitter, totalWeeks, weekStart } from '../lib/weeks';
import type { Strings } from '../i18n';

interface CellsProps {
  years: number;
  lived: number;
  milestones: ReadonlyMap<number, string>;
  animKey: string;
}

/** Alto disponible para la grilla en el póster (lo que ocupan 90 filas de 7 px). */
const GRID_H = 824;
const ROW_GAP = 1.8;
const DECADE_GAP = 4;

/** Tamaño de casilla para que entren `years` filas: 7 px hasta 90 años, más chico si hay más. */
function cellSize(years: number): number {
  const decades = Math.floor((years - 1) / 10);
  const fit = (GRID_H - decades * DECADE_GAP) / years - ROW_GAP;
  return Math.min(7, Math.floor(fit * 10) / 10);
}

/** Las casillas (52 × años). Memoizado: no se re-renderiza al tipear el nombre ni al mover el mouse. */
const Cells = memo(function Cells({ years, lived, milestones, animKey }: CellsProps) {
  // La animación de llenado dura ~1,6 s en total, sin importar cuántas semanas haya vividas.
  const step = lived > 0 ? 1600 / lived : 0;
  const rows = [];
  for (let r = 0; r < years; r++) {
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

export function WeekGrid({ birth, years, lived, milestones, animKey, t, label }: WeekGridProps) {
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
      style={{ '--cell': `${cellSize(years)}px` } as React.CSSProperties}
      role="img"
      aria-label={label}
      onMouseMove={onMove}
      onMouseLeave={() => setTip(null)}
    >
      <Cells years={years} lived={Math.min(lived, totalWeeks(years))} milestones={milestones} animKey={animKey} />
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
