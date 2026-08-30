'use client';

import type { CSSProperties } from 'react';
import type { SubscriptionTone } from './finance-domain';
import { resolveServiceBrand, serviceBrands } from './service-brand-data';

export { resolveServiceBrand, type ServiceBrand } from './service-brand-data';

function foregroundFor(hex: string) {
  const [r, g, b] = [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const luminance = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
  return luminance > 0.62 ? '#111827' : '#ffffff';
}

export function ServiceIcon({
  name,
  monogram,
  tone,
  large = false,
}: {
  name: string;
  monogram: string;
  tone: SubscriptionTone;
  large?: boolean;
}) {
  const brand = resolveServiceBrand(name);
  if (!brand) return <span className={`service-mark ${large ? 'large ' : ''}${tone}`} aria-hidden="true">{monogram}</span>;
  if (brand.asset) {
    const assetStyle = {
      '--service-brand': '#ffffff',
      '--service-brand-ink': '#111827',
      '--service-asset': `url("${brand.asset}")`,
    } as CSSProperties;
    return <span className={`service-mark service-brand-mark service-brand-asset ${large ? 'large' : ''}`.trim()} style={assetStyle} aria-hidden="true" data-service={brand.id} />;
  }
  if (!brand.hex || !brand.path) return <span className={`service-mark ${large ? 'large ' : ''}${tone}`} aria-hidden="true">{monogram}</span>;
  const background = `#${brand.hex}`;
  const style = {
    '--service-brand': background,
    '--service-brand-ink': foregroundFor(brand.hex),
  } as CSSProperties;
  return (
    <span className={`service-mark service-brand-mark ${large ? 'large' : ''}`.trim()} style={style} aria-hidden="true" data-service={brand.id}>
      <svg viewBox="0 0 24 24" focusable="false"><path d={brand.path} /></svg>
    </span>
  );
}

export const RECOGNIZED_SERVICE_COUNT = serviceBrands.length;
export const SERVICE_SUGGESTIONS = serviceBrands.map((brand) => brand.label);
