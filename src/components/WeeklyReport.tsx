import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  ChevronRight, 
  ChevronDown, 
  FileSpreadsheet, 
  FileText, 
  ArrowUpRight, 
  Layers, 
  DollarSign, 
  Printer, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { Transaction, Currency, CompanyProfile } from '../types/transaction';
import { User } from '../types/auth';
import { formatCurrency, formatDate, getWeekDetails } from '../utils/formatters';
import { exportTransactionsToExcel, exportTransactionsToPdf } from '../utils/exportUtils';

interface WeeklyReportProps {
  transactions: Transaction[];
  currency: Currency;
  companyProfile: CompanyProfile;
  currentUser?: User;
  onEditTransaction: (t: Transaction) => void;
  onOpenPaymentModal: (t: Transaction) => void;
}

interface WeekGroup {
  weekKey: string;
  label: string;
  weekNumber: number;
  year: number;
  startDate: string;
  endDate: string;
  transactions: Transaction[];
  totalBill: number;
  totalServiceBill: number;
  totalPrintCost: number;
  totalPaid: number;
  totalBalance: number;
  disciplineCounts: Record<string, number>;
  clientSpending: Record<string, number>;
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({
  transactions,
  currency,
  companyProfile,
  currentUser,
  onEditTransaction,
  onOpenPaymentModal,
}) => {
  // Group transactions by ISO week
  const weekGroups = useMemo(() => {
    const map = new Map<string, WeekGroup>();

    transactions.forEach((t) => {
      const details = getWeekDetails(t.date);
      if (!map.has(details.weekKey)) {
        map.set(details.weekKey, {
          weekKey: details.weekKey,
          label: details.label,
          weekNumber: details.weekNumber,
          year: details.year,
          startDate: details.startDate,
          endDate: details.endDate,
          transactions: [],
          totalBill: 0,
          totalServiceBill: 0,
          totalPrintCost: 0,
          totalPaid: 0,
          totalBalance: 0,
          disciplineCounts: {
            EE: 0,
            Pl: 0,
            St: 0,
            Arch: 0,
            ECE: 0,
            ME: 0,
            Others: 0,
          },
          clientSpending: {},
        });
      }

      const grp = map.get(details.weekKey)!;
      grp.transactions.push(t);
      grp.totalBill += t.totalBill || 0;
      grp.totalServiceBill += t.bill || 0;
      grp.totalPrintCost += t.printCost || 0;
      grp.totalPaid += t.amountPaid || 0;
      grp.totalBalance += t.balance || 0;

      // Track disciplines
      if (t.ee) grp.disciplineCounts.EE += 1;
      if (t.pl) grp.disciplineCounts.Pl += 1;
      if (t.st) grp.disciplineCounts.St += 1;
      if (t.arch) grp.disciplineCounts.Arch += 1;
      if (t.ece) grp.disciplineCounts.ECE += 1;
      if (t.me) grp.disciplineCounts.ME += 1;
      if (t.others) grp.disciplineCounts.Others += 1;

      // Track client spending
      grp.clientSpending[t.client] = (grp.clientSpending[t.client] || 0) + (t.totalBill || 0);
    });

    // Sort weeks descending (latest first)
    return Array.from(map.values()).sort((a, b) => b.weekKey.localeCompare(a.weekKey));
  }, [transactions]);

  // Expanded weeks state (default to first week expanded)
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    if (weekGroups.length > 0) {
      init[weekGroups[0].weekKey] = true;
    }
    return init;
  });

  const toggleWeek = (key: string) => {
    setExpandedWeeks((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    weekGroups.forEach((w) => {
      all[w.weekKey] = true;
    });
    setExpandedWeeks(all);
  };

  const collapseAll = () => {
    setExpandedWeeks({});
  };

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
        <Calendar className="w-10 h-10 mx-auto text-slate-400 mb-3" />
        <h3 className="text-base font-semibold text-slate-800">No Weekly Data Available</h3>
        <p className="text-xs text-slate-500 mt-1">Record transactions to view weekly spending and billing reports.</p>
      </div>
    );
  }

  // Calculate overall grand totals across weeks
  const overallTotalBill = weekGroups.reduce((acc, w) => acc + w.totalBill, 0);
  const overallPrintCost = weekGroups.reduce((acc, w) => acc + w.totalPrintCost, 0);
  const overallPaid = weekGroups.reduce((acc, w) => acc + w.totalPaid, 0);
  const overallBalance = weekGroups.reduce((acc, w) => acc + w.totalBalance, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & Overall Weekly Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Weekly Spending & Billing Reports</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Breakdown by weekly billing cycles, print expenses, engineering discipline demand, and cash flow.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
            >
              Collapse All
            </button>
            <button
              onClick={() => exportTransactionsToExcel(transactions, currency, 'Weekly_Spending_Summary', companyProfile)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export All to Excel</span>
            </button>
            <button
              onClick={() => exportTransactionsToPdf(transactions, currency, 'Weekly Consolidated Billing Report', 'Consolidated Weeks', companyProfile)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-medium transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export All to PDF</span>
            </button>
          </div>
        </div>

        {/* Global KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Cumulative Total Billed
            </span>
            <span className="text-lg font-bold font-mono text-slate-900 mt-1 block">
              {formatCurrency(overallTotalBill, currency)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Across {weekGroups.length} active weeks
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Cumulative Print Costs
            </span>
            <span className="text-lg font-bold font-mono text-slate-800 mt-1 block">
              {formatCurrency(overallPrintCost, currency)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {overallTotalBill > 0 ? `${((overallPrintCost / overallTotalBill) * 100).toFixed(1)}% of total bill` : '0%'}
            </span>
          </div>

          <div className="bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-100">
            <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider block">
              Total Payments Collected
            </span>
            <span className="text-lg font-bold font-mono text-emerald-800 mt-1 block">
              {formatCurrency(overallPaid, currency)}
            </span>
            <span className="text-[10px] text-emerald-600 mt-0.5 block">
              {overallTotalBill > 0 ? `${((overallPaid / overallTotalBill) * 100).toFixed(0)}% collection rate` : '0%'}
            </span>
          </div>

          <div className="bg-rose-50/50 p-3.5 rounded-lg border border-rose-100">
            <span className="text-[11px] font-medium text-rose-700 uppercase tracking-wider block">
              Outstanding Receivables
            </span>
            <span className="text-lg font-bold font-mono text-rose-800 mt-1 block">
              {formatCurrency(overallBalance, currency)}
            </span>
            <span className="text-[10px] text-rose-600 mt-0.5 block">
              Pending client settlement
            </span>
          </div>
        </div>
      </div>

      {/* Week-by-Week Accordion Cards */}
      <div className="space-y-4">
        {weekGroups.map((week) => {
          const isExpanded = !!expandedWeeks[week.weekKey];
          const collectionRate = week.totalBill > 0 ? (week.totalPaid / week.totalBill) * 100 : 0;
          const printRatio = week.totalBill > 0 ? (week.totalPrintCost / week.totalBill) * 100 : 0;

          return (
            <div
              key={week.weekKey}
              className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden transition-all"
            >
              {/* Week Header Row */}
              <div
                onClick={() => toggleWeek(week.weekKey)}
                className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <button className="text-slate-400 hover:text-slate-600 p-1">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-700" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-700" />
                    )}
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{week.label}</span>
                      <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                        {week.transactions.length} transaction{week.transactions.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Span: {formatDate(week.startDate)} to {formatDate(week.endDate)}
                    </div>
                  </div>
                </div>

                {/* Right side weekly financials preview */}
                <div className="flex items-center gap-5 text-xs font-mono ml-7 md:ml-0">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Total Bill</span>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(week.totalBill, currency)}</span>
                  </div>
                  <div className="hidden sm:block">
                    <span className="text-[10px] text-slate-400 block uppercase">Print Cost</span>
                    <span className="text-xs text-slate-700">{formatCurrency(week.totalPrintCost, currency)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 block uppercase">Collected</span>
                    <span className="text-xs font-bold text-emerald-700">{formatCurrency(week.totalPaid, currency)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-600 block uppercase">Balance</span>
                    <span className={`text-xs font-bold ${week.totalBalance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {formatCurrency(week.totalBalance, currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expanded Week Details */}
              {isExpanded && (
                <div className="p-5 space-y-4 bg-slate-50/40">
                  {/* Discipline and Client breakdown pill-free summaries */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Discipline engagement this week */}
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-2">
                        Engineering Disciplines Active This Week
                      </span>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        {Object.entries(week.disciplineCounts).map(([disc, count]) => (
                          <div key={disc} className="p-2 bg-slate-50 rounded border border-slate-200/60">
                            <span className="font-bold text-slate-800 block text-sm">{count}</span>
                            <span className="text-[10px] text-slate-500 uppercase">{disc}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Client billing ranking for this week */}
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 block mb-2">
                        Client Share This Week
                      </span>
                      <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1">
                        {Object.entries(week.clientSpending).map(([client, amount]) => {
                          const pct = week.totalBill > 0 ? (amount / week.totalBill) * 100 : 0;
                          return (
                            <div key={client} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                              <span className="text-slate-800 font-medium truncate max-w-[180px]">{client}</span>
                              <div className="flex items-center gap-2 font-mono">
                                <span className="text-slate-600">{formatCurrency(amount, currency)}</span>
                                <span className="text-[10px] text-slate-400">({pct.toFixed(0)}%)</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Actions for this week */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-medium text-slate-700">
                      Transactions in this billing period ({week.transactions.length})
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => exportTransactionsToExcel(week.transactions, currency, `${week.weekKey}_Report`, companyProfile)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-300 rounded shadow-2xs transition-colors"
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        <span>Export Week (Excel)</span>
                      </button>
                      <button
                        onClick={() => exportTransactionsToPdf(week.transactions, currency, `Weekly Report ${week.label}`, week.label, companyProfile)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-300 rounded shadow-2xs transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Export Week (PDF)</span>
                      </button>
                    </div>
                  </div>

                  {/* Week's Transaction Mini Table */}
                  <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Client & Project</th>
                          <th className="p-2.5">Disciplines</th>
                          <th className="p-2.5">Purpose</th>
                          <th className="p-2.5 text-right">Bill</th>
                          <th className="p-2.5 text-right">Print Cost</th>
                          <th className="p-2.5 text-right">Total Bill</th>
                          <th className="p-2.5 text-center">Status</th>
                          <th className="p-2.5 text-right">Balance</th>
                          <th className="p-2.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {week.transactions.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/70">
                            <td className="p-2.5 whitespace-nowrap font-mono text-slate-700">{formatDate(t.date)}</td>
                            <td className="p-2.5 max-w-[180px]">
                              <div className="font-semibold text-slate-900 truncate">{t.client}</div>
                              <div className="text-[11px] text-slate-500 truncate">{t.projectName}</div>
                            </td>
                            <td className="p-2.5 text-[11px] text-slate-600 max-w-[180px] truncate">
                              {[
                                t.ee ? `EE: ${t.ee}` : null,
                                t.pl ? `Pl: ${t.pl}` : null,
                                t.st ? `St: ${t.st}` : null,
                                t.arch ? `Arch: ${t.arch}` : null,
                                t.ece ? `ECE: ${t.ece}` : null,
                                t.me ? `ME: ${t.me}` : null,
                                t.others ? `Oth: ${t.others}` : null,
                              ].filter(Boolean).join(' · ') || '-'}
                            </td>
                            <td className="p-2.5 max-w-[180px] text-slate-700 truncate">{t.purpose}</td>
                            <td className="p-2.5 text-right font-mono text-slate-700">{formatCurrency(t.bill, currency)}</td>
                            <td className="p-2.5 text-right font-mono text-slate-600">{formatCurrency(t.printCost, currency)}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatCurrency(t.totalBill, currency)}</td>
                            <td className="p-2.5 text-center">
                              <span className={`inline-block text-[11px] font-medium ${
                                t.paymentStatus === 'Paid'
                                  ? 'text-emerald-700'
                                  : t.paymentStatus === 'Partially Paid'
                                  ? 'text-amber-700'
                                  : t.paymentStatus === 'Overdue'
                                  ? 'text-rose-700'
                                  : 'text-slate-600'
                              }`}>
                                {t.paymentStatus}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-800">
                              {t.balance > 0 ? (
                                <span className="text-rose-600 font-medium">{formatCurrency(t.balance, currency)}</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              {currentUser?.role !== 'viewer' ? (
                                <button
                                  onClick={() => onOpenPaymentModal(t)}
                                  className="px-2 py-0.5 text-[11px] text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
                                >
                                  Payment
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[10px]">Read-only</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
