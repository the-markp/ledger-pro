import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  MoreHorizontal, 
  Download, 
  Trash2, 
  Edit3, 
  CreditCard, 
  FileText, 
  FileSpreadsheet, 
  CheckSquare, 
  Square, 
  SlidersHorizontal,
  ChevronRight,
  Eye,
  CheckCircle,
  Clock,
  RotateCcw
} from 'lucide-react';
import { Transaction, PaymentStatus, Currency, CompanyProfile } from '../types/transaction';
import { User, ROLE_PERMISSIONS } from '../types/auth';
import { formatCurrency, formatDate } from '../utils/formatters';
import { exportTransactionsToExcel, exportTransactionsToPdf, exportSingleInvoicePdf } from '../utils/exportUtils';

interface TransactionsTableProps {
  transactions: Transaction[];
  currency: Currency;
  companyProfile: CompanyProfile;
  currentUser: User;
  onEditTransaction: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onDeleteMultiple: (ids: string[]) => void;
  onOpenPaymentModal: (t: Transaction) => void;
  onBatchStatusUpdate: (ids: string[], status: PaymentStatus) => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  currency,
  companyProfile,
  currentUser,
  onEditTransaction,
  onDeleteTransaction,
  onDeleteMultiple,
  onOpenPaymentModal,
  onBatchStatusUpdate,
}) => {
  const permissions = ROLE_PERMISSIONS[currentUser.role];
  const canEdit = permissions.canEdit;
  const canDelete = permissions.canDelete;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedDiscipline, setSelectedDiscipline] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [disciplineViewMode, setDisciplineViewMode] = useState<'compact' | 'split'>('compact');

  // Sorting
  const [sortField, setSortField] = useState<keyof Transaction>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Unique clients for filter
  const clients = useMemo(() => {
    const set = new Set(transactions.map((t) => t.client).filter(Boolean));
    return Array.from(set).sort();
  }, [transactions]);

  // Filter & Search logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery = 
          t.client.toLowerCase().includes(q) ||
          t.projectName.toLowerCase().includes(q) ||
          t.purpose.toLowerCase().includes(q) ||
          t.remarks?.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.ee?.toLowerCase().includes(q) ||
          t.pl?.toLowerCase().includes(q) ||
          t.st?.toLowerCase().includes(q) ||
          t.arch?.toLowerCase().includes(q) ||
          t.ece?.toLowerCase().includes(q) ||
          t.me?.toLowerCase().includes(q) ||
          t.others?.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // Client filter
      if (selectedClient !== 'ALL' && t.client !== selectedClient) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'ALL' && t.paymentStatus !== selectedStatus) {
        return false;
      }

      // Discipline filter
      if (selectedDiscipline !== 'ALL') {
        const discKey = selectedDiscipline.toLowerCase() as keyof Transaction;
        const val = t[discKey] as string;
        if (!val || !val.trim()) return false;
      }

      // Date filter
      if (dateFilter === 'THIS_MONTH') {
        const now = new Date();
        const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (!t.date.startsWith(currentYearMonth)) return false;
      } else if (dateFilter === 'LAST_MONTH') {
        const now = new Date();
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevYearMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
        if (!t.date.startsWith(prevYearMonth)) return false;
      } else if (dateFilter === 'CUSTOM') {
        if (customStartDate && t.date < customStartDate) return false;
        if (customEndDate && t.date > customEndDate) return false;
      }

      return true;
    }).sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      const aValSafe = aVal ?? '';
      const bValSafe = bVal ?? '';

      if (aValSafe < bValSafe) return sortDirection === 'asc' ? -1 : 1;
      if (aValSafe > bValSafe) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [
    transactions, 
    searchQuery, 
    selectedClient, 
    selectedStatus, 
    selectedDiscipline, 
    dateFilter, 
    customStartDate, 
    customEndDate,
    sortField,
    sortDirection
  ]);

  // Aggregate sums for visible transactions
  const totals = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, t) => {
        acc.bill += t.bill || 0;
        acc.printCost += t.printCost || 0;
        acc.totalBill += t.totalBill || 0;
        acc.amountPaid += t.amountPaid || 0;
        acc.balance += t.balance || 0;
        return acc;
      },
      { bill: 0, printCost: 0, totalBill: 0, amountPaid: 0, balance: 0 }
    );
  }, [filteredTransactions]);

  const handleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map((t) => t.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="inline-flex items-center text-xs font-medium text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
            Paid
          </span>
        );
      case 'Partially Paid':
        return (
          <span className="inline-flex items-center text-xs font-medium text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
            Partially Paid
          </span>
        );
      case 'Overdue':
        return (
          <span className="inline-flex items-center text-xs font-medium text-rose-700">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5" />
            Overdue
          </span>
        );
      case 'Pending':
      default:
        return (
          <span className="inline-flex items-center text-xs font-medium text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search client, project, discipline, purpose, remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Export Quick Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => exportTransactionsToExcel(filteredTransactions, currency, 'Transactions_Ledger', companyProfile)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition-colors shadow-xs"
              title="Export Current View to Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export to Excel</span>
            </button>

            <button
              onClick={() => exportTransactionsToPdf(filteredTransactions, currency, 'Transaction Ledger Report', selectedClient === 'ALL' ? 'All Clients' : selectedClient, companyProfile)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg transition-colors shadow-xs"
              title="Export Current View to PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export to PDF</span>
            </button>

            {/* View Mode Toggle: Compact Disciplines vs Split Columns */}
            <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setDisciplineViewMode('compact')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  disciplineViewMode === 'compact'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Unified disciplines column"
              >
                Compact Disciplines
              </button>
              <button
                onClick={() => setDisciplineViewMode('split')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  disciplineViewMode === 'split'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Dedicated column for each discipline"
              >
                Split Columns (EE, Pl, St...)
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Client Filter */}
          <select
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Clients ({clients.length})</option>
            {clients.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Payment Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="Paid">Paid in Full</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Pending">Pending (Unpaid)</option>
            <option value="Overdue">Overdue</option>
          </select>

          {/* Discipline Filter */}
          <select
            value={selectedDiscipline}
            onChange={(e) => setSelectedDiscipline(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="ALL">All Disciplines</option>
            <option value="ee">Has EE (Electrical)</option>
            <option value="pl">Has Pl (Plumbing)</option>
            <option value="st">Has St (Structural)</option>
            <option value="arch">Has Arch (Architectural)</option>
            <option value="ece">Has ECE (Electronics)</option>
            <option value="me">Has ME (Mechanical)</option>
            <option value="others">Has Others</option>
          </select>

          {/* Date Presets */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setDateFilter('ALL')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                dateFilter === 'ALL' ? 'bg-white font-medium text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter('THIS_MONTH')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                dateFilter === 'THIS_MONTH' ? 'bg-white font-medium text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setDateFilter('LAST_MONTH')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                dateFilter === 'LAST_MONTH' ? 'bg-white font-medium text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last Month
            </button>
            <button
              onClick={() => setDateFilter('CUSTOM')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                dateFilter === 'CUSTOM' ? 'bg-white font-medium text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Custom
            </button>
          </div>

          {dateFilter === 'CUSTOM' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800"
              />
            </div>
          )}

          {(searchQuery || selectedClient !== 'ALL' || selectedStatus !== 'ALL' || selectedDiscipline !== 'ALL' || dateFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedClient('ALL');
                setSelectedStatus('ALL');
                setSelectedDiscipline('ALL');
                setDateFilter('ALL');
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 ml-auto"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Batch Actions Bar (visible when records selected) */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-between text-xs shadow-md animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{selectedIds.length}</span>
            <span>transaction(s) selected</span>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <>
                <button
                  onClick={() => onBatchStatusUpdate(selectedIds, 'Paid')}
                  className="px-2.5 py-1 bg-indigo-700 hover:bg-indigo-600 text-white rounded font-medium transition-colors"
                >
                  Mark as Paid
                </button>
                <button
                  onClick={() => onBatchStatusUpdate(selectedIds, 'Pending')}
                  className="px-2.5 py-1 bg-indigo-700 hover:bg-indigo-600 text-white rounded font-medium transition-colors"
                >
                  Mark as Pending
                </button>
              </>
            )}
            <button
              onClick={() => {
                const selectedTransactions = transactions.filter((t) => selectedIds.includes(t.id));
                exportTransactionsToExcel(selectedTransactions, currency, 'Selected_Transactions', companyProfile);
              }}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium transition-colors"
            >
              Export Selected (Excel)
            </button>
            <button
              onClick={() => {
                const selectedTransactions = transactions.filter((t) => selectedIds.includes(t.id));
                exportTransactionsToPdf(selectedTransactions, currency, 'Selected Transactions Report', 'Selected Records', companyProfile);
              }}
              className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium transition-colors"
            >
              Export Selected (PDF)
            </button>
            {canDelete && (
              <button
                onClick={() => {
                  if (window.confirm(`Delete ${selectedIds.length} selected transactions?`)) {
                    onDeleteMultiple(selectedIds);
                    setSelectedIds([]);
                  }
                }}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-medium transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            )}
            <button
              onClick={() => setSelectedIds([])}
              className="text-indigo-200 hover:text-white px-1.5 py-1"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Main Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[640px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-900 text-slate-200 sticky top-0 z-20 shadow-xs font-semibold select-none">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-400 text-indigo-600 cursor-pointer"
                  />
                </th>

                <th
                  onClick={() => handleSort('date')}
                  className="p-3 whitespace-nowrap cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('client')}
                  className="p-3 whitespace-nowrap cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Client</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('projectName')}
                  className="p-3 whitespace-nowrap cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Project Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Disciplines: compact or split */}
                {disciplineViewMode === 'compact' ? (
                  <th className="p-3 min-w-[200px]">
                    <span>Engineering Disciplines</span>
                    <span className="block text-[10px] text-slate-400 font-normal">
                      EE · Pl · St · Arch · ECE · ME · Others
                    </span>
                  </th>
                ) : (
                  <>
                    <th className="p-3 whitespace-nowrap bg-slate-800/60">EE</th>
                    <th className="p-3 whitespace-nowrap bg-slate-800/60">Pl</th>
                    <th className="p-3 whitespace-nowrap bg-slate-800/60">St</th>
                    <th className="p-3 whitespace-nowrap bg-slate-800/60">Arch</th>
                    <th className="p-3 whitespace-nowrap bg-slate-800/60">ECE</th>
                    <th className="p-3 whitespace-nowrap bg-slate-800/60">ME</th>
                    <th className="p-3 whitespace-nowrap bg-slate-800/60">Others</th>
                  </>
                )}

                <th className="p-3 min-w-[170px]">Purpose</th>

                <th
                  onClick={() => handleSort('bill')}
                  className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Bill</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('printCost')}
                  className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Print Cost</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('totalBill')}
                  className="p-3 text-right whitespace-nowrap cursor-pointer hover:bg-slate-800 transition-colors bg-slate-800/90 text-indigo-200"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Total Bill</span>
                    <ArrowUpDown className="w-3 h-3 text-indigo-300" />
                  </div>
                </th>

                <th
                  onClick={() => handleSort('paymentStatus')}
                  className="p-3 whitespace-nowrap cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Status</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                <th className="p-3 text-right whitespace-nowrap">Amount Paid / Balance</th>

                <th className="p-3 min-w-[150px]">Remarks</th>

                <th className="p-3 text-center whitespace-nowrap sticky right-0 bg-slate-900 z-10">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={disciplineViewMode === 'compact' ? 12 : 18} className="py-12 text-center text-slate-500">
                    <p className="text-sm font-medium">No transactions match the selected filters</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting search filters or record a new transaction.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => {
                  const isSelected = selectedIds.includes(t.id);

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50/90 transition-colors group ${
                        isSelected ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(t.id)}
                          className="rounded border-slate-300 text-indigo-600 cursor-pointer"
                        />
                      </td>

                      {/* Date */}
                      <td className="p-3 whitespace-nowrap font-mono text-slate-700">
                        {formatDate(t.date)}
                      </td>

                      {/* Client */}
                      <td className="p-3 font-medium text-slate-900 max-w-[160px] truncate" title={t.client}>
                        {t.client}
                      </td>

                      {/* Project Name */}
                      <td className="p-3 text-slate-800 max-w-[180px] truncate" title={t.projectName}>
                        {t.projectName}
                      </td>

                      {/* Disciplines: Compact or Split */}
                      {disciplineViewMode === 'compact' ? (
                        <td className="p-3 text-slate-600 max-w-[260px]">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                            {t.ee && <span><span className="font-semibold text-slate-800">EE:</span> {t.ee}</span>}
                            {t.pl && <span><span className="font-semibold text-slate-800">Pl:</span> {t.pl}</span>}
                            {t.st && <span><span className="font-semibold text-slate-800">St:</span> {t.st}</span>}
                            {t.arch && <span><span className="font-semibold text-slate-800">Arch:</span> {t.arch}</span>}
                            {t.ece && <span><span className="font-semibold text-slate-800">ECE:</span> {t.ece}</span>}
                            {t.me && <span><span className="font-semibold text-slate-800">ME:</span> {t.me}</span>}
                            {t.others && <span><span className="font-semibold text-slate-800">Oth:</span> {t.others}</span>}
                            {!t.ee && !t.pl && !t.st && !t.arch && !t.ece && !t.me && !t.others && (
                              <span className="text-slate-400 italic">None specified</span>
                            )}
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className="p-3 text-slate-700 whitespace-nowrap">{t.ee || '-'}</td>
                          <td className="p-3 text-slate-700 whitespace-nowrap">{t.pl || '-'}</td>
                          <td className="p-3 text-slate-700 whitespace-nowrap">{t.st || '-'}</td>
                          <td className="p-3 text-slate-700 whitespace-nowrap">{t.arch || '-'}</td>
                          <td className="p-3 text-slate-700 whitespace-nowrap">{t.ece || '-'}</td>
                          <td className="p-3 text-slate-700 whitespace-nowrap">{t.me || '-'}</td>
                          <td className="p-3 text-slate-700 whitespace-nowrap">{t.others || '-'}</td>
                        </>
                      )}

                      {/* Purpose */}
                      <td className="p-3 text-slate-700 max-w-[220px] truncate" title={t.purpose}>
                        {t.purpose}
                      </td>

                      {/* Bill */}
                      <td className="p-3 text-right font-mono text-slate-700 whitespace-nowrap">
                        {formatCurrency(t.bill, currency)}
                      </td>

                      {/* Print Cost */}
                      <td className="p-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        {formatCurrency(t.printCost, currency)}
                      </td>

                      {/* Total Bill */}
                      <td className="p-3 text-right font-mono font-bold text-slate-900 bg-slate-50/60 whitespace-nowrap">
                        {formatCurrency(t.totalBill, currency)}
                      </td>

                      {/* Status */}
                      <td className="p-3 whitespace-nowrap">
                        {canEdit ? (
                          <button
                            onClick={() => onOpenPaymentModal(t)}
                            className="hover:underline flex items-center gap-1.5 cursor-pointer text-left"
                            title="Click to update payment"
                          >
                            {getStatusBadge(t.paymentStatus)}
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 text-left">
                            {getStatusBadge(t.paymentStatus)}
                          </div>
                        )}
                      </td>

                      {/* Amount Paid / Balance */}
                      <td className="p-3 text-right whitespace-nowrap font-mono">
                        <div className="text-emerald-700 font-medium">
                          {formatCurrency(t.amountPaid, currency)}
                        </div>
                        {t.balance > 0 ? (
                          <div className="text-[10px] text-rose-600">
                            Bal: {formatCurrency(t.balance, currency)}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400">
                            Settled
                          </div>
                        )}
                      </td>

                      {/* Remarks */}
                      <td className="p-3 text-slate-600 max-w-[180px] truncate" title={t.remarks}>
                        {t.remarks || '-'}
                      </td>

                      {/* Action buttons */}
                      <td className="p-3 text-center whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors shadow-xs">
                        <div className="flex items-center justify-center gap-1">
                          {canEdit && (
                            <button
                              onClick={() => onOpenPaymentModal(t)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Record Payment"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => exportSingleInvoicePdf(t, currency, companyProfile)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Download Statement of Account / Invoice PDF"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {canEdit && (
                            <button
                              onClick={() => onEditTransaction(t)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded transition-colors"
                              title="Edit Transaction"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete transaction for ${t.projectName}?`)) {
                                  onDeleteTransaction(t.id);
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Total Footer Row */}
            {filteredTransactions.length > 0 && (
              <tfoot className="bg-slate-100 font-semibold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td className="p-3 text-center text-slate-500">∑</td>
                  <td className="p-3 font-mono text-slate-700">{filteredTransactions.length} items</td>
                  <td className="p-3">TOTALS</td>
                  <td className="p-3">-</td>
                  
                  {disciplineViewMode === 'compact' ? (
                    <td className="p-3 text-slate-500 text-[11px] font-normal">
                      Filtered records summary
                    </td>
                  ) : (
                    <>
                      <td className="p-3">-</td>
                      <td className="p-3">-</td>
                      <td className="p-3">-</td>
                      <td className="p-3">-</td>
                      <td className="p-3">-</td>
                      <td className="p-3">-</td>
                      <td className="p-3">-</td>
                    </>
                  )}

                  <td className="p-3">-</td>

                  {/* Bill sum */}
                  <td className="p-3 text-right font-mono text-slate-800 whitespace-nowrap">
                    {formatCurrency(totals.bill, currency)}
                  </td>

                  {/* Print Cost sum */}
                  <td className="p-3 text-right font-mono text-slate-800 whitespace-nowrap">
                    {formatCurrency(totals.printCost, currency)}
                  </td>

                  {/* Total Bill sum */}
                  <td className="p-3 text-right font-mono font-bold text-indigo-950 bg-indigo-50/50 whitespace-nowrap">
                    {formatCurrency(totals.totalBill, currency)}
                  </td>

                  {/* Status / Collection % */}
                  <td className="p-3 whitespace-nowrap text-slate-600">
                    {totals.totalBill > 0
                      ? `${((totals.amountPaid / totals.totalBill) * 100).toFixed(0)}% Paid`
                      : '-'}
                  </td>

                  {/* Amount Paid / Balance sum */}
                  <td className="p-3 text-right font-mono whitespace-nowrap">
                    <div className="text-emerald-700">
                      {formatCurrency(totals.amountPaid, currency)}
                    </div>
                    <div className="text-[10px] text-rose-600">
                      Bal: {formatCurrency(totals.balance, currency)}
                    </div>
                  </td>

                  <td className="p-3">-</td>
                  <td className="p-3 sticky right-0 bg-slate-100">-</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
