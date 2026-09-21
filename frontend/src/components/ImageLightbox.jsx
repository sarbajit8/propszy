import { useEffect } from 'react';

export default function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={onClose}>
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-slate-700 shadow-md hover:bg-white"
      >
        ✕
      </button>
      <img src={src} alt={alt || ''} className="max-h-[90vh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
      {alt && (
        <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-lg bg-black/60 px-3 py-1.5 text-sm text-white">{alt}</p>
      )}
    </div>
  );
}
