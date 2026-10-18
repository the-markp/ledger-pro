import React, { useState } from 'react';
import { X, FileSpreadsheet, FileText, Download, CheckCircle2 } from 'lucide-react';
import { Transaction, Currency, CompanyProfile } from '../types/transaction';
import { exportTransactionsToExcel, exportTransactionsToPdf } from '../utils/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  currency: Currency;
  companyProfile: CompanyProfile;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  currency,
  companyProfile,
}) => {
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [scope, setScope] = useState<'all' | 'paid' | 'unpaid' | 'current_month'>('all');
  const [reportTitle, setReportTitle] = useState(`${companyProfile.companyName.replace(/\s+/g, '_')}_Report`);

  if (!isOpen) return null;

  // Filter transactions based on selected scope
  const targetTransactions = transactions.filter((t) => {
    if (scope === 'paid') return t.paymentStatus === 'Paid';
    if (scope === 'unpaid') return t.paymentStatus !== 'Paid';
    if (scope === 'current_month') {
      const now = new Date();
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return t.date.startsWith(currentYearMonth);
    }
    return true;
  });

  const handleExport = () => {
    if (format === 'excel') {
      exportTransactionsToExcel(targetTransactions, currency, reportTitle, companyProfile);
    } else {
      exportTransactionsToPdf(
        targetTransactions,
        currency,
        reportTitle.replace(/_/g, ' '),
        `Scope: ${scope.toUpperCase()} (${targetTransactions.length} items)`,
        companyProfile
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Export Accounting Reports</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate formatted Excel (.xlsx) or PDF (.pdf) documents
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Format Selection */}
          <div>
            <label className="block text-slate-700 font-medium mb-1.5">Export Format</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('excel')}
                className={`p-3 rounded-lg border flex flex-col items-center gap-1.5 transition-all ${
                  format === 'excel'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 ring-1 ring-emerald-500 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Microsoft Excel (.xlsx)</span>
                <span className="text-[10px] text-slate-500 font-normal">With summary sheet & formulas</span>
              </button>

              <button
                type="button"
                onClick={() => setFormat('pdf')}
                className={`p-3 rounded-lg border flex flex-col items-center gap-1.5 transition-all ${
                  format === 'pdf'
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 ring-1 ring-indigo-500 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>Printable PDF (.pdf)</span>
                <span className="text-[10px] text-slate-500 font-normal">Landscape ledger layout</span>
              </button>
            </div>
          </div>

          {/* Scope Selection */}
          <div>
            <label className="block text-slate-700 font-medium mb-1.5">Data Scope</label>
            <div className="space-y-1.5">
              {[
                { id: 'all', label: `All Transactions (${transactions.length} records)` },
                { id: 'current_month', label: 'Current Month Records Only' },
                { id: 'paid', label: 'Paid & Settled Accounts Only' },
                { id: 'unpaid', label: 'Unpaid / Pending & Overdue Balances' },
              ].map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    scope === opt.id
                      ? 'border-indigo-300 bg-indigo-50/40 text-slate-900 font-medium'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="scope"
                    value={opt.id}
                    checked={scope === opt.id}
                    onChange={() => setScope(opt.id as any)}
                    className="text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Filename */}
          <div>
            <label className="block text-slate-700 font-medium mb-1">File Name Prefix</label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Export preview stats */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span>Records to export:</span>
              <span className="font-mono font-bold text-slate-900">{targetTransactions.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Included columns:</span>
              <span className="text-slate-700">Date, Client, Project, EE, Pl, St, Arch, ECE, ME, Others, Purpose, Bill, Print Cost, Total Bill, Status, Remarks</span>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={targetTransactions.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download {format.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
