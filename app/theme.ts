import { APP_THEME_COLORS, type Theme } from './theme-colors.ts';

type ThemeColors = Record<Theme, string>;

// Keep these functions self-contained: the same implementation runs in the
// early head script and in the hydrated app, before and after styles load.
function applyDocumentTheme(theme: Theme, colors: ThemeColors, target: Document) {
  const root = target.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  root.style.backgroundColor = colors[theme];

  function updateMeta(name: string, content: string) {
    const elements = target.querySelectorAll<HTMLMetaElement>(`meta[name="${name}"]`);
    if (elements.length === 0) {
      const element = target.createElement('meta');
      element.name = name;
      element.content = content;
      target.head.appendChild(element);
      return;
    }
    elements.forEach((element) => {
      element.setAttribute('content', content);
      // An explicit in-app theme takes precedence over the system appearance.
      element.removeAttribute('media');
    });
  }

  updateMeta('theme-color', colors[theme]);
  updateMeta('color-scheme', theme);
}

function initializeDocumentTheme(
  browser: Window,
  colors: ThemeColors,
  apply: typeof applyDocumentTheme,
): Theme {
  const target = browser.document;
  const current = target.documentElement.dataset.theme;
  let theme: Theme;
  if (current === 'light' || current === 'dark') {
    theme = current;
  } else {
    let stored: string | null = null;
    try { stored = browser.localStorage.getItem('tally-theme'); } catch { /* Use system appearance when storage is unavailable. */ }
    let prefersDark = false;
    try { prefersDark = browser.matchMedia('(prefers-color-scheme: dark)').matches; } catch { /* Light is the fallback on older browsers. */ }
    theme = stored === 'light' || stored === 'dark' ? stored : prefersDark ? 'dark' : 'light';
  }
  apply(theme, colors, target);

  if (target.readyState === 'loading') {
    target.addEventListener('DOMContentLoaded', () => {
      const active = target.documentElement.dataset.theme;
      apply(active === 'light' || active === 'dark' ? active : theme, colors, target);
    }, { once: true });
  }
  return theme;
}

export function applyTheme(theme: Theme, target: Document = document) {
  applyDocumentTheme(theme, APP_THEME_COLORS, target);
}

export function initializeTheme(browser: Window = window): Theme {
  return initializeDocumentTheme(browser, APP_THEME_COLORS, applyDocumentTheme);
}

export const THEME_BOOTSTRAP_SCRIPT = `(${initializeDocumentTheme.toString()})(window,${JSON.stringify(APP_THEME_COLORS)},${applyDocumentTheme.toString()});`;
