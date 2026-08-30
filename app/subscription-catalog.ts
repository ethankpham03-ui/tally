import type { BillingCycle, SubscriptionCurrency } from './finance-domain';

export const SUBSCRIPTION_CATALOG_CHECKED_AT = '2026-08-30' as const;
export const MANUAL_SERVICE_ID = 'manual' as const;
export const MANUAL_PLAN_ID = 'manual' as const;

export type CatalogLocale = 'en' | 'vi';
export type PriceChannel = 'web' | 'app-store';
export type PriceConfidence = 'high' | 'medium';
export type ArtworkKind = 'app-store' | 'brand-mark' | 'official-support';
export type ArtworkRightsStatus = 'review-required';

export type SubscriptionCatalogArtwork = {
  kind: ArtworkKind;
  sourceUrl: string;
  checkedAt: typeof SUBSCRIPTION_CATALOG_CHECKED_AT;
  rightsStatus: ArtworkRightsStatus;
  publisher: string;
  mime: 'image/png' | 'image/svg+xml';
  remoteUrl?: string;
};

export type SubscriptionCatalogPlan = {
  id: string;
  label: string;
  labelVi: string;
  amount: number;
  currency: SubscriptionCurrency;
  cycle: BillingCycle;
  channel: PriceChannel;
  sourceUrl: string;
  checkedAt: typeof SUBSCRIPTION_CATALOG_CHECKED_AT;
  confidence: PriceConfidence;
  billingNote?: string;
  billingNoteVi?: string;
};

export type SubscriptionCatalogService = {
  id: string;
  name: string;
  aliases: readonly string[];
  asset?: string;
  appStoreId?: string;
  androidPackage?: string;
  storeUrl?: string;
  artwork?: SubscriptionCatalogArtwork;
  plans: readonly SubscriptionCatalogPlan[];
  priceNotice?: string;
  priceNoticeVi?: string;
};

const checkedAt = SUBSCRIPTION_CATALOG_CHECKED_AT;

function appStoreArtwork(sourceUrl: string, publisher: string, remoteUrl?: string): { artwork: SubscriptionCatalogArtwork } {
  return {
    artwork: {
      kind: 'app-store',
      sourceUrl,
      checkedAt,
      rightsStatus: 'review-required',
      publisher,
      mime: 'image/png',
      ...(remoteUrl ? { remoteUrl } : {}),
    },
  };
}

function brandMark(sourceUrl: string, publisher: string): { artwork: SubscriptionCatalogArtwork } {
  return {
    artwork: {
      kind: 'brand-mark',
      sourceUrl,
      checkedAt,
      rightsStatus: 'review-required',
      publisher,
      mime: 'image/svg+xml',
    },
  };
}

export const SUBSCRIPTION_CATALOG: readonly SubscriptionCatalogService[] = [
  {
    id: 'spotify',
    name: 'Spotify',
    aliases: ['spotify premium'],
    asset: '/service-icons/spotify.png',
    ...appStoreArtwork('https://apps.apple.com/vn/app/spotify-music-and-podcasts/id324684580', 'Spotify AB', 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/74/e1/e7/74e1e75a-49d0-ff5c-6ec2-64a2540ac7c7/AppIcon-0-0-1x_U007epad-0-1-0-0-sRGB-85-220.png/512x512bb.png'),
    appStoreId: '324684580',
    androidPackage: 'com.spotify.music',
    storeUrl: 'https://apps.apple.com/vn/app/spotify-music-and-podcasts/id324684580',
    plans: [
      { id: 'premium-individual', label: 'Premium Individual', labelVi: 'Premium Cá nhân', amount: 65_000, currency: 'VND', cycle: 'month', channel: 'web', sourceUrl: 'https://www.spotify.com/vn-vi/premium/', checkedAt, confidence: 'high' },
      { id: 'premium-student', label: 'Premium Student', labelVi: 'Premium Sinh viên', amount: 33_000, currency: 'VND', cycle: 'month', channel: 'web', sourceUrl: 'https://www.spotify.com/vn-vi/premium/', checkedAt, confidence: 'high', billingNote: 'Eligibility verification required', billingNoteVi: 'Cần xác minh sinh viên' },
    ],
  },
  {
    id: 'netflix',
    name: 'Netflix',
    aliases: [],
    asset: '/service-icons/netflix.png',
    ...appStoreArtwork('https://apps.apple.com/vn/app/netflix/id363590051', 'Netflix, Inc.', 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/db/11/ff/db11ff9d-ae2c-66c7-3212-b45134b076fb/AppIcon-0-0-1x_U007epad-0-1-0-sRGB-0-85-220.png/512x512bb.png'),
    appStoreId: '363590051',
    androidPackage: 'com.netflix.mediaclient',
    storeUrl: 'https://apps.apple.com/vn/app/netflix/id363590051',
    plans: [
      { id: 'mobile', label: 'Mobile', labelVi: 'Di động', amount: 74_000, currency: 'VND', cycle: 'month', channel: 'web', sourceUrl: 'https://www.netflix.com/vn/', checkedAt, confidence: 'high' },
      { id: 'basic', label: 'Basic', labelVi: 'Cơ bản', amount: 114_000, currency: 'VND', cycle: 'month', channel: 'web', sourceUrl: 'https://www.netflix.com/vn/', checkedAt, confidence: 'high' },
      { id: 'standard', label: 'Standard', labelVi: 'Tiêu chuẩn', amount: 231_000, currency: 'VND', cycle: 'month', channel: 'web', sourceUrl: 'https://www.netflix.com/vn/', checkedAt, confidence: 'high', billingNote: 'The App Store price can differ slightly', billingNoteVi: 'Giá trên App Store có thể chênh nhẹ' },
      { id: 'premium', label: 'Premium', labelVi: 'Cao cấp', amount: 273_000, currency: 'VND', cycle: 'month', channel: 'web', sourceUrl: 'https://www.netflix.com/vn/', checkedAt, confidence: 'high', billingNote: 'The App Store price can differ slightly', billingNoteVi: 'Giá trên App Store có thể chênh nhẹ' },
    ],
  },
  {
    id: 'apple-music',
    name: 'Apple Music',
    aliases: [],
    asset: '/service-icons/apple-music.png',
    ...appStoreArtwork('https://apps.apple.com/vn/app/apple-music/id1108187390', 'Apple Inc.', 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/31/6c/c3/316cc33a-5e7d-8902-58eb-f4e16c5d9440/music-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.png'),
    appStoreId: '1108187390',
    androidPackage: 'com.apple.android.music',
    storeUrl: 'https://apps.apple.com/vn/app/apple-music/id1108187390',
    plans: [
      { id: 'individual', label: 'Individual', labelVi: 'Cá nhân', amount: 65_000, currency: 'VND', cycle: 'month', channel: 'web', sourceUrl: 'https://www.apple.com/vn/apple-music/', checkedAt, confidence: 'high' },
      { id: 'family', label: 'Family', labelVi: 'Gia đình', amount: 99_000, currency: 'VND', cycle: 'month', channel: 'web', sourceUrl: 'https://www.apple.com/vn/apple-music/', checkedAt, confidence: 'high' },
      { id: 'student', label: 'Student', labelVi: 'Sinh viên', amount: 35_000, currency: 'VND', cycle: 'month', channel: 'web', sourceUrl: 'https://www.apple.com/vn/apple-music/', checkedAt, confidence: 'high', billingNote: 'Eligibility verification required', billingNoteVi: 'Cần xác minh sinh viên' },
    ],
  },
  {
    id: 'apple-tv',
    name: 'Apple TV',
    aliases: ['apple tv+'],
    asset: '/service-icons/apple-tv.png',
    ...appStoreArtwork('https://apps.apple.com/vn/app/apple-tv/id1174078549', 'Apple Inc.', 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/41/88/af/4188af31-d75a-23c9-f97b-486ec1ff4897/tv-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.png'),
    appStoreId: '1174078549',
    storeUrl: 'https://apps.apple.com/vn/app/apple-tv/id1174078549',
    plans: [
      { id: 'monthly', label: 'Monthly', labelVi: 'Theo tháng', amount: 179_000, currency: 'VND', cycle: 'month', channel: 'web', sourceUrl: 'https://www.apple.com/vn/apple-tv/', checkedAt, confidence: 'high' },
    ],
  },
  {
    id: 'apple-one',
    name: 'Apple One',
    aliases: [],
    plans: [
      { id: 'individual', label: 'Individual', labelVi: 'Cá nhân', amount: 239_000, currency: 'VND', cycle: 'month', channel: 'web', sourceUrl: 'https://www.apple.com/vn/apple-one/', checkedAt, confidence: 'high' },
      { id: 'family', label: 'Family', labelVi: 'Gia đình', amount: 279_000, currency: 'VND', cycle: 'month', channel: 'web', sourceUrl: 'https://www.apple.com/vn/apple-one/', checkedAt, confidence: 'high' },
    ],
  },
  {
    id: 'apple-arcade',
    name: 'Apple Arcade',
    aliases: [],
    plans: [
      { id: 'monthly', label: 'Monthly', labelVi: 'Theo tháng', amount: 179_000, currency: 'VND', cycle: 'month', channel: 'web', sourceUrl: 'https://www.apple.com/vn/apple-arcade/', checkedAt, confidence: 'high' },
      { id: 'annual', label: 'Annual', labelVi: 'Theo năm', amount: 1_199_000, currency: 'VND', cycle: 'year', channel: 'web', sourceUrl: 'https://www.apple.com/vn/apple-arcade/', checkedAt, confidence: 'high' },
    ],
  },
  {
    id: 'apple-fitness',
    name: 'Apple Fitness+',
    aliases: ['apple fitness'],
    asset: '/service-icons/apple-fitness.png',
    ...appStoreArtwork('https://apps.apple.com/vn/app/apple-fitness/id1208224953', 'Apple Inc.', 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/93/61/a0/9361a04d-3951-ec4b-4566-65ba69afc4fc/fitness-0-0-1x_U007epad-0-1-0-sRGB-85-220.png/512x512bb.png'),
    appStoreId: '1208224953',
    storeUrl: 'https://apps.apple.com/vn/app/apple-fitness/id1208224953',
    plans: [
      { id: 'monthly', label: 'Monthly', labelVi: 'Theo tháng', amount: 69_000, currency: 'VND', cycle: 'month', channel: 'web', sourceUrl: 'https://www.apple.com/vn/apple-fitness-plus/', checkedAt, confidence: 'high' },
      { id: 'annual', label: 'Annual', labelVi: 'Theo năm', amount: 499_000, currency: 'VND', cycle: 'year', channel: 'web', sourceUrl: 'https://www.apple.com/vn/apple-fitness-plus/', checkedAt, confidence: 'high' },
    ],
  },
  {
    id: 'microsoft-365',
    name: 'Microsoft 365',
    aliases: ['office 365'],
    asset: '/service-icons/microsoft-365.png',
    ...appStoreArtwork('https://apps.apple.com/vn/app/microsoft-copilot/id541164041', 'Microsoft Corporation'),
    appStoreId: '541164041',
    storeUrl: 'https://apps.apple.com/vn/app/microsoft-copilot/id541164041',
    plans: [
      { id: 'basic-monthly', label: 'Basic monthly', labelVi: 'Basic theo tháng', amount: 49_000, currency: 'VND', cycle: 'month', channel: 'web', sourceUrl: 'https://www.microsoft.com/vi-vn/microsoft-365/onedrive/onedrive-plans-and-pricing', checkedAt, confidence: 'high' },
      { id: 'basic-annual', label: 'Basic annual', labelVi: 'Basic theo năm', amount: 489_000, currency: 'VND', cycle: 'year', channel: 'web', sourceUrl: 'https://www.microsoft.com/vi-vn/microsoft-365/onedrive/onedrive-plans-and-pricing', checkedAt, confidence: 'high' },
      { id: 'personal-monthly', label: 'Personal monthly', labelVi: 'Personal theo tháng', amount: 210_000, currency: 'VND', cycle: 'month', channel: 'web', sourceUrl: 'https://www.microsoft.com/vi-vn/microsoft-365/buy/compare-all-microsoft-365-products', checkedAt, confidence: 'high' },
      { id: 'personal-annual', label: 'Personal annual', labelVi: 'Personal theo năm', amount: 2_099_000, currency: 'VND', cycle: 'year', channel: 'web', sourceUrl: 'https://www.microsoft.com/vi-vn/microsoft-365/buy/compare-all-microsoft-365-products', checkedAt, confidence: 'high' },
      { id: 'family-monthly', label: 'Family monthly', labelVi: 'Family theo tháng', amount: 260_000, currency: 'VND', cycle: 'month', channel: 'web', sourceUrl: 'https://www.microsoft.com/vi-vn/microsoft-365/buy/compare-all-microsoft-365-products', checkedAt, confidence: 'high' },
      { id: 'family-annual', label: 'Family annual', labelVi: 'Family theo năm', amount: 2_599_000, currency: 'VND', cycle: 'year', channel: 'web', sourceUrl: 'https://www.microsoft.com/vi-vn/microsoft-365/buy/compare-all-microsoft-365-products', checkedAt, confidence: 'high' },
      { id: 'premium-monthly', label: 'Premium monthly', labelVi: 'Premium theo tháng', amount: 510_000, currency: 'VND', cycle: 'month', channel: 'web', sourceUrl: 'https://www.microsoft.com/vi-vn/microsoft-365/buy/compare-all-microsoft-365-products', checkedAt, confidence: 'high' },
      { id: 'premium-annual', label: 'Premium annual', labelVi: 'Premium theo năm', amount: 5_099_000, currency: 'VND', cycle: 'year', channel: 'web', sourceUrl: 'https://www.microsoft.com/vi-vn/microsoft-365/buy/compare-all-microsoft-365-products', checkedAt, confidence: 'high' },
    ],
  },
  {
    id: 'canva',
    name: 'Canva',
    aliases: ['canva pro'],
    asset: '/service-icons/canva.png',
    ...appStoreArtwork('https://apps.apple.com/vn/app/canva-ai-video-photo-editor/id897446215', 'Canva'),
    appStoreId: '897446215',
    androidPackage: 'com.canva.editor',
    storeUrl: 'https://apps.apple.com/vn/app/canva-ai-video-photo-editor/id897446215',
    plans: [
      { id: 'pro-monthly', label: 'Pro monthly', labelVi: 'Pro theo tháng', amount: 150_000, currency: 'VND', cycle: 'month', channel: 'web', sourceUrl: 'https://www.canva.com/vi_vn/pricing/', checkedAt, confidence: 'high' },
      { id: 'pro-annual-ios', label: 'Pro annual · App Store', labelVi: 'Pro theo năm · App Store', amount: 1_300_000, currency: 'VND', cycle: 'year', channel: 'app-store', sourceUrl: 'https://apps.apple.com/vn/app/canva-ai-video-photo-editor/id897446215', checkedAt, confidence: 'high' },
      { id: 'business-monthly', label: 'Business monthly', labelVi: 'Kinh doanh theo tháng', amount: 210_000, currency: 'VND', cycle: 'month', channel: 'web', sourceUrl: 'https://www.canva.com/vi_vn/pricing/', checkedAt, confidence: 'high', billingNote: 'Price per member', billingNoteVi: 'Giá cho mỗi thành viên' },
      { id: 'business-annual-ios', label: 'Business annual · App Store', labelVi: 'Kinh doanh theo năm · App Store', amount: 2_099_000, currency: 'VND', cycle: 'year', channel: 'app-store', sourceUrl: 'https://apps.apple.com/vn/app/canva-ai-video-photo-editor/id897446215', checkedAt, confidence: 'high', billingNote: 'Price per member', billingNoteVi: 'Giá cho mỗi thành viên' },
    ],
  },
  {
    id: 'notion',
    name: 'Notion',
    aliases: ['notion plus'],
    asset: '/service-icons/notion.png',
    ...appStoreArtwork('https://apps.apple.com/vn/app/notion-notes-tasks-ai/id1232780281', 'Notion Labs, Incorporated'),
    appStoreId: '1232780281',
    androidPackage: 'notion.id',
    storeUrl: 'https://apps.apple.com/vn/app/notion-notes-tasks-ai/id1232780281',
    plans: [
      { id: 'plus-monthly-ios', label: 'Plus monthly · App Store', labelVi: 'Plus theo tháng · App Store', amount: 299_000, currency: 'VND', cycle: 'month', channel: 'app-store', sourceUrl: 'https://apps.apple.com/vn/app/notion-notes-tasks-ai/id1232780281', checkedAt, confidence: 'high', billingNote: 'Mobile Plus is for a one-member workspace', billingNoteVi: 'Gói Plus mua trên ứng dụng chỉ dùng cho workspace một thành viên' },
      { id: 'plus-annual-ios', label: 'Plus annual · App Store', labelVi: 'Plus theo năm · App Store', amount: 2_999_000, currency: 'VND', cycle: 'year', channel: 'app-store', sourceUrl: 'https://apps.apple.com/vn/app/notion-notes-tasks-ai/id1232780281', checkedAt, confidence: 'high', billingNote: 'Mobile Plus is for a one-member workspace', billingNoteVi: 'Gói Plus mua trên ứng dụng chỉ dùng cho workspace một thành viên' },
    ],
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    aliases: [],
    asset: '/service-icons/dropbox.png',
    ...appStoreArtwork('https://apps.apple.com/vn/app/dropbox-cloud-file-storage/id327630330', 'Dropbox, Inc.'),
    appStoreId: '327630330',
    androidPackage: 'com.dropbox.android',
    storeUrl: 'https://apps.apple.com/vn/app/dropbox-cloud-file-storage/id327630330',
    plans: [
      { id: 'simple-monthly-ios', label: 'Simple monthly · App Store', labelVi: 'Simple theo tháng · App Store', amount: 199_000, currency: 'VND', cycle: 'month', channel: 'app-store', sourceUrl: 'https://apps.apple.com/vn/app/dropbox-cloud-file-storage/id327630330', checkedAt, confidence: 'high' },
      { id: 'plus-monthly-ios', label: 'Plus monthly · App Store', labelVi: 'Plus theo tháng · App Store', amount: 279_000, currency: 'VND', cycle: 'month', channel: 'app-store', sourceUrl: 'https://apps.apple.com/vn/app/dropbox-cloud-file-storage/id327630330', checkedAt, confidence: 'high' },
      { id: 'plus-annual-ios', label: 'Plus annual · App Store', labelVi: 'Plus theo năm · App Store', amount: 2_799_000, currency: 'VND', cycle: 'year', channel: 'app-store', sourceUrl: 'https://apps.apple.com/vn/app/dropbox-cloud-file-storage/id327630330', checkedAt, confidence: 'high' },
      { id: 'professional-monthly-ios', label: 'Professional monthly · App Store', labelVi: 'Professional theo tháng · App Store', amount: 459_000, currency: 'VND', cycle: 'month', channel: 'app-store', sourceUrl: 'https://apps.apple.com/vn/app/dropbox-cloud-file-storage/id327630330', checkedAt, confidence: 'high' },
      { id: 'family-monthly-ios', label: 'Family monthly · App Store', labelVi: 'Family theo tháng · App Store', amount: 469_000, currency: 'VND', cycle: 'month', channel: 'app-store', sourceUrl: 'https://apps.apple.com/vn/app/dropbox-cloud-file-storage/id327630330', checkedAt, confidence: 'high' },
    ],
  },
  {
    id: 'google-one',
    name: 'Google One',
    aliases: [],
    asset: '/service-icons/google-one.png',
    ...appStoreArtwork('https://apps.apple.com/vn/app/google-one/id1451784328', 'Google LLC'),
    appStoreId: '1451784328',
    androidPackage: 'com.google.android.apps.subscriptions.red',
    storeUrl: 'https://apps.apple.com/vn/app/google-one/id1451784328',
    plans: [
      { id: '100gb-monthly-ios', label: 'Basic 100 GB monthly · App Store', labelVi: 'Cơ bản 100 GB theo tháng · App Store', amount: 45_000, currency: 'VND', cycle: 'month', channel: 'app-store', sourceUrl: 'https://apps.apple.com/vn/app/google-one/id1451784328', checkedAt, confidence: 'high' },
      { id: '200gb-monthly-ios', label: '200 GB monthly · App Store', labelVi: '200 GB theo tháng · App Store', amount: 69_000, currency: 'VND', cycle: 'month', channel: 'app-store', sourceUrl: 'https://apps.apple.com/vn/app/google-one/id1451784328', checkedAt, confidence: 'high' },
      { id: '100gb-annual-ios', label: 'Basic 100 GB annual · App Store', labelVi: 'Cơ bản 100 GB theo năm · App Store', amount: 459_000, currency: 'VND', cycle: 'year', channel: 'app-store', sourceUrl: 'https://apps.apple.com/vn/app/google-one/id1451784328', checkedAt, confidence: 'high' },
    ],
    priceNotice: 'Google currently publishes conflicting AI Plus storage details, and the App Store does not show a billing period. Choose Other plan and use your latest receipt for AI Plus.',
    priceNoticeVi: 'Thông tin dung lượng Google AI Plus đang không thống nhất và App Store không ghi rõ chu kỳ. Nếu dùng AI Plus, hãy chọn Gói khác và nhập theo hóa đơn gần nhất.',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    aliases: ['youtube premium'],
    asset: '/service-icons/youtube.png',
    ...appStoreArtwork('https://apps.apple.com/vn/app/youtube/id544007664', 'Google LLC', 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/1e/04/21/1e042146-e698-b8a0-e472-7608f97664b6/AppIcon-2-1x_U007emarketing-0-6-0-0-85-220-0.png/512x512bb.png'),
    appStoreId: '544007664',
    androidPackage: 'com.google.android.youtube',
    storeUrl: 'https://apps.apple.com/vn/app/youtube/id544007664',
    plans: [
      { id: 'premium-ios', label: 'Premium · App Store', labelVi: 'Premium · App Store', amount: 105_000, currency: 'VND', cycle: 'month', channel: 'app-store', sourceUrl: 'https://apps.apple.com/vn/app/youtube/id544007664', checkedAt, confidence: 'medium' },
      { id: 'family-ios', label: 'Premium Family · App Store', labelVi: 'Premium Gia đình · App Store', amount: 195_000, currency: 'VND', cycle: 'month', channel: 'app-store', sourceUrl: 'https://apps.apple.com/vn/app/youtube/id544007664', checkedAt, confidence: 'medium' },
      { id: 'lite-ios', label: 'Premium Lite · App Store', labelVi: 'Premium Lite · App Store', amount: 65_000, currency: 'VND', cycle: 'month', channel: 'app-store', sourceUrl: 'https://apps.apple.com/vn/app/youtube/id544007664', checkedAt, confidence: 'medium' },
    ],
    priceNotice: 'The Vietnam App Store shows these amounts without a clear billing period. Check the amount and cycle against your latest receipt.',
    priceNoticeVi: 'App Store Việt Nam có hiển thị mức giá nhưng không ghi rõ chu kỳ. Hãy kiểm tra lại số tiền và chu kỳ trên hóa đơn gần nhất.',
  },
  {
    id: 'youtube-music',
    name: 'YouTube Music',
    aliases: ['youtube music premium'],
    asset: '/service-icons/youtube-music.png',
    ...appStoreArtwork('https://apps.apple.com/vn/app/youtube-music/id1017492454', 'Google LLC', 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/8c/9f/f5/8c9ff57a-8a9f-30ca-3b1a-a53406a1fc2b/logo_youtube_music_2024_q4_color-0-0-1x_U007emarketing-0-0-0-7-0-0-0-85-220.png/512x512bb.png'),
    appStoreId: '1017492454',
    androidPackage: 'com.google.android.apps.youtube.music',
    storeUrl: 'https://apps.apple.com/vn/app/youtube-music/id1017492454',
    plans: [
      { id: 'individual-ios', label: 'Individual · App Store', labelVi: 'Cá nhân · App Store', amount: 85_000, currency: 'VND', cycle: 'month', channel: 'app-store', sourceUrl: 'https://apps.apple.com/vn/app/youtube-music/id1017492454', checkedAt, confidence: 'medium' },
    ],
    priceNotice: 'The Vietnam App Store shows this amount without a clear billing period. Check the amount and cycle against your latest receipt.',
    priceNoticeVi: 'App Store Việt Nam có hiển thị mức giá nhưng không ghi rõ chu kỳ. Hãy kiểm tra lại số tiền và chu kỳ trên hóa đơn gần nhất.',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    aliases: ['openai'],
    asset: '/service-icons/chatgpt.png',
    ...appStoreArtwork('https://apps.apple.com/vn/app/chatgpt/id6448311069', 'OpenAI OpCo, LLC'),
    appStoreId: '6448311069',
    androidPackage: 'com.openai.chatgpt',
    storeUrl: 'https://apps.apple.com/vn/app/chatgpt/id6448311069',
    plans: [
      { id: 'go-ios', label: 'Go · App Store', labelVi: 'Go · App Store', amount: 132_000, currency: 'VND', cycle: 'month', channel: 'app-store', sourceUrl: 'https://apps.apple.com/vn/app/chatgpt/id6448311069', checkedAt, confidence: 'medium' },
      { id: 'plus-ios', label: 'Plus · App Store', labelVi: 'Plus · App Store', amount: 499_000, currency: 'VND', cycle: 'month', channel: 'app-store', sourceUrl: 'https://apps.apple.com/vn/app/chatgpt/id6448311069', checkedAt, confidence: 'medium' },
    ],
    priceNotice: 'The Vietnam App Store shows these amounts without a clear billing period. Check the amount and cycle against your latest receipt; web checkout can differ.',
    priceNoticeVi: 'App Store Việt Nam có hiển thị mức giá nhưng không ghi rõ chu kỳ. Hãy kiểm tra lại hóa đơn gần nhất; giá trên web có thể khác.',
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    aliases: ['copilot'],
    ...brandMark('https://github.com/features/copilot', 'GitHub, Inc.'),
    plans: [
      { id: 'pro-web', label: 'Pro · Web', labelVi: 'Pro · Web', amount: 10, currency: 'USD', cycle: 'month', channel: 'web', sourceUrl: 'https://github.com/features/copilot/plans', checkedAt, confidence: 'high' },
      { id: 'pro-plus-web', label: 'Pro+ · Web', labelVi: 'Pro+ · Web', amount: 39, currency: 'USD', cycle: 'month', channel: 'web', sourceUrl: 'https://github.com/features/copilot/plans', checkedAt, confidence: 'high' },
      { id: 'max-web', label: 'Max · Web', labelVi: 'Max · Web', amount: 100, currency: 'USD', cycle: 'month', channel: 'web', sourceUrl: 'https://github.com/features/copilot/plans', checkedAt, confidence: 'high' },
    ],
  },
  {
    id: 'figma',
    name: 'Figma',
    aliases: ['figma professional'],
    asset: '/service-icons/figma.png',
    ...appStoreArtwork('https://apps.apple.com/vn/app/figma/id1152747299', 'Figma, Inc.'),
    appStoreId: '1152747299',
    androidPackage: 'com.figma.mirror',
    storeUrl: 'https://apps.apple.com/vn/app/figma/id1152747299',
    plans: [
      { id: 'professional-full-annual', label: 'Professional · Full seat · annual', labelVi: 'Professional · Full seat · theo năm', amount: 192, currency: 'USD', cycle: 'year', channel: 'web', sourceUrl: 'https://www.figma.com/pricing/', checkedAt, confidence: 'high', billingNote: 'US$16 per seat per month, billed annually', billingNoteVi: '16 USD cho mỗi seat mỗi tháng, thanh toán theo năm' },
      { id: 'professional-dev-annual', label: 'Professional · Dev seat · annual', labelVi: 'Professional · Dev seat · theo năm', amount: 144, currency: 'USD', cycle: 'year', channel: 'web', sourceUrl: 'https://www.figma.com/pricing/', checkedAt, confidence: 'high', billingNote: 'US$12 per seat per month, billed annually', billingNoteVi: '12 USD cho mỗi seat mỗi tháng, thanh toán theo năm' },
      { id: 'professional-collab-annual', label: 'Professional · Collab seat · annual', labelVi: 'Professional · Collab seat · theo năm', amount: 36, currency: 'USD', cycle: 'year', channel: 'web', sourceUrl: 'https://www.figma.com/pricing/', checkedAt, confidence: 'high', billingNote: 'US$3 per seat per month, billed annually', billingNoteVi: '3 USD cho mỗi seat mỗi tháng, thanh toán theo năm' },
    ],
  },
  {
    id: 'adobe-acrobat',
    name: 'Adobe Acrobat',
    aliases: ['acrobat'],
    asset: '/service-icons/adobe-acrobat.png',
    ...appStoreArtwork('https://apps.apple.com/vn/app/adobe-acrobat-reader-edit-pdf/id469337564', 'Adobe Inc.'),
    appStoreId: '469337564',
    androidPackage: 'com.adobe.reader',
    storeUrl: 'https://apps.apple.com/vn/app/adobe-acrobat-reader-edit-pdf/id469337564',
    plans: [
      { id: 'standard-web', label: 'Acrobat Standard · Web', labelVi: 'Acrobat Standard · Web', amount: 14.99, currency: 'USD', cycle: 'month', channel: 'web', sourceUrl: 'https://www.adobe.com/vn_vi/acrobat/pricing.html', checkedAt, confidence: 'high', billingNote: 'Annual commitment, billed monthly; VAT included', billingNoteVi: 'Cam kết theo năm, trả hằng tháng; đã gồm VAT' },
      { id: 'pro-web', label: 'Acrobat Pro · Web', labelVi: 'Acrobat Pro · Web', amount: 19.99, currency: 'USD', cycle: 'month', channel: 'web', sourceUrl: 'https://www.adobe.com/vn_vi/acrobat/pricing.html', checkedAt, confidence: 'high', billingNote: 'Annual commitment, billed monthly; VAT included', billingNoteVi: 'Cam kết theo năm, trả hằng tháng; đã gồm VAT' },
    ],
  },
  {
    id: 'icloud',
    name: 'iCloud+',
    aliases: ['icloud', 'icloud plus'],
    asset: '/service-icons/icloud.png',
    artwork: {
      kind: 'official-support',
      sourceUrl: 'https://support.apple.com/vi-vn/108047',
      checkedAt,
      rightsStatus: 'review-required',
      publisher: 'Apple Inc.',
      mime: 'image/png',
      remoteUrl: 'https://cdsassets.apple.com/live/7WUAS350/images/apple-pay/icloud-backup-cloud-topic-icon.png',
    },
    plans: [],
    priceNotice: 'Apple currently publishes conflicting Vietnam prices. Enter the amount from your latest receipt.',
    priceNoticeVi: 'Các nguồn Apple hiện đang công bố giá Việt Nam không thống nhất. Hãy nhập số tiền trên hóa đơn gần nhất.',
  },
  {
    id: 'duolingo',
    name: 'Duolingo',
    aliases: ['super duolingo'],
    asset: '/service-icons/duolingo.png',
    ...appStoreArtwork('https://apps.apple.com/vn/app/duolingo-language-lessons/id570060128', 'Duolingo, Inc.'),
    appStoreId: '570060128',
    androidPackage: 'com.duolingo',
    storeUrl: 'https://apps.apple.com/vn/app/duolingo-language-lessons/id570060128',
    plans: [],
    priceNotice: 'The Vietnam storefront lists several SKUs without billing periods. Enter the amount from your receipt.',
    priceNoticeVi: 'Gian hàng Việt Nam có nhiều mức giá nhưng không ghi rõ chu kỳ. Hãy nhập số tiền trên hóa đơn.',
  },
] as const;

function normalizeServiceName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-zA-Z0-9+]+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

export function catalogPlanLabel(plan: SubscriptionCatalogPlan, locale: CatalogLocale) {
  return locale === 'vi' ? plan.labelVi : plan.label;
}

export function catalogPlanNote(plan: SubscriptionCatalogPlan, locale: CatalogLocale) {
  return locale === 'vi' ? plan.billingNoteVi : plan.billingNote;
}

export function catalogPlanCanAutofill(plan: SubscriptionCatalogPlan) {
  return plan.confidence === 'high';
}

export function catalogPriceNotice(service: SubscriptionCatalogService, locale: CatalogLocale) {
  return locale === 'vi' ? service.priceNoticeVi : service.priceNotice;
}

export function findCatalogServiceById(id: string | undefined) {
  if (!id) return undefined;
  return SUBSCRIPTION_CATALOG.find((service) => service.id === id);
}

export function findCatalogServiceByName(name: string) {
  const normalized = normalizeServiceName(name);
  const matches = SUBSCRIPTION_CATALOG.flatMap((service) => (
    [service.name, ...service.aliases]
      .map(normalizeServiceName)
      .filter((candidate) => normalized === candidate || normalized.startsWith(`${candidate} `))
      .map((candidate) => ({ service, length: candidate.length }))
  ));
  return matches.sort((left, right) => right.length - left.length)[0]?.service;
}

export function findCatalogPlan(serviceId: string | undefined, planId: string | undefined) {
  return findCatalogServiceById(serviceId)?.plans.find((plan) => plan.id === planId);
}
