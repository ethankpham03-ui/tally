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

export const APP_NAME = 'Tally' as const;
export const DEFAULT_LOCALE = 'en' as const;
export const SUPPORTED_LOCALES = ['en', 'vi'] as const;
export const LOCALE_STORAGE_KEY = 'tally-locale' as const;

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
    confirm: 'Confirm',
    undo: 'Undo',
    edit: 'Edit',
    delete: 'Delete',
    saveChanges: 'Save changes',
  },
  language: {
    label: 'Language',
    changeAria: 'Change language',
    en: 'English',
    vi: 'Tiếng Việt',
  },
  theme: {
    useDark: 'Use dark appearance',
    useLight: 'Use light appearance',
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
    addBudget: 'Add budget',
    undo: 'Undo',
  },
  features: {
    settings: 'Settings',
    notifications: 'Notifications',
  },
  a11y: {
    restoreDemo: 'Restore demo data',
    comingSoon: '{feature}, coming soon',
  },
  storage: {
    localOnly: 'Stored only on this device',
    loading: 'Loading local data…',
    saving: 'Saving locally…',
    saved: 'Saved on this device',
    readOnly: 'Newer backup — read only',
    error: 'Could not save locally',
    corruptWarning: 'Some stored data could not be read. A clean workspace was opened.',
    futureVersionWarning: 'This backup was created by a newer version of Tally.',
  },
  header: {
    greeting: 'Good morning',
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
    transactionUpdated: 'Transaction updated.',
    transactionRestored: 'Transaction restored.',
    subscriptionUpdated: 'Subscription updated.',
    subscriptionRestored: 'Subscription restored.',
    paymentRecorded: 'Payment recorded and the renewal date was advanced.',
    paymentReverted: 'Payment record undone.',
    budgetAdded: 'Budget added.',
    budgetUpdated: 'Budget updated.',
    budgetDeleted: 'Budget deleted.',
    budgetRestored: 'Budget restored.',
    openingBalanceUpdated: 'Opening balance updated.',
    dataCleared: 'All local data cleared.',
    dataExported: 'Backup exported.',
    dataImported: 'Backup imported.',
    importInvalid: 'This file is not a valid Tally backup.',
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
    emptyTitle: 'Your workspace is ready',
    emptyBody: 'Add a transaction, subscription, or budget to begin.',
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
    scheduleTitle: 'Upcoming charges',
    scheduleAria: 'Upcoming subscription renewal schedule',
    emptySchedule: 'No upcoming renewals.',
    upcomingCount: {
      one: '{count} upcoming renewal',
      other: '{count} upcoming renewals',
    },
    daysAway: {
      one: '{count} day from now',
      other: '{count} days from now',
    },
    today: 'Today',
    overdueBy: {
      one: '{count} day overdue',
      other: '{count} days overdue',
    },
    totalPerMonth: 'Total per month',
  },
  transactions: {
    emptyTitle: 'No transactions yet',
    emptyBody: 'Add your first transaction to start tracking.',
    deleteAria: 'Delete transaction {title}',
    editAria: 'Edit transaction {title}',
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
    averageCost: 'Monthly total',
    monthlyTotal: 'Monthly total',
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
    editAria: 'Edit {name}',
    recordPayment: 'Record payment',
    recordPaymentAria: 'Record payment for {name}',
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
    editAria: 'Edit {category} budget',
    deleteAria: 'Delete {category} budget',
    emptyTitle: 'No budgets yet',
    emptyBody: 'Add a monthly category limit to guide your spending.',
  },
  transactionForm: {
    title: 'Add transaction',
    subtitle: 'Record new income or spending.',
    editTitle: 'Edit transaction',
    editSubtitle: 'Update this income or expense record.',
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
    update: 'Update transaction',
  },
  subscriptionForm: {
    title: 'Add subscription',
    subtitle: 'Track the next charge for a service.',
    editTitle: 'Edit subscription',
    editSubtitle: 'Update the plan, cost, or next renewal.',
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
    update: 'Update subscription',
  },
  budgetForm: {
    addTitle: 'Add budget',
    addSubtitle: 'Set a monthly limit for one spending category.',
    editTitle: 'Edit budget',
    editSubtitle: 'Adjust this category’s monthly limit.',
    category: 'Category',
    monthlyLimit: 'Monthly limit',
    save: 'Save budget',
    update: 'Update budget',
  },
  validation: {
    transactionName: 'Enter a transaction name.',
    positiveAmount: 'Amount must be greater than 0.',
    transactionDate: 'Choose a transaction date.',
    transactionFuture: 'Transaction date cannot be in the future.',
    unsafeAmount: 'Enter a smaller, valid amount.',
    serviceName: 'Enter a service name.',
    renewalDate: 'Choose a renewal date.',
    renewalPast: 'Renewal date cannot be in the past.',
    budgetCategory: 'Choose a budget category.',
    budgetLimit: 'Budget limit must be greater than 0.',
    budgetDuplicate: 'A budget already exists for this category.',
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
      rent: 'Rent',
      groceries: 'Groceries',
      fuel: 'Fuel',
      internet: 'Internet',
      healthInsurance: 'Health insurance',
      familyDinner: 'Family dinner',
      onlineCourse: 'Online course',
      entertainment: 'Entertainment',
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
  settings: {
    title: 'Local data',
    subtitle: 'Manage the data stored by Tally in this browser.',
    localOnlyTitle: 'Private to this device',
    localOnlyBody: 'Your financial data stays in this browser and is not sent to an account or cloud service.',
    openingBalance: 'Opening balance',
    openingBalanceHelp: 'The balance you had before the first recorded transaction.',
    saveOpeningBalance: 'Save opening balance',
    restoreSample: 'Restore sample data',
    restoreSampleBody: 'Replace your current data with a fresh, date-aware sample workspace.',
    clearAll: 'Clear all data',
    clearAllBody: 'Remove every transaction, subscription, and budget from this browser.',
    confirmClearTitle: 'Clear all local data?',
    confirmClearBody: 'This cannot be undone after you close this dialog.',
    confirmClearAction: 'Clear everything',
    exportData: 'Export data',
    exportDataBody: 'Download a backup you can keep or move to another browser.',
    importData: 'Import data',
    importingData: 'Reading backup…',
    importDataBody: 'Restore a Tally backup from this device. Existing data will be replaced.',
    importFileAria: 'Choose a Tally backup file',
  },
  meta: {
    title: '{appName} | Personal finance manager',
    description: 'Track income, expenses, budgets, and recurring subscriptions in one place.',
    socialTitle: '{appName} | Clearer cash flow',
    socialAlt: '{appName} - Clearer cash flow. Lighter living.',
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
    confirm: 'Xác nhận',
    undo: 'Hoàn tác',
    edit: 'Sửa',
    delete: 'Xóa',
    saveChanges: 'Lưu thay đổi',
  },
  language: {
    label: 'Ngôn ngữ',
    changeAria: 'Đổi ngôn ngữ',
    en: 'English',
    vi: 'Tiếng Việt',
  },
  theme: {
    useDark: 'Dùng giao diện tối',
    useLight: 'Dùng giao diện sáng',
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
    addBudget: 'Thêm ngân sách',
    undo: 'Hoàn tác',
  },
  features: {
    settings: 'Cài đặt',
    notifications: 'Thông báo',
  },
  a11y: {
    restoreDemo: 'Khôi phục dữ liệu minh họa',
    comingSoon: '{feature}, sắp ra mắt',
  },
  storage: {
    localOnly: 'Chỉ lưu trên thiết bị này',
    loading: 'Đang tải dữ liệu cục bộ…',
    saving: 'Đang lưu cục bộ…',
    saved: 'Đã lưu trên thiết bị này',
    readOnly: 'Bản sao mới hơn — chỉ đọc',
    error: 'Không thể lưu cục bộ',
    corruptWarning: 'Một phần dữ liệu đã lưu không thể đọc được. Không gian trống đã được mở.',
    futureVersionWarning: 'Bản sao lưu này được tạo bởi phiên bản Tally mới hơn.',
  },
  header: {
    greeting: 'Chào buổi sáng',
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
    transactionUpdated: 'Đã cập nhật giao dịch.',
    transactionRestored: 'Đã khôi phục giao dịch.',
    subscriptionUpdated: 'Đã cập nhật gói đăng ký.',
    subscriptionRestored: 'Đã khôi phục gói đăng ký.',
    paymentRecorded: 'Đã ghi nhận thanh toán và chuyển ngày gia hạn tiếp theo.',
    paymentReverted: 'Đã hoàn tác ghi nhận thanh toán.',
    budgetAdded: 'Đã thêm ngân sách.',
    budgetUpdated: 'Đã cập nhật ngân sách.',
    budgetDeleted: 'Đã xóa ngân sách.',
    budgetRestored: 'Đã khôi phục ngân sách.',
    openingBalanceUpdated: 'Đã cập nhật số dư ban đầu.',
    dataCleared: 'Đã xóa toàn bộ dữ liệu cục bộ.',
    dataExported: 'Đã xuất bản sao lưu.',
    dataImported: 'Đã nhập bản sao lưu.',
    importInvalid: 'Tệp này không phải bản sao lưu Tally hợp lệ.',
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
    emptyTitle: 'Không gian của bạn đã sẵn sàng',
    emptyBody: 'Thêm giao dịch, gói đăng ký hoặc ngân sách để bắt đầu.',
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
    scheduleTitle: 'Các khoản sắp thu',
    scheduleAria: 'Lịch gia hạn gói đăng ký sắp tới',
    emptySchedule: 'Không có kỳ gia hạn sắp tới.',
    upcomingCount: {
      one: '{count} kỳ sắp tới',
      other: '{count} kỳ sắp tới',
    },
    daysAway: {
      one: '{count} ngày tới',
      other: '{count} ngày tới',
    },
    today: 'Hôm nay',
    overdueBy: {
      one: 'Quá hạn {count} ngày',
      other: 'Quá hạn {count} ngày',
    },
    totalPerMonth: 'Tổng cộng mỗi tháng',
  },
  transactions: {
    emptyTitle: 'Chưa có giao dịch',
    emptyBody: 'Thêm khoản đầu tiên để bắt đầu theo dõi.',
    deleteAria: 'Xóa giao dịch {title}',
    editAria: 'Sửa giao dịch {title}',
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
    averageCost: 'Tổng mỗi tháng',
    monthlyTotal: 'Tổng mỗi tháng',
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
    editAria: 'Sửa {name}',
    recordPayment: 'Ghi nhận thanh toán',
    recordPaymentAria: 'Ghi nhận thanh toán cho {name}',
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
    editAria: 'Sửa ngân sách {category}',
    deleteAria: 'Xóa ngân sách {category}',
    emptyTitle: 'Chưa có ngân sách',
    emptyBody: 'Thêm hạn mức hàng tháng để định hướng chi tiêu.',
  },
  transactionForm: {
    title: 'Thêm giao dịch',
    subtitle: 'Ghi lại khoản thu hoặc chi mới.',
    editTitle: 'Sửa giao dịch',
    editSubtitle: 'Cập nhật khoản thu hoặc chi này.',
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
    update: 'Cập nhật giao dịch',
  },
  subscriptionForm: {
    title: 'Thêm gói đăng ký',
    subtitle: 'Theo dõi kỳ phí tiếp theo của một dịch vụ.',
    editTitle: 'Sửa gói đăng ký',
    editSubtitle: 'Cập nhật gói, chi phí hoặc kỳ gia hạn tiếp theo.',
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
    update: 'Cập nhật gói đăng ký',
  },
  budgetForm: {
    addTitle: 'Thêm ngân sách',
    addSubtitle: 'Đặt hạn mức hàng tháng cho một danh mục chi tiêu.',
    editTitle: 'Sửa ngân sách',
    editSubtitle: 'Điều chỉnh hạn mức hàng tháng của danh mục này.',
    category: 'Danh mục',
    monthlyLimit: 'Hạn mức hàng tháng',
    save: 'Lưu ngân sách',
    update: 'Cập nhật ngân sách',
  },
  validation: {
    transactionName: 'Nhập tên giao dịch.',
    positiveAmount: 'Số tiền phải lớn hơn 0.',
    transactionDate: 'Chọn ngày giao dịch.',
    transactionFuture: 'Ngày giao dịch không thể ở trong tương lai.',
    unsafeAmount: 'Nhập số tiền nhỏ hơn và hợp lệ.',
    serviceName: 'Nhập tên dịch vụ.',
    renewalDate: 'Chọn ngày gia hạn.',
    renewalPast: 'Ngày gia hạn không thể ở trong quá khứ.',
    budgetCategory: 'Chọn danh mục ngân sách.',
    budgetLimit: 'Hạn mức ngân sách phải lớn hơn 0.',
    budgetDuplicate: 'Danh mục này đã có ngân sách.',
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
      rent: 'Tiền thuê nhà',
      groceries: 'Đồ dùng thiết yếu',
      fuel: 'Nhiên liệu',
      internet: 'Internet',
      healthInsurance: 'Bảo hiểm sức khỏe',
      familyDinner: 'Bữa tối gia đình',
      onlineCourse: 'Khóa học trực tuyến',
      entertainment: 'Giải trí',
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
  settings: {
    title: 'Dữ liệu cục bộ',
    subtitle: 'Quản lý dữ liệu Tally lưu trong trình duyệt này.',
    localOnlyTitle: 'Riêng tư trên thiết bị này',
    localOnlyBody: 'Dữ liệu tài chính chỉ nằm trong trình duyệt này, không được gửi tới tài khoản hay dịch vụ đám mây.',
    openingBalance: 'Số dư ban đầu',
    openingBalanceHelp: 'Số dư bạn có trước giao dịch đầu tiên được ghi lại.',
    saveOpeningBalance: 'Lưu số dư ban đầu',
    restoreSample: 'Khôi phục dữ liệu mẫu',
    restoreSampleBody: 'Thay dữ liệu hiện tại bằng không gian mẫu mới theo ngày hiện tại.',
    clearAll: 'Xóa toàn bộ dữ liệu',
    clearAllBody: 'Xóa mọi giao dịch, gói đăng ký và ngân sách khỏi trình duyệt này.',
    confirmClearTitle: 'Xóa toàn bộ dữ liệu cục bộ?',
    confirmClearBody: 'Bạn không thể hoàn tác sau khi đóng hộp thoại này.',
    confirmClearAction: 'Xóa tất cả',
    exportData: 'Xuất dữ liệu',
    exportDataBody: 'Tải bản sao lưu để cất giữ hoặc chuyển sang trình duyệt khác.',
    importData: 'Nhập dữ liệu',
    importingData: 'Đang đọc bản sao lưu…',
    importDataBody: 'Khôi phục bản sao lưu Tally trên thiết bị này. Dữ liệu hiện tại sẽ bị thay thế.',
    importFileAria: 'Chọn tệp sao lưu Tally',
  },
  meta: {
    title: '{appName} | Quản lý tài chính cá nhân',
    description: 'Theo dõi thu chi, ngân sách và các gói đăng ký định kỳ trong cùng một nơi.',
    socialTitle: '{appName} | Dòng tiền rõ ràng',
    socialAlt: '{appName} - Dòng tiền rõ ràng. Cuộc sống nhẹ hơn.',
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
  'renewals.overdueBy',
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
  isLocaleHydrated: boolean;
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
  const [isLocaleHydrated, setIsLocaleHydrated] = useState(false);
  const localeTag = localeTags[locale];
  const catalog: TranslationCatalog = messages[locale];

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      try {
        const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
        if (isLocale(storedLocale)) {
          setLocaleState(storedLocale);
        }
      } catch {
        // Language selection still works in memory when storage is unavailable.
      } finally {
        setIsLocaleHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (!isLocaleHydrated) return;
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Keep the selected locale for this session when storage is unavailable.
    }
  }, [isLocaleHydrated, locale]);

  useEffect(() => {
    const syncLocale = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY && isLocale(event.newValue)) {
        setLocaleState(event.newValue);
      }
    };
    window.addEventListener('storage', syncLocale);
    return () => window.removeEventListener('storage', syncLocale);
  }, []);

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
    isLocaleHydrated,
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
  }), [catalog, dateTools, isLocaleHydrated, locale, localeTag, numberTools, plural, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider.');
  }
  return context;
}
