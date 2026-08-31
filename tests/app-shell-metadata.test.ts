import assert from 'node:assert/strict';
import test from 'node:test';
import manifest from '../app/manifest.ts';
import { APP_THEME_COLORS } from '../app/theme-colors.ts';

test('installed app chrome matches the light canvas', () => {
  const appManifest = manifest();

  assert.equal(appManifest.theme_color, APP_THEME_COLORS.light);
  assert.equal(appManifest.background_color, APP_THEME_COLORS.light);
});

test('dark app chrome matches the dark canvas', () => {
  assert.equal(APP_THEME_COLORS.dark, '#0f1315');
});
