import { useEffect, useRef } from 'react';
import type { Strings } from '../i18n';

interface IntroProps {
  open: boolean;
  t: Strings;
  years: number;
  onClose: () => void;
}

/** Ventana de bienvenida: explica la idea antes de empezar. Usa <dialog> nativo (foco, Esc y fondo inerte). */
export function Intro({ open, t, years, onClose }: IntroProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="intro"
      aria-labelledby="intro-title"
      onClose={onClose}
      onClick={(e) => {
        // Clic en el fondo oscuro (fuera de la caja) también cierra.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="intro-box">
        <button type="button" className="intro-x" aria-label={t.close} onClick={onClose}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <h2 id="intro-title">{t.introTitle}</h2>
        <p>
          {t.introP1} <mark className="intro-highlight">{t.introHighlight}</mark>
        </p>
        <p>{t.introP2(years)}</p>
        <h3>{t.howTitle}</h3>
        <ol>
          {t.howSteps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <button type="button" className="primary-btn intro-start" onClick={onClose} autoFocus>
          {t.start}
        </button>
      </div>
    </dialog>
  );
}
