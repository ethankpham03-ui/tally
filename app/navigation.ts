export const VIEW_ORDER = ['overview', 'transactions', 'subscriptions', 'budgets'] as const;

export type View = (typeof VIEW_ORDER)[number];

export function viewFromHashValue(hash: string): View | null {
  const value = hash.replace(/^#/, '');
  if (!value) return 'overview';
  return VIEW_ORDER.includes(value as View) ? (value as View) : null;
}

export function viewDirection(current: View, next: View): 1 | -1 {
  return VIEW_ORDER.indexOf(next) > VIEW_ORDER.indexOf(current) ? 1 : -1;
}
