import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, apiError } from '../lib/api';
import { selectUser } from '../features/auth/authSlice';

const Heart = ({ filled, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? '#e11d48' : 'none'} stroke={filled ? '#e11d48' : 'currentColor'} strokeWidth="2">
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);

export default function FavoriteButton({ projectId, propertyId, initial = false, className, iconOnly = false }) {
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [fav, setFav] = useState(initial);
  const [busy, setBusy] = useState(false);

  const toggle = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (!user) return navigate('/login');
    setBusy(true);
    try {
      const { data } = await api.post('/favorites/toggle', { projectId, propertyId });
      setFav(data.data.favorited);
      qc.invalidateQueries({ queryKey: ['favorites'] });
      toast.success(data.data.favorited ? 'Added to wishlist' : 'Removed from wishlist');
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  if (iconOnly) {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        aria-pressed={fav}
        title={fav ? 'Remove from wishlist' : 'Save to wishlist'}
        className={
          className ||
          'grid h-9 w-9 place-items-center rounded-full bg-white/90 text-slate-600 shadow-sm backdrop-blur transition hover:bg-white hover:text-rose-600'
        }
      >
        <Heart filled={fav} size={17} />
      </button>
    );
  }

  return (
    <button onClick={toggle} disabled={busy} aria-pressed={fav} className={className || 'btn-outline'}
      title={fav ? 'Remove from wishlist' : 'Save to wishlist'}>
      <Heart filled={fav} />
      {fav ? 'Saved' : 'Save'}
    </button>
  );
}
