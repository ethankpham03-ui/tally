export type BankCountry = 'VN' | 'US' | 'GB';

export type BankDefinition = {
  id: string;
  name: string;
  country: BankCountry;
  aliases: readonly string[];
  logo: string;
  website: string;
};

// Official App Store application artwork is bundled locally. Source URLs and trademark notes live in
// docs/bank-icon-sources.md; account names never leave the browser for matching.
export const BANKS: readonly BankDefinition[] = [
  { id: 'bidv', name: 'BIDV', country: 'VN', aliases: ['Bank for Investment and Development of Vietnam', 'Đầu tư và Phát triển Việt Nam'], logo: '/banks/bidv.jpg', website: 'https://bidv.com.vn/' },
  { id: 'mbbank', name: 'MB Bank', country: 'VN', aliases: ['MB', 'MBBank', 'Military Bank', 'Ngân hàng Quân đội'], logo: '/banks/mbbank.jpg', website: 'https://www.mbbank.com.vn/' },
  { id: 'vietcombank', name: 'Vietcombank', country: 'VN', aliases: ['VCB', 'Vietcom Bank', 'Ngoại thương Việt Nam'], logo: '/banks/vietcombank.jpg', website: 'https://www.vietcombank.com.vn/' },
  { id: 'techcombank', name: 'Techcombank', country: 'VN', aliases: ['TCB', 'Techcom Bank', 'Kỹ thương Việt Nam'], logo: '/banks/techcombank.jpg', website: 'https://techcombank.com/' },
  { id: 'vietinbank', name: 'VietinBank', country: 'VN', aliases: ['Vietin Bank', 'CTG', 'Công thương Việt Nam'], logo: '/banks/vietinbank.jpg', website: 'https://www.vietinbank.vn/' },
  { id: 'agribank', name: 'Agribank', country: 'VN', aliases: ['Agri Bank', 'Nông nghiệp và Phát triển Nông thôn'], logo: '/banks/agribank.jpg', website: 'https://www.agribank.com.vn/' },
  { id: 'acb', name: 'ACB', country: 'VN', aliases: ['Asia Commercial Bank', 'Ngân hàng Á Châu'], logo: '/banks/acb.jpg', website: 'https://acb.com.vn/' },
  { id: 'vpbank', name: 'VPBank', country: 'VN', aliases: ['VP Bank', 'Việt Nam Thịnh Vượng'], logo: '/banks/vpbank.jpg', website: 'https://www.vpbank.com.vn/' },
  { id: 'tpbank', name: 'TPBank', country: 'VN', aliases: ['TP Bank', 'Tiên Phong'], logo: '/banks/tpbank.jpg', website: 'https://tpb.vn/' },
  { id: 'sacombank', name: 'Sacombank', country: 'VN', aliases: ['Sacom Bank', 'Sài Gòn Thương Tín'], logo: '/banks/sacombank.jpg', website: 'https://www.sacombank.com.vn/' },
  { id: 'hdbank', name: 'HDBank', country: 'VN', aliases: ['HD Bank', 'Phát triển Thành phố Hồ Chí Minh'], logo: '/banks/hdbank.jpg', website: 'https://hdbank.com.vn/' },
  { id: 'msb', name: 'MSB', country: 'VN', aliases: ['Maritime Bank', 'Hàng Hải Việt Nam'], logo: '/banks/msb.jpg', website: 'https://www.msb.com.vn/' },
  { id: 'ocb', name: 'OCB', country: 'VN', aliases: ['Orient Commercial Bank', 'Ngân hàng Phương Đông'], logo: '/banks/ocb.jpg', website: 'https://www.ocb.com.vn/' },
  { id: 'chase', name: 'Chase', country: 'US', aliases: ['JPMorgan Chase', 'JP Morgan Chase'], logo: '/banks/chase.jpg', website: 'https://www.chase.com/' },
  { id: 'bank-of-america', name: 'Bank of America', country: 'US', aliases: ['BofA', 'BOA'], logo: '/banks/bank-of-america.jpg', website: 'https://www.bankofamerica.com/' },
  { id: 'wells-fargo', name: 'Wells Fargo', country: 'US', aliases: ['WellsFargo'], logo: '/banks/wells-fargo.jpg', website: 'https://www.wellsfargo.com/' },
  { id: 'citi', name: 'Citi', country: 'US', aliases: ['Citibank', 'Citi Bank'], logo: '/banks/citi.jpg', website: 'https://www.citi.com/' },
  { id: 'capital-one', name: 'Capital One', country: 'US', aliases: ['CapitalOne'], logo: '/banks/capital-one.jpg', website: 'https://www.capitalone.com/' },
  { id: 'us-bank', name: 'U.S. Bank', country: 'US', aliases: ['US Bank', 'USBank', 'U S Bank', 'US Bancorp'], logo: '/banks/us-bank.jpg', website: 'https://www.usbank.com/' },
  { id: 'td-bank', name: 'TD Bank', country: 'US', aliases: ['TDBank', 'TD'], logo: '/banks/td-bank.jpg', website: 'https://www.td.com/us/en/personal-banking' },
  { id: 'truist', name: 'Truist', country: 'US', aliases: ['Truist Bank'], logo: '/banks/truist.jpg', website: 'https://www.truist.com/' },
  { id: 'american-express', name: 'American Express', country: 'US', aliases: ['Amex'], logo: '/banks/american-express.jpg', website: 'https://www.americanexpress.com/' },
  { id: 'hsbc', name: 'HSBC', country: 'GB', aliases: ['HSBC UK', 'Hongkong and Shanghai Banking Corporation'], logo: '/banks/hsbc.jpg', website: 'https://www.hsbc.co.uk/' },
  { id: 'barclays', name: 'Barclays', country: 'GB', aliases: ['Barclays Bank', 'Barclaycard'], logo: '/banks/barclays.jpg', website: 'https://www.barclays.co.uk/' },
  { id: 'lloyds', name: 'Lloyds Bank', country: 'GB', aliases: ['Lloyds', 'Lloyds TSB'], logo: '/banks/lloyds.jpg', website: 'https://www.lloydsbank.com/' },
  { id: 'natwest', name: 'NatWest', country: 'GB', aliases: ['Nat West', 'National Westminster'], logo: '/banks/natwest.jpg', website: 'https://www.natwest.com/' },
  { id: 'santander-uk', name: 'Santander UK', country: 'GB', aliases: ['Santander'], logo: '/banks/santander-uk.jpg', website: 'https://www.santander.co.uk/' },
  { id: 'halifax', name: 'Halifax', country: 'GB', aliases: ['Halifax Bank'], logo: '/banks/halifax.jpg', website: 'https://www.halifax.co.uk/' },
  { id: 'nationwide', name: 'Nationwide', country: 'GB', aliases: ['Nationwide Building Society'], logo: '/banks/nationwide.jpg', website: 'https://www.nationwide.co.uk/' },
  { id: 'monzo', name: 'Monzo', country: 'GB', aliases: ['Monzo Bank'], logo: '/banks/monzo.jpg', website: 'https://monzo.com/' },
  { id: 'starling', name: 'Starling Bank', country: 'GB', aliases: ['Starling'], logo: '/banks/starling.jpg', website: 'https://www.starlingbank.com/' },
  { id: 'royal-bank-of-scotland', name: 'Royal Bank of Scotland', country: 'GB', aliases: ['RBS'], logo: '/banks/royal-bank-of-scotland.jpg', website: 'https://www.rbs.co.uk/' },
];

const banksById = new Map(BANKS.map((bank) => [bank.id, bank]));

export function getBank(id: string | undefined | null): BankDefinition | undefined {
  return id ? banksById.get(id) : undefined;
}

function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const aliases = BANKS.flatMap((bank) => [bank.name, ...bank.aliases]
  .map((name) => ({ bank, name: normalizeName(name) })))
  .sort((a, b) => b.name.length - a.name.length);

/** Match complete words so short names such as MB never match an unrelated word. */
export function inferBank(name: string): BankDefinition | undefined {
  const normalized = normalizeName(name);
  if (!normalized) return undefined;
  return aliases.find((alias) => ` ${normalized} `.includes(` ${alias.name} `))?.bank;
}

/** Any explicit choice wins, including "generic" or an unknown imported bank ID. */
export function resolveAccountBank(account: { kind: string; name: string; bankId?: string }): BankDefinition | undefined {
  if (account.kind !== 'bank' && account.kind !== 'credit_card') return undefined;
  return account.bankId !== undefined ? getBank(account.bankId) : inferBank(account.name);
}
