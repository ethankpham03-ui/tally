import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';

import { BANKS, getBank, inferBank, resolveAccountBank } from '../app/bank-catalog.ts';

test('bank catalog covers Vietnam, the United States, and the United Kingdom with bundled assets', () => {
  assert.deepEqual([...new Set(BANKS.map((bank) => bank.country))].sort(), ['GB', 'US', 'VN']);
  assert.equal(new Set(BANKS.map((bank) => bank.id)).size, BANKS.length);
  for (const bank of BANKS) {
    assert.equal(getBank(bank.id), bank);
    assert.equal(inferBank(bank.name), bank, bank.name);
    assert.match(bank.website, /^https:\/\//);
    assert.match(bank.logo, /^\/banks\/[a-z0-9-]+\.(svg|png|jpg|ico|webp)$/);
    const file = new URL(`../public${bank.logo}`, import.meta.url);
    assert.ok(statSync(file).size > 100, bank.id);
    const data = readFileSync(file);
    if (bank.logo.endsWith('.svg')) {
      const svg = new TextDecoder().decode(data);
      assert.match(svg, /<svg\b/);
      assert.doesNotMatch(svg, /<script\b|<foreignObject\b|\bon\w+\s*=|javascript:|(?:href|src)\s*=\s*["'](?:https?:|\/\/)/i);
    } else {
      const signature = data.subarray(0, 12);
      const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => signature[index] === byte);
      const jpeg = signature[0] === 255 && signature[1] === 216 && signature[2] === 255;
      const ico = [0, 0, 1, 0].every((byte, index) => signature[index] === byte);
      const decoder = new TextDecoder();
      const webp = decoder.decode(signature.subarray(0, 4)) === 'RIFF' && decoder.decode(signature.subarray(8, 12)) === 'WEBP';
      assert.ok(png || jpeg || ico || webp, `Not an image: ${bank.id}`);
    }
  }
});

test('existing account names match bank aliases across Vietnamese accents and spacing', () => {
  const examples: Record<string, string> = {
    'BIDV': 'bidv',
    'MB Bank': 'mbbank',
    'MB - Lương': 'mbbank',
    'MBBank cá nhân': 'mbbank',
    'Ngân hàng Quân đội': 'mbbank',
    'VCB Tiết kiệm': 'vietcombank',
    'Ngân hàng Kỹ thương Việt Nam': 'techcombank',
    'Techcom Bank - Visa': 'techcombank',
    'US Bank checking': 'us-bank',
    'U.S. Bank Visa': 'us-bank',
    'BofA - Salary': 'bank-of-america',
    'WellsFargo USD': 'wells-fargo',
    'Barclaycard rewards': 'barclays',
    'RBS savings': 'royal-bank-of-scotland',
  };
  for (const [name, id] of Object.entries(examples)) assert.equal(inferBank(name)?.id, id, name);
});

test('short aliases do not match inside unrelated names', () => {
  for (const name of ['', ' ', 'Cash', 'Ví', 'Family members', 'Columbia savings', 'Citizens Bank', 'Capital savings', 'MBank', 'ACBusiness']) {
    assert.equal(inferBank(name), undefined, name);
  }
});

test('explicit bank choices override name detection without branding cash or electronic wallets', () => {
  assert.equal(resolveAccountBank({ kind: 'bank', name: 'BIDV' })?.id, 'bidv');
  assert.equal(resolveAccountBank({ kind: 'bank', name: 'BIDV', bankId: 'mbbank' })?.id, 'mbbank');
  assert.equal(resolveAccountBank({ kind: 'credit_card', name: 'Everyday card', bankId: 'chase' })?.id, 'chase');
  assert.equal(resolveAccountBank({ kind: 'bank', name: 'BIDV', bankId: 'generic' }), undefined);
  assert.equal(resolveAccountBank({ kind: 'bank', name: 'BIDV', bankId: 'unknown-imported-bank' }), undefined);
  assert.equal(resolveAccountBank({ kind: 'cash', name: 'BIDV', bankId: 'bidv' }), undefined);
  assert.equal(resolveAccountBank({ kind: 'ewallet', name: 'Chase' }), undefined);
});
