import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../lib/api';

const RECENT_KEY = 'propszy.recentSearches';
const readRecent = () => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
};
const pushRecent = (term) => {
  try {
    const next = [term, ...readRecent().filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
};

const ICONS = {
  shortcut: 'M20 12l-8 8-8-8 8-8 8 8zM12 8v8M8 12h8',
  city: 'M12 21s-7-6.3-7-11a7 7 0 1 1 14 0c0 4.7-7 11-7 11zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  project: 'M3 21h18M6 21V7l6-4 6 4v14M10 12h4M10 16h4',
  property: 'M3 12l9-8 9 8M5 10v10h14V10',
  builder: 'M4 21h16M6 21V9l6-3 6 3v12M9 13h1m4 0h1M9 17h1m4 0h1',
  amenity: 'M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 21l-4.9-2.6.9-5.5-4-3.9L9.5 8z',
  article: 'M8 4h9a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2z',
  recent: 'M12 8v4l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
};
const GIcon = ({ type, className = 'h-4 w-4 text-slate-400' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={ICONS[type] || ICONS.search} />
  </svg>
);

export default function SearchAutocomplete({
  placeholder = 'Search by city, project, builder…',
  className = '',
  inputClassName = '',
  autoFocus = false,
  onNavigate,
  basePath = '/projects',
  extraParams = {},
  hideButton = false,
  bare = false,
}) {
  const extraKey = JSON.stringify(extraParams);
  const buildAllUrl = (term) => {
    const sp = new URLSearchParams();
    Object.entries(extraParams).forEach(([k, v]) => { if (v) sp.set(k, v); });
    if (term) sp.set('q', term);
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const navigate = useNavigate();
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const [recent, setRecent] = useState(readRecent);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 220);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isFetching } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => unwrap(api.get('/search', { params: { q: debounced } })),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
    keepPreviousData: true,
  });

  const groups = data?.groups || [];

  // flatten items for keyboard navigation; first row = "search all"
  const flat = useMemo(() => {
    const rows = [];
    rows.push({ kind: 'all', title: q.trim() ? `Search for “${q.trim()}”` : 'Search all listings', to: buildAllUrl(q.trim()) });
    if (debounced.length < 2 && recent.length) {
      recent.forEach((r) => rows.push({ kind: 'recent', title: r, to: buildAllUrl(r) }));
    }
    groups.forEach((g) => g.items.forEach((it) => rows.push({ ...it, kind: g.type })));
    return rows;
  }, [groups, q, debounced, recent, extraKey, basePath]);

  useEffect(() => { setCursor(-1); }, [flat.length]);

  // close on outside click
  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const go = (row) => {
    if (!row) return;
    const term = q.trim();
    if (term) { pushRecent(term); setRecent(readRecent()); }
    setOpen(false);
    setQ('');
    onNavigate?.();
    navigate(row.to);
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      go(cursor >= 0 ? flat[cursor] : flat[0]);
    } else if (e.key === 'Escape') setOpen(false);
  };

  const showPanel = open;
  let runningIndex = 1; // index 0 is always the "search all" row
  if (debounced.length < 2 && recent.length) runningIndex += recent.length;

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <div className={bare ? 'flex items-center gap-2' : 'flex gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm'}>
        <div className="pointer-events-none grid place-items-center pl-1.5 text-slate-400">
          <GIcon type="search" className="h-4 w-4" />
        </div>
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          className={`flex-1 bg-transparent text-sm text-slate-800 focus:outline-none ${inputClassName}`}
          placeholder={placeholder}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {!hideButton && (
          <button type="button" onClick={() => go(flat[cursor >= 0 ? cursor : 0])} className="btn-primary shrink-0">Search</button>
        )}
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 text-left shadow-xl">
          {/* search-all row (always) */}
          <button
            onMouseEnter={() => setCursor(0)}
            onClick={() => go(flat[0])}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${cursor === 0 ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
          >
            <GIcon type="search" />
            <span className="font-medium text-slate-700">{flat[0]?.title}</span>
          </button>

          {/* recent (only when not actively searching) */}
          {debounced.length < 2 && recent.length > 0 && (
            <div className="mt-1">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Recent</p>
              {recent.map((r, i) => {
                const idx = 1 + i;
                return (
                  <button key={r} onMouseEnter={() => setCursor(idx)} onClick={() => go({ to: buildAllUrl(r) })}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm ${cursor === idx ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                    <GIcon type="recent" />
                    <span className="text-slate-600">{r}</span>
                  </button>
                );
              })}
            </div>
          )}

          {isFetching && debounced.length >= 2 && groups.length === 0 && (
            <p className="px-3 py-4 text-sm text-slate-400">Searching…</p>
          )}
          {!isFetching && debounced.length >= 2 && groups.length === 0 && (
            <p className="px-3 py-4 text-sm text-slate-400">No matches — press Enter to search all listings.</p>
          )}

          {groups.map((g) => {
            const start = runningIndex;
            runningIndex += g.items.length;
            return (
              <div key={g.type} className="mt-1">
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g.label}</p>
                {g.items.map((it, i) => {
                  const idx = start + i;
                  return (
                    <button key={it.id + it.to} onMouseEnter={() => setCursor(idx)} onClick={() => go({ ...it, kind: g.type })}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${cursor === idx ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
                      {it.image
                        ? <img src={it.image} alt="" className="h-9 w-11 shrink-0 rounded-md object-cover" />
                        : <span className="grid h-9 w-11 shrink-0 place-items-center rounded-md bg-slate-100"><GIcon type={g.type} /></span>}
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-800">{it.title}</span>
                        {it.subtitle && <span className="block truncate text-xs text-slate-400">{it.subtitle}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
