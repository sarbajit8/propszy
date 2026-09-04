import { Link } from 'react-router-dom';
import { avatarPlaceholder } from '../lib/placeholder';

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function BlogMeta({ post, className = '' }) {
  return (
    <div className={`flex items-center gap-2 text-xs text-slate-400 ${className}`}>
      {post.author?.name && (
        <span className="flex items-center gap-1.5 text-slate-500">
          <img
            src={post.author.avatarUrl || `${avatarPlaceholder(post.author.name, 40)}`}
            alt="" className="h-5 w-5 rounded-full object-cover"
          />
          {post.author.name}
        </span>
      )}
      {post.publishedAt && <><span>·</span><span>{fmtDate(post.publishedAt)}</span></>}
      {post.readMinutes && <><span>·</span><span>{post.readMinutes} min read</span></>}
    </div>
  );
}

export default function BlogCard({ post, variant = 'grid' }) {
  const cover = post.coverUrl || `https://picsum.photos/seed/blog-${post.id}/800/500`;

  if (variant === 'featured') {
    return (
      <Link to={`/blog/${post.slug}`} className="card group grid overflow-hidden md:grid-cols-2">
        <div className="aspect-[16/10] overflow-hidden bg-slate-100 md:aspect-auto">
          <img src={cover} alt={post.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        </div>
        <div className="flex flex-col justify-center p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <span className="badge bg-brand-100 text-brand-700">{post.category || 'Article'}</span>
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Featured</span>
          </div>
          <h2 className="mt-3 text-2xl font-bold leading-snug text-slate-900 group-hover:text-brand-700">{post.title}</h2>
          {post.excerpt && <p className="mt-2 line-clamp-3 text-sm text-slate-500">{post.excerpt}</p>}
          <BlogMeta post={post} className="mt-4" />
        </div>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link to={`/blog/${post.slug}`} className="group flex gap-3">
        <img src={cover} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0">
          {post.category && <span className="text-[11px] font-medium uppercase tracking-wide text-brand-600">{post.category}</span>}
          <p className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-brand-700">{post.title}</p>
          <BlogMeta post={post} className="mt-1" />
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/blog/${post.slug}`} className="card group flex flex-col overflow-hidden transition hover:shadow-lg">
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <img src={cover} alt={post.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        {post.category && (
          <span className="absolute left-3 top-3 badge bg-white/95 text-brand-700 shadow-sm">{post.category}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-slate-900 group-hover:text-brand-700">{post.title}</h3>
        {post.excerpt && <p className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500">{post.excerpt}</p>}
        <BlogMeta post={post} className="mt-3 border-t border-slate-100 pt-3" />
      </div>
    </Link>
  );
}
