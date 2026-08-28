export const FINANCE_DATA_VERSION = 1 as const;
export const FINANCE_STORAGE_KEY = 'tally-finance-v1';

export const EXPENSE_CATEGORIES = [
  'dining',
  'shopping',
  'transport',
  'bills',
  'entertainment',
  'other',
] as const;

export type ExpenseCategoryId = (typeof EXPENSE_CATEGORIES)[number];
export type CategoryId = 'income' | ExpenseCategoryId;
export type BillingCycle = 'month' | 'year';
export type SubscriptionStatus = 'active' | 'trial' | 'paused';
export type SubscriptionTone = 'green' | 'blue' | 'graphite' | 'red' | 'violet';
export type FinanceMode = 'demo' | 'personal';
export type CashflowPeriod = '7d' | '30d' | '6m' | '1y';

export type DemoTransactionTitleId =
  | 'winmart'
  | 'companySalary'
  | 'grab'
  | 'highlandsCoffee'
  | 'augustElectricity'
  | 'rent'
  | 'groceries'
  | 'fuel'
  | 'internet'
  | 'healthInsurance'
  | 'familyDinner'
  | 'onlineCourse'
  | 'entertainment';

export type DemoPlanId =
  | 'personal'
  | 'professional'
  | 'storage200Gb'
  | 'plus'
  | 'standard'
  | 'super';

export type Transaction = {
  id: string;
  title: string;
  titleKey?: DemoTransactionTitleId;
  category: CategoryId;
  date: string;
  amount: number;
  subscriptionPaymentId?: string;
};

export type Subscription = {
  id: string;
  name: string;
  plan: string;
  planKey?: DemoPlanId;
  amount: number;
  cycle: BillingCycle;
  nextRenewal: string;
  renewalAnchorDay: number;
  status: SubscriptionStatus;
  previousStatus?: Exclude<SubscriptionStatus, 'paused'>;
  monogram: string;
  tone: SubscriptionTone;
};

export type Budget = {
  id: string;
  category: ExpenseCategoryId;
  limit: number;
};

export type SubscriptionPayment = {
  id: string;
  subscriptionId: string;
  occurrenceDate: string;
  paidOn: string;
  amount: number;
  transactionId: string;
};

export type FinanceDataV1 = {
  version: typeof FINANCE_DATA_VERSION;
  mode: FinanceMode;
  updatedAt: string;
  openingBalance: number;
  transactions: Transaction[];
  subscriptions: Subscription[];
  budgets: Budget[];
  subscriptionPayments: SubscriptionPayment[];
};

export type FinanceData = FinanceDataV1;

export type FinanceSummary = {
  availableBalance: number;
  incomeThisMonth: number;
  expenseThisMonth: number;
  netThisMonth: number;
  transactionCountThisMonth: number;
};

export type BudgetUsage = Budget & {
  spent: number;
  remaining: number;
  ratio: number;
  percent: number;
  isWarning: boolean;
  isOver: boolean;
};

export type CashflowPoint = {
  key: string;
  startDate: string;
  endDate: string;
  income: number;
  expense: number;
  net: number;
  transactionCount: number;
};

export type SubscriptionTotals = {
  monthly: number;
  annual: number;
  activeCount: number;
};

export type FinanceDataValidationResult =
  | { valid: true; data: FinanceData }
  | { valid: false; issues: string[] };

export type ParseFinanceDataResult =
  | { status: 'ok'; data: FinanceData }
  | { status: 'missing' }
  | { status: 'corrupt'; issues: string[] }
  | { status: 'future-version'; version: number };

export type RecordSubscriptionPaymentResult =
  | { status: 'recorded'; data: FinanceData; payment: SubscriptionPayment; transaction: Transaction }
  | { status: 'already-recorded'; data: FinanceData; payment: SubscriptionPayment }
  | { status: 'not-found' | 'paused' | 'invalid-date'; data: FinanceData };

type DateParts = { year: number; month: number; day: number };
type UnknownRecord = Record<string, unknown>;

const DAY_MS = 86_400_000;
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const CATEGORY_SET = new Set<string>(['income', ...EXPENSE_CATEGORIES]);
const EXPENSE_CATEGORY_SET = new Set<string>(EXPENSE_CATEGORIES);
const BILLING_CYCLE_SET = new Set<string>(['month', 'year']);
const STATUS_SET = new Set<string>(['active', 'trial', 'paused']);
const TONE_SET = new Set<string>(['green', 'blue', 'graphite', 'red', 'violet']);
const MODE_SET = new Set<string>(['demo', 'personal']);
const DEMO_TITLE_SET = new Set<string>([
  'winmart', 'companySalary', 'grab', 'highlandsCoffee', 'augustElectricity', 'rent',
  'groceries', 'fuel', 'internet', 'healthInsurance', 'familyDinner', 'onlineCourse',
  'entertainment',
]);
const DEMO_PLAN_SET = new Set<string>(['personal', 'professional', 'storage200Gb', 'plus', 'standard', 'super']);

let fallbackIdSequence = 0;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function formatDateParts({ year, month, day }: DateParts) {
  return `${String(year).padStart(4, '0')}-${pad(month)}-${pad(day)}`;
}

function parseDateOnly(value: string): DateParts | null {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) return null;
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year
    || candidate.getUTCMonth() !== month - 1
    || candidate.getUTCDate() !== day
  ) return null;
  return { year, month, day };
}

function requireDateOnly(value: string) {
  const parsed = parseDateOnly(value);
  if (!parsed) throw new RangeError(`Invalid date-only value: ${value}`);
  return parsed;
}

function utcEpoch({ year, month, day }: DateParts) {
  return Date.UTC(year, month - 1, day);
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function assertValidReferenceDate(reference: Date) {
  if (Number.isNaN(reference.getTime())) throw new RangeError('Invalid reference date');
  return reference;
}

function isSafeMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isIsoInstant(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function firstDayOfMonth(date: string) {
  const parsed = requireDateOnly(date);
  return formatDateParts({ ...parsed, day: 1 });
}

function lastDayOfMonth(date: string) {
  const parsed = requireDateOnly(date);
  return formatDateParts({ ...parsed, day: daysInMonth(parsed.year, parsed.month) });
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

function compareTransactionsNewestFirst(a: Transaction, b: Transaction) {
  return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
}

export function createId(prefix = 'item') {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === 'function') return `${prefix}_${randomUUID.call(globalThis.crypto)}`;
  fallbackIdSequence += 1;
  const entropy = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${fallbackIdSequence.toString(36)}_${entropy}`;
}

export function localTodayIso(reference = new Date()) {
  const validReference = assertValidReferenceDate(reference);
  return formatDateParts({
    year: validReference.getFullYear(),
    month: validReference.getMonth() + 1,
    day: validReference.getDate(),
  });
}

export function isValidDateOnly(value: unknown): value is string {
  return typeof value === 'string' && parseDateOnly(value) !== null;
}

export function isSafePositiveAmount(value: unknown): value is number {
  return isSafeMoney(value) && value > 0;
}

/** Returns `to - from` in whole calendar days. Date-only parsing makes this DST-safe. */
export function dateOnlyDayDifference(from: string, to: string) {
  return Math.round((utcEpoch(requireDateOnly(to)) - utcEpoch(requireDateOnly(from))) / DAY_MS);
}

export function addDaysDateOnly(date: string, days: number) {
  if (!Number.isSafeInteger(days)) throw new RangeError('Days must be a safe integer');
  const next = new Date(utcEpoch(requireDateOnly(date)) + days * DAY_MS);
  return formatDateParts({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() });
}

export function addMonthsPreservingAnchor(date: string, months = 1, anchorDay?: number) {
  if (!Number.isSafeInteger(months)) throw new RangeError('Months must be a safe integer');
  const parsed = requireDateOnly(date);
  const anchor = anchorDay ?? parsed.day;
  if (!Number.isSafeInteger(anchor) || anchor < 1 || anchor > 31) throw new RangeError('Anchor day must be between 1 and 31');
  const targetIndex = parsed.year * 12 + parsed.month - 1 + months;
  const year = Math.floor(targetIndex / 12);
  const monthIndex = ((targetIndex % 12) + 12) % 12;
  const month = monthIndex + 1;
  return formatDateParts({ year, month, day: Math.min(anchor, daysInMonth(year, month)) });
}

export function addYearsPreservingAnchor(date: string, years = 1, anchorDay?: number) {
  if (!Number.isSafeInteger(years)) throw new RangeError('Years must be a safe integer');
  const parsed = requireDateOnly(date);
  const anchor = anchorDay ?? parsed.day;
  if (!Number.isSafeInteger(anchor) || anchor < 1 || anchor > 31) throw new RangeError('Anchor day must be between 1 and 31');
  const year = parsed.year + years;
  return formatDateParts({ year, month: parsed.month, day: Math.min(anchor, daysInMonth(year, parsed.month)) });
}

export function advanceSubscriptionRenewal(subscription: Pick<Subscription, 'cycle' | 'nextRenewal' | 'renewalAnchorDay'>) {
  return subscription.cycle === 'year'
    ? addYearsPreservingAnchor(subscription.nextRenewal, 1, subscription.renewalAnchorDay)
    : addMonthsPreservingAnchor(subscription.nextRenewal, 1, subscription.renewalAnchorDay);
}

export function createEmptyData(openingBalance = 0, reference = new Date()): FinanceData {
  if (!isSafeMoney(openingBalance)) throw new RangeError('Opening balance must be a safe integer');
  return {
    version: FINANCE_DATA_VERSION,
    mode: 'personal',
    updatedAt: assertValidReferenceDate(reference).toISOString(),
    openingBalance,
    transactions: [],
    subscriptions: [],
    budgets: [],
    subscriptionPayments: [],
  };
}

export function createDemoData(reference = new Date()): FinanceData {
  const validReference = assertValidReferenceDate(reference);
  const today = localTodayIso(validReference);
  const currentMonth = today.slice(0, 7);
  const datedThisMonth = (daysAgo: number) => {
    const day = Math.max(1, requireDateOnly(today).day - daysAgo);
    return `${currentMonth}-${pad(day)}`;
  };
  const renewal = (daysAhead: number) => addDaysDateOnly(today, daysAhead);

  const transactions = ([
    { id: 'demo-tx-winmart', title: '', titleKey: 'winmart', category: 'shopping', date: datedThisMonth(1), amount: -450_000 },
    { id: 'demo-tx-salary', title: '', titleKey: 'companySalary', category: 'income', date: datedThisMonth(2), amount: 53_400_000 },
    { id: 'demo-tx-grab', title: '', titleKey: 'grab', category: 'transport', date: datedThisMonth(3), amount: -68_000 },
    { id: 'demo-tx-coffee', title: '', titleKey: 'highlandsCoffee', category: 'dining', date: datedThisMonth(4), amount: -95_000 },
    { id: 'demo-tx-electricity', title: '', titleKey: 'augustElectricity', category: 'bills', date: datedThisMonth(5), amount: -1_250_000 },
    { id: 'demo-tx-rent', title: '', titleKey: 'rent', category: 'bills', date: datedThisMonth(6), amount: -12_000_000 },
    { id: 'demo-tx-groceries', title: '', titleKey: 'groceries', category: 'shopping', date: datedThisMonth(7), amount: -3_200_000 },
    { id: 'demo-tx-fuel', title: '', titleKey: 'fuel', category: 'transport', date: datedThisMonth(8), amount: -1_500_000 },
    { id: 'demo-tx-internet', title: '', titleKey: 'internet', category: 'bills', date: datedThisMonth(9), amount: -350_000 },
    { id: 'demo-tx-health', title: '', titleKey: 'healthInsurance', category: 'bills', date: datedThisMonth(10), amount: -2_400_000 },
    { id: 'demo-tx-dinner', title: '', titleKey: 'familyDinner', category: 'dining', date: datedThisMonth(11), amount: -1_200_000 },
    { id: 'demo-tx-course', title: '', titleKey: 'onlineCourse', category: 'other', date: datedThisMonth(12), amount: -1_500_000 },
    { id: 'demo-tx-entertainment', title: '', titleKey: 'entertainment', category: 'entertainment', date: datedThisMonth(13), amount: -707_000 },
  ] satisfies Transaction[]).sort(compareTransactionsNewestFirst);

  const subscription = (
    id: string,
    name: string,
    planKey: DemoPlanId,
    amount: number,
    cycle: BillingCycle,
    daysAhead: number,
    status: SubscriptionStatus,
    monogram: string,
    tone: SubscriptionTone,
  ): Subscription => {
    const nextRenewal = renewal(daysAhead);
    return {
      id,
      name,
      plan: '',
      planKey,
      amount,
      cycle,
      nextRenewal,
      renewalAnchorDay: requireDateOnly(nextRenewal).day,
      status,
      monogram,
      tone,
    };
  };

  return {
    version: FINANCE_DATA_VERSION,
    mode: 'demo',
    updatedAt: validReference.toISOString(),
    openingBalance: 14_000_000,
    transactions,
    subscriptions: [
      subscription('demo-sub-spotify', 'Spotify', 'personal', 59_000, 'month', 1, 'active', 'S', 'green'),
      subscription('demo-sub-figma', 'Figma', 'professional', 249_000, 'month', 6, 'active', 'F', 'graphite'),
      subscription('demo-sub-icloud', 'iCloud+', 'storage200Gb', 69_000, 'month', 9, 'active', 'i', 'blue'),
      subscription('demo-sub-chatgpt', 'ChatGPT', 'plus', 500_000, 'month', 11, 'active', 'C', 'graphite'),
      subscription('demo-sub-netflix', 'Netflix', 'standard', 260_000, 'month', 14, 'paused', 'N', 'red'),
      subscription('demo-sub-duolingo', 'Duolingo', 'super', 1_299_000, 'year', 23, 'trial', 'D', 'violet'),
    ],
    budgets: [
      { id: 'demo-budget-dining', category: 'dining', limit: 4_000_000 },
      { id: 'demo-budget-shopping', category: 'shopping', limit: 2_000_000 },
      { id: 'demo-budget-transport', category: 'transport', limit: 1_200_000 },
      { id: 'demo-budget-entertainment', category: 'entertainment', limit: 800_000 },
    ],
    subscriptionPayments: [],
  };
}

export function deriveFinanceSummary(data: FinanceData, reference = new Date()): FinanceSummary {
  const selectedMonth = localTodayIso(reference).slice(0, 7);
  let incomeThisMonth = 0;
  let expenseThisMonth = 0;
  let transactionCountThisMonth = 0;
  let transactionBalance = 0;

  for (const transaction of data.transactions) {
    transactionBalance += transaction.amount;
    if (monthKey(transaction.date) !== selectedMonth) continue;
    transactionCountThisMonth += 1;
    if (transaction.amount > 0) incomeThisMonth += transaction.amount;
    else expenseThisMonth += Math.abs(transaction.amount);
  }

  return {
    availableBalance: data.openingBalance + transactionBalance,
    incomeThisMonth,
    expenseThisMonth,
    netThisMonth: incomeThisMonth - expenseThisMonth,
    transactionCountThisMonth,
  };
}

export function deriveBudgetUsage(data: FinanceData, reference = new Date()): BudgetUsage[] {
  const selectedMonth = localTodayIso(reference).slice(0, 7);
  const spentByCategory = new Map<ExpenseCategoryId, number>();
  for (const transaction of data.transactions) {
    if (transaction.amount >= 0 || monthKey(transaction.date) !== selectedMonth || transaction.category === 'income') continue;
    spentByCategory.set(transaction.category, (spentByCategory.get(transaction.category) ?? 0) + Math.abs(transaction.amount));
  }

  return data.budgets.map((budget) => {
    const spent = spentByCategory.get(budget.category) ?? 0;
    const ratio = spent / budget.limit;
    return {
      ...budget,
      spent,
      remaining: budget.limit - spent,
      ratio,
      percent: Math.round(ratio * 100),
      isWarning: ratio >= 0.9,
      isOver: ratio > 1,
    };
  });
}

export function deriveCashflowSeries(
  transactions: readonly Transaction[],
  period: CashflowPeriod,
  reference = new Date(),
): CashflowPoint[] {
  const today = localTodayIso(reference);
  const ranges: Array<{ key: string; startDate: string; endDate: string }> = [];

  if (period === '7d' || period === '30d') {
    const dayCount = period === '7d' ? 7 : 30;
    for (let offset = dayCount - 1; offset >= 0; offset -= 1) {
      const date = addDaysDateOnly(today, -offset);
      ranges.push({ key: date, startDate: date, endDate: date });
    }
  } else {
    const monthCount = period === '6m' ? 6 : 12;
    for (let offset = monthCount - 1; offset >= 0; offset -= 1) {
      const monthDate = addMonthsPreservingAnchor(firstDayOfMonth(today), -offset, 1);
      ranges.push({ key: monthKey(monthDate), startDate: firstDayOfMonth(monthDate), endDate: lastDayOfMonth(monthDate) });
    }
  }

  return ranges.map((range) => {
    let income = 0;
    let expense = 0;
    let transactionCount = 0;
    for (const transaction of transactions) {
      if (transaction.date < range.startDate || transaction.date > range.endDate) continue;
      transactionCount += 1;
      if (transaction.amount > 0) income += transaction.amount;
      else expense += Math.abs(transaction.amount);
    }
    return { ...range, income, expense, net: income - expense, transactionCount };
  });
}

export function monthlySubscriptionEquivalent(subscription: Pick<Subscription, 'amount' | 'cycle'>) {
  return subscription.cycle === 'year' ? subscription.amount / 12 : subscription.amount;
}

export function deriveSubscriptionTotals(subscriptions: readonly Subscription[]): SubscriptionTotals {
  const tracked = subscriptions.filter((subscription) => subscription.status !== 'paused');
  const monthly = tracked.reduce((total, subscription) => total + monthlySubscriptionEquivalent(subscription), 0);
  return { monthly: Math.round(monthly), annual: Math.round(monthly * 12), activeCount: tracked.length };
}

function parseTransaction(value: unknown, path: string, issues: string[]): Transaction | null {
  if (!isRecord(value)) { issues.push(`${path} must be an object`); return null; }
  const { id, title, titleKey, category, date, amount, subscriptionPaymentId } = value;
  if (!isNonEmptyString(id)) issues.push(`${path}.id must be a non-empty string`);
  if (typeof title !== 'string') issues.push(`${path}.title must be a string`);
  if (titleKey !== undefined && (typeof titleKey !== 'string' || !DEMO_TITLE_SET.has(titleKey))) issues.push(`${path}.titleKey is invalid`);
  if ((!isNonEmptyString(title)) && titleKey === undefined) issues.push(`${path} needs a title or titleKey`);
  if (typeof category !== 'string' || !CATEGORY_SET.has(category)) issues.push(`${path}.category is invalid`);
  if (!isValidDateOnly(date)) issues.push(`${path}.date is invalid`);
  if (!isSafeMoney(amount) || amount === 0) issues.push(`${path}.amount must be a non-zero safe integer`);
  if (!isOptionalString(subscriptionPaymentId)) issues.push(`${path}.subscriptionPaymentId must be a string`);
  if (issues.some((issue) => issue.startsWith(path))) return null;
  return {
    id: id as string,
    title: title as string,
    ...(titleKey === undefined ? {} : { titleKey: titleKey as DemoTransactionTitleId }),
    category: category as CategoryId,
    date: date as string,
    amount: amount as number,
    ...(subscriptionPaymentId === undefined ? {} : { subscriptionPaymentId: subscriptionPaymentId as string }),
  };
}

function parseSubscription(value: unknown, path: string, issues: string[]): Subscription | null {
  if (!isRecord(value)) { issues.push(`${path} must be an object`); return null; }
  const { id, name, plan, planKey, amount, cycle, nextRenewal, renewalAnchorDay, status, previousStatus, monogram, tone } = value;
  if (!isNonEmptyString(id)) issues.push(`${path}.id must be a non-empty string`);
  if (!isNonEmptyString(name)) issues.push(`${path}.name must be a non-empty string`);
  if (typeof plan !== 'string') issues.push(`${path}.plan must be a string`);
  if (planKey !== undefined && (typeof planKey !== 'string' || !DEMO_PLAN_SET.has(planKey))) issues.push(`${path}.planKey is invalid`);
  if (!isSafePositiveAmount(amount)) issues.push(`${path}.amount must be a positive safe integer`);
  if (typeof cycle !== 'string' || !BILLING_CYCLE_SET.has(cycle)) issues.push(`${path}.cycle is invalid`);
  if (!isValidDateOnly(nextRenewal)) issues.push(`${path}.nextRenewal is invalid`);
  if (!Number.isSafeInteger(renewalAnchorDay) || (renewalAnchorDay as number) < 1 || (renewalAnchorDay as number) > 31) issues.push(`${path}.renewalAnchorDay is invalid`);
  if (typeof status !== 'string' || !STATUS_SET.has(status)) issues.push(`${path}.status is invalid`);
  if (previousStatus !== undefined && previousStatus !== 'active' && previousStatus !== 'trial') issues.push(`${path}.previousStatus is invalid`);
  if (!isNonEmptyString(monogram)) issues.push(`${path}.monogram must be a non-empty string`);
  if (typeof tone !== 'string' || !TONE_SET.has(tone)) issues.push(`${path}.tone is invalid`);
  if (issues.some((issue) => issue.startsWith(path))) return null;
  return {
    id: id as string,
    name: name as string,
    plan: plan as string,
    ...(planKey === undefined ? {} : { planKey: planKey as DemoPlanId }),
    amount: amount as number,
    cycle: cycle as BillingCycle,
    nextRenewal: nextRenewal as string,
    renewalAnchorDay: renewalAnchorDay as number,
    status: status as SubscriptionStatus,
    ...(previousStatus === undefined ? {} : { previousStatus: previousStatus as Exclude<SubscriptionStatus, 'paused'> }),
    monogram: monogram as string,
    tone: tone as SubscriptionTone,
  };
}

function parseBudget(value: unknown, path: string, issues: string[]): Budget | null {
  if (!isRecord(value)) { issues.push(`${path} must be an object`); return null; }
  const { id, category, limit } = value;
  if (!isNonEmptyString(id)) issues.push(`${path}.id must be a non-empty string`);
  if (typeof category !== 'string' || !EXPENSE_CATEGORY_SET.has(category)) issues.push(`${path}.category is invalid`);
  if (!isSafePositiveAmount(limit)) issues.push(`${path}.limit must be a positive safe integer`);
  if (issues.some((issue) => issue.startsWith(path))) return null;
  return { id: id as string, category: category as ExpenseCategoryId, limit: limit as number };
}

function parsePayment(value: unknown, path: string, issues: string[]): SubscriptionPayment | null {
  if (!isRecord(value)) { issues.push(`${path} must be an object`); return null; }
  const { id, subscriptionId, occurrenceDate, paidOn, amount, transactionId } = value;
  if (!isNonEmptyString(id)) issues.push(`${path}.id must be a non-empty string`);
  if (!isNonEmptyString(subscriptionId)) issues.push(`${path}.subscriptionId must be a non-empty string`);
  if (!isValidDateOnly(occurrenceDate)) issues.push(`${path}.occurrenceDate is invalid`);
  if (!isValidDateOnly(paidOn)) issues.push(`${path}.paidOn is invalid`);
  if (!isSafePositiveAmount(amount)) issues.push(`${path}.amount must be a positive safe integer`);
  if (!isNonEmptyString(transactionId)) issues.push(`${path}.transactionId must be a non-empty string`);
  if (issues.some((issue) => issue.startsWith(path))) return null;
  return {
    id: id as string,
    subscriptionId: subscriptionId as string,
    occurrenceDate: occurrenceDate as string,
    paidOn: paidOn as string,
    amount: amount as number,
    transactionId: transactionId as string,
  };
}

function collectUniqueIds(items: readonly { id: string }[], path: string, issues: string[]) {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) issues.push(`${path} contains duplicate id ${item.id}`);
    ids.add(item.id);
  }
}

export function validateFinanceData(value: unknown): FinanceDataValidationResult {
  const issues: string[] = [];
  if (!isRecord(value)) return { valid: false, issues: ['Finance data must be an object'] };
  if (value.version !== FINANCE_DATA_VERSION) issues.push(`version must be ${FINANCE_DATA_VERSION}`);
  if (typeof value.mode !== 'string' || !MODE_SET.has(value.mode)) issues.push('mode is invalid');
  if (!isIsoInstant(value.updatedAt)) issues.push('updatedAt must be a valid ISO timestamp');
  if (!isSafeMoney(value.openingBalance)) issues.push('openingBalance must be a safe integer');
  if (!Array.isArray(value.transactions)) issues.push('transactions must be an array');
  if (!Array.isArray(value.subscriptions)) issues.push('subscriptions must be an array');
  if (!Array.isArray(value.budgets)) issues.push('budgets must be an array');
  if (!Array.isArray(value.subscriptionPayments)) issues.push('subscriptionPayments must be an array');

  const transactions = Array.isArray(value.transactions)
    ? value.transactions.map((item, index) => parseTransaction(item, `transactions[${index}]`, issues)).filter((item): item is Transaction => item !== null)
    : [];
  const subscriptions = Array.isArray(value.subscriptions)
    ? value.subscriptions.map((item, index) => parseSubscription(item, `subscriptions[${index}]`, issues)).filter((item): item is Subscription => item !== null)
    : [];
  const budgets = Array.isArray(value.budgets)
    ? value.budgets.map((item, index) => parseBudget(item, `budgets[${index}]`, issues)).filter((item): item is Budget => item !== null)
    : [];
  const subscriptionPayments = Array.isArray(value.subscriptionPayments)
    ? value.subscriptionPayments.map((item, index) => parsePayment(item, `subscriptionPayments[${index}]`, issues)).filter((item): item is SubscriptionPayment => item !== null)
    : [];

  collectUniqueIds(transactions, 'transactions', issues);
  collectUniqueIds(subscriptions, 'subscriptions', issues);
  collectUniqueIds(budgets, 'budgets', issues);
  collectUniqueIds(subscriptionPayments, 'subscriptionPayments', issues);
  const budgetCategories = new Set<string>();
  for (const budget of budgets) {
    if (budgetCategories.has(budget.category)) issues.push(`budgets contains duplicate category ${budget.category}`);
    budgetCategories.add(budget.category);
  }
  const paymentOccurrences = new Set<string>();
  for (const payment of subscriptionPayments) {
    const occurrenceKey = `${payment.subscriptionId}:${payment.occurrenceDate}`;
    if (paymentOccurrences.has(occurrenceKey)) issues.push(`subscriptionPayments contains duplicate occurrence ${occurrenceKey}`);
    paymentOccurrences.add(occurrenceKey);
    if (!transactions.some((transaction) => transaction.id === payment.transactionId && transaction.subscriptionPaymentId === payment.id)) {
      issues.push(`subscriptionPayments payment ${payment.id} has no matching transaction`);
    }
  }

  if (issues.length > 0) return { valid: false, issues };
  return {
    valid: true,
    data: {
      version: FINANCE_DATA_VERSION,
      mode: value.mode as FinanceMode,
      updatedAt: value.updatedAt as string,
      openingBalance: value.openingBalance as number,
      transactions,
      subscriptions,
      budgets,
      subscriptionPayments,
    },
  };
}

export function parseFinanceData(raw: string | null | undefined): ParseFinanceDataResult {
  if (raw === null || raw === undefined || raw.trim() === '') return { status: 'missing' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'corrupt', issues: ['Stored data is not valid JSON'] };
  }
  if (isRecord(parsed) && typeof parsed.version === 'number' && parsed.version > FINANCE_DATA_VERSION) {
    return { status: 'future-version', version: parsed.version };
  }
  const result = validateFinanceData(parsed);
  return result.valid ? { status: 'ok', data: result.data } : { status: 'corrupt', issues: result.issues };
}

export function serializeFinanceData(data: FinanceData) {
  const result = validateFinanceData(data);
  if (!result.valid) throw new TypeError(`Cannot serialize invalid finance data: ${result.issues.join('; ')}`);
  return JSON.stringify(result.data);
}

export function recordSubscriptionPayment(
  data: FinanceData,
  subscriptionId: string,
  paidOn = localTodayIso(),
): RecordSubscriptionPaymentResult {
  if (!isValidDateOnly(paidOn)) return { status: 'invalid-date', data };
  const subscription = data.subscriptions.find((item) => item.id === subscriptionId);
  if (!subscription) return { status: 'not-found', data };
  if (subscription.status === 'paused') return { status: 'paused', data };
  const occurrenceDate = subscription.nextRenewal;
  const existing = data.subscriptionPayments.find(
    (payment) => payment.subscriptionId === subscriptionId && payment.occurrenceDate === occurrenceDate,
  );
  if (existing) return { status: 'already-recorded', data, payment: existing };

  const paymentId = createId('payment');
  const transactionId = createId('transaction');
  const payment: SubscriptionPayment = {
    id: paymentId,
    subscriptionId,
    occurrenceDate,
    paidOn,
    amount: subscription.amount,
    transactionId,
  };
  const transaction: Transaction = {
    id: transactionId,
    title: subscription.name,
    category: 'bills',
    date: paidOn,
    amount: -subscription.amount,
    subscriptionPaymentId: paymentId,
  };
  const nextSubscription: Subscription = { ...subscription, nextRenewal: advanceSubscriptionRenewal(subscription) };
  return {
    status: 'recorded',
    payment,
    transaction,
    data: {
      ...data,
      mode: 'personal',
      updatedAt: new Date().toISOString(),
      transactions: [...data.transactions, transaction].sort(compareTransactionsNewestFirst),
      subscriptions: data.subscriptions.map((item) => item.id === subscriptionId ? nextSubscription : item),
      subscriptionPayments: [...data.subscriptionPayments, payment],
    },
  };
}
