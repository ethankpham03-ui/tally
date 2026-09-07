'use client';

import { useState, type CSSProperties } from 'react';
import { Bank, CreditCard, CurrencyCircleDollar, Receipt, Wallet } from '@phosphor-icons/react';
import type { Account } from './finance-v4';
import { resolveAccountBank } from './bank-catalog';
import './account-icons.css';

type AccountIconProps = {
  account: Pick<Account, 'kind' | 'name' | 'bankId'>;
  size?: number;
};

export function AccountIcon({ account, size = 24 }: AccountIconProps) {
  const bank = resolveAccountBank(account);
  const [failedLogo, setFailedLogo] = useState<string>();
  const logo = account.kind === 'cash' ? '/banks/apple-wallet.jpg' : bank?.logo;
  const Fallback = account.kind === 'cash' ? Wallet : account.kind === 'credit_card' ? CreditCard : account.kind === 'ewallet' ? CurrencyCircleDollar : account.kind === 'legacy' ? Receipt : Bank;
  if (!logo || failedLogo === logo) return <Fallback size={size} weight="bold" aria-hidden="true" />;

  return <span className={`account-bank-logo${account.kind === 'cash' ? ' account-cash-wallet' : ''}`} style={{ '--account-logo-size': `${size}px` } as CSSProperties} aria-hidden="true">
    {/* Official App Store artwork is bundled locally and keeps its original colors. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={logo} width={size} height={size} alt="" draggable={false} onError={() => setFailedLogo(logo)} />
  </span>;
}
