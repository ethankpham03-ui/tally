'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export const APP_NAME = 'Flux' as const;
export const DEFAULT_LOCALE = 'en' as const;
export const SUPPORTED_LOCALES = ['en', 'vi'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const localeTags: Record<Locale, string> = {
  en: 'en-US',
  vi: 'vi-VN',
};

export const openGraphLocales: Record<Locale, string> = {
  en: 'en_US',
  vi: 'vi_VN',
};

const enCatalog = {
  common: {
    demoData: 'Demo data',
    close: 'Close',
    cancel: 'Cancel',
  },
  language: {
    label: 'Language',
    changeAria: 'Change language',
    en: 'English',
    vi: 'Tiếng Việt',
  },
  nav: {
    overview: 'Overview',
    transactions: 'Transactions',
    subscriptions: 'Subscriptions',
    budgets: 'Budgets',
    mainAria: 'Main navigation',
    mobileAria: 'Main mobile navigation',
    homeAria: '{appName}, go to overview',
  },
  actions: {
    add: 'Add',
    addTransaction: 'Add transaction',
    addSubscription: 'Add subscription',
    addSubscriptionShort: 'Add subscription',
  },
  features: {
    settings: 'Settings',
    notifications: 'Notifications',
  },
  a11y: {
    restoreDemo: 'Restore demo data',
    comingSoon: '{feature}, coming soon',
    account: "{name}'s account",
  },
  header: {
    greeting: 'Good morning, {name}',
    context: {
      overview: "You're in control of this month's cash flow.",
      transactions: 'All income and expenses, ordered by date.',
      subscriptions: 'Track recurring charges; the app does not cancel services for you.',
      budgets: 'Keep clear limits for every spending category.',
    },
  },
  toast: {
    comingSoon: '{feature} is coming in the next version.',
    transactionAdded: 'Transaction added.',
    transactionDeleted: 'Transaction deleted.',
    subscriptionAdded: 'Subscription added.',
    trackingUpdated: 'Tracking status updated.',
    subscriptionDeleted: 'Subscription deleted.',
    demoRestored: 'Demo data restored.',
  },
  overview: {
    availableBalance: 'Available balance',
    incomeThisMonth: 'Income this month',
    recordedThisMonth: 'Recorded this month',
    spendingThisMonth: 'Spending this month',
    incomeShare: '{percent} of total income',
    nextRenewal: 'Next renewal',
    daysLeft: {
      one: '{count} day left',
      other: '{count} days left',
    },
    recentTransactions: 'Recent transactions',
    viewAll: 'View all',
  },
  cashflow: {
    title: 'Cash flow',
    rangeAria: 'Time range',
    period: {
      sevenDays: '7 days',
      thirtyDays: '30 days',
      sixMonths: '6 months',
      oneYear: '1 year',
    },
    chartAria: 'Cash flow chart; green bars show money in and red bars show money out.',
  },
  renewals: {
    title: 'Renewals',
    openAria: 'Open subscription management',
    upcomingCount: {
      one: '{count} upcoming renewal',
      other: '{count} upcoming renewals',
    },
    daysAway: {
      one: '{count} day from now',
      other: '{count} days from now',
    },
    totalPerMonth: 'Total per month',
  },
  transactions: {
    emptyTitle: 'No transactions yet',
    emptyBody: 'Add your first transaction to start tracking.',
    deleteAria: 'Delete transaction {title}',
    search: 'Search transactions',
    filterAria: 'Filter transactions',
    filter: {
      all: 'All',
      income: 'Income',
      expense: 'Expenses',
    },
    noResultsTitle: 'No results found',
    noResultsBody: 'Try a different keyword or filter.',
  },
  subscriptions: {
    averageCost: 'Average monthly cost',
    perMonth: '/ month',
    annualEstimate: 'Estimated per year',
    renewingSoon: 'Renewing soon',
    activeCount: {
      one: '{count} active subscription',
      other: '{count} active subscriptions',
    },
    status: {
      active: 'Active',
      trial: 'Trial',
      paused: 'Paused',
    },
    cycle: {
      perMonth: 'per month',
      perYear: 'per year',
    },
    pauseAria: 'Pause tracking {name}',
    resumeAria: 'Resume tracking {name}',
    deleteAria: 'Delete {name}',
    emptyTitle: 'No subscriptions yet',
    emptyBody: 'Add your first service to track its renewal.',
  },
  budgets: {
    totalForMonth: 'Total budget for {month}',
    used: 'Used',
    totalShare: '{percent} of total limit',
    byCategory: 'By category',
    overBy: 'Over by {amount}',
    remaining: '{amount} left',
    usedAria: '{percent} used',
  },
  transactionForm: {
    title: 'Add transaction',
    subtitle: 'Record new income or spending.',
    typeAria: 'Transaction type',
    type: {
      expense: 'Expense',
      income: 'Income',
    },
    name: 'Transaction name',
    namePlaceholder: 'Example: Lunch',
    amount: 'Amount',
    category: 'Category',
    date: 'Transaction date',
    save: 'Save transaction',
  },
  subscriptionForm: {
    title: 'Add subscription',
    subtitle: 'Track the next charge for a service.',
    serviceName: 'Service name',
    servicePlaceholder: 'Example: Spotify',
    plan: 'Current plan',
    planPlaceholder: 'Personal',
    cost: 'Cost',
    cycle: {
      label: 'Billing cycle',
      month: 'Monthly',
      year: 'Yearly',
    },
    renewalDate: 'Next renewal date',
    callout: '{appName} tracks charges only. Cancel services with the provider.',
    save: 'Save subscription',
  },
  validation: {
    transactionName: 'Enter a transaction name.',
    positiveAmount: 'Amount must be greater than 0.',
    transactionDate: 'Choose a transaction date.',
    serviceName: 'Enter a service name.',
    renewalDate: 'Choose a renewal date.',
    renewalPast: 'Renewal date cannot be in the past.',
  },
  categories: {
    income: 'Income',
    dining: 'Dining',
    shopping: 'Shopping',
    transport: 'Transport',
    bills: 'Bills',
    entertainment: 'Entertainment',
    other: 'Other',
  },
  demo: {
    transactions: {
      winmart: 'WinMart+',
      companySalary: 'Company salary',
      grab: 'Grab',
      highlandsCoffee: 'Highlands Coffee',
      augustElectricity: 'August electricity bill',
    },
    plans: {
      personal: 'Personal',
      professional: 'Professional',
      storage200Gb: '200 GB',
      plus: 'Plus',
      standard: 'Standard',
      super: 'Super',
    },
  },
  meta: {
    title: '{appName} | Personal finance manager',
    description: 'Track income, expenses, budgets, and recurring subscriptions in one place.',
    socialTitle: '{appName} | Clearer cash flow',
    socialAlt: '{appName} — Clearer cash flow. Lighter living.',
  },
} as const;

type WidenCatalog<T> = T extends string
  ? string
  : T extends Record<string, unknown>
    ? { [Key in keyof T]: WidenCatalog<T[Key]> }
    : never;

export type TranslationCatalog = WidenCatalog<typeof enCatalog>;

const viCatalog = {
  common: {
    demoData: 'Dữ liệu minh họa',
    close: 'Đóng',
    cancel: 'Hủy',
  },
  language: {
    label: 'Ngôn ngữ',
    changeAria: 'Đổi ngôn ngữ',
    en: 'English',
    vi: 'Tiếng Việt',
  },
  nav: {
    overview: 'Tổng quan',
    transactions: 'Giao dịch',
    subscriptions: 'Gói đăng ký',
    budgets: 'Ngân sách',
    mainAria: 'Điều hướng chính',
    mobileAria: 'Điều hướng chính trên điện thoại',
    homeAria: '{appName}, về trang tổng quan',
  },
  actions: {
    add: 'Thêm',
    addTransaction: 'Thêm giao dịch',
    addSubscription: 'Thêm gói đăng ký',
    addSubscriptionShort: 'Thêm gói',
  },
  features: {
    settings: 'Cài đặt',
    notifications: 'Thông báo',
  },
  a11y: {
    restoreDemo: 'Khôi phục dữ liệu minh họa',
    comingSoon: '{feature}, sắp ra mắt',
    account: 'Tài khoản của {name}',
  },
  header: {
    greeting: 'Chào buổi sáng, {name}',
    context: {
      overview: 'Bạn đang kiểm soát tốt dòng tiền tháng này.',
      transactions: 'Mọi khoản thu chi được sắp theo thời gian.',
      subscriptions: 'Theo dõi phí định kỳ, app không tự hủy dịch vụ.',
      budgets: 'Giữ giới hạn rõ ràng cho từng nhóm chi tiêu.',
    },
  },
  toast: {
    comingSoon: '{feature} sẽ có trong phiên bản tiếp theo.',
    transactionAdded: 'Đã thêm giao dịch.',
    transactionDeleted: 'Đã xóa giao dịch.',
    subscriptionAdded: 'Đã thêm gói đăng ký.',
    trackingUpdated: 'Đã cập nhật trạng thái theo dõi.',
    subscriptionDeleted: 'Đã xóa gói đăng ký.',
    demoRestored: 'Đã khôi phục dữ liệu minh họa.',
  },
  overview: {
    availableBalance: 'Số dư khả dụng',
    incomeThisMonth: 'Thu nhập tháng này',
    recordedThisMonth: 'Đã ghi nhận trong tháng',
    spendingThisMonth: 'Chi tiêu tháng này',
    incomeShare: '{percent} tổng thu nhập',
    nextRenewal: 'Gia hạn gần nhất',
    daysLeft: {
      one: 'Còn {count} ngày',
      other: 'Còn {count} ngày',
    },
    recentTransactions: 'Giao dịch gần đây',
    viewAll: 'Xem tất cả',
  },
  cashflow: {
    title: 'Dòng tiền',
    rangeAria: 'Khoảng thời gian',
    period: {
      sevenDays: '7 ngày',
      thirtyDays: '30 ngày',
      sixMonths: '6 tháng',
      oneYear: '1 năm',
    },
    chartAria: 'Biểu đồ dòng tiền, cột xanh là tiền vào và cột đỏ là tiền ra.',
  },
  renewals: {
    title: 'Kỳ gia hạn',
    openAria: 'Mở quản lý gói đăng ký',
    upcomingCount: {
      one: '{count} kỳ sắp tới',
      other: '{count} kỳ sắp tới',
    },
    daysAway: {
      one: '{count} ngày tới',
      other: '{count} ngày tới',
    },
    totalPerMonth: 'Tổng cộng mỗi tháng',
  },
  transactions: {
    emptyTitle: 'Chưa có giao dịch',
    emptyBody: 'Thêm khoản đầu tiên để bắt đầu theo dõi.',
    deleteAria: 'Xóa giao dịch {title}',
    search: 'Tìm giao dịch',
    filterAria: 'Lọc giao dịch',
    filter: {
      all: 'Tất cả',
      income: 'Khoản thu',
      expense: 'Khoản chi',
    },
    noResultsTitle: 'Không tìm thấy kết quả',
    noResultsBody: 'Thử từ khóa hoặc bộ lọc khác.',
  },
  subscriptions: {
    averageCost: 'Chi phí trung bình',
    perMonth: '/ tháng',
    annualEstimate: 'Ước tính mỗi năm',
    renewingSoon: 'Sắp gia hạn',
    activeCount: {
      one: '{count} gói đang hoạt động',
      other: '{count} gói đang hoạt động',
    },
    status: {
      active: 'Đang hoạt động',
      trial: 'Dùng thử',
      paused: 'Tạm dừng',
    },
    cycle: {
      perMonth: 'mỗi tháng',
      perYear: 'mỗi năm',
    },
    pauseAria: 'Tạm dừng theo dõi {name}',
    resumeAria: 'Tiếp tục theo dõi {name}',
    deleteAria: 'Xóa {name}',
    emptyTitle: 'Chưa có gói đăng ký',
    emptyBody: 'Thêm dịch vụ đầu tiên để theo dõi kỳ gia hạn.',
  },
  budgets: {
    totalForMonth: 'Tổng ngân sách {month}',
    used: 'Đã sử dụng',
    totalShare: '{percent} tổng hạn mức',
    byCategory: 'Theo danh mục',
    overBy: 'Vượt {amount}',
    remaining: 'Còn {amount}',
    usedAria: 'Đã dùng {percent}',
  },
  transactionForm: {
    title: 'Thêm giao dịch',
    subtitle: 'Ghi lại khoản thu hoặc chi mới.',
    typeAria: 'Loại giao dịch',
    type: {
      expense: 'Khoản chi',
      income: 'Khoản thu',
    },
    name: 'Tên giao dịch',
    namePlaceholder: 'Ví dụ: Ăn trưa',
    amount: 'Số tiền',
    category: 'Danh mục',
    date: 'Ngày giao dịch',
    save: 'Lưu giao dịch',
  },
  subscriptionForm: {
    title: 'Thêm gói đăng ký',
    subtitle: 'Theo dõi kỳ phí tiếp theo của một dịch vụ.',
    serviceName: 'Tên dịch vụ',
    servicePlaceholder: 'Ví dụ: Spotify',
    plan: 'Gói đang dùng',
    planPlaceholder: 'Cá nhân',
    cost: 'Chi phí',
    cycle: {
      label: 'Chu kỳ',
      month: 'Hàng tháng',
      year: 'Hàng năm',
    },
    renewalDate: 'Ngày gia hạn tiếp theo',
    callout: '{appName} chỉ theo dõi kỳ phí. Việc hủy dịch vụ vẫn thực hiện tại nhà cung cấp.',
    save: 'Lưu gói đăng ký',
  },
  validation: {
    transactionName: 'Nhập tên giao dịch.',
    positiveAmount: 'Số tiền phải lớn hơn 0.',
    transactionDate: 'Chọn ngày giao dịch.',
    serviceName: 'Nhập tên dịch vụ.',
    renewalDate: 'Chọn ngày gia hạn.',
    renewalPast: 'Ngày gia hạn không thể ở trong quá khứ.',
  },
  categories: {
    income: 'Thu nhập',
    dining: 'Ăn uống',
    shopping: 'Mua sắm',
    transport: 'Di chuyển',
    bills: 'Hóa đơn',
    entertainment: 'Giải trí',
    other: 'Khác',
  },
  demo: {
    transactions: {
      winmart: 'WinMart+',
      companySalary: 'Lương công ty',
      grab: 'Grab',
      highlandsCoffee: 'Highlands Coffee',
      augustElectricity: 'Tiền điện tháng 8',
    },
    plans: {
      personal: 'Cá nhân',
      professional: 'Professional',
      storage200Gb: '200 GB',
      plus: 'Plus',
      standard: 'Tiêu chuẩn',
      super: 'Super',
    },
  },
  meta: {
    title: '{appName} | Quản lý tài chính cá nhân',
    description: 'Theo dõi thu chi, ngân sách và các gói đăng ký định kỳ trong cùng một nơi.',
    socialTitle: '{appName} | Dòng tiền rõ ràng',
    socialAlt: '{appName} — Dòng tiền rõ ràng. Cuộc sống nhẹ hơn.',
  },
} as const satisfies TranslationCatalog;

export const messages = {
  en: enCatalog,
  vi: viCatalog,
} as const satisfies Record<Locale, TranslationCatalog>;

export const catalogs = messages;

type StringLeafPaths<T> = {
  [Key in Extract<keyof T, string>]: T[Key] extends string
    ? Key
    : T[Key] extends Record<string, unknown>
      ? `${Key}.${StringLeafPaths<T[Key]>}`
      : never;
}[Extract<keyof T, string>];

export type MessageKey = StringLeafPaths<TranslationCatalog>;

export const pluralKeys = [
  'overview.daysLeft',
  'renewals.upcomingCount',
  'renewals.daysAway',
  'subscriptions.activeCount',
] as const;

export type PluralKey = (typeof pluralKeys)[number];
export type MessageParams = Record<string, string | number>;

export type CategoryId = keyof TranslationCatalog['categories'];
export type DemoTransactionTitleId = keyof TranslationCatalog['demo']['transactions'];
export type DemoPlanId = keyof TranslationCatalog['demo']['plans'];

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && SUPPORTED_LOCALES.includes(value as Locale);
}

function getByPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[segment];
  }, source);
}

function interpolate(message: string, params: MessageParams = {}): string {
  const values: MessageParams = { appName: APP_NAME, ...params };
  return message.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

function normalizeDate(value: Date | number | string): Date {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`);
  }
  return value instanceof Date ? value : new Date(value);
}

export type Translate = (key: MessageKey, params?: MessageParams) => string;
export type TranslatePlural = (key: PluralKey, count: number, params?: MessageParams) => string;

export type I18nContextValue = {
  appName: typeof APP_NAME;
  locale: Locale;
  localeTag: string;
  c: TranslationCatalog;
  catalog: TranslationCatalog;
  setLocale: (locale: Locale) => void;
  t: Translate;
  plural: TranslatePlural;
  currencySymbol: string;
  formatCurrency: (value: number) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatPercent: (value: number) => string;
  formatCompactNumber: (value: number) => string;
  formatDate: (value: Date | number | string) => string;
  formatMonthYear: (value: Date | number | string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const localeTag = localeTags[locale];
  const catalog: TranslationCatalog = messages[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
  }, []);

  const numberTools = useMemo(() => {
    const currency = new Intl.NumberFormat(localeTag, {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    });
    return {
      currency,
      percent: new Intl.NumberFormat(localeTag, {
        style: 'percent',
        maximumFractionDigits: 1,
      }),
      compact: new Intl.NumberFormat(localeTag, {
        notation: 'compact',
        maximumFractionDigits: 1,
      }),
      pluralRules: new Intl.PluralRules(localeTag),
      currencySymbol: currency.formatToParts(0).find((part) => part.type === 'currency')?.value ?? 'VND',
    };
  }, [localeTag]);

  const dateTools = useMemo(() => ({
    short: new Intl.DateTimeFormat(localeTag, { day: '2-digit', month: '2-digit' }),
    monthYear: new Intl.DateTimeFormat(localeTag, { month: 'long', year: 'numeric' }),
  }), [localeTag]);

  const t = useCallback<Translate>((key, params) => {
    const message = getByPath(catalog, key);
    return typeof message === 'string' ? interpolate(message, params) : key;
  }, [catalog]);

  const plural = useCallback<TranslatePlural>((key, count, params) => {
    const form = numberTools.pluralRules.select(count) === 'one' ? 'one' : 'other';
    const message = getByPath(catalog, `${key}.${form}`);
    return typeof message === 'string'
      ? interpolate(message, { ...params, count })
      : key;
  }, [catalog, numberTools.pluralRules]);

  const value = useMemo<I18nContextValue>(() => ({
    appName: APP_NAME,
    locale,
    localeTag,
    c: catalog,
    catalog,
    setLocale,
    t,
    plural,
    currencySymbol: numberTools.currencySymbol,
    formatCurrency: (amount) => numberTools.currency.format(amount),
    formatNumber: (number, options) => new Intl.NumberFormat(localeTag, options).format(number),
    formatPercent: (ratio) => numberTools.percent.format(ratio),
    formatCompactNumber: (number) => numberTools.compact.format(number),
    formatDate: (date) => dateTools.short.format(normalizeDate(date)),
    formatMonthYear: (date) => dateTools.monthYear.format(normalizeDate(date)),
  }), [catalog, dateTools, locale, localeTag, numberTools, plural, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider.');
  }
  return context;
}
