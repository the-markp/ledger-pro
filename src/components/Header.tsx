import React from 'react';
import { 
  Building2, 
  Plus, 
  FileSpreadsheet, 
  FileText, 
  RotateCcw, 
  DollarSign, 
  Layers, 
  Calendar, 
  BarChart3, 
  Table,
  Settings,
  Compass,
  HardHat,
  Cpu,
  Briefcase,
  Users,
  Database,
  LogOut,
  KeyRound,
  ShieldCheck,
  UserCheck,
  Lock
} from 'lucide-react';
import { Currency, CURRENCIES, formatCurrency } from '../utils/formatters';
import { Transaction, CompanyProfile, LogoIconType } from '../types/transaction';
import { User, ROLE_PERMISSIONS } from '../types/auth';

interface HeaderProps {
  currentTab: 'transactions' | 'weekly' | 'monthly' | 'analytics';
  setCurrentTab: (tab: 'transactions' | 'weekly' | 'monthly' | 'analytics') => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  transactions: Transaction[];
  companyProfile: CompanyProfile;
  currentUser: User;
  onOpenCompanySettings: () => void;
  onOpenUserManagement: () => void;
  onOpenChangePin: () => void;
  onOpenBackupRestore: () => void;
  onLogout: () => void;
  onNewTransaction: () => void;
  onOpenExportModal: () => void;
  onResetSeedData: () => void;
}

const ICON_MAP: Record<LogoIconType, any> = {
  building: Building2,
  compass: Compass,
  'hard-hat': HardHat,
  cpu: Cpu,
  layers: Layers,
  briefcase: Briefcase,
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  currency,
  setCurrency,
  transactions,
  companyProfile,
  currentUser,
  onOpenCompanySettings,
  onOpenUserManagement,
  onOpenChangePin,
  onOpenBackupRestore,
  onLogout,
  onNewTransaction,
  onOpenExportModal,
  onResetSeedData,
}) => {
  const totalBilled = transactions.reduce((sum, t) => sum + (t.totalBill || 0), 0);
  const totalCollected = transactions.reduce((sum, t) => sum + (t.amountPaid || 0), 0);
  const totalReceivables = transactions.reduce((sum, t) => sum + (t.balance || 0), 0);

  const LogoIcon = ICON_MAP[companyProfile.logoIcon] || Building2;
  const permissions = ROLE_PERMISSIONS[currentUser.role];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3 border-b border-slate-800/80">
          
          {/* Company Identity & Logo */}
          <div className="flex items-center gap-3">
            {permissions.canEditBranding ? (
              <button
                onClick={onOpenCompanySettings}
                className="flex items-center gap-3 text-left group hover:opacity-95 transition-opacity cursor-pointer"
                title="Click to customize company name and logo"
              >
                {companyProfile.logoUrl ? (
                  <img
                    src={companyProfile.logoUrl}
                    alt={`${companyProfile.companyName} logo`}
                    className="w-10 h-10 object-contain rounded-lg bg-white p-1 border border-slate-700 shadow-inner group-hover:ring-2 group-hover:ring-indigo-400 transition-all"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shadow-inner text-white font-bold group-hover:ring-2 group-hover:ring-indigo-400 transition-all"
                    style={{ backgroundColor: companyProfile.accentColor || '#4f46e5' }}
                  >
                    <LogoIcon className="w-5 h-5" />
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-bold tracking-tight text-white group-hover:text-indigo-200 transition-colors">
                      {companyProfile.companyName || 'LedgerPro'}
                    </h1>
                    <span className="text-[10px] text-slate-400 group-hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 flex items-center gap-1">
                      <Settings className="w-2.5 h-2.5" />
                      <span>Branding</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
                    {companyProfile.tagline || 'Engineering & Architectural Project Billing'}
                  </p>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-3 text-left">
                {companyProfile.logoUrl ? (
                  <img
                    src={companyProfile.logoUrl}
                    alt={`${companyProfile.companyName} logo`}
                    className="w-10 h-10 object-contain rounded-lg bg-white p-1 border border-slate-700 shadow-inner"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shadow-inner text-white font-bold"
                    style={{ backgroundColor: companyProfile.accentColor || '#4f46e5' }}
                  >
                    <LogoIcon className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h1 className="text-base font-bold tracking-tight text-white">
                    {companyProfile.companyName || 'LedgerPro'}
                  </h1>
                  <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
                    {companyProfile.tagline || 'Engineering & Architectural Project Billing'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Metrics & User Controls */}
          <div className="flex items-center gap-2.5 text-xs flex-wrap">
            {/* Quick Metrics Bar */}
            <div className="hidden xl:flex items-center gap-3 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700/60 font-mono">
              <div>
                <span className="text-slate-400 text-[10px] block">TOTAL BILLED</span>
                <span className="text-slate-100 font-semibold">{formatCurrency(totalBilled, currency)}</span>
              </div>
              <div className="w-px h-5 bg-slate-700" />
              <div>
                <span className="text-emerald-400 text-[10px] block">COLLECTED</span>
                <span className="text-emerald-300 font-semibold">{formatCurrency(totalCollected, currency)}</span>
              </div>
              <div className="w-px h-5 bg-slate-700" />
              <div>
                <span className="text-amber-400 text-[10px] block">OUTSTANDING</span>
                <span className="text-amber-300 font-semibold">{formatCurrency(totalReceivables, currency)}</span>
              </div>
            </div>

            {/* Currency Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800 rounded-lg border border-slate-700 px-2 py-1">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="bg-transparent text-xs text-slate-200 font-medium focus:outline-none cursor-pointer"
                title="Select Currency"
              >
                {Object.values(CURRENCIES).map((c) => (
                  <option key={c.code} value={c.code} className="bg-slate-800 text-white">
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>

            {/* Admin: Users Management */}
            {permissions.canManageUsers && (
              <button
                onClick={onOpenUserManagement}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 transition-colors shadow-xs"
                title="Manage User Accounts & Roles"
              >
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Users</span>
              </button>
            )}

            {/* Admin: Company Profile */}
            {permissions.canEditBranding && (
              <button
                onClick={onOpenCompanySettings}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 transition-colors shadow-xs"
                title="Change Company Name, Logo & Official Details"
              >
                <Settings className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Branding</span>
              </button>
            )}

            {/* Backup & Restore Data */}
            <button
              onClick={onOpenBackupRestore}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 transition-colors shadow-xs"
              title="Backup and Restore Ledger & System Data"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Backup</span>
            </button>

            {/* Export (Available to all roles) */}
            <button
              onClick={onOpenExportModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 transition-colors shadow-xs"
              title="Export Transactions to Excel or PDF"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export</span>
            </button>

            {/* New Transaction (Admin & Editor only) */}
            {permissions.canEdit && (
              <button
                onClick={onNewTransaction}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Transaction</span>
              </button>
            )}

            {/* Current User Badge & Menu */}
            <div className="flex items-center gap-2 pl-1 border-l border-slate-800">
              <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-800/90 rounded-lg border border-slate-700/80">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center uppercase text-[10px]">
                  {currentUser.username.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-200 leading-none">
                      @{currentUser.username}
                    </span>
                    <span className={`text-[9px] px-1 rounded uppercase font-bold tracking-wider leading-tight ${
                      currentUser.role === 'admin'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : currentUser.role === 'editor'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-700 text-slate-300'
                    }`}>
                      {currentUser.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Change PIN Button */}
              <button
                onClick={onOpenChangePin}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                title="Change Your Security PIN"
              >
                <KeyRound className="w-3.5 h-3.5" />
              </button>

              {/* Reset Seed Data (Admin only) */}
              {permissions.canManageUsers && (
                <button
                  onClick={onResetSeedData}
                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Reset Sample Engineering Data"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Sign Out Button */}
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                title="Sign Out of Session"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between py-2 overflow-x-auto">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentTab('transactions')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                currentTab === 'transactions'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Transaction Ledger</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-700 text-slate-300 rounded font-mono">
                {transactions.length}
              </span>
            </button>

            <button
              onClick={() => setCurrentTab('weekly')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                currentTab === 'weekly'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Weekly Reports</span>
            </button>

            <button
              onClick={() => setCurrentTab('monthly')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                currentTab === 'monthly'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Monthly Reports</span>
            </button>

            <button
              onClick={() => setCurrentTab('analytics')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                currentTab === 'analytics'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Spending & Discipline Breakdown</span>
            </button>
          </div>

          {/* Role Status Tag */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <span>Access Mode:</span>
            <span className={`font-semibold ${
              currentUser.role === 'admin'
                ? 'text-indigo-400'
                : currentUser.role === 'editor'
                ? 'text-emerald-400'
                : 'text-sky-400'
            }`}>
              {currentUser.role.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
