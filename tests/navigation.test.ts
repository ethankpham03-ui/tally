import assert from 'node:assert/strict';
import test from 'node:test';

import { VIEW_ORDER, viewDirection, viewFromHashValue } from '../app/navigation.ts';

test('an empty hash resolves to overview while invalid hashes stay ignorable', () => {
  assert.equal(viewFromHashValue(''), 'overview');
  assert.equal(viewFromHashValue('#'), 'overview');
  assert.equal(viewFromHashValue('#transactions'), 'transactions');
  assert.equal(viewFromHashValue('#unknown'), null);
});

test('navigation direction follows the canonical destination order', () => {
  assert.deepEqual(VIEW_ORDER, ['overview', 'transactions', 'subscriptions', 'budgets']);
  assert.equal(viewDirection('overview', 'budgets'), 1);
  assert.equal(viewDirection('budgets', 'transactions'), -1);
  assert.equal(viewDirection('transactions', 'transactions'), -1);
});
