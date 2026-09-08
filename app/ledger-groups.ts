import { sumMoney } from './money.ts';
import type { Transaction } from './finance-v4.ts';

export type TransactionDay = {
  date: string;
  transactions: Transaction[];
  income: number;
  expense: number;
  unconvertedTransactionCount: number;
  excludedTransactionCount: number;
  refundCount: number;
};

/** Summarize exactly the supplied rows, including an already-filtered ledger. */
export function groupTransactionsByDay(transactions: readonly Transaction[]): TransactionDay[] {
  const byDate = new Map<string, Transaction[]>();
  for (const transaction of transactions) {
    const rows = byDate.get(transaction.date) ?? [];
    rows.push(transaction);
    byDate.set(transaction.date, rows);
  }

  return [...byDate.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([date, rows]) => {
    const income: number[] = [];
    const expense: number[] = [];
    let unconvertedTransactionCount = 0;
    let excludedTransactionCount = 0;
    let refundCount = 0;
    for (const transaction of rows) {
      if (transaction.kind === 'transfer' || transaction.kind === 'adjustment') {
        excludedTransactionCount += 1;
        continue;
      }
      if (transaction.kind === 'refund') refundCount += 1;
      if (transaction.reportingAmount === undefined) {
        unconvertedTransactionCount += 1;
        continue;
      }
      if (transaction.kind === 'income') income.push(transaction.reportingAmount);
      else expense.push(-transaction.reportingAmount);
    }
    return {
      date, transactions: rows, income: sumMoney(income), expense: sumMoney(expense),
      unconvertedTransactionCount, excludedTransactionCount, refundCount,
    };
  });
}
