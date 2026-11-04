import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TOTAL_WEEKS, WEEKS_PER_YEAR, YEARS, formatDate, todayUTC, weekIndex, weekStart } from '../lib/weeks';
import type { Strings } from '../i18n';

interface LifeViewProps {
  birth: number;
  name: string;
  milestones: { ms: number; label: string }[];
  t: Strings;
}

const LABEL_W = 18;

interface CellsProps {
  lived: number;
  milestones: ReadonlyMap<number, string>;
  selected: number;
}

/** Grilla fluida: 52 columnas que se estiran al ancho disponible (pensada para el celular). */
const LifeCells = memo(function LifeCells({ lived, milestones, selected }: CellsProps) {
  const items = [];
  for (let r = 0; r < YEARS; r++) {
    const dec = r > 0 && r % 10 === 0;
    items.push(
      <span key={`y${r}`} className={dec ? 'life-year dec' : 'life-year'} aria-hidden="true">
        {dec && <span>{r}</span>}
      </span>,
    );
    for (let c = 0; c < WEEKS_PER_YEAR; c++) {
      const i = r * WEEKS_PER_YEAR + c;
      const state = i < lived ? 'l' : i === lived ? 'n' : 'f';
      let cls = `life-c ${state}`;
      if (milestones.has(i)) cls += ' m';
      if (dec) cls += ' dec';
      if (i === selected) cls += ' sel';
      items.push(<span key={i} className={cls} data-i={i} />);
    }
  }
  return <>{items}</>;
});

export function LifeView({ birth, name, milestones, t }: LifeViewProps) {
  const lived = Math.max(0, Math.min(weekIndex(birth, todayUTC()), TOTAL_WEEKS));
  const [selected, setSelected] = useState(lived);

  // Casillas de tamaño entero en píxeles: con anchos fraccionarios el navegador redondea
  // distinto cada columna y la grilla se ve como rayas irregulares.
  const gridRef = useRef<HTMLDivElement>(null);
  const [cell, setCell] = useState<{ size: number; gap: number } | null>(null);
  useLayoutEffect(() => {
    const el = gridRef.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const cs = getComputedStyle(el);
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const fit = (gap: number) => Math.floor((w - LABEL_W - gap * WEEKS_PER_YEAR) / WEEKS_PER_YEAR);
      const gap = fit(2) >= 8 ? 2 : 1;
      setCell({ size: Math.max(2, Math.min(12, fit(gap))), gap });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const nf = new Intl.NumberFormat(t.locale);
  const pf = new Intl.NumberFormat(t.locale, { maximumFractionDigits: 1 });

  const milestoneMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of milestones) {
      const i = weekIndex(birth, m.ms);
      if (i >= 0 && i < TOTAL_WEEKS) map.set(i, m.label);
    }
    return map;
  }, [birth, milestones]);

  const visible = milestones.filter((m) => m.ms >= birth && m.label.trim());
  const pct = (lived / TOTAL_WEEKS) * 100;
  const selMilestone = milestoneMap.get(selected);

  const pick = (e: React.SyntheticEvent) => {
    const raw = (e.target as HTMLElement).dataset.i;
    if (raw !== undefined) setSelected(Number(raw));
  };

  return (
    <article className="life">
      {name.trim() && <p className="life-name">{name.trim()}</p>}

      <div className="life-stats">
        <div className="stat">
          <span className="stat-num">{nf.format(lived)}</span>
          <span className="stat-label">{t.livedLabel}</span>
        </div>
        <div className="stat">
          <span className="stat-num">{nf.format(TOTAL_WEEKS - lived)}</span>
          <span className="stat-label">{t.leftLabel}</span>
        </div>
      </div>

      <div className="life-progress">
        <div
          className="bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          aria-label={t.pctLabel(pf.format(pct))}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
        <p>{t.pctLabel(pf.format(pct))}</p>
      </div>

      <div className="life-info" aria-live="polite">
        <strong>{selected === lived ? t.current : t.week(selected + 1)}</strong>
        <span>
          {formatDate(weekStart(birth, selected), t.locale)} · {t.ageLabel(Math.floor(selected / WEEKS_PER_YEAR))}
        </span>
        {/* Siempre presente (vacía si no hay hito) para que la franja no cambie de alto y la grilla no salte. */}
        {milestoneMap.size > 0 && <em>{selMilestone ?? ' '}</em>}
      </div>

      <div
        ref={gridRef}
        className="life-grid"
        style={
          cell
            ? {
                gridTemplateColumns: `${LABEL_W}px repeat(${WEEKS_PER_YEAR}, ${cell.size}px)`,
                gap: cell.gap,
                '--cell': `${cell.size}px`,
                '--gap': `${cell.gap}px`,
              } as React.CSSProperties
            : undefined
        }
        role="img"
        aria-label={t.gridLabel(nf.format(lived), nf.format(TOTAL_WEEKS - lived))}
        onClick={pick}
        onMouseOver={pick}
      >
        <LifeCells lived={lived} milestones={milestoneMap} selected={selected} />
      </div>
      <p className="hint">{t.tapHint}</p>

      {visible.length > 0 && (
        <ul className="life-milestones">
          {visible.map((m) => (
            <li key={`${m.ms}-${m.label}`}>
              <button type="button" onClick={() => setSelected(weekIndex(birth, m.ms))}>
                <span className="mark" aria-hidden="true" />
                <span className="year">{new Date(m.ms).getUTCFullYear()}</span>
                {m.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="life-motto">{t.motto}</p>
    </article>
  );
}
