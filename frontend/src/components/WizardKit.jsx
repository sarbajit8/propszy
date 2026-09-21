import { useState } from 'react';

// Shared building blocks for the admin "advance wizard" forms (property + project) —
// left numbered-circle stepper w/ per-step summaries, a Property/Project Score ring,
// and the Pills/Chips selectors used throughout both.

// Calls fn(o) but never lets a malformed option crash the whole page —
// falls back to a best-effort string and logs the bad input for diagnosis.
function safeFormat(fn, o, fallback) {
  try {
    const r = fn(o);
    return r == null ? fallback : r;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Pills: option formatter threw for option:', o, err);
    return fallback;
  }
}

export function Pills({ options = [], value, onChange, labelOf = (v) => v, valueOf = (v) => v }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.filter((o) => o != null).map((o, i) => {
        const v = safeFormat(valueOf, o, String(o));
        const label = safeFormat(labelOf, o, String(o));
        const active = value === v;
        return (
          <button key={`${v}-${i}`} type="button" onClick={() => onChange(active ? '' : v)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              active ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-500' : 'border-slate-200 text-slate-600 hover:border-slate-300'
            }`}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function Chips({ options, value = [], onChange, limit = 6 }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? options : options.slice(0, limit);
  const toggle = (o) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {shown.map((o) => {
        const active = value.includes(o);
        return (
          <button key={o} type="button" onClick={() => toggle(o)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'
            }`}>
            {active ? '✓ ' : '+ '}{o}
          </button>
        );
      })}
      {options.length > limit && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="text-sm font-semibold text-brand-700 hover:underline">
          {expanded ? 'Show less' : `${options.length - limit} more ⌄`}
        </button>
      )}
    </div>
  );
}

export function ScoreRing({ score }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const color = score >= 70 ? '#10b981' : score >= 35 ? '#7c3aed' : '#cbd5e1';
  return (
    <div className="relative grid h-14 w-14 shrink-0 place-items-center">
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} style={{ transition: 'stroke-dashoffset .4s' }} />
      </svg>
      <span className="absolute text-xs font-bold text-slate-700">{score}%</span>
    </div>
  );
}

export function SaveFirst({ onSave, label }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
      <p className="text-sm text-slate-500">Save the first steps to start adding {label}.</p>
      <button type="button" className="btn-primary mt-3" onClick={onSave}>Create now</button>
    </div>
  );
}

// Left sidebar: numbered-circle stepper (with connecting line + per-step summary)
// above a Score ring card. `steps` = [{key,label}]; `summaryFor(i)` returns a short
// preview string; `canGo(i)` gates whether a step is clickable yet.
export function WizardSidebar({ steps, step, onGo, summaryFor, canGo, score, scoreLabel = 'Score', scoreHint }) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
      <div className="card p-4">
        {steps.map((s, i) => (
          <div key={s.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <button type="button" onClick={() => (canGo ? canGo(i) : true) && onGo(i)}
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                  i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-brand-600 text-white ring-4 ring-brand-100' : 'bg-slate-200 text-slate-500'
                }`}>
                {i < step ? '✓' : i + 1}
              </button>
              {i < steps.length - 1 && <span className={`w-0.5 flex-1 ${i < step ? 'bg-emerald-400' : 'bg-slate-200'}`} style={{ minHeight: 28 }} />}
            </div>
            <div className="pb-6">
              <button type="button" onClick={() => (canGo ? canGo(i) : true) && onGo(i)}
                className={`text-sm font-semibold ${i === step ? 'text-slate-900' : 'text-slate-600'}`}>
                {s.label}
              </button>
              <p className="text-xs text-slate-400">{summaryFor(i) || `Step ${i + 1}`}</p>
            </div>
          </div>
        ))}
      </div>
      {score != null && (
        <div className="card flex items-center gap-3 p-4">
          <ScoreRing score={score} />
          <div>
            <p className="text-sm font-semibold text-slate-900">{scoreLabel}</p>
            <p className="text-xs text-slate-400">{scoreHint || 'Better your score, greater its visibility'}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
