import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { api, apiError } from '../lib/api';
import { videoEmbed } from '../lib/format';

export default function VideoUpload({
  value,
  onChange,
  folder = 'projects',
  className = '',
  aspect = 'aspect-video',
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (file) => {
    if (!file) return;

    // Client-side quick size check: warn if > 150MB
    const maxMb = 150;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Video is larger than ${maxMb}MB. Please choose a smaller or compressed file.`);
      return;
    }

    setBusy(true);
    setProgress(0);
    const toastId = toast.loading(`Uploading ${file.name}…`);
    try {
      const fd = new FormData();
      fd.append('folder', folder);
      fd.append('file', file);
      const { data } = await api.post(`/uploads/video?folder=${encodeURIComponent(folder)}`, fd, {
        onUploadProgress: (e) => {
          if (e.total) {
            const pct = Math.round((e.loaded * 100) / e.total);
            setProgress(pct);
          }
        },
      });
      onChange(data.data.url);
      toast.success('Video uploaded successfully!', { id: toastId });
    } catch (e) {
      console.error('Video upload failed:', e);
      const msg = apiError(e);
      toast.error(
        msg === 'Network Error' || msg?.toLowerCase().includes('network')
          ? 'Upload failed: Server connection dropped or file size too large. Please ensure video is under 150MB.'
          : msg,
        { id: toastId }
      );
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const preview = value ? videoEmbed(value) : null;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* If video exists, show preview card with replace & remove actions */}
      {value ? (
        <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-sm">
          <div className={`${aspect} w-full`}>
            {preview?.type === 'iframe' ? (
              <iframe
                src={preview.src}
                title="Video preview"
                allowFullScreen
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            ) : (
              <video
                key={value}
                src={value}
                controls
                playsInline
                preload="metadata"
                className="h-full w-full object-contain"
              >
                <source src={value} type="video/mp4" />
                Your browser does not support HTML5 video playback.
              </video>
            )}
          </div>

          {/* Action overlay / buttons */}
          <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-white">
            <span className="truncate max-w-[200px] text-slate-300 font-mono sm:max-w-xs" title={value}>
              {value}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="rounded-lg bg-white/10 px-2.5 py-1 font-medium hover:bg-white/20 transition disabled:opacity-50"
              >
                {busy ? 'Uploading…' : 'Replace Video'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onChange('')}
                className="rounded-lg bg-rose-500/20 px-2.5 py-1 font-medium text-rose-300 hover:bg-rose-500/30 transition disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Upload drop zone */
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            upload(e.dataTransfer.files?.[0]);
          }}
          className={`flex ${aspect} w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
            dragActive
              ? 'border-brand-500 bg-brand-50/50'
              : 'border-slate-300 bg-slate-50/70 hover:border-brand-400 hover:bg-white'
          }`}
        >
          {busy ? (
            <div className="flex flex-col items-center gap-2 w-full max-w-xs px-4">
              <svg className="h-8 w-8 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <p className="text-xs font-semibold text-slate-700">
                Uploading video… {progress > 0 ? `${progress}%` : ''}
              </p>
              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden mt-1">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all duration-200"
                  style={{ width: `${Math.max(5, progress)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">Please wait while the file is uploaded and processed.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                <svg className="h-6 w-6 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                  <line x1="7" y1="2" x2="7" y2="22" />
                  <line x1="17" y1="2" x2="17" y2="22" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-slate-800">
                Click to upload video file or drag and drop
              </p>
              <p className="text-[11px] text-slate-400">
                Supports MP4, WebM, QuickTime (MOV) up to 150MB
              </p>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*"
        className="hidden"
        onChange={(e) => {
          upload(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {/* Manual URL input fallback (YouTube, Vimeo, MP4) */}
      <div className="relative">
        <input
          className="input text-xs pr-8"
          placeholder="…or paste video URL (YouTube, Vimeo, direct MP4 link)"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            title="Clear video"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
