'use client';

import {
  ArrowDownRight,
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
  MagnifyingGlass,
  Moon,
  Pause,
  PencilSimple,
  Play,
  Plus,
  Receipt,
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
  type ReactNode,
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
  createDemoData,
  createEmptyData,
  createId,
  dateOnlyDayDifference,
  deriveBudgetUsage,
  deriveCashflowSeries,
  deriveFinanceSummary,
  deriveSubscriptionTotals,
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
  type Transaction,
} from './finance-domain';
import { CategoryIcon } from './category-icons';
import { CategoryPicker, expenseCategoryIcon, expenseCategoryLabel } from './category-picker';
import { APP_NAME, I18nProvider, useI18n, type Locale } from './i18n';
import { VIEW_ORDER, viewDirection as getViewDirection, viewFromHashValue, type View } from './navigation';
import { SERVICE_SUGGESTIONS, ServiceIcon } from './service-icons';

type Theme = 'light' | 'dark';
type TransactionType = 'income' | 'expense';
type StorageStatus = 'loading' | 'saving' | 'saved' | 'error' | 'future';
type StorageWarning = 'corrupt' | 'future' | 'error' | null;
type DialogState =
  | { kind: 'transaction'; item?: Transaction }
  | { kind: 'subscription'; item?: Subscription }
  | { kind: 'budget'; item?: Budget }
  | { kind: 'settings' }
  | null;
type ToastMessage = { id: number; message: string; undo?: () => void };
type TransactionInput = {
  title: string;
  category: ExpenseCategoryId;
  date: string;
  amount: number;
  type: TransactionType;
  customCategory?: CustomExpenseCategory;
};
type SubscriptionInput = {
  name: string;
  plan: string;
  amount: number;
  cycle: BillingCycle;
  nextRenewal: string;
};
type BudgetInput = { category: ExpenseCategoryId; limit: number; customCategory?: CustomExpenseCategory };

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
  return <Icon size={20} weight="regular" aria-hidden="true" />;
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
  const { c, t, isLocaleHydrated } = useI18n();
  const shouldReduceMotion = useReducedMotion();
  const [today, setToday] = useState(localTodayIso);
  const [data, setData] = useState<FinanceData>(() => createDemoData());
  const [view, setView] = useState<View>('overview');
  const [viewDirection, setViewDirection] = useState<1 | -1>(1);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [storageStatus, setStorageStatus] = useState<StorageStatus>('loading');
  const [storageWarning, setStorageWarning] = useState<StorageWarning>(null);
  const activeViewRef = useRef<View>('overview');
  const dialogOpener = useRef<HTMLElement | null>(null);
  const pendingViewFocusRef = useRef(false);
  const lastPersistedPayloadRef = useRef<string | null>(null);
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
  const persistenceBlocked = storageStatus === 'future';
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
    const frame = window.requestAnimationFrame(() => {
      let nextData = createDemoData();
      try {
        const raw = window.localStorage.getItem(FINANCE_STORAGE_KEY);
        const parsed = parseFinanceData(raw);
        if (parsed.status === 'ok') {
          nextData = parsed.data;
          lastPersistedPayloadRef.current = parsed.migrated ? raw : serializeFinanceData(parsed.data);
          setStorageStatus('saved');
        } else if (parsed.status === 'future-version') {
          setStorageStatus('future');
          setStorageWarning('future');
        } else if (parsed.status === 'corrupt') {
          if (raw) window.localStorage.setItem(`${FINANCE_STORAGE_KEY}-unreadable-backup`, raw);
          setStorageWarning('corrupt');
          setStorageStatus('saving');
        } else {
          setStorageStatus('saving');
        }
      } catch {
        lastPersistedPayloadRef.current = serializeFinanceData(nextData);
        setStorageStatus('error');
        setStorageWarning('error');
      }
      setData(nextData);
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated || persistenceBlocked) return;
    const payload = serializeFinanceData(data);
    if (payload === lastPersistedPayloadRef.current) return;
    const statusTimer = window.setTimeout(() => setStorageStatus('saving'), 0);
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(FINANCE_STORAGE_KEY, payload);
        lastPersistedPayloadRef.current = payload;
        setStorageStatus('saved');
      } catch {
        setStorageStatus('error');
      }
    }, 260);
    return () => {
      window.clearTimeout(statusTimer);
      window.clearTimeout(timer);
    };
  }, [data, hydrated, persistenceBlocked]);

  useEffect(() => {
    const syncFromAnotherTab = (event: StorageEvent) => {
      if (event.key !== FINANCE_STORAGE_KEY || !event.newValue) return;
      const parsed = parseFinanceData(event.newValue);
      if (parsed.status === 'ok') {
        lastPersistedPayloadRef.current = parsed.migrated ? event.newValue : serializeFinanceData(parsed.data);
        setData(parsed.data);
        setStorageStatus('saved');
      }
    };
    window.addEventListener('storage', syncFromAnotherTab);
    return () => window.removeEventListener('storage', syncFromAnotherTab);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
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

  function updateData(updater: (current: FinanceData) => FinanceData, mode: FinanceData['mode'] = 'personal') {
    if (persistenceBlocked) return;
    setData((current) => ({
      ...updater(current),
      mode,
      updatedAt: new Date().toISOString(),
    }));
  }

  function restoreSnapshot(snapshot: FinanceData, message: string) {
    setData({ ...snapshot, updatedAt: new Date().toISOString() });
    showToast(message);
  }

  function openDialog(next: Exclude<DialogState, null>) {
    dialogOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDialog(next);
  }

  function closeDialog() {
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
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    try { window.localStorage.setItem('tally-theme', next); } catch { /* Keep the in-session theme. */ }
    setTheme(next);
  }

  function saveTransaction(input: TransactionInput, existing?: Transaction) {
    const signedAmount = input.type === 'income' ? input.amount : -input.amount;
    const transaction: Transaction = {
      ...(existing ?? {}),
      id: existing?.id ?? createId('transaction'),
      title: input.title,
      titleKey: undefined,
      category: input.type === 'income' ? 'income' : input.category,
      date: input.date,
      amount: signedAmount,
    };
    updateData((current) => ({
      ...current,
      customCategories: input.customCategory && !current.customCategories.some((item) => item.id === input.customCategory?.id)
        ? [...current.customCategories, input.customCategory]
        : current.customCategories,
      transactions: existing
        ? current.transactions.map((item) => item.id === existing.id ? transaction : item)
        : [...current.transactions, transaction],
    }));
    showToast(existing ? c.toast.transactionUpdated : c.toast.transactionAdded);
  }

  function deleteTransaction(id: string) {
    const transaction = data.transactions.find((item) => item.id === id);
    if (!transaction) return;
    const snapshot = data;
    updateData((current) => ({
      ...current,
      transactions: current.transactions.filter((item) => item.id !== id),
      subscriptionPayments: transaction.subscriptionPaymentId
        ? current.subscriptionPayments.filter((item) => item.id !== transaction.subscriptionPaymentId)
        : current.subscriptionPayments,
    }));
    showToast(c.toast.transactionDeleted, () => restoreSnapshot(snapshot, c.toast.transactionRestored));
  }

  function saveSubscription(input: SubscriptionInput, existing?: Subscription) {
    const subscription: Subscription = {
      ...(existing ?? {}),
      id: existing?.id ?? createId('subscription'),
      name: input.name,
      plan: input.plan,
      planKey: undefined,
      amount: input.amount,
      cycle: input.cycle,
      nextRenewal: input.nextRenewal,
      renewalAnchorDay: Number(input.nextRenewal.slice(-2)),
      status: existing?.status ?? 'active',
      monogram: input.name.slice(0, 1).toUpperCase(),
      tone: existing?.tone ?? serviceTones[data.subscriptions.length % serviceTones.length],
    };
    updateData((current) => ({
      ...current,
      subscriptions: existing
        ? current.subscriptions.map((item) => item.id === existing.id ? subscription : item)
        : [...current.subscriptions, subscription],
    }));
    showToast(existing ? c.toast.subscriptionUpdated : c.toast.subscriptionAdded);
  }

  function toggleSubscription(id: string) {
    const subscription = data.subscriptions.find((item) => item.id === id);
    if (!subscription) return;
    const willResume = subscription.status === 'paused';
    updateData((current) => ({
      ...current,
      subscriptions: current.subscriptions.map((item) => {
        if (item.id !== id) return item;
        if (item.status === 'paused') return { ...item, status: item.previousStatus ?? 'active', previousStatus: undefined };
        return { ...item, previousStatus: item.status, status: 'paused' };
      }),
    }));
    showToast(t(willResume ? 'toast.trackingResumed' : 'toast.trackingPaused', { name: subscription.name }));
  }

  function deleteSubscription(id: string) {
    if (!data.subscriptions.some((item) => item.id === id)) return;
    const snapshot = data;
    updateData((current) => ({ ...current, subscriptions: current.subscriptions.filter((item) => item.id !== id) }));
    showToast(c.toast.subscriptionDeleted, () => restoreSnapshot(snapshot, c.toast.subscriptionRestored));
  }

  function recordPayment(id: string) {
    const snapshot = data;
    const result = recordSubscriptionPayment(data, id, today);
    if (result.status !== 'recorded') return;
    updateData(() => result.data);
    showToast(c.toast.paymentRecorded, () => restoreSnapshot(snapshot, c.toast.paymentReverted));
  }

  function saveBudget(input: BudgetInput, existing?: Budget) {
    const budget: Budget = { id: existing?.id ?? createId('budget'), category: input.category, limit: input.limit };
    updateData((current) => ({
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

  function deleteBudget(id: string) {
    if (!data.budgets.some((item) => item.id === id)) return;
    const snapshot = data;
    updateData((current) => ({ ...current, budgets: current.budgets.filter((item) => item.id !== id) }));
    showToast(c.toast.budgetDeleted, () => restoreSnapshot(snapshot, c.toast.budgetRestored));
  }

  function replaceAllData(nextData: FinanceData, message: string) {
    setData({ ...nextData, updatedAt: new Date().toISOString() });
    setStorageWarning(null);
    setStorageStatus('saving');
    commitView('overview');
    window.history.replaceState(null, '', '#overview');
    showToast(message);
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
  const storageWarningCopy = storageWarning === 'corrupt'
    ? c.storage.corruptWarning
    : storageWarning === 'future'
      ? c.storage.futureVersionWarning
      : storageWarning === 'error'
        ? c.storage.error
        : null;
  const activeDialog = dialog?.kind === 'transaction'
    ? <TransactionSheet key={`transaction-${dialog.item?.id ?? 'new'}`} initial={dialog.item} today={today} customCategories={data.customCategories} onClose={closeDialog} onSave={saveTransaction} />
    : dialog?.kind === 'subscription'
      ? <SubscriptionSheet key={`subscription-${dialog.item?.id ?? 'new'}`} initial={dialog.item} today={today} onClose={closeDialog} onSave={saveSubscription} />
      : dialog?.kind === 'budget'
        ? <BudgetSheet key={`budget-${dialog.item?.id ?? 'new'}`} initial={dialog.item} budgets={data.budgets} customCategories={data.customCategories} onClose={closeDialog} onSave={saveBudget} />
        : dialog?.kind === 'settings'
          ? (
              <SettingsSheet
                key="settings"
                data={data}
                storageStatus={storageStatus}
                onClose={closeDialog}
                onOpeningBalance={(openingBalance) => {
                  updateData((current) => ({ ...current, openingBalance }));
                  showToast(c.toast.openingBalanceUpdated);
                }}
                onRestoreSample={() => replaceAllData(createDemoData(), c.toast.demoRestored)}
                onClear={() => replaceAllData(createEmptyData(), c.toast.dataCleared)}
                onImport={(nextData) => replaceAllData(nextData, c.toast.dataImported)}
                onNotify={showToast}
              />
            )
          : null;

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
                <m.i className="nav-icon" aria-hidden="true" animate={{ opacity: view === item.id ? 1 : 0.76, scale: view === item.id ? 1 : 0.92 }} transition={{ duration: shouldReduceMotion ? 0.08 : 0.18 }}><Icon size={21} weight={view === item.id ? 'fill' : 'regular'} aria-hidden="true" /></m.i><span>{c.nav[item.id]}</span>
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
            {data.mode === 'demo' && <span className="demo-badge">{c.common.demoData}</span>}
            <span className={`storage-badge is-${storageStatus}`} title={c.storage.localOnly}><i aria-hidden="true" />{storageLabel}</span>
            <LanguageSwitch />
            <ThemeControl theme={theme} onToggle={toggleTheme} className="desktop-only" />
            <button className="primary-action desktop-only" type="button" disabled={mutationsDisabled} onClick={() => openDialog({ kind: primaryDialogKind })}><Plus size={19} weight="bold" aria-hidden="true" />{primaryLabel}</button>
          </div>
        </header>

        {storageWarningCopy && <div className="storage-warning" role="status"><WarningCircle size={19} weight="fill" aria-hidden="true" /><span>{storageWarningCopy}</span><button type="button" onClick={() => setStorageWarning(null)} aria-label={c.common.close}><X size={16} weight="bold" aria-hidden="true" /></button></div>}

        <div className="view-stage" inert={mutationsDisabled ? true : undefined}>
          <AnimatePresence initial={false} mode="wait" custom={viewDirection} onExitComplete={focusPendingView}>
            <m.div className="view-motion-layer" key={view} custom={viewDirection} variants={viewMotionVariants} initial="enter" animate="center" exit="exit">
              {view === 'overview' && (
                <Overview
                  summary={summary}
                  transactions={transactions}
                  subscriptions={activeSubscriptions}
                  subscriptionMonthlyTotal={subscriptionTotals.monthly}
                  customCategories={data.customCategories}
                  today={today}
                  onNavigate={navigate}
                  onAddTransaction={() => openDialog({ kind: 'transaction' })}
                />
              )}
              {view === 'transactions' && <TransactionsView transactions={transactions} customCategories={data.customCategories} onDelete={deleteTransaction} onEdit={(item) => openDialog({ kind: 'transaction', item })} onAdd={() => openDialog({ kind: 'transaction' })} />}
              {view === 'subscriptions' && (
                <SubscriptionsView
                  subscriptions={data.subscriptions}
                  totals={subscriptionTotals}
                  today={today}
                  onAdd={() => openDialog({ kind: 'subscription' })}
                  onEdit={(item) => openDialog({ kind: 'subscription', item })}
                  onToggle={toggleSubscription}
                  onDelete={deleteSubscription}
                  onRecordPayment={recordPayment}
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
          return <button key={item.id} type="button" className={view === item.id ? 'is-active' : ''} onClick={() => navigate(item.id)} aria-current={view === item.id ? 'page' : undefined}><m.i className="nav-icon" aria-hidden="true" animate={{ opacity: view === item.id ? 1 : 0.76, scale: view === item.id ? 1 : 0.92 }} transition={{ duration: shouldReduceMotion ? 0.08 : 0.18 }}><Icon size={21} weight={view === item.id ? 'fill' : 'regular'} aria-hidden="true" /></m.i><span>{c.nav[item.id]}</span></button>;
        })}
        <button className="mobile-add" type="button" disabled={mutationsDisabled} onClick={() => openDialog({ kind: primaryDialogKind })} aria-label={primaryLabel}><Plus size={25} weight="bold" aria-hidden="true" /></button>
        {navItems.slice(2).map((item) => {
          const Icon = item.icon;
          return <button key={item.id} type="button" className={view === item.id ? 'is-active' : ''} onClick={() => navigate(item.id)} aria-current={view === item.id ? 'page' : undefined}><m.i className="nav-icon" aria-hidden="true" animate={{ opacity: view === item.id ? 1 : 0.76, scale: view === item.id ? 1 : 0.92 }} transition={{ duration: shouldReduceMotion ? 0.08 : 0.18 }}><Icon size={21} weight={view === item.id ? 'fill' : 'regular'} aria-hidden="true" /></m.i><span>{c.nav[item.id]}</span></button>;
        })}
      </nav>

      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{storageLabel}</span>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{`${c.nav[view]}. ${c.header.context[view]}`}</span>

      <AnimatePresence initial={false} onExitComplete={restoreDialogFocus}>{activeDialog}</AnimatePresence>

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

function Overview({ summary, transactions, subscriptions, subscriptionMonthlyTotal, customCategories, today, onNavigate, onAddTransaction }: {
  summary: ReturnType<typeof deriveFinanceSummary>;
  transactions: Transaction[];
  subscriptions: Subscription[];
  subscriptionMonthlyTotal: number;
  customCategories: CustomExpenseCategory[];
  today: string;
  onNavigate: (view: View) => void;
  onAddTransaction: () => void;
}) {
  const { c, formatCurrency, formatPercent, t } = useI18n();
  const [period, setPeriod] = useState<CashflowPeriod>('30d');
  const upcoming = [...subscriptions].sort((a, b) => a.nextRenewal.localeCompare(b.nextRenewal)).slice(0, 3);
  const balanceLabel = formatCurrency(summary.availableBalance);
  const incomeLabel = formatCurrency(summary.incomeThisMonth);
  const expenseLabel = formatCurrency(summary.expenseThisMonth);
  return (
    <div className="overview-layout">
      <div className="overview-primary">
        <section className="balance-surface surface-raised" aria-labelledby="balance-title">
          <div className="balance-topline"><span id="balance-title">{c.overview.availableBalance}</span><Wallet size={21} weight="regular" aria-hidden="true" /></div>
          <strong className={`balance-value ${moneyDensityClass(balanceLabel)}`.trim()} title={balanceLabel}>{balanceLabel}</strong>
          <div className="summary-pair">
            <div className="summary-metric"><span className="metric-icon positive"><ArrowUpRight size={18} weight="bold" aria-hidden="true" /></span><span><small>{c.overview.incomeThisMonth}</small><strong className={moneyDensityClass(incomeLabel)} title={incomeLabel}>{incomeLabel}</strong><em className="positive-copy">{c.overview.recordedThisMonth}</em></span></div>
            <div className="summary-divider" aria-hidden="true" />
            <div className="summary-metric"><span className="metric-icon negative"><ArrowDownRight size={18} weight="bold" aria-hidden="true" /></span><span><small>{c.overview.spendingThisMonth}</small><strong className={moneyDensityClass(expenseLabel)} title={expenseLabel}>{expenseLabel}</strong><em className="negative-copy">{t('overview.incomeShare', { percent: formatPercent(summary.incomeThisMonth > 0 ? summary.expenseThisMonth / summary.incomeThisMonth : 0) })}</em></span></div>
          </div>
        </section>
        <RenewalSchedule subscriptions={upcoming} today={today} onOpen={() => onNavigate('subscriptions')} className="mobile-renewal-schedule surface-raised" />
        <CashflowPanel transactions={transactions} today={today} period={period} onPeriodChange={setPeriod} />
        <section className="activity-panel surface-raised">
          <div className="section-heading"><h2>{c.overview.recentTransactions}</h2><button type="button" className="quiet-link" onClick={() => onNavigate('transactions')}>{c.overview.viewAll} <CaretRight size={14} weight="bold" aria-hidden="true" /></button></div>
          <TransactionList transactions={transactions.slice(0, 3)} customCategories={customCategories} compact />
          <button className="mobile-inline-action" type="button" onClick={onAddTransaction}><Plus size={18} weight="bold" aria-hidden="true" /> {c.actions.addTransaction}</button>
        </section>
      </div>
      <SubscriptionOverview subscriptions={upcoming} monthlyTotal={subscriptionMonthlyTotal} today={today} onOpen={() => onNavigate('subscriptions')} />
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

function CashflowPanel({ transactions, today, period, onPeriodChange }: { transactions: Transaction[]; today: string; period: CashflowPeriod; onPeriodChange: (period: CashflowPeriod) => void }) {
  const { c, formatCompactNumber, formatCurrency, localeTag, t } = useI18n();
  const options: Array<{ id: CashflowPeriod; label: string }> = [
    { id: '7d', label: c.cashflow.period.sevenDays },
    { id: '30d', label: c.cashflow.period.thirtyDays },
    { id: '6m', label: c.cashflow.period.sixMonths },
    { id: '1y', label: c.cashflow.period.oneYear },
  ];
  const points = deriveCashflowSeries(transactions, period, dateReference(today));
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
  return (
    <section className="cashflow-panel surface-raised">
      <div className="section-heading cashflow-heading">
        <div><h2>{c.cashflow.title}</h2><span className={`cashflow-net ${net >= 0 ? 'is-positive' : 'is-negative'}`}>{net >= 0 ? '+' : ''}{formatCurrency(net)}</span></div>
        <div className="segmented-control" role="group" aria-label={c.cashflow.rangeAria}>{options.map((option) => <button key={option.id} type="button" className={period === option.id ? 'is-active' : ''} onClick={() => onPeriodChange(option.id)} aria-pressed={period === option.id}>{option.label}</button>)}</div>
      </div>
      <div className="chart-scale" aria-hidden="true"><span>{formatCompactNumber(scale)}</span><span>0</span><span>-{formatCompactNumber(scale)}</span></div>
      <div className="cashflow-chart" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(3px, 1fr))` }} role="img" aria-label={t('cashflow.chartAria', { net: formatCurrency(net) })}>
        <span className="zero-line" aria-hidden="true" />
        {values.map((point, index) => <span className="chart-column" key={points[index].key}><i className={point >= 0 ? 'bar-positive' : 'bar-negative'} style={{ height: `${point === 0 ? 2 : Math.max(8, Math.round((Math.abs(point) / maxMagnitude) * 68))}px` }} /></span>)}
      </div>
      <div className="chart-labels" aria-hidden="true">{labels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
    </section>
  );
}

function SubscriptionOverview({ subscriptions, monthlyTotal, today, onOpen }: { subscriptions: Subscription[]; monthlyTotal: number; today: string; onOpen: () => void }) {
  const { c, formatCurrency } = useI18n();
  const monthlyLabel = formatCurrency(monthlyTotal);
  return (
    <aside className="subscription-overview surface-raised" aria-labelledby="renewal-title">
      <div className="section-heading"><h2 id="renewal-title">{c.renewals.title}</h2><button type="button" className="icon-plain" onClick={onOpen} aria-label={c.renewals.openAria}><DotsThree size={22} weight="bold" aria-hidden="true" /></button></div>
      <RenewalSchedule subscriptions={subscriptions} today={today} onOpen={onOpen} />
      <div className="subscription-preview-list">
        {subscriptions.map((item) => {
          const amountLabel = formatCurrency(item.amount);
          return (
            <button className="subscription-preview-row" type="button" onClick={onOpen} key={item.id}>
              <ServiceIcon name={item.name} monogram={item.monogram} tone={item.tone} />
              <span className="subscription-preview-copy"><strong>{item.name}</strong>{(item.planKey || item.plan) && <small>{item.planKey ? c.demo.plans[item.planKey] : item.plan}</small>}</span>
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

function TransactionList({ transactions, customCategories, compact = false, onDelete, onEdit }: { transactions: Transaction[]; customCategories: CustomExpenseCategory[]; compact?: boolean; onDelete?: (id: string) => void; onEdit?: (item: Transaction) => void }) {
  const { c, formatCurrency, formatDate, t } = useI18n();
  if (transactions.length === 0) return <div className="empty-state"><Receipt size={28} weight="duotone" aria-hidden="true" /><strong>{c.transactions.emptyTitle}</strong><span>{c.transactions.emptyBody}</span></div>;
  return (
    <div className={`transaction-list ${compact ? 'is-compact' : ''}`}>
      {transactions.map((transaction) => {
        const title = transaction.titleKey ? c.demo.transactions[transaction.titleKey] : transaction.title;
        const categoryLabel = transaction.category === 'income' ? c.categories.income : expenseCategoryLabel(c, transaction.category, customCategories);
        const amountLabel = `${transaction.amount > 0 ? '+' : ''}${formatCurrency(transaction.amount)}`;
        return (
          <article className="transaction-row" key={transaction.id}>
            <span className={`transaction-icon ${transaction.amount > 0 ? 'is-income' : ''}`}>{transaction.category === 'income' ? <Wallet size={19} weight="regular" aria-hidden="true" /> : <CategoryIcon icon={expenseCategoryIcon(transaction.category, customCategories)} size={19} weight="regular" aria-hidden="true" />}</span>
            <span className="transaction-copy"><strong>{title}</strong><small>{categoryLabel}</small></span>
            <time dateTime={transaction.date}>{formatDate(transaction.date)}</time>
            <strong className={`transaction-amount ${transaction.amount > 0 ? 'is-positive' : ''} ${moneyDensityClass(amountLabel)}`.trim()} title={amountLabel}>{amountLabel}</strong>
            {(onDelete || onEdit) && <div className="row-actions">{onEdit && <button className="row-action" type="button" onClick={() => onEdit(transaction)} aria-label={t('transactions.editAria', { title })}><PencilSimple size={18} weight="bold" aria-hidden="true" /></button>}{onDelete && <button className="row-action" type="button" onClick={() => onDelete(transaction.id)} aria-label={t('transactions.deleteAria', { title })}><Trash size={18} weight="bold" aria-hidden="true" /></button>}</div>}
          </article>
        );
      })}
    </div>
  );
}

function TransactionsView({ transactions, customCategories, onDelete, onEdit, onAdd }: { transactions: Transaction[]; customCategories: CustomExpenseCategory[]; onDelete: (id: string) => void; onEdit: (item: Transaction) => void; onAdd: () => void }) {
  const { c } = useI18n();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const filtered = transactions.filter((item) => {
    const title = item.titleKey ? c.demo.transactions[item.titleKey] : item.title;
    const categoryLabel = item.category === 'income' ? c.categories.income : expenseCategoryLabel(c, item.category, customCategories);
    const haystack = `${title} ${categoryLabel}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLocaleLowerCase();
    const needle = query.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLocaleLowerCase();
    const matchesQuery = haystack.includes(needle);
    return matchesQuery && (filter === 'all' || (filter === 'income' ? item.amount > 0 : item.amount < 0));
  });
  return (
    <section className="full-view surface-raised">
      <div className="view-toolbar">
        <label className="search-field"><span className="sr-only">{c.transactions.search}</span><MagnifyingGlass size={19} weight="regular" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.transactions.search} /></label>
        <div className="filter-group" role="group" aria-label={c.transactions.filterAria}>{(['all', 'income', 'expense'] as const).map((item) => <button type="button" key={item} className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)} aria-pressed={filter === item}>{c.transactions.filter[item]}</button>)}</div>
        <button className="secondary-action" type="button" onClick={onAdd}><Plus size={18} weight="bold" aria-hidden="true" /> {c.actions.add}</button>
      </div>
      <TransactionList transactions={filtered} customCategories={customCategories} onDelete={onDelete} onEdit={onEdit} />
      {filtered.length === 0 && transactions.length > 0 && <div className="filter-empty"><MagnifyingGlass size={26} weight="duotone" aria-hidden="true" /><strong>{c.transactions.noResultsTitle}</strong><span>{c.transactions.noResultsBody}</span></div>}
    </section>
  );
}

function SubscriptionsView({ subscriptions, totals, today, onAdd, onEdit, onToggle, onDelete, onRecordPayment }: {
  subscriptions: Subscription[];
  totals: ReturnType<typeof deriveSubscriptionTotals>;
  today: string;
  onAdd: () => void;
  onEdit: (item: Subscription) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onRecordPayment: (id: string) => void;
}) {
  const { c, formatCurrency, formatDate, plural, t } = useI18n();
  const sorted = [...subscriptions].sort((a, b) => a.nextRenewal.localeCompare(b.nextRenewal));
  const monthlyLabel = formatCurrency(totals.monthly);
  const annualLabel = formatCurrency(totals.annual);
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
            const amountLabel = formatCurrency(item.amount);
            return (
              <article className={`subscription-management-row ${item.status === 'paused' ? 'is-paused' : ''}`} key={item.id}>
                <ServiceIcon name={item.name} monogram={item.monogram} tone={item.tone} large />
                <span className="subscription-main"><strong>{item.name}</strong>{(item.planKey || item.plan) && <small>{item.planKey ? c.demo.plans[item.planKey] : item.plan}</small>}</span>
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
  const { c, formatCurrency, formatMonthYear, formatPercent, t } = useI18n();
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
                <span className={`budget-icon ${over ? 'is-over' : warning ? 'is-warning' : ''}`}><CategoryIcon icon={expenseCategoryIcon(budget.category, customCategories)} size={20} weight="regular" aria-hidden="true" /></span>
                <span className="budget-copy"><strong>{expenseCategoryLabel(c, budget.category, customCategories)}</strong><small>{formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}</small></span>
                <span className={`budget-status ${over ? 'is-over' : warning ? 'is-warning' : ''}`}>{t(over ? 'budgets.overBy' : 'budgets.remaining', { amount })}</span>
                <span className="budget-percentage">{formatPercent(ratio)}</span>
                <span className="budget-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(percent, 100)} aria-label={t('budgets.usedAria', { percent: formatPercent(ratio) })}><i className={over ? 'is-over' : warning ? 'is-warning' : ''} style={{ width: `${Math.min(percent, 100)}%` }} /></span>
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

function useDialogFocusTrap() {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((element) => element.offsetParent !== null);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener('keydown', trapFocus);
    return () => dialog.removeEventListener('keydown', trapFocus);
  }, []);
  return dialogRef;
}

function focusFirstInvalid(form: HTMLFormElement | null) {
  window.requestAnimationFrame(() => form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
}

function isSafeAmount(value: number) {
  return Number.isSafeInteger(value) && value > 0;
}

function SheetFrame({ title, subtitle, labelledBy, onClose, children, className = '' }: { title: string; subtitle: string; labelledBy: string; onClose: () => void; children: ReactNode; className?: string }) {
  const { c } = useI18n();
  const shouldReduceMotion = useReducedMotion();
  const dialogRef = useDialogFocusTrap();
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    document.body.classList.add('is-sheet-open');
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    const frame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      if (dialog && !dialog.contains(document.activeElement)) dialog.focus();
    });
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.classList.remove('is-sheet-open');
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [dialogRef]);
  return (
    <m.div className="sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: shouldReduceMotion ? 0.08 : 0.16, ease: [0.2, 0, 0.38, 0.9] }}>
      <m.section ref={dialogRef} className={`form-sheet ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1} initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18, scale: shouldReduceMotion ? 1 : 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 12, scale: shouldReduceMotion ? 1 : 0.99 }} transition={{ duration: shouldReduceMotion ? 0.08 : 0.26, ease: [0.16, 1, 0.3, 1] }}>
        <header className="sheet-header"><div><h2 id={labelledBy}>{title}</h2><p>{subtitle}</p></div><button type="button" onClick={onClose} aria-label={c.common.close}><X size={21} weight="bold" aria-hidden="true" /></button></header>
        {children}
      </m.section>
    </m.div>
  );
}

function TransactionSheet({ initial, today, customCategories, onClose, onSave }: { initial?: Transaction; today: string; customCategories: CustomExpenseCategory[]; onClose: () => void; onSave: (input: TransactionInput, existing?: Transaction) => void }) {
  const { c, currencySymbol } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<TransactionType>(initial?.amount && initial.amount > 0 ? 'income' : 'expense');
  const [title, setTitle] = useState(initial?.titleKey ? c.demo.transactions[initial.titleKey] : initial?.title ?? '');
  const [amount, setAmount] = useState(initial ? String(Math.abs(initial.amount)) : '');
  const [category, setCategory] = useState<ExpenseCategoryId>(initial?.category === 'income' ? 'dining' : initial?.category ?? 'dining');
  const [pendingCustomCategory, setPendingCustomCategory] = useState<CustomExpenseCategory | undefined>();
  const [date, setDate] = useState(initial?.date ?? today);
  const [errors, setErrors] = useState<Record<string, string>>({});
  function submit(event: FormEvent) {
    event.preventDefault();
    const numericAmount = Number(amount);
    const nextErrors: Record<string, string> = {};
    if (!title.trim()) nextErrors.title = c.validation.transactionName;
    if (!numericAmount || numericAmount <= 0) nextErrors.amount = c.validation.positiveAmount;
    else if (!isSafeAmount(numericAmount)) nextErrors.amount = c.validation.unsafeAmount;
    if (!date) nextErrors.date = c.validation.transactionDate;
    else if (date > today) nextErrors.date = c.validation.transactionFuture;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { focusFirstInvalid(formRef.current); return; }
    onSave({ title: title.trim(), amount: numericAmount, category, date, type, customCategory: type === 'expense' ? pendingCustomCategory : undefined }, initial);
    onClose();
  }
  return (
    <SheetFrame title={initial ? c.transactionForm.editTitle : c.transactionForm.title} subtitle={initial ? c.transactionForm.editSubtitle : c.transactionForm.subtitle} labelledBy="transaction-sheet-title" onClose={onClose}>
      <form ref={formRef} onSubmit={submit} noValidate>
        <div className="type-switch" role="group" aria-label={c.transactionForm.typeAria}><button type="button" className={type === 'expense' ? 'is-active' : ''} onClick={() => setType('expense')} aria-pressed={type === 'expense'}>{c.transactionForm.type.expense}</button><button type="button" className={type === 'income' ? 'is-active' : ''} onClick={() => setType('income')} aria-pressed={type === 'income'}>{c.transactionForm.type.income}</button></div>
        <label className="field"><span>{c.transactionForm.name}</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder={c.transactionForm.namePlaceholder} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'transaction-title-error' : undefined} />{errors.title && <small id="transaction-title-error" className="field-error" role="alert">{errors.title}</small>}</label>
        <label className="field"><span>{c.transactionForm.amount}</span><div className="money-input"><input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))} placeholder="0" aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? 'transaction-amount-error' : undefined} /><strong>{currencySymbol}</strong></div>{errors.amount && <small id="transaction-amount-error" className="field-error" role="alert">{errors.amount}</small>}</label>
        {type === 'expense' && <CategoryPicker label={c.transactionForm.category} value={category} customCategories={pendingCustomCategory ? [...customCategories, pendingCustomCategory] : customCategories} onChange={(nextCategory, created) => { setCategory(nextCategory); setPendingCustomCategory((current) => created ?? (current?.id === nextCategory ? current : undefined)); }} />}
        <label className="field"><span>{c.transactionForm.date}</span><input type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'transaction-date-error' : undefined} />{errors.date && <small id="transaction-date-error" className="field-error" role="alert">{errors.date}</small>}</label>
        <div className="sheet-actions"><button type="button" className="cancel-action" onClick={onClose}>{c.common.cancel}</button><button type="submit" className="primary-action">{initial ? c.transactionForm.update : c.transactionForm.save}</button></div>
      </form>
    </SheetFrame>
  );
}

function SubscriptionSheet({ initial, today, onClose, onSave }: { initial?: Subscription; today: string; onClose: () => void; onSave: (input: SubscriptionInput, existing?: Subscription) => void }) {
  const { c, currencySymbol, t } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const [name, setName] = useState(initial?.name ?? '');
  const [plan, setPlan] = useState(initial?.planKey ? c.demo.plans[initial.planKey] : initial?.plan ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [cycle, setCycle] = useState<BillingCycle>(initial?.cycle ?? 'month');
  const [nextRenewal, setNextRenewal] = useState(initial?.nextRenewal ?? addDaysDateOnly(today, 7));
  const [errors, setErrors] = useState<Record<string, string>>({});
  function submit(event: FormEvent) {
    event.preventDefault();
    const numericAmount = Number(amount);
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = c.validation.serviceName;
    if (!numericAmount || numericAmount <= 0) nextErrors.amount = c.validation.positiveAmount;
    else if (!isSafeAmount(numericAmount)) nextErrors.amount = c.validation.unsafeAmount;
    if (!nextRenewal) nextErrors.nextRenewal = c.validation.renewalDate;
    else if (!initial && nextRenewal < today) nextErrors.nextRenewal = c.validation.renewalPast;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { focusFirstInvalid(formRef.current); return; }
    onSave({ name: name.trim(), plan: plan.trim(), amount: numericAmount, cycle, nextRenewal }, initial);
    onClose();
  }
  return (
    <SheetFrame title={initial ? c.subscriptionForm.editTitle : c.subscriptionForm.title} subtitle={initial ? c.subscriptionForm.editSubtitle : c.subscriptionForm.subtitle} labelledBy="subscription-sheet-title" onClose={onClose}>
      <form ref={formRef} onSubmit={submit} noValidate>
        <label className="field"><span>{c.subscriptionForm.serviceName}</span><div className="service-name-input"><ServiceIcon name={name} monogram={name.trim().slice(0, 1).toUpperCase() || '?'} tone="graphite" /><input autoFocus list="tally-service-suggestions" value={name} onChange={(event) => setName(event.target.value)} placeholder={c.subscriptionForm.servicePlaceholder} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'subscription-name-error' : undefined} /></div><datalist id="tally-service-suggestions">{SERVICE_SUGGESTIONS.map((service) => <option value={service} key={service} />)}</datalist>{errors.name && <small id="subscription-name-error" className="field-error" role="alert">{errors.name}</small>}</label>
        <label className="field"><span>{c.subscriptionForm.plan}</span><input value={plan} onChange={(event) => setPlan(event.target.value)} placeholder={c.subscriptionForm.planPlaceholder} /></label>
        <div className="split-fields"><label className="field"><span>{c.subscriptionForm.cost}</span><div className="money-input"><input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))} placeholder="0" aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? 'subscription-amount-error' : undefined} /><strong>{currencySymbol}</strong></div>{errors.amount && <small id="subscription-amount-error" className="field-error" role="alert">{errors.amount}</small>}</label><label className="field"><span>{c.subscriptionForm.cycle.label}</span><select value={cycle} onChange={(event) => setCycle(event.target.value as BillingCycle)}><option value="month">{c.subscriptionForm.cycle.month}</option><option value="year">{c.subscriptionForm.cycle.year}</option></select></label></div>
        <label className="field"><span>{c.subscriptionForm.renewalDate}</span><input type="date" min={initial ? undefined : today} value={nextRenewal} onChange={(event) => setNextRenewal(event.target.value)} aria-invalid={Boolean(errors.nextRenewal)} aria-describedby={errors.nextRenewal ? 'subscription-renewal-error' : undefined} />{errors.nextRenewal && <small id="subscription-renewal-error" className="field-error" role="alert">{errors.nextRenewal}</small>}</label>
        <div className="info-callout"><CalendarBlank size={20} weight="regular" aria-hidden="true" /><span>{t('subscriptionForm.callout', { appName: APP_NAME })}</span></div>
        <div className="sheet-actions"><button type="button" className="cancel-action" onClick={onClose}>{c.common.cancel}</button><button type="submit" className="primary-action">{initial ? c.subscriptionForm.update : c.subscriptionForm.save}</button></div>
      </form>
    </SheetFrame>
  );
}

function BudgetSheet({ initial, budgets, customCategories, onClose, onSave }: { initial?: Budget; budgets: Budget[]; customCategories: CustomExpenseCategory[]; onClose: () => void; onSave: (input: BudgetInput, existing?: Budget) => void }) {
  const { c, currencySymbol } = useI18n();
  const formRef = useRef<HTMLFormElement>(null);
  const firstAvailable = EXPENSE_CATEGORY_DEFINITIONS.find((category) => category.id !== 'other' && !budgets.some((item) => item.category === category.id))?.id ?? 'dining';
  const [category, setCategory] = useState<ExpenseCategoryId>(initial?.category ?? firstAvailable);
  const [pendingCustomCategory, setPendingCustomCategory] = useState<CustomExpenseCategory | undefined>();
  const [limit, setLimit] = useState(initial ? String(initial.limit) : '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  function submit(event: FormEvent) {
    event.preventDefault();
    const numericLimit = Number(limit);
    const nextErrors: Record<string, string> = {};
    if (!category) nextErrors.category = c.validation.budgetCategory;
    else if (budgets.some((item) => item.category === category && item.id !== initial?.id)) nextErrors.category = c.validation.budgetDuplicate;
    if (!numericLimit || numericLimit <= 0) nextErrors.limit = c.validation.budgetLimit;
    else if (!isSafeAmount(numericLimit)) nextErrors.limit = c.validation.unsafeAmount;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) { focusFirstInvalid(formRef.current); return; }
    onSave({ category, limit: numericLimit, customCategory: pendingCustomCategory }, initial);
    onClose();
  }
  return (
    <SheetFrame title={initial ? c.budgetForm.editTitle : c.budgetForm.addTitle} subtitle={initial ? c.budgetForm.editSubtitle : c.budgetForm.addSubtitle} labelledBy="budget-sheet-title" onClose={onClose}>
      <form ref={formRef} onSubmit={submit} noValidate>
        <CategoryPicker autoFocus label={c.budgetForm.category} value={category} customCategories={pendingCustomCategory ? [...customCategories, pendingCustomCategory] : customCategories} onChange={(nextCategory, created) => { setCategory(nextCategory); setPendingCustomCategory((current) => created ?? (current?.id === nextCategory ? current : undefined)); }} error={errors.category} errorId="budget-category-error" />
        <label className="field"><span>{c.budgetForm.monthlyLimit}</span><div className="money-input"><input inputMode="numeric" value={limit} onChange={(event) => setLimit(event.target.value.replace(/\D/g, ''))} placeholder="0" aria-invalid={Boolean(errors.limit)} aria-describedby={errors.limit ? 'budget-limit-error' : undefined} /><strong>{currencySymbol}</strong></div>{errors.limit && <small id="budget-limit-error" className="field-error" role="alert">{errors.limit}</small>}</label>
        <div className="sheet-actions"><button type="button" className="cancel-action" onClick={onClose}>{c.common.cancel}</button><button type="submit" className="primary-action">{initial ? c.budgetForm.update : c.budgetForm.save}</button></div>
      </form>
    </SheetFrame>
  );
}

function SettingsSheet({ data, storageStatus, onClose, onOpeningBalance, onRestoreSample, onClear, onImport, onNotify }: {
  data: FinanceData;
  storageStatus: StorageStatus;
  onClose: () => void;
  onOpeningBalance: (value: number) => void;
  onRestoreSample: () => void;
  onClear: () => void;
  onImport: (data: FinanceData) => void;
  onNotify: (message: string) => void;
}) {
  const { c, currencySymbol } = useI18n();
  const [openingBalance, setOpeningBalance] = useState(String(data.openingBalance));
  const [openingError, setOpeningError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<'restore' | 'clear' | null>(null);
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
  function openConfirmation(kind: 'restore' | 'clear', trigger: HTMLButtonElement) {
    confirmTrigger.current = trigger;
    setConfirming(kind);
  }
  function cancelConfirmation() {
    setConfirming(null);
    const trigger = confirmTrigger.current;
    confirmTrigger.current = null;
    window.requestAnimationFrame(() => trigger?.isConnected && trigger.focus());
  }
  function dismissSettings() {
    if (confirming) cancelConfirmation();
    else onClose();
  }
  function saveOpeningBalance(event: FormEvent) {
    event.preventDefault();
    const value = Number(openingBalance);
    if (!Number.isSafeInteger(value)) { setOpeningError(c.validation.unsafeAmount); return; }
    setOpeningError(null);
    onOpeningBalance(value);
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
    if (!file || file.size > 2_000_000) { onNotify(c.toast.importInvalid); return; }
    setIsImporting(true);
    try {
      const parsed = parseFinanceData(await file.text());
      if (parsed.status !== 'ok') { setIsImporting(false); onNotify(c.toast.importInvalid); return; }
      setIsImporting(false);
      onImport(parsed.data);
      onClose();
    } catch {
      setIsImporting(false);
      onNotify(c.toast.importInvalid);
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
    <SheetFrame title={c.settings.title} subtitle={c.settings.subtitle} labelledBy="settings-sheet-title" onClose={dismissSettings} className="settings-sheet">
      <div className="settings-content">
        <div className="privacy-callout"><ShieldCheck size={24} weight="duotone" aria-hidden="true" /><span><strong>{c.settings.localOnlyTitle}</strong><small>{c.settings.localOnlyBody}</small></span></div>
        <span className={`settings-storage-state is-${storageStatus}`}><i aria-hidden="true" />{statusCopy}</span>
        <form className="settings-balance-form" onSubmit={saveOpeningBalance} noValidate>
          <label className="field"><span>{c.settings.openingBalance}</span><small className="field-help">{c.settings.openingBalanceHelp}</small><div className="money-input"><input inputMode="numeric" value={openingBalance} onChange={(event) => setOpeningBalance(event.target.value.replace(/[^\d-]/g, '').replace(/(?!^)-/g, ''))} aria-invalid={Boolean(openingError)} aria-describedby={openingError ? 'opening-balance-error' : undefined} /><strong>{currencySymbol}</strong></div>{openingError && <small id="opening-balance-error" className="field-error" role="alert">{openingError}</small>}</label>
          <button type="submit" className="secondary-action">{c.settings.saveOpeningBalance}</button>
        </form>
        <div className="settings-grid">
          <button type="button" className="settings-card" onClick={exportData}><DownloadSimple size={22} weight="bold" aria-hidden="true" /><span><strong>{c.settings.exportData}</strong><small>{c.settings.exportDataBody}</small></span></button>
          <button type="button" className="settings-card" disabled={isImporting} aria-busy={isImporting} onClick={() => fileInput.current?.click()}>{isImporting ? <CircleNotch className="loading-spinner" size={22} weight="bold" aria-hidden="true" /> : <UploadSimple size={22} weight="bold" aria-hidden="true" />}<span><strong>{isImporting ? c.settings.importingData : c.settings.importData}</strong><small>{c.settings.importDataBody}</small></span></button>
          <input ref={fileInput} hidden type="file" accept="application/json,.json" disabled={isImporting} onChange={importData} aria-label={c.settings.importFileAria} />
        </div>
        <div className="settings-danger-zone">
          <button type="button" className="settings-row" onClick={(event) => openConfirmation('restore', event.currentTarget)}><span><strong>{c.settings.restoreSample}</strong><small>{c.settings.restoreSampleBody}</small></span><CaretRight size={18} weight="bold" aria-hidden="true" /></button>
          <button type="button" className="settings-row is-danger" onClick={(event) => openConfirmation('clear', event.currentTarget)}><span><strong>{c.settings.clearAll}</strong><small>{c.settings.clearAllBody}</small></span><Trash size={19} weight="bold" aria-hidden="true" /></button>
        </div>
        {confirming && <div className="inline-confirm" role="group" aria-labelledby="confirm-action-title" aria-describedby="confirm-action-description"><WarningCircle size={23} weight="fill" aria-hidden="true" /><div><strong id="confirm-action-title">{confirming === 'clear' ? c.settings.confirmClearTitle : c.settings.restoreSample}</strong><small id="confirm-action-description">{confirming === 'clear' ? c.settings.confirmClearBody : c.settings.restoreSampleBody}</small></div><div><button ref={confirmCancel} type="button" className="cancel-action" onClick={cancelConfirmation}>{c.common.cancel}</button><button type="button" className="danger-action" onClick={() => { if (confirming === 'clear') onClear(); else onRestoreSample(); onClose(); }}>{confirming === 'clear' ? c.settings.confirmClearAction : c.settings.confirmRestoreAction}</button></div></div>}
      </div>
    </SheetFrame>
  );
}
