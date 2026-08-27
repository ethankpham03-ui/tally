'use client';

import {
  ArrowCounterClockwise, ArrowDownRight, ArrowUpRight, ArrowsDownUp, Bank, Bell,
  CalendarBlank, CaretRight, ChartDonut, Check, CreditCard, DotsThree, ForkKnife,
  GearSix, House, MagnifyingGlass, Pause, Play, Plus, Receipt, ShoppingCart, Trash,
  TrendUp, Wallet, WarningCircle, X,
} from '@phosphor-icons/react';
import Image from 'next/image';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  APP_NAME, I18nProvider, useI18n,
  type CategoryId, type DemoPlanId, type DemoTransactionTitleId, type Locale,
} from './i18n';

type View = 'overview' | 'transactions' | 'subscriptions' | 'budgets';
type ModalKind = 'transaction' | 'subscription' | null;
type TransactionType = 'income' | 'expense';
type BillingCycle = 'month' | 'year';

type Transaction = {
  id: number;
  title: string;
  titleKey?: DemoTransactionTitleId;
  category: CategoryId;
  date: string;
  amount: number;
};

type Subscription = {
  id: number;
  name: string;
  plan: string;
  planKey?: DemoPlanId;
  amount: number;
  cycle: BillingCycle;
  nextRenewal: string;
  status: 'active' | 'trial' | 'paused';
  previousStatus?: 'active' | 'trial';
  monogram: string;
  tone: 'green' | 'blue' | 'graphite' | 'red' | 'violet';
};

type Budget = { id: number; category: CategoryId; spent: number; limit: number };
type NewTransaction = { title: string; category: CategoryId; date: string; amount: number; type: TransactionType };
type NewSubscription = { name: string; plan: string; amount: number; cycle: BillingCycle; nextRenewal: string };

const DEMO_TODAY = new Date('2026-08-27T12:00:00');

const initialTransactions: Transaction[] = [
  { id: 1, title: '', titleKey: 'winmart', category: 'shopping', date: '2026-08-26', amount: -450000 },
  { id: 2, title: '', titleKey: 'companySalary', category: 'income', date: '2026-08-25', amount: 53400000 },
  { id: 3, title: '', titleKey: 'grab', category: 'transport', date: '2026-08-24', amount: -68000 },
  { id: 4, title: '', titleKey: 'highlandsCoffee', category: 'dining', date: '2026-08-23', amount: -95000 },
  { id: 5, title: '', titleKey: 'augustElectricity', category: 'bills', date: '2026-08-21', amount: -1250000 },
];

const initialSubscriptions: Subscription[] = [
  { id: 1, name: 'Spotify', plan: '', planKey: 'personal', amount: 59000, cycle: 'month', nextRenewal: '2026-08-28', status: 'active', monogram: 'S', tone: 'green' },
  { id: 2, name: 'Figma', plan: '', planKey: 'professional', amount: 249000, cycle: 'month', nextRenewal: '2026-09-02', status: 'active', monogram: 'F', tone: 'graphite' },
  { id: 3, name: 'iCloud+', plan: '', planKey: 'storage200Gb', amount: 69000, cycle: 'month', nextRenewal: '2026-09-05', status: 'active', monogram: 'i', tone: 'blue' },
  { id: 4, name: 'ChatGPT', plan: '', planKey: 'plus', amount: 500000, cycle: 'month', nextRenewal: '2026-09-07', status: 'active', monogram: 'C', tone: 'graphite' },
  { id: 5, name: 'Netflix', plan: '', planKey: 'standard', amount: 260000, cycle: 'month', nextRenewal: '2026-09-10', status: 'paused', monogram: 'N', tone: 'red' },
  { id: 6, name: 'Duolingo', plan: '', planKey: 'super', amount: 1299000, cycle: 'year', nextRenewal: '2026-09-19', status: 'trial', monogram: 'D', tone: 'violet' },
];

const initialBudgets: Budget[] = [
  { id: 1, category: 'dining', spent: 2850000, limit: 4000000 },
  { id: 2, category: 'shopping', spent: 1840000, limit: 2000000 },
  { id: 3, category: 'transport', spent: 680000, limit: 1200000 },
  { id: 4, category: 'entertainment', spent: 1040000, limit: 800000 },
];

const expenseCategories: CategoryId[] = ['dining', 'shopping', 'transport', 'bills', 'entertainment', 'other'];
const chartData: Record<string, number[]> = {
  '7d': [3, -2, 6, -4, 5, 8, -3],
  '30d': [-2, -5, 1, 3, 4, 6, 9, 5, -2, -4, -6, -10, -7, 2, 5, 7, 3, -2, -5, -8, -4, 2, 6, 9, 5, 1, -3, -6, 3, 5],
  '6m': [4, 7, -3, 10, 6, 13, -5, 8, 11, -2, 9, 15],
  '1y': [5, 9, 7, 12, -2, 15, 11, 17, 13, 18, 16, 20],
};
const navItems: Array<{ id: View; icon: typeof House }> = [
  { id: 'overview', icon: House }, { id: 'transactions', icon: ArrowsDownUp },
  { id: 'subscriptions', icon: CreditCard }, { id: 'budgets', icon: ChartDonut },
];

function daysUntil(value: string) {
  return Math.max(0, Math.ceil((new Date(`${value}T12:00:00`).getTime() - DEMO_TODAY.getTime()) / 86400000));
}

function monthlyCost(subscription: Subscription) {
  return subscription.cycle === 'year' ? subscription.amount / 12 : subscription.amount;
}

function categoryIcon(category: CategoryId) {
  if (category === 'income') return Bank;
  if (category === 'dining') return ForkKnife;
  if (category === 'shopping') return ShoppingCart;
  if (category === 'bills') return Receipt;
  return ArrowsDownUp;
}

function PageIcon({ view }: { view: View }) {
  const Icon = (navItems.find((item) => item.id === view) ?? navItems[0]).icon;
  return <Icon size={20} weight="bold" aria-hidden="true" />;
}

function LanguageSwitch({ mobile = false }: { mobile?: boolean }) {
  const { locale, setLocale, c } = useI18n();
  return (
    <div className={`language-switch ${mobile ? 'is-compact mobile-language-switch' : 'desktop-language-switch'}`} role="group" aria-label={c.language.changeAria}>
      {(['en', 'vi'] as Locale[]).map((option) => (
        <button className={`language-option ${locale === option ? 'is-active' : ''}`} key={option} type="button" onClick={() => setLocale(option)} aria-pressed={locale === option} aria-label={c.language[option]}>
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default function FinanceApp() {
  return <I18nProvider><AppContent /></I18nProvider>;
}

function AppContent() {
  const { c, t } = useI18n();
  const [view, setView] = useState<View>('overview');
  const [modal, setModal] = useState<ModalKind>(null);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [budgets, setBudgets] = useState(initialBudgets);
  const [balance, setBalance] = useState(42680000);
  const [income, setIncome] = useState(53400000);
  const [expense, setExpense] = useState(24720000);
  const [toast, setToast] = useState<string | null>(null);
  const modalOpener = useRef<HTMLElement | null>(null);
  const activeSubscriptions = useMemo(() => subscriptions.filter((item) => item.status !== 'paused'), [subscriptions]);
  const subscriptionMonthlyTotal = useMemo(() => Math.round(activeSubscriptions.reduce((sum, item) => sum + monthlyCost(item), 0)), [activeSubscriptions]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!modal) return;
    document.body.classList.add('is-sheet-open');
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.classList.remove('is-sheet-open'); window.removeEventListener('keydown', closeOnEscape); };
  }, [modal]);

  function openModal(kind: Exclude<ModalKind, null>) {
    modalOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setModal(kind);
  }
  function closeModal() { setModal(null); window.requestAnimationFrame(() => modalOpener.current?.focus()); }
  function announceFeature(feature: string) { setToast(t('toast.comingSoon', { feature })); }
  function navigate(nextView: View) { setView(nextView); window.scrollTo({ top: 0 }); }

  function addTransaction(input: NewTransaction) {
    const signedAmount = input.type === 'income' ? input.amount : -input.amount;
    const transaction: Transaction = { id: Date.now(), title: input.title, category: input.type === 'income' ? 'income' : input.category, date: input.date, amount: signedAmount };
    setTransactions((current) => [...current, transaction].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id));
    setBalance((current) => current + signedAmount);
    if (signedAmount > 0) setIncome((current) => current + signedAmount);
    else setExpense((current) => current + Math.abs(signedAmount));
    if (signedAmount < 0) setBudgets((current) => current.map((budget) => budget.category === input.category ? { ...budget, spent: budget.spent + input.amount } : budget));
    setToast(c.toast.transactionAdded);
  }

  function removeTransaction(id: number) {
    const transaction = transactions.find((item) => item.id === id);
    if (!transaction) return;
    setTransactions((current) => current.filter((item) => item.id !== id));
    setBalance((current) => current - transaction.amount);
    if (transaction.amount > 0) setIncome((current) => Math.max(0, current - transaction.amount));
    else {
      setExpense((current) => Math.max(0, current - Math.abs(transaction.amount)));
      setBudgets((current) => current.map((budget) => budget.category === transaction.category ? { ...budget, spent: Math.max(0, budget.spent - Math.abs(transaction.amount)) } : budget));
    }
    setToast(c.toast.transactionDeleted);
  }

  function addSubscription(input: NewSubscription) {
    setSubscriptions((current) => [...current, { ...input, id: Date.now(), status: 'active', monogram: input.name.slice(0, 1).toUpperCase(), tone: 'blue' }]);
    setToast(c.toast.subscriptionAdded);
  }
  function toggleSubscription(id: number) {
    setSubscriptions((current) => current.map((item) => {
      if (item.id !== id) return item;
      if (item.status === 'paused') return { ...item, status: item.previousStatus ?? 'active', previousStatus: undefined };
      return { ...item, previousStatus: item.status, status: 'paused' };
    }));
    setToast(c.toast.trackingUpdated);
  }
  function removeSubscription(id: number) { setSubscriptions((current) => current.filter((item) => item.id !== id)); setToast(c.toast.subscriptionDeleted); }
  function resetDemo() {
    setTransactions(initialTransactions); setSubscriptions(initialSubscriptions); setBudgets(initialBudgets);
    setBalance(42680000); setIncome(53400000); setExpense(24720000); setView('overview'); setToast(c.toast.demoRestored);
  }

  return (
    <main className="app-frame">
      <aside className="desktop-sidebar" aria-label={c.nav.mainAria}>
        <button className="brand" type="button" onClick={() => navigate('overview')} aria-label={t('nav.homeAria', { appName: APP_NAME })}>
          <span className="brand-mark" aria-hidden="true"><Image src="/tally-icon.png" alt="" width={48} height={48} priority /></span><span>{APP_NAME}</span>
        </button>
        <nav className="desktop-nav">
          {navItems.map((item) => { const Icon = item.icon; return <button className={`nav-button ${view === item.id ? 'is-active' : ''}`} key={item.id} type="button" onClick={() => navigate(item.id)} aria-current={view === item.id ? 'page' : undefined}><Icon size={21} weight={view === item.id ? 'fill' : 'bold'} aria-hidden="true" /><span>{c.nav[item.id]}</span></button>; })}
        </nav>
        <div className="sidebar-footer">
          <button className="utility-button" type="button" onClick={resetDemo} aria-label={c.a11y.restoreDemo}><ArrowCounterClockwise size={20} weight="bold" aria-hidden="true" /></button>
          <button className="utility-button" type="button" onClick={() => announceFeature(c.features.settings)} aria-label={t('a11y.comingSoon', { feature: c.features.settings })}><GearSix size={20} weight="bold" aria-hidden="true" /></button>
        </div>
      </aside>

      <section className="workspace">
        <header className="mobile-appbar">
          <button className="mobile-brand" type="button" onClick={() => navigate('overview')} aria-label={t('nav.homeAria', { appName: APP_NAME })}>
            <span className="brand-mark small" aria-hidden="true"><Image src="/tally-icon.png" alt="" width={42} height={42} priority /></span><span>{APP_NAME}</span>
          </button>
          <div className="appbar-actions">
            <LanguageSwitch mobile />
            <button className="icon-control" type="button" onClick={() => announceFeature(c.features.notifications)} aria-label={t('a11y.comingSoon', { feature: c.features.notifications })}><Bell size={20} weight="bold" aria-hidden="true" /></button>
            <span className="avatar" aria-label={t('a11y.account', { name: 'An Nhiên' })}>AN</span>
          </div>
        </header>

        <header className="page-header">
          <div>
            <p className="desktop-greeting">{t('header.greeting', { name: 'Nhiên' })}</p>
            <div className="mobile-title-row"><PageIcon view={view} /><h1 id={`page-title-${view}`}>{c.nav[view]}</h1></div>
            <p className="page-context">{c.header.context[view]}</p>
          </div>
          <div className="header-actions">
            <span className="demo-badge">{c.common.demoData}</span><LanguageSwitch />
            <button className="icon-control desktop-only" type="button" onClick={() => announceFeature(c.features.notifications)} aria-label={t('a11y.comingSoon', { feature: c.features.notifications })}><Bell size={20} weight="bold" aria-hidden="true" /></button>
            <button className="primary-action desktop-only" type="button" onClick={() => openModal(view === 'subscriptions' ? 'subscription' : 'transaction')}><Plus size={19} weight="bold" aria-hidden="true" />{view === 'subscriptions' ? c.actions.addSubscriptionShort : c.actions.addTransaction}</button>
          </div>
        </header>

        <div className="view-stage" key={view}>
          {view === 'overview' && <Overview balance={balance} income={income} expense={expense} transactions={transactions} subscriptions={activeSubscriptions} subscriptionMonthlyTotal={subscriptionMonthlyTotal} onNavigate={navigate} onAddTransaction={() => openModal('transaction')} />}
          {view === 'transactions' && <TransactionsView transactions={transactions} onDelete={removeTransaction} onAdd={() => openModal('transaction')} />}
          {view === 'subscriptions' && <SubscriptionsView subscriptions={subscriptions} monthlyTotal={subscriptionMonthlyTotal} onAdd={() => openModal('subscription')} onToggle={toggleSubscription} onDelete={removeSubscription} />}
          {view === 'budgets' && <BudgetsView budgets={budgets} />}
        </div>
      </section>

      <nav className="mobile-bottom-nav" aria-label={c.nav.mobileAria}>
        {navItems.slice(0, 2).map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={view === item.id ? 'is-active' : ''} onClick={() => navigate(item.id)} aria-current={view === item.id ? 'page' : undefined}><Icon size={21} weight={view === item.id ? 'fill' : 'bold'} aria-hidden="true" /><span>{c.nav[item.id]}</span></button>; })}
        <button className="mobile-add" type="button" onClick={() => openModal('transaction')} aria-label={c.actions.addTransaction}><Plus size={25} weight="bold" aria-hidden="true" /></button>
        {navItems.slice(2).map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={view === item.id ? 'is-active' : ''} onClick={() => navigate(item.id)} aria-current={view === item.id ? 'page' : undefined}><Icon size={21} weight={view === item.id ? 'fill' : 'bold'} aria-hidden="true" /><span>{c.nav[item.id]}</span></button>; })}
      </nav>

      {modal === 'transaction' && <TransactionSheet onClose={closeModal} onSave={addTransaction} />}
      {modal === 'subscription' && <SubscriptionSheet onClose={closeModal} onSave={addSubscription} />}
      {toast && <div className="toast" role="status" aria-live="polite"><Check size={18} weight="bold" aria-hidden="true" />{toast}</div>}
    </main>
  );
}

function Overview({ balance, income, expense, transactions, subscriptions, subscriptionMonthlyTotal, onNavigate, onAddTransaction }: {
  balance: number; income: number; expense: number; transactions: Transaction[]; subscriptions: Subscription[];
  subscriptionMonthlyTotal: number; onNavigate: (view: View) => void; onAddTransaction: () => void;
}) {
  const { c, formatCurrency, formatPercent, plural, t } = useI18n();
  const [period, setPeriod] = useState('30d');
  const upcoming = [...subscriptions].sort((a, b) => a.nextRenewal.localeCompare(b.nextRenewal)).slice(0, 3);
  return (
    <div className="overview-layout">
      <div className="overview-primary">
        <section className="balance-surface surface-raised" aria-labelledby="balance-title">
          <div className="balance-topline"><span id="balance-title">{c.overview.availableBalance}</span><Wallet size={21} weight="bold" aria-hidden="true" /></div>
          <strong className="balance-value">{formatCurrency(balance)}</strong>
          <div className="summary-pair">
            <div className="summary-metric"><span className="metric-icon positive"><ArrowUpRight size={18} weight="bold" aria-hidden="true" /></span><span><small>{c.overview.incomeThisMonth}</small><strong>{formatCurrency(income)}</strong><em className="positive-copy">{c.overview.recordedThisMonth}</em></span></div>
            <div className="summary-divider" aria-hidden="true" />
            <div className="summary-metric"><span className="metric-icon negative"><ArrowDownRight size={18} weight="bold" aria-hidden="true" /></span><span><small>{c.overview.spendingThisMonth}</small><strong>{formatCurrency(expense)}</strong><em className="negative-copy">{t('overview.incomeShare', { percent: formatPercent(income > 0 ? expense / income : 0) })}</em></span></div>
          </div>
        </section>
        {upcoming[0] && <button className="mobile-next-renewal surface-raised" type="button" onClick={() => onNavigate('subscriptions')}><span className={`service-mark ${upcoming[0].tone}`}>{upcoming[0].monogram}</span><span><small>{c.overview.nextRenewal}</small><strong>{upcoming[0].name}</strong></span><span className="renewal-amount"><strong>{formatCurrency(upcoming[0].amount)}</strong><small>{plural('overview.daysLeft', daysUntil(upcoming[0].nextRenewal))}</small></span><CaretRight size={18} weight="bold" aria-hidden="true" /></button>}
        <CashflowPanel period={period} onPeriodChange={setPeriod} />
        <section className="activity-panel surface-raised">
          <div className="section-heading"><h2>{c.overview.recentTransactions}</h2><button type="button" className="quiet-link" onClick={() => onNavigate('transactions')}>{c.overview.viewAll} <CaretRight size={14} weight="bold" aria-hidden="true" /></button></div>
          <TransactionList transactions={transactions.slice(0, 3)} compact />
          <button className="mobile-inline-action" type="button" onClick={onAddTransaction}><Plus size={18} weight="bold" aria-hidden="true" /> {c.actions.addTransaction}</button>
        </section>
      </div>
      <SubscriptionOverview subscriptions={upcoming} monthlyTotal={subscriptionMonthlyTotal} onOpen={() => onNavigate('subscriptions')} />
    </div>
  );
}

function CashflowPanel({ period, onPeriodChange }: { period: string; onPeriodChange: (period: string) => void }) {
  const { c, formatCompactNumber, localeTag } = useI18n();
  const options = [
    { id: '7d', label: c.cashflow.period.sevenDays }, { id: '30d', label: c.cashflow.period.thirtyDays },
    { id: '6m', label: c.cashflow.period.sixMonths }, { id: '1y', label: c.cashflow.period.oneYear },
  ];
  const points = chartData[period];
  const maxMagnitude = Math.max(...points.map((point) => Math.abs(point)), 1);
  const scale = Math.ceil(maxMagnitude / 5) * 5 * 1000000;
  const dates: Record<string, string[]> = {
    '7d': ['2026-08-24', '2026-08-26', '2026-08-28', '2026-08-30'],
    '30d': ['2026-08-01', '2026-08-10', '2026-08-20', '2026-08-27'],
    '6m': ['2026-03-01', '2026-05-01', '2026-07-01', '2026-09-01'],
    '1y': ['2026-01-01', '2026-04-01', '2026-08-01', '2026-12-01'],
  };
  const dateOptions: Intl.DateTimeFormatOptions = period === '7d' ? { weekday: 'short' } : period === '30d' ? { day: '2-digit', month: '2-digit' } : { month: 'short' };
  const labels = dates[period].map((value) => new Intl.DateTimeFormat(localeTag, dateOptions).format(new Date(`${value}T12:00:00`)));
  const scaleLabel = formatCompactNumber(scale);
  return (
    <section className="cashflow-panel surface-raised">
      <div className="section-heading cashflow-heading"><h2>{c.cashflow.title}</h2><div className="segmented-control" aria-label={c.cashflow.rangeAria}>{options.map((option) => <button key={option.id} type="button" className={period === option.id ? 'is-active' : ''} onClick={() => onPeriodChange(option.id)} aria-pressed={period === option.id}>{option.label}</button>)}</div></div>
      <div className="chart-scale" aria-hidden="true"><span>{scaleLabel}</span><span>0</span><span>-{scaleLabel}</span></div>
      <div className="cashflow-chart" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(3px, 1fr))` }} role="img" aria-label={c.cashflow.chartAria}><span className="zero-line" aria-hidden="true" />{points.map((point, index) => <span className="chart-column" key={`${period}-${index}`}><i className={point >= 0 ? 'bar-positive' : 'bar-negative'} style={{ height: `${Math.max(8, Math.round((Math.abs(point) / maxMagnitude) * 68))}px` }} /></span>)}</div>
      <div className="chart-labels" aria-hidden="true">{labels.map((label) => <span key={label}>{label}</span>)}</div>
    </section>
  );
}

function SubscriptionOverview({ subscriptions, monthlyTotal, onOpen }: { subscriptions: Subscription[]; monthlyTotal: number; onOpen: () => void }) {
  const { c, formatCurrency, formatDate, plural } = useI18n();
  return (
    <aside className="subscription-overview surface-raised" aria-labelledby="renewal-title">
      <div className="section-heading"><h2 id="renewal-title">{c.renewals.title}</h2><button type="button" className="icon-plain" onClick={onOpen} aria-label={c.renewals.openAria}><DotsThree size={22} weight="bold" aria-hidden="true" /></button></div>
      <div className="renewal-visual"><div className="renewal-arc" aria-hidden="true"><span className="arc-marker one" /><span className="arc-marker two" /><span className="arc-marker three" /></div><div className="renewal-center"><strong>{subscriptions.length}</strong><span>{plural('renewals.upcomingCount', subscriptions.length)}</span></div><div className="renewal-dates">{subscriptions.map((item) => <span key={item.id}><i /> <strong>{formatDate(item.nextRenewal)}</strong><small>{plural('renewals.daysAway', daysUntil(item.nextRenewal))}</small></span>)}</div></div>
      <div className="subscription-preview-list">{subscriptions.map((item) => <button className="subscription-preview-row" key={item.id} type="button" onClick={onOpen}><span className={`service-mark ${item.tone}`}>{item.monogram}</span><span><strong>{item.name}</strong><small>{item.planKey ? c.demo.plans[item.planKey] : item.plan}</small></span><strong>{formatCurrency(item.amount)}</strong><CaretRight size={17} weight="bold" aria-hidden="true" /></button>)}</div>
      <button className="subscription-total" type="button" onClick={onOpen}><span>{c.renewals.totalPerMonth}</span><strong>{formatCurrency(monthlyTotal)}</strong></button><p className="demo-note">{c.common.demoData}</p>
    </aside>
  );
}

function TransactionList({ transactions, compact = false, onDelete }: { transactions: Transaction[]; compact?: boolean; onDelete?: (id: number) => void }) {
  const { c, formatCurrency, formatDate, t } = useI18n();
  if (transactions.length === 0) return <div className="empty-state"><Receipt size={28} weight="duotone" aria-hidden="true" /><strong>{c.transactions.emptyTitle}</strong><span>{c.transactions.emptyBody}</span></div>;
  return <div className={`transaction-list ${compact ? 'is-compact' : ''}`}>{transactions.map((transaction) => {
    const Icon = categoryIcon(transaction.category);
    const title = transaction.titleKey ? c.demo.transactions[transaction.titleKey] : transaction.title;
    return <article className="transaction-row" key={transaction.id}><span className={`transaction-icon ${transaction.amount > 0 ? 'is-income' : ''}`}><Icon size={19} weight="bold" aria-hidden="true" /></span><span className="transaction-copy"><strong>{title}</strong><small>{c.categories[transaction.category]}</small></span><time dateTime={transaction.date}>{formatDate(transaction.date)}</time><strong className={`transaction-amount ${transaction.amount > 0 ? 'is-positive' : ''}`}>{transaction.amount > 0 ? '+' : ''}{formatCurrency(transaction.amount)}</strong>{onDelete && <button className="row-action" type="button" onClick={() => onDelete(transaction.id)} aria-label={t('transactions.deleteAria', { title })}><Trash size={18} weight="bold" aria-hidden="true" /></button>}</article>;
  })}</div>;
}

function TransactionsView({ transactions, onDelete, onAdd }: { transactions: Transaction[]; onDelete: (id: number) => void; onAdd: () => void }) {
  const { c } = useI18n();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const filtered = transactions.filter((item) => {
    const title = item.titleKey ? c.demo.transactions[item.titleKey] : item.title;
    const matchesQuery = `${title} ${c.categories[item.category]}`.toLocaleLowerCase().includes(query.toLocaleLowerCase());
    return matchesQuery && (filter === 'all' || (filter === 'income' ? item.amount > 0 : item.amount < 0));
  });
  return <section className="full-view surface-raised"><div className="view-toolbar"><label className="search-field"><span className="sr-only">{c.transactions.search}</span><MagnifyingGlass size={19} weight="bold" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={c.transactions.search} /></label><div className="filter-group" aria-label={c.transactions.filterAria}>{(['all', 'income', 'expense'] as const).map((item) => <button type="button" key={item} className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)} aria-pressed={filter === item}>{c.transactions.filter[item]}</button>)}</div><button className="secondary-action" type="button" onClick={onAdd}><Plus size={18} weight="bold" aria-hidden="true" /> {c.actions.add}</button></div><TransactionList transactions={filtered} onDelete={onDelete} />{filtered.length === 0 && transactions.length > 0 && <div className="filter-empty"><MagnifyingGlass size={26} weight="duotone" aria-hidden="true" /><strong>{c.transactions.noResultsTitle}</strong><span>{c.transactions.noResultsBody}</span></div>}</section>;
}

function SubscriptionsView({ subscriptions, monthlyTotal, onAdd, onToggle, onDelete }: { subscriptions: Subscription[]; monthlyTotal: number; onAdd: () => void; onToggle: (id: number) => void; onDelete: (id: number) => void }) {
  const { c, formatCurrency, formatDate, plural, t } = useI18n();
  const sorted = [...subscriptions].sort((a, b) => a.nextRenewal.localeCompare(b.nextRenewal));
  return <div className="subscriptions-view"><section className="subscription-summary surface-raised"><div><span>{c.subscriptions.averageCost}</span><strong>{formatCurrency(monthlyTotal)}<small> {c.subscriptions.perMonth}</small></strong></div><div><span>{c.subscriptions.annualEstimate}</span><strong>{formatCurrency(monthlyTotal * 12)}</strong></div><button className="secondary-action" type="button" onClick={onAdd}><Plus size={18} weight="bold" aria-hidden="true" /> {c.actions.addSubscriptionShort}</button></section><section className="full-view surface-raised"><div className="section-heading subscription-list-heading"><h2>{c.subscriptions.renewingSoon}</h2><span>{plural('subscriptions.activeCount', subscriptions.filter((item) => item.status !== 'paused').length)}</span></div><div className="subscription-management-list">{sorted.map((item) => <article className={`subscription-management-row ${item.status === 'paused' ? 'is-paused' : ''}`} key={item.id}><span className={`service-mark large ${item.tone}`}>{item.monogram}</span><span className="subscription-main"><strong>{item.name}</strong><small>{item.planKey ? c.demo.plans[item.planKey] : item.plan}</small></span><span className={`status-label status-${item.status}`}>{c.subscriptions.status[item.status]}</span><span className="subscription-date"><strong>{formatDate(item.nextRenewal)}</strong><small>{plural('renewals.daysAway', daysUntil(item.nextRenewal))}</small></span><span className="subscription-price"><strong>{formatCurrency(item.amount)}</strong><small>{item.cycle === 'year' ? c.subscriptions.cycle.perYear : c.subscriptions.cycle.perMonth}</small></span><div className="management-actions"><button type="button" onClick={() => onToggle(item.id)} aria-label={t(item.status === 'paused' ? 'subscriptions.resumeAria' : 'subscriptions.pauseAria', { name: item.name })}>{item.status === 'paused' ? <Play size={18} weight="bold" aria-hidden="true" /> : <Pause size={18} weight="bold" aria-hidden="true" />}</button><button type="button" onClick={() => onDelete(item.id)} aria-label={t('subscriptions.deleteAria', { name: item.name })}><Trash size={18} weight="bold" aria-hidden="true" /></button></div></article>)}{sorted.length === 0 && <div className="empty-state"><CreditCard size={30} weight="duotone" aria-hidden="true" /><strong>{c.subscriptions.emptyTitle}</strong><span>{c.subscriptions.emptyBody}</span><button type="button" onClick={onAdd}>{c.actions.addSubscriptionShort}</button></div>}</div></section></div>;
}

function BudgetsView({ budgets }: { budgets: Budget[] }) {
  const { c, formatCurrency, formatMonthYear, formatPercent, t } = useI18n();
  const used = budgets.reduce((sum, item) => sum + item.spent, 0);
  const total = budgets.reduce((sum, item) => sum + item.limit, 0);
  const month = formatMonthYear(DEMO_TODAY);
  return <div className="budgets-view"><section className="budget-hero surface-raised"><div><span>{t('budgets.totalForMonth', { month })}</span><strong>{formatCurrency(total)}</strong></div><div><span>{c.budgets.used}</span><strong>{formatCurrency(used)}</strong><small>{t('budgets.totalShare', { percent: formatPercent(used / total) })}</small></div><TrendUp size={42} weight="duotone" aria-hidden="true" /></section><section className="full-view surface-raised"><div className="section-heading"><h2>{c.budgets.byCategory}</h2><span>{month}</span></div><div className="budget-list">{budgets.map((budget) => {
    const ratio = budget.spent / budget.limit; const percent = Math.round(ratio * 100); const warning = percent >= 90; const over = percent > 100; const amount = formatCurrency(Math.abs(budget.limit - budget.spent));
    return <article className="budget-row" key={budget.id}><span className={`budget-icon ${over ? 'is-over' : warning ? 'is-warning' : ''}`}>{over ? <WarningCircle size={20} weight="fill" aria-hidden="true" /> : <Wallet size={20} weight="bold" aria-hidden="true" />}</span><span className="budget-copy"><strong>{c.categories[budget.category]}</strong><small>{formatCurrency(budget.spent)} / {formatCurrency(budget.limit)}</small></span><span className={`budget-status ${over ? 'is-over' : warning ? 'is-warning' : ''}`}>{t(over ? 'budgets.overBy' : 'budgets.remaining', { amount })}</span><span className="budget-percentage">{formatPercent(ratio)}</span><span className="budget-meter" aria-label={t('budgets.usedAria', { percent: formatPercent(ratio) })}><i className={over ? 'is-over' : warning ? 'is-warning' : ''} style={{ width: `${Math.min(percent, 100)}%` }} /></span></article>;
  })}</div></section></div>;
}

function useDialogFocusTrap() {
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current; if (!dialog) return;
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((element) => element.offsetParent !== null);
      const first = focusable[0]; const last = focusable.at(-1); if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener('keydown', trapFocus); return () => dialog.removeEventListener('keydown', trapFocus);
  }, []);
  return dialogRef;
}

function TransactionSheet({ onClose, onSave }: { onClose: () => void; onSave: (input: NewTransaction) => void }) {
  const { c } = useI18n();
  const [type, setType] = useState<TransactionType>('expense'); const [title, setTitle] = useState(''); const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<CategoryId>('dining'); const [date, setDate] = useState('2026-08-27'); const [errors, setErrors] = useState<Record<string, string>>({}); const dialogRef = useDialogFocusTrap();
  function submit(event: FormEvent) {
    event.preventDefault(); const nextErrors: Record<string, string> = {}; const numericAmount = Number(amount);
    if (!title.trim()) nextErrors.title = c.validation.transactionName; if (!numericAmount || numericAmount <= 0) nextErrors.amount = c.validation.positiveAmount; if (!date) nextErrors.date = c.validation.transactionDate;
    setErrors(nextErrors); if (Object.keys(nextErrors).length) return; onSave({ title: title.trim(), amount: numericAmount, category, date, type }); onClose();
  }
  return <div className="sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} className="form-sheet" role="dialog" aria-modal="true" aria-labelledby="transaction-sheet-title"><div className="sheet-handle" aria-hidden="true" /><header className="sheet-header"><div><h2 id="transaction-sheet-title">{c.transactionForm.title}</h2><p>{c.transactionForm.subtitle}</p></div><button type="button" onClick={onClose} aria-label={c.common.close}><X size={21} weight="bold" aria-hidden="true" /></button></header><form onSubmit={submit} noValidate><div className="type-switch" aria-label={c.transactionForm.typeAria}><button type="button" className={type === 'expense' ? 'is-active' : ''} onClick={() => setType('expense')} aria-pressed={type === 'expense'}>{c.transactionForm.type.expense}</button><button type="button" className={type === 'income' ? 'is-active' : ''} onClick={() => setType('income')} aria-pressed={type === 'income'}>{c.transactionForm.type.income}</button></div><label className="field"><span>{c.transactionForm.name}</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder={c.transactionForm.namePlaceholder} aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'transaction-title-error' : undefined} />{errors.title && <small id="transaction-title-error" className="field-error" role="alert">{errors.title}</small>}</label><label className="field"><span>{c.transactionForm.amount}</span><div className="money-input"><input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))} placeholder="0" aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? 'transaction-amount-error' : undefined} /><strong>₫</strong></div>{errors.amount && <small id="transaction-amount-error" className="field-error" role="alert">{errors.amount}</small>}</label>{type === 'expense' && <label className="field"><span>{c.transactionForm.category}</span><select value={category} onChange={(event) => setCategory(event.target.value as CategoryId)}>{expenseCategories.map((item) => <option key={item} value={item}>{c.categories[item]}</option>)}</select></label>}<label className="field"><span>{c.transactionForm.date}</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'transaction-date-error' : undefined} />{errors.date && <small id="transaction-date-error" className="field-error" role="alert">{errors.date}</small>}</label><div className="sheet-actions"><button type="button" className="cancel-action" onClick={onClose}>{c.common.cancel}</button><button type="submit" className="primary-action">{c.transactionForm.save}</button></div></form></section></div>;
}

function SubscriptionSheet({ onClose, onSave }: { onClose: () => void; onSave: (input: NewSubscription) => void }) {
  const { c, currencySymbol, t } = useI18n();
  const [name, setName] = useState(''); const [plan, setPlan] = useState(c.demo.plans.personal); const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState<BillingCycle>('month'); const [nextRenewal, setNextRenewal] = useState('2026-09-01'); const [errors, setErrors] = useState<Record<string, string>>({}); const dialogRef = useDialogFocusTrap();
  function submit(event: FormEvent) {
    event.preventDefault(); const numericAmount = Number(amount); const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = c.validation.serviceName; if (!numericAmount || numericAmount <= 0) nextErrors.amount = c.validation.positiveAmount; if (!nextRenewal) nextErrors.nextRenewal = c.validation.renewalDate; else if (nextRenewal < '2026-08-27') nextErrors.nextRenewal = c.validation.renewalPast;
    setErrors(nextErrors); if (Object.keys(nextErrors).length) return; onSave({ name: name.trim(), plan: plan.trim() || c.demo.plans.personal, amount: numericAmount, cycle, nextRenewal }); onClose();
  }
  return <div className="sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialogRef} className="form-sheet" role="dialog" aria-modal="true" aria-labelledby="subscription-sheet-title"><div className="sheet-handle" aria-hidden="true" /><header className="sheet-header"><div><h2 id="subscription-sheet-title">{c.subscriptionForm.title}</h2><p>{c.subscriptionForm.subtitle}</p></div><button type="button" onClick={onClose} aria-label={c.common.close}><X size={21} weight="bold" aria-hidden="true" /></button></header><form onSubmit={submit} noValidate><label className="field"><span>{c.subscriptionForm.serviceName}</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder={c.subscriptionForm.servicePlaceholder} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'subscription-name-error' : undefined} />{errors.name && <small id="subscription-name-error" className="field-error" role="alert">{errors.name}</small>}</label><label className="field"><span>{c.subscriptionForm.plan}</span><input value={plan} onChange={(event) => setPlan(event.target.value)} placeholder={c.subscriptionForm.planPlaceholder} /></label><div className="split-fields"><label className="field"><span>{c.subscriptionForm.cost}</span><div className="money-input"><input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))} placeholder="0" aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? 'subscription-amount-error' : undefined} /><strong>{currencySymbol}</strong></div>{errors.amount && <small id="subscription-amount-error" className="field-error" role="alert">{errors.amount}</small>}</label><label className="field"><span>{c.subscriptionForm.cycle.label}</span><select value={cycle} onChange={(event) => setCycle(event.target.value as BillingCycle)}><option value="month">{c.subscriptionForm.cycle.month}</option><option value="year">{c.subscriptionForm.cycle.year}</option></select></label></div><label className="field"><span>{c.subscriptionForm.renewalDate}</span><input type="date" min="2026-08-27" value={nextRenewal} onChange={(event) => setNextRenewal(event.target.value)} aria-invalid={Boolean(errors.nextRenewal)} aria-describedby={errors.nextRenewal ? 'subscription-renewal-error' : undefined} />{errors.nextRenewal && <small id="subscription-renewal-error" className="field-error" role="alert">{errors.nextRenewal}</small>}</label><div className="info-callout"><CalendarBlank size={20} weight="bold" aria-hidden="true" /><span>{t('subscriptionForm.callout', { appName: APP_NAME })}</span></div><div className="sheet-actions"><button type="button" className="cancel-action" onClick={onClose}>{c.common.cancel}</button><button type="submit" className="primary-action">{c.subscriptionForm.save}</button></div></form></section></div>;
}
