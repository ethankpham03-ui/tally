import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import {
  SUBSCRIPTION_CATALOG,
  SUBSCRIPTION_CATALOG_CHECKED_AT,
  catalogPlanCanAutofill,
  findCatalogPlan,
  findCatalogServiceByName,
} from '../app/subscription-catalog.ts';

test('subscription catalog has stable unique ids and traceable prices', () => {
  const serviceIds = SUBSCRIPTION_CATALOG.map((service) => service.id);
  assert.equal(new Set(serviceIds).size, serviceIds.length);
  assert.ok(SUBSCRIPTION_CATALOG.length >= 15);

  for (const service of SUBSCRIPTION_CATALOG) {
    const planIds = service.plans.map((plan) => plan.id);
    assert.equal(new Set(planIds).size, planIds.length, `${service.id} has duplicate plan ids`);
    if (service.plans.length === 0) assert.ok(service.priceNotice && service.priceNoticeVi);
    if (service.asset) {
      assert.ok(service.artwork, `${service.id} is missing artwork provenance`);
      assert.equal(service.artwork?.checkedAt, SUBSCRIPTION_CATALOG_CHECKED_AT);
      assert.equal(service.artwork?.rightsStatus, 'review-required');
      assert.match(service.artwork?.sourceUrl ?? '', /^https:\/\//);
      assert.equal(existsSync(new URL(`../public${service.asset}`, import.meta.url)), true, `${service.asset} is missing`);
    }
    for (const plan of service.plans) {
      assert.equal(plan.checkedAt, SUBSCRIPTION_CATALOG_CHECKED_AT);
      assert.match(plan.sourceUrl, /^https:\/\//);
      assert.ok(plan.amount > 0);
      assert.ok(Math.abs(Math.round(plan.amount * 100) - (plan.amount * 100)) < 1e-6);
      if (plan.currency === 'VND') assert.equal(Number.isInteger(plan.amount), true);
      if (!catalogPlanCanAutofill(plan)) assert.ok(service.priceNotice && service.priceNoticeVi);
    }
  }
});

test('catalog name and plan lookup handles aliases without guessing prices', () => {
  assert.equal(findCatalogServiceByName('Apple TV+')?.id, 'apple-tv');
  assert.equal(findCatalogServiceByName('Spotify Premium')?.id, 'spotify');
  assert.equal(findCatalogServiceByName('Netflix Premium')?.id, 'netflix');
  assert.equal(findCatalogServiceByName('YouTube Music Premium')?.id, 'youtube-music');
  assert.equal(findCatalogPlan('spotify', 'premium-individual')?.amount, 65_000);
  assert.equal(findCatalogPlan('icloud', '200gb'), undefined);
});

test('critical App Store artwork matches the independently verified files', () => {
  const hash = (asset: string) => createHash('sha256')
    .update(readFileSync(new URL(`../public${asset}`, import.meta.url)))
    .digest('hex');
  assert.equal(hash('/service-icons/youtube.png'), '1a7668abc7c83854dbbd07d2ae123077ebd829931e1c4f421fce556ea5253713');
  assert.equal(hash('/service-icons/youtube-music.png'), '84209cd39a43945fd715670902a72fe64f6a9051cfbe1e78c977dd96715de713');
});
