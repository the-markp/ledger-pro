export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Pending' | 'Overdue';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  client: string;
  projectName: string;
  
  // Engineering & design discipline fields (texts)
  ee: string;     // Electrical Engineering
  pl: string;     // Plumbing
  st: string;     // Structural
  arch: string;   // Architectural
  ece: string;    // Electronics & Communications Engineering
  me: string;     // Mechanical Engineering
  others: string; // Other disciplines/consultants
  
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
