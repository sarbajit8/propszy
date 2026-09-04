import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHome } from '../lib/queries';
import { Spinner } from '../components/ui';
import ProjectCard from '../components/ProjectCard';
import PropertyCard from '../components/PropertyCard';
import Scroller from '../components/Scroller';
import BlogCard from '../components/BlogCard';
import HeroSearch from '../components/HeroSearch';
import { cityImage, cityImageFallback } from '../lib/cityImages';
import { priceRange } from '../lib/format';

const enc = encodeURIComponent;
const truncate = (s = '', n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const initials = (s = '') => s.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

/* 99acres-style developer card: logo + stats + about + project tabs + image */
function DeveloperCard({ dev }) {
  const projects = dev.projects || [];
  const [active, setActive] = useState(0);
  const p = projects[Math.min(active, projects.length - 1)];
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 border-t-[3px] border-t-brand-600 bg-white shadow-sm">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5">
            {dev.logoUrl
              ? <img src={dev.logoUrl} alt="" className="h-full w-full object-contain" />
              : <span className="text-base font-bold text-brand-700">{initials(dev.name)}</span>}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-bold text-slate-900">{dev.name}</h3>
            <div className="mt-1.5 flex gap-6">
              {dev.foundedYear && (
                <div><p className="text-sm font-bold text-slate-900">{dev.foundedYear}</p><p className="text-[11px] text-slate-400">Year estd.</p></div>
              )}
              <div><p className="text-sm font-bold text-slate-900">{dev.projectCount ?? dev.count}</p><p className="text-[11px] text-slate-400">Projects</p></div>
            </div>
          </div>
        </div>
        {dev.description && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-500">{dev.description}</p>}
      </div>

      {projects.length > 0 && p && (
        <>
          <div className="flex gap-4 overflow-x-auto border-b border-slate-100 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {projects.map((pr, i) => (
              <button key={pr.id} onClick={() => setActive(i)}
                className={`shrink-0 whitespace-nowrap border-b-2 py-2 text-[13px] font-medium transition ${
                  i === active ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}>
                {truncate(pr.name, 16)}
              </button>
            ))}
          </div>
          <Link to={`/projects/${p.slug || p.id}`} className="group relative mt-auto block overflow-hidden">
            <img src={p.image || `https://picsum.photos/seed/${p.id}/640/400`} alt={p.name}
              className="aspect-[16/10] w-full object-cover transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <p className="line-clamp-1 font-bold drop-shadow">{p.name}</p>
              <p className="line-clamp-1 text-xs text-white/75">{[p.address, p.city].filter(Boolean).join(', ')}</p>
              <p className="mt-1 text-sm font-bold">{priceRange(p.priceMin, p.priceMax)}</p>
            </div>
          </Link>
        </>
      )}
    </div>
  );
}

/* ── shared bits ─────────────────────────────────────────── */

function Band({ tint, children }) {
  return <section className={tint || ''}>{children}</section>;
}

function Head({ title, subtitle, to, toLabel = 'View all' }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold sm:text-[22px]">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {to && <Link to={to} className="shrink-0 text-sm font-semibold text-brand-700 hover:underline">{toLabel} →</Link>}
    </div>
  );
}

const cardRow = (section, { projectVariant = 'plain' } = {}) => (
  <Scroller>
    {section.items.map((it) =>
      section.kind === 'properties'
        ? <PropertyCard key={it.id} property={it} variant="plain" />
        : <ProjectCard key={it.id} project={it} variant={projectVariant} />
    )}
  </Scroller>
);

function ConfigCard({ c, big }) {
  return (
    <Link to={c.to} className={`group relative block overflow-hidden rounded-2xl ${big ? '' : ''}`}>
      <div className={`w-full bg-slate-100 ${big ? 'aspect-[4/3]' : 'aspect-[5/4]'}`}>
        {c.imageUrl
          ? <img src={c.imageUrl} alt={c.label} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          : <div className="grid h-full w-full place-items-center bg-gradient-to-br from-brand-100 to-brand-50 text-4xl">{c.icon || '🏠'}</div>}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className={`font-bold text-white drop-shadow-sm ${big ? 'text-lg' : 'text-base'}`}>{c.label}</p>
        {c.subtitle && <p className="text-xs text-white/80">{c.subtitle}</p>}
        {c.count != null && (
          <span className="mt-1.5 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur">
            {c.count} option{c.count === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </Link>
  );
}

/* ── page ────────────────────────────────────────────────── */

export default function Home() {
  const { data, isLoading } = useHome();
  const [demandTab, setDemandTab] = useState('RESIDENTIAL');

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Spinner className="h-8 w-8 text-brand-600" /></div>;
  }

  const d = data || {};
  const t = d.toggles || {};
  const stats = d.stats || {};
  const sections = d.sections || [];
  const configs = d.configurations || [];
  const cities = (d.cities || []).filter((c) => c.isPopular || c.count > 0);
  const builders = d.builders || [];
  const posts = d.posts || [];
  const budgets = d.budgets || [];
  const banners = (d.heroBanners || []).filter((b) => b.imageUrl);

  const bhk = configs.filter((c) => c.filterType === 'bedrooms').slice(0, 4);
  const bigCats = configs.slice(0, 3);
  const sec = (key) => sections.find((s) => s.key === key);
  const usedKeys = new Set();
  const take = (key) => { const s = sec(key); if (s) usedKeys.add(key); return s; };

  const recProps = take('featured-units') || take('trending-units');
  const recProjects = take('featured-projects');
  const highDemand = take('trending-projects');
  const handpicked = take('bestseller-projects') || take('new-launches');
  const newLaunch = sec('new-launches');
  const restSections = sections.filter((s) => !usedKeys.has(s.key) && s.key !== newLaunch?.key);

  return (
    <>
      <HeroSearch cities={cities} stats={stats} banners={banners} />

      {/* Explore cities — slider (right below hero) */}
      {cities.length > 0 && (
        <div className="container-app py-10">
          <Head
            title="Explore top cities"
            subtitle="Discover homes in India’s most sought-after locations"
            to="/projects"
          />
          <Scroller itemClass="w-[158px] sm:w-[200px]">
            {cities.slice(0, 12).map((c) => (
              <Link
                key={c.name}
                to={`/projects?city=${enc(c.name)}`}
                className="group relative block overflow-hidden rounded-2xl ring-1 ring-black/5 transition duration-300 hover:ring-2 hover:ring-brand-500/40"
              >
                <div className="aspect-[3/4]" />
                <img
                  src={cityImage(c)}
                  onError={(e) => cityImageFallback(e, c)}
                  alt={c.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3.5 text-white">
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-[15px] font-bold drop-shadow">{c.name}</p>
                    <p className="text-xs text-white/70">{c.count} {c.count === 1 ? 'project' : 'projects'}</p>
                  </div>
                  <span className="grid h-7 w-7 shrink-0 translate-y-1 place-items-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur-sm transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M7 17L17 7M17 7H8M17 7v9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </Scroller>
        </div>
      )}

      {/* Recommended properties */}
      {recProps && (
        <div className="container-app py-10">
          <Head title="Recommended properties" subtitle="Handpicked units ready to enquire" to="/properties" />
          {cardRow(recProps)}
        </div>
      )}

      {/* Recommended projects */}
      {recProjects && (
        <Band tint="bg-white">
          <div className="container-app py-10">
            <Head
              title="Recommended Projects"
              subtitle={`The most searched projects${cities[0]?.name ? ` in ${cities[0].name}` : ''}`}
              to="/projects"
            />
            {cardRow(recProjects, { projectVariant: 'recommended' })}
          </div>
        </Band>
      )}

      {/* Apartments, Villas and more */}
      {bigCats.length >= 3 && (
        <div className="container-app py-10">
          <Head title="Apartments, villas & more" subtitle="Browse by what you’re looking for" />
          <div className="grid gap-4 sm:grid-cols-3">
            {bigCats.map((c) => <ConfigCard key={c.id} c={c} big />)}
          </div>
        </div>
      )}

      {/* Projects in high demand — spotlight rail */}
      {highDemand && highDemand.items.length > 0 && (
        <Band tint="bg-gradient-to-b from-brand-50/70 via-white to-white">
          <div className="container-app py-12">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
                  </span>
                  Trending now
                </span>
                <h2 className="mt-2 text-xl font-bold sm:text-[22px]">Projects in high demand</h2>
                <p className="mt-1 text-sm text-slate-500">Ranked by buyer enquiries this month</p>
              </div>
              <Link to="/projects?sort=popular" className="shrink-0 text-sm font-semibold text-brand-700 hover:underline">View all →</Link>
            </div>
            <Scroller itemClass="w-[82%] sm:w-[54%] lg:w-[46%]">
              {[...highDemand.items]
                .sort((a, b) => (b._count?.leads || 0) - (a._count?.leads || 0))
                .map((it) => (
                  <ProjectCard key={it.id} project={it} variant="demand" />
                ))}
            </Scroller>
          </div>
        </Band>
      )}

      {/* Handpicked */}
      {handpicked && (
        <div className="container-app py-10">
          <Head title="Handpicked projects" to="/projects" />
          {cardRow(handpicked)}
        </div>
      )}

      {/* Newly launched projects */}
      {newLaunch && newLaunch.items.length > 0 && (
        <Band tint="bg-gradient-to-b from-brand-50/70 via-white to-white">
          <div className="container-app py-12">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-700">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6 4.5 2.3 7.1-6.3-4.6L5.7 21 8 13.9 2 9.4h7.6z" /></svg>
                  Just launched
                </span>
                <h2 className="mt-2 text-xl font-bold sm:text-[22px]">Newly launched projects</h2>
                <p className="mt-1 text-sm text-slate-500">Priority access to pre-launch pricing and inventory</p>
              </div>
              <Link to="/projects?status=UPCOMING" className="btn-outline shrink-0">Explore all launches →</Link>
            </div>
            <Scroller itemClass="w-[240px] sm:w-[280px]">
              {newLaunch.items.slice(0, 12).map((p) => (
                <ProjectCard key={p.id} project={p} variant="recommended" tag="New launch" />
              ))}
            </Scroller>
          </div>
        </Band>
      )}

      {/* Demand across India — market-pulse leaderboard */}
      {cities.length > 0 && (() => {
        const ranked = [...cities].sort((a, b) => b.count - a.count).slice(0, 8);
        const half = Math.ceil(ranked.length / 2);
        const cols = [ranked.slice(0, half), ranked.slice(half)];
        return (
          <Band tint="bg-slate-900">
            <div className="container-app py-14">
              <div className="grid gap-10 lg:grid-cols-[0.9fr_1.4fr] lg:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-400">Market pulse</p>
                  <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Demand across India</h2>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
                    Where homebuyers are most active right now. Switch segments to compare apartments,
                    plots and commercial.
                  </p>
                  <div className="mt-5 inline-flex rounded-full bg-white/10 p-1">
                    {[['RESIDENTIAL', 'Apartments'], ['PLOT', 'Plots'], ['COMMERCIAL', 'Commercial']].map(([v, l]) => (
                      <button key={v} onClick={() => setDemandTab(v)}
                        className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                          demandTab === v ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'
                        }`}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="mt-6">
                    <Link to="/projects" className="text-sm font-semibold text-brand-300 hover:text-brand-200">
                      Browse all cities →
                    </Link>
                  </div>
                </div>

                <div className="grid gap-x-8 sm:grid-cols-2">
                  {cols.map((col, ci) => (
                    <ol key={ci} className="divide-y divide-white/10">
                      {col.map((c, i) => {
                        const n = ci * half + i + 1;
                        return (
                          <li key={c.name}>
                            <Link to={`/projects?city=${enc(c.name)}&type=${demandTab}`}
                              className="group flex items-center gap-4 py-3.5">
                              <span className="w-7 shrink-0 text-lg font-bold tabular-nums text-white/25 group-hover:text-brand-400">
                                {String(n).padStart(2, '0')}
                              </span>
                              <span className="flex-1 truncate font-semibold text-white group-hover:text-brand-300">{c.name}</span>
                              <span className="shrink-0 text-sm text-slate-400">
                                {c.count} project{c.count === 1 ? '' : 's'}
                              </span>
                              <svg className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-brand-400"
                                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </Link>
                          </li>
                        );
                      })}
                    </ol>
                  ))}
                </div>
              </div>
            </div>
          </Band>
        );
      })()}

      {/* Prominent builders */}
      {builders.length > 0 && (
        <div className="container-app py-12">
          <Head title="Prominent real-estate builders" subtitle="Trusted developers with a proven track record" to="/projects" />
          {builders.some((b) => (b.projects || []).length) ? (
            <Scroller itemClass="w-[300px] sm:w-[350px]">
              {builders.slice(0, 10).map((b) => <DeveloperCard key={b.slug || b.name} dev={b} />)}
            </Scroller>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {builders.slice(0, 8).map((b) => (
                <Link key={b.name} to={`/projects?builder=${enc(b.name)}`} className="card flex items-center gap-3 p-4 hover:shadow-md">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">{initials(b.name)}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{b.name}</span>
                    <span className="text-xs text-slate-400">{b.count} project{b.count === 1 ? '' : 's'}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BHK choice */}
      {bhk.length > 0 && (
        <Band tint="bg-[#fdf5ec]">
          <div className="container-app py-12">
            <Head title="BHK choice in mind?" subtitle="Jump straight to your layout" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {bhk.map((c) => <ConfigCard key={c.id} c={c} />)}
            </div>
          </div>
        </Band>
      )}

      {/* Move in now / later */}
      <Band tint="bg-white">
        <div className="container-app py-12">
          <Head title="Move in now, next year or later" subtitle="Filter projects by how soon you can move in" />
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { label: 'Ready to move', sub: 'Occupy today — no waiting, no GST surprises', status: 'READY_TO_MOVE', grad: 'from-emerald-600 to-emerald-800' },
              { label: 'Under construction', sub: 'Watch it rise, book at today’s price', status: 'ONGOING', grad: 'from-brand-600 to-brand-800' },
              { label: 'New launches', sub: 'Pre-launch pricing on the newest projects', status: 'UPCOMING', grad: 'from-amber-500 to-orange-700' },
            ].map((c) => (
              <Link key={c.status} to={`/projects?status=${c.status}`}
                className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.grad} p-6 text-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl`}>
                <span className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
                <span className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-black/10" />
                <span className="relative block">
                  <span className="block text-xs font-semibold uppercase tracking-widest text-white/70">Status</span>
                  <span className="mt-2 block text-xl font-bold">{c.label}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-white/80">{c.sub}</span>
                  <span className="mt-5 inline-block border-b border-white/40 pb-0.5 text-sm font-semibold transition group-hover:border-white">
                    Browse projects
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </Band>

      {/* Budget */}
      {budgets.length > 0 && (
        <Band tint="bg-[#fdf5ec]">
          <div className="container-app pb-14">
            <Head title="Have a budget in mind?" />
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {budgets.map((b) => (
                <Link key={b.key} to={`/projects?budgetMin=${b.min}&budgetMax=${b.max}`} className="card p-5 hover:shadow-md">
                  <p className="text-sm font-semibold">{b.label}</p>
                  <p className="mt-1 text-xs text-slate-400">{b.count} project{b.count === 1 ? '' : 's'}</p>
                </Link>
              ))}
            </div>
          </div>
        </Band>
      )}

      {/* remaining curated sliders */}
      {restSections.map((s, i) => (
        <Band key={s.key} tint={i % 2 === 0 ? 'bg-white' : ''}>
          <div className="container-app py-10">
            <Head title={s.title} subtitle={s.subtitle} to={s.kind === 'properties' ? '/properties' : '/projects'} />
            {cardRow(s)}
          </div>
        </Band>
      ))}

      {/* Verified band */}
      <Band tint="bg-[#e7f5f0]">
        <div className="container-app flex flex-col items-center gap-4 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h2 className="text-xl font-bold">Every listing is RERA-first</h2>
            <p className="mt-1 text-sm text-slate-600">RERA number, builder and possession status on every project — before you call.</p>
          </div>
          <Link to="/projects" className="btn-primary">Browse verified projects</Link>
        </div>
      </Band>

      {/* Blog */}
      {t.blog !== false && posts.length > 0 && (
        <div className="container-app py-12">
          <Head title="Top reads on home buying" subtitle="Guides for buyers and investors" to="/blog" toLabel="All articles" />
          <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <BlogCard post={posts[0]} variant="featured" />
            <div className="flex flex-col gap-5">
              {posts.slice(1, 5).map((p) => <BlogCard key={p.id} post={p} variant="compact" />)}
            </div>
          </div>
        </div>
      )}

      {/* Sell faster — orange band */}
      <div className="container-app py-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-8 text-center text-white sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h2 className="text-2xl font-bold text-white">Sell or rent faster</h2>
            <p className="mt-1 text-white/90">List your property or become a Propszy agent — it’s free.</p>
          </div>
          <Link to="/become-agent" className="btn bg-white text-orange-600 hover:bg-orange-50">Get started free</Link>
        </div>
      </div>

      {/* Services */}
      <Band tint="bg-white">
        <div className="container-app py-12">
          <Head title="Explore our services" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[
              ['Buy a home', 'Residential & commercial', '/projects', '🏠'],
              ['Rent a home', 'Ready-to-move units', '/properties', '🔑'],
              ['Home loans', 'Compare & apply', '/blog', '🏦'],
              ['Legal & docs', 'Verification help', '/blog', '📄'],
              ['Interiors', 'Design your space', '/blog', '🛋️'],
              ['Packers & movers', 'Shift with ease', '/blog', '📦'],
              ['Property valuation', 'Know the worth', '/projects', '📈'],
              ['Talk to an advisor', 'Free consultation', '/register', '💬'],
            ].map(([label, sub, to, icon]) => (
              <Link key={label} to={to} className="card flex flex-col gap-1 p-4 hover:shadow-md">
                <span className="text-2xl">{icon}</span>
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-xs text-slate-400">{sub}</span>
              </Link>
            ))}
          </div>
        </div>
      </Band>

      {/* Popular cities link grid */}
      {cities.length > 0 && (
        <Band tint="bg-slate-50">
          <div className="container-app py-12">
            <Head title="Real estate in popular Indian cities" />
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
              {cities.map((c) => (
                <Link key={c.name} to={`/projects?city=${enc(c.name)}`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-medium text-slate-600 hover:border-brand-300 hover:text-brand-700">
                  Property in {c.name}
                </Link>
              ))}
            </div>
          </div>
        </Band>
      )}

    </>
  );
}
