import { forwardRef, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { formatDate, todayUTC, totalWeeks, weekIndex } from '../lib/weeks';
import type { Strings } from '../i18n';
import { WeekGrid } from './WeekGrid';

export type Tone = 'dark' | 'light';

export interface Milestone {
  id: string;
  date: string;
  label: string;
}

interface PosterProps {
  birth: number;
  years: number;
  name: string;
  milestones: { ms: number; label: string }[];
  tone: Tone;
  t: Strings;
}

/** El póster se diseña a 840 × 1188 px (proporción ISO A) y se escala para pantalla, impresión y PNG. */
export const Poster = forwardRef<HTMLDivElement, PosterProps>(function Poster(
  { birth, years, name, milestones, tone, t },
  ref,
) {
  const total = totalWeeks(years);
  const lived = Math.max(0, weekIndex(birth, todayUTC()));
  const nf = new Intl.NumberFormat(t.locale);
  const livedTxt = nf.format(Math.min(lived, total));
  const leftTxt = nf.format(Math.max(total - lived, 0));

  const milestoneMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of milestones) {
      const i = weekIndex(birth, m.ms);
      if (i >= 0 && i < total) map.set(i, m.label);
    }
    return map;
  }, [birth, milestones, total]);

  const visibleMilestones = milestones.filter((m) => m.ms >= birth && m.label.trim());

  // El título ocupa exactamente el ancho de las casillas de la grilla (sin las etiquetas de década).
  const posterRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [fit, setFit] = useState<{ left: number; width: number; fontSize: number } | null>(null);

  const setRefs = useCallback(
    (el: HTMLDivElement | null) => {
      posterRef.current = el;
      if (typeof ref === 'function') ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      const poster = posterRef.current;
      const title = titleRef.current;
      const row = poster?.querySelector<HTMLElement>('.cells .row');
      const text = title?.firstElementChild as HTMLElement | null;
      if (!poster || !title || !row || !text || cancelled) return;
      const cells = row.querySelectorAll<HTMLElement>('.c');
      const first = cells[0];
      const last = cells[cells.length - 1];
      // offsetLeft acumulado hasta el póster: en unidades del póster, sin zoom ni transforms.
      const leftOf = (el: HTMLElement) => {
        let x = 0;
        for (let n: HTMLElement | null = el; n && n !== poster; n = n.offsetParent as HTMLElement | null) {
          x += n.offsetLeft;
        }
        return x;
      };
      const left = leftOf(first);
      const width = leftOf(last) + last.offsetWidth - left;
      const padLeft = parseFloat(getComputedStyle(poster).paddingLeft) || 0;
      const base = parseFloat(getComputedStyle(title).fontSize) || 100;
      const fontSize = (base * width) / text.offsetWidth;
      setFit({ left: left - padLeft, width, fontSize });
    };
    // Medir con la tipografía real, no con la de respaldo.
    document.fonts.ready.then(() => requestAnimationFrame(measure));
    return () => {
      cancelled = true;
    };
  }, [livedTxt, leftTxt, years]);

  return (
    <div ref={setRefs} className={`poster tone-${tone}`}>
      <svg className="grain" aria-hidden="true" width="840" height="1188">
        <filter id={`grain-${tone}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="840" height="1188" filter={`url(#grain-${tone})`} />
      </svg>

      <header className="poster-top">
        <span>{t.tagline}</span>
        {name.trim() && <span>{name.trim()}</span>}
      </header>

      <h1
        ref={titleRef}
        className="poster-title"
        style={fit ? { marginLeft: fit.left, width: fit.width, fontSize: fit.fontSize } : undefined}
      >
        <span>Memento Mori</span>
      </h1>

      <div className="poster-body">
        <WeekGrid
          years={years}
          birth={birth}
          lived={lived}
          milestones={milestoneMap}
          animKey={String(birth)}
          t={t}
          label={t.gridLabel(years, livedTxt, leftTxt)}
        />
        <p className="poster-counter">{t.counter(livedTxt, leftTxt)}</p>
      </div>

      {visibleMilestones.length > 0 && (
        <ul className="poster-milestones">
          {visibleMilestones.map((m) => (
            <li key={`${m.ms}-${m.label}`}>
              <span className="mark" aria-hidden="true" />
              {new Date(m.ms).getUTCFullYear()} · {m.label}
            </li>
          ))}
        </ul>
      )}

      <footer className="poster-bottom">
        <span className="motto">{t.motto}</span>
        <span>{t.since(formatDate(birth, t.locale))}</span>
      </footer>
    </div>
  );
});
