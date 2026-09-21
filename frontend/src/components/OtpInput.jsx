import { useRef } from 'react';

export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// 6 auto-advancing digit boxes — type, backspace, and paste all handled.
export function OtpBoxes({ value, onChange, onComplete }) {
  const refs = useRef([]);
  const digits = value.split('');

  const setDigit = (i, d) => {
    const arr = value.split('');
    arr[i] = d;
    const next = arr.join('').slice(0, 6);
    onChange(next);
    if (d && i < 5) refs.current[i + 1]?.focus();
    if (next.length === 6) onComplete?.(next);
  };

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const onPaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    onChange(text);
    if (text.length === 6) onComplete?.(text);
    else refs.current[text.length]?.focus();
  };

  return (
    <div className="flex justify-between gap-2" onPaste={onPaste}>
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={digits[i] || ''}
          onChange={(e) => setDigit(i, e.target.value.replace(/\D/g, '').slice(-1))}
          onKeyDown={(e) => onKeyDown(i, e)}
          inputMode="numeric" maxLength={1} autoFocus={i === 0}
          className="h-12 w-full max-w-[46px] rounded-lg border border-slate-200 text-center text-lg font-bold text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      ))}
    </div>
  );
}
