'use client';

import {
  ArrowDownRight,
  ArrowSquareOut,
  ArrowUpRight,
  ArrowsDownUp,
  CalendarBlank,
  CaretRight,
  ChartDonut,
  CheckCircle,
  CircleNotch,
  CreditCard,
  DotsThree,
  DownloadSimple,
  GearSix,
  House,
  Moon,
  Pause,
  PencilSimple,
  Play,
  Plus,
  ShieldCheck,
  Sun,
  Trash,
  TrendUp,
  UploadSimple,
  Wallet,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import Image from 'next/image';
import {
  AnimatePresence,
  LazyMotion,
  MotionConfig,
  domAnimation,
  useReducedMotion,
  type Variants,
} from 'motion/react';
import * as m from 'motion/react-m';
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  EXPENSE_CATEGORY_DEFINITIONS,
  FINANCE_STORAGE_KEY,
  addDaysDateOnly,
  createEmptyData,
  completeOnboarding,
  needsOnboarding,
  skipOnboarding,
  createId,
  dateOnlyDayDifference,
  deriveBudgetUsage,
  deriveCashflowSeries,
  deriveLiquiditySeries,
  deriveFinanceSummary,
  deriveSubscriptionTotals,
  isSafeSubscriptionAmount,
  localTodayIso,
  parseFinanceData,
  recordSubscriptionPayment,
  serializeFinanceData,
  type BillingCycle,
  type Budget,
  type CashflowPeriod,
  type CustomExpenseCategory,
  type ExpenseCategoryId,
  type FinanceData,
  type Subscription,
  type SubscriptionCurrency,
  type Transaction,
  saveLedgerTransaction, deleteLedgerTransaction, type Account, type AccountInput,
} from './finance-v4';
import { createFinanceStorageController, type FinanceStorageController } from './finance-storage';
import { initializeFinanceStorage } from './finance-bootstrap';
import { OnboardingFlow } from './onboarding-ui';
import { AccountsOverview, AccountsSheet, accountDisplayName } from './accounts-ui';
import { TransactionSheet, TransactionList, TransactionsView, PaymentSheet, type LedgerDraft, type PaymentDraft } from './ledger-ui';
import { SheetFrame, focusFirstInvalid } from './finance-dialog';
import { financeError } from './finance-errors';
import { CategoryIcon } from './category-icons';
import { CategoryPicker, expenseCategoryIcon, expenseCategoryLabel } from './category-picker';
import { APP_NAME, I18nProvider, useI18n, type Locale } from './i18n';
import { VIEW_ORDER, viewDirection as getViewDirection, viewFromHashValue, type View } from './navigation';
import { ServiceIcon } from './service-icons';
import { type Theme } from './theme-colors.ts';
import { applyTheme, initializeTheme } from './theme.ts';
import {
  MANUAL_PLAN_ID,
  MANUAL_SERVICE_ID,
  SUBSCRIPTION_CATALOG,
  catalogPlanLabel,
  catalogPlanCanAutofill,
  catalogPlanNote,
  catalogPriceNotice,
  findCatalogPlan,
  findCatalogServiceById,
  findCatalogServiceByName,
} from './subscription-catalog';

type StorageStatus = 'loading' | 'saving' | 'saved' | 'error' | 'future';
type StorageWarning = 'corrupt' | 'future' | 'error' | 'conflict' | null;
type DialogState =
  | { kind: 'transaction'; item?: Transaction; accountId?: string; refundOf?: Transaction }
  | { kind: 'accounts'; accountId?: string; transactionId?: string; transfer?: boolean }
  | { kind: 'payment'; item: Subscription }
  | { kind: 'subscription'; item?: Subscription }
  | { kind: 'budget'; item?: Budget }
  | { kind: 'settings' }
  | null;
type ToastMessage = { id: number; message: string; undo?: () => void };
type SubscriptionInput = {
  accountId?: string;
  serviceId?: string;
  planId?: string;
  name: string;
  plan: string;
  amount: number;
  currency: SubscriptionCurrency;
  cycle: BillingCycle;
  nextRenewal: string;
};
type BudgetInput = { category: ExpenseCategoryId; limit: number; customCategory?: CustomExpenseCategory };

function formatSubscriptionMoney(amount: number, currency: SubscriptionCurrency, localeTag: string) {
  const zeroDecimal = currency === 'VND' || currency === 'JPY' || currency === 'KRW';
  return new Intl.NumberFormat(localeTag, {
    style: 'currency',
    currency,
    maximumFractionDigits: zeroDecimal ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatSubscriptionTotals(
  totals: ReturnType<typeof deriveSubscriptionTotals>,
  period: 'monthly' | 'annual',
  localeTag: string,
) {
  if (totals.byCurrency.length === 0) return formatSubscriptionMoney(0, 'VND', localeTag);
  return totals.byCurrency
    .map((total) => formatSubscriptionMoney(total[period], total.currency, localeTag))
    .join(' + ');
}

const renewalOrbitPoints: Record<number, ReadonlyArray<{ x: number; y: number }>> = {
  1: [{ x: 142, y: 80 }],
  2: [{ x: 127, y: 40 }, { x: 127, y: 120 }],
  3: [{ x: 112, y: 27 }, { x: 142, y: 80 }, { x: 112, y: 133 }],
};

const navIcons: Record<View, typeof House> = {
  overview: House,
  transactions: ArrowsDownUp,
  subscriptions: CreditCard,
  budgets: ChartDonut,
};
const navItems = VIEW_ORDER.map((id) => ({ id, icon: navIcons[id] }));

const viewMotionVariants: Variants = {
  enter: (direction: number) => ({ opacity: 0.72, x: direction * 14 }),
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -8,
    transition: { duration: 0.12, ease: [0.4, 0, 1, 1] },
  }),
};

const serviceTones: Subscription['tone'][] = ['blue', 'green', 'graphite', 'violet', 'red'];

function dateReference(value: string) {
  return new Date(`${value}T12:00:00`);
}

function moneyDensityClass(label: string) {
  return label.length >= 17 ? 'is-compact-money' : '';
}

function viewFromHash(): View | null {
  if (typeof window === 'undefined') return null;
  return viewFromHashValue(window.location.hash);
}

function shouldMoveFocusAfterViewChange() {
  const outgoingView = document.querySelector('.view-motion-layer');
  const activeElement = document.activeElement;
  return activeElement === document.body || Boolean(activeElement && outgoingView?.contains(activeElement));
}

function PageIcon({ view }: { view: View }) {
  const Icon = (navItems.find((item) => item.id === view) ?? navItems[0]).icon;
  return <Icon size={22} weight="bold" aria-hidden="true" />;
}

function AppLoadingShell({ label }: { label: string }) {
  return (
    <main className="app-frame app-loading-shell" aria-busy="true">
      <aside className="desktop-sidebar loading-sidebar" aria-hidden="true">
        <div className="brand loading-brand">
          <span className="brand-mark"><Image src="/tally-icon-192.png" alt="" width={84} height={84} sizes="42px" quality={100} priority /></span>
          <span>{APP_NAME}</span>
        </div>
        <div className="loading-nav-stack">
          {navItems.map((item) => <span className="loading-nav-row" key={item.id}><i className="loading-skeleton-dot" /><i className="loading-skeleton-line is-nav" /></span>)}
        </div>
      </aside>

      <section className="workspace">
        <header className="mobile-appbar loading-mobile-appbar" aria-hidden="true">
          <span className="mobile-brand"><span className="brand-mark small"><Image src="/tally-icon-192.png" alt="" width={72} height={72} sizes="36px" quality={100} priority /></span><span>{APP_NAME}</span></span>
          <span className="loading-appbar-actions"><i className="loading-skeleton-dot is-control" /><i className="loading-skeleton-dot is-control" /><i className="loading-skeleton-dot is-control" /></span>
        </header>

        <header className="page-header loading-page-header">
          <div className="loading-heading-copy" aria-hidden="true">
            <span className="loading-skeleton-line is-heading" />
            <span className="loading-skeleton-line is-context" />
          </div>
          <div className="loading-status" role="status" aria-live="polite" aria-atomic="true">
            <CircleNotch className="loading-spinner" size={18} weight="bold" aria-hidden="true" />
            <span>{label}</span>
          </div>
        </header>

        <div className="loading-overview" aria-hidden="true">
          <div className="loading-primary">
            <section className="surface-raised loading-panel loading-balance-panel">
              <span className="loading-skeleton-line is-label" />
              <span className="loading-skeleton-line is-balance" />
              <div className="loading-summary-grid"><span /><span /></div>
            </section>
            <section className="surface-raised loading-panel loading-renewal-panel loading-renewal-mobile">
              <span className="loading-skeleton-line is-title" />
              <div className="loading-renewal-compact"><span className="loading-orbit-placeholder" /><div className="loading-list-rows is-compact"><span /><span /><span /></div></div>
            </section>
            <section className="surface-raised loading-panel loading-chart-panel">
              <span className="loading-skeleton-line is-title" />
              <div className="loading-chart-bars">{[42, 68, 54, 78, 48, 64, 72, 44].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
            </section>
            <section className="surface-raised loading-panel loading-list-panel">
              <span className="loading-skeleton-line is-title" />
              <div className="loading-list-rows"><span /><span /><span /></div>
            </section>
          </div>
          <aside className="surface-raised loading-panel loading-renewal-panel loading-renewal-desktop">
            <span className="loading-skeleton-line is-title" />
            <span className="loading-orbit-placeholder" />
            <div className="loading-list-rows is-compact"><span /><span /><span /></div>
          </aside>
        </div>
      </section>
      <div className="mobile-bottom-nav loading-bottom-nav" aria-hidden="true"><span /><span /><span className="is-primary" /><span /><span /></div>
    </main>
  );
}

function LanguageSwitch({ mobile = false }: { mobile?: boolean }) {
  const { locale, setLocale, c, t } = useI18n();
  if (mobile) {
    const nextLocale: Locale = locale === 'en' ? 'vi' : 'en';
    return (
      <button
        className="mobile-language-toggle"
        type="button"
        onClick={() => setLocale(nextLocale)}
        aria-label={t('language.switchTo', { language: c.language[nextLocale] })}
        title={c.language[nextLocale]}
      >
        {locale.toUpperCase()}
      </button>
    );
  }
  return (
    <div className="language-switch desktop-language-switch" role="group" aria-label={c.language.changeAria}>
      {(['en', 'vi'] as Locale[]).map((option) => (
        <button
          className={`language-option ${locale === option ? 'is-active' : ''}`}
          key={option}
          type="button"
          onClick={() => setLocale(option)}
          aria-pressed={locale === option}
          aria-label={c.language[option]}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function ThemeControl({ theme, onToggle, className = '' }: { theme: Theme | null; onToggle: () => void; className?: string }) {
  const { c } = useI18n();
  const isDark = theme === 'dark';
  const label = isDark ? c.theme.useLight : c.theme.useDark;
  return (
    <button className={`icon-control theme-control ${className}`.trim()} type="button" onClick={onToggle} aria-label={label} title={label} aria-pressed={isDark}>
      <Moon className="theme-icon theme-icon-moon" size={20} weight="bold" aria-hidden="true" />
      <Sun className="theme-icon theme-icon-sun" size={20} weight="bold" aria-hidden="true" />
    </button>
  );
}

export default function FinanceApp() {
  return (
    <I18nProvider>
      <MotionConfig reducedMotion="user">
        <LazyMotion features={domAnimation} strict>
          <AppContent />
        </LazyMotion>
      </MotionConfig>
    </I18nProvider>
  );
}

function AppContent() {
  const { c, t, locale, isLocaleHydrated } = useI18n();
  const vi = locale === 'vi';
  const shouldReduceMotion = useReducedMotion();
  const [today, setToday] = useState(localTodayIso);
  const [data, setData] = useState<FinanceData>(() => createEmptyData());
  const [view, setView] = useState<View>('overview');
  const [viewDirection, setViewDirection] = useState<1 | -1>(1);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>('loading');
  const [storageWarning, setStorageWarning] = useState<StorageWarning>(null);
  const [protectedStorage, setProtectedStorage] = useState(false);
  const [limitedWriteProtection, setLimitedWriteProtection] = useState(false);
  const [storageRetry, setStorageRetry] = useState(0);
  const activeViewRef = useRef<View>('overview');
  const dialogOpener = useRef<HTMLElement | null>(null);
  const pendingViewFocusRef = useRef(false);
  const storageController = useRef<FinanceStorageController | null>(null);
  const dataRef = useRef(data);
  const savingRef = useRef(false);
  const dialogRevisionRef = useRef<number | null>(null);
  const [lastAccountId, setLastAccountId] = useState<string>();
  const toastSequence = useRef(0);

  const commitView = useCallback((nextView: View) => {
    const currentView = activeViewRef.current;
    if (nextView === currentView) return false;
    const direction = getViewDirection(currentView, nextView);
    activeViewRef.current = nextView;
    setViewDirection(direction);
    setView(nextView);
    return true;
  }, []);

  const transactions = useMemo(
    () => [...data.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
    [data.transactions],
  );
  const activeSubscriptions = useMemo(
    () => data.subscriptions.filter((item) => item.status !== 'paused'),
    [data.subscriptions],
  );
  const reference = useMemo(() => dateReference(today), [today]);
  const summary = useMemo(() => deriveFinanceSummary(data, reference), [data, reference]);
  const budgetUsage = useMemo(() => deriveBudgetUsage(data, reference), [data, reference]);
  const subscriptionTotals = useMemo(() => deriveSubscriptionTotals(activeSubscriptions), [activeSubscriptions]);
  const appReady = hydrated && isLocaleHydrated;
  const persistenceBlocked = protectedStorage;
  const mutationsDisabled = !appReady || persistenceBlocked;

  useEffect(() => {
    const timer = window.setInterval(() => setToday(localTodayIso()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const syncView = () => {
      const next = viewFromHash();
      if (!next) return;
      const shouldMoveFocus = shouldMoveFocusAfterViewChange();
      const changed = commitView(next);
      if (changed) pendingViewFocusRef.current = shouldMoveFocus;
    };
    syncView();
    window.addEventListener('popstate', syncView);
    window.addEventListener('hashchange', syncView);
    return () => {
      window.removeEventListener('popstate', syncView);
      window.removeEventListener('hashchange', syncView);
    };
  }, [commitView]);

  useEffect(() => {
    const controller = createFinanceStorageController();
    storageController.current = controller;
    let cancelled = false;
    let sequence = 0;
    const applyLoad = async () => {
      const currentSequence = ++sequence;
      const loaded = await initializeFinanceStorage(controller);
      if (cancelled || currentSequence !== sequence) return;
      setProtectedStorage(loaded.status !== 'ok' && loaded.status !== 'missing');
      setLimitedWriteProtection(!navigator.locks);
      if (loaded.status === 'ok') {
        dataRef.current = loaded.data;
        setData(loaded.data);
        setStorageStatus('saved');
        setStorageWarning(null);
      } else if (loaded.status === 'missing') {
        const empty = createEmptyData();
        dataRef.current = empty;
        setData(empty);
        setStorageStatus('saved');
        setStorageWarning(null);
      } else {
        setStorageStatus(loaded.status === 'future' ? 'future' : 'error');
        setStorageWarning(loaded.status === 'future' ? 'future' : loaded.status === 'corrupt' ? 'corrupt' : 'error');
      }
      setHydrated(true);
    };
    const frame = window.requestAnimationFrame(() => { void applyLoad(); });
    const sync = (event: StorageEvent) => {
      if ((event.key === FINANCE_STORAGE_KEY || event.key === 'tally-finance-v1' || event.key === null) && !savingRef.current) void applyLoad();
    };
    window.addEventListener('storage', sync);
    return () => { cancelled = true; window.cancelAnimationFrame(frame); window.removeEventListener('storage', sync); };
  }, [storageRetry]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setTheme(initializeTheme());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!toast) return;
    if (toast.undo) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function showToast(message: string, undo?: () => void) {
    toastSequence.current += 1;
    setToast({ id: toastSequence.current, message, undo });
  }

  async function updateData(updater: (current: FinanceData) => FinanceData, mode: FinanceData['mode'] = 'personal'): Promise<FinanceData> {
    if (persistenceBlocked || !storageController.current) throw new Error(vi ? 'Dữ liệu đang được bảo vệ. Hãy kiểm tra cảnh báo lưu trữ.' : 'The saved ledger is protected. Check the storage warning.');
    if (savingRef.current) throw new Error(vi ? 'Đang lưu thay đổi trước. Vui lòng thử lại.' : 'The previous change is still saving. Please try again.');
    const current = dataRef.current;
    if (dialogRevisionRef.current !== null && dialogRevisionRef.current !== current.revision) {
      throw new Error(vi ? 'Dữ liệu đã thay đổi khi biểu mẫu đang mở. Đóng và mở lại biểu mẫu để dùng bản mới nhất.' : 'The ledger changed while this form was open. Close and reopen it to use the latest data.');
    }
    let next: FinanceData;
    try { next = { ...updater(current), mode, updatedAt: new Date().toISOString() }; }
    catch (error) { throw new Error(financeError(error, locale)); }
    savingRef.current = true;
    setStorageStatus('saving');
    try {
      const result = await storageController.current.commit(next, current.revision);
      if (result.status === 'saved') {
        dataRef.current = result.data;
        setData(result.data);
        setStorageStatus('saved');
        setStorageWarning(null);
        if (dialogRevisionRef.current !== null) dialogRevisionRef.current = result.data.revision;
        setLimitedWriteProtection(result.protection === 'revision-check');
        return result.data;
      }
      if (result.status === 'conflict') {
        const latest = await initializeFinanceStorage(storageController.current);
        if (latest.status === 'ok') { dataRef.current = latest.data; setData(latest.data); }
        else if (latest.status === 'missing') { const empty = createEmptyData(); dataRef.current = empty; setData(empty); }
        setProtectedStorage(latest.status !== 'ok' && latest.status !== 'missing');
        setStorageStatus('error'); setStorageWarning('conflict');
        throw new Error(vi ? 'Dữ liệu đã thay đổi ở tab khác. Bản mới đã được nạp; đóng rồi mở lại biểu mẫu trước khi lưu.' : 'Another tab changed the ledger. The latest version is loaded; close and reopen this form before saving.');
      }
      setStorageStatus('error');
      if (result.status === 'blocked') {
        const latest = storageController.current.load();
        setProtectedStorage(latest.status === 'future' || latest.status === 'corrupt');
        if (latest.status === 'future') { setStorageStatus('future'); setStorageWarning('future'); }
        else if (latest.status === 'corrupt') setStorageWarning('corrupt');
      }
      throw new Error(vi ? 'Không lưu được trên thiết bị. Dữ liệu trước đó vẫn được giữ; thử lại hoặc xuất bản sao lưu.' : 'Could not save on this device. Your previous data is intact; retry or export a backup.');
    } finally { savingRef.current = false; }
  }

  async function restoreSnapshot(snapshot: FinanceData, message: string, expectedRevision: number | null) {
    if (expectedRevision === null || dataRef.current.revision !== expectedRevision) {
      showToast(vi ? 'Dữ liệu đã thay đổi. Không thể hoàn tác bản cũ; hãy sửa giao dịch cần thay đổi.' : 'The ledger has changed. Edit the affected transaction instead of undoing an older snapshot.');
      return;
    }
    try { await updateData(() => snapshot, snapshot.mode); showToast(message); }
    catch (error) { showToast(financeError(error, locale)); }
  }

  function openDialog(next: Exclude<DialogState, null>) {
    dialogOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRevisionRef.current = dataRef.current.revision;
    setDialog(next);
  }

  function closeDialog() {
    dialogRevisionRef.current = null;
    setDialog(null);
  }

  function restoreDialogFocus() {
    const opener = dialogOpener.current;
    dialogOpener.current = null;
    if (!opener?.isConnected) return;
    window.requestAnimationFrame(() => opener.focus());
  }

  function navigate(nextView: View) {
    const shouldMoveFocus = shouldMoveFocusAfterViewChange();
    const changed = commitView(nextView);
    if (changed) {
      pendingViewFocusRef.current = shouldMoveFocus;
      window.history.pushState(null, '', `#${nextView}`);
    }
    window.scrollTo({ top: 0, behavior: shouldReduceMotion ? 'auto' : 'smooth' });
  }

  function focusPendingView() {
    if (!pendingViewFocusRef.current) return;
    pendingViewFocusRef.current = false;
    window.requestAnimationFrame(() => {
      const pageTitle = Array.from(document.querySelectorAll<HTMLElement>('[data-page-focus]')).find((element) => element.offsetParent !== null);
      pageTitle?.focus();
    });
  }

  function toggleTheme() {
    const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const next: Theme = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { window.localStorage.setItem('tally-theme', next); } catch { /* Keep the in-session theme. */ }
    setTheme(next);
  }

  async function saveTransaction(input: LedgerDraft, existing?: Transaction) {
    const sign = input.kind === 'expense' ? -1 : 1;
    const sameValuation = existing && existing.accountId === input.accountId && existing.amount === sign * input.amount
      && existing.date === input.date && existing.reportingAmount === (input.reportingAmount === undefined ? undefined : sign * input.reportingAmount);
    await updateData((current) => {
      const withCategory = input.customCategory && !current.customCategories.some((item) => item.id === input.customCategory?.id)
        ? { ...current, customCategories: [...current.customCategories, input.customCategory] } : current;
      return saveLedgerTransaction(withCategory, {
        ...(existing ?? {}), title: input.title, titleKey: undefined, kind: input.kind, accountId: input.accountId,
        category: input.kind === 'income' ? 'income' : input.category, date: input.date, amount: sign * input.amount,
        reportingAmount: input.reportingAmount === undefined ? undefined : sign * input.reportingAmount,
        reportingRate: sameValuation ? existing.reportingRate : undefined, originalAmount: input.originalAmount, originalCurrency: input.originalCurrency,
        refundOfId: input.kind === 'refund' ? input.refundOfId : undefined,
      }, existing?.id);
    });
    setLastAccountId(input.accountId);
    showToast(existing ? c.toast.transactionUpdated : c.toast.transactionAdded);
  }

  async function deleteTransaction(id: string) {
    const snapshot = dataRef.current;
    try {
      const saved = await updateData((current) => deleteLedgerTransaction(current, id));
      showToast(c.toast.transactionDeleted, () => { void restoreSnapshot(snapshot, c.toast.transactionRestored, saved.revision); });
    } catch (error) { showToast(financeError(error, locale)); }
  }

  function editTransaction(item: Transaction) {
    const transfer = item.kind === 'transfer' ? item : item.groupId ? data.transactions.find((entry) => entry.groupId === item.groupId && entry.kind === 'transfer') : undefined;
    if (transfer) openDialog({ kind: 'accounts', accountId: transfer.accountId, transactionId: transfer.id });
    else openDialog({ kind: 'transaction', item });
  }

  async function saveSubscription(input: SubscriptionInput, existing?: Subscription) {
    const subscription: Subscription = {
      ...(existing ?? {}),
      id: existing?.id ?? createId('subscription'),
      accountId: input.accountId,
      serviceId: input.serviceId,
      planId: input.planId,
      name: input.name,
      plan: input.plan,
      planKey: undefined,
      amount: input.amount,
      currency: input.currency,
      cycle: input.cycle,
      nextRenewal: input.nextRenewal,
      renewalAnchorDay: Number(input.nextRenewal.slice(-2)),
      status: existing?.status ?? 'active',
      monogram: input.name.slice(0, 1).toUpperCase(),
      tone: existing?.tone ?? serviceTones[data.subscriptions.length % serviceTones.length],
    };
    await updateData((current) => ({
      ...current,
      subscriptions: existing
        ? current.subscriptions.map((item) => item.id === existing.id ? subscription : item)
        : [...current.subscriptions, subscription],
    }));
    showToast(existing ? c.toast.subscriptionUpdated : c.toast.subscriptionAdded);
  }

  async function toggleSubscription(id: string) {
    const subscription = dataRef.current.subscriptions.find((item) => item.id === id);
    if (!subscription) return;
    const willResume = subscription.status === 'paused';
    try {
      await updateData((current) => ({ ...current, subscriptions: current.subscriptions.map((item) => {
        if (item.id !== id) return item;
        return item.status === 'paused' ? { ...item, status: item.previousStatus ?? 'active', previousStatus: undefined }
          : { ...item, previousStatus: item.status, status: 'paused' };
      }) }));
      showToast(t(willResume ? 'toast.trackingResumed' : 'toast.trackingPaused', { name: subscription.name }));
    } catch (error) { showToast(financeError(error, locale)); }
  }

  async function deleteSubscription(id: string) {
    const snapshot = dataRef.current;
    try {
      const saved = await updateData((current) => ({ ...current, subscriptions: current.subscriptions.filter((item) => item.id !== id) }));
      showToast(c.toast.subscriptionDeleted, () => { void restoreSnapshot(snapshot, c.toast.subscriptionRestored, saved.revision); });
    } catch (error) { showToast(financeError(error, locale)); }
  }

  async function recordPayment(id: string, input: PaymentDraft) {
    const snapshot = dataRef.current;
    const saved = await updateData((current) => {
      const result = recordSubscriptionPayment(current, id, input.paidOn, {
        expectedOccurrence: input.expectedOccurrence, accountId: input.accountId, amount: input.amount,
        reportingAmount: input.reportingAmount === undefined ? undefined : -input.reportingAmount,
      });
      if (result.status !== 'recorded') throw new Error(result.status === 'already-recorded' || result.status === 'stale-occurrence'
        ? (vi ? 'Kỳ này đã được ghi nhận hoặc ngày gia hạn đã thay đổi. Đóng biểu mẫu rồi kiểm tra lịch sử.' : 'This renewal was already recorded or has changed. Close this form and review its history.')
        : (vi ? 'Không thể ghi nhận kỳ này. Kiểm tra nguồn thanh toán và ngày.' : 'Could not record this renewal. Check the account and payment date.'));
      return result.data;
    });
    showToast(c.toast.paymentRecorded, () => { void restoreSnapshot(snapshot, c.toast.paymentReverted, saved.revision); });
  }

  async function saveBudget(input: BudgetInput, existing?: Budget) {
    const budget: Budget = { id: existing?.id ?? createId('budget'), category: input.category, limit: input.limit };
    await updateData((current) => ({
      ...current,
      customCategories: input.customCategory && !current.customCategories.some((item) => item.id === input.customCategory?.id)
        ? [...current.customCategories, input.customCategory]
        : current.customCategories,
      budgets: existing
        ? current.budgets.map((item) => item.id === existing.id ? budget : item)
        : [...current.budgets, budget],
    }));
    showToast(existing ? c.toast.budgetUpdated : c.toast.budgetAdded);
  }

  async function deleteBudget(id: string) {
    const snapshot = dataRef.current;
    try {
      const saved = await updateData((current) => ({ ...current, budgets: current.budgets.filter((item) => item.id !== id) }));
      showToast(c.toast.budgetDeleted, () => { void restoreSnapshot(snapshot, c.toast.budgetRestored, saved.revision); });
    } catch (error) { showToast(financeError(error, locale)); }
  }

  async function replaceAllData(nextData: FinanceData, message: string) {
    await updateData(() => nextData, nextData.mode);
    commitView('overview');
    window.history.replaceState(null, '', '#overview');
    showToast(message);
  }

  async function finishWelcome(inputs?: AccountInput[], date?: string) {
    // A form from another tab must never replace that tab's completed setup.
    const expectedRevision = data.revision;
    await updateData((current) => {
      if (current.revision !== expectedRevision) throw new Error(vi ? 'Dữ liệu đã thay đổi. Hãy tải lại trước khi thiết lập.' : 'The ledger changed. Reload before setting up your accounts.');
      return inputs && date ? completeOnboarding(current, inputs, date) : skipOnboarding(current);
    });
    commitView('overview');
    window.history.replaceState(null, '', '#overview');
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      const heading = Array.from(document.querySelectorAll<HTMLElement>('[data-page-focus]')).find((element) => element.offsetParent !== null);
      heading?.focus();
    });
  }

  function exportProtectedData() {
    try {
      const raw = window.localStorage.getItem(FINANCE_STORAGE_KEY) ?? window.localStorage.getItem('tally-finance-v1');
      if (raw === null) throw new Error('No stored document');
      const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `tally-recovery-${localTodayIso()}.json`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch { setStorageWarning('error'); }
  }

  if (!appReady) return <AppLoadingShell label={c.storage.loading} />;

  const primaryDialogKind = view === 'subscriptions' ? 'subscription' : view === 'budgets' ? 'budget' : 'transaction';
  const primaryLabel = view === 'subscriptions' ? c.actions.addSubscriptionShort : view === 'budgets' ? c.actions.addBudget : c.actions.addTransaction;
  const storageLabel = storageStatus === 'loading'
    ? c.storage.loading
    : storageStatus === 'saving'
      ? c.storage.saving
      : storageStatus === 'saved'
        ? c.storage.saved
        : storageStatus === 'future'
          ? c.storage.readOnly
          : c.storage.error;
  const storageWarningCopy = storageWarning === 'conflict'
    ? (vi ? 'Dữ liệu vừa thay đổi ở tab khác. Kiểm tra bản mới trước khi lưu lại.' : 'Another tab changed the ledger. Review the latest data before saving again.')
    : storageWarning === 'corrupt'
    ? (vi ? 'Không đọc được dữ liệu đã lưu. Bản gốc được giữ nguyên và chưa bị ghi đè.' : 'The saved ledger cannot be read. Its original contents have been preserved.')
    : storageWarning === 'future'
      ? c.storage.futureVersionWarning
      : storageWarning === 'error'
        ? c.storage.error
        : null;
  const activeDialog = dialog?.kind === 'transaction'
    ? <TransactionSheet key={'transaction-' + (dialog.item?.id ?? dialog.refundOf?.id ?? 'new')} data={data} initial={dialog.item} initialAccountId={dialog.accountId ?? lastAccountId} refundOf={dialog.refundOf} today={today} onClose={closeDialog} onSave={saveTransaction} onManageAccounts={() => openDialog({ kind: 'accounts' })} />
    : dialog?.kind === 'accounts'
      ? <AccountsSheet key="accounts" data={data} onChange={updateData} onClose={closeDialog} initialAccountId={dialog.accountId} initialTransactionId={dialog.transactionId} initialTransfer={dialog.transfer} onAddTransaction={(accountId) => openDialog({ kind: 'transaction', accountId })} onEditTransaction={editTransaction} />
    : dialog?.kind === 'payment'
      ? <PaymentSheet key={'payment-' + dialog.item.id} data={data} subscription={dialog.item} today={today} onClose={closeDialog} onSave={(input) => recordPayment(dialog.item.id, input)} onManageAccounts={() => openDialog({ kind: 'accounts' })} />
    : dialog?.kind === 'subscription'
      ? <SubscriptionSheet key={'subscription-' + (dialog.item?.id ?? 'new')} initial={dialog.item} accounts={data.accounts} today={today} onClose={closeDialog} onSave={saveSubscription} />
    : dialog?.kind === 'budget'
      ? <BudgetSheet key={'budget-' + (dialog.item?.id ?? 'new')} initial={dialog.item} budgets={data.budgets} customCategories={data.customCategories} onClose={closeDialog} onSave={saveBudget} />
    : dialog?.kind === 'settings'
      ? <SettingsSheet data={data} storageStatus={storageStatus} onClose={closeDialog} onManageAccounts={() => openDialog({ kind: 'accounts' })}
          importOnly={needsOnboarding(data)} onClear={() => replaceAllData(createEmptyData(), c.toast.dataCleared)}
          onImport={(nextData) => replaceAllData(nextData, c.toast.dataImported)} onNotify={showToast} />
    : null;

  if (needsOnboarding(data) || persistenceBlocked) return (
    <main className="onboarding-shell">
      <header className="onboarding-appbar">
        <span className="brand"><span className="brand-mark" aria-hidden="true"><Image src="/tally-icon-192.png" alt="" width={84} height={84} sizes="42px" quality={100} priority /></span><span>{APP_NAME}</span></span>
        <div className="appbar-actions"><LanguageSwitch /><ThemeControl theme={theme} onToggle={toggleTheme} /></div>
      </header>
      {persistenceBlocked ? (
        <section className="onboarding-recovery surface-raised" aria-labelledby="recovery-title">
          <WarningCircle size={34} weight="bold" aria-hidden="true" />
          <h1 id="recovery-title">{vi ? 'Chưa thể mở dữ liệu trên thiết bị' : 'Your saved data could not be opened'}</h1>
          <p role="alert">{storageWarningCopy}</p>
          <p>{vi ? 'Tally đã tạm dừng thay đổi. Bạn có thể thử lại hoặc tải bản gốc để giữ một bản sao.' : 'Changes are paused. Retry, or download the original document to keep a copy.'}</p>
          <div><button type="button" className="primary-action" onClick={() => { setHydrated(false); setStorageRetry((value) => value + 1); }}>{vi ? 'Thử lại' : 'Try again'}</button><button type="button" className="secondary-action" onClick={exportProtectedData}><DownloadSimple size={20} weight="bold" />{vi ? 'Tải bản gốc' : 'Download original'}</button></div>
        </section>
      ) : <>
        {storageWarningCopy && <p className="storage-warning" role="alert">{storageWarningCopy}</p>}
        <OnboardingFlow key={data.revision} onComplete={(inputs, date) => finishWelcome(inputs, date)} onSkip={() => finishWelcome()} onImport={() => openDialog({ kind: 'settings' })} />
        <AnimatePresence initial={false} mode="wait" onExitComplete={restoreDialogFocus}>{activeDialog}</AnimatePresence>
      </>}
    </main>
  );

  return (
    <main className="app-frame" aria-busy={!hydrated}>
      <aside className="desktop-sidebar" aria-label={c.nav.mainAria}>
        <button className="brand" type="button" onClick={() => navigate('overview')} aria-label={t('nav.homeAria', { appName: APP_NAME })}>
          <span className="brand-mark" aria-hidden="true"><Image src="/tally-icon-192.png" alt="" width={84} height={84} sizes="42px" quality={100} priority /></span>
          <span>{APP_NAME}</span>
        </button>
        <nav className="desktop-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className={`nav-button ${view === item.id ? 'is-active' : ''}`} key={item.id} type="button" onClick={() => navigate(item.id)} aria-current={view === item.id ? 'page' : undefined} aria-label={c.nav[item.id]} title={c.nav[item.id]}>
                <m.i className="nav-icon" aria-hidden="true" animate={{ opacity: view === item.id ? 1 : 0.8, scale: view === item.id ? 1 : 0.94 }} transition={{ duration: shouldReduceMotion ? 0.08 : 0.18 }}><Icon size={21} weight={view === item.id ? 'fill' : 'bold'} aria-hidden="true" /></m.i><span>{c.nav[item.id]}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button className="utility-button" type="button" onClick={() => openDialog({ kind: 'settings' })} aria-label={c.settings.title} title={c.settings.title}>
            <GearSix size={20} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="mobile-appbar">
          <button className="mobile-brand" type="button" onClick={() => navigate('overview')} aria-label={t('nav.homeAria', { appName: APP_NAME })}>
            <span className="brand-mark small" aria-hidden="true"><Image src="/tally-icon-192.png" alt="" width={72} height={72} sizes="36px" quality={100} priority /></span><span>{APP_NAME}</span>
          </button>
          <div className="appbar-actions">
            <LanguageSwitch mobile />
            <ThemeControl theme={theme} onToggle={toggleTheme} />
            <button className="icon-control" type="button" onClick={() => openDialog({ kind: 'settings' })} aria-label={c.settings.title} title={c.settings.title}><GearSix size={20} weight="bold" aria-hidden="true" /></button>
          </div>
        </header>

        <header className="page-header">
          <div>
            <h1 className="desktop-greeting" data-page-focus tabIndex={-1}>{c.nav[view]}</h1>
            <div className="mobile-title-row"><PageIcon view={view} /><h1 id={`page-title-${view}`} data-page-focus tabIndex={-1}>{c.nav[view]}</h1></div>
            <p className="page-context">{c.header.context[view]}</p>
          </div>
          <div className="header-actions">
            <span className={`storage-badge is-${storageStatus}`} title={c.storage.localOnly}><i aria-hidden="true" />{storageLabel}</span>
            <LanguageSwitch />
            <ThemeControl theme={theme} onToggle={toggleTheme} className="desktop-only" />
            <button className="primary-action desktop-only" type="button" disabled={mutationsDisabled} onClick={() => openDialog({ kind: primaryDialogKind })}><Plus size={19} weight="bold" aria-hidden="true" />{primaryLabel}</button>
          </div>
        </header>

        {storageWarningCopy && <div className="storage-warning" role="status"><WarningCircle size={19} weight="fill" aria-hidden="true" /><span>{storageWarningCopy}</span><button type="button" onClick={() => setStorageWarning(null)} aria-label={c.common.close}><X size={16} weight="bold" aria-hidden="true" /></button></div>}
        {limitedWriteProtection && <p className="valuation-note">{vi ? 'Trình duyệt này có giới hạn bảo vệ khi lưu đồng thời. Hãy chỉnh sửa trong một tab Tally mỗi lần.' : 'This browser has limited protection for simultaneous saves. Edit in one Tally tab at a time.'}</p>}

        {view === 'overview' && data.transactions.length === 0 && (data.onboarding === 'completed' || data.onboarding === 'skipped') && (
          <section className="first-entry-prompt" aria-labelledby="first-entry-title">
            <div><h2 id="first-entry-title">{vi ? 'Bắt đầu với giao dịch đầu tiên' : 'Start with your first transaction'}</h2><p>{data.onboarding === 'skipped'
              ? (vi ? 'Bạn có thể thêm nguồn, cập nhật số dư trong Nguồn tiền hoặc ghi một khoản thu chi để bắt đầu.' : 'Add accounts, update balances in Accounts, or record income and spending to get started.')
              : (vi ? 'Nguồn tiền đã sẵn sàng. Chọn nguồn thực tế khi ghi thu chi để số dư từng nơi luôn rõ ràng.' : 'Your accounts are ready. Choose the account you use when recording income or spending to keep each balance clear.')}</p></div>
            <button type="button" className="primary-action" disabled={mutationsDisabled} onClick={() => openDialog({ kind: 'transaction' })}><Plus size={20} weight="bold" aria-hidden="true" />{vi ? 'Ghi giao dịch' : 'Add transaction'}</button>
          </section>
        )}

        <div className="view-stage" inert={mutationsDisabled ? true : undefined}>
          <AnimatePresence initial={false} mode="wait" custom={viewDirection} onExitComplete={focusPendingView}>
            <m.div className="view-motion-layer" key={view} custom={viewDirection} variants={viewMotionVariants} initial="enter" animate="center" exit="exit">
              {view === 'overview' && (
                <Overview
                  data={data}
                  onAccounts={(accountId) => openDialog({ kind: 'accounts', accountId })}
                  summary={summary}
                  transactions={transactions}
                  subscriptions={activeSubscriptions}
                  subscriptionTotals={subscriptionTotals}
                  customCategories={data.customCategories}
                  today={today}
                  onNavigate={navigate}
                  onAddTransaction={() => openDialog({ kind: 'transaction' })}
                />
              )}
              {view === 'transactions' && <TransactionsView data={data} transactions={transactions} onDelete={deleteTransaction} onEdit={editTransaction} onRefund={(refundOf) => openDialog({ kind: 'transaction', refundOf })} onTransfer={() => openDialog({ kind: 'accounts', transfer: true })} onAdd={() => openDialog({ kind: 'transaction' })} />}
              {view === 'subscriptions' && (
                <SubscriptionsView
                  accounts={data.accounts}
                  subscriptions={data.subscriptions}
                  totals={subscriptionTotals}
                  today={today}
                  onAdd={() => openDialog({ kind: 'subscription' })}
                  onEdit={(item) => openDialog({ kind: 'subscription', item })}
                  onToggle={toggleSubscription}
                  onDelete={deleteSubscription}
                  onRecordPayment={(id) => { const item = data.subscriptions.find((subscription) => subscription.id === id); if (item) openDialog({ kind: 'payment', item }); }}
                />
              )}
              {view === 'budgets' && <BudgetsView usage={budgetUsage} customCategories={data.customCategories} today={today} onAdd={() => openDialog({ kind: 'budget' })} onEdit={(item) => openDialog({ kind: 'budget', item })} onDelete={deleteBudget} />}
            </m.div>
          </AnimatePresence>
        </div>
      </section>

      <nav className="mobile-bottom-nav" aria-label={c.nav.mobileAria}>
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          return <button key={item.id} type="button" className={view === item.id ? 'is-active' : ''} onClick={() => navigate(item.id)} aria-current={view === item.id ? 'page' : undefined}><m.i className="nav-icon" aria-hidden="true" animate={{ opacity: view === item.id ? 1 : 0.8, scale: view === item.id ? 1 : 0.94 }} transition={{ duration: shouldReduceMotion ? 0.08 : 0.18 }}><Icon size={21} weight={view === item.id ? 'fill' : 'bold'} aria-hidden="true" /></m.i><span>{c.nav[item.id]}</span></button>;
        })}
        <button className="mobile-add" type="button" disabled={mutationsDisabled} onClick={() => openDialog({ kind: primaryDialogKind })} aria-label={primaryLabel}><Plus size={25} weight="bold" aria-hidden="true" /></button>
        {navItems.slice(2).map((item) => {
          const Icon = item.icon;
          return <button key={item.id} type="button" className={view === item.id ? 'is-active' : ''} onClick={() => navigate(item.id)} aria-current={view === item.id ? 'page' : undefined}><m.i className="nav-icon" aria-hidden="true" animate={{ opacity: view === item.id ? 1 : 0.8, scale: view === item.id ? 1 : 0.94 }} transition={{ duration: shouldReduceMotion ? 0.08 : 0.18 }}><Icon size={21} weight={view === item.id ? 'fill' : 'bold'} aria-hidden="true" /></m.i><span>{c.nav[item.id]}</span></button>;
        })}
      </nav>

      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{storageLabel}</span>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{`${c.nav[view]}. ${c.header.context[view]}`}</span>

      <AnimatePresence initial={false} mode="wait" onExitComplete={restoreDialogFocus}>{activeDialog}</AnimatePresence>

      <AnimatePresence initial={false} mode="wait">
        {toast && (
          <m.div className="toast" key={toast.id} role="status" aria-live="polite" initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 6 }} transition={{ duration: shouldReduceMotion ? 0.08 : 0.18, ease: [0.16, 1, 0.3, 1] }}>
            <CheckCircle size={18} weight="fill" aria-hidden="true" />
            <span>{toast.message}</span>
            {toast.undo && <button className="toast-undo" type="button" onClick={() => { const undo = toast.undo; setToast(null); undo?.(); }}>{c.actions.undo}</button>}
            {toast.undo && <button className="toast-dismiss" type="button" onClick={() => setToast(null)} aria-label={c.common.close}><X size={17} weight="bold" aria-hidden="true" /></button>}
          </m.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Overview({ data, onAccounts, summary, transactions, subscriptions, subscriptionTotals, today, onNavigate, onAddTransaction }: {
  data: FinanceData;
  onAccounts: (accountId?: string) => void;
  summary: ReturnType<typeof deriveFinanceSummary>;
  transactions: Transaction[];
  subscriptions: Subscription[];
  subscriptionTotals: ReturnType<typeof deriveSubscriptionTotals>;
  customCategories: CustomExpenseCategory[];
  today: string;
  onNavigate: (view: View) => void;
  onAddTransaction: () => void;
}) {
  const { c, locale, formatCurrency, formatPercent, formatDate, t } = useI18n();
  const vi = locale === 'vi';
  const [period, setPeriod] = useState<CashflowPeriod>('30d');
  const upcoming = [...subscriptions].sort((a, b) => a.nextRenewal.localeCompare(b.nextRenewal)).slice(0, 3);
  const balanceLabel = formatCurrency(summary.availableBalance);
  const incomeLabel = formatCurrency(summary.incomeThisMonth);
  const expenseLabel = formatCurrency(summary.expenseThisMonth);
  return (
    <div className="overview-layout">
      <div className="overview-primary">
        <section className="balance-surface surface-raised" aria-labelledby="balance-title">
          <div className="balance-topline"><span id="balance-title">{vi ? 'Tiền đang có' : 'Money on hand'}</span><button type="button" className="icon-plain" onClick={() => onAccounts()} aria-label={vi ? 'Quản lý nguồn tiền' : 'Manage accounts'}><Wallet size={21} weight="bold" aria-hidden="true" /></button></div>
          <strong className={`balance-value ${moneyDensityClass(balanceLabel)}`.trim()} title={balanceLabel}>{balanceLabel}</strong>
          {data.accounts.some((account) => account.kind === 'credit_card') && <div className="financial-position"><div><small>{vi ? 'Dư nợ thẻ' : 'Card debt'}</small><strong>{formatCurrency(summary.cardDebt)}</strong>{summary.cardCredit > 0 && <small>{vi ? 'Số dư có trên thẻ: ' : 'Credit held on cards: '}{formatCurrency(summary.cardCredit)}</small>}</div><div><small>{vi ? 'Tài sản ròng đang theo dõi' : 'Tracked net worth'}</small><strong>{formatCurrency(summary.netWorth)}</strong></div></div>}
          {summary.valuationDate && <small className="valuation-note">{vi ? 'Ước tính bằng VND · tỷ giá từ ' : 'Estimated in VND · rates from '}{formatDate(summary.valuationDate)}</small>}
          {summary.missingCurrencies.length > 0 && <small className="valuation-note is-warning">{vi ? 'Tổng chưa bao gồm ' : 'Totals do not yet include '}{summary.missingCurrencies.join(', ')}. <button type="button" className="quiet-link" onClick={() => onAccounts()}>{vi ? 'Bổ sung tỷ giá' : 'Add exchange rates'}</button></small>}
          <div className="summary-pair">
            <div className="summary-metric"><span className="metric-icon positive"><ArrowUpRight size={18} weight="bold" aria-hidden="true" /></span><span><small>{c.overview.incomeThisMonth}</small><strong className={moneyDensityClass(incomeLabel)} title={incomeLabel}>{incomeLabel}</strong><em className="positive-copy">{c.overview.recordedThisMonth}</em></span></div>
            <div className="summary-divider" aria-hidden="true" />
            <div className="summary-metric"><span className="metric-icon negative"><ArrowDownRight size={18} weight="bold" aria-hidden="true" /></span><span><small>{c.overview.spendingThisMonth}</small><strong className={moneyDensityClass(expenseLabel)} title={expenseLabel}>{expenseLabel}</strong><em className="negative-copy">{t('overview.incomeShare', { percent: formatPercent(summary.incomeThisMonth > 0 ? summary.expenseThisMonth / summary.incomeThisMonth : 0) })}</em></span></div>
          </div>
          {summary.unconvertedTransactionCount > 0 && <small className="valuation-note is-warning">{vi ? `${summary.unconvertedTransactionCount} giao dịch tháng này chưa quy đổi, chưa tính vào thu/chi.` : `${summary.unconvertedTransactionCount} transactions this month are not converted and are excluded from income/spending.`}</small>}
        </section>
        <AccountsOverview data={data} onOpen={onAccounts} />
        <RenewalSchedule subscriptions={upcoming} today={today} onOpen={() => onNavigate('subscriptions')} className="mobile-renewal-schedule surface-raised" />
        <CashflowPanel data={data} transactions={transactions} today={today} period={period} onPeriodChange={setPeriod} />
        <section className="activity-panel surface-raised">
          <div className="section-heading"><h2>{c.overview.recentTransactions}</h2><button type="button" className="quiet-link" onClick={() => onNavigate('transactions')}>{c.overview.viewAll} <CaretRight size={14} weight="bold" aria-hidden="true" /></button></div>
          <TransactionList data={data} transactions={transactions.slice(0, 3)} compact />
          <button className="mobile-inline-action" type="button" onClick={onAddTransaction}><Plus size={18} weight="bold" aria-hidden="true" /> {c.actions.addTransaction}</button>
        </section>
      </div>
      <SubscriptionOverview subscriptions={upcoming} totals={subscriptionTotals} today={today} onOpen={() => onNavigate('subscriptions')} />
    </div>
  );
}

function renewalLabel(value: string, today: string, c: ReturnType<typeof useI18n>['c'], plural: ReturnType<typeof useI18n>['plural']) {
  const days = dateOnlyDayDifference(today, value);
  if (days === 0) return c.renewals.today;
  if (days < 0) return plural('renewals.overdueBy', Math.abs(days));
  return plural('renewals.daysAway', days);
}

function RenewalSchedule({ subscriptions, today, onOpen, className = '' }: { subscriptions: Subscription[]; today: string; onOpen: () => void; className?: string }) {
  const { c, formatDate, plural } = useI18n();
  const gradientId = `renewal-spectrum-${useId().replaceAll(':', '')}`;
  const plotted = subscriptions.slice(0, 3);
  const points = renewalOrbitPoints[plotted.length] ?? [];
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  return (
    <section className={`renewal-schedule ${className}`.trim()} aria-label={c.renewals.scheduleAria}>
      <h2 className="renewal-schedule-mobile-title">{c.renewals.title}</h2>
      {plotted.length > 0 ? (
        <div className="renewal-orbit-layout">
          <div className="renewal-orbit-figure" data-count={plotted.length} aria-hidden="true">
            <svg className="renewal-orbit" viewBox="0 0 160 160">
              <defs>
                <linearGradient id={gradientId} x1="112" y1="27" x2="112" y2="133" gradientUnits="userSpaceOnUse">
                  {plotted.map((item, index) => <stop key={item.id} offset={`${plotted.length === 1 ? 0 : (index / (plotted.length - 1)) * 100}%`} stopColor={`var(--renewal-rank-${index + 1})`} />)}
                </linearGradient>
              </defs>
              <circle className="renewal-orbit-track" cx="80" cy="80" r="62" pathLength="100" />
              <circle className="renewal-orbit-lip" cx="80" cy="80" r="62" pathLength="100" />
              {plotted.length > 1 && firstPoint && lastPoint && <path className="renewal-orbit-window" stroke={`url(#${gradientId})`} d={`M ${firstPoint.x} ${firstPoint.y} A 62 62 0 0 1 ${lastPoint.x} ${lastPoint.y}`} />}
              {plotted.map((item, index) => (
                <g className="renewal-orbit-marker" data-slot={index + 1} transform={`translate(${points[index].x} ${points[index].y})`} key={item.id}>
                  <circle className="renewal-orbit-marker-halo" r="13" />
                  <circle className="renewal-orbit-marker-dot" r="10" />
                  <text className="renewal-orbit-marker-index" y="0.5">{index + 1}</text>
                </g>
              ))}
            </svg>
            <span className="renewal-orbit-center"><strong>{plotted.length}</strong><small>{plural('renewals.upcomingCount', plotted.length)}</small></span>
          </div>
          <ol className="renewal-orbit-list" style={{ gridTemplateRows: `repeat(${plotted.length}, minmax(44px, auto))` }}>
            {plotted.map((item, index) => (
              <li key={item.id}>
                <button className="renewal-orbit-row" data-slot={index + 1} type="button" onClick={onOpen}>
                  <span className="renewal-orbit-key" aria-hidden="true">{index + 1}</span>
                  <span className="renewal-orbit-copy"><span className="renewal-service-name">{item.name}</span><strong><time dateTime={item.nextRenewal}>{formatDate(item.nextRenewal)}</time></strong><small className={dateOnlyDayDifference(today, item.nextRenewal) < 0 ? 'is-overdue' : ''}>{renewalLabel(item.nextRenewal, today, c, plural)}</small></span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : <p className="renewal-empty">{c.renewals.emptySchedule}</p>}
    </section>
  );
}

function CashflowPanel({ data, transactions, today, period, onPeriodChange }: { data: FinanceData; transactions: Transaction[]; today: string; period: CashflowPeriod; onPeriodChange: (period: CashflowPeriod) => void }) {
  const { c, locale, formatCompactNumber, formatCurrency, localeTag } = useI18n();
  const vi = locale === 'vi';
  const [mode, setMode] = useState<'spending' | 'liquid'>('spending');
  const options: Array<{ id: CashflowPeriod; label: string }> = [
    { id: '7d', label: c.cashflow.period.sevenDays },
    { id: '30d', label: c.cashflow.period.thirtyDays },
    { id: '6m', label: c.cashflow.period.sixMonths },
    { id: '1y', label: c.cashflow.period.oneYear },
  ];
  const points = mode === 'spending' ? deriveCashflowSeries(transactions, period, dateReference(today)) : deriveLiquiditySeries(data, period, dateReference(today));
  const missing = points.reduce((sum, point) => sum + point.unconvertedTransactionCount, 0);
  const chartTitle = mode === 'spending' ? (vi ? 'Thu nhập và chi tiêu' : 'Income and spending') : (vi ? 'Biến động tiền đang có' : 'Money on hand movement');
  const values = points.map((point) => point.net);
  const maxMagnitude = Math.max(...values.map((point) => Math.abs(point)), 1);
  const scale = Math.ceil(maxMagnitude / 1_000_000) * 1_000_000;
  const labelIndexes = [0, Math.floor((points.length - 1) / 3), Math.floor(((points.length - 1) * 2) / 3), points.length - 1];
  const labels = labelIndexes.map((index) => {
    const point = points[Math.max(0, index)];
    const options: Intl.DateTimeFormatOptions = period === '7d' ? { weekday: 'short' } : period === '30d' ? { day: '2-digit', month: '2-digit' } : { month: 'short' };
    return new Intl.DateTimeFormat(localeTag, options).format(new Date(`${point.startDate}T12:00:00`));
  });
  const net = values.reduce((sum, value) => sum + value, 0);
  if (transactions.length === 0) return (
    <section className="cashflow-panel surface-raised">
      <div className="section-heading"><h2>{vi ? 'Thu nhập và chi tiêu' : 'Income and spending'}</h2></div>
      <div className="cashflow-empty"><TrendUp size={30} weight="bold" aria-hidden="true" /><strong>{vi ? 'Dòng tiền bắt đầu từ giao dịch của bạn' : 'Your cash flow starts with a transaction'}</strong><p>{vi ? 'Ghi khoản thu hoặc chi đầu tiên để xem tiền thay đổi theo thời gian.' : 'Record your first income or expense to see how your money changes over time.'}</p></div>
    </section>
  );
  return (
    <section className="cashflow-panel surface-raised">
      <div className="section-heading cashflow-heading">
        <div><h2>{chartTitle}</h2><span className={`cashflow-net ${net >= 0 ? 'is-positive' : 'is-negative'}`}>{net >= 0 ? '+' : ''}{formatCurrency(net)}</span></div>
        <div className="segmented-control" role="group" aria-label={c.cashflow.rangeAria}>{options.map((option) => <button key={option.id} type="button" className={period === option.id ? 'is-active' : ''} onClick={() => onPeriodChange(option.id)} aria-pressed={period === option.id}>{option.label}</button>)}</div>
      </div>
      <div className="cashflow-mode" role="group" aria-label={vi ? 'Nội dung biểu đồ' : 'Chart measure'}><button type="button" aria-pressed={mode === 'spending'} onClick={() => setMode('spending')}>{vi ? 'Thu / Chi' : 'Income / Spending'}</button><button type="button" aria-pressed={mode === 'liquid'} onClick={() => setMode('liquid')}>{vi ? 'Tiền đang có' : 'Money on hand'}</button></div>
      <p className="field-help">{mode === 'spending' ? (vi ? 'Mua bằng thẻ tính vào chi tiêu; chuyển tiền và trả nợ thẻ không tính lần nữa.' : 'Card purchases count as spending. Transfers and card repayments do not count again.') : (vi ? 'Gồm tiền trả nợ thẻ và điều chỉnh đối chiếu. Chuyển giữa nguồn tiền của bạn được bù trừ; số dư ban đầu và thiết lập nguồn không tính vào biểu đồ.' : 'Includes card repayments and reconciliation adjustments. Transfers between cash accounts cancel out; opening balances and account setup are excluded.')}</p>
      {missing > 0 && <p className="valuation-note is-warning">{vi ? `${missing} khoản chưa quy đổi; biểu đồ chưa đầy đủ.` : `${missing} unconverted entries; this chart is incomplete.`}</p>}
      <div className="chart-scale" aria-hidden="true"><span>{formatCompactNumber(scale)}</span><span>0</span><span>-{formatCompactNumber(scale)}</span></div>
      <div className="cashflow-chart" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(3px, 1fr))` }} role="img" aria-label={`${chartTitle}: ${formatCurrency(net)}`}>
        <span className="zero-line" aria-hidden="true" />
        {values.map((point, index) => <span className="chart-column" key={points[index].key}><i className={point >= 0 ? 'bar-positive' : 'bar-negative'} style={{ height: `${point === 0 ? 2 : Math.max(8, Math.round((Math.abs(point) / maxMagnitude) * 68))}px` }} /></span>)}
      </div>
      <div className="chart-labels" aria-hidden="true">{labels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
    </section>
  );
}

function SubscriptionOverview({ subscriptions, totals, today, onOpen }: { subscriptions: Subscription[]; totals: ReturnType<typeof deriveSubscriptionTotals>; today: string; onOpen: () => void }) {
  const { c, locale, localeTag } = useI18n();
  const monthlyLabel = formatSubscriptionTotals(totals, 'monthly', localeTag);
  return (
    <aside className="subscription-overview surface-raised" aria-labelledby="renewal-title">
      <div className="section-heading"><h2 id="renewal-title">{c.renewals.title}</h2><button type="button" className="icon-plain" onClick={onOpen} aria-label={c.renewals.openAria}><DotsThree size={22} weight="bold" aria-hidden="true" /></button></div>
      <RenewalSchedule subscriptions={subscriptions} today={today} onOpen={onOpen} />
      <div className="subscription-preview-list">
        {subscriptions.map((item) => {
          const amountLabel = formatSubscriptionMoney(item.amount, item.currency, localeTag);
          const catalogPlan = findCatalogPlan(item.serviceId, item.planId);
          const planLabel = catalogPlan ? catalogPlanLabel(catalogPlan, locale) : item.planKey ? c.demo.plans[item.planKey] : item.plan;
          return (
            <button className="subscription-preview-row" type="button" onClick={onOpen} key={item.id}>
              <ServiceIcon serviceId={item.serviceId} name={item.name} monogram={item.monogram} tone={item.tone} />
              <span className="subscription-preview-copy"><strong>{item.name}</strong>{planLabel && <small>{planLabel}</small>}</span>
              <strong className={`subscription-preview-price ${moneyDensityClass(amountLabel)}`.trim()} title={amountLabel}>{amountLabel}</strong><CaretRight size={16} weight="bold" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <button className="subscription-total" type="button" onClick={onOpen}><span>{c.renewals.totalPerMonth}</span><strong className={moneyDensityClass(monthlyLabel)} title={monthlyLabel}>{monthlyLabel}</strong></button>
      <p className="demo-note">{c.storage.localOnly}</p>
    </aside>
  );
}

function SubscriptionsView({ accounts, subscriptions, totals, today, onAdd, onEdit, onToggle, onDelete, onRecordPayment }: {
  accounts: Account[];
  subscriptions: Subscription[];
  totals: ReturnType<typeof deriveSubscriptionTotals>;
  today: string;
  onAdd: () => void;
  onEdit: (item: Subscription) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onRecordPayment: (id: string) => void;
}) {
  const { c, formatDate, locale, localeTag, plural, t } = useI18n();
  const sorted = [...subscriptions].sort((a, b) => a.nextRenewal.localeCompare(b.nextRenewal));
  const monthlyLabel = formatSubscriptionTotals(totals, 'monthly', localeTag);
  const annualLabel = formatSubscriptionTotals(totals, 'annual', localeTag);
  return (
    <div className="subscriptions-view">
      <section className="subscription-summary surface-raised">
        <div><span>{c.subscriptions.monthlyTotal}</span><strong className={moneyDensityClass(monthlyLabel)} title={monthlyLabel}>{monthlyLabel}<small> {c.subscriptions.perMonth}</small></strong></div>
        <div><span>{c.subscriptions.annualEstimate}</span><strong className={moneyDensityClass(annualLabel)} title={annualLabel}>{annualLabel}</strong></div>
        <button className="secondary-action" type="button" onClick={onAdd}><Plus size={18} weight="bold" aria-hidden="true" /> {c.actions.addSubscriptionShort}</button>
      </section>
      <section className="full-view surface-raised">
        <div className="section-heading subscription-list-heading"><h2>{c.subscriptions.renewingSoon}</h2><span>{plural('subscriptions.activeCount', totals.activeCount)}</span></div>
        <div className="subscription-management-list">
          {sorted.map((item) => {
            const relativeDays = dateOnlyDayDifference(today, item.nextRenewal);
            const amountLabel = formatSubscriptionMoney(item.amount, item.currency, localeTag);
            const catalogPlan = findCatalogPlan(item.serviceId, item.planId);
            const planLabel = catalogPlan ? catalogPlanLabel(catalogPlan, locale) : item.planKey ? c.demo.plans[item.planKey] : item.plan;
            return (
              <article className={`subscription-management-row ${item.status === 'paused' ? 'is-paused' : ''}`} key={item.id}>
                <ServiceIcon serviceId={item.serviceId} name={item.name} monogram={item.monogram} tone={item.tone} large />
                <span className="subscription-main"><strong>{item.name}</strong>{planLabel && <small>{planLabel}</small>}<span className="subscription-account-label">{(() => { const account = accounts.find((candidate) => candidate.id === item.accountId); return account ? accountDisplayName(account, locale) : undefined; })() ?? (locale === 'vi' ? 'Chọn nguồn khi thanh toán' : 'Choose account when paying')}</span></span>
                <span className={`status-label status-${item.status}`}>{c.subscriptions.status[item.status]}</span>
                <span className={`subscription-date ${relativeDays < 0 ? 'is-overdue' : ''}`}><strong>{formatDate(item.nextRenewal)}</strong><small>{renewalLabel(item.nextRenewal, today, c, plural)}</small></span>
                <span className="subscription-price"><strong className={moneyDensityClass(amountLabel)} title={amountLabel}>{amountLabel}</strong><small>{item.cycle === 'year' ? c.subscriptions.cycle.perYear : c.subscriptions.cycle.perMonth}</small></span>
                <div className="management-actions">
                  <button type="button" disabled={item.status === 'paused'} onClick={() => onRecordPayment(item.id)} aria-label={t('subscriptions.recordPaymentAria', { name: item.name })} title={c.subscriptions.recordPayment}><CheckCircle size={18} weight="bold" aria-hidden="true" /></button>
                  <button type="button" onClick={() => onEdit(item)} aria-label={t('subscriptions.editAria', { name: item.name })} title={c.common.edit}><PencilSimple size={18} weight="bold" aria-hidden="true" /></button>
                  <button type="button" onClick={() => onToggle(item.id)} aria-label={t(item.status === 'paused' ? 'subscriptions.resumeAria' : 'subscriptions.pauseAria', { name: item.name })}>{item.status === 'paused' ? <Play size={18} weight="bold" aria-hidden="true" /> : <Pause size={18} weight="bold" aria-hidden="true" />}</button>
                  <button type="button" onClick={() => onDelete(item.id)} aria-label={t('subscriptions.deleteAria', { name: item.name })} title={c.common.delete}><Trash size={18} weight="bold" aria-hidden="true" /></button>
                </div>
              </article>
            );
          })}
          {sorted.length === 0 && <div className="empty-state"><CreditCard size={30} weight="duotone" aria-hidden="true" /><strong>{c.subscriptions.emptyTitle}</strong><span>{c.subscriptions.emptyBody}</span><button type="button" onClick={onAdd}>{c.actions.addSubscriptionShort}</button></div>}
        </div>
      </section>
    </div>
  );
}

function BudgetsView({ usage, customCategories, today, onAdd, onEdit, onDelete }: { usage: ReturnType<typeof deriveBudgetUsage>; customCategories: CustomExpenseCategory[]; today: string; onAdd: () => void; onEdit: (item: Budget) => void; onDelete: (id: string) => void }) {
  const { c, locale, formatCurrency, formatMonthYear, formatPercent, t } = useI18n();
  const total = usage.reduce((sum, item) => sum + item.limit, 0);
  const used = usage.reduce((sum, item) => sum + item.spent, 0);
  const month = formatMonthYear(today);
  const totalRatio = total > 0 ? used / total : 0;
  const totalLabel = formatCurrency(total);
  const usedLabel = formatCurrency(used);
  return (
    <div className="budgets-view">
      <section className="budget-hero surface-raised"><div><span>{t('budgets.totalForMonth', { month })}</span><strong className={moneyDensityClass(totalLabel)} title={totalLabel}>{totalLabel}</strong></div><div><span>{c.budgets.used}</span><strong className={moneyDensityClass(usedLabel)} title={usedLabel}>{usedLabel}</strong><small>{t('budgets.totalShare', { percent: formatPercent(totalRatio) })}</small></div><TrendUp size={42} weight="duotone" aria-hidden="true" /></section>
      <section className="full-view surface-raised">
        <div className="section-heading budget-list-heading"><h2>{c.budgets.byCategory}</h2><div><span>{month}</span><button className="quiet-link" type="button" onClick={onAdd}><Plus size={15} weight="bold" aria-hidden="true" />{c.actions.addBudget}</button></div></div>
        <div className="budget-list">
          {usage.map((budget) => {
            const ratio = budget.limit > 0 ? budget.spent / budget.limit : 0;
            const percent = Math.round(ratio * 100);
            const warning = percent >= 90;
            const over = percent > 100;
            const amount = formatCurrency(Math.abs(budget.limit - budget.spent));
            return (
              <article className="budget-row" key={budget.id}>
                <span className={`budget-icon ${over ? 'is-over' : warning ? 'is-warning' : ''}`}><CategoryIcon icon={expenseCategoryIcon(budget.category, customCategories)} size={20} weight="fill" aria-hidden="true" /></span>
                <span className="budget-copy"><strong>{expenseCategoryLabel(c, budget.category, customCategories)}</strong><small>{formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}</small>{budget.unconvertedTransactionCount > 0 && <small className="valuation-note is-warning">{locale === 'vi' ? `${budget.unconvertedTransactionCount} khoản chưa quy đổi; chi tiêu chưa đầy đủ.` : `${budget.unconvertedTransactionCount} unconverted entries; spending is incomplete.`}</small>}</span>
                <span className={`budget-status ${over ? 'is-over' : warning ? 'is-warning' : ''}`}>{t(over ? 'budgets.overBy' : 'budgets.remaining', { amount })}</span>
                <span className="budget-percentage">{formatPercent(ratio)}</span>
                <span className="budget-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(percent, 100))} aria-label={t('budgets.usedAria', { percent: formatPercent(ratio) })}><i className={over ? 'is-over' : warning ? 'is-warning' : ''} style={{ width: `${Math.max(0, Math.min(percent, 100))}%` }} /></span>
                <div className="budget-actions"><button type="button" onClick={() => onEdit(budget)} aria-label={t('budgets.editAria', { category: expenseCategoryLabel(c, budget.category, customCategories) })}><PencilSimple size={18} weight="bold" aria-hidden="true" /></button><button type="button" onClick={() => onDelete(budget.id)} aria-label={t('budgets.deleteAria', { category: expenseCategoryLabel(c, budget.category, customCategories) })}><Trash size={18} weight="bold" aria-hidden="true" /></button></div>
              </article>
            );
          })}
          {usage.length === 0 && <div className="empty-state"><ChartDonut size={30} weight="duotone" aria-hidden="true" /><strong>{c.budgets.emptyTitle}</strong><span>{c.budgets.emptyBody}</span><button type="button" onClick={onAdd}>{c.actions.addBudget}</button></div>}
        </div>
      </section>
    </div>
  );
}

function isSafeAmount(value: number) { return Number.isSafeInteger(value) && value > 0; }

function SubscriptionSheet({ initial, accounts, today, onClose, onSave }: { initial?: Subscription; accounts: Account[]; today: string; onClose: () => void; onSave: (input: SubscriptionInput, existing?: Subscription) => Promise<unknown> }) {
  const { c, formatDate, locale, localeTag, t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const inferredService = findCatalogServiceById(initial?.serviceId) ?? (initial ? findCatalogServiceByName(initial.name) : undefined);
  const inferredPlan = inferredService?.plans.find((candidate) => (
    initial !== undefined
    && candidate.amount === initial.amount
    && candidate.currency === initial.currency
    && candidate.cycle === initial.cycle
    && (initial.planId === undefined || candidate.id === initial.planId)
  ));
  const [serviceChoice, setServiceChoice] = useState(
    initial ? inferredService?.id ?? MANUAL_SERVICE_ID : '',
  );
  const [planChoice, setPlanChoice] = useState(
    inferredPlan?.id ?? (initial ? MANUAL_PLAN_ID : ''),
  );
  const [name, setName] = useState(initial?.name ?? '');
  const [plan, setPlan] = useState(initial?.planKey ? c.demo.plans[initial.planKey] : initial?.plan ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [currency, setCurrency] = useState<SubscriptionCurrency>(initial?.currency ?? 'VND');
  const [cycle, setCycle] = useState<BillingCycle>(initial?.cycle ?? 'month');
  const [nextRenewal, setNextRenewal] = useState(initial?.nextRenewal ?? addDaysDateOnly(today, 7));
  const [accountId, setAccountId] = useState(initial?.accountId ?? '');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const selectedService = findCatalogServiceById(serviceChoice);
  const selectedPlan = findCatalogPlan(serviceChoice, planChoice);
  const isManualService = serviceChoice === MANUAL_SERVICE_ID;
  const usesManualPrice = isManualService || planChoice === MANUAL_PLAN_ID || (selectedPlan !== undefined && !catalogPlanCanAutofill(selectedPlan));
  const priceNotice = selectedService ? catalogPriceNotice(selectedService, locale) : undefined;

  function chooseService(value: string) {
    setServiceChoice(value);
    setErrors((current) => ({ ...current, serviceChoice: '', name: '', planChoice: '' }));
    if (value === MANUAL_SERVICE_ID) {
      setPlanChoice(MANUAL_PLAN_ID);
      setName('');
      setPlan('');
      setAmount('');
      return;
    }
    const service = findCatalogServiceById(value);
    if (!service) {
      setPlanChoice('');
      return;
    }
    setName(service.name);
    setPlan('');
    setAmount('');
    const onlyPlan = service.plans.length === 1 ? service.plans[0] : undefined;
    setPlanChoice(onlyPlan?.id ?? (service.plans.length === 0 ? MANUAL_PLAN_ID : ''));
    if (onlyPlan && !catalogPlanCanAutofill(onlyPlan)) {
      setPlan(onlyPlan.label);
      setAmount(String(onlyPlan.amount));
      setCurrency(onlyPlan.currency);
      setCycle(onlyPlan.cycle);
    }
  }

  function choosePlan(value: string) {
    setPlanChoice(value);
    setErrors((current) => ({ ...current, planChoice: '', amount: '' }));
    const candidate = selectedService?.plans.find((item) => item.id === value);
    if (candidate && !catalogPlanCanAutofill(candidate)) {
      setPlan(candidate.label);
      setAmount(String(candidate.amount));
      setCurrency(candidate.currency);
      setCycle(candidate.cycle);
      return;
    }
    setPlan('');
    setAmount('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const catalogSelection = selectedService && selectedPlan && !usesManualPrice ? selectedPlan : undefined;
    const finalName = selectedService?.name ?? name.trim();
    const finalPlan = catalogSelection?.label ?? selectedPlan?.label ?? plan.trim();
    const numericAmount = catalogSelection?.amount ?? Number(amount);
    const finalCurrency = catalogSelection?.currency ?? currency;
    const finalCycle = catalogSelection?.cycle ?? cycle;
    const nextErrors: Record<string, string> = {};
    if (!serviceChoice) nextErrors.serviceChoice = c.validation.serviceChoice;
    if (isManualService && !name.trim()) nextErrors.name = c.validation.serviceName;
    if (selectedService && selectedService.plans.length > 0 && !planChoice) nextErrors.planChoice = c.validation.subscriptionPlan;
    if (!numericAmount || numericAmount <= 0) nextErrors.amount = c.validation.positiveAmount;
    else if (!isSafeSubscriptionAmount(numericAmount, finalCurrency)) nextErrors.amount = c.validation.unsafeAmount;
    if (!nextRenewal) nextErrors.nextRenewal = c.validation.renewalDate;
    else if (!initial && nextRenewal < today) nextErrors.nextRenewal = c.validation.renewalPast;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { focusFirstInvalid(formRef.current); return; }
    setBusy(true);
    try {
    await onSave({
      accountId: accountId || undefined,
      serviceId: selectedService?.id,
      planId: selectedPlan?.id,
      name: finalName,
      plan: finalPlan,
      amount: numericAmount,
      currency: finalCurrency,
      cycle: finalCycle,
      nextRenewal,
    }, initial);
    onClose();
    } catch (error) { setErrors({ form: financeError(error, locale) }); }
    finally { setBusy(false); }
  }

  const displayedPrice = selectedPlan
    ? formatSubscriptionMoney(selectedPlan.amount, selectedPlan.currency, localeTag)
    : undefined;
  const displayedPlanNote = selectedPlan ? catalogPlanNote(selectedPlan, locale) : undefined;
  const selectedServiceName = selectedService?.name ?? name;

  return (
    <SheetFrame title={initial ? c.subscriptionForm.editTitle : c.subscriptionForm.title} subtitle={initial ? c.subscriptionForm.editSubtitle : c.subscriptionForm.subtitle} labelledBy="subscription-sheet-title" onClose={onClose} busy={busy}>
      <form ref={formRef} onSubmit={submit} noValidate>
        <fieldset className="ledger-fields" disabled={busy}>
        <label className="field">
          <span>{c.subscriptionForm.serviceName}</span>
          <div className="catalog-select-shell">
            <ServiceIcon serviceId={selectedService?.id} name={selectedServiceName} monogram={selectedServiceName.trim().slice(0, 1).toUpperCase() || '?'} tone="graphite" />
            <select autoFocus value={serviceChoice} onChange={(event) => chooseService(event.target.value)} aria-invalid={Boolean(errors.serviceChoice)} aria-describedby={errors.serviceChoice ? 'subscription-service-error' : undefined}>
              <option value="">{c.subscriptionForm.chooseService}</option>
              {SUBSCRIPTION_CATALOG.map((service) => <option value={service.id} key={service.id}>{service.name}</option>)}
              <option value={MANUAL_SERVICE_ID}>{c.subscriptionForm.manualService}</option>
            </select>
          </div>
          {errors.serviceChoice && <small id="subscription-service-error" className="field-error" role="alert">{errors.serviceChoice}</small>}
        </label>

        {isManualService && (
          <label className="field"><span>{c.subscriptionForm.customServiceName}</span><input value={name} onChange={(event) => { setName(event.target.value); setErrors((current) => ({ ...current, name: '' })); }} placeholder={c.subscriptionForm.servicePlaceholder} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'subscription-name-error' : undefined} />{errors.name && <small id="subscription-name-error" className="field-error" role="alert">{errors.name}</small>}</label>
        )}

        {selectedService && (
          <label className="field">
            <span>{c.subscriptionForm.plan}</span>
            <select value={planChoice} onChange={(event) => choosePlan(event.target.value)} aria-invalid={Boolean(errors.planChoice)} aria-describedby={errors.planChoice ? 'subscription-plan-error' : undefined}>
              {selectedService.plans.length > 0 && <option value="">{c.subscriptionForm.choosePlan}</option>}
              {selectedService.plans.map((candidate) => <option value={candidate.id} key={candidate.id}>{catalogPlanLabel(candidate, locale)}</option>)}
              <option value={MANUAL_PLAN_ID}>{c.subscriptionForm.manualPlan}</option>
            </select>
            {errors.planChoice && <small id="subscription-plan-error" className="field-error" role="alert">{errors.planChoice}</small>}
          </label>
        )}

        {selectedPlan && displayedPrice && (
          <section className="catalog-price-card" aria-label={c.subscriptionForm.verifiedPrice}>
            <div><span>{c.subscriptionForm.verifiedPrice}</span><strong>{displayedPrice}</strong><small>{selectedPlan.cycle === 'year' ? c.subscriptionForm.cycle.year : c.subscriptionForm.cycle.month}</small></div>
            <a href={selectedPlan.sourceUrl} target="_blank" rel="noreferrer" aria-label={c.subscriptionForm.openPriceSource}>
              <ArrowSquareOut size={18} weight="bold" aria-hidden="true" />
              <span>{selectedPlan.channel === 'app-store' ? c.subscriptionForm.sourceAppStore : c.subscriptionForm.sourceWeb}</span>
            </a>
            <p>{t('subscriptionForm.checkedOn', { date: formatDate(selectedPlan.checkedAt) })}{displayedPlanNote ? ` · ${displayedPlanNote}` : ''}</p>
          </section>
        )}

        {priceNotice && <div className="catalog-price-notice" role="note"><WarningCircle size={18} weight="fill" aria-hidden="true" /><span>{priceNotice}</span></div>}

        {usesManualPrice && serviceChoice && (
          <div className="manual-plan-fields">
            {!selectedPlan && <label className="field"><span>{c.subscriptionForm.customPlanName}</span><input value={plan} onChange={(event) => setPlan(event.target.value)} placeholder={c.subscriptionForm.planPlaceholder} /></label>}
            <div className="split-fields">
              <label className="field"><span>{c.subscriptionForm.cost}</span><div className="money-input"><input inputMode="decimal" value={amount} onChange={(event) => { const cleaned = event.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'); setAmount(currency === 'VND' || currency === 'JPY' || currency === 'KRW' ? cleaned.replace(/\..*$/, '') : cleaned); }} placeholder="0" aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? 'subscription-amount-error' : undefined} /><strong>{currency}</strong></div>{errors.amount && <small id="subscription-amount-error" className="field-error" role="alert">{errors.amount}</small>}</label>
              <label className="field"><span>{c.subscriptionForm.currency}</span><select value={currency} onChange={(event) => { const nextCurrency = event.target.value as SubscriptionCurrency; setCurrency(nextCurrency); if (nextCurrency === 'VND' || nextCurrency === 'JPY' || nextCurrency === 'KRW') setAmount((current) => current.replace(/\..*$/, '')); }}>{(['VND', 'USD', 'EUR', 'GBP', 'JPY', 'KRW', 'SGD', 'THB', 'AUD', 'CAD'] as const).map((code) => <option value={code} key={code}>{code}</option>)}</select></label>
            </div>
            <label className="field"><span>{c.subscriptionForm.cycle.label}</span><select value={cycle} onChange={(event) => setCycle(event.target.value as BillingCycle)}><option value="month">{c.subscriptionForm.cycle.month}</option><option value="year">{c.subscriptionForm.cycle.year}</option></select></label>
          </div>
        )}

        <label className="field"><span>{c.subscriptionForm.renewalDate}</span><input type="date" min={initial ? undefined : today} value={nextRenewal} onChange={(event) => setNextRenewal(event.target.value)} aria-invalid={Boolean(errors.nextRenewal)} aria-describedby={errors.nextRenewal ? 'subscription-renewal-error' : undefined} />{errors.nextRenewal && <small id="subscription-renewal-error" className="field-error" role="alert">{errors.nextRenewal}</small>}</label>
<label className="field"><span>{locale === 'vi' ? 'Nguồn thanh toán mặc định' : 'Default payment account'}</span><select value={accountId} onChange={(event) => setAccountId(event.target.value)}><option value="">{locale === 'vi' ? 'Chọn khi ghi nhận thanh toán' : 'Choose when recording payment'}</option>{accounts.filter((account) => (!account.archived && account.kind !== 'legacy') || account.id === initial?.accountId).map((account) => <option key={account.id} value={account.id} disabled={account.archived}>{accountDisplayName(account, locale)} · {account.currency}</option>)}</select><small className="field-help">{locale === 'vi' ? 'Đổi nguồn chỉ áp dụng cho các lần thanh toán sau.' : 'Changing this only affects future payments.'}</small></label>
        {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
        <div className="info-callout"><CalendarBlank size={20} weight="bold" aria-hidden="true" /><span>{t('subscriptionForm.callout', { appName: APP_NAME })}</span></div>
        <div className="sheet-actions"><button type="button" className="cancel-action" onClick={onClose}>{c.common.cancel}</button><button type="submit" className="primary-action">{initial ? c.subscriptionForm.update : c.subscriptionForm.save}</button></div>
        </fieldset>
      </form>
    </SheetFrame>
  );
}

function BudgetSheet({ initial, budgets, customCategories, onClose, onSave }: { initial?: Budget; budgets: Budget[]; customCategories: CustomExpenseCategory[]; onClose: () => void; onSave: (input: BudgetInput, existing?: Budget) => Promise<unknown> }) {
  const { c, currencySymbol, locale } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const firstAvailable = EXPENSE_CATEGORY_DEFINITIONS.find((category) => category.id !== 'other' && !budgets.some((item) => item.category === category.id))?.id ?? 'dining';
  const [category, setCategory] = useState<ExpenseCategoryId>(initial?.category ?? firstAvailable);
  const [pendingCustomCategory, setPendingCustomCategory] = useState<CustomExpenseCategory | undefined>();
  const [limit, setLimit] = useState(initial ? String(initial.limit) : '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const numericLimit = Number(limit);
    const nextErrors: Record<string, string> = {};
    if (!category) nextErrors.category = c.validation.budgetCategory;
    else if (budgets.some((item) => item.category === category && item.id !== initial?.id)) nextErrors.category = c.validation.budgetDuplicate;
    if (!numericLimit || numericLimit <= 0) nextErrors.limit = c.validation.budgetLimit;
    else if (!isSafeAmount(numericLimit)) nextErrors.limit = c.validation.unsafeAmount;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { focusFirstInvalid(formRef.current); return; }
    setBusy(true);
    try { await onSave({ category, limit: numericLimit, customCategory: pendingCustomCategory }, initial); onClose(); }
    catch (error) { setErrors({ form: financeError(error, locale) }); }
    finally { setBusy(false); }
  }
  return (
    <SheetFrame title={initial ? c.budgetForm.editTitle : c.budgetForm.addTitle} subtitle={initial ? c.budgetForm.editSubtitle : c.budgetForm.addSubtitle} labelledBy="budget-sheet-title" onClose={onClose} busy={busy}>
      <form ref={formRef} onSubmit={submit} noValidate>
        <fieldset className="ledger-fields" disabled={busy}>
        <CategoryPicker autoFocus label={c.budgetForm.category} value={category} customCategories={pendingCustomCategory ? [...customCategories, pendingCustomCategory] : customCategories} onChange={(nextCategory, created) => { setCategory(nextCategory); setPendingCustomCategory((current) => created ?? (current?.id === nextCategory ? current : undefined)); }} error={errors.category} errorId="budget-category-error" />
        <label className="field"><span>{c.budgetForm.monthlyLimit}</span><div className="money-input"><input inputMode="numeric" value={limit} onChange={(event) => setLimit(event.target.value.replace(/\D/g, ''))} placeholder="0" aria-invalid={Boolean(errors.limit)} aria-describedby={errors.limit ? 'budget-limit-error' : undefined} /><strong>{currencySymbol}</strong></div>{errors.limit && <small id="budget-limit-error" className="field-error" role="alert">{errors.limit}</small>}</label>
        {errors.form && <p className="field-error" role="alert">{errors.form}</p>}
        <div className="sheet-actions"><button type="button" className="cancel-action" onClick={onClose}>{c.common.cancel}</button><button type="submit" className="primary-action">{initial ? c.budgetForm.update : c.budgetForm.save}</button></div>
        </fieldset>
      </form>
    </SheetFrame>
  );
}

function SettingsSheet({ data, storageStatus, onClose, onManageAccounts, importOnly = false, onClear, onImport, onNotify }: {
  data: FinanceData;
  storageStatus: StorageStatus;
  onClose: () => void;
  onManageAccounts: () => void;
  importOnly?: boolean;
  onClear: () => Promise<unknown>;
  onImport: (data: FinanceData) => Promise<unknown>;
  onNotify: (message: string) => void;
}) {
  const { c, locale } = useI18n();
  const [error, setError] = useState('');
  const [pendingImport, setPendingImport] = useState<FinanceData | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const confirmCancel = useRef<HTMLButtonElement>(null);
  const confirmTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!confirming) return;
    const frame = window.requestAnimationFrame(() => {
      confirmCancel.current?.scrollIntoView({ block: 'nearest' });
      confirmCancel.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [confirming]);
  function openConfirmation(trigger: HTMLButtonElement) {
    confirmTrigger.current = trigger;
    setConfirming(true);
  }
  function cancelConfirmation() {
    setConfirming(false);
    const trigger = confirmTrigger.current;
    confirmTrigger.current = null;
    window.requestAnimationFrame(() => trigger?.isConnected && trigger.focus());
  }
  function dismissSettings() {
    if (confirming) cancelConfirmation();
    else onClose();
  }
  function exportData() {
    const blob = new Blob([serializeFinanceData(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `tally-backup-${localTodayIso()}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    onNotify(c.toast.dataExported);
  }
  async function importData(event: ChangeEvent<HTMLInputElement>) {
    if (isImporting) return;
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 2_000_000) { setError(c.toast.importInvalid); return; }
    setIsImporting(true);
    try {
      const parsed = parseFinanceData(await file.text());
      if (parsed.status !== 'ok') { setIsImporting(false); setError(c.toast.importInvalid); return; }
      if (parsed.data.mode === 'demo') { setIsImporting(false); setError(locale === 'vi' ? 'Đây là bản dữ liệu mẫu. Hãy chọn bản sao lưu dữ liệu cá nhân của bạn.' : 'This is a sample ledger. Choose a backup of your personal data.'); return; }
      setIsImporting(false);
      setPendingImport(parsed.data);
      setError('');
    } catch {
      setIsImporting(false);
      setError(c.toast.importInvalid);
    }
  }
  const statusCopy = storageStatus === 'loading'
    ? c.storage.loading
    : storageStatus === 'saving'
      ? c.storage.saving
      : storageStatus === 'saved'
        ? c.storage.saved
        : storageStatus === 'future'
          ? c.storage.readOnly
          : c.storage.error;
  return (
    <SheetFrame title={importOnly ? c.settings.importData : c.settings.title} subtitle={importOnly ? (locale === 'vi' ? 'Tiếp tục từ bản sao lưu Tally trên thiết bị của bạn.' : 'Continue with a Tally backup from your device.') : c.settings.subtitle} labelledBy="settings-sheet-title" onClose={dismissSettings} className="settings-sheet" busy={busy || isImporting}>
      <div className="settings-content">
        <div className="privacy-callout"><ShieldCheck size={24} weight="duotone" aria-hidden="true" /><span><strong>{c.settings.localOnlyTitle}</strong><small>{c.settings.localOnlyBody}</small></span></div>
        <span className={`settings-storage-state is-${storageStatus}`}><i aria-hidden="true" />{statusCopy}</span>
        {!importOnly && <button type="button" className="settings-row" onClick={onManageAccounts}><span><strong>{locale === 'vi' ? 'Nguồn tiền, số dư và tỷ giá' : 'Accounts, balances and exchange rates'}</strong><small>{locale === 'vi' ? 'Quản lý từng nguồn và đối chiếu số dư thực tế.' : 'Manage each account and reconcile its balance.'}</small></span><Wallet size={22} weight="bold" /></button>}
        {error && <p className="field-error" role="alert">{error}</p>}
        {pendingImport && <div className="inline-confirm" role="group" aria-label={locale === 'vi' ? 'Xác nhận nhập dữ liệu' : 'Confirm backup import'}><div><strong>{locale === 'vi' ? 'Thay dữ liệu hiện tại bằng bản sao lưu?' : 'Replace the current ledger with this backup?'}</strong><small>{pendingImport.accounts.length} {locale === 'vi' ? 'nguồn tiền' : 'accounts'} · {pendingImport.transactions.length} {locale === 'vi' ? 'giao dịch' : 'transactions'}</small></div><div><button type="button" className="cancel-action" disabled={busy} onClick={() => setPendingImport(null)}>{c.common.cancel}</button><button type="button" className="primary-action" disabled={busy} onClick={async () => { setBusy(true); try { await onImport(pendingImport); onClose(); } catch (failure) { setError(financeError(failure, locale)); } finally { setBusy(false); } }}>{c.settings.importData}</button></div></div>}
        <div className="settings-grid">
          {!importOnly && <button type="button" className="settings-card" onClick={exportData}><DownloadSimple size={22} weight="bold" aria-hidden="true" /><span><strong>{c.settings.exportData}</strong><small>{c.settings.exportDataBody}</small></span></button>}
          <button type="button" className="settings-card" disabled={isImporting} aria-busy={isImporting} onClick={() => fileInput.current?.click()}>{isImporting ? <CircleNotch className="loading-spinner" size={22} weight="bold" aria-hidden="true" /> : <UploadSimple size={22} weight="bold" aria-hidden="true" />}<span><strong>{isImporting ? c.settings.importingData : c.settings.importData}</strong><small>{c.settings.importDataBody}</small></span></button>
          <input ref={fileInput} hidden type="file" accept="application/json,.json" disabled={isImporting} onChange={importData} aria-label={c.settings.importFileAria} />
        </div>
        {!importOnly && <div className="settings-danger-zone">
          <button type="button" className="settings-row is-danger" onClick={(event) => openConfirmation(event.currentTarget)}><span><strong>{c.settings.clearAll}</strong><small>{c.settings.clearAllBody}</small></span><Trash size={19} weight="bold" aria-hidden="true" /></button>
        </div>}
        {confirming && <div className="inline-confirm" role="group" aria-labelledby="confirm-action-title" aria-describedby="confirm-action-description"><WarningCircle size={23} weight="fill" aria-hidden="true" /><div><strong id="confirm-action-title">{c.settings.confirmClearTitle}</strong><small id="confirm-action-description">{c.settings.confirmClearBody}</small></div><div><button ref={confirmCancel} type="button" className="cancel-action" onClick={cancelConfirmation}>{c.common.cancel}</button><button type="button" className="danger-action" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await onClear(); onClose(); } catch (failure) { setError(financeError(failure, locale)); } finally { setBusy(false); } }}>{c.settings.confirmClearAction}</button></div></div>}
      </div>
    </SheetFrame>
  );
}
