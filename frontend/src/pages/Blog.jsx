import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePosts } from '../lib/queries';
import { PageLoader, EmptyState } from '../components/ui';
import BlogCard from '../components/BlogCard';

export default function Blog() {
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const { data, isLoading } = usePosts({ category, q });

  const posts = data?.data || [];
  const categories = data?.meta?.categories || [];
  const [lead, ...rest] = posts;

  return (
    <div>
      {/* header band */}
      <div className="border-b border-slate-200 bg-gradient-to-b from-brand-50 to-white">
        <div className="container-app py-12 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Propszy Journal</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Guides, market notes &amp; buyer tips</h1>
          <p className="mt-3 max-w-2xl text-slate-500">
            Practical, jargon-free reads to help you shortlist smarter and buy with confidence.
          </p>

          {/* filter row */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCategory('')}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                !category ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-300'
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.name}
                onClick={() => setCategory(c.name === category ? '' : c.name)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  category === c.name ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-300'
                }`}
              >
                {c.name} <span className="opacity-60">{c.count}</span>
              </button>
            ))}
            <input
              className="input ml-auto max-w-[220px]"
              placeholder="Search articles…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="container-app py-12">
        {isLoading ? (
          <PageLoader />
        ) : posts.length === 0 ? (
          <EmptyState title="Nothing here yet" hint={q || category ? 'Try a different filter.' : 'Publish posts from Admin → CMS.'} />
        ) : (
          <div className="space-y-12">
            {!q && !category && lead && <BlogCard post={lead} variant="featured" />}

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {(q || category ? posts : rest).map((p) => (
                <BlogCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        )}

        {/* newsletter */}
        <div className="mt-16 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-8 text-center text-white">
          <h2 className="text-xl font-bold text-white">Get the next guide in your inbox</h2>
          <p className="mt-1 text-sm text-brand-100">New launches, price trends and buyer checklists — about twice a month.</p>
          <form
            onSubmit={(e) => { e.preventDefault(); e.currentTarget.reset(); alert('Thanks! We’ll be in touch.'); }}
            className="mx-auto mt-5 flex max-w-md gap-2"
          >
            <input type="email" required placeholder="you@example.com"
              className="flex-1 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none" />
            <button className="btn bg-white text-brand-700 hover:bg-brand-50">Subscribe</button>
          </form>
        </div>
      </div>
    </div>
  );
}
