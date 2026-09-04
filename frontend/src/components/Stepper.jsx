// Horizontal numbered stepper. `steps` = array of labels, `step` = current index,
// `done` = optional boolean[] marking completed steps, `onGo(i)` = jump handler.
export default function Stepper({ steps, step, done = [], onGo }) {
  return (
    <div className="flex items-center">
      {steps.map((label, i) => {
        const state = done[i] || i < step ? 'done' : i === step ? 'current' : 'todo';
        const clickable = onGo && (i <= step || done[i]);
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <button
              type="button"
              onClick={() => clickable && onGo(i)}
              className={`flex flex-col items-center gap-1 ${clickable ? '' : 'cursor-default'}`}
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-full text-sm font-bold transition ${
                  state === 'done'
                    ? 'bg-emerald-500 text-white'
                    : state === 'current'
                    ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                {state === 'done' ? '✓' : i + 1}
              </span>
              <span className={`hidden text-xs font-medium sm:block ${state === 'todo' ? 'text-slate-400' : 'text-slate-700'}`}>
                {label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <span className={`mx-2 h-0.5 flex-1 rounded ${i < step ? 'bg-emerald-400' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
