'use client';

import { ArrowBendUpLeft, ArrowsLeftRight, MagnifyingGlass, PencilSimple, Plus, Receipt, Trash, Wallet, WarningCircle } from '@phosphor-icons/react';
import { useRef, useState, type FormEvent } from 'react';
import { CategoryIcon } from './category-icons';
import { CategoryPicker, expenseCategoryIcon, expenseCategoryLabel } from './category-picker';
import { SheetFrame, focusFirstInvalid } from './finance-dialog';
import { accountDisplayName } from './accounts-ui';
import { useI18n, type Locale } from './i18n';
import {
  CURRENCIES, convertToVnd, formatMoney, formatMoneyAmount, latestExchangeRate, majorAmountToMinor, parseMoneyInput,
  type Account, type Currency, type CustomExpenseCategory, type ExpenseCategoryId, type FinanceData, type Subscription, type Transaction,
} from './finance-v4';
import './ledger.css';

const copy = {
  en: {
    source: 'Payment account', receive: 'Receive into', choose: 'Choose an account', accounts: 'Manage accounts',
    refund: 'Refund', refundTitle: 'Record a refund', refundHelp: 'Returns reduce spending in the original category on the date received.',
    transfer: 'Transfer', adjustment: 'Balance adjustment', setup: 'Account setup', fee: 'Transfer fee', allSources: 'All accounts', sourceFilter: 'Filter by account',
    missingSource: 'Add an account to record this transaction.', chooseSource: 'Choose an active account.',
    converted: 'Value for reports (VND)', conversionHelp: 'Saved with this transaction. Later exchange-rate changes will not alter it.',
    noConversion: 'If blank, Tally uses a saved rate on or before this date when available. Otherwise reports mark the amount as unconverted.',
    invalidConversion: 'Enter a positive whole amount in VND, or leave it blank.',
    invalidAmount: 'Enter a positive amount with the correct decimal places.', saving: 'Saving…',
    unconverted: 'Not converted', scheduled: 'Future dated', archived: 'Archived',
    refundAction: 'Refund this purchase', failed: 'Could not save. Check the details and try again.',
    original: 'Original merchant amount (optional)', originalHelp: 'Keep the foreign price for reference. The amount above is what the account was actually charged.',
    originalCurrency: 'Merchant currency', originalAmount: 'Merchant amount',
    paymentTitle: 'Record payment', paymentHelp: 'Choose the account and the amount actually charged. Recording a card payment here increases its debt.',
    invoice: 'Subscription price', occurrence: 'Renewal being recorded', actual: 'Amount charged to account',
    paymentDate: 'Payment date', record: 'Record payment', sourceBalance: 'Account currency',
    interestHelp: 'For card interest or bank fees, record an expense using the relevant category.',
    startHelp: 'Transactions before an account’s opening date need a balance review in Accounts.',
  },
  vi: {
    source: 'Thanh toán bằng', receive: 'Nhận vào', choose: 'Chọn nguồn tiền', accounts: 'Quản lý nguồn tiền',
    refund: 'Hoàn tiền', refundTitle: 'Ghi nhận hoàn tiền', refundHelp: 'Hoàn tiền giảm chi tiêu ở danh mục gốc vào ngày bạn nhận lại tiền.',
    transfer: 'Chuyển tiền', adjustment: 'Điều chỉnh số dư', setup: 'Thiết lập nguồn tiền', fee: 'Phí chuyển tiền', allSources: 'Tất cả nguồn tiền', sourceFilter: 'Lọc theo nguồn tiền',
    missingSource: 'Thêm nguồn tiền để ghi nhận giao dịch này.', chooseSource: 'Chọn một nguồn tiền đang sử dụng.',
    converted: 'Giá trị dùng cho báo cáo (VND)', conversionHelp: 'Lưu cùng giao dịch. Thay đổi tỷ giá sau này không làm thay đổi số này.',
    noConversion: 'Nếu để trống, Tally dùng tỷ giá đã lưu tại hoặc trước ngày này nếu có. Nếu chưa có tỷ giá, báo cáo ghi rõ phần chưa quy đổi.',
    invalidConversion: 'Nhập số tiền VND nguyên dương hoặc để trống.',
    invalidAmount: 'Nhập số tiền dương với số chữ số thập phân phù hợp.', saving: 'Đang lưu…',
    unconverted: 'Chưa quy đổi', scheduled: 'Ngày trong tương lai', archived: 'Đã lưu trữ',
    refundAction: 'Hoàn tiền khoản mua này', failed: 'Chưa lưu được. Kiểm tra thông tin rồi thử lại.',
    original: 'Giá gốc của người bán (tùy chọn)', originalHelp: 'Giữ giá ngoại tệ để tham chiếu. Số tiền phía trên là số thực tế bị trừ ở nguồn thanh toán.',
    originalCurrency: 'Tiền tệ của người bán', originalAmount: 'Số tiền gốc',
    paymentTitle: 'Ghi nhận thanh toán', paymentHelp: 'Chọn nguồn và số thực tế bị trừ. Thanh toán bằng thẻ tín dụng ở đây sẽ làm tăng dư nợ.',
    invoice: 'Giá gói đăng ký', occurrence: 'Kỳ gia hạn đang ghi nhận', actual: 'Số tiền thực tế bị trừ',
    paymentDate: 'Ngày thanh toán', record: 'Ghi nhận thanh toán', sourceBalance: 'Tiền tệ của nguồn',
    interestHelp: 'Lãi thẻ và phí ngân hàng được ghi là khoản chi với danh mục phù hợp.',
    startHelp: 'Giao dịch trước ngày bắt đầu của nguồn cần đối chiếu số dư trong phần Nguồn tiền.',
  },
};

export const ledgerCopy = (locale: Locale) => copy[locale];
export function nativeMoney(amount: number, currency: Currency, localeTag: string) {
  return formatMoney(amount, currency, localeTag);
}
function selectableAccounts(data: FinanceData, existingId?: string) {
  return data.accounts.filter((account) => (!account.archived && account.kind !== 'legacy') || account.id === existingId);
}
function suggestedReporting(data: FinanceData, raw: string, currency: Currency, date: string) {
  const amount = parseMoneyInput(raw, currency);
  const rate = latestExchangeRate(data, currency, date);
  if (amount === null || !rate) return '';
  try { return String(Math.abs(convertToVnd(amount, currency, rate.rate))); } catch { return ''; }
}

export type LedgerDraft = {
  kind: 'income' | 'expense' | 'refund'; title: string; accountId: string; amount: number;
  category: ExpenseCategoryId; date: string; reportingAmount?: number;
  customCategory?: CustomExpenseCategory; refundOfId?: string; originalCurrency?: Currency; originalAmount?: number;
};

export function TransactionSheet({ data, initial, initialAccountId, refundOf, today, onClose, onSave, onManageAccounts }: {
  data: FinanceData; initial?: Transaction; initialAccountId?: string; refundOf?: Transaction; today: string;
  onClose: () => void; onSave: (input: LedgerDraft, existing?: Transaction) => Promise<unknown>; onManageAccounts: () => void;
}) {
  const { c, locale, localeTag } = useI18n();
  const l = copy[locale];
  const sourceId = initial?.accountId ?? refundOf?.accountId ?? initialAccountId;
  const accounts = selectableAccounts(data, initial?.accountId);
  const [accountId, setAccountId] = useState(accounts.find((item) => item.id === sourceId)?.id ?? accounts[0]?.id ?? '');
  const account = data.accounts.find((item) => item.id === accountId);
  const currency = account?.currency ?? 'VND';
  const [kind, setKind] = useState<LedgerDraft['kind']>(refundOf ? 'refund' : initial?.kind === 'income' || initial?.kind === 'refund' ? initial.kind : 'expense');
  const initialTitle = initial?.titleKey ? c.demo.transactions[initial.titleKey] : initial?.title;
  const refundTitle = refundOf?.titleKey ? c.demo.transactions[refundOf.titleKey] : refundOf?.title;
  const [title, setTitle] = useState(initialTitle ?? (refundTitle ? `${l.refund}: ${refundTitle}` : ''));
  const [amount, setAmount] = useState(initial ? formatMoneyAmount(Math.abs(initial.amount), currency) : '');
  const [date, setDate] = useState(initial?.date ?? today);
  const [category, setCategory] = useState<ExpenseCategoryId>(initial?.category !== 'income' && initial?.category ? initial.category : refundOf?.category !== 'income' && refundOf?.category ? refundOf.category : 'dining');
  const [customCategory, setCustomCategory] = useState<CustomExpenseCategory>();
  const [reporting, setReporting] = useState(initial?.reportingAmount === undefined ? '' : String(Math.abs(initial.reportingAmount)));
  const [merchantCurrency, setMerchantCurrency] = useState<Currency>(initial?.originalCurrency ?? 'USD');
  const [merchantAmount, setMerchantAmount] = useState(initial?.originalAmount === undefined ? '' : formatMoneyAmount(initial.originalAmount, initial.originalCurrency ?? 'USD'));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  function changeAmount(value: string) {
    setAmount(value);
    if (currency !== 'VND') setReporting(suggestedReporting(data, value, currency, date));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const parsed = parseMoneyInput(amount, currency);
    const converted = reporting.trim() ? parseMoneyInput(reporting, 'VND') : undefined;
    const merchant = merchantAmount.trim() ? parseMoneyInput(merchantAmount, merchantCurrency) : undefined;
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = c.validation.transactionName;
    if (!account || (account.archived && account.id !== initial?.accountId)) next.account = l.chooseSource;
    if (parsed === null || parsed <= 0) next.amount = l.invalidAmount;
    if (!date || date > today) next.date = c.validation.transactionFuture;
    else if (account?.openingDate && date < account.openingDate) next.date = l.startHelp;
    if (currency !== 'VND' && converted !== undefined && (converted === null || converted <= 0)) next.reporting = l.invalidConversion;
    if (merchant !== undefined && (merchant === null || merchant <= 0)) next.merchant = l.invalidAmount;
    setErrors(next);
    if (Object.keys(next).length) { focusFirstInvalid(formRef.current); return; }
    setBusy(true);
    try {
      await onSave({ kind, title: title.trim(), accountId, amount: parsed!, category, date,
        reportingAmount: currency === 'VND' ? parsed! : converted ?? undefined,
        customCategory: kind === 'income' ? undefined : customCategory,
        refundOfId: refundOf?.id ?? initial?.refundOfId,
        originalCurrency: merchant === undefined ? undefined : merchantCurrency, originalAmount: merchant ?? undefined,
      }, initial);
      onClose();
    } catch (error) { setErrors({ form: error instanceof Error ? error.message : l.failed }); }
    finally { setBusy(false); }
  }
  return (
    <SheetFrame title={refundOf ? l.refundTitle : initial ? c.transactionForm.editTitle : c.transactionForm.title} subtitle={kind === 'refund' ? l.refundHelp : c.transactionForm.subtitle} labelledBy="ledger-sheet-title" onClose={onClose} busy={busy}>
      {accounts.length === 0 ? <div className="empty-state"><Wallet size={28} /><strong>{l.missingSource}</strong><button type="button" onClick={onManageAccounts}>{l.accounts}</button></div> :
        <form ref={formRef} onSubmit={submit} noValidate>
          <fieldset disabled={busy} className="ledger-fields">
            <div className="type-switch" role="group" aria-label={c.transactionForm.typeAria}>{(['expense', 'income', 'refund'] as const).map((value) => <button key={value} type="button" disabled={Boolean(initial?.subscriptionPaymentId) && value !== 'expense'} className={kind === value ? 'is-active' : ''} aria-pressed={kind === value} onClick={() => setKind(value)}>{value === 'refund' ? l.refund : c.transactionForm.type[value]}</button>)}</div>
            <label className="field"><span>{kind === 'expense' ? l.source : l.receive}</span><select value={accountId} onChange={(event) => { setAccountId(event.target.value); setAmount(''); setReporting(''); }} aria-invalid={Boolean(errors.account)}><option value="" disabled>{l.choose}</option>{accounts.map((item) => <option key={item.id} value={item.id} disabled={item.archived}>{accountDisplayName(item, locale)} · {item.currency}{item.archived ? ` · ${l.archived}` : ''}</option>)}</select>{errors.account && <small className="field-error" role="alert">{errors.account}</small>}</label>
            <label className="field"><span>{c.transactionForm.name}</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder={c.transactionForm.namePlaceholder} aria-invalid={Boolean(errors.title)} />{errors.title && <small className="field-error" role="alert">{errors.title}</small>}</label>
            <label className="field"><span>{c.transactionForm.amount}</span><div className="money-input"><input inputMode={['VND', 'JPY', 'KRW'].includes(currency) ? 'numeric' : 'decimal'} value={amount} onChange={(event) => changeAmount(event.target.value.replace(',', '.'))} placeholder="0" aria-invalid={Boolean(errors.amount)} /><strong>{currency}</strong></div>{errors.amount && <small className="field-error" role="alert">{errors.amount}</small>}</label>
            {kind !== 'income' && <CategoryPicker label={c.transactionForm.category} value={category} customCategories={customCategory ? [...data.customCategories, customCategory] : data.customCategories} onChange={(value, created) => { setCategory(value); setCustomCategory(created); }} />}
            <label className="field"><span>{c.transactionForm.date}</span><input type="date" value={date} max={today} min={account?.openingDate ?? undefined} onChange={(event) => { setDate(event.target.value); if (!initial && currency !== 'VND') setReporting(suggestedReporting(data, amount, currency, event.target.value)); }} aria-invalid={Boolean(errors.date)} />{errors.date && <small className="field-error" role="alert">{errors.date}</small>}</label>
            {currency !== 'VND' && <label className="field"><span>{l.converted}</span><div className="money-input"><input inputMode="numeric" value={reporting} onChange={(event) => setReporting(event.target.value)} placeholder="0" aria-invalid={Boolean(errors.reporting)} /><strong>VND</strong></div><small className="field-help">{l.conversionHelp} {l.noConversion}</small>{errors.reporting && <small className="field-error" role="alert">{errors.reporting}</small>}</label>}
            <details className="merchant-details" open={initial?.originalAmount !== undefined || undefined}><summary>{l.original}</summary><p className="field-help">{l.originalHelp}</p><div className="split-fields"><label className="field"><span>{l.originalCurrency}</span><select value={merchantCurrency} onChange={(event) => setMerchantCurrency(event.target.value as Currency)}>{CURRENCIES.map((code) => <option key={code}>{code}</option>)}</select></label><label className="field"><span>{l.originalAmount}</span><input inputMode="decimal" value={merchantAmount} onChange={(event) => setMerchantAmount(event.target.value.replace(',', '.'))} aria-invalid={Boolean(errors.merchant)} />{errors.merchant && <small className="field-error" role="alert">{errors.merchant}</small>}</label></div></details>
            {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
            <div className="sheet-actions"><button type="button" className="cancel-action" onClick={onClose}>{c.common.cancel}</button><button type="submit" className="primary-action">{busy ? l.saving : initial ? c.transactionForm.update : c.transactionForm.save}</button></div>
          </fieldset>
          {account && <span className="sr-only">{l.sourceBalance}: {nativeMoney(0, currency, localeTag)}</span>}
        </form>}
    </SheetFrame>
  );
}

export function TransactionList({ data, transactions, compact = false, onDelete, onEdit, onRefund }: {
  data: FinanceData; transactions: Transaction[]; compact?: boolean;
  onDelete?: (id: string) => void; onEdit?: (item: Transaction) => void; onRefund?: (item: Transaction) => void;
}) {
  const { c, locale, localeTag, formatDate, t } = useI18n();
  const l = copy[locale];
  if (!transactions.length) return <div className="empty-state"><Receipt size={28} aria-hidden="true" /><strong>{c.transactions.emptyTitle}</strong><span>{c.transactions.emptyBody}</span></div>;
  return <div className={`transaction-list ledger-list ${compact ? 'is-compact' : ''}`}>{transactions.map((transaction) => {
    const account = data.accounts.find((item) => item.id === transaction.accountId)!;
    const target = transaction.toAccountId ? data.accounts.find((item) => item.id === transaction.toAccountId) : undefined;
    const title = transaction.titleKey ? c.demo.transactions[transaction.titleKey] : transaction.systemTitle === 'setup' ? l.setup : transaction.systemTitle === 'transfer_fee' ? l.fee : transaction.title;
    const typeLabel = transaction.kind === 'transfer' ? l.transfer : transaction.kind === 'adjustment' ? l.adjustment : transaction.kind === 'refund' ? l.refund : transaction.category === 'income' ? c.categories.income : expenseCategoryLabel(c, transaction.category, data.customCategories);
    const categoryIcon = transaction.category === 'income' ? undefined : expenseCategoryIcon(transaction.category, data.customCategories);
    const native = nativeMoney(transaction.amount, account.currency, localeTag);
    return <article className={`transaction-row ledger-row kind-${transaction.kind}`} key={transaction.id}>
      <span className={`transaction-icon ${transaction.kind === 'income' ? 'is-income' : ''}`}>{transaction.kind === 'transfer' ? <ArrowsLeftRight size={19} weight="bold" /> : transaction.kind === 'refund' ? <ArrowBendUpLeft size={19} weight="bold" /> : categoryIcon ? <CategoryIcon icon={categoryIcon} size={19} weight="fill" /> : <Wallet size={19} weight="fill" />}</span>
      <span className="transaction-copy"><strong>{title}</strong><small>{typeLabel} · {accountDisplayName(account, locale)}{target ? ` → ${accountDisplayName(target, locale)}` : ''}</small>{transaction.originalCurrency && transaction.originalAmount !== undefined && <small>{nativeMoney(transaction.originalAmount, transaction.originalCurrency, localeTag)}</small>}</span>
      <time dateTime={transaction.date}>{formatDate(transaction.date)}</time>
      <span className="ledger-row-amount"><strong className={`transaction-amount ${transaction.kind === 'income' || transaction.kind === 'refund' ? 'is-positive' : ''}`} title={native}>{transaction.amount > 0 ? '+' : ''}{native}</strong>{target && <small>→ {nativeMoney(transaction.receivedAmount!, target.currency, localeTag)}</small>}{account.currency !== 'VND' && !target && <small>{transaction.reportingAmount === undefined ? l.unconverted : `≈ ${nativeMoney(transaction.reportingAmount, 'VND', localeTag)}`}</small>}</span>
      {(onEdit || onDelete || onRefund) && <div className="row-actions">{onRefund && transaction.kind === 'expense' && <button className="row-action" type="button" onClick={() => onRefund(transaction)} aria-label={`${l.refundAction}: ${title}`} title={l.refundAction}><ArrowBendUpLeft size={18} /></button>}{onEdit && transaction.kind !== 'adjustment' && <button className="row-action" type="button" onClick={() => onEdit(transaction)} aria-label={t('transactions.editAria', { title })}><PencilSimple size={18} /></button>}{onDelete && <button className="row-action" type="button" onClick={() => onDelete(transaction.id)} aria-label={t('transactions.deleteAria', { title })}><Trash size={18} /></button>}</div>}
    </article>;
  })}</div>;
}

export function TransactionsView({ data, transactions, onDelete, onEdit, onRefund, onAdd, onTransfer }: {
  data: FinanceData; transactions: Transaction[]; onDelete: (id: string) => void; onEdit: (item: Transaction) => void;
  onRefund: (item: Transaction) => void; onAdd: () => void; onTransfer: () => void;
}) {
  const { c, locale } = useI18n();
  const l = copy[locale];
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [accountId, setAccountId] = useState('all');
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
  const filtered = transactions.filter((item) => {
    const source = data.accounts.find((account) => account.id === item.accountId);
    const target = data.accounts.find((account) => account.id === item.toAccountId);
    const title = item.titleKey ? c.demo.transactions[item.titleKey] : item.title;
    return (accountId === 'all' || item.accountId === accountId || item.toAccountId === accountId)
      && (filter === 'all' || item.kind === filter)
      && normalize(`${title} ${source?.name ?? ''} ${target?.name ?? ''} ${item.category === 'income' ? c.categories.income : expenseCategoryLabel(c, item.category, data.customCategories)}`).includes(normalize(query.trim()));
  });
  return <section className="full-view surface-raised"><div className="view-toolbar ledger-toolbar">
    <label className="search-field"><span className="sr-only">{c.transactions.search}</span><MagnifyingGlass size={19} weight="bold" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.transactions.search} /></label>
    <label className="ledger-account-filter"><span className="sr-only">{l.sourceFilter}</span><select value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="all">{l.allSources}</option>{data.accounts.map((account) => <option key={account.id} value={account.id}>{accountDisplayName(account, locale)}{account.archived ? ` · ${l.archived}` : ''}</option>)}</select></label>
    <div className="filter-group" role="group" aria-label={c.transactions.filterAria}>{(['all', 'income', 'expense', 'transfer', 'refund'] as const).map((item) => <button type="button" key={item} className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)} aria-pressed={filter === item}>{item === 'transfer' ? l.transfer : item === 'refund' ? l.refund : c.transactions.filter[item]}</button>)}</div>
    <div className="ledger-toolbar-actions"><button className="secondary-action" type="button" onClick={onTransfer}><ArrowsLeftRight size={18} weight="bold" />{l.transfer}</button><button className="secondary-action" type="button" onClick={onAdd}><Plus size={18} weight="bold" />{c.actions.add}</button></div>
  </div>{filtered.length ? <TransactionList data={data} transactions={filtered} onDelete={onDelete} onEdit={onEdit} onRefund={onRefund} /> : <div className="empty-state"><MagnifyingGlass size={28} /><strong>{transactions.length ? c.transactions.noResultsTitle : c.transactions.emptyTitle}</strong><span>{transactions.length ? c.transactions.noResultsBody : c.transactions.emptyBody}</span><button type="button" onClick={onAdd}>{c.actions.addTransaction}</button></div>}</section>;
}

export type PaymentDraft = { accountId: string; amount: number; reportingAmount?: number; paidOn: string; expectedOccurrence: string };

export function PaymentSheet({ data, subscription, today, onClose, onSave, onManageAccounts }: {
  data: FinanceData; subscription: Subscription; today: string; onClose: () => void;
  onSave: (input: PaymentDraft) => Promise<unknown>; onManageAccounts: () => void;
}) {
  const { c, locale, localeTag, formatDate } = useI18n();
  const l = copy[locale];
  const accounts = selectableAccounts(data);
  const defaultAccount = accounts.find((account) => account.id === subscription.accountId) ?? accounts.find((account) => account.currency === subscription.currency) ?? accounts[0];
  const [accountId, setAccountId] = useState(defaultAccount?.id ?? '');
  const account: Account | undefined = data.accounts.find((item) => item.id === accountId);
  const currency = account?.currency ?? 'VND';
  const [amount, setAmount] = useState(currency === subscription.currency ? String(subscription.amount) : '');
  const [reporting, setReporting] = useState('');
  const [date, setDate] = useState(today);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [occurrence] = useState(subscription.nextRenewal);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const minor = parseMoneyInput(amount, currency);
    const value = reporting.trim() ? parseMoneyInput(reporting, 'VND') : undefined;
    if (!account || account.archived) { setError(l.chooseSource); return; }
    if (minor === null || minor <= 0) { setError(l.invalidAmount); return; }
    if (date > today || !date || (account.openingDate && date < account.openingDate)) { setError(l.startHelp); return; }
    if (value !== undefined && (value === null || value <= 0)) { setError(l.invalidConversion); return; }
    setBusy(true); setError('');
    try { await onSave({ accountId, amount: minor, reportingAmount: value ?? undefined, paidOn: date, expectedOccurrence: occurrence }); onClose(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : l.failed); }
    finally { setBusy(false); }
  }
  return <SheetFrame title={l.paymentTitle} subtitle={l.paymentHelp} labelledBy="payment-sheet-title" onClose={onClose} busy={busy}>
    <div className="payment-invoice"><strong>{subscription.name}</strong><span>{l.invoice}: {nativeMoney(majorAmountToMinor(subscription.amount, subscription.currency), subscription.currency, localeTag)}</span><span>{l.occurrence}: {formatDate(occurrence)}</span></div>
    {!accounts.length ? <div className="empty-state"><strong>{l.missingSource}</strong><button type="button" onClick={onManageAccounts}>{l.accounts}</button></div> : <form onSubmit={submit} noValidate><fieldset className="ledger-fields" disabled={busy}>
      <label className="field"><span>{l.source}</span><select autoFocus value={accountId} onChange={(event) => { const selected = accounts.find((item) => item.id === event.target.value); setAccountId(event.target.value); setAmount(selected?.currency === subscription.currency ? String(subscription.amount) : ''); setReporting(''); }}>{accounts.map((item) => <option key={item.id} value={item.id}>{accountDisplayName(item, locale)} · {item.currency}</option>)}</select></label>
      <label className="field"><span>{l.actual}</span><div className="money-input"><input inputMode="decimal" value={amount} onChange={(event) => { const value = event.target.value.replace(',', '.'); setAmount(value); if (currency !== 'VND') setReporting(suggestedReporting(data, value, currency, date)); }} placeholder="0" /><strong>{currency}</strong></div></label>
      <label className="field"><span>{l.paymentDate}</span><input type="date" value={date} max={today} min={account?.openingDate ?? undefined} onChange={(event) => setDate(event.target.value)} /></label>
      {currency !== 'VND' && <label className="field"><span>{l.converted}</span><input inputMode="numeric" value={reporting} onChange={(event) => setReporting(event.target.value)} /><small className="field-help">{l.conversionHelp} {l.noConversion}</small></label>}
      {error && <p className="field-error" role="alert"><WarningCircle size={18} /> {error}</p>}
      <div className="sheet-actions"><button type="button" className="cancel-action" onClick={onClose}>{c.common.cancel}</button><button type="submit" className="primary-action">{busy ? l.saving : l.record}</button></div>
    </fieldset></form>}
  </SheetFrame>;
}
