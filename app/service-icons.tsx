'use client';

import type { CSSProperties } from 'react';
import type { SubscriptionTone } from './finance-domain';
import { resolveServiceBrand, serviceBrands } from './service-brand-data';
import { SUBSCRIPTION_CATALOG, findCatalogServiceById, findCatalogServiceByName } from './subscription-catalog';

export { resolveServiceBrand, type ServiceBrand } from './service-brand-data';

export function ServiceIcon({
  serviceId,
  name,
  monogram,
  tone,
  large = false,
}: {
  serviceId?: string;
  name: string;
  monogram: string;
  tone: SubscriptionTone;
  large?: boolean;
}) {
  const catalogService = findCatalogServiceById(serviceId) ?? findCatalogServiceByName(name);
  if (catalogService?.asset) {
    const assetStyle = {
      '--service-brand': 'var(--service-tile)',
      '--service-asset': `url("${catalogService.asset}")`,
    } as CSSProperties;
    const contain = catalogService.id === 'icloud' ? ' service-brand-asset-contain' : '';
    return <span className={`service-mark service-brand-mark service-brand-asset${contain} ${large ? 'large' : ''}`.trim()} style={assetStyle} aria-hidden="true" data-service={catalogService.id} />;
  }
  const brand = resolveServiceBrand(name);
  if (!brand) return <span className={`service-mark ${large ? 'large ' : ''}${tone}`} aria-hidden="true">{monogram}</span>;
  if (brand.asset) {
    const assetStyle = {
      '--service-brand': 'var(--service-tile)',
      '--service-brand-ink': '#111827',
      '--service-asset': `url("${brand.asset}")`,
    } as CSSProperties;
    return <span className={`service-mark service-brand-mark service-brand-asset ${large ? 'large' : ''}`.trim()} style={assetStyle} aria-hidden="true" data-service={brand.id} />;
  }
  if (!brand.hex || !brand.path) return <span className={`service-mark ${large ? 'large ' : ''}${tone}`} aria-hidden="true">{monogram}</span>;
  const style = {
    '--service-brand': 'var(--service-tile)',
    '--service-brand-ink': `#${brand.hex}`,
  } as CSSProperties;
  return (
    <span className={`service-mark service-brand-mark ${large ? 'large' : ''}`.trim()} style={style} aria-hidden="true" data-service={brand.id}>
      <svg viewBox="0 0 24 24" focusable="false"><path d={brand.path} /></svg>
    </span>
  );
}

export const RECOGNIZED_SERVICE_COUNT = serviceBrands.length;
export const SERVICE_SUGGESTIONS = Array.from(new Set([
  ...SUBSCRIPTION_CATALOG.map((service) => service.name),
  ...serviceBrands.map((brand) => brand.label),
]));
