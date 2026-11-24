export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Pending' | 'Overdue';

export type DisciplineKey =
  | 'ee'
  | 'pl'
  | 'st'
  | 'arch'
  | 'ece'
  | 'me'
  | 'solarElectrical'
  | 'others';

export interface DisciplineFeeBreakdown {
  design: number;
  signAndSeal: number;
  printing: number;
}

export type DisciplineFeesMap = Partial<Record<DisciplineKey, DisciplineFeeBreakdown>>;

export interface DisciplineDefinition {
  key: DisciplineKey;
  shortLabel: string;
  label: string;
  placeholder: string;
  colorClass: string;
}

export const DISCIPLINES: DisciplineDefinition[] = [
  {
    key: 'ee',
    shortLabel: 'EE',
    label: 'Electrical Engineering',
    placeholder: 'Engr. / Ref',
    colorClass: 'bg-indigo-600',
  },
  {
    key: 'pl',
    shortLabel: 'Pl',
    label: 'Plumbing',
    placeholder: 'Engr. / Ref',
    colorClass: 'bg-blue-600',
  },
  {
    key: 'st',
    shortLabel: 'St',
    label: 'Structural',
    placeholder: 'Engr. / Ref',
    colorClass: 'bg-emerald-600',
  },
  {
    key: 'arch',
    shortLabel: 'Arch',
    label: 'Architectural',
    placeholder: 'Arch. / Ref',
    colorClass: 'bg-purple-600',
  },
  {
    key: 'ece',
    shortLabel: 'ECE',
    label: 'Electronics & Comms',
    placeholder: 'Engr. / Ref',
    colorClass: 'bg-amber-600',
  },
  {
    key: 'me',
    shortLabel: 'ME',
    label: 'Mechanical',
    placeholder: 'Engr. / Ref',
    colorClass: 'bg-sky-600',
  },
  {
    key: 'solarElectrical',
    shortLabel: 'Solar/Elec',
    label: 'Solar/Electrical Installation',
    placeholder: 'Installer / Ref',
    colorClass: 'bg-orange-500',
  },
  {
    key: 'others',
    shortLabel: 'Others',
    label: 'Other Disciplines',
    placeholder: 'Geotech, Fire, etc.',
    colorClass: 'bg-slate-600',
  },
];

export function createEmptyDisciplineFee(): DisciplineFeeBreakdown {
  return { design: 0, signAndSeal: 0, printing: 0 };
}

export function getDisciplineFee(
  t: Partial<Transaction> | null | undefined,
  key: DisciplineKey
): DisciplineFeeBreakdown {
  const entry = t?.disciplineFees?.[key];
  return {
    design: Number(entry?.design) || 0,
    signAndSeal: Number(entry?.signAndSeal) || 0,
    printing: Number(entry?.printing) || 0,
  };
}

export function getDisciplineSubtotal(fee?: Partial<DisciplineFeeBreakdown> | null): number {
  if (!fee) return 0;
  return Number(
    ((Number(fee.design) || 0) + (Number(fee.signAndSeal) || 0) + (Number(fee.printing) || 0)).toFixed(2)
  );
}

export function getDisciplineNote(
  t: Partial<Transaction> | null | undefined,
  key: DisciplineKey
): string {
  if (!t) return '';
  const val = t[key];
  return typeof val === 'string' ? val : '';
}

export function hasDisciplineActivity(
  t: Partial<Transaction> | null | undefined,
  key: DisciplineKey
): boolean {
  if (!t) return false;
  const note = getDisciplineNote(t, key).trim();
  if (note.length > 0) return true;
  const fee = getDisciplineFee(t, key);
  return getDisciplineSubtotal(fee) > 0;
}

export function computeTotalsFromDisciplineFees(fees?: DisciplineFeesMap | null) {
  let designTotal = 0;
  let signAndSealTotal = 0;
  let printingTotal = 0;

  if (fees) {
    for (const d of DISCIPLINES) {
      const f = fees[d.key];
      if (!f) continue;
      designTotal += Number(f.design) || 0;
      signAndSealTotal += Number(f.signAndSeal) || 0;
      printingTotal += Number(f.printing) || 0;
    }
  }

  designTotal = Number(designTotal.toFixed(2));
  signAndSealTotal = Number(signAndSealTotal.toFixed(2));
  printingTotal = Number(printingTotal.toFixed(2));
  const serviceBill = Number((designTotal + signAndSealTotal).toFixed(2));
  const totalBill = Number((serviceBill + printingTotal).toFixed(2));

  return {
    designTotal,
    signAndSealTotal,
    printingTotal,
    serviceBill,
    totalBill,
    hasAnyFee: totalBill > 0,
  };
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  client: string;
  projectName: string;

  // Engineering & design discipline fields (optional text notes / leads)
  ee: string;                // Electrical Engineering
  pl: string;                // Plumbing
  st: string;                // Structural
  arch: string;              // Architectural
  ece: string;               // Electronics & Communications Engineering
  me: string;                // Mechanical Engineering
  solarElectrical?: string;  // Solar/Electrical Installation
  others: string;            // Other disciplines/consultants

  // Structured per-discipline charges (Design, Sign & Seal, Printing)
  disciplineFees?: DisciplineFeesMap;

  purpose: string;

  // Financial amounts
  bill: number;
  printCost: number;
  totalBill: number; // bill + printCost

  // Payment tracking
  paymentStatus: PaymentStatus;
  amountPaid: number;
  balance: number; // totalBill - amountPaid
  paymentDate?: string;
  paymentMethod?: string; // Cash, Bank Transfer, Check, GCash, Wire
  paymentReference?: string;

  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export type Currency = 'USD' | 'PHP' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'SGD';

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  name: string;
}

export interface ReportFilter {
  startDate: string;
  endDate: string;
  clientId: string;
  discipline: string;
  status: string;
  searchQuery: string;
}

export type LogoIconType = 'building' | 'compass' | 'hard-hat' | 'cpu' | 'layers' | 'briefcase';

export interface CompanyProfile {
  companyName: string;
  tagline: string;
  logoUrl?: string; // Base64 data URL for uploaded logo image
  logoIcon: LogoIconType;
  accentColor: string;
  address: string;
  contactInfo: string;
  tinNumber: string;
  signatoryName: string;
  signatoryTitle: string;
}

export const DEFAULT_COMPANY_PROFILE: CompanyProfile = {
  companyName: 'Vertex Engineering & Design Consultancy',
  tagline: 'Civil, Structural & MEPFS Engineering Services',
  logoIcon: 'building',
  accentColor: '#4f46e5',
  address: 'Suite 804, Cybergate Center, Ortigas Ave, Pasig City, Philippines',
  contactInfo: 'inquiries@vertexeng.com · +63 (2) 8876-2000',
  tinNumber: 'TIN: 240-891-342-000',
  signatoryName: 'Engr. Roberto D. Cruz, PE',
  signatoryTitle: 'Managing Principal & Senior Consultant',
};
