import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api, apiError } from '../../lib/api';
import { inr } from '../../lib/format';

export const DEFAULT_SCHEME = {
  enabled: true,
  poolType: 'PERCENT',
  poolValue: 10,
  levels: [
    { level: 1, percent: 40 },
    { level: 2, percent: 10 },
    { level: 3, percent: 5 },
    { level: 4, percent: 3 },
    { level: 5, percent: 2 },
  ],
};

export function schemePreview(scheme, sample) {
  const pool = scheme.poolType === 'FLAT'
    ? Number(scheme.poolValue || 0)
    : (Number(sample) * Number(scheme.poolValue || 0)) / 100;
  const rows = (scheme.levels || []).map((l, i) => ({
    level: i + 1,
    percent: Number(l.percent || 0),
    amount: (pool * Number(l.percent || 0)) / 100,
  }));
  const totalPct = rows.reduce((a, r) => a + r.percent, 0);
  const distributed = rows.reduce((a, r) => a + r.amount, 0);
  return { pool, rows, totalPct, distributed, remainder: pool - distributed };
}

/* Controlled scheme editor — no save button, parent owns state. */
export function CommissionFields({ scheme, onChange, sample, onSample }) {
  const preview = useMemo(() => schemePreview(scheme, sample), [scheme, sample]);

  const patch = (p) => onChange({ ...scheme, ...p });
  const setLevel = (i, percent) => patch({ levels: scheme.levels.map((l, idx) => (idx === i ? { ...l, percent } : l)) });
  const addLevel = () => patch({ levels: [...scheme.levels, { level: scheme.levels.length + 1, percent: 0 }] });
  const removeLevel = (i) => patch({ levels: scheme.levels.filter((_, idx) => idx !== i).map((l, idx) => ({ ...l, level: idx + 1 })) });

  return (
    <div className="space-y-4 text-sm">
      <label className="flex items-center gap-2 font-medium">
        <input
          type="checkbox"
          checked={!!scheme.enabled}
          onChange={(e) => onChange(e.target.checked ? { ...(scheme.levels?.length ? scheme : DEFAULT_SCHEME), enabled: true } : { ...scheme, enabled: false })}
        />
        Custom commission for this unit
      </label>

      {!scheme.enabled ? (
        <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          Uses the <b>project commission</b> + the global MLM level rates.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label">Commission pool</label>
              <div className="flex gap-2">
                <select className="input h-9 py-1.5" value={scheme.poolType} onChange={(e) => patch({ poolType: e.target.value })}>
                  <option value="PERCENT">% of sale price</option>
                  <option value="FLAT">Flat ₹</option>
                </select>
                <input className="input h-9 w-28 py-1.5" type="number" min={0} value={scheme.poolValue}
                  onChange={(e) => patch({ poolValue: e.target.value })} />
              </div>
            </div>
            {onSample && (
              <div>
                <label className="label">Preview on a sale of</label>
                <input className="input h-9 w-40 py-1.5" type="number" value={sample} onChange={(e) => onSample(Number(e.target.value) || 0)} />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200">
            <table className="w-full">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr><th className="p-2">Level</th><th className="p-2">% of pool</th><th className="p-2">Amount</th><th /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scheme.levels.map((l, i) => (
                  <tr key={i}>
                    <td className="p-2 font-medium">L{i + 1}{i === 0 ? ' (sourcing agent)' : ` (upline ${i})`}</td>
                    <td className="p-2">
                      <input className="input h-8 w-20 py-1" type="number" min={0} max={100} value={l.percent}
                        onChange={(e) => setLevel(i, e.target.value)} /> %
                    </td>
                    <td className="p-2 text-slate-600">{inr(preview.rows[i]?.amount || 0)}</td>
                    <td className="p-2 text-right">
                      <button type="button" onClick={() => removeLevel(i)} className="text-xs text-rose-600 hover:underline">Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-100 p-2">
              <button type="button" onClick={addLevel} className="text-xs font-medium text-brand-700 hover:underline">+ Add level</button>
            </div>
          </div>

          <div className={`rounded-lg p-3 text-xs ${preview.totalPct > 100 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>
            Pool <b>{inr(preview.pool)}</b> · distributed <b>{inr(preview.distributed)}</b> ({preview.totalPct}% of pool)
            {preview.totalPct > 100
              ? ' — over 100%, reduce the level percentages'
              : preview.remainder > 0.5
              ? ` · ${inr(preview.remainder)} kept by the company`
              : ''}
          </div>
        </>
      )}
    </div>
  );
}

/* Standalone editor with its own state + save (used on existing units). */
export default function CommissionEditor({ property, onSaved }) {
  const [scheme, setScheme] = useState(() => property.commissionScheme || { ...DEFAULT_SCHEME, enabled: false });
  const [sample, setSample] = useState(Number(property.price) || 10000000);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        enabled: !!scheme.enabled,
        poolType: scheme.poolType || 'PERCENT',
        poolValue: Number(scheme.poolValue) || 0,
        levels: (scheme.levels || []).map((l, idx) => ({ level: idx + 1, percent: Number(l.percent) || 0 })),
      };
      await api.patch(`/properties/${property.id}`, { commissionScheme: payload });
      toast.success('Commission scheme saved');
      onSaved?.(payload);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <CommissionFields scheme={scheme} onChange={setScheme} sample={sample} onSample={setSample} />
      <button className="btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save commission scheme'}</button>
    </div>
  );
}
