import { Component } from 'react';

// A small, local boundary for a single risky widget (e.g. a third-party map/chart
// component) — contains the crash to that widget instead of blanking the whole
// page. Pass `fallback` (a node, or a function receiving the error) to customize.
export class LocalErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Unhandled render error (contained):', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (typeof this.props.fallback === 'function') return this.props.fallback(this.state.error);
    return this.props.fallback ?? (
      <div className="grid place-items-center rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        This widget couldn't load. Try refreshing the page.
      </div>
    );
  }
}

// Without this, any uncaught render error anywhere in the tree unmounts the
// whole app and leaves a blank white page with no way to recover.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Unhandled render error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center">
        <div className="max-w-sm">
          <p className="text-4xl">⚠️</p>
          <h1 className="mt-3 text-lg font-bold text-slate-900">Something went wrong</h1>
          <p className="mt-1 text-sm text-slate-500">
            This page hit an unexpected error. Reloading usually fixes it.
          </p>
          {import.meta.env.DEV && (
            <pre className="mt-3 max-h-40 overflow-auto rounded-lg bg-slate-100 p-3 text-left text-xs text-rose-700">
              {String(this.state.error?.message || this.state.error)}
            </pre>
          )}
          <button type="button" className="btn-primary mt-4" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
