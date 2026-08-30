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
    switchTo: 'Switch to {language}',
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
    trackingPaused: 'Stopped tracking {name}.',
    trackingResumed: 'Tracking {name} again.',
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
    recordedThisMonth: 'Included in your balance',
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
    chartAria: 'Cash flow chart; green bars show money in and red bars show money out. Net cash flow: {net}.',
  },
  renewals: {
    title: 'Renewals',
    openAria: 'Open subscription management',
    scheduleTitle: 'Upcoming charges',
    scheduleAria: 'Upcoming subscription renewal schedule',
    emptySchedule: 'No upcoming renewals.',
    upcomingCount: {
      one: 'upcoming renewal',
      other: 'upcoming renewals',
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
    monthlyTotal: 'Total',
    perMonth: '/month',
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
    usedAria: '{percent} of the budget used',
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
    planPlaceholder: 'e.g. Personal',
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
    customCategoryName: 'Enter a name for your custom category.',
    customCategoryDuplicate: 'A category with this name already exists.',
  },
  categoryPicker: {
    title: 'Choose a category',
    openAria: 'Choose expense category',
    search: 'Search categories',
    noResults: 'No matching categories',
    customSection: 'Your categories',
    createCustom: 'Other — create your own',
    customHelp: 'Name a category for spending that does not fit anywhere else.',
    customName: 'Category name',
    customNamePlaceholder: 'Example: Bonsai supplies',
    customIcon: 'Choose an icon',
    iconOption: 'Icon {number}',
    saveCustom: 'Create and select',
    back: 'Back to categories',
  },
  categoryGroups: {
    food: 'Food & drink',
    housing: 'Housing & bills',
    transportation: 'Transport & vehicles',
    shopping_personal: 'Personal shopping',
    health: 'Health & wellness',
    family: 'Family & pets',
    education: 'Learning & development',
    leisure: 'Entertainment & hobbies',
    travel: 'Travel',
    digital: 'Technology & digital services',
    finance: 'Finance & obligations',
    work: 'Work & business',
    giving: 'Gifts & community',
    other: 'Other',
  },
  categories: {
    income: 'Income',
    dining: 'Eating out',
    groceries: 'Groceries',
    cafe: 'Coffee & tea',
    food_delivery: 'Food delivery',
    street_food: 'Street food',
    snacks: 'Snacks & desserts',
    drinks_alcohol: 'Drinks & alcohol',
    work_meals: 'Meals at work',
    rent: 'Rent',
    mortgage: 'Mortgage',
    bills: 'Other household bills',
    electricity: 'Electricity',
    water: 'Water',
    cooking_gas: 'Gas & household fuel',
    internet: 'Home internet',
    mobile_phone: 'Mobile plan & top-up',
    household_supplies: 'Household supplies',
    home_maintenance: 'Repairs & maintenance',
    furniture_appliances: 'Furniture & appliances',
    domestic_help: 'Housekeeping',
    transport: 'General transport',
    ride_hailing: 'Taxi & ride-hailing',
    public_transport: 'Public transport',
    fuel: 'Fuel',
    ev_charging: 'EV charging',
    parking_tolls: 'Parking & tolls',
    vehicle_maintenance: 'Vehicle maintenance',
    vehicle_insurance: 'Vehicle insurance',
    vehicle_loan: 'Vehicle loan',
    bicycle: 'Bicycle',
    shopping: 'General shopping',
    clothing: 'Clothing',
    footwear: 'Footwear',
    electronics: 'Electronics',
    cosmetics: 'Cosmetics & skincare',
    personal_care: 'Hair & personal care',
    accessories: 'Accessories & jewelry',
    medical: 'Doctor & clinic',
    pharmacy: 'Pharmacy',
    hospital: 'Hospital',
    dental: 'Dental care',
    vision: 'Vision care',
    health_insurance: 'Health insurance',
    fitness: 'Gym & fitness',
    mental_health: 'Mental health',
    wellness: 'Spa & wellness',
    childcare: 'Childcare',
    baby_supplies: 'Baby supplies',
    family_support: 'Family support',
    parents: 'Support for parents',
    allowance: 'Allowance',
    elder_care: 'Elder care',
    pet_care: 'Pet care',
    tuition: 'Tuition',
    courses: 'Courses & classes',
    books: 'Books & learning materials',
    stationery: 'Stationery',
    exam_fees: 'Exams & certificates',
    language_learning: 'Language learning',
    professional_training: 'Professional training',
    entertainment: 'General entertainment',
    streaming: 'Video streaming',
    cinema: 'Cinema',
    gaming: 'Games',
    live_events: 'Shows & events',
    hobbies: 'Hobbies & crafts',
    sports: 'Sports & recreation',
    nightlife: 'Nightlife & karaoke',
    music: 'Music & audio',
    flights: 'Flights',
    intercity_transport: 'Intercity transport',
    accommodation: 'Hotels & lodging',
    tours: 'Tours & attractions',
    visa: 'Visa & travel documents',
    travel_insurance: 'Travel insurance',
    souvenirs: 'Souvenirs',
    subscriptions: 'Subscriptions',
    software: 'Apps & software',
    cloud_storage: 'Cloud storage',
    domains_hosting: 'Domains & hosting',
    news_media: 'News & media',
    online_services: 'Online services',
    bank_fees: 'Bank fees',
    credit_card_fees: 'Card fees',
    loan_payment: 'Loan payment',
    interest: 'Interest & late fees',
    taxes: 'Taxes',
    fines: 'Fines & penalties',
    savings: 'Savings',
    investments: 'Investments',
    insurance_general: 'Other insurance',
    work_supplies: 'Work supplies',
    coworking: 'Coworking & office',
    equipment: 'Work equipment',
    advertising: 'Advertising',
    logistics: 'Delivery & logistics',
    professional_services: 'Professional services',
    business_meals: 'Business meals',
    business_travel: 'Business travel',
    gifts: 'Gifts',
    charity: 'Charity',
    religious: 'Religion & worship',
    celebrations: 'Celebrations',
    wedding_funeral: 'Weddings & funerals',
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
    confirmRestoreAction: 'Restore sample data',
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
    demoData: 'Dữ liệu mẫu',
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
    switchTo: 'Chuyển sang {language}',
    en: 'English',
    vi: 'Tiếng Việt',
  },
  theme: {
    useDark: 'Chuyển sang chế độ tối',
    useLight: 'Chuyển sang chế độ sáng',
  },
  nav: {
    overview: 'Tổng quan',
    transactions: 'Giao dịch',
    subscriptions: 'Gói đăng ký',
    budgets: 'Ngân sách',
    mainAria: 'Điều hướng chính',
    mobileAria: 'Điều hướng chính',
    homeAria: 'Về trang Tổng quan của {appName}',
  },
  actions: {
    add: 'Thêm',
    addTransaction: 'Thêm giao dịch',
    addSubscription: 'Thêm gói đăng ký',
    addSubscriptionShort: 'Thêm gói đăng ký',
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
    loading: 'Đang tải dữ liệu…',
    saving: 'Đang lưu trên thiết bị…',
    saved: 'Đã lưu trên thiết bị này',
    readOnly: 'Dữ liệu mẫu — chỉ xem',
    error: 'Không lưu được dữ liệu trên thiết bị',
    corruptWarning: 'Không đọc được dữ liệu đã lưu. Tally đã tạo dữ liệu mẫu mới và giữ lại bản cũ trên thiết bị.',
    futureVersionWarning: 'Không mở được dữ liệu đã lưu vì dữ liệu này thuộc phiên bản Tally mới hơn. Tally đang hiển thị dữ liệu mẫu và sẽ không ghi đè dữ liệu cũ.',
  },
  header: {
    greeting: 'Xin chào',
    context: {
      overview: 'Xem thu, chi và các khoản sắp đến hạn trong tháng này.',
      transactions: 'Tất cả các khoản thu, chi được sắp xếp theo ngày.',
      subscriptions: 'Theo dõi phí định kỳ và ngày gia hạn. Tally không thể hủy dịch vụ thay bạn.',
      budgets: 'Theo dõi mức chi so với ngân sách của từng danh mục.',
    },
  },
  toast: {
    comingSoon: '{feature} sẽ có trong phiên bản tiếp theo.',
    transactionAdded: 'Đã thêm giao dịch.',
    transactionDeleted: 'Đã xóa giao dịch.',
    subscriptionAdded: 'Đã thêm gói đăng ký.',
    trackingUpdated: 'Đã cập nhật chế độ theo dõi.',
    trackingPaused: 'Đã dừng theo dõi {name}.',
    trackingResumed: 'Đã theo dõi lại {name}.',
    subscriptionDeleted: 'Đã xóa gói đăng ký.',
    transactionUpdated: 'Đã cập nhật giao dịch.',
    transactionRestored: 'Đã khôi phục giao dịch.',
    subscriptionUpdated: 'Đã cập nhật gói đăng ký.',
    subscriptionRestored: 'Đã khôi phục gói đăng ký.',
    paymentRecorded: 'Đã ghi khoản phí vào giao dịch và chuyển sang kỳ gia hạn tiếp theo.',
    paymentReverted: 'Đã hoàn tác khoản phí vừa ghi.',
    budgetAdded: 'Đã thêm ngân sách.',
    budgetUpdated: 'Đã cập nhật ngân sách.',
    budgetDeleted: 'Đã xóa ngân sách.',
    budgetRestored: 'Đã khôi phục ngân sách.',
    openingBalanceUpdated: 'Đã cập nhật số dư ban đầu.',
    dataCleared: 'Đã xóa toàn bộ dữ liệu trên thiết bị.',
    dataExported: 'Đã tải bản sao lưu xuống.',
    dataImported: 'Đã khôi phục dữ liệu từ bản sao lưu.',
    importInvalid: 'Tệp này không phải bản sao lưu Tally hợp lệ.',
    demoRestored: 'Đã khôi phục dữ liệu mẫu.',
  },
  overview: {
    availableBalance: 'Số dư khả dụng',
    incomeThisMonth: 'Tổng thu tháng này',
    recordedThisMonth: 'Đã cộng vào số dư',
    spendingThisMonth: 'Tổng chi tháng này',
    incomeShare: 'Bằng {percent} tổng thu',
    nextRenewal: 'Kỳ gia hạn tiếp theo',
    daysLeft: {
      one: 'Còn {count} ngày',
      other: 'Còn {count} ngày',
    },
    recentTransactions: 'Giao dịch gần đây',
    viewAll: 'Xem tất cả',
    emptyTitle: 'Chưa có dữ liệu',
    emptyBody: 'Thêm giao dịch, gói đăng ký hoặc ngân sách để bắt đầu.',
  },
  cashflow: {
    title: 'Dòng tiền',
    rangeAria: 'Chọn khoảng thời gian',
    period: {
      sevenDays: '7 ngày',
      thirtyDays: '30 ngày',
      sixMonths: '6 tháng',
      oneYear: '1 năm',
    },
    chartAria: 'Biểu đồ dòng tiền: cột xanh là tiền vào, cột đỏ là tiền ra. Dòng tiền ròng: {net}.',
  },
  renewals: {
    title: 'Lịch gia hạn',
    openAria: 'Mở trang Gói đăng ký',
    scheduleTitle: 'Phí sắp đến hạn',
    scheduleAria: 'Lịch các gói sắp gia hạn',
    emptySchedule: 'Chưa có gói nào sắp gia hạn.',
    upcomingCount: {
      one: 'kỳ sắp tới',
      other: 'kỳ sắp tới',
    },
    daysAway: {
      one: 'Còn {count} ngày',
      other: 'Còn {count} ngày',
    },
    today: 'Hôm nay',
    overdueBy: {
      one: 'Ngày gia hạn đã qua {count} ngày',
      other: 'Ngày gia hạn đã qua {count} ngày',
    },
    totalPerMonth: 'Tổng phí hàng tháng',
  },
  transactions: {
    emptyTitle: 'Chưa có giao dịch',
    emptyBody: 'Thêm giao dịch đầu tiên để bắt đầu theo dõi thu chi.',
    deleteAria: 'Xóa giao dịch {title}',
    editAria: 'Sửa giao dịch {title}',
    search: 'Tìm giao dịch',
    filterAria: 'Lọc theo loại giao dịch',
    filter: {
      all: 'Tất cả',
      income: 'Khoản thu',
      expense: 'Khoản chi',
    },
    noResultsTitle: 'Không có giao dịch phù hợp',
    noResultsBody: 'Thử từ khóa hoặc bộ lọc khác.',
  },
  subscriptions: {
    averageCost: 'Tổng mỗi tháng',
    monthlyTotal: 'Tổng phí',
    perMonth: '/tháng',
    annualEstimate: 'Ước tính hàng năm',
    renewingSoon: 'Tất cả gói đăng ký',
    activeCount: {
      one: 'Đang theo dõi {count} gói',
      other: 'Đang theo dõi {count} gói',
    },
    status: {
      active: 'Đang theo dõi',
      trial: 'Đang dùng thử',
      paused: 'Đã dừng theo dõi',
    },
    cycle: {
      perMonth: 'mỗi tháng',
      perYear: 'mỗi năm',
    },
    pauseAria: 'Dừng theo dõi {name}',
    resumeAria: 'Theo dõi lại {name}',
    deleteAria: 'Xóa gói đăng ký {name}',
    editAria: 'Sửa gói đăng ký {name}',
    recordPayment: 'Ghi khoản phí',
    recordPaymentAria: 'Ghi khoản phí {name} vào giao dịch',
    emptyTitle: 'Chưa có gói đăng ký',
    emptyBody: 'Thêm gói đăng ký đầu tiên để theo dõi ngày gia hạn.',
  },
  budgets: {
    totalForMonth: 'Tổng ngân sách {month}',
    used: 'Đã chi',
    totalShare: 'Đã dùng {percent} tổng ngân sách',
    byCategory: 'Theo danh mục',
    overBy: 'Vượt {amount}',
    remaining: 'Còn {amount}',
    usedAria: 'Đã dùng {percent} ngân sách',
    editAria: 'Sửa ngân sách cho {category}',
    deleteAria: 'Xóa ngân sách cho {category}',
    emptyTitle: 'Chưa có ngân sách',
    emptyBody: 'Đặt ngân sách hàng tháng cho từng danh mục để theo dõi mức chi.',
  },
  transactionForm: {
    title: 'Thêm giao dịch',
    subtitle: 'Ghi lại một khoản thu hoặc khoản chi.',
    editTitle: 'Sửa giao dịch',
    editSubtitle: 'Chỉnh sửa thông tin giao dịch này.',
    typeAria: 'Loại giao dịch',
    type: {
      expense: 'Khoản chi',
      income: 'Khoản thu',
    },
    name: 'Nội dung',
    namePlaceholder: 'Ví dụ: Cơm trưa',
    amount: 'Số tiền',
    category: 'Danh mục',
    date: 'Ngày giao dịch',
    save: 'Lưu giao dịch',
    update: 'Cập nhật giao dịch',
  },
  subscriptionForm: {
    title: 'Thêm gói đăng ký',
    subtitle: 'Thêm dịch vụ để theo dõi phí và ngày gia hạn.',
    editTitle: 'Sửa gói đăng ký',
    editSubtitle: 'Cập nhật gói, mức phí hoặc ngày gia hạn.',
    serviceName: 'Tên dịch vụ',
    servicePlaceholder: 'Ví dụ: Spotify',
    plan: 'Gói đang dùng',
    planPlaceholder: 'Ví dụ: Cá nhân',
    cost: 'Mức phí',
    cycle: {
      label: 'Chu kỳ thanh toán',
      month: 'Hàng tháng',
      year: 'Hàng năm',
    },
    renewalDate: 'Ngày gia hạn tiếp theo',
    callout: '{appName} không thể hủy dịch vụ. Bạn cần hủy trực tiếp với nhà cung cấp.',
    save: 'Lưu gói đăng ký',
    update: 'Cập nhật gói đăng ký',
  },
  budgetForm: {
    addTitle: 'Thêm ngân sách',
    addSubtitle: 'Đặt hạn mức chi tiêu hàng tháng cho một danh mục.',
    editTitle: 'Sửa ngân sách',
    editSubtitle: 'Điều chỉnh hạn mức của danh mục này.',
    category: 'Danh mục',
    monthlyLimit: 'Hạn mức mỗi tháng',
    save: 'Lưu ngân sách',
    update: 'Cập nhật ngân sách',
  },
  validation: {
    transactionName: 'Nhập nội dung giao dịch.',
    positiveAmount: 'Nhập số tiền lớn hơn 0.',
    transactionDate: 'Chọn ngày giao dịch.',
    transactionFuture: 'Ngày giao dịch không được sau hôm nay.',
    unsafeAmount: 'Số tiền quá lớn. Hãy nhập số nhỏ hơn.',
    serviceName: 'Nhập tên dịch vụ.',
    renewalDate: 'Chọn ngày gia hạn.',
    renewalPast: 'Ngày gia hạn phải là hôm nay hoặc sau hôm nay.',
    budgetCategory: 'Chọn danh mục chi tiêu.',
    budgetLimit: 'Nhập hạn mức lớn hơn 0.',
    budgetDuplicate: 'Danh mục này đã có ngân sách.',
    customCategoryName: 'Nhập tên danh mục riêng.',
    customCategoryDuplicate: 'Tên danh mục này đã được dùng.',
  },
  categoryPicker: {
    title: 'Chọn danh mục',
    openAria: 'Chọn danh mục chi tiêu',
    search: 'Tìm danh mục',
    noResults: 'Không có danh mục phù hợp',
    customSection: 'Danh mục của bạn',
    createCustom: 'Khác — tự tạo danh mục',
    customHelp: 'Tạo danh mục riêng cho khoản chi chưa phù hợp với các danh mục có sẵn.',
    customName: 'Tên danh mục',
    customNamePlaceholder: 'Ví dụ: Chăm cây cảnh',
    customIcon: 'Chọn biểu tượng',
    iconOption: 'Biểu tượng {number}',
    saveCustom: 'Tạo danh mục',
    back: 'Quay lại danh sách',
  },
  categoryGroups: {
    food: 'Ăn uống',
    housing: 'Nhà ở & hóa đơn',
    transportation: 'Đi lại & xe cộ',
    shopping_personal: 'Mua sắm cá nhân',
    health: 'Sức khỏe & thể chất',
    family: 'Gia đình & thú cưng',
    education: 'Học tập & phát triển',
    leisure: 'Giải trí & sở thích',
    travel: 'Du lịch',
    digital: 'Công nghệ & dịch vụ số',
    finance: 'Tài chính cá nhân',
    work: 'Công việc & kinh doanh',
    giving: 'Quà tặng & dịp đặc biệt',
    other: 'Khác',
  },
  categories: {
    income: 'Thu nhập',
    dining: 'Ăn ngoài',
    groceries: 'Đi chợ & siêu thị',
    cafe: 'Cà phê & trà',
    food_delivery: 'Đồ ăn giao tận nơi',
    street_food: 'Đồ ăn đường phố',
    snacks: 'Ăn vặt & tráng miệng',
    drinks_alcohol: 'Nước uống & rượu bia',
    work_meals: 'Ăn uống khi đi làm',
    rent: 'Tiền thuê nhà',
    mortgage: 'Trả khoản vay mua nhà',
    bills: 'Hóa đơn sinh hoạt khác',
    electricity: 'Tiền điện',
    water: 'Tiền nước',
    cooking_gas: 'Gas nấu ăn',
    internet: 'Internet tại nhà',
    mobile_phone: 'Cước & nạp tiền điện thoại',
    household_supplies: 'Đồ dùng sinh hoạt',
    home_maintenance: 'Sửa chữa & bảo trì nhà',
    furniture_appliances: 'Nội thất & thiết bị gia dụng',
    domestic_help: 'Giúp việc & vệ sinh nhà',
    transport: 'Đi lại khác',
    ride_hailing: 'Taxi & xe công nghệ',
    public_transport: 'Xe buýt, metro & tàu đô thị',
    fuel: 'Xăng dầu',
    ev_charging: 'Sạc xe điện',
    parking_tolls: 'Gửi xe & phí cầu đường',
    vehicle_maintenance: 'Bảo dưỡng & sửa xe',
    vehicle_insurance: 'Bảo hiểm xe',
    vehicle_loan: 'Trả khoản vay mua xe',
    bicycle: 'Xe đạp',
    shopping: 'Mua sắm tổng hợp',
    clothing: 'Quần áo',
    footwear: 'Giày dép',
    electronics: 'Điện tử & thiết bị số',
    cosmetics: 'Mỹ phẩm & chăm sóc da',
    personal_care: 'Làm tóc & chăm sóc cá nhân',
    accessories: 'Phụ kiện & trang sức',
    medical: 'Khám bệnh & phòng khám',
    pharmacy: 'Thuốc & nhà thuốc',
    hospital: 'Bệnh viện',
    dental: 'Nha khoa',
    vision: 'Khám mắt & kính',
    health_insurance: 'Bảo hiểm sức khỏe',
    fitness: 'Phòng tập & thể hình',
    mental_health: 'Sức khỏe tinh thần',
    wellness: 'Spa & chăm sóc cơ thể',
    childcare: 'Trông trẻ',
    baby_supplies: 'Đồ dùng cho em bé',
    family_support: 'Hỗ trợ gia đình',
    parents: 'Phụ giúp cha mẹ',
    allowance: 'Tiền tiêu vặt',
    elder_care: 'Chăm sóc người lớn tuổi',
    pet_care: 'Chăm sóc thú cưng',
    tuition: 'Học phí',
    courses: 'Khóa học & lớp kỹ năng',
    books: 'Sách & học liệu',
    stationery: 'Đồ dùng học tập',
    exam_fees: 'Thi cử & chứng chỉ',
    language_learning: 'Học ngoại ngữ',
    professional_training: 'Đào tạo chuyên môn',
    entertainment: 'Giải trí khác',
    streaming: 'Xem phim trực tuyến',
    cinema: 'Rạp chiếu phim',
    gaming: 'Trò chơi',
    live_events: 'Biểu diễn & sự kiện',
    hobbies: 'Sở thích & thủ công',
    sports: 'Thể thao & hoạt động ngoài trời',
    nightlife: 'Karaoke & vui chơi về đêm',
    music: 'Âm nhạc & podcast',
    flights: 'Vé máy bay',
    intercity_transport: 'Tàu & xe đường dài',
    accommodation: 'Khách sạn & chỗ ở',
    tours: 'Tour & điểm tham quan',
    visa: 'Visa & giấy tờ du lịch',
    travel_insurance: 'Bảo hiểm du lịch',
    souvenirs: 'Quà lưu niệm',
    subscriptions: 'Gói đăng ký',
    software: 'Ứng dụng & phần mềm',
    cloud_storage: 'Lưu trữ đám mây',
    domains_hosting: 'Tên miền & lưu trữ web',
    news_media: 'Tin tức & nội dung số',
    online_services: 'Dịch vụ trực tuyến',
    bank_fees: 'Phí ngân hàng',
    credit_card_fees: 'Phí thẻ',
    loan_payment: 'Trả khoản vay',
    interest: 'Tiền lãi & phí trả chậm',
    taxes: 'Thuế',
    fines: 'Tiền phạt',
    savings: 'Tiết kiệm',
    investments: 'Đầu tư',
    insurance_general: 'Bảo hiểm khác',
    work_supplies: 'Đồ dùng làm việc',
    coworking: 'Chỗ làm việc & văn phòng',
    equipment: 'Thiết bị làm việc',
    advertising: 'Quảng cáo',
    logistics: 'Giao hàng & vận chuyển',
    professional_services: 'Dịch vụ chuyên môn',
    business_meals: 'Tiếp khách',
    business_travel: 'Công tác',
    gifts: 'Quà tặng',
    charity: 'Từ thiện',
    religious: 'Tôn giáo & thờ cúng',
    celebrations: 'Lễ kỷ niệm & tiệc',
    wedding_funeral: 'Hiếu hỉ',
    other: 'Khác',
  },
  demo: {
    transactions: {
      winmart: 'WinMart+',
      companySalary: 'Lương',
      grab: 'Grab',
      highlandsCoffee: 'Highlands Coffee',
      augustElectricity: 'Tiền điện',
      rent: 'Tiền thuê nhà',
      groceries: 'Đi chợ',
      fuel: 'Đổ xăng',
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
    title: 'Dữ liệu trên thiết bị',
    subtitle: 'Quản lý dữ liệu Tally đang lưu trong trình duyệt này.',
    localOnlyTitle: 'Chỉ lưu trên thiết bị này',
    localOnlyBody: 'Dữ liệu tài chính của bạn chỉ được lưu trong trình duyệt này, không được gửi lên đám mây.',
    openingBalance: 'Số dư ban đầu',
    openingBalanceHelp: 'Số dư trước khi bạn ghi giao dịch đầu tiên.',
    saveOpeningBalance: 'Lưu số dư ban đầu',
    restoreSample: 'Khôi phục dữ liệu mẫu',
    restoreSampleBody: 'Thay toàn bộ dữ liệu hiện tại bằng dữ liệu mẫu được cập nhật theo ngày hôm nay.',
    confirmRestoreAction: 'Khôi phục dữ liệu mẫu',
    clearAll: 'Xóa toàn bộ dữ liệu',
    clearAllBody: 'Xóa mọi giao dịch, gói đăng ký và ngân sách khỏi trình duyệt này.',
    confirmClearTitle: 'Xóa toàn bộ dữ liệu trên thiết bị?',
    confirmClearBody: 'Tất cả giao dịch, gói đăng ký và ngân sách sẽ bị xóa vĩnh viễn. Bạn không thể hoàn tác.',
    confirmClearAction: 'Xóa toàn bộ dữ liệu',
    exportData: 'Tải bản sao lưu',
    exportDataBody: 'Tải tệp sao lưu để cất giữ hoặc chuyển dữ liệu sang trình duyệt khác.',
    importData: 'Khôi phục từ bản sao lưu',
    importingData: 'Đang đọc tệp sao lưu…',
    importDataBody: 'Chọn một bản sao lưu Tally. Toàn bộ dữ liệu hiện tại sẽ bị thay thế.',
    importFileAria: 'Chọn tệp sao lưu Tally',
  },
  meta: {
    title: '{appName} | Quản lý tài chính cá nhân',
    description: 'Theo dõi thu chi, ngân sách và phí đăng ký định kỳ tại một nơi.',
    socialTitle: '{appName} | Dòng tiền rõ ràng',
    socialAlt: 'Biểu trưng {appName} bên cạnh biểu đồ dòng tiền và danh sách giao dịch.',
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
