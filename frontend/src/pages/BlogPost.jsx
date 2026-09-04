import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { usePost } from '../lib/queries';
import { PageLoader } from '../components/ui';
import BlogCard, { BlogMeta } from '../components/BlogCard';
import { avatarPlaceholder } from '../lib/placeholder';

function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      setPct(Math.min(100, Math.max(0, scrolled * 100)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent">
      <div className="h-full bg-brand-600 transition-[width] duration-150" style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function BlogPost() {
  const { slug } = useParams();
  const { data: post, isLoading, isError } = usePost(slug);

  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  if (isLoading) return <PageLoader />;
  if (isError || !post) {
    return (
      <div className="container-app py-20 text-center text-slate-500">
        Article not found. <Link to="/blog" className="text-brand-700 hover:underline">Back to the blog</Link>
      </div>
    );
  }

  const url = window.location.href;
  const share = (kind) => {
    const t = encodeURIComponent(post.title);
    const u = encodeURIComponent(url);
    if (kind === 'copy') { navigator.clipboard.writeText(url); toast.success('Link copied'); return; }
    const map = {
      whatsapp: `https://wa.me/?text=${t}%20${u}`,
      twitter: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    };
    window.open(map[kind], '_blank', 'noopener,width=600,height=520');
  };

  return (
    <article className="pb-4">
      <ReadingProgress />

      {/* header */}
      <header className="border-b border-slate-200 bg-gradient-to-b from-brand-50 to-white">
        <div className="container-app max-w-3xl py-10">
          <nav className="text-sm text-slate-400">
            <Link to="/blog" className="hover:text-brand-700">Blog</Link>
            {post.category && <> / <span className="text-slate-500">{post.category}</span></>}
          </nav>
          {post.category && (
            <Link to={`/blog?category=${encodeURIComponent(post.category)}`} className="mt-4 inline-block badge bg-brand-100 text-brand-700">
              {post.category}
            </Link>
          )}
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{post.title}</h1>
          {post.excerpt && <p className="mt-3 text-lg text-slate-500">{post.excerpt}</p>}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <BlogMeta post={post} />
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <span className="text-slate-400">Share</span>
              <button onClick={() => share('copy')} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-600 hover:text-brand-700">Copy link</button>
              <button onClick={() => share('whatsapp')} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-600 hover:text-brand-700">WhatsApp</button>
              <button onClick={() => share('twitter')} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-600 hover:text-brand-700">X</button>
              <button onClick={() => share('linkedin')} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-slate-600 hover:text-brand-700">LinkedIn</button>
            </div>
          </div>
        </div>
      </header>

      {post.coverUrl && (
        <div className="container-app max-w-4xl">
          <img src={post.coverUrl} alt={post.title} className="-mt-2 aspect-[16/8] w-full rounded-xl object-cover shadow-sm sm:-mt-6" />
        </div>
      )}

      <div className="container-app max-w-3xl">
        <div className="article-body mt-8" dangerouslySetInnerHTML={{ __html: post.body }} />

        {Array.isArray(post.tags) && post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">#{t}</span>
            ))}
          </div>
        )}

        {/* author */}
        {post.author?.name && (
          <div className="mt-10 flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
            <img
              src={post.author.avatarUrl || `${avatarPlaceholder(post.author.name, 96)}`}
              alt="" className="h-12 w-12 rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-semibold">{post.author.name}</p>
              <p className="text-xs text-slate-500">Propszy editorial team</p>
            </div>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6">
          <Link to="/blog" className="btn-outline">← All articles</Link>
          <button onClick={() => share('copy')} className="btn-ghost">Share this article</button>
        </div>
      </div>

      {/* related */}
      {post.related?.length > 0 && (
        <section className="mt-14 border-t border-slate-200 bg-white">
          <div className="container-app py-12">
            <h2 className="text-xl font-bold">Keep reading</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {post.related.map((r) => <BlogCard key={r.id} post={r} />)}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
