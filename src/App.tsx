import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { strings, type Lang } from './i18n';
import { Controls, type Paper } from './components/Controls';
import { Poster, type Milestone, type Tone } from './components/Poster';
import { parseISODate, todayUTC } from './lib/weeks';

const POSTER_W = 840;
const MM_TO_PX = 96 / 25.4;
const PAPER_MM: Record<Paper, number> = { A4: 210, A3: 297 };
const PNG_WIDTH: Record<Paper, number> = { A4: 2480, A3: 3508 }; // 300 dpi
const STORAGE_KEY = 'memento-mori:v1';

interface Saved {
  birth: string;
  name: string;
  milestones: Milestone[];
  tone: Tone;
  paper: Paper;
  lang: Lang;
  theme: 'light' | 'dark';
}

function load(): Partial<Saved> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export default function App() {
  const saved = useMemo(load, []);
  const prefersDark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;

  const [lang, setLang] = useState<Lang>(saved.lang ?? (navigator.language.startsWith('es') ? 'es' : 'en'));
  const [theme, setTheme] = useState<'light' | 'dark'>(saved.theme ?? (prefersDark ? 'dark' : 'light'));
  const [birth, setBirth] = useState(saved.birth ?? '');
  const [name, setName] = useState(saved.name ?? '');
  const [milestones, setMilestones] = useState<Milestone[]>(saved.milestones ?? []);
  const [tone, setTone] = useState<Tone>(saved.tone ?? 'dark');
  const [paper, setPaper] = useState<Paper>(saved.paper ?? 'A4');
  const [exporting, setExporting] = useState(false);
  const t = strings[lang];

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ birth, name, milestones, tone, paper, lang, theme }));
    } catch {
      /* modo privado: no pasa nada */
    }
  }, [birth, name, milestones, tone, paper, lang, theme]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = lang;
  }, [theme, lang]);

  // Tamaño de hoja para el diálogo de impresión.
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `@page { size: ${paper} portrait; margin: 0; }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, [paper]);

  const birthMs = parseISODate(birth);
  const today = todayUTC();
  const ninetyYearsAgo = Date.UTC(new Date().getFullYear() - 90, new Date().getMonth(), new Date().getDate());
  const birthValid = birthMs !== null && birthMs <= today && birthMs > ninetyYearsAgo;

  const parsedMilestones = useMemo(
    () =>
      milestones
        .map((m) => ({ ms: parseISODate(m.date), label: m.label }))
        .filter((m): m is { ms: number; label: string } => m.ms !== null),
    [milestones],
  );

  // Escala de la vista previa según el ancho disponible.
  const stageRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.6);
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setPreviewScale(Math.min(1, entry.contentRect.width / POSTER_W));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const printScale = (PAPER_MM[paper] * MM_TO_PX) / POSTER_W;
  const posterRef = useRef<HTMLDivElement>(null);

  const downloadPng = async () => {
    if (!posterRef.current) return;
    setExporting(true);
    try {
      const url = await toPng(posterRef.current, {
        pixelRatio: PNG_WIDTH[paper] / POSTER_W,
        width: POSTER_W,
        height: 1188,
        style: { zoom: '1' },
        filter: (node) => !(node instanceof HTMLElement && node.classList.contains('tooltip')),
      });
      const a = document.createElement('a');
      a.href = url;
      a.download = `memento-mori-${paper}-${tone}.png`;
      a.click();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1 className="app-title">Memento mori</h1>
          <p className="app-subtitle">{t.appSubtitle}</p>
        </div>
        <div className="header-actions">
          <button type="button" className="ghost-btn" onClick={() => setLang(lang === 'es' ? 'en' : 'es')} lang={lang === 'es' ? 'en' : 'es'}>
            {t.toggleLang}
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label={theme === 'dark' ? t.themeLight : t.themeDark}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <main className="layout">
        <Controls
          t={t}
          birth={birth}
          birthError={birth !== '' && !birthValid}
          name={name}
          milestones={milestones}
          tone={tone}
          paper={paper}
          exporting={exporting}
          canExport={birthValid}
          onBirth={setBirth}
          onName={setName}
          onMilestones={setMilestones}
          onTone={setTone}
          onPaper={setPaper}
          onPrint={() => window.print()}
          onPng={downloadPng}
        />

        <section className="stage" ref={stageRef} aria-live="polite">
          {birthValid && birthMs !== null ? (
            <div
              className="poster-frame"
              style={{ '--s': previewScale, '--print-s': printScale } as React.CSSProperties}
            >
              <Poster
                ref={posterRef}
                birth={birthMs}
                name={name}
                milestones={parsedMilestones}
                tone={tone}
                t={t}
              />
            </div>
          ) : (
            <div className="empty">
              <p>{t.emptyState}</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
