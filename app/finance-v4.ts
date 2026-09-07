import * as legacy from './finance-domain.ts';
import { convertToVnd, decimalRatio, isCurrency, majorAmountToMinor, sumMoney, type Currency } from './money.ts';

export * from './finance-domain.ts';
export * from './money.ts';

export const FINANCE_DATA_VERSION = 4 as const;
export const FINANCE_STORAGE_KEY = 'tally-finance-v4';
export const LEGACY_FINANCE_STORAGE_KEY = legacy.FINANCE_STORAGE_KEY;
export type AccountKind = 'cash' | 'bank' | 'ewallet' | 'credit_card' | 'legacy';
export type Account = {
  id: string; name: string; kind: AccountKind; currency: Currency;
  openingBalance: number; openingDate: string | null; archived: boolean;
  creditLimit?: number;
  bankId?: string;
};
export type AccountInput = Omit<Account, 'id' | 'archived'> & { id?: string; archived?: boolean };
export type ExchangeRate = { currency: Currency; rate: string; date: string; source: string };
export type TransactionKind = 'income' | 'expense' | 'refund' | 'transfer' | 'adjustment';
export type Transaction = legacy.Transaction & {
  kind: TransactionKind; accountId: string;
  toAccountId?: string; receivedAmount?: number;
  receivedReportingAmount?: number;
  reportingAmount?: number; reportingRate?: ExchangeRate;
  originalCurrency?: Currency; originalAmount?: number;
  groupId?: string; statementId?: string; refundOfId?: string;
  systemTitle?: 'transfer_fee' | 'balance_adjustment' | 'setup';
};
export type TransactionInput = Omit<Transaction, 'id'> & { id?: string };
export type Subscription = legacy.Subscription & { accountId?: string };
export type SubscriptionPayment = legacy.SubscriptionPayment & { accountId: string; currency: Currency };
export type CardStatement = {
  id: string; accountId: string; closingDate: string; dueDate: string;
  amount: number; minimumPayment?: number;
};
export type FinanceData = {
  version: typeof FINANCE_DATA_VERSION; mode: legacy.FinanceMode; updatedAt: string;
  revision: number; setupComplete: boolean; openingBalance: 0;
  onboarding?: 'pending' | 'completed' | 'skipped';
  defaultAccountId?: string;
  accounts: Account[]; transactions: Transaction[]; subscriptions: Subscription[];
  budgets: legacy.Budget[]; subscriptionPayments: SubscriptionPayment[];
  customCategories: legacy.CustomExpenseCategory[]; statements: CardStatement[];
  exchangeRates: ExchangeRate[];
};
export type FinanceDataV4 = FinanceData;
export type FinanceDataValidationResult = { valid: true; data: FinanceData } | { valid: false; issues: string[] };
export type ParseFinanceDataResult =
  | { status: 'ok'; data: FinanceData; migrated?: true }
  | { status: 'missing' } | { status: 'corrupt'; issues: string[] }
  | { status: 'future-version'; version: number };
export type FinanceSummary = legacy.FinanceSummary & {
  cashBalance: number; cardDebt: number; cardCredit: number; netWorth: number;
  missingCurrencies: Currency[]; unconvertedTransactionCount: number; valuationDate: string | null;
};
export type AccountBalance = {
  account: Account; balance: number; debt: number; creditBalance: number;
  availableCredit?: number; reportingBalance: number | null;
};
export type TransferInput = {
  accountId: string; toAccountId: string; amount: number; receivedAmount: number;
  date: string; title?: string; fee?: number; feeReportingAmount?: number;
  statementId?: string;
};
export type PaymentOptions = {
  expectedOccurrence: string; accountId: string; amount: number;
  reportingAmount?: number; statementId?: string;
};
export type RecordSubscriptionPaymentResult =
  | { status: 'recorded'; data: FinanceData; payment: SubscriptionPayment; transaction: Transaction }
  | { status: 'already-recorded'; data: FinanceData; payment: SubscriptionPayment }
  | { status: 'not-found' | 'paused' | 'invalid-date' | 'unsupported-currency' | 'invalid-account' | 'invalid-amount' | 'stale-occurrence'; data: FinanceData };

function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function isText(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }
function isMoney(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value); }
function requireMoney(value: number, positive = false) {
  if (!isMoney(value) || (positive && value <= 0)) throw new RangeError('Amount must be a safe integer in minor units');
}
function dateFor(reference = new Date()) { return legacy.localTodayIso(reference); }
function commit(data: FinanceData, patch: Partial<FinanceData>): FinanceData {
  // Pin an older ledger's existing fallback before account edits or reordering.
  const next: FinanceData = { ...data, defaultAccountId: getDefaultAccountId(data), ...patch,
    mode: 'personal', revision: sumMoney([data.revision, 1]), updatedAt: new Date().toISOString() };
  const defaultAccountId = getDefaultAccountId(next);
  if (defaultAccountId === undefined) delete next.defaultAccountId;
  else next.defaultAccountId = defaultAccountId;
  const result = validateFinanceData(next);
  if (!result.valid) throw new Error(result.issues.join('; '));
  return result.data;
}
function requireAccount(data: FinanceData, id: string, allowArchived = false): Account {
  const account = data.accounts.find((item) => item.id === id);
  if (!account) throw new Error('Account not found');
  if (!allowArchived && account.archived) throw new Error('Account is archived');
  return account;
}
/** Older ledgers prefer their first cash source, then their first usable source. */
export function getDefaultAccountId(data: Pick<FinanceData, 'accounts' | 'defaultAccountId'>): string | undefined {
  const active = data.accounts.filter((account) => !account.archived && account.kind !== 'legacy');
  return active.find((account) => account.id === data.defaultAccountId)?.id
    ?? active.find((account) => account.kind === 'cash')?.id ?? active[0]?.id;
}
export function setDefaultAccount(data: FinanceData, id: string): FinanceData {
  const account = requireAccount(data, id);
  if (account.kind === 'legacy') throw new Error('Choose an active real source type');
  if (data.defaultAccountId === id) return data;
  return commit(data, { defaultAccountId: id });
}
/** Reorder all active real sources; archived and historical slots stay in place. */
export function reorderAccounts(data: FinanceData, orderedIds: readonly string[]): FinanceData {
  const active = data.accounts.filter((account) => !account.archived && account.kind !== 'legacy');
  const byId = new Map(active.map((account) => [account.id, account]));
  if (orderedIds.length !== active.length || new Set(orderedIds).size !== orderedIds.length
    || orderedIds.some((id) => !byId.has(id))) throw new Error('Provide each active source exactly once');
  let index = 0;
  return commit(data, { accounts: data.accounts.map((account) => account.archived || account.kind === 'legacy'
    ? account : byId.get(orderedIds[index++])!) });
}
export function accountEffects(transaction: Transaction): Array<{ accountId: string; amount: number }> {
  return transaction.kind === 'transfer'
    ? [{ accountId: transaction.accountId, amount: transaction.amount }, { accountId: transaction.toAccountId!, amount: transaction.receivedAmount! }]
    : [{ accountId: transaction.accountId, amount: transaction.amount }];
}
function nativeBalance(data: FinanceData, account: Account, asOf: string): number {
  if (account.openingDate && account.openingDate > asOf) return 0;
  return sumMoney([account.openingBalance, ...data.transactions.filter((transaction) => transaction.date <= asOf)
    .flatMap(accountEffects).filter((effect) => effect.accountId === account.id).map((effect) => effect.amount)]);
}
export function latestExchangeRate(data: Pick<FinanceData, 'exchangeRates'>, currency: Currency, asOf = dateFor()): ExchangeRate | undefined {
  if (currency === 'VND') return { currency: 'VND', rate: '1', date: asOf, source: 'native' };
  return data.exchangeRates.filter((rate) => rate.currency === currency && rate.date <= asOf)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}
export const findExchangeRate = latestExchangeRate;
export function reportingValue(data: Pick<FinanceData, 'exchangeRates'>, amount: number, currency: Currency, date = dateFor()): number | null {
  if (amount === 0) return 0;
  const rate = latestExchangeRate(data, currency, date);
  return rate ? convertToVnd(amount, currency, rate.rate) : null;
}
export function deriveAccountBalances(data: FinanceData, reference = new Date()): AccountBalance[] {
  const asOf = dateFor(reference);
  return data.accounts.map((account) => {
    const balance = nativeBalance(data, account, asOf);
    return { account, balance, debt: account.kind === 'credit_card' ? Math.max(0, -balance) : 0,
      creditBalance: account.kind === 'credit_card' ? Math.max(0, balance) : 0,
      ...(account.creditLimit === undefined ? {} : { availableCredit: sumMoney([account.creditLimit, balance]) }),
      reportingBalance: reportingValue(data, balance, account.currency, asOf) };
  });
}

function isReportable(transaction: Transaction) { return transaction.kind === 'income' || transaction.kind === 'expense' || transaction.kind === 'refund'; }
function reportTotals(transactions: readonly Transaction[]) {
  const income: number[] = [], expense: number[] = [];
  let missing = 0;
  let count = 0;
  for (const transaction of transactions) {
    if (!isReportable(transaction)) continue;
    count += 1;
    if (transaction.reportingAmount === undefined) { missing += 1; continue; }
    if (transaction.kind === 'income') income.push(transaction.reportingAmount);
    else expense.push(-transaction.reportingAmount);
  }
  return { income: sumMoney(income), expense: sumMoney(expense), missing, count };
}
export function deriveFinanceSummary(data: FinanceData, reference = new Date()): FinanceSummary {
  const asOf = dateFor(reference);
  const month = asOf.slice(0, 7);
  const totals = reportTotals(data.transactions.filter((transaction) => transaction.date <= asOf && transaction.date.startsWith(month)));
  const balances = deriveAccountBalances(data, reference);
  const cashBalance = sumMoney(balances.filter((item) => item.account.kind !== 'credit_card').map((item) => item.reportingBalance ?? 0));
  const cardDebt = sumMoney(balances.filter((item) => item.account.kind === 'credit_card').map((item) => Math.max(0, -(item.reportingBalance ?? 0))));
  const cardCredit = sumMoney(balances.filter((item) => item.account.kind === 'credit_card').map((item) => Math.max(0, item.reportingBalance ?? 0)));
  const missingCurrencies = [...new Set(balances.filter((item) => item.reportingBalance === null).map((item) => item.account.currency))];
  const quoteDates = balances.filter((item) => item.account.currency !== 'VND' && item.balance !== 0)
    .map((item) => latestExchangeRate(data, item.account.currency, asOf)?.date).filter((date): date is string => !!date).sort();
  return { availableBalance: cashBalance, cashBalance, cardDebt, cardCredit,
    netWorth: sumMoney([cashBalance, cardCredit, -cardDebt]),
    incomeThisMonth: totals.income, expenseThisMonth: totals.expense,
    netThisMonth: sumMoney([totals.income, -totals.expense]), transactionCountThisMonth: totals.count,
    missingCurrencies, unconvertedTransactionCount: totals.missing, valuationDate: quoteDates[0] ?? null };
}
export function deriveBudgetUsage(data: FinanceData, reference = new Date()): Array<legacy.BudgetUsage & { unconvertedTransactionCount: number }> {
  const asOf = dateFor(reference);
  const month = asOf.slice(0, 7);
  return data.budgets.map((budget) => {
    const transactions = data.transactions.filter((transaction) => (transaction.kind === 'expense' || transaction.kind === 'refund')
      && transaction.category === budget.category && transaction.date.startsWith(month) && transaction.date <= asOf);
    const spent = sumMoney(transactions.map((transaction) => -(transaction.reportingAmount ?? 0)));
    const ratio = spent / budget.limit;
    return { ...budget, spent, remaining: sumMoney([budget.limit, -spent]), ratio,
      percent: Math.round(ratio * 100), isWarning: ratio >= 0.9, isOver: ratio > 1,
      unconvertedTransactionCount: transactions.filter((transaction) => transaction.reportingAmount === undefined).length };
  });
}
export function deriveCashflowSeries(transactions: readonly Transaction[], period: legacy.CashflowPeriod, reference = new Date()): Array<legacy.CashflowPoint & { unconvertedTransactionCount: number }> {
  const asOf = dateFor(reference);
  const ranges = legacy.deriveCashflowSeries([], period, reference);
  return ranges.map((range) => {
    const totals = reportTotals(transactions.filter((transaction) => transaction.date >= range.startDate && transaction.date <= range.endDate && transaction.date <= asOf));
    return { ...range, income: totals.income, expense: totals.expense, net: sumMoney([totals.income, -totals.expense]),
      transactionCount: totals.count, unconvertedTransactionCount: totals.missing };
  });
}
/** Movement of cash/bank/wallet balances; purchases on credit are not cash out. */
export function deriveLiquiditySeries(data: FinanceData, period: legacy.CashflowPeriod, reference = new Date()): Array<legacy.CashflowPoint & { adjustments: number; unconvertedTransactionCount: number }> {
  const asOf = dateFor(reference);
  const accounts = new Map(data.accounts.map((account) => [account.id, account]));
  return legacy.deriveCashflowSeries([], period, reference).map((range) => {
    const incoming: number[] = [], outgoing: number[] = [], adjustments: number[] = [];
    let count = 0, missing = 0;
    for (const transaction of data.transactions) {
      if (transaction.date < range.startDate || transaction.date > range.endDate || transaction.date > asOf) continue;
      // Closing the migrated source is bookkeeping, paired with new opening balances.
      // Neither side is a movement of money; real reconciliation adjustments remain.
      if (transaction.systemTitle === 'setup') continue;
      const sourceLiquid = accounts.get(transaction.accountId)?.kind !== 'credit_card';
      let effect: number | undefined;
      if (transaction.kind === 'transfer') {
        const destinationLiquid = accounts.get(transaction.toAccountId!)?.kind !== 'credit_card';
        if (sourceLiquid === destinationLiquid) continue;
        effect = sourceLiquid ? transaction.reportingAmount : transaction.receivedReportingAmount;
      } else {
        if (!sourceLiquid) continue;
        effect = transaction.reportingAmount;
      }
      count += 1;
      if (effect === undefined) { missing += 1; continue; }
      if (transaction.kind === 'adjustment') adjustments.push(effect);
      else if (effect >= 0) incoming.push(effect);
      else outgoing.push(-effect);
    }
    const income = sumMoney(incoming), expense = sumMoney(outgoing), adjustment = sumMoney(adjustments);
    return { ...range, income, expense, net: sumMoney([income, -expense, adjustment]), adjustments: adjustment, transactionCount: count, unconvertedTransactionCount: missing };
  });
}
export function deriveAccountReport(data: FinanceData, accountId: string, startDate?: string, endDate = dateFor()) {
  const account = requireAccount(data, accountId, true);
  const start = startDate ?? account.openingDate ?? '0100-01-01';
  if (!legacy.isValidDateOnly(start) || !legacy.isValidDateOnly(endDate) || start > endDate) throw new Error('Invalid report period');
  const transactions = data.transactions.filter((transaction) => transaction.date >= start && transaction.date <= endDate
    && accountEffects(transaction).some((effect) => effect.accountId === accountId)).sort((a, b) => b.date.localeCompare(a.date));
  // An account's baseline precedes its first day's transactions. If the report
  // starts earlier, disclose the later opening separately from reconciliation.
  const openingBalance = sumMoney([
    nativeBalance(data, account, legacy.addDaysDateOnly(start, -1)),
    account.openingDate === start ? account.openingBalance : 0,
  ]);
  const income = sumMoney(transactions.filter((transaction) => transaction.kind === 'income').map((transaction) => transaction.amount));
  const expense = sumMoney(transactions.filter((transaction) => transaction.kind === 'expense' || transaction.kind === 'refund').map((transaction) => -transaction.amount));
  const transferIn = sumMoney(transactions.filter((transaction) => transaction.kind === 'transfer' && transaction.toAccountId === accountId).map((transaction) => transaction.receivedAmount!));
  const transferOut = sumMoney(transactions.filter((transaction) => transaction.kind === 'transfer' && transaction.accountId === accountId).map((transaction) => -transaction.amount));
  const adjustments = sumMoney(transactions.filter((transaction) => transaction.kind === 'adjustment').map((transaction) => transaction.amount));
  const openingInPeriod = account.openingDate && account.openingDate > start && account.openingDate <= endDate ? account.openingBalance : 0;
  return { account, openingBalance, openingInPeriod, closingBalance: nativeBalance(data, account, endDate), income, expense,
    transferIn, transferOut, adjustments, transactions };
}

function validateRate(value: unknown, path: string, issues: string[]): value is ExchangeRate {
  const before = issues.length;
  if (!isRecord(value)) { issues.push(`${path} must be an object`); return false; }
  if (!isCurrency(value.currency)) issues.push(`${path}.currency is invalid`);
  if (typeof value.rate !== 'string' || !decimalRatio(value.rate)) issues.push(`${path}.rate must be a positive decimal`);
  if (value.currency === 'VND' && value.rate !== '1') issues.push(`${path}.rate for VND must be 1`);
  if (!legacy.isValidDateOnly(value.date)) issues.push(`${path}.date is invalid`);
  if (!isText(value.source) || value.source.length > 120) issues.push(`${path}.source is invalid`);
  return before === issues.length;
}
function assertHistoricalArithmetic(data: FinanceData) {
  const daily = new Map<string, Array<{ accountId: string; amount: number }>>();
  const add = (date: string, effect: { accountId: string; amount: number }) => {
    const entries = daily.get(date) ?? []; entries.push(effect); daily.set(date, entries);
  };
  for (const account of data.accounts) add(account.openingDate ?? '0100-01-01', { accountId: account.id, amount: account.openingBalance });
  for (const transaction of data.transactions) for (const effect of accountEffects(transaction)) add(transaction.date, effect);
  const quotesByDay = new Map<string, ExchangeRate[]>();
  for (const rate of data.exchangeRates) {
    const entries = quotesByDay.get(rate.date) ?? []; entries.push(rate); quotesByDay.set(rate.date, entries);
  }
  const balances = new Map<string, number>();
  const quotes = new Map<Currency, ExchangeRate>();
  for (const day of [...new Set([...daily.keys(), ...quotesByDay.keys()])].sort()) {
    const updates = new Map<string, number[]>();
    for (const effect of daily.get(day) ?? []) {
      const entries = updates.get(effect.accountId) ?? []; entries.push(effect.amount); updates.set(effect.accountId, entries);
    }
    for (const [id, amounts] of updates) balances.set(id, sumMoney([balances.get(id) ?? 0, ...amounts]));
    for (const rate of quotesByDay.get(day) ?? []) quotes.set(rate.currency, rate);
    const cash: number[] = [], cardDebt: number[] = [], cardCredit: number[] = [];
    for (const account of data.accounts) {
      const balance = balances.get(account.id) ?? 0;
      if (account.creditLimit !== undefined) sumMoney([account.creditLimit, balance]);
      const quote = quotes.get(account.currency);
      const value = account.currency === 'VND' ? balance : quote ? convertToVnd(balance, account.currency, quote.rate) : 0;
      if (account.kind === 'credit_card') { if (value < 0) cardDebt.push(-value); else cardCredit.push(value); }
      else cash.push(value);
    }
    sumMoney([sumMoney(cash), sumMoney(cardCredit), -sumMoney(cardDebt)]);
  }
  const months = new Map<string, Transaction[]>();
  const categories = new Map<string, number[]>();
  for (const transaction of data.transactions) {
    const month = transaction.date.slice(0, 7);
    const entries = months.get(month) ?? []; entries.push(transaction); months.set(month, entries);
    if (transaction.kind === 'expense' || transaction.kind === 'refund') {
      const key = `${month}:${transaction.category}`;
      const amounts = categories.get(key) ?? []; amounts.push(-(transaction.reportingAmount ?? 0)); categories.set(key, amounts);
    }
  }
  for (const monthly of months.values()) reportTotals(monthly);
  for (const amounts of categories.values()) sumMoney(amounts);
}
export function validateFinanceData(value: unknown): FinanceDataValidationResult {
  if (!isRecord(value)) return { valid: false, issues: ['Finance data must be an object'] };
  const issues: string[] = [];
  if (value.version !== 4) issues.push('version must be 4');
  if (!isMoney(value.revision) || value.revision < 0) issues.push('revision must be a non-negative safe integer');
  if (typeof value.setupComplete !== 'boolean') issues.push('setupComplete must be a boolean');
  if (value.onboarding !== undefined && !['pending', 'completed', 'skipped'].includes(value.onboarding as string)) issues.push('onboarding is invalid');
  if (value.openingBalance !== 0) issues.push('openingBalance must be 0; balances belong to accounts');
  const base = legacy.validateFinanceData({ version: 3, mode: value.mode, updatedAt: value.updatedAt, openingBalance: 0,
    transactions: [], subscriptions: value.subscriptions, budgets: value.budgets,
    subscriptionPayments: [], customCategories: value.customCategories });
  if (!base.valid) issues.push(...base.issues);
  const arrays = ['accounts', 'transactions', 'subscriptionPayments', 'statements', 'exchangeRates'] as const;
  for (const field of arrays) if (!Array.isArray(value[field])) issues.push(`${field} must be an array`);
  if (issues.length > 0) return { valid: false, issues };
  const accounts = value.accounts as Account[];
  const transactions = value.transactions as Transaction[];
  const payments = value.subscriptionPayments as SubscriptionPayment[];
  const statements = value.statements as CardStatement[];
  const rates = value.exchangeRates as ExchangeRate[];
  const subscriptions = value.subscriptions as Subscription[];
  const categories = new Set((value.customCategories as legacy.CustomExpenseCategory[]).map((category) => category.id));
  function ids(items: unknown[], path: string) {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (!isRecord(item) || !isText(item.id)) { issues.push(`${path}[${index}].id is invalid`); return; }
      if (seen.has(item.id)) issues.push(`${path} contains duplicate id ${item.id}`);
      seen.add(item.id);
    });
  }
  ids(accounts, 'accounts'); ids(transactions, 'transactions'); ids(payments, 'subscriptionPayments'); ids(statements, 'statements');
  if (accounts.length === 0) issues.push('At least one account is required');
  accounts.forEach((account, index) => {
    const path = `accounts[${index}]`;
    if (!isRecord(account)) return;
    if (!isText(account.name) || account.name.trim().length > 60) issues.push(`${path}.name must be 1–60 characters`);
    if (!['cash', 'bank', 'ewallet', 'credit_card', 'legacy'].includes(account.kind)) issues.push(`${path}.kind is invalid`);
    if (!isCurrency(account.currency)) issues.push(`${path}.currency is invalid`);
    if (!isMoney(account.openingBalance)) issues.push(`${path}.openingBalance is invalid`);
    if (account.openingDate === null ? account.kind !== 'legacy' : !legacy.isValidDateOnly(account.openingDate)) issues.push(`${path}.openingDate is invalid`);
    if (typeof account.archived !== 'boolean') issues.push(`${path}.archived must be a boolean`);
    if (account.creditLimit !== undefined && (account.kind !== 'credit_card' || !isMoney(account.creditLimit) || account.creditLimit < 0)) issues.push(`${path}.creditLimit is invalid`);
    if (account.bankId !== undefined && (typeof account.bankId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(account.bankId))) issues.push(`${path}.bankId is invalid`);
  });
  const accountMap = new Map(accounts.filter(isRecord).map((account) => [account.id, account]));
  if (value.defaultAccountId !== undefined) {
    const defaultAccount = typeof value.defaultAccountId === 'string' ? accountMap.get(value.defaultAccountId) : undefined;
    if (!isText(value.defaultAccountId) || !defaultAccount || defaultAccount.archived || defaultAccount.kind === 'legacy') issues.push('defaultAccountId must reference an active real source');
  }
  const rateKeys = new Set<string>();
  rates.forEach((rate, index) => {
    if (!validateRate(rate, `exchangeRates[${index}]`, issues)) return;
    const key = `${rate.currency}:${rate.date}`;
    if (rateKeys.has(key)) issues.push(`exchangeRates contains duplicate ${key}`);
    rateKeys.add(key);
  });
  statements.forEach((statement, index) => {
    if (!isRecord(statement)) return;
    const path = `statements[${index}]`;
    if (accountMap.get(statement.accountId)?.kind !== 'credit_card') issues.push(`${path}.accountId must reference a credit card`);
    if (!legacy.isValidDateOnly(statement.closingDate) || !legacy.isValidDateOnly(statement.dueDate) || statement.dueDate < statement.closingDate) issues.push(`${path} has invalid dates`);
    if (!isMoney(statement.amount) || statement.amount < 0) issues.push(`${path}.amount is invalid`);
    if (statement.minimumPayment !== undefined && (!isMoney(statement.minimumPayment) || statement.minimumPayment < 0 || statement.minimumPayment > statement.amount)) issues.push(`${path}.minimumPayment is invalid`);
  });
  const statementMap = new Map(statements.filter(isRecord).map((statement) => [statement.id, statement]));
  const knownDemoTitles = new Set(['winmart', 'companySalary', 'grab', 'highlandsCoffee', 'augustElectricity', 'rent', 'groceries', 'fuel', 'internet', 'healthInsurance', 'familyDinner', 'onlineCourse', 'entertainment']);
  transactions.forEach((transaction, index) => {
    if (!isRecord(transaction)) return;
    const path = `transactions[${index}]`;
    const account = accountMap.get(transaction.accountId);
    if (!account) issues.push(`${path}.accountId references a missing account`);
    if (!['income', 'expense', 'refund', 'transfer', 'adjustment'].includes(transaction.kind)) issues.push(`${path}.kind is invalid`);
    if (typeof transaction.title !== 'string' || (!transaction.title.trim() && !transaction.titleKey)) issues.push(`${path}.title is invalid`);
    if (transaction.titleKey !== undefined && !knownDemoTitles.has(transaction.titleKey)) issues.push(`${path}.titleKey is invalid`);
    if (!legacy.isValidDateOnly(transaction.date)) issues.push(`${path}.date is invalid`);
    if (!isMoney(transaction.amount) || transaction.amount === 0) issues.push(`${path}.amount must be a nonzero safe integer`);
    if ((transaction.kind === 'income' || transaction.kind === 'refund') && transaction.amount <= 0) issues.push(`${path}.amount must be positive`);
    if ((transaction.kind === 'expense' || transaction.kind === 'transfer') && transaction.amount >= 0) issues.push(`${path}.amount must be negative`);
    if (transaction.kind === 'income' ? transaction.category !== 'income' : !legacy.isExpenseCategoryId(transaction.category)) issues.push(`${path}.category is invalid for its kind`);
    if (legacy.isCustomExpenseCategoryId(transaction.category) && !categories.has(transaction.category)) issues.push(`${path}.category references a missing custom category`);
    if (account?.openingDate && transaction.date < account.openingDate) issues.push(`${path}.date is before the account opening date`);
    if (transaction.reportingAmount !== undefined && (!isMoney(transaction.reportingAmount) || (transaction.reportingAmount !== 0 && Math.sign(transaction.reportingAmount) !== Math.sign(transaction.amount)))) issues.push(`${path}.reportingAmount is invalid`);
    if (account?.currency === 'VND' && transaction.reportingAmount !== transaction.amount) issues.push(`${path}.reportingAmount must equal VND amount`);
    if (transaction.reportingRate !== undefined) {
      if (validateRate(transaction.reportingRate, `${path}.reportingRate`, issues)) {
        if (transaction.reportingRate.currency !== account?.currency || transaction.reportingRate.date > transaction.date) issues.push(`${path}.reportingRate does not match transaction`);
        if (account && isMoney(transaction.amount) && isCurrency(account.currency) && decimalRatio(transaction.reportingRate.rate)) {
          try { if (convertToVnd(transaction.amount, account.currency, transaction.reportingRate.rate) !== transaction.reportingAmount) issues.push(`${path}.reportingAmount does not match its rate`); }
          catch { issues.push(`${path}.reportingAmount overflows`); }
        }
      }
    }
    if ((transaction.originalCurrency === undefined) !== (transaction.originalAmount === undefined)) issues.push(`${path}.original amount/currency must be provided together`);
    if (transaction.originalCurrency !== undefined && (!isCurrency(transaction.originalCurrency) || !isMoney(transaction.originalAmount) || transaction.originalAmount <= 0)) issues.push(`${path}.original amount/currency is invalid`);
    for (const field of ['groupId', 'statementId', 'refundOfId', 'subscriptionPaymentId'] as const) if (transaction[field] !== undefined && !isText(transaction[field])) issues.push(`${path}.${field} is invalid`);
    if (transaction.systemTitle !== undefined && !['transfer_fee', 'balance_adjustment', 'setup'].includes(transaction.systemTitle)) issues.push(`${path}.systemTitle is invalid`);
    if (transaction.kind === 'transfer') {
      const destination = accountMap.get(transaction.toAccountId!);
      if (!destination || transaction.toAccountId === transaction.accountId) issues.push(`${path}.toAccountId must reference a different account`);
      if (!isMoney(transaction.receivedAmount) || transaction.receivedAmount <= 0) issues.push(`${path}.receivedAmount must be positive`);
      if (transaction.receivedReportingAmount !== undefined && (!isMoney(transaction.receivedReportingAmount) || transaction.receivedReportingAmount < 0)) issues.push(`${path}.receivedReportingAmount is invalid`);
      if (destination?.currency === 'VND' && transaction.receivedReportingAmount !== transaction.receivedAmount) issues.push(`${path}.receivedReportingAmount must equal VND received amount`);
      if (account && destination && account.currency === destination.currency && transaction.receivedAmount !== -transaction.amount) issues.push(`${path} same-currency transfer amounts must match`);
      if (destination?.openingDate && transaction.date < destination.openingDate) issues.push(`${path}.date is before destination opening date`);
      if (transaction.subscriptionPaymentId || transaction.refundOfId) issues.push(`${path} transfer cannot be a subscription expense or refund`);
    } else if (transaction.toAccountId !== undefined || transaction.receivedAmount !== undefined || transaction.receivedReportingAmount !== undefined) issues.push(`${path} non-transfer has transfer fields`);
    if (transaction.statementId !== undefined) {
      const statement = statementMap.get(transaction.statementId);
      if (transaction.kind !== 'transfer' || !statement || statement.accountId !== transaction.toAccountId || transaction.date < statement.closingDate) issues.push(`${path}.statementId must match a payment to the card after closing`);
    }
    if (transaction.refundOfId !== undefined) {
      const original = transactions.find((item) => isRecord(item) && item.id === transaction.refundOfId);
      if (transaction.kind !== 'refund' || !original || original.kind !== 'expense' || original.category !== transaction.category || original.date > transaction.date) issues.push(`${path}.refundOfId must reference an earlier expense of the same category`);
    }
  });
  const groups = new Map<string, Transaction[]>();
  for (const transaction of transactions) if (isRecord(transaction) && transaction.groupId) groups.set(transaction.groupId, [...(groups.get(transaction.groupId) ?? []), transaction]);
  for (const [id, entries] of groups) {
    const transfers = entries.filter((entry) => entry.kind === 'transfer');
    if (transfers.length !== 1 || entries.length > 2 || entries.some((entry) => entry.kind !== 'transfer' && (entry.kind !== 'expense' || entry.accountId !== transfers[0]?.accountId || entry.date !== transfers[0]?.date))) issues.push(`transaction group ${id} must contain one transfer and its optional fee`);
  }
  for (const subscription of subscriptions) {
    if (subscription.accountId !== undefined && (!isText(subscription.accountId) || !accountMap.has(subscription.accountId))) issues.push(`subscription ${subscription.id} references a missing account`);
    try { majorAmountToMinor(subscription.amount, subscription.currency); }
    catch { issues.push(`subscription ${subscription.id} cannot be represented in safe minor units`); }
  }
  const occurrences = new Set<string>();
  payments.forEach((payment, index) => {
    if (!isRecord(payment)) return;
    const path = `subscriptionPayments[${index}]`;
    if (!isText(payment.subscriptionId) || !legacy.isValidDateOnly(payment.occurrenceDate) || !legacy.isValidDateOnly(payment.paidOn)) issues.push(`${path} has invalid occurrence/date`);
    const key = `${payment.subscriptionId}:${payment.occurrenceDate}`;
    if (occurrences.has(key)) issues.push(`${path} contains duplicate occurrence`);
    occurrences.add(key);
    const transaction = transactions.find((item) => isRecord(item) && item.id === payment.transactionId);
    if (!transaction || transaction.kind !== 'expense' || transaction.subscriptionPaymentId !== payment.id || transaction.accountId !== payment.accountId
      || transaction.date !== payment.paidOn || -transaction.amount !== payment.amount || !isMoney(payment.amount) || payment.amount <= 0
      || payment.currency !== accountMap.get(payment.accountId)?.currency) issues.push(`${path} has no consistent matching transaction`);
  });
  for (const transaction of transactions) if (isRecord(transaction) && transaction.subscriptionPaymentId
    && !payments.some((payment) => isRecord(payment) && payment.id === transaction.subscriptionPaymentId && payment.transactionId === transaction.id)) issues.push(`transaction ${transaction.id} has no matching payment`);
  if (issues.length === 0) {
    try {
      const candidate = value as unknown as FinanceData;
      deriveAccountBalances(candidate);
      deriveFinanceSummary(candidate);
      deriveBudgetUsage(candidate);
      assertHistoricalArithmetic(candidate);
    } catch { issues.push('Account totals or conversions exceed safe integer limits'); }
  }
  if (issues.length > 0) return { valid: false, issues };
  return { valid: true, data: structuredClone(value) as unknown as FinanceData };
}

export function migrateLegacyFinanceData(data: legacy.FinanceData): FinanceData {
  const accountId = 'account-legacy';
  const transactions: Transaction[] = data.transactions.map((transaction) => ({ ...transaction,
    accountId, kind: transaction.amount > 0 ? 'income' : 'expense', reportingAmount: transaction.amount }));
  const payments: SubscriptionPayment[] = data.subscriptionPayments.map((payment) => {
    const transaction = transactions.find((item) => item.id === payment.transactionId);
    return { ...payment, accountId, currency: 'VND', ...(transaction ? { amount: -transaction.amount, paidOn: transaction.date } : {}) };
  });
  return { ...data, version: 4, openingBalance: 0, revision: 0, setupComplete: false,
    accounts: [{ id: accountId, name: 'Dữ liệu trước đây', kind: 'legacy', currency: 'VND', openingBalance: data.openingBalance, openingDate: null, archived: false }],
    transactions, subscriptions: data.subscriptions.map((subscription) => ({ ...subscription })),
    subscriptionPayments: payments, statements: [], exchangeRates: [] };
}
export function parseFinanceData(raw: string | null | undefined): ParseFinanceDataResult {
  if (raw == null || !raw.trim()) return { status: 'missing' };
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { status: 'corrupt', issues: ['Stored data is not valid JSON'] }; }
  if (isRecord(parsed) && typeof parsed.version === 'number' && parsed.version > 4) return { status: 'future-version', version: parsed.version };
  let migrated = false;
  if (isRecord(parsed) && [1, 2, 3].includes(parsed.version as number)) {
    const result = legacy.parseFinanceData(raw);
    if (result.status !== 'ok') return result.status === 'corrupt' ? result : { status: 'corrupt', issues: ['Invalid legacy data'] };
    parsed = migrateLegacyFinanceData(result.data);
    migrated = true;
  }
  const result = validateFinanceData(parsed);
  return result.valid ? { status: 'ok', data: result.data, ...(migrated ? { migrated: true as const } : {}) } : { status: 'corrupt', issues: result.issues };
}
export function serializeFinanceData(data: FinanceData): string {
  const result = validateFinanceData(data);
  if (!result.valid) throw new TypeError(`Cannot serialize invalid finance data: ${result.issues.join('; ')}`);
  return JSON.stringify(result.data);
}
export function createEmptyData(openingBalance = 0, reference = new Date()): FinanceData {
  requireMoney(openingBalance);
  const base = legacy.createEmptyData(0, reference);
  return { ...base, version: 4, openingBalance: 0, revision: 0, setupComplete: false,
    ...(openingBalance === 0 ? { onboarding: 'pending' as const } : {}),
    accounts: [{ id: 'account-cash', name: 'Tiền mặt', kind: 'cash', currency: 'VND', openingBalance,
      openingDate: dateFor(reference), archived: false }], transactions: [], subscriptionPayments: [], statements: [], exchangeRates: [] };
}
/** Older saved ledgers deliberately have no marker and never enter a replacement flow. */
export function needsOnboarding(data: FinanceData): boolean {
  return data.onboarding === 'pending' && isPristineOnboarding(data);
}
function isPristineOnboarding(data: FinanceData): boolean {
  const cash = data.accounts[0];
  return data.mode === 'personal' && !data.setupComplete && data.accounts.length === 1
    && cash.id === 'account-cash' && cash.name === 'Tiền mặt' && cash.kind === 'cash'
    && cash.currency === 'VND' && cash.openingBalance === 0 && !cash.archived && cash.creditLimit === undefined
    && data.transactions.length === 0 && data.subscriptions.length === 0 && data.budgets.length === 0
    && data.subscriptionPayments.length === 0 && data.statements.length === 0 && data.customCategories.length === 0 && data.exchangeRates.length === 0;
}
function requirePristineOnboarding(data: FinanceData) {
  if (data.onboarding !== 'pending') throw new Error('Onboarding is no longer pending');
  if (!isPristineOnboarding(data)) {
    throw new Error('Ledger has changed; onboarding cannot replace existing data');
  }
}
/** First balances are baselines, so they create neither income nor setup adjustments. */
export function completeOnboarding(data: FinanceData, inputs: AccountInput[], date: string): FinanceData {
  requirePristineOnboarding(data);
  checkPostedDate(date);
  if (inputs.length === 0) throw new Error('Add at least one source');
  if (inputs.some((input) => input.kind === 'legacy' || input.archived)) throw new Error('Choose an active real source type');
  const accounts = inputs.map((input): Account => ({ ...input, id: input.id ?? legacy.createId('account'),
    name: input.name.trim(), openingDate: date, archived: false }));
  return commit(data, { accounts, setupComplete: true, onboarding: 'completed' });
}
export function skipOnboarding(data: FinanceData): FinanceData {
  requirePristineOnboarding(data);
  return commit(data, { setupComplete: true, onboarding: 'skipped' });
}
export function createDemoData(reference = new Date()): FinanceData {
  const base = legacy.createDemoData(reference);
  const openingDate = `${dateFor(reference).slice(0, 7)}-01`;
  const accounts: Account[] = [
    { id: 'demo-account-cash', name: 'Tiền mặt', kind: 'cash', currency: 'VND', openingBalance: 2_000_000, openingDate, archived: false },
    { id: 'demo-account-bank', name: 'Tài khoản ngân hàng', kind: 'bank', currency: 'VND', openingBalance: 14_000_000, openingDate, archived: false },
    { id: 'demo-account-card', name: 'Thẻ tín dụng', kind: 'credit_card', currency: 'VND', openingBalance: -2_000_000, openingDate, archived: false, creditLimit: 30_000_000 },
  ];
  const transactions: Transaction[] = base.transactions.map((transaction) => ({ ...transaction,
    kind: transaction.amount > 0 ? 'income' : 'expense', reportingAmount: transaction.amount,
    accountId: transaction.amount > 0 ? 'demo-account-bank' : Math.abs(transaction.amount) < 200_000 ? 'demo-account-cash'
      : transaction.category === 'shopping' || transaction.category === 'entertainment' ? 'demo-account-card' : 'demo-account-bank' }));
  return { ...base, version: 4, openingBalance: 0, revision: 0, setupComplete: true, accounts, transactions,
    subscriptions: base.subscriptions.map((subscription) => ({ ...subscription, accountId: 'demo-account-card' })),
    subscriptionPayments: [], statements: [], exchangeRates: [] };
}
function checkPostedDate(date: string) {
  if (!legacy.isValidDateOnly(date) || date > dateFor()) throw new Error('Use a valid posted date no later than today');
}
function capturedTransaction(data: FinanceData, input: TransactionInput, existingId?: string): Transaction {
  const account = requireAccount(data, input.accountId, !!existingId);
  checkPostedDate(input.date);
  requireMoney(input.amount);
  let reportingAmount = input.reportingAmount;
  let reportingRate = input.reportingRate;
  if (account.currency === 'VND') { reportingAmount = input.amount; reportingRate = undefined; }
  else if (reportingAmount === undefined) {
    reportingRate = reportingRate ?? latestExchangeRate(data, account.currency, input.date);
    if (reportingRate) reportingAmount = convertToVnd(input.amount, account.currency, reportingRate.rate);
  }
  const transaction: Transaction = { ...input, id: existingId ?? input.id ?? legacy.createId('transaction'),
    ...(reportingAmount === undefined ? {} : { reportingAmount }), ...(reportingRate === undefined ? {} : { reportingRate }) };
  if (reportingAmount === undefined) delete transaction.reportingAmount;
  if (reportingRate === undefined) delete transaction.reportingRate;
  return transaction;
}
export function saveLedgerTransaction(data: FinanceData, input: TransactionInput, existingId?: string): FinanceData {
  const existing = existingId ? data.transactions.find((item) => item.id === existingId) : undefined;
  if (existingId && !existing) throw new Error('Transaction not found');
  if (existing?.groupId) throw new Error('Edit the entire transfer and fee together');
  if (input.kind === 'transfer') throw new Error('Use the transfer action');
  if (existing?.kind === 'transfer') throw new Error('Use the transfer action');
  if (existing?.subscriptionPaymentId && input.kind !== 'expense') throw new Error('A subscription payment must remain an expense');
  if (existing && existing.accountId !== input.accountId && requireAccount(data, existing.accountId, true).kind === 'legacy') throw new Error('Historical source reassignment requires a balance reconciliation');
  const transaction = capturedTransaction(data, { ...input, ...(existing?.subscriptionPaymentId ? { subscriptionPaymentId: existing.subscriptionPaymentId } : {}) }, existingId);
  if (existing && existing.accountId === input.accountId && existing.amount === input.amount && existing.date === input.date
    && input.reportingAmount === undefined && input.reportingRate === undefined) {
    if (existing.reportingAmount === undefined) delete transaction.reportingAmount;
    else transaction.reportingAmount = existing.reportingAmount;
    if (existing.reportingRate === undefined) delete transaction.reportingRate;
    else transaction.reportingRate = existing.reportingRate;
  }
  const payments = data.subscriptionPayments.map((payment) => payment.transactionId === transaction.id
    ? { ...payment, amount: -transaction.amount, paidOn: transaction.date, accountId: transaction.accountId, currency: requireAccount(data, transaction.accountId, true).currency } : payment);
  return commit(data, { transactions: existing ? data.transactions.map((item) => item.id === existing.id ? transaction : item) : [...data.transactions, transaction], subscriptionPayments: payments });
}
export function saveTransfer(data: FinanceData, input: TransferInput, existingId?: string): FinanceData {
  const existing = existingId ? data.transactions.find((item) => item.id === existingId) : undefined;
  if (existingId && existing?.kind !== 'transfer') throw new Error('Transfer not found');
  const source = requireAccount(data, input.accountId, !!existingId);
  const destination = requireAccount(data, input.toAccountId, !!existingId);
  checkPostedDate(input.date);
  requireMoney(input.amount, true); requireMoney(input.receivedAmount, true);
  if (input.fee !== undefined && (!isMoney(input.fee) || input.fee < 0)) throw new Error('Fee must be a non-negative amount');
  if (source.id === destination.id) throw new Error('Choose two different accounts');
  if (source.kind === 'legacy' || destination.kind === 'legacy') throw new Error('Reconcile historical balances instead of assigning their source');
  if (source.currency === destination.currency && input.amount !== input.receivedAmount) throw new Error('Same-currency transfer amounts must match');
  const id = existingId ?? legacy.createId('transaction');
  const groupId = existing?.groupId ?? legacy.createId('transfer-group');
  const transfer = capturedTransaction(data, { id, kind: 'transfer', accountId: source.id, toAccountId: destination.id,
    amount: -input.amount, receivedAmount: input.receivedAmount, date: input.date, title: input.title?.trim() || `${source.name} → ${destination.name}`,
    category: 'other', groupId, ...(input.statementId ? { statementId: input.statementId } : {}) }, existingId);
  const sameAmounts = existing && existing.accountId === source.id && existing.toAccountId === destination.id
    && existing.amount === -input.amount && existing.receivedAmount === input.receivedAmount && existing.date === input.date;
  if (sameAmounts) {
    if (existing.reportingAmount === undefined) delete transfer.reportingAmount;
    else transfer.reportingAmount = existing.reportingAmount;
    if (existing.reportingRate === undefined) delete transfer.reportingRate;
    else transfer.reportingRate = existing.reportingRate;
    if (existing.receivedReportingAmount !== undefined) transfer.receivedReportingAmount = existing.receivedReportingAmount;
  } else {
    const receivedReportingAmount = reportingValue(data, input.receivedAmount, destination.currency, input.date);
    if (receivedReportingAmount !== null) transfer.receivedReportingAmount = receivedReportingAmount;
  }
  const priorFee = existing?.groupId ? data.transactions.find((item) => item.groupId === existing.groupId && item.kind === 'expense') : undefined;
  const entries: Transaction[] = [transfer];
  if (input.fee) entries.push(capturedTransaction(data, { kind: 'expense', id: priorFee?.id, accountId: source.id,
    amount: -input.fee, reportingAmount: input.feeReportingAmount, category: 'bank_fees', date: input.date, title: transfer.title, systemTitle: 'transfer_fee', groupId }, priorFee?.id));
  if (priorFee && entries[1] && priorFee.accountId === entries[1].accountId && priorFee.amount === entries[1].amount && priorFee.date === entries[1].date && input.feeReportingAmount === undefined) {
    if (priorFee.reportingAmount === undefined) delete entries[1].reportingAmount;
    else entries[1].reportingAmount = priorFee.reportingAmount;
    if (priorFee.reportingRate === undefined) delete entries[1].reportingRate;
    else entries[1].reportingRate = priorFee.reportingRate;
  }
  return commit(data, { transactions: [...data.transactions.filter((item) => item.id !== existingId && (!existing?.groupId || item.groupId !== existing.groupId)), ...entries] });
}
export function deleteLedgerTransaction(data: FinanceData, id: string): FinanceData {
  const target = data.transactions.find((item) => item.id === id);
  if (!target) throw new Error('Transaction not found');
  if (data.transactions.some((item) => item.refundOfId === id)) throw new Error('Remove or unlink refunds before deleting their original expense');
  const removed = data.transactions.filter((item) => item.id === id || (target.groupId && item.groupId === target.groupId));
  const removedIds = new Set(removed.map((item) => item.id));
  const removedPayments = data.subscriptionPayments.filter((payment) => removedIds.has(payment.transactionId));
  const payments = data.subscriptionPayments.filter((payment) => !removedIds.has(payment.transactionId));
  const subscriptions = data.subscriptions.map((subscription) => {
    const removedPayment = removedPayments.find((payment) => payment.subscriptionId === subscription.id);
    if (!removedPayment || payments.some((payment) => payment.subscriptionId === subscription.id && payment.occurrenceDate > removedPayment.occurrenceDate)) return subscription;
    const afterRemoved = legacy.advanceSubscriptionRenewal({ ...subscription, nextRenewal: removedPayment.occurrenceDate });
    return subscription.nextRenewal === afterRemoved ? { ...subscription, nextRenewal: removedPayment.occurrenceDate } : subscription;
  });
  return commit(data, { transactions: data.transactions.filter((item) => !removedIds.has(item.id)), subscriptionPayments: payments, subscriptions });
}

export function saveAccount(data: FinanceData, input: AccountInput, existingId?: string): FinanceData {
  const existing = existingId ? requireAccount(data, existingId, true) : undefined;
  if (input.kind === 'legacy' && existing?.kind !== 'legacy') throw new Error('Historical sources are created only by migration');
  const id = existingId ?? input.id ?? legacy.createId('account');
  const hasHistory = !!existing && (data.transactions.some((transaction) => accountEffects(transaction).some((effect) => effect.accountId === id))
    || data.statements.some((statement) => statement.accountId === id));
  if (existing && hasHistory && (input.currency !== existing.currency || input.kind !== existing.kind)) throw new Error('Currency and account type cannot change after recording history');
  if (existing && hasHistory && (input.openingBalance !== existing.openingBalance || input.openingDate !== existing.openingDate)) throw new Error('Use balance reconciliation to change an account with history');
  if (existing?.kind === 'legacy' && (input.openingBalance !== existing.openingBalance || input.openingDate !== null)) throw new Error('The historical opening balance is preserved');
  if (input.openingDate !== null) checkPostedDate(input.openingDate);
  const account: Account = { ...input, id, name: input.name.trim(), archived: existing?.archived ?? input.archived ?? false };
  return commit(data, { accounts: existing ? data.accounts.map((item) => item.id === id ? account : item) : [...data.accounts, account] });
}
export function archiveAccount(data: FinanceData, id: string): FinanceData {
  const account = requireAccount(data, id, true);
  if (nativeBalance(data, account, dateFor()) !== 0) throw new Error('Reconcile or transfer the remaining balance before archiving');
  if (data.subscriptions.some((subscription) => subscription.accountId === id)) throw new Error('Choose a different default source for subscriptions first');
  if (!data.accounts.some((item) => item.id !== id && !item.archived && item.kind !== 'legacy')) throw new Error('Keep at least one active source');
  return commit(data, { accounts: data.accounts.map((item) => item.id === id ? { ...item, archived: true } : item) });
}
export function unarchiveAccount(data: FinanceData, id: string): FinanceData {
  requireAccount(data, id, true);
  return commit(data, { accounts: data.accounts.map((item) => item.id === id ? { ...item, archived: false } : item) });
}
export function deleteAccount(data: FinanceData, id: string): FinanceData {
  const account = requireAccount(data, id, true);
  if (account.openingBalance !== 0 || data.transactions.some((transaction) => accountEffects(transaction).some((effect) => effect.accountId === id))
    || data.subscriptions.some((subscription) => subscription.accountId === id) || data.statements.some((statement) => statement.accountId === id)) throw new Error('An account with history must be archived');
  if (data.accounts.length <= 1) throw new Error('Keep at least one account');
  if (!account.archived && account.kind !== 'legacy'
    && !data.accounts.some((item) => item.id !== id && !item.archived && item.kind !== 'legacy')) throw new Error('Keep at least one active source');
  return commit(data, { accounts: data.accounts.filter((item) => item.id !== id) });
}
export function reconcileAccount(data: FinanceData, id: string, targetBalance: number, date: string, reason: string): FinanceData {
  const account = requireAccount(data, id, true);
  checkPostedDate(date); requireMoney(targetBalance);
  if (!reason.trim()) throw new Error('Describe the balance adjustment');
  const amount = sumMoney([targetBalance, -nativeBalance(data, account, date)]);
  if (amount === 0) return data;
  const transaction = capturedTransaction({ ...data, accounts: data.accounts.map((item) => item.id === id ? { ...item, archived: false } : item) },
    { kind: 'adjustment', accountId: id, title: reason.trim(), systemTitle: 'balance_adjustment', category: 'other', amount, date });
  return commit(data, { transactions: [...data.transactions, transaction] });
}
export function setExchangeRate(data: FinanceData, rate: ExchangeRate): FinanceData {
  checkPostedDate(rate.date);
  const issues: string[] = [];
  if (!validateRate(rate, 'rate', issues)) throw new Error(issues.join('; '));
  return commit(data, { exchangeRates: [...data.exchangeRates.filter((item) => item.currency !== rate.currency || item.date !== rate.date), { ...rate, rate: rate.rate.trim(), source: rate.source.trim() }] });
}
export function previewAccountSetup(data: FinanceData, inputs: AccountInput[], date: string) {
  checkPostedDate(date);
  const missing = new Set<Currency>();
  const oldValues = data.accounts.map((account) => {
    const value = reportingValue(data, nativeBalance(data, account, date), account.currency, date);
    if (value === null) missing.add(account.currency);
    return value;
  });
  const newValues = inputs.map((input) => {
    requireMoney(input.openingBalance);
    const value = reportingValue(data, input.openingBalance, input.currency, date);
    if (value === null) missing.add(input.currency);
    return value;
  });
  const oldTotal = oldValues.every((value) => value !== null) ? sumMoney(oldValues as number[]) : null;
  const newTotal = newValues.every((value) => value !== null) ? sumMoney(newValues as number[]) : null;
  return { oldTotal, newTotal, difference: oldTotal === null || newTotal === null ? null : sumMoney([newTotal, -oldTotal]), missingCurrencies: [...missing] };
}
export function setupAccounts(data: FinanceData, inputs: AccountInput[], date: string): FinanceData {
  if (data.setupComplete) throw new Error('Sources have already been set up');
  if (!inputs.length) throw new Error('Add at least one source');
  if (inputs.some((input) => input.kind === 'legacy')) throw new Error('Choose a real source type');
  const preview = previewAccountSetup(data, inputs, date);
  if (preview.difference === null) throw new Error('Enter setup exchange rates for all balances');
  const nextAccounts = inputs.map((input): Account => ({ ...input, id: input.id ?? legacy.createId('account'), name: input.name.trim(), openingDate: date, archived: false }));
  if (nextAccounts.some((account) => data.accounts.some((existing) => existing.id === account.id))) throw new Error('Setup accounts need new identifiers');
  const closing: Transaction[] = [];
  for (const account of data.accounts) {
    const balance = nativeBalance(data, account, date);
    if (balance !== 0) closing.push(capturedTransaction({ ...data, accounts: data.accounts.map((item) => ({ ...item, archived: false })) },
      { kind: 'adjustment', accountId: account.id, amount: -balance, date, title: 'Setup', systemTitle: 'setup', category: 'other' }));
  }
  return commit(data, { setupComplete: true,
    accounts: [...data.accounts.map((account) => ({ ...account, archived: true })), ...nextAccounts],
    transactions: [...data.transactions, ...closing],
    subscriptions: data.subscriptions.map((subscription) => { const next = { ...subscription }; delete next.accountId; return next; }) });
}
export function saveStatement(data: FinanceData, input: Omit<CardStatement, 'id'> & { id?: string }): FinanceData {
  const account = requireAccount(data, input.accountId);
  if (account.kind !== 'credit_card') throw new Error('A statement belongs to a credit card');
  const statement: CardStatement = { ...input, id: input.id ?? legacy.createId('statement') };
  const existing = data.statements.find((item) => item.id === statement.id);
  if (existing && existing.accountId !== statement.accountId) throw new Error('A statement cannot change cards');
  return commit(data, { statements: existing ? data.statements.map((item) => item.id === statement.id ? statement : item) : [...data.statements, statement] });
}
export function deleteStatement(data: FinanceData, id: string): FinanceData {
  if (!data.statements.some((statement) => statement.id === id)) throw new Error('Statement not found');
  return commit(data, { statements: data.statements.filter((statement) => statement.id !== id),
    transactions: data.transactions.map((transaction) => {
      if (transaction.statementId !== id) return transaction;
      const next = { ...transaction }; delete next.statementId; return next;
    }) });
}
export function deriveStatementStatus(data: FinanceData, statementId: string, reference = new Date()) {
  const statement = data.statements.find((item) => item.id === statementId);
  if (!statement) throw new Error('Statement not found');
  const asOf = dateFor(reference);
  const paid = sumMoney(data.transactions.filter((transaction) => transaction.kind === 'transfer' && transaction.statementId === statementId && transaction.date <= asOf).map((transaction) => transaction.receivedAmount!));
  const remaining = Math.max(0, sumMoney([statement.amount, -paid]));
  const minimumRemaining = Math.max(0, sumMoney([statement.minimumPayment ?? 0, -paid]));
  return { statement, paid, remaining, minimumRemaining, isOverdue: statement.dueDate < asOf && remaining > 0 };
}
export function recordSubscriptionPayment(data: FinanceData, subscriptionId: string, paidOn = dateFor(), options?: PaymentOptions): RecordSubscriptionPaymentResult {
  if (!legacy.isValidDateOnly(paidOn) || paidOn > dateFor()) return { status: 'invalid-date', data };
  const subscription = data.subscriptions.find((item) => item.id === subscriptionId);
  if (!subscription) return { status: 'not-found', data };
  const occurrenceDate = options?.expectedOccurrence ?? subscription.nextRenewal;
  const existing = data.subscriptionPayments.find((payment) => payment.subscriptionId === subscriptionId
    && (payment.occurrenceDate === occurrenceDate || (!options && payment.paidOn === paidOn)));
  if (existing) return { status: 'already-recorded', data, payment: existing };
  if (subscription.status === 'paused') return { status: 'paused', data };
  if (occurrenceDate !== subscription.nextRenewal) return { status: 'stale-occurrence', data };
  const accountId = options?.accountId ?? subscription.accountId;
  const account = data.accounts.find((item) => item.id === accountId && !item.archived && item.kind !== 'legacy');
  if (!account) return { status: 'invalid-account', data };
  if (account.openingDate && paidOn < account.openingDate) return { status: 'invalid-date', data };
  let amount: number;
  let originalAmount: number;
  try {
    originalAmount = majorAmountToMinor(subscription.amount, subscription.currency);
    if (options) amount = options.amount;
    else if (subscription.currency === account.currency) amount = originalAmount;
    else return { status: 'unsupported-currency', data };
    requireMoney(amount, true);
  } catch { return { status: 'invalid-amount', data }; }
  const paymentId = legacy.createId('payment');
  const transaction = capturedTransaction(data, { kind: 'expense', accountId: account.id, title: subscription.name,
    category: legacy.suggestSubscriptionExpenseCategory(subscription.name), amount: -amount, date: paidOn,
    subscriptionPaymentId: paymentId, reportingAmount: options?.reportingAmount,
    originalCurrency: subscription.currency, originalAmount });
  const payment: SubscriptionPayment = { id: paymentId, subscriptionId, occurrenceDate, paidOn, amount,
    transactionId: transaction.id, accountId: account.id, currency: account.currency };
  const next = commit(data, { transactions: [...data.transactions, transaction], subscriptionPayments: [...data.subscriptionPayments, payment],
    subscriptions: data.subscriptions.map((item) => item.id === subscriptionId ? { ...item, nextRenewal: legacy.advanceSubscriptionRenewal(item) } : item) });
  return { status: 'recorded', data: next, payment, transaction };
}
