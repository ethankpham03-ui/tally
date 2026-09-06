import assert from 'node:assert/strict';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import manifest from '../app/manifest.ts';
import { APP_THEME_COLORS, type Theme } from '../app/theme-colors.ts';
import { applyTheme, initializeTheme, THEME_BOOTSTRAP_SCRIPT } from '../app/theme.ts';

class MetaElement {
  attributes: Record<string, string>;

  constructor(attributes: Record<string, string> = {}) {
    this.attributes = { ...attributes };
  }

  get name() { return this.attributes.name; }
  set name(value: string) { this.attributes.name = value; }
  get content() { return this.attributes.content; }
  set content(value: string) { this.attributes.content = value; }
  setAttribute(name: string, value: string) { this.attributes[name] = value; }
  removeAttribute(name: string) { delete this.attributes[name]; }
}

function themeBrowser(options: {
  stored?: string | null;
  systemDark?: boolean;
  storageBlocked?: boolean;
  mediaBlocked?: boolean;
  metas?: Record<string, string>[];
  loading?: boolean;
} = {}) {
  const metas = (options.metas ?? [
    { name: 'theme-color', content: '#00758a' },
    { name: 'color-scheme', content: 'light dark' },
  ]).map((attributes) => new MetaElement(attributes));
  const readyListeners: (() => void)[] = [];
  const target = {
    documentElement: { dataset: {} as Record<string, string>, style: {} as Record<string, string> },
    readyState: options.loading ? 'loading' : 'complete',
    querySelectorAll(selector: string) {
      const name = selector.match(/name="([^"]+)"/)?.[1];
      return metas.filter((meta) => meta.name === name);
    },
    createElement(tag: string) {
      assert.equal(tag, 'meta');
      return new MetaElement();
    },
    head: { appendChild(element: MetaElement) { metas.push(element); } },
    addEventListener(event: string, listener: () => void) {
      assert.equal(event, 'DOMContentLoaded');
      readyListeners.push(listener);
    },
  };
  const browser = {
    document: target,
    localStorage: {
      getItem(key: string) {
        assert.equal(key, 'tally-theme');
        if (options.storageBlocked) throw new Error('Storage unavailable');
        return options.stored ?? null;
      },
    },
    matchMedia(query: string) {
      assert.equal(query, '(prefers-color-scheme: dark)');
      if (options.mediaBlocked) throw new Error('matchMedia unavailable');
      return { matches: options.systemDark ?? false };
    },
  };
  return {
    browser: browser as unknown as Window,
    target: target as unknown as Document,
    metas,
    boot() { return runInNewContext(THEME_BOOTSTRAP_SCRIPT, { window: browser }); },
    parsed() {
      target.readyState = 'complete';
      readyListeners.splice(0).forEach((listener) => listener());
    },
  };
}

function assertTheme(context: ReturnType<typeof themeBrowser>, theme: Theme) {
  const root = context.target.documentElement;
  assert.equal(root.dataset.theme, theme);
  assert.equal(root.style.colorScheme, theme);
  assert.equal(root.style.backgroundColor, APP_THEME_COLORS[theme]);
  for (const [name, content] of [['theme-color', APP_THEME_COLORS[theme]], ['color-scheme', theme]]) {
    const metas = context.metas.filter((meta) => meta.name === name);
    assert.ok(metas.length > 0, `${name} exists`);
    for (const meta of metas) {
      assert.equal(meta.content, content);
      assert.equal(meta.attributes.media, undefined);
    }
  }
}

test('installed app chrome matches the light canvas', () => {
  const appManifest = manifest();

  assert.equal(appManifest.theme_color, APP_THEME_COLORS.light);
  assert.equal(appManifest.background_color, APP_THEME_COLORS.light);
});

test('the early script applies saved appearance ahead of the system preference', () => {
  const dark = themeBrowser({ stored: 'dark', systemDark: false });
  dark.boot();
  assertTheme(dark, 'dark');

  const light = themeBrowser({ stored: 'light', systemDark: true });
  light.boot();
  assertTheme(light, 'light');
});

test('the early script uses system appearance when storage is empty, invalid, or unavailable', () => {
  for (const options of [{}, { stored: 'invalid' }, { storageBlocked: true }]) {
    const context = themeBrowser({ ...options, systemDark: true });
    context.boot();
    assertTheme(context, 'dark');
  }
});

test('missing appearance APIs keep saved themes and otherwise fall back to light', () => {
  const saved = themeBrowser({ stored: 'dark', mediaBlocked: true });
  saved.boot();
  assertTheme(saved, 'dark');

  const fallback = themeBrowser({ storageBlocked: true, mediaBlocked: true });
  fallback.boot();
  assertTheme(fallback, 'light');
});

test('missing metadata is created and theme changes repair all stale or media-specific entries', () => {
  const context = themeBrowser({ metas: [], stored: 'dark' });
  context.boot();
  assertTheme(context, 'dark');
  assert.equal(context.metas.length, 2);

  context.metas.push(new MetaElement({ name: 'theme-color', content: '#00758a', media: '(prefers-color-scheme: dark)' }));
  applyTheme('light', context.target);
  assertTheme(context, 'light');
  applyTheme('dark', context.target);
  assertTheme(context, 'dark');
  assert.equal(context.metas.length, 3);
});

test('metadata inserted later during parsing is reconciled without reverting an in-session theme', () => {
  const context = themeBrowser({ metas: [], stored: 'dark', loading: true });
  context.boot();
  applyTheme('light', context.target);
  context.metas.push(new MetaElement({ name: 'theme-color', content: '#00758a' }));
  context.metas.push(new MetaElement({ name: 'color-scheme', content: 'light dark' }));
  context.parsed();
  assertTheme(context, 'light');
});

test('hydration reconciles metadata while preserving a theme chosen when storage is unavailable', () => {
  const context = themeBrowser({ storageBlocked: true, systemDark: true });
  context.boot();
  applyTheme('light', context.target);
  context.metas[0].content = '#00758a';
  assert.equal(initializeTheme(context.browser), 'light');
  assertTheme(context, 'light');
});

test('hydration can initialize the document if the early script did not run', () => {
  const context = themeBrowser({ stored: 'dark', metas: [] });
  assert.equal(initializeTheme(context.browser), 'dark');
  assertTheme(context, 'dark');
});
