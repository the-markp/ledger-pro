import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  FileText,
  FileSpreadsheet,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Receipt,
} from 'lucide-react';
import {
  Transaction,
  Currency,
  CompanyProfile,
  DISCIPLINES,
  getDisciplineFee,
  computeTotalsFromDisciplineFees,
} from '../types/transaction';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  exportClientStatementOfAccountPdf,
  exportClientStatementOfAccountExcel,
} from '../utils/exportUtils';

interface ClientStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  currency: Currency;
  companyProfile: CompanyProfile;
  initialClient?: string;
}

type StatementScope = 'all' | 'unpaid' | 'paid' | 'custom_dates';

export const ClientStatementModal: React.FC<ClientStatementModalProps> = ({
  isOpen,
  onClose,
  transactions,
  currency,
  companyProfile,
  initialClient,
}) => {
  // Compute unique clients with summary metrics
  const clientSummaries = useMemo(() => {
    const map = new Map<
      string,
      { name: string; count: number; totalBilled: number; totalPaid: number; balance: number }
    >();
    transactions.forEach((t) => {
      if (!t.client) return;
      const existing = map.get(t.client) || {
        name: t.client,
        count: 0,
        totalBilled: 0,
        totalPaid: 0,
        balance: 0,
      };
      existing.count += 1;
      existing.totalBilled += t.totalBill || 0;
      existing.totalPaid += t.amountPaid || 0;
      existing.balance += t.balance || 0;
      map.set(t.client, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions]);

  const [selectedClient, setSelectedClient] = useState<string>('');
  const [scope, setScope] = useState<StatementScope>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statementDate, setStatementDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState<string>('');
  const [includeDisciplineBreakdown, setIncludeDisciplineBreakdown] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>(
    'Please settle outstanding balance via bank transfer or check payable to the company name above. Kindly send proof of payment for official receipt issuance.'
  );

  // Sync selected client whenever modal opens or initialClient changes
  useEffect(() => {
    if (!isOpen) return;
    if (initialClient && clientSummaries.some((c) => c.name === initialClient)) {
      setSelectedClient(initialClient);
    } else if (!selectedClient || !clientSummaries.some((c) => c.name === selectedClient)) {
      setSelectedClient(clientSummaries[0]?.name || '');
    }
  }, [isOpen, initialClient, clientSummaries]);

  const filteredClientTransactions = useMemo(() => {
    if (!selectedClient) return [];
    return transactions
      .filter((t) => t.client === selectedClient)
      .filter((t) => {
        if (scope === 'unpaid') return t.paymentStatus !== 'Paid' || (t.balance || 0) > 0;
        if (scope === 'paid') return t.paymentStatus === 'Paid' && (t.balance || 0) === 0;
        if (scope === 'custom_dates') {
          if (startDate && t.date < startDate) return false;
          if (endDate && t.date > endDate) return false;
        }
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, selectedClient, scope, startDate, endDate]);

  const summary = useMemo(() => {
    let totalBilled = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let totalDesign = 0;
    let totalSignSeal = 0;
    let totalPrinting = 0;

    filteredClientTransactions.forEach((t) => {
      totalBilled += t.totalBill || 0;
      totalPaid += t.amountPaid || 0;
      totalBalance += t.balance || 0;
      const f = computeTotalsFromDisciplineFees(t.disciplineFees);
      if (f.hasAnyFee) {
        totalDesign += f.designTotal;
        totalSignSeal += f.signAndSealTotal;
        totalPrinting += f.printingTotal;
      } else {
        totalDesign += t.bill || 0;
        totalPrinting += t.printCost || 0;
      }
    });

    const disciplineBreakdown = DISCIPLINES.map((d) => {
      let design = 0;
      let signAndSeal = 0;
      let printing = 0;
      filteredClientTransactions.forEach((t) => {
        const fee = getDisciplineFee(t, d.key);
        design += fee.design;
        signAndSeal += fee.signAndSeal;
        printing += fee.printing;
      });
      const subtotal = Number((design + signAndSeal + printing).toFixed(2));
      return { ...d, design, signAndSeal, printing, subtotal };
    }).filter((d) => d.subtotal > 0);

    return {
      totalBilled,
      totalPaid,
      totalBalance,
      totalDesign,
      totalSignSeal,
      totalPrinting,
      disciplineBreakdown,
    };
  }, [filteredClientTransactions]);

  const getScopeLabel = () => {
    if (scope === 'unpaid') return 'Unpaid & Outstanding Balances Only';
    if (scope === 'paid') return 'Settled / Paid Transactions Only';
    if (scope === 'custom_dates') {
      const from = startDate ? formatDate(startDate) : 'Beginning';
      const to = endDate ? formatDate(endDate) : 'Present';
      return `${from} to ${to}`;
    }
    return 'All Transactions';
  };

  const handleDownloadPdf = () => {
    if (!selectedClient || filteredClientTransactions.length === 0) return;
    exportClientStatementOfAccountPdf(
      selectedClient,
      filteredClientTransactions,
      currency,
      companyProfile,
      {
        scopeLabel: getScopeLabel(),
        statementDate,
        dueDate: dueDate || undefined,
        includeDisciplineBreakdown,
        notes,
      }
    );
  };

  const handleDownloadExcel = () => {
    if (!selectedClient || filteredClientTransactions.length === 0) return;
    exportClientStatementOfAccountExcel(
      selectedClient,
      filteredClientTransactions,
      currency,
      companyProfile,
      {
        scopeLabel: getScopeLabel(),
        statementDate,
        dueDate: dueDate || undefined,
        includeDisciplineBreakdown,
        notes,
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">
                Client Statement of Account (SOA)
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Generate a consolidated billing statement per client with itemized charges and outstanding balance.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        {clientSummaries.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Building2 className="w-10 h-10 mx-auto text-slate-300" />
            <h3 className="text-sm font-semibold text-slate-800">No Clients Found</h3>
            <p className="text-xs text-slate-500">
              Record at least one transaction before generating a Client Statement of Account.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
            {/* Configuration Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {/* Client Dropdown */}
              <div className="lg:col-span-5">
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Select Client
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {clientSummaries.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.count} record{c.count === 1 ? '' : 's'} — Bal:{' '}
                      {formatCurrency(c.balance, currency)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Scope */}
              <div className="lg:col-span-3">
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Statement Scope
                </label>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as StatementScope)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">All Transactions</option>
                  <option value="unpaid">Unpaid / Outstanding Only</option>
                  <option value="paid">Paid / Settled Only</option>
                  <option value="custom_dates">Custom Date Range</option>
                </select>
              </div>

              {/* Statement Date */}
              <div className="lg:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Statement Date
                </label>
                <input
                  type="date"
                  value={statementDate}
                  onChange={(e) => setStatementDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Optional Due Date */}
              <div className="lg:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Due Date <span className="font-normal text-slate-400">(opt.)</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Custom date range row */}
              {scope === 'custom_dates' && (
                <div className="lg:col-span-12 flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-medium text-slate-700">Period Range:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              )}

              {/* Notes + Toggle */}
              <div className="lg:col-span-8 pt-1">
                <label className="block font-medium text-slate-700 mb-1">
                  Payment Instructions / Statement Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Bank details, payment terms, or remarks printed on the SOA..."
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="lg:col-span-4 flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={includeDisciplineBreakdown}
                    onChange={(e) => setIncludeDisciplineBreakdown(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Include discipline breakdown table</span>
                </label>
              </div>
            </div>

            {/* Live SOA Summary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">
                  Projects Included
                </span>
                <span className="text-lg font-bold font-mono text-slate-900 mt-1 block">
                  {filteredClientTransactions.length}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">{selectedClient}</span>
              </div>

              <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-100">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 block">
                  Total Billed
                </span>
                <span className="text-lg font-bold font-mono text-indigo-950 mt-1 block">
                  {formatCurrency(summary.totalBilled, currency)}
                </span>
                <span className="text-[10px] text-indigo-600 block">
                  Gross statement charges
                </span>
              </div>

              <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 block">
                  Total Paid / Credited
                </span>
                <span className="text-lg font-bold font-mono text-emerald-800 mt-1 block">
                  {formatCurrency(summary.totalPaid, currency)}
                </span>
                <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>
                    {summary.totalBilled > 0
                      ? `${((summary.totalPaid / summary.totalBilled) * 100).toFixed(0)}% settled`
                      : '0% settled'}
                  </span>
                </span>
              </div>

              <div
                className={`p-3.5 rounded-xl border ${
                  summary.totalBalance > 0
                    ? 'bg-rose-50/70 border-rose-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider block ${
                    summary.totalBalance > 0 ? 'text-rose-700' : 'text-slate-500'
                  }`}
                >
                  Total Balance Due
                </span>
                <span
                  className={`text-lg font-bold font-mono mt-1 block ${
                    summary.totalBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {formatCurrency(summary.totalBalance, currency)}
                </span>
                <span
                  className={`text-[10px] flex items-center gap-1 ${
                    summary.totalBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>{summary.totalBalance > 0 ? 'Payable upon receipt' : 'Account fully paid'}</span>
                </span>
              </div>
            </div>

            {/* Live Itemized Preview Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  Statement Preview — {selectedClient}
                </span>
                <span className="text-[11px] text-slate-500">{getScopeLabel()}</span>
              </div>

              {filteredClientTransactions.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No transactions match the selected scope for <strong>{selectedClient}</strong>.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[260px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-900 text-slate-200 sticky top-0 z-10 font-semibold">
                      <tr>
                        <th className="py-2 px-3 whitespace-nowrap">Date</th>
                        <th className="py-2 px-3">Project &amp; Purpose</th>
                        <th className="py-2 px-2.5 text-right whitespace-nowrap">Design</th>
                        <th className="py-2 px-2.5 text-right whitespace-nowrap">Sign &amp; Seal</th>
                        <th className="py-2 px-2.5 text-right whitespace-nowrap">Printing</th>
                        <th className="py-2 px-3 text-right whitespace-nowrap bg-slate-800">Total Bill</th>
                        <th className="py-2 px-2.5 text-right whitespace-nowrap">Paid</th>
                        <th className="py-2 px-3 text-right whitespace-nowrap">Balance</th>
                        <th className="py-2 px-2.5 text-center whitespace-nowrap">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredClientTransactions.map((t) => {
                        const f = computeTotalsFromDisciplineFees(t.disciplineFees);
                        const dAmt = f.hasAnyFee ? f.designTotal : t.bill || 0;
                        const sAmt = f.hasAnyFee ? f.signAndSealTotal : 0;
                        const pAmt = f.hasAnyFee ? f.printingTotal : t.printCost || 0;

                        return (
                          <tr key={t.id} className="hover:bg-slate-50/80">
                            <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                              {formatDate(t.date)}
                            </td>
                            <td className="py-2 px-3 max-w-[240px]">
                              <div className="font-semibold text-slate-900 truncate">
                                {t.projectName}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">{t.purpose}</div>
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-slate-700 whitespace-nowrap">
                              {formatCurrency(dAmt, currency)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-slate-700 whitespace-nowrap">
                              {sAmt > 0 ? formatCurrency(sAmt, currency) : '-'}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-slate-700 whitespace-nowrap">
                              {pAmt > 0 ? formatCurrency(pAmt, currency) : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50/60 whitespace-nowrap">
                              {formatCurrency(t.totalBill, currency)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono text-emerald-700 whitespace-nowrap">
                              {formatCurrency(t.amountPaid, currency)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold whitespace-nowrap">
                              {t.balance > 0 ? (
                                <span className="text-rose-600">
                                  {formatCurrency(t.balance, currency)}
                                </span>
                              ) : (
                                <span className="text-slate-400">0.00</span>
                              )}
                            </td>
                            <td className="py-2 px-2.5 text-center whitespace-nowrap">
                              <span
                                className={`text-[11px] font-medium ${
                                  t.paymentStatus === 'Paid'
                                    ? 'text-emerald-700'
                                    : t.paymentStatus === 'Partially Paid'
                                    ? 'text-amber-700'
                                    : t.paymentStatus === 'Overdue'
                                    ? 'text-rose-700'
                                    : 'text-slate-600'
                                }`}
                              >
                                {t.paymentStatus}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-100 border-t border-slate-300 font-bold text-slate-900">
                      <tr>
                        <td colSpan={2} className="py-2 px-3 uppercase text-[11px] text-slate-600">
                          Statement Totals
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono whitespace-nowrap">
                          {formatCurrency(summary.totalDesign, currency)}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono whitespace-nowrap">
                          {formatCurrency(summary.totalSignSeal, currency)}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono whitespace-nowrap">
                          {formatCurrency(summary.totalPrinting, currency)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-indigo-950 bg-indigo-50/70 whitespace-nowrap">
                          {formatCurrency(summary.totalBilled, currency)}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono text-emerald-700 whitespace-nowrap">
                          {formatCurrency(summary.totalPaid, currency)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-rose-700 whitespace-nowrap">
                          {formatCurrency(summary.totalBalance, currency)}
                        </td>
                        <td className="py-2 px-2.5 text-center text-[10px] text-slate-500">
                          {summary.totalBalance > 0 ? 'DUE' : 'SETTLED'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Optional Discipline Breakdown Preview */}
            {includeDisciplineBreakdown && summary.disciplineBreakdown.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                  Discipline Charges Breakdown (Included on PDF &amp; Excel)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-1.5 px-3">Discipline</th>
                        <th className="py-1.5 px-3 text-right">Design</th>
                        <th className="py-1.5 px-3 text-right">Sign &amp; Seal</th>
                        <th className="py-1.5 px-3 text-right">Printing</th>
                        <th className="py-1.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {summary.disciplineBreakdown.map((d) => (
                        <tr key={d.key}>
                          <td className="py-1.5 px-3 font-medium text-slate-800">
                            {d.label} ({d.shortLabel})
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono text-slate-700">
                            {formatCurrency(d.design, currency)}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono text-slate-700">
                            {formatCurrency(d.signAndSeal, currency)}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono text-slate-700">
                            {formatCurrency(d.printing, currency)}
                          </td>
                          <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                            {formatCurrency(d.subtotal, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500">
            Includes company letterhead, TIN, itemized charges, and signatory block.
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg border border-slate-300 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              disabled={!selectedClient || filteredClientTransactions.length === 0}
              onClick={handleDownloadExcel}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export SOA (Excel)</span>
            </button>
            <button
              type="button"
              disabled={!selectedClient || filteredClientTransactions.length === 0}
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg shadow-sm transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Download SOA (PDF)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
