import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from './api';

// Runtime config served by the backend (GET /api/settings/public).
// Admin-editable — Google Maps key, GA id, branding — so no rebuild needed.
export function usePublicConfig() {
  return useQuery({
    queryKey: ['public-config'],
    queryFn: () => unwrap(api.get('/settings/public')),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

// Apply branding + analytics side-effects once config is available.
// darken a #rrggbb by a factor (0..1) for the 700 shade
function darken(hex, f = 0.16) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * (1 - f)));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * (1 - f)));
  const b = Math.max(0, Math.round((n & 255) * (1 - f)));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export function applyRuntimeConfig(cfg) {
  if (!cfg) return;
  if (cfg.primaryColor) {
    const root = document.documentElement.style;
    root.setProperty('--brand-600', cfg.primaryColor);
    root.setProperty('--brand-700', darken(cfg.primaryColor));
  }
  if (cfg.companyName) {
    document.title = document.title.replace(/^Propszy/, cfg.companyName);
  }
  if (cfg.logoUrl) {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = cfg.logoUrl;
  }
  if (cfg.gaId && !window.__gaLoaded) {
    window.__gaLoaded = true;
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${cfg.gaId}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', cfg.gaId);
  }
}
