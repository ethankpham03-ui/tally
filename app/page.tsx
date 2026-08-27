'use client';

import {
  ArrowCounterClockwise,
  ArrowDownRight,
  ArrowUpRight,
  ArrowsDownUp,
  Bank,
  Bell,
  CalendarBlank,
  CaretRight,
  ChartDonut,
  Check,
  CreditCard,
  DotsThree,
  ForkKnife,
  GearSix,
  House,
  MagnifyingGlass,
  Pause,
  Play,
  Plus,
  Receipt,
  ShoppingCart,
  Trash,
  TrendUp,
  Wallet,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type View = 'overview' | 'transactions' | 'subscriptions' | 'budgets';
type ModalKind = 'transaction' | 'subscription' | null;
type TransactionType = 'income' | 'expense';
type BillingCycle = 'month' | 'year';

type Transaction = {
  id: number;
  title: string;
  category: string;
  date: string;
  amount: number;
};

type Subscription = {
  id: number;
  name: string;
  plan: string;
  amount: number;
  cycle: BillingCycle;
  nextRenewal: string;
  status: 'active' | 'trial' | 'paused';
  previousStatus?: 'active' | 'trial';
  monogram: string;
  tone: 'green' | 'blue' | 'graphite' | 'red' | 'violet';
};

type Budget = {
  id: number;
  name: string;
  spent: number;
  limit: number;
};

const DEMO_TODAY = new Date('2026-08-27T12:00:00');

const initialTransactions: Transaction[] = [
  { id: 1, title: 'WinMart+', category: 'Mua sắm', date: '2026-08-26', amount: -450000 },
  { id: 2, title: 'Lương công ty', category: 'Thu nhập', date: '2026-08-25', amount: 53400000 },
  { id: 3, title: 'Grab', category: 'Di chuyển', date: '2026-08-24', amount: -68000 },
  { id: 4, title: 'Highlands Coffee', category: 'Ăn uống', date: '2026-08-23', amount: -95000 },
  { id: 5, title: 'Tiền điện tháng 8', category: 'Hóa đơn', date: '2026-08-21', amount: -1250000 },
];

const initialSubscriptions: Subscription[] = [
  { id: 1, name: 'Spotify', plan: 'Cá nhân', amount: 59000, cycle: 'month', nextRenewal: '2026-08-28', status: 'active', monogram: 'S', tone: 'green' },
  { id: 2, name: 'Figma', plan: 'Professional', amount: 249000, cycle: 'month', nextRenewal: '2026-09-02', status: 'active', monogram: 'F', tone: 'graphite' },
  { id: 3, name: 'iCloud+', plan: '200 GB', amount: 69000, cycle: 'month', nextRenewal: '2026-09-05', status: 'active', monogram: 'i', tone: 'blue' },
  { id: 4, name: 'ChatGPT', plan: 'Plus', amount: 500000, cycle: 'month', nextRenewal: '2026-09-07', status: 'active', monogram: 'C', tone: 'graphite' },
  { id: 5, name: 'Netflix', plan: 'Tiêu chuẩn', amount: 260000, cycle: 'month', nextRenewal: '2026-09-10', status: 'paused', monogram: 'N', tone: 'red' },
  { id: 6, name: 'Duolingo', plan: 'Super', amount: 1299000, cycle: 'year', nextRenewal: '2026-09-19', status: 'trial', monogram: 'D', tone: 'violet' },
];

const initialBudgets: Budget[] = [
  { id: 1, name: 'Ăn uống', spent: 2850000, limit: 4000000 },
  { id: 2, name: 'Mua sắm', spent: 1840000, limit: 2000000 },
  { id: 3, name: 'Di chuyển', spent: 680000, limit: 1200000 },
  { id: 4, name: 'Giải trí', spent: 1040000, limit: 800000 },
];

const chartData: Record<string, number[]> = {
  '7d': [3, -2, 6, -4, 5, 8, -3],
  '30d': [-2, -5, 1, 3, 4, 6, 9, 5, -2, -4, -6, -10, -7, 2, 5, 7, 3, -2, -5, -8, -4, 2, 6, 9, 5, 1, -3, -6, 3, 5],
  '6m': [4, 7, -3, 10, 6, 13, -5, 8, 11, -2, 9, 15],
  '1y': [5, 9, 7, 12, -2, 15, 11, 17, 13, 18, 16, 20],
};

const chartLabels: Record<string, string[]> = {
  '7d': ['T2', 'T4', 'T6', 'CN'],
  '30d': ['01/08', '10/08', '20/08', '27/08'],
  '6m': ['T3', 'T5', 'T7', 'T9'],
  '1y': ['T1', 'T4', 'T8', 'T12'],
};

const navItems: Array<{ id: View; label: string; icon: typeof House }> = [
  { id: 'overview', label: 'Tổng quan', icon: House },
  { id: 'transactions', label: 'Giao dịch', icon: ArrowsDownUp },
  { id: 'subscriptions', label: 'Gói đăng ký', icon: CreditCard },
  { id: 'budgets', label: 'Ngân sách', icon: ChartDonut },
];

const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

const shortCurrency = new Intl.NumberFormat('vi-VN', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function formatMoney(value: number) {
  return currency.format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(`${value}T12:00:00`));
}

function daysUntil(value: string) {
  return Math.max(0, Math.ceil((new Date(`${value}T12:00:00`).getTime() - DEMO_TODAY.getTime()) / 86400000));
}

function monthlyCost(subscription: Subscription) {
  return subscription.cycle === 'year' ? subscription.amount / 12 : subscription.amount;
}

function categoryIcon(category: string) {
  if (category === 'Thu nhập') return Bank;
  if (category === 'Ăn uống') return ForkKnife;
  if (category === 'Mua sắm') return ShoppingCart;
  if (category === 'Hóa đơn') return Receipt;
  return ArrowsDownUp;
}

function PageIcon({ view }: { view: View }) {
  const item = navItems.find((entry) => entry.id === view) ?? navItems[0];
  const Icon = item.icon;
  return <Icon size={20} weight="bold" aria-hidden="true" />;
}

export default function Home() {
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

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((item) => item.status !== 'paused'),
    [subscriptions],
  );

  const subscriptionMonthlyTotal = useMemo(
    () => Math.round(activeSubscriptions.reduce((sum, item) => sum + monthlyCost(item), 0)),
    [activeSubscriptions],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!modal) return;
    document.body.classList.add('is-sheet-open');
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.classList.remove('is-sheet-open');
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [modal]);

  function openModal(kind: Exclude<ModalKind, null>) {
    modalOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setModal(kind);
  }

  function closeModal() {
    setModal(null);
    window.requestAnimationFrame(() => modalOpener.current?.focus());
  }

  function announceFeature(feature: string) {
    setToast(`${feature} sẽ có trong phiên bản tiếp theo`);
  }

  function navigate(nextView: View) {
    setView(nextView);
    window.scrollTo({ top: 0 });
  }

  function addTransaction(input: Omit<Transaction, 'id' | 'amount'> & { amount: number; type: TransactionType }) {
    const signedAmount = input.type === 'income' ? input.amount : -input.amount;
    const transaction: Transaction = {
      id: Date.now(),
      title: input.title,
      category: input.type === 'income' ? 'Thu nhập' : input.category,
      date: input.date,
      amount: signedAmount,
    };
    setTransactions((current) => [...current, transaction].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id));
    setBalance((current) => current + signedAmount);
    if (signedAmount > 0) setIncome((current) => current + signedAmount);
    else setExpense((current) => current + Math.abs(signedAmount));
    if (signedAmount < 0) {
      setBudgets((current) => current.map((budget) => (
        budget.name === input.category ? { ...budget, spent: budget.spent + input.amount } : budget
      )));
    }
    setToast('Đã thêm giao dịch');
  }

  function removeTransaction(id: number) {
    const transaction = transactions.find((item) => item.id === id);
    if (!transaction) return;
    setTransactions((current) => current.filter((item) => item.id !== id));
    setBalance((current) => current - transaction.amount);
    if (transaction.amount > 0) setIncome((current) => Math.max(0, current - transaction.amount));
    else {
      setExpense((current) => Math.max(0, current - Math.abs(transaction.amount)));
      setBudgets((current) => current.map((budget) => (
        budget.name === transaction.category
          ? { ...budget, spent: Math.max(0, budget.spent - Math.abs(transaction.amount)) }
          : budget
      )));
    }
    setToast('Đã xóa giao dịch');
  }

  function addSubscription(input: Omit<Subscription, 'id' | 'monogram' | 'tone' | 'status'>) {
    const subscription: Subscription = {
      ...input,
      id: Date.now(),
      status: 'active',
      monogram: input.name.slice(0, 1).toUpperCase(),
      tone: 'blue',
    };
    setSubscriptions((current) => [...current, subscription]);
    setToast('Đã thêm gói đăng ký');
  }

  function toggleSubscription(id: number) {
    setSubscriptions((current) => current.map((item) => {
      if (item.id !== id) return item;
      if (item.status === 'paused') {
        return { ...item, status: item.previousStatus ?? 'active', previousStatus: undefined };
      }
      return { ...item, previousStatus: item.status, status: 'paused' };
    }));
    setToast('Đã cập nhật trạng thái theo dõi');
  }

  function removeSubscription(id: number) {
    setSubscriptions((current) => current.filter((item) => item.id !== id));
    setToast('Đã xóa gói đăng ký');
  }

  function resetDemo() {
    setTransactions(initialTransactions);
    setSubscriptions(initialSubscriptions);
    setBudgets(initialBudgets);
    setBalance(42680000);
    setIncome(53400000);
    setExpense(24720000);
    setView('overview');
    setToast('Đã khôi phục dữ liệu minh họa');
  }

  const title = navItems.find((item) => item.id === view)?.label ?? 'Tổng quan';

  return (
    <main className="app-frame">
      <aside className="desktop-sidebar" aria-label="Điều hướng chính">
        <button className="brand" type="button" onClick={() => navigate('overview')} aria-label="Mạch, về trang tổng quan">
          <span className="brand-signal" aria-hidden="true"><i /><i /><i /><i /><i /></span>
          <span>Mạch</span>
        </button>
        <nav className="desktop-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`nav-button ${view === item.id ? 'is-active' : ''}`}
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                aria-current={view === item.id ? 'page' : undefined}
              >
                <Icon size={21} weight={view === item.id ? 'fill' : 'bold'} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <button className="utility-button" type="button" onClick={resetDemo} aria-label="Khôi phục dữ liệu minh họa">
            <ArrowCounterClockwise size={20} weight="bold" aria-hidden="true" />
          </button>
          <button className="utility-button" type="button" onClick={() => announceFeature('Cài đặt')} aria-label="Cài đặt, sắp ra mắt">
            <GearSix size={20} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="mobile-appbar">
          <button className="mobile-brand" type="button" onClick={() => navigate('overview')} aria-label="Mạch, về trang tổng quan">
            <span className="brand-signal small" aria-hidden="true"><i /><i /><i /><i /><i /></span>
            <span>Mạch</span>
          </button>
          <div className="appbar-actions">
            <button className="icon-control" type="button" onClick={() => announceFeature('Thông báo')} aria-label="Thông báo, sắp ra mắt">
              <Bell size={20} weight="bold" aria-hidden="true" />
            </button>
            <span className="avatar" aria-label="Tài khoản của An Nhiên">AN</span>
          </div>
        </header>

        <header className="page-header">
          <div>
            <p className="desktop-greeting">Chào buổi sáng, Nhiên</p>
            <div className="mobile-title-row"><PageIcon view={view} /><h1 id={`page-title-${view}`}>{title}</h1></div>
            <p className="page-context">
              {view === 'overview' && 'Bạn đang kiểm soát tốt dòng tiền tháng này.'}
              {view === 'transactions' && 'Mọi khoản thu chi được sắp theo thời gian.'}
              {view === 'subscriptions' && 'Theo dõi phí định kỳ, app không tự hủy dịch vụ.'}
              {view === 'budgets' && 'Giữ giới hạn rõ ràng cho từng nhóm chi tiêu.'}
            </p>
          </div>
          <div className="header-actions">
            <span className="demo-badge">Dữ liệu minh họa</span>
            <button className="icon-control desktop-only" type="button" onClick={() => announceFeature('Thông báo')} aria-label="Thông báo, sắp ra mắt">
              <Bell size={20} weight="bold" aria-hidden="true" />
            </button>
            <button
              className="primary-action desktop-only"
              type="button"
              onClick={() => openModal(view === 'subscriptions' ? 'subscription' : 'transaction')}
            >
              <Plus size={19} weight="bold" aria-hidden="true" />
              {view === 'subscriptions' ? 'Thêm gói' : 'Thêm giao dịch'}
            </button>
          </div>
        </header>

        <div className="view-stage" key={view}>
          {view === 'overview' && (
            <Overview
              balance={balance}
              income={income}
              expense={expense}
              transactions={transactions}
              subscriptions={activeSubscriptions}
              subscriptionMonthlyTotal={subscriptionMonthlyTotal}
              onNavigate={navigate}
              onAddTransaction={() => openModal('transaction')}
            />
          )}
          {view === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              onDelete={removeTransaction}
              onAdd={() => openModal('transaction')}
            />
          )}
          {view === 'subscriptions' && (
            <SubscriptionsView
              subscriptions={subscriptions}
              monthlyTotal={subscriptionMonthlyTotal}
              onAdd={() => openModal('subscription')}
              onToggle={toggleSubscription}
              onDelete={removeSubscription}
            />
          )}
          {view === 'budgets' && (
            <BudgetsView budgets={budgets} />
          )}
        </div>
      </section>

      <nav className="mobile-bottom-nav" aria-label="Điều hướng chính trên điện thoại">
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" className={view === item.id ? 'is-active' : ''} onClick={() => navigate(item.id)} aria-current={view === item.id ? 'page' : undefined}>
              <Icon size={21} weight={view === item.id ? 'fill' : 'bold'} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button className="mobile-add" type="button" onClick={() => openModal('transaction')} aria-label="Thêm giao dịch">
          <Plus size={25} weight="bold" aria-hidden="true" />
        </button>
        {navItems.slice(2).map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" className={view === item.id ? 'is-active' : ''} onClick={() => navigate(item.id)} aria-current={view === item.id ? 'page' : undefined}>
              <Icon size={21} weight={view === item.id ? 'fill' : 'bold'} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {modal === 'transaction' && (
        <TransactionSheet onClose={closeModal} onSave={addTransaction} />
      )}
      {modal === 'subscription' && (
        <SubscriptionSheet onClose={closeModal} onSave={addSubscription} />
      )}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <Check size={18} weight="bold" aria-hidden="true" />
          {toast}
        </div>
      )}
    </main>
  );
}

function Overview({
  balance,
  income,
  expense,
  transactions,
  subscriptions,
  subscriptionMonthlyTotal,
  onNavigate,
  onAddTransaction,
}: {
  balance: number;
  income: number;
  expense: number;
  transactions: Transaction[];
  subscriptions: Subscription[];
  subscriptionMonthlyTotal: number;
  onNavigate: (view: View) => void;
  onAddTransaction: () => void;
}) {
  const [period, setPeriod] = useState('30d');
  const upcoming = [...subscriptions].sort((a, b) => a.nextRenewal.localeCompare(b.nextRenewal)).slice(0, 3);
  const expenseRatio = income > 0 ? ((expense / income) * 100).toFixed(1).replace('.', ',') : '0';

  return (
    <div className="overview-layout">
      <div className="overview-primary">
        <section className="balance-surface surface-raised" aria-labelledby="balance-title">
          <div className="balance-topline">
            <span id="balance-title">Số dư khả dụng</span>
            <Wallet size={21} weight="bold" aria-hidden="true" />
          </div>
          <strong className="balance-value">{formatMoney(balance)}</strong>
          <div className="summary-pair">
            <div className="summary-metric">
              <span className="metric-icon positive"><ArrowUpRight size={18} weight="bold" aria-hidden="true" /></span>
              <span><small>Thu nhập tháng này</small><strong>{formatMoney(income)}</strong><em className="positive-copy">Đã ghi nhận trong tháng</em></span>
            </div>
            <div className="summary-divider" aria-hidden="true" />
            <div className="summary-metric">
              <span className="metric-icon negative"><ArrowDownRight size={18} weight="bold" aria-hidden="true" /></span>
              <span><small>Chi tiêu tháng này</small><strong>{formatMoney(expense)}</strong><em className="negative-copy">{expenseRatio}% tổng thu nhập</em></span>
            </div>
          </div>
        </section>

        {upcoming[0] && (
          <button className="mobile-next-renewal surface-raised" type="button" onClick={() => onNavigate('subscriptions')}>
            <span className={`service-mark ${upcoming[0].tone}`}>{upcoming[0].monogram}</span>
            <span><small>Gia hạn gần nhất</small><strong>{upcoming[0].name}</strong></span>
            <span className="renewal-amount"><strong>{formatMoney(upcoming[0].amount)}</strong><small>Còn {daysUntil(upcoming[0].nextRenewal)} ngày</small></span>
            <CaretRight size={18} weight="bold" aria-hidden="true" />
          </button>
        )}

        <CashflowPanel period={period} onPeriodChange={setPeriod} />

        <section className="activity-panel surface-raised">
          <div className="section-heading">
            <h2>Giao dịch gần đây</h2>
            <button type="button" className="quiet-link" onClick={() => onNavigate('transactions')}>Xem tất cả <CaretRight size={14} weight="bold" aria-hidden="true" /></button>
          </div>
          <TransactionList transactions={transactions.slice(0, 3)} compact />
          <button className="mobile-inline-action" type="button" onClick={onAddTransaction}><Plus size={18} weight="bold" aria-hidden="true" /> Thêm giao dịch</button>
        </section>
      </div>

      <SubscriptionOverview
        subscriptions={upcoming}
        monthlyTotal={subscriptionMonthlyTotal}
        onOpen={() => onNavigate('subscriptions')}
      />
    </div>
  );
}

function CashflowPanel({ period, onPeriodChange }: { period: string; onPeriodChange: (period: string) => void }) {
  const options = [
    { id: '7d', label: '7 ngày' },
    { id: '30d', label: '30 ngày' },
    { id: '6m', label: '6 tháng' },
    { id: '1y', label: '1 năm' },
  ];
  const points = chartData[period];
  const maxMagnitude = Math.max(...points.map((point) => Math.abs(point)), 1);
  const scale = Math.ceil(maxMagnitude / 5) * 5;
  const labels = chartLabels[period];
  return (
    <section className="cashflow-panel surface-raised">
      <div className="section-heading cashflow-heading">
        <h2>Dòng tiền</h2>
        <div className="segmented-control" aria-label="Khoảng thời gian">
          {options.map((option) => (
            <button key={option.id} type="button" className={period === option.id ? 'is-active' : ''} onClick={() => onPeriodChange(option.id)} aria-pressed={period === option.id}>
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-scale" aria-hidden="true"><span>{scale}M</span><span>0</span><span>-{scale}M</span></div>
      <div className="cashflow-chart" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(3px, 1fr))` }} role="img" aria-label="Biểu đồ dòng tiền, cột xanh là tiền vào và cột đỏ là tiền ra">
        <span className="zero-line" aria-hidden="true" />
        {points.map((point, index) => (
          <span className="chart-column" key={`${period}-${index}`}>
            <i className={point >= 0 ? 'bar-positive' : 'bar-negative'} style={{ height: `${Math.max(8, Math.round((Math.abs(point) / maxMagnitude) * 68))}px` }} />
          </span>
        ))}
      </div>
      <div className="chart-labels" aria-hidden="true">{labels.map((label) => <span key={label}>{label}</span>)}</div>
    </section>
  );
}

function SubscriptionOverview({ subscriptions, monthlyTotal, onOpen }: { subscriptions: Subscription[]; monthlyTotal: number; onOpen: () => void }) {
  return (
    <aside className="subscription-overview surface-raised" aria-labelledby="renewal-title">
      <div className="section-heading">
        <h2 id="renewal-title">Kỳ gia hạn</h2>
        <button type="button" className="icon-plain" onClick={onOpen} aria-label="Mở quản lý gói đăng ký"><DotsThree size={22} weight="bold" aria-hidden="true" /></button>
      </div>
      <div className="renewal-visual">
        <div className="renewal-arc" aria-hidden="true"><span className="arc-marker one" /><span className="arc-marker two" /><span className="arc-marker three" /></div>
        <div className="renewal-center"><strong>{subscriptions.length}</strong><span>kỳ sắp tới</span></div>
        <div className="renewal-dates">
          {subscriptions.map((item) => <span key={item.id}><i /> <strong>{formatDate(item.nextRenewal)}</strong><small>{daysUntil(item.nextRenewal)} ngày tới</small></span>)}
        </div>
      </div>
      <div className="subscription-preview-list">
        {subscriptions.map((item) => (
          <button className="subscription-preview-row" key={item.id} type="button" onClick={onOpen}>
            <span className={`service-mark ${item.tone}`}>{item.monogram}</span>
            <span><strong>{item.name}</strong><small>{item.plan}</small></span>
            <strong>{formatMoney(item.amount)}</strong>
            <CaretRight size={17} weight="bold" aria-hidden="true" />
          </button>
        ))}
      </div>
      <button className="subscription-total" type="button" onClick={onOpen}>
        <span>Tổng cộng mỗi tháng</span>
        <strong>{formatMoney(monthlyTotal)}</strong>
      </button>
      <p className="demo-note">Dữ liệu minh họa</p>
    </aside>
  );
}

function TransactionList({ transactions, compact = false, onDelete }: { transactions: Transaction[]; compact?: boolean; onDelete?: (id: number) => void }) {
  if (transactions.length === 0) {
    return <div className="empty-state"><Receipt size={28} weight="duotone" aria-hidden="true" /><strong>Chưa có giao dịch</strong><span>Thêm khoản đầu tiên để bắt đầu theo dõi.</span></div>;
  }
  return (
    <div className={`transaction-list ${compact ? 'is-compact' : ''}`}>
      {transactions.map((transaction) => {
        const Icon = categoryIcon(transaction.category);
        return (
          <article className="transaction-row" key={transaction.id}>
            <span className={`transaction-icon ${transaction.amount > 0 ? 'is-income' : ''}`}><Icon size={19} weight="bold" aria-hidden="true" /></span>
            <span className="transaction-copy"><strong>{transaction.title}</strong><small>{transaction.category}</small></span>
            <time dateTime={transaction.date}>{formatDate(transaction.date)}</time>
            <strong className={`transaction-amount ${transaction.amount > 0 ? 'is-positive' : ''}`}>{transaction.amount > 0 ? '+' : ''}{formatMoney(transaction.amount)}</strong>
            {onDelete && (
              <button className="row-action" type="button" onClick={() => onDelete(transaction.id)} aria-label={`Xóa giao dịch ${transaction.title}`}><Trash size={18} weight="bold" aria-hidden="true" /></button>
            )}
          </article>
        );
      })}
    </div>
  );
}

function TransactionsView({ transactions, onDelete, onAdd }: { transactions: Transaction[]; onDelete: (id: number) => void; onAdd: () => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const filtered = transactions.filter((item) => {
    const matchesQuery = `${item.title} ${item.category}`.toLowerCase().includes(query.toLowerCase());
    const matchesType = filter === 'all' || (filter === 'income' ? item.amount > 0 : item.amount < 0);
    return matchesQuery && matchesType;
  });
  return (
    <section className="full-view surface-raised">
      <div className="view-toolbar">
        <label className="search-field">
          <span className="sr-only">Tìm giao dịch</span>
          <MagnifyingGlass size={19} weight="bold" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm giao dịch" />
        </label>
        <div className="filter-group" aria-label="Lọc giao dịch">
          {(['all', 'income', 'expense'] as const).map((item) => (
            <button type="button" key={item} className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)} aria-pressed={filter === item}>
              {item === 'all' ? 'Tất cả' : item === 'income' ? 'Khoản thu' : 'Khoản chi'}
            </button>
          ))}
        </div>
        <button className="secondary-action" type="button" onClick={onAdd}><Plus size={18} weight="bold" aria-hidden="true" /> Thêm</button>
      </div>
      <TransactionList transactions={filtered} onDelete={onDelete} />
      {filtered.length === 0 && transactions.length > 0 && (
        <div className="filter-empty"><MagnifyingGlass size={26} weight="duotone" aria-hidden="true" /><strong>Không tìm thấy kết quả</strong><span>Thử từ khóa hoặc bộ lọc khác.</span></div>
      )}
    </section>
  );
}

function SubscriptionsView({ subscriptions, monthlyTotal, onAdd, onToggle, onDelete }: { subscriptions: Subscription[]; monthlyTotal: number; onAdd: () => void; onToggle: (id: number) => void; onDelete: (id: number) => void }) {
  const sorted = [...subscriptions].sort((a, b) => a.nextRenewal.localeCompare(b.nextRenewal));
  return (
    <div className="subscriptions-view">
      <section className="subscription-summary surface-raised">
        <div><span>Chi phí trung bình</span><strong>{formatMoney(monthlyTotal)}<small> / tháng</small></strong></div>
        <div><span>Ước tính mỗi năm</span><strong>{formatMoney(monthlyTotal * 12)}</strong></div>
        <button className="secondary-action" type="button" onClick={onAdd}><Plus size={18} weight="bold" aria-hidden="true" /> Thêm gói</button>
      </section>
      <section className="full-view surface-raised">
        <div className="section-heading subscription-list-heading"><h2>Sắp gia hạn</h2><span>{subscriptions.filter((item) => item.status !== 'paused').length} gói đang hoạt động</span></div>
        <div className="subscription-management-list">
          {sorted.map((item) => (
            <article className={`subscription-management-row ${item.status === 'paused' ? 'is-paused' : ''}`} key={item.id}>
              <span className={`service-mark large ${item.tone}`}>{item.monogram}</span>
              <span className="subscription-main"><strong>{item.name}</strong><small>{item.plan}</small></span>
              <span className={`status-label status-${item.status}`}>{item.status === 'active' ? 'Đang hoạt động' : item.status === 'trial' ? 'Dùng thử' : 'Tạm dừng'}</span>
              <span className="subscription-date"><strong>{formatDate(item.nextRenewal)}</strong><small>{daysUntil(item.nextRenewal)} ngày tới</small></span>
              <span className="subscription-price"><strong>{formatMoney(item.amount)}</strong><small>{item.cycle === 'year' ? 'mỗi năm' : 'mỗi tháng'}</small></span>
              <div className="management-actions">
                <button type="button" onClick={() => onToggle(item.id)} aria-label={`${item.status === 'paused' ? 'Tiếp tục theo dõi' : 'Tạm dừng theo dõi'} ${item.name}`}>
                  {item.status === 'paused' ? <Play size={18} weight="bold" aria-hidden="true" /> : <Pause size={18} weight="bold" aria-hidden="true" />}
                </button>
                <button type="button" onClick={() => onDelete(item.id)} aria-label={`Xóa ${item.name}`}><Trash size={18} weight="bold" aria-hidden="true" /></button>
              </div>
            </article>
          ))}
          {sorted.length === 0 && <div className="empty-state"><CreditCard size={30} weight="duotone" aria-hidden="true" /><strong>Chưa có gói đăng ký</strong><span>Thêm dịch vụ đầu tiên để theo dõi kỳ gia hạn.</span><button type="button" onClick={onAdd}>Thêm gói</button></div>}
        </div>
      </section>
    </div>
  );
}

function BudgetsView({ budgets }: { budgets: Budget[] }) {
  const used = budgets.reduce((sum, item) => sum + item.spent, 0);
  const total = budgets.reduce((sum, item) => sum + item.limit, 0);
  return (
    <div className="budgets-view">
      <section className="budget-hero surface-raised">
        <div><span>Tổng ngân sách tháng 8</span><strong>{formatMoney(total)}</strong></div>
        <div><span>Đã sử dụng</span><strong>{formatMoney(used)}</strong><small>{Math.round((used / total) * 100)}% tổng hạn mức</small></div>
        <TrendUp size={42} weight="duotone" aria-hidden="true" />
      </section>
      <section className="full-view surface-raised">
        <div className="section-heading"><h2>Theo danh mục</h2><span>Tháng 8, 2026</span></div>
        <div className="budget-list">
          {budgets.map((budget) => {
            const percent = Math.round((budget.spent / budget.limit) * 100);
            const warning = percent >= 90;
            const over = percent > 100;
            return (
              <article className="budget-row" key={budget.id}>
                <span className={`budget-icon ${over ? 'is-over' : warning ? 'is-warning' : ''}`}>
                  {over ? <WarningCircle size={20} weight="fill" aria-hidden="true" /> : <Wallet size={20} weight="bold" aria-hidden="true" />}
                </span>
                <span className="budget-copy"><strong>{budget.name}</strong><small>{formatMoney(budget.spent)} / {formatMoney(budget.limit)}</small></span>
                <span className={`budget-status ${over ? 'is-over' : warning ? 'is-warning' : ''}`}>{over ? `Vượt ${formatMoney(budget.spent - budget.limit)}` : `Còn ${formatMoney(budget.limit - budget.spent)}`}</span>
                <span className="budget-percentage">{percent}%</span>
                <span className="budget-meter" aria-label={`Đã dùng ${percent}%`}><i className={over ? 'is-over' : warning ? 'is-warning' : ''} style={{ width: `${Math.min(percent, 100)}%` }} /></span>
              </article>
            );
          })}
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
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.offsetParent !== null);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', trapFocus);
    return () => dialog.removeEventListener('keydown', trapFocus);
  }, []);

  return dialogRef;
}

function TransactionSheet({ onClose, onSave }: { onClose: () => void; onSave: (input: Omit<Transaction, 'id' | 'amount'> & { amount: number; type: TransactionType }) => void }) {
  const [type, setType] = useState<TransactionType>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Ăn uống');
  const [date, setDate] = useState('2026-08-27');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dialogRef = useDialogFocusTrap();

  function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    const numericAmount = Number(amount);
    if (!title.trim()) nextErrors.title = 'Nhập tên giao dịch.';
    if (!numericAmount || numericAmount <= 0) nextErrors.amount = 'Số tiền phải lớn hơn 0.';
    if (!date) nextErrors.date = 'Chọn ngày giao dịch.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSave({ title: title.trim(), amount: numericAmount, category, date, type });
    onClose();
  }

  return (
    <div className="sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="form-sheet" role="dialog" aria-modal="true" aria-labelledby="transaction-sheet-title">
        <div className="sheet-handle" aria-hidden="true" />
        <header className="sheet-header"><div><h2 id="transaction-sheet-title">Thêm giao dịch</h2><p>Ghi lại khoản thu hoặc chi mới.</p></div><button type="button" onClick={onClose} aria-label="Đóng"><X size={21} weight="bold" aria-hidden="true" /></button></header>
        <form onSubmit={submit} noValidate>
          <div className="type-switch" aria-label="Loại giao dịch">
            <button type="button" className={type === 'expense' ? 'is-active' : ''} onClick={() => setType('expense')} aria-pressed={type === 'expense'}>Khoản chi</button>
            <button type="button" className={type === 'income' ? 'is-active' : ''} onClick={() => setType('income')} aria-pressed={type === 'income'}>Khoản thu</button>
          </div>
          <label className="field"><span>Tên giao dịch</span><input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ví dụ: Ăn trưa" aria-invalid={Boolean(errors.title)} aria-describedby={errors.title ? 'transaction-title-error' : undefined} />{errors.title && <small id="transaction-title-error" className="field-error" role="alert">{errors.title}</small>}</label>
          <label className="field"><span>Số tiền</span><div className="money-input"><input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))} placeholder="0" aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? 'transaction-amount-error' : undefined} /><strong>₫</strong></div>{errors.amount && <small id="transaction-amount-error" className="field-error" role="alert">{errors.amount}</small>}</label>
          {type === 'expense' && <label className="field"><span>Danh mục</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option>Ăn uống</option><option>Mua sắm</option><option>Di chuyển</option><option>Hóa đơn</option><option>Giải trí</option><option>Khác</option></select></label>}
          <label className="field"><span>Ngày giao dịch</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'transaction-date-error' : undefined} />{errors.date && <small id="transaction-date-error" className="field-error" role="alert">{errors.date}</small>}</label>
          <div className="sheet-actions"><button type="button" className="cancel-action" onClick={onClose}>Hủy</button><button type="submit" className="primary-action">Lưu giao dịch</button></div>
        </form>
      </section>
    </div>
  );
}

function SubscriptionSheet({ onClose, onSave }: { onClose: () => void; onSave: (input: Omit<Subscription, 'id' | 'monogram' | 'tone' | 'status'>) => void }) {
  const [name, setName] = useState('');
  const [plan, setPlan] = useState('Cá nhân');
  const [amount, setAmount] = useState('');
  const [cycle, setCycle] = useState<BillingCycle>('month');
  const [nextRenewal, setNextRenewal] = useState('2026-09-01');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dialogRef = useDialogFocusTrap();

  function submit(event: FormEvent) {
    event.preventDefault();
    const numericAmount = Number(amount);
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = 'Nhập tên dịch vụ.';
    if (!numericAmount || numericAmount <= 0) nextErrors.amount = 'Số tiền phải lớn hơn 0.';
    if (!nextRenewal) nextErrors.nextRenewal = 'Chọn ngày gia hạn.';
    else if (nextRenewal < '2026-08-27') nextErrors.nextRenewal = 'Ngày gia hạn không thể ở trong quá khứ.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    onSave({ name: name.trim(), plan: plan.trim() || 'Cá nhân', amount: numericAmount, cycle, nextRenewal });
    onClose();
  }

  return (
    <div className="sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="form-sheet" role="dialog" aria-modal="true" aria-labelledby="subscription-sheet-title">
        <div className="sheet-handle" aria-hidden="true" />
        <header className="sheet-header"><div><h2 id="subscription-sheet-title">Thêm gói đăng ký</h2><p>Theo dõi kỳ phí tiếp theo của một dịch vụ.</p></div><button type="button" onClick={onClose} aria-label="Đóng"><X size={21} weight="bold" aria-hidden="true" /></button></header>
        <form onSubmit={submit} noValidate>
          <label className="field"><span>Tên dịch vụ</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Spotify" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'subscription-name-error' : undefined} />{errors.name && <small id="subscription-name-error" className="field-error" role="alert">{errors.name}</small>}</label>
          <label className="field"><span>Gói đang dùng</span><input value={plan} onChange={(event) => setPlan(event.target.value)} placeholder="Cá nhân" /></label>
          <div className="split-fields">
            <label className="field"><span>Chi phí</span><div className="money-input"><input inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))} placeholder="0" aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? 'subscription-amount-error' : undefined} /><strong>₫</strong></div>{errors.amount && <small id="subscription-amount-error" className="field-error" role="alert">{errors.amount}</small>}</label>
            <label className="field"><span>Chu kỳ</span><select value={cycle} onChange={(event) => setCycle(event.target.value as BillingCycle)}><option value="month">Hàng tháng</option><option value="year">Hàng năm</option></select></label>
          </div>
          <label className="field"><span>Ngày gia hạn tiếp theo</span><input type="date" min="2026-08-27" value={nextRenewal} onChange={(event) => setNextRenewal(event.target.value)} aria-invalid={Boolean(errors.nextRenewal)} aria-describedby={errors.nextRenewal ? 'subscription-renewal-error' : undefined} />{errors.nextRenewal && <small id="subscription-renewal-error" className="field-error" role="alert">{errors.nextRenewal}</small>}</label>
          <div className="info-callout"><CalendarBlank size={20} weight="bold" aria-hidden="true" /><span>Mạch chỉ theo dõi kỳ phí. Việc hủy dịch vụ vẫn thực hiện tại nhà cung cấp.</span></div>
          <div className="sheet-actions"><button type="button" className="cancel-action" onClick={onClose}>Hủy</button><button type="submit" className="primary-action">Lưu gói đăng ký</button></div>
        </form>
      </section>
    </div>
  );
}
