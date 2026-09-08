import { addDaysDateOnly, sumMoney, type FinanceData, type Transaction } from './finance-v4.ts';

export type DailyFlowMode = 'spending' | 'liquid';
export type DailyFlowPoint = {
  date: string;
  income: number;
  expense: number;
  refunds: number;
  adjustments: number;
  transactionCount: number;
  unconvertedTransactionCount: number;
  isFuture: boolean;
};

/** Thirty-one calendar dates centered on today, using recorded reporting values only. */
export function deriveDailyFlowWindow(data: FinanceData, today: string, mode: DailyFlowMode = 'spending'): DailyFlowPoint[] {
  const byDate = new Map<string, Transaction[]>();
  for (const transaction of data.transactions) {
    const entries = byDate.get(transaction.date) ?? [];
    entries.push(transaction);
    byDate.set(transaction.date, entries);
  }
  const accounts = new Map(data.accounts.map((account) => [account.id, account]));

  return Array.from({ length: 31 }, (_, index) => {
    const date = addDaysDateOnly(today, index - 15);
    const income: number[] = [], expense: number[] = [], refunds: number[] = [], adjustments: number[] = [];
    let transactionCount = 0;
    let unconvertedTransactionCount = 0;

    for (const transaction of byDate.get(date) ?? []) {
      if (mode === 'spending') {
        if (transaction.kind !== 'income' && transaction.kind !== 'expense' && transaction.kind !== 'refund') continue;
        transactionCount += 1;
        if (transaction.reportingAmount === undefined) {
          unconvertedTransactionCount += 1;
          continue;
        }
        if (transaction.kind === 'income') income.push(transaction.reportingAmount);
        else if (transaction.kind === 'expense') expense.push(Math.abs(transaction.reportingAmount));
        else refunds.push(transaction.reportingAmount);
        continue;
      }

      // Setup moves opening balances; it is not money entering or leaving an account.
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
      transactionCount += 1;
      if (effect === undefined) {
        unconvertedTransactionCount += 1;
        continue;
      }
      if (transaction.kind === 'adjustment') adjustments.push(effect);
      // Cash refunds are incoming money in this mode, not a deduction from money out.
      else if (effect >= 0) income.push(effect);
      else expense.push(-effect);
    }

    return {
      date, income: sumMoney(income), expense: sumMoney(expense), refunds: sumMoney(refunds),
      adjustments: sumMoney(adjustments), transactionCount, unconvertedTransactionCount,
      isFuture: index > 15,
    };
  });
}
