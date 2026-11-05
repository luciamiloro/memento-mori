import type { Strings } from '../i18n';
import type { Milestone } from './Poster';
import { MAX_YEARS, MIN_YEARS } from '../lib/weeks';

export type Paper = 'A4' | 'A3';

interface ControlsProps {
  t: Strings;
  birth: string;
  birthError: boolean;
  name: string;
  milestones: Milestone[];
  lifespan: string;
  lifespanError: boolean;
  onLifespan: (v: string) => void;
  onLifespanBlur: () => void;
  onBirth: (v: string) => void;
  onName: (v: string) => void;
  onMilestones: (v: Milestone[]) => void;
}

const MAX_MILESTONES = 6;

export function Controls(p: ControlsProps) {
  const { t } = p;

  const update = (id: string, patch: Partial<Milestone>) =>
    p.onMilestones(p.milestones.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  return (
    <form className="controls" onSubmit={(e) => e.preventDefault()}>
      <div className="field">
        <label htmlFor="birth">{t.birth}</label>
        <input
          id="birth"
          type="date"
          value={p.birth}
          max={new Date().toISOString().slice(0, 10)}
          aria-invalid={p.birthError}
          aria-describedby={p.birthError ? 'birth-error' : undefined}
          onChange={(e) => p.onBirth(e.target.value)}
          required
        />
        {p.birthError && (
          <p id="birth-error" className="error" role="alert">
            {t.invalidDate(MAX_YEARS)}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="lifespan">{t.lifespan}</label>
        <div className="with-unit">
          <input
            id="lifespan"
            type="number"
            inputMode="numeric"
            min={MIN_YEARS}
            max={MAX_YEARS}
            step={1}
            value={p.lifespan}
            aria-invalid={p.lifespanError}
            aria-describedby={p.lifespanError ? 'lifespan-hint lifespan-error' : 'lifespan-hint'}
            onChange={(e) => p.onLifespan(e.target.value)}
            onBlur={p.onLifespanBlur}
          />
          <span aria-hidden="true">{t.years}</span>
        </div>
        <p id="lifespan-hint" className="hint">
          {t.lifespanHint(MIN_YEARS, MAX_YEARS)}
        </p>
        {p.lifespanError && (
          <p id="lifespan-error" className="error" role="alert">
            {t.lifespanTooLow}
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="name">{t.name}</label>
        <input
          id="name"
          type="text"
          value={p.name}
          maxLength={40}
          placeholder={t.namePlaceholder}
          onChange={(e) => p.onName(e.target.value)}
        />
      </div>

      <fieldset className="field">
        <legend>{t.milestones}</legend>
        <p className="hint">{t.milestonesHint}</p>
        {p.milestones.map((m, idx) => (
          <div className="milestone" key={m.id}>
            <label className="sr-only" htmlFor={`ml-${m.id}`}>
              {t.milestoneLabel} {idx + 1}
            </label>
            <input
              id={`ml-${m.id}`}
              type="text"
              value={m.label}
              maxLength={36}
              placeholder={t.milestoneLabel}
              onChange={(e) => update(m.id, { label: e.target.value })}
            />
            <label className="sr-only" htmlFor={`md-${m.id}`}>
              {t.milestoneDate} {idx + 1}
            </label>
            <input
              id={`md-${m.id}`}
              type="date"
              value={m.date}
              onChange={(e) => update(m.id, { date: e.target.value })}
            />
            <button
              type="button"
              className="icon-btn"
              aria-label={`${t.remove}: ${m.label || idx + 1}`}
              onClick={() => p.onMilestones(p.milestones.filter((x) => x.id !== m.id))}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        ))}
        {p.milestones.length < MAX_MILESTONES && (
          <button
            type="button"
            className="ghost-btn"
            onClick={() =>
              p.onMilestones([...p.milestones, { id: crypto.randomUUID(), date: '', label: '' }])
            }
          >
            + {t.addMilestone}
          </button>
        )}
      </fieldset>

    </form>
  );
}
