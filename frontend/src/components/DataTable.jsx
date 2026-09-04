import { PageLoader, EmptyState } from './ui';

// Minimal, dependency-free table with optional pagination.
export default function DataTable({ columns, rows, loading, empty, meta, onPage }) {
  if (loading) return <PageLoader />;
  if (!rows?.length) return <EmptyState title={empty || 'Nothing here yet'} />;

  return (
    <div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              {columns.map((c) => <th key={c.key} className="px-4 py-3 font-medium">{c.header}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3 align-middle">
                    {c.render ? c.render(row) : row[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && meta.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>Page {meta.page} of {meta.pages} · {meta.total} total</span>
          <div className="flex gap-1">
            <button className="btn-outline" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Prev</button>
            <button className="btn-outline" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
