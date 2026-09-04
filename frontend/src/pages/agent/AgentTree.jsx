import { useEffect, useMemo, useRef, useState } from 'react';
import Tree from 'react-d3-tree';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/api';
import { PageLoader, EmptyState, Drawer } from '../../components/ui';
import { inr, fromNow } from '../../lib/format';
import { avatarPlaceholder } from '../../lib/placeholder';

const KYC_DOT = {
  APPROVED: 'bg-emerald-500',
  PENDING: 'bg-amber-500',
  REJECTED: 'bg-rose-500',
  NOT_SUBMITTED: 'bg-slate-300',
};

function walk(node, fn) {
  fn(node);
  (node.children || []).forEach((c) => walk(c, fn));
}

/* ── node card (rendered inside an SVG <foreignObject>) ──── */
function NodeCard({ datum, isRoot, onSelect }) {
  const a = datum.attributes || {};
  return (
    <div
      onClick={() => onSelect(datum)}
      className={`flex w-[210px] cursor-pointer gap-2.5 rounded-xl border bg-white p-2.5 shadow-sm transition hover:shadow-md ${
        isRoot ? 'border-brand-400 ring-2 ring-brand-100' : 'border-slate-200'
      }`}
    >
      <div className="relative shrink-0">
        <img src={avatarPlaceholder(datum.name, 40)} alt="" className="h-10 w-10 rounded-full" />
        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${KYC_DOT[a.kyc] || 'bg-slate-300'}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{datum.name}{isRoot && <span className="ml-1 text-[10px] font-bold text-brand-600">YOU</span>}</p>
        <p className="truncate text-[11px] text-slate-400">{a.code}</p>
        <div className="mt-1 flex gap-2 text-[10px] font-medium">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">{a.leads || 0} leads</span>
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">{a.sales || 0} sold</span>
        </div>
      </div>
    </div>
  );
}

/* ── selected-agent sales panel ─────────────────────────── */
function SalesPanel({ agentId, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['downline-sales', agentId],
    queryFn: () => unwrap(api.get(`/agents/downline/${agentId}/sales`)),
    enabled: !!agentId,
  });

  return (
    <Drawer open={!!agentId} onClose={onClose} title="Agent performance">
      {isLoading || !data ? (
        <PageLoader />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <img src={avatarPlaceholder(data.agent.name, 48)} alt="" className="h-12 w-12 rounded-full" />
            <div>
              <p className="font-semibold">{data.agent.name}</p>
              <p className="text-xs text-slate-400">{data.agent.referralCode} · {data.agent.kycStatus?.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              ['Leads', data.totals.leads],
              ['Properties sold', data.totals.sales],
              ['Sales value', inr(data.totals.value)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 p-2">
                <p className="text-sm font-bold text-slate-900">{value}</p>
                <p className="text-[11px] text-slate-400">{label}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Properties sold</p>
            {data.sales.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                No conversions yet.
              </p>
            ) : (
              <div className="space-y-2">
                {data.sales.map((s) => (
                  <div key={s.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {s.project?.name || 'Project'}{s.property ? ` · ${s.property.unitType}` : ''}
                        </p>
                        <p className="text-xs text-slate-400">
                          {s.project?.city ? `${s.project.city} · ` : ''}{s.code}
                          {s.guestName ? ` · ${s.guestName}` : ''}
                        </p>
                      </div>
                      <span className="whitespace-nowrap text-sm font-semibold text-emerald-700">{inr(s.saleValue)}</span>
                    </div>
                    {s.convertedAt && <p className="mt-1 text-[11px] text-slate-400">Closed {fromNow(s.convertedAt)}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

export default function AgentTree() {
  const { data: tree, isLoading } = useQuery({ queryKey: ['agent-tree'], queryFn: () => unwrap(api.get('/agents/me/tree')) });
  const wrap = useRef(null);
  const [translate, setTranslate] = useState({ x: 300, y: 90 });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (wrap.current) {
      const { width } = wrap.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 90 });
    }
  }, [tree]);

  const totals = useMemo(() => {
    if (!tree) return { network: 0, sales: 0, value: 0, active: 0 };
    let network = -1, sales = 0, value = 0, active = 0;
    walk(tree, (n) => {
      network += 1;
      sales += n.attributes?.sales || 0;
      value += n.attributes?.salesValue || 0;
      if (n.attributes?.kyc === 'APPROVED') active += 1;
    });
    return { network, sales, value, active };
  }, [tree]);

  if (isLoading) return <PageLoader />;
  if (!tree) return <EmptyState title="Your network is empty" hint="Recruit sub-agents or share your referral link." />;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">My network</h1>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ['Network size', totals.network],
          ['KYC-approved', totals.active],
          ['Properties sold (network)', totals.sales],
          ['Sales value (network)', inr(totals.value)],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="card p-2">
        <div className="flex flex-wrap items-center gap-3 px-2 pb-2 pt-1 text-xs text-slate-400">
          <span>Tap a card to see that agent’s sales</span>
          <span className="ml-auto flex items-center gap-3">
            {[['APPROVED', 'approved'], ['PENDING', 'pending'], ['NOT_SUBMITTED', 'no KYC']].map(([k, l]) => (
              <span key={k} className="flex items-center gap-1"><span className={`h-2 w-2 rounded-full ${KYC_DOT[k]}`} />{l}</span>
            ))}
          </span>
        </div>
        <div ref={wrap} className="h-[64vh] w-full overflow-hidden rounded-lg bg-slate-50/60">
          <Tree
            data={tree}
            translate={translate}
            orientation="vertical"
            pathFunc="step"
            collapsible
            zoomable
            nodeSize={{ x: 250, y: 150 }}
            separation={{ siblings: 1, nonSiblings: 1.2 }}
            pathClassFunc={() => 'stroke-slate-300'}
            renderCustomNodeElement={({ nodeDatum }) => (
              <foreignObject x={-105} y={-32} width={210} height={72} style={{ overflow: 'visible' }}>
                <NodeCard datum={nodeDatum} isRoot={nodeDatum.id === tree.id} onSelect={setSelected} />
              </foreignObject>
            )}
          />
        </div>
      </div>

      <SalesPanel agentId={selected?.id} onClose={() => setSelected(null)} />
    </div>
  );
}
