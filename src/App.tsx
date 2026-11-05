import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { strings, type Lang } from './i18n';
import { Controls, type Paper } from './components/Controls';
import { Poster, type Milestone, type Tone } from './components/Poster';
import { LifeView } from './components/LifeView';
import { Intro } from './components/Intro';
import { DEFAULT_YEARS, MAX_YEARS, clampYears, parseISODate, todayUTC } from './lib/weeks';

const POSTER_W = 840;
const MM_TO_PX = 96 / 25.4;
const PAPER_MM: Record<Paper, number> = { A4: 210, A3: 297 };
const PNG_WIDTH: Record<Paper, number> = { A4: 2480, A3: 3508 }; // 300 dpi
const STORAGE_KEY = 'memento-mori:v1';
const SITE_URL = 'https://mementomori-calendar.vercel.app/';
// Link de contacto del pie ("¿Sugerencias? Contactame"). Si queda vacío, el pie no se muestra.
const CONTACT_URL = 'https://www.linkedin.com/in/lucia-miloro/';

interface Saved {
  birth: string;
  name: string;
  milestones: Milestone[];
  tone: Tone;
  paper: Paper;
  lang: Lang;
  theme: 'light' | 'dark';
  view: View;
  introSeen: boolean;
  lifespan: number;
}

type View = 'web' | 'poster';

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
  // Se guarda como texto para poder tipear libremente; la grilla usa el valor acotado.
  const [lifespan, setLifespan] = useState(String(saved.lifespan ?? DEFAULT_YEARS));
  const years = lifespan.trim() === '' ? DEFAULT_YEARS : clampYears(Number(lifespan));
  const [view, setView] = useState<View>(
    saved.view ?? (typeof matchMedia !== 'undefined' && matchMedia('(max-width: 820px)').matches ? 'web' : 'poster'),
  );
  const [exporting, setExporting] = useState(false);
  // La bienvenida aparece sólo la primera vez (o si se abre con el botón "?").
  const [introOpen, setIntroOpen] = useState(!saved.introSeen);
  const [introSeen, setIntroSeen] = useState(saved.introSeen ?? false);
  const closeIntro = () => {
    setIntroOpen(false);
    setIntroSeen(true);
    // Si todavía no cargó la fecha, la primera acción es esa.
    if (!birth) requestAnimationFrame(() => document.getElementById('birth')?.focus());
  };
  const t = strings[lang];

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ birth, name, milestones, tone, paper, lang, theme, view, introSeen, lifespan: years }),
      );
    } catch {
      /* modo privado: no pasa nada */
    }
  }, [birth, name, milestones, tone, paper, lang, theme, view, introSeen, years]);

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
  const yearsAgo = (n: number) => Date.UTC(new Date().getFullYear() - n, new Date().getMonth(), new Date().getDate());
  // La fecha en sí es válida si cae dentro de la edad final más alta posible…
  const birthInRange = birthMs !== null && birthMs <= today && birthMs > yearsAgo(MAX_YEARS);
  // …y además tiene que ser menor que la edad final elegida.
  const lifespanTooLow = birthInRange && birthMs <= yearsAgo(years);
  const birthValid = birthInRange && !lifespanTooLow;

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

  const renderPng = (pixelRatio: number) =>
    toPng(posterRef.current!, {
      pixelRatio,
      width: POSTER_W,
      height: 1188,
      style: { zoom: '1' },
      filter: (node) => !(node instanceof HTMLElement && node.classList.contains('tooltip')),
    });

  // Compartir: abre el menú del sistema con la imagen del póster y el usuario elige la app y el contacto.
  // Sin ese menú (p. ej. Firefox de escritorio): comparte sólo el texto con link o, si tampoco se puede, lo copia.
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareFile, setShareFile] = useState<File | null>(null);
  useEffect(() => setShareFile(null), [birth, name, milestones, tone, years, lang]);

  const share = async () => {
    const text = t.shareText(SITE_URL);
    const fallback = async () => {
      try {
        if (typeof navigator.share === 'function') return await navigator.share({ text });
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        /* el usuario canceló */
      }
    };
    if (!posterRef.current || typeof navigator.canShare !== 'function') return fallback();
    setSharing(true);
    try {
      let file = shareFile;
      if (!file) {
        const blob = await (await fetch(await renderPng(1.5))).blob();
        file = new File([blob], 'memento-mori.png', { type: 'image/png' });
      }
      if (!navigator.canShare({ files: [file] })) return await fallback();
      try {
        await navigator.share({ files: [file], text });
        setShareFile(null);
      } catch (err) {
        // Generar la imagen tarda: algunos navegadores (Safari) ya no consideran que hubo un toque.
        // Se guarda la imagen y el segundo toque comparte al instante.
        if (err instanceof DOMException && err.name === 'NotAllowedError') setShareFile(file);
      }
    } finally {
      setSharing(false);
    }
  };

  const downloadPng = async () => {
    if (!posterRef.current) return;
    setExporting(true);
    try {
      const url = await renderPng(PNG_WIDTH[paper] / POSTER_W);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memento-mori-${paper}-${tone}.png`;
      a.click();
    } finally {
      setExporting(false);
    }
  };

  const shareButton = (
    <button type="button" className="ghost-btn share-btn" disabled={sharing} onClick={share}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 15V3M7.5 7.5 12 3l4.5 4.5" />
        <path d="M8 11H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-2" />
      </svg>
      <span aria-live="polite">{sharing ? t.exporting : copied ? t.linkCopied : shareFile ? t.shareReady : t.share}</span>
    </button>
  );

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1 className="app-title">Memento mori</h1>
          <p className="app-subtitle">{t.appSubtitle}</p>
        </div>
        <div className="header-actions">
          <button type="button" className="icon-btn" aria-label={t.about} title={t.about} onClick={() => setIntroOpen(true)}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6" />
              <circle cx="12" cy="17" r=".6" fill="currentColor" />
            </svg>
          </button>
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

      <main className={birthValid ? 'layout has-result' : 'layout'}>
        <Controls
          t={t}
          birth={birth}
          birthError={birth !== '' && !birthInRange}
          lifespan={lifespan}
          lifespanError={lifespanTooLow}
          name={name}
          milestones={milestones}
          onBirth={setBirth}
          onLifespan={setLifespan}
          onLifespanBlur={() => setLifespan(String(years))}
          onName={setName}
          onMilestones={setMilestones}
        />

        <section className="stage" ref={stageRef}>
          {birthValid && birthMs !== null && (
            <div className="field view-switch">
              <div className="segmented" role="radiogroup" aria-label={t.view}>
                {(['web', 'poster'] as View[]).map((v) => (
                  <label key={v} className={view === v ? 'seg active' : 'seg'}>
                    <input type="radio" name="view" value={v} checked={view === v} onChange={() => setView(v)} />
                    {v === 'web' ? t.viewWeb : t.viewPoster}
                  </label>
                ))}
              </div>
            </div>
          )}
          {birthValid && birthMs !== null && view === 'web' && (
            <LifeView birth={birthMs} years={years} name={name} milestones={parsedMilestones} t={t} />
          )}
          {birthValid && birthMs !== null ? (
            // En la vista web el póster sigue montado fuera de pantalla para poder imprimirlo o exportarlo.
            <div
              className={view === 'web' ? 'poster-frame offscreen' : 'poster-frame'}
              aria-hidden={view === 'web' || undefined}
              style={{ '--s': view === 'web' ? 1 : previewScale, '--print-s': printScale } as React.CSSProperties}
            >
              <Poster
                ref={posterRef}
                birth={birthMs}
                years={years}
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
          {birthValid && view === 'web' && (
            // En la vista Pantalla, las opciones del póster no tendrían efecto visible: se ofrece pasar a esa vista.
            <div className="export-bar">
              <button
                type="button"
                className="primary-btn to-poster"
                onClick={() => {
                  setView('poster');
                  requestAnimationFrame(() => stageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
                }}
              >
                {t.toPoster}
              </button>
              <p className="hint">{t.toPosterHint}</p>
              {shareButton}
            </div>
          )}
          {birthValid && view === 'poster' && (
            <div className="export-bar">
              <div className="field export-options">
                <div className="segmented" role="radiogroup" aria-label={t.tone}>
                  <span className="seg-title">{t.tone}</span>
                  {(['dark', 'light'] as Tone[]).map((v) => (
                    <label key={v} className={tone === v ? 'seg active' : 'seg'}>
                      <input type="radio" name="tone" value={v} checked={tone === v} onChange={() => setTone(v)} />
                      {v === 'dark' ? t.toneDark : t.toneLight}
                    </label>
                  ))}
                </div>
                <div className="segmented" role="radiogroup" aria-label={t.size}>
                  <span className="seg-title">{t.size}</span>
                  {(['A4', 'A3'] as Paper[]).map((v) => (
                    <label key={v} className={paper === v ? 'seg active' : 'seg'}>
                      <input type="radio" name="paper" value={v} checked={paper === v} onChange={() => setPaper(v)} />
                      {v}
                    </label>
                  ))}
                </div>
              </div>
              <div className="export-buttons">
                <button type="button" className="primary-btn" onClick={() => window.print()}>
                  {t.print}
                </button>
                <button type="button" className="ghost-btn" disabled={exporting} onClick={downloadPng}>
                  {exporting ? t.exporting : t.png}
                </button>
              </div>
              <p className="hint">{t.printHint}</p>
              {shareButton}
            </div>
          )}
        </section>
      </main>

      {CONTACT_URL && (
        <footer className="app-footer">
          <p>
            {t.suggestions}{' '}
            <a href={CONTACT_URL} target="_blank" rel="noopener">
              {t.contactMe}
            </a>
          </p>
        </footer>
      )}

      <Intro
        open={introOpen}
        t={t}
        years={years}
        onClose={closeIntro}
      />
    </div>
  );
}
