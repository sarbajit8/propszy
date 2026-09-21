import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { api, apiError } from '../lib/api';

// Small image picker: uploads to /api/uploads/image, calls onChange(url).
// Also accepts a pasted URL. Shows a preview.
export default function ImageUpload({ value, onChange, folder = 'cms', className = '', aspect = 'aspect-[16/9]' }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('folder', folder);
      fd.append('file', file);
      const { data } = await api.post(`/uploads/image?folder=${encodeURIComponent(folder)}`, fd);
      onChange(data.data.url);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files?.[0]); }}
        className={`group relative flex ${aspect} w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-center hover:border-brand-400`}
      >
        {value ? (
          <>
            <img src={value} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 hidden items-center justify-center bg-black/40 text-xs font-medium text-white group-hover:flex">
              {busy ? 'Uploading…' : 'Replace image'}
            </span>
          </>
        ) : (
          <span className="px-3 text-xs text-slate-500">{busy ? 'Uploading…' : 'Click or drop an image'}</span>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => upload(e.target.files?.[0])} />
      <input
        className="input mt-2 text-xs"
        placeholder="…or paste an image URL"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
