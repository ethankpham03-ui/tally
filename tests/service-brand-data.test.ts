import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveServiceBrand, serviceBrands } from '../app/service-brand-data.ts';

test('every suggested service label resolves to its bundled brand mark', () => {
  assert.equal(serviceBrands.length, 98);
  for (const brand of serviceBrands) assert.equal(resolveServiceBrand(brand.label)?.id, brand.id);
});

test('short and legacy service names resolve without substring collisions', () => {
  assert.equal(resolveServiceBrand('X')?.id, 'x');
  assert.equal(resolveServiceBrand('Meta')?.id, 'meta');
  assert.equal(resolveServiceBrand('Render')?.id, 'render');
  assert.equal(resolveServiceBrand('Max Standard')?.id, 'hbo-max');
  assert.equal(resolveServiceBrand('ChatGPT Plus')?.id, 'chatgpt');
  assert.equal(resolveServiceBrand('Xbox Game Pass'), undefined);
});
