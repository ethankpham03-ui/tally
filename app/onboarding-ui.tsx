'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Bank, Check, CreditCard, DeviceMobile, DownloadSimple, Plus, ShieldCheck, Trash, Wallet } from '@phosphor-icons/react';
import { useI18n } from './i18n';
import { financeError } from './finance-errors';
import { CURRENCIES, CURRENCY_DECIMALS, formatMoney, parseMoneyInput, type Currency } from './money';
import { createId, isValidDateOnly, localTodayIso } from './finance-domain';
import type { AccountInput } from './finance-v4';
import './onboarding.css';

const en = {
  welcome: 'Welcome', sources: 'Your accounts', welcomeTitle: 'A clear picture of your money starts here.',
  welcomeBody: 'Keep cash, bank accounts and card debt in their own place. Start with what you have today, then follow every change.',
  start: 'Set up my accounts', skip: 'Set up later', skipHelp: 'Start with one cash account at 0 VND. You can add accounts and adjust balances later.',
  import: 'Restore a backup', privacy: 'Your records stay in this browser on this device. Export a backup to keep a copy.',
  picture: 'See where your money stands', cashAndBank: 'Cash, banks & wallets', cashAndBankHelp: 'A separate balance for each source.',
  cardTitle: 'Credit cards', cardHelp: 'Debt stays separate from the money you have.',
  setupTitle: 'Where is your money today?', setupBody: 'Add the accounts you want to track and their starting balances. You can add more at any time.',
  date: 'Start date', dateHelp: 'Use the balance before any transactions you will record from this date. Starting balances are not income or spending.',
  back: 'Back', name: 'Account name', namePlaceholder: 'Name you will recognize', kind: 'Account type', currency: 'Currency',
  cash: 'Cash', bank: 'Bank account', ewallet: 'E-wallet', credit_card: 'Credit card', account: 'Account',
  balance: 'Starting balance', owing: 'Amount owed', cardPosition: 'Card position', cardOwing: 'I owe the card', cardCredit: 'The card has a credit balance',
  creditBalance: 'Credit balance', limit: 'Credit limit (optional)', limitHelp: 'A credit limit is not money you own.',
  moneyHelp: 'No thousands separators; use a dot for decimals.', bankHelp: 'Use a minus sign if your bank balance is negative.',
  add: 'Add another account', remove: 'Remove account', save: 'Start using Tally', saving: 'Saving…',
  invalidName: 'Give this account a name (up to 60 characters).', invalidAmount: 'Enter a valid amount without thousands separators.',
  nonnegative: 'Enter zero or a positive amount.', decimals: 'This currency does not use decimal places.',
  twoDecimals: 'Use no more than two decimal places.', invalidDate: 'Choose a valid date no later than today.',
  fixErrors: 'Check the highlighted fields before continuing.', preview: 'Your starting point', previewHelp: 'These are the balances you entered.',
  cashGroup: 'Cash & accounts', debtGroup: 'Credit cards', noName: 'Unnamed account', debt: 'Owed', credit: 'Credit',
  foreignHelp: 'Foreign balances stay in their own currency. Add manual exchange rates later in Accounts to see a VND estimate.',
  saveHelp: 'Your accounts are saved when you finish.', progress: 'Setup progress',
};
type Copy = { [K in keyof typeof en]: string };
const vi: Copy = {
  welcome: 'Chào mừng', sources: 'Nguồn tiền', welcomeTitle: 'Hiểu rõ tiền của bạn, từ hôm nay.',
  welcomeBody: 'Theo dõi riêng tiền mặt, tài khoản ngân hàng và dư nợ thẻ. Bắt đầu với số dư thực tế, rồi ghi lại từng thay đổi.',
  start: 'Thiết lập nguồn tiền', skip: 'Thiết lập sau', skipHelp: 'Bắt đầu với một nguồn Tiền mặt có số dư 0 VND. Bạn có thể thêm nguồn và điều chỉnh số dư sau.',
  import: 'Khôi phục bản sao lưu', privacy: 'Dữ liệu được lưu trong trình duyệt trên thiết bị này. Hãy xuất bản sao lưu để giữ một bản riêng.',
  picture: 'Biết tiền ở đâu, nợ bao nhiêu', cashAndBank: 'Tiền mặt, ngân hàng & ví', cashAndBankHelp: 'Mỗi nguồn tiền có số dư riêng.',
  cardTitle: 'Thẻ tín dụng', cardHelp: 'Dư nợ được theo dõi riêng với tiền bạn đang có.',
  setupTitle: 'Tiền của bạn đang ở đâu?', setupBody: 'Thêm các nguồn bạn muốn theo dõi và số dư mở đầu. Bạn có thể thêm nguồn khác bất cứ lúc nào.',
  date: 'Ngày bắt đầu', dateHelp: 'Nhập số dư trước các giao dịch bạn sẽ ghi từ ngày này. Số dư mở đầu không được tính là thu nhập hay chi tiêu.',
  back: 'Quay lại', name: 'Tên nguồn tiền', namePlaceholder: 'Tên dễ nhận biết', kind: 'Loại nguồn', currency: 'Tiền tệ',
  cash: 'Tiền mặt', bank: 'Tài khoản ngân hàng', ewallet: 'Ví điện tử', credit_card: 'Thẻ tín dụng', account: 'Nguồn tiền',
  balance: 'Số dư mở đầu', owing: 'Dư nợ hiện tại', cardPosition: 'Tình trạng thẻ', cardOwing: 'Tôi đang nợ thẻ', cardCredit: 'Thẻ đang có số dư có',
  creditBalance: 'Số dư có', limit: 'Hạn mức thẻ (tùy chọn)', limitHelp: 'Hạn mức thẻ không phải tiền bạn đang có.',
  moneyHelp: 'Không dùng dấu phân nhóm; dùng dấu chấm cho phần thập phân.', bankHelp: 'Dùng dấu trừ nếu số dư ngân hàng đang âm.',
  add: 'Thêm nguồn khác', remove: 'Bỏ nguồn tiền', save: 'Bắt đầu dùng Tally', saving: 'Đang lưu…',
  invalidName: 'Đặt tên cho nguồn tiền (tối đa 60 ký tự).', invalidAmount: 'Nhập số tiền hợp lệ, không có dấu phân nhóm.',
  nonnegative: 'Nhập số 0 hoặc số tiền dương.', decimals: 'Tiền tệ này không dùng phần thập phân.',
  twoDecimals: 'Dùng tối đa hai chữ số thập phân.', invalidDate: 'Chọn ngày hợp lệ không sau hôm nay.',
  fixErrors: 'Kiểm tra các ô được đánh dấu trước khi tiếp tục.', preview: 'Điểm bắt đầu của bạn', previewHelp: 'Số dư từ các nguồn bạn vừa nhập.',
  cashGroup: 'Tiền mặt & tài khoản', debtGroup: 'Thẻ tín dụng', noName: 'Nguồn chưa đặt tên', debt: 'Đang nợ', credit: 'Số dư có',
  foreignHelp: 'Số dư ngoại tệ được giữ theo tiền gốc. Thêm tỷ giá thủ công trong Nguồn tiền sau để xem giá trị ước tính bằng VND.',
  saveHelp: 'Các nguồn tiền được lưu khi bạn hoàn tất.', progress: 'Tiến độ thiết lập',
};

type SourceKind = Exclude<AccountInput['kind'], 'legacy'>;
type Draft = { id: string; name: string; defaultName: boolean; kind: SourceKind; currency: Currency; balance: string; cardCredit: boolean; limit: string };
function newDraft(first = false): Draft {
  return { id: createId('source'), name: '', defaultName: first, kind: first ? 'cash' : 'bank', currency: 'VND', balance: '0', cardCredit: false, limit: '' };
}
function SourceIcon({ kind, size = 22 }: { kind: SourceKind; size?: number }) {
  const Icon = kind === 'credit_card' ? CreditCard : kind === 'bank' ? Bank : kind === 'ewallet' ? DeviceMobile : Wallet;
  return <Icon size={size} weight="bold" aria-hidden="true" />;
}

export type OnboardingFlowProps = {
  onComplete: (inputs: AccountInput[], date: string) => Promise<unknown>;
  onSkip: () => Promise<unknown>;
  onImport: () => void;
};

export function OnboardingFlow({ onComplete, onSkip, onImport }: OnboardingFlowProps) {
  const { locale } = useI18n();
  const c = locale === 'vi' ? vi : en;
  const id = useId();
  const [step, setStep] = useState<'welcome' | 'sources'>('welcome');
  const [rows, setRows] = useState<Draft[]>(() => [newDraft(true)]);
  const [date, setDate] = useState(localTodayIso);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const hasChangedStep = useRef(false);
  const pendingFocusRef = useRef<string | null>(null);
  const nameFor = (row: Draft) => row.defaultName ? c[row.kind] : row.name;
  const hasForeign = rows.some((row) => row.currency !== 'VND');

  useEffect(() => {
    if (hasChangedStep.current) headingRef.current?.focus();
    hasChangedStep.current = true;
  }, [step]);
  useEffect(() => {
    if (pendingFocusRef.current) {
      const input = formRef.current?.elements.namedItem(pendingFocusRef.current);
      if (input instanceof HTMLElement) input.focus();
      pendingFocusRef.current = null;
    }
  }, [rows]);

  const updateRow = (rowId: string, patch: Partial<Draft>) => {
    setRows((current) => current.map((row) => row.id === rowId ? { ...row, ...patch } : row));
    setErrors((current) => Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${rowId}-`))));
    setError('');
  };
  const goTo = (next: typeof step) => { setError(''); setStep(next); };
  const trySkip = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try { await onSkip(); }
    catch (cause) { setError(financeError(cause, locale)); requestAnimationFrame(() => errorRef.current?.focus()); }
    finally { setBusy(false); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const nextErrors: Record<string, string> = {};
    if (!isValidDateOnly(date) || date > localTodayIso()) nextErrors.date = c.invalidDate;
    const inputs = rows.map((row): AccountInput => {
      const name = nameFor(row).trim();
      const amount = parseMoneyInput(row.balance, row.currency);
      const limit = row.limit.trim() ? parseMoneyInput(row.limit, row.currency) : undefined;
      if (!name || name.length > 60) nextErrors[`${row.id}-name`] = c.invalidName;
      if (amount === null) nextErrors[`${row.id}-balance`] = `${c.invalidAmount} ${CURRENCY_DECIMALS[row.currency] === 0 ? c.decimals : c.twoDecimals}`;
      else if (row.kind !== 'bank' && amount < 0) nextErrors[`${row.id}-balance`] = c.nonnegative;
      if (row.kind === 'credit_card' && (limit === null || (limit !== undefined && limit < 0))) nextErrors[`${row.id}-limit`] = `${c.nonnegative} ${c.moneyHelp}`;
      return { name, kind: row.kind, currency: row.currency, openingBalance: row.kind === 'credit_card' && !row.cardCredit ? -(amount ?? 0) : amount ?? 0, openingDate: date, ...(row.kind === 'credit_card' && limit !== undefined && limit !== null ? { creditLimit: limit } : {}) };
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setError(c.fixErrors);
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setBusy(true); setError('');
    try { await onComplete(inputs, date); }
    catch (cause) { setError(financeError(cause, locale)); requestAnimationFrame(() => errorRef.current?.focus()); }
    finally { setBusy(false); }
  };

  const errorMessage = error ? <p className="onboarding-error" ref={errorRef} tabIndex={-1} role="alert">{error}</p> : null;
  const alternativeActions = <div className="onboarding-alternatives">
    <button type="button" className="onboarding-text-button" disabled={busy} onClick={trySkip} aria-describedby={`${id}-skip-help`}>{c.skip}</button>
    <button type="button" className="onboarding-text-button" disabled={busy} onClick={onImport}><DownloadSimple size={18} weight="bold" aria-hidden="true" />{c.import}</button>
  </div>;

  return <section className={`onboarding-flow is-${step}`} aria-labelledby={`${id}-title`} aria-busy={busy}>
    <ol className="onboarding-progress" aria-label={c.progress}>
      <li aria-current={step === 'welcome' ? 'step' : undefined}><span aria-hidden="true">{step === 'sources' ? <Check size={15} weight="bold" /> : '1'}</span>{c.welcome}</li>
      <li aria-current={step === 'sources' ? 'step' : undefined}><span aria-hidden="true">2</span>{c.sources}</li>
    </ol>
    {step === 'welcome' ? <>
      <div className="onboarding-welcome-grid">
        <div className="onboarding-welcome-copy">
          <h1 id={`${id}-title`} ref={headingRef} tabIndex={-1}>{c.welcomeTitle}</h1>
          <p className="onboarding-intro">{c.welcomeBody}</p>
          {errorMessage}
          <button type="button" className="primary-action onboarding-start" disabled={busy} onClick={() => goTo('sources')}>{busy ? c.saving : c.start}<ArrowRight size={20} weight="bold" aria-hidden="true" /></button>
          {alternativeActions}
          <p className="onboarding-skip-help" id={`${id}-skip-help`}>{c.skipHelp}</p>
        </div>
        <aside className="onboarding-money-picture" aria-labelledby={`${id}-picture`}>
          <h2 id={`${id}-picture`}>{c.picture}</h2>
          <div className="onboarding-money-group"><span className="onboarding-source-symbol"><Wallet size={30} weight="bold" aria-hidden="true" /></span><div><h3>{c.cashAndBank}</h3><p>{c.cashAndBankHelp}</p></div></div>
          <div className="onboarding-money-group is-card"><span className="onboarding-source-symbol"><CreditCard size={30} weight="bold" aria-hidden="true" /></span><div><h3>{c.cardTitle}</h3><p>{c.cardHelp}</p></div></div>
        </aside>
      </div>
      <p className="onboarding-privacy"><ShieldCheck size={19} weight="bold" aria-hidden="true" />{c.privacy}</p>
    </> : <>
      <button type="button" className="onboarding-text-button onboarding-back" disabled={busy} onClick={() => goTo('welcome')}><ArrowLeft size={18} weight="bold" aria-hidden="true" />{c.back}</button>
      <header className="onboarding-setup-header"><h1 id={`${id}-title`} ref={headingRef} tabIndex={-1}>{c.setupTitle}</h1><p className="onboarding-intro">{c.setupBody}</p></header>
      <div className="onboarding-setup-grid">
        <form ref={formRef} onSubmit={submit} noValidate className="onboarding-form">
          <fieldset disabled={busy} className="onboarding-fields">
            <div className="onboarding-date-row"><label className="field" htmlFor={`${id}-date`}>{c.date}<input id={`${id}-date`} name="date" type="date" value={date} max={localTodayIso()} aria-invalid={!!errors.date} aria-describedby={`${id}-date-help${errors.date ? ` ${id}-date-error` : ''}`} onChange={(event) => { setDate(event.target.value); setErrors((current) => { const next = { ...current }; delete next.date; return next; }); setError(''); }} required />{errors.date && <span className="onboarding-field-error" id={`${id}-date-error`}>{errors.date}</span>}</label><p id={`${id}-date-help`} className="onboarding-field-help">{c.dateHelp}</p></div>
            <div className="onboarding-source-list">{rows.map((row, index) => {
              const fieldId = `${id}-${row.id}`;
              const balanceLabel = row.kind === 'credit_card' ? row.cardCredit ? c.creditBalance : c.owing : c.balance;
              return <fieldset className="onboarding-source" key={row.id} aria-labelledby={`${fieldId}-title`}>
                <div className="onboarding-source-heading"><h2 id={`${fieldId}-title`}><SourceIcon kind={row.kind} /><span>{c.account} {index + 1}</span></h2>{rows.length > 1 && <button type="button" className="onboarding-remove" aria-label={`${c.remove} ${index + 1}`} onClick={() => { const remaining = rows.filter((item) => item.id !== row.id); pendingFocusRef.current = `${remaining[Math.min(index, remaining.length - 1)].id}-name`; setRows(remaining); setError(''); }}><Trash size={20} weight="bold" aria-hidden="true" /></button>}</div>
                <div className="onboarding-input-grid">
                  <label className="field" htmlFor={`${fieldId}-name`}>{c.name}<input id={`${fieldId}-name`} name={`${row.id}-name`} value={nameFor(row)} maxLength={60} placeholder={c.namePlaceholder} autoComplete="off" aria-invalid={!!errors[`${row.id}-name`]} aria-describedby={errors[`${row.id}-name`] ? `${fieldId}-name-error` : undefined} onChange={(event) => updateRow(row.id, { name: event.target.value, defaultName: false })} required />{errors[`${row.id}-name`] && <span className="onboarding-field-error" id={`${fieldId}-name-error`}>{errors[`${row.id}-name`]}</span>}</label>
                  <label className="field" htmlFor={`${fieldId}-kind`}>{c.kind}<select id={`${fieldId}-kind`} value={row.kind} onChange={(event) => updateRow(row.id, { kind: event.target.value as SourceKind })}>{(['cash', 'bank', 'ewallet', 'credit_card'] as const).map((kind) => <option value={kind} key={kind}>{c[kind]}</option>)}</select></label>
                  <label className="field" htmlFor={`${fieldId}-currency`}>{c.currency}<select id={`${fieldId}-currency`} value={row.currency} onChange={(event) => updateRow(row.id, { currency: event.target.value as Currency })}>{CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select></label>
                  <label className="field" htmlFor={`${fieldId}-balance`}>{balanceLabel}<span className={`onboarding-money-input${errors[`${row.id}-balance`] ? ' is-invalid' : ''}`}><input id={`${fieldId}-balance`} name={`${row.id}-balance`} value={row.balance} inputMode="decimal" autoComplete="off" aria-invalid={!!errors[`${row.id}-balance`]} aria-describedby={`${fieldId}-money-help${errors[`${row.id}-balance`] ? ` ${fieldId}-balance-error` : ''}`} onChange={(event) => updateRow(row.id, { balance: event.target.value })} required /><span aria-hidden="true">{row.currency}</span></span>{errors[`${row.id}-balance`] && <span className="onboarding-field-error" id={`${fieldId}-balance-error`}>{errors[`${row.id}-balance`]}</span>}</label>
                  {row.kind === 'credit_card' && <><label className="field" htmlFor={`${fieldId}-card-position`}>{c.cardPosition}<select id={`${fieldId}-card-position`} value={row.cardCredit ? 'credit' : 'owing'} onChange={(event) => updateRow(row.id, { cardCredit: event.target.value === 'credit' })}><option value="owing">{c.cardOwing}</option><option value="credit">{c.cardCredit}</option></select></label><label className="field" htmlFor={`${fieldId}-limit`}>{c.limit}<input id={`${fieldId}-limit`} name={`${row.id}-limit`} value={row.limit} inputMode="decimal" autoComplete="off" aria-invalid={!!errors[`${row.id}-limit`]} aria-describedby={`${fieldId}-limit-help${errors[`${row.id}-limit`] ? ` ${fieldId}-limit-error` : ''}`} onChange={(event) => updateRow(row.id, { limit: event.target.value })} />{errors[`${row.id}-limit`] && <span className="onboarding-field-error" id={`${fieldId}-limit-error`}>{errors[`${row.id}-limit`]}</span>}</label></>}
                </div>
                <p className="onboarding-field-help" id={`${fieldId}-money-help`}>{c.moneyHelp}{row.kind === 'bank' ? ` ${c.bankHelp}` : ''}</p>
                {row.kind === 'credit_card' && <p className="onboarding-field-help" id={`${fieldId}-limit-help`}>{c.limitHelp}</p>}
              </fieldset>;
            })}</div>
            <button type="button" className="cancel-action onboarding-add" onClick={() => { const next = newDraft(); pendingFocusRef.current = `${next.id}-name`; setRows((current) => [...current, next]); }}><Plus size={20} weight="bold" aria-hidden="true" />{c.add}</button>
          </fieldset>
          {errorMessage}
          <div className="onboarding-submit"><p className="onboarding-field-help">{c.saveHelp}</p><button type="submit" className="primary-action" disabled={busy}>{busy ? c.saving : c.save}{!busy && <ArrowRight size={20} weight="bold" aria-hidden="true" />}</button></div>
        </form>
        <aside className="onboarding-preview" aria-labelledby={`${id}-preview`}>
          <h2 id={`${id}-preview`}>{c.preview}</h2><p className="onboarding-field-help">{c.previewHelp}</p>
          {([false, true] as const).map((cards) => {
            const items = rows.filter((row) => (row.kind === 'credit_card') === cards);
            if (!items.length) return null;
            return <div className="onboarding-preview-group" key={String(cards)}><h3>{cards ? c.debtGroup : c.cashGroup}</h3><ul>{items.map((row) => {
              const amount = parseMoneyInput(row.balance, row.currency);
              return <li key={row.id}><div><SourceIcon kind={row.kind} size={18} /><span>{nameFor(row).trim() || c.noName}</span></div><strong>{amount === null ? row.currency : formatMoney(amount, row.currency, locale === 'vi' ? 'vi-VN' : 'en-US')}{cards && <small>{row.cardCredit ? c.credit : c.debt}</small>}</strong></li>;
            })}</ul></div>;
          })}
          {hasForeign && <p className="onboarding-foreign-note">{c.foreignHelp}</p>}
        </aside>
      </div>
      <div className="onboarding-setup-alternatives">{alternativeActions}<p className="onboarding-skip-help" id={`${id}-skip-help`}>{c.skipHelp}</p></div>
    </>}
  </section>;
}
