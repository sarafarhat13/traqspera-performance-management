/**
 * Call once before React islands mount (e.g. from app.jsx or a shared providers file).
 */
import { setAssetPath } from '@trimble-oss/moduswebcomponents/components';

export function bootstrapModus2() {
  if (typeof window !== 'undefined') {
    const base = window.__ASSET_BASE_URL__ || `${window.location.origin}/`;
    setAssetPath(base.endsWith('/') ? base : `${base}/`);
  }
}

export function applyModusThemeFromStorage() {
  if (typeof document === 'undefined') return;
  try {
    const choice = localStorage.getItem('theme') || 'system';
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = choice === 'system' ? (systemDark ? 'dark' : 'light') : choice;
    const modusTheme = resolved === 'dark' ? 'modus-modern-dark' : 'modus-modern-light';
    const root = document.documentElement;
    root.dataset.theme = modusTheme;
    root.dataset.mode = choice;
    root.classList.remove('light', 'dark');
    root.classList.add(resolved);
    try {
      localStorage.setItem('modus-theme-config', JSON.stringify({ theme: modusTheme }));
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
}
