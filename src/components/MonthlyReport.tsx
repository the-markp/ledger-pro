import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  FileSpreadsheet, 
  FileText, 
  DollarSign, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  TrendingUp, 
  PieChart 
} from 'lucide-react';
import { Transaction, Currency, CompanyProfile } from '../types/transaction';
import { User } from '../types/auth';
import { formatCurrency, formatDate, getMonthDetails } from '../utils/formatters';
import { exportTransactionsToExcel, exportTransactionsToPdf } from '../utils/exportUtils';

interface MonthlyReportProps {
  transactions: Transaction[];
  currency: Currency;
  companyProfile: CompanyProfile;
  currentUser?: User;
  onEditTransaction: (t: Transaction) => void;
  onOpenPaymentModal: (t: Transaction) => void;
}

interface MonthGroup {
  monthKey: string;
  label: string;
  year: number;
  month: number;
  transactions: Transaction[];
  totalBill: number;
  totalServiceBill: number;
  totalPrintCost: number;
  totalPaid: number;
  totalBalance: number;
  clientBreakdown: Record<string, { total: number; bill: number; printCost: number; count: number }>;
  disciplineBreakdown: Record<string, number>;
}

export const MonthlyReport: React.FC<MonthlyReportProps> = ({
  transactions,
  currency,
  companyProfile,
  onEditTransaction,
  onOpenPaymentModal,
}) => {
  // Aggregate by Month
  const monthGroups = useMemo(() => {
    const map = new Map<string, MonthGroup>();

    transactions.forEach((t) => {
      const details = getMonthDetails(t.date);
      if (!map.has(details.monthKey)) {
        map.set(details.monthKey, {
          monthKey: details.monthKey,
          label: details.label,
          year: details.year,
          month: details.month,
          transactions: [],
          totalBill: 0,
          totalServiceBill: 0,
          totalPrintCost: 0,
          totalPaid: 0,
          totalBalance: 0,
          clientBreakdown: {},
          disciplineBreakdown: {
            EE: 0,
            Pl: 0,
            St: 0,
            Arch: 0,
            ECE: 0,
            ME: 0,
            Others: 0,
          },
        });
      }

      const grp = map.get(details.monthKey)!;
      grp.transactions.push(t);
      grp.totalBill += t.totalBill || 0;
      grp.totalServiceBill += t.bill || 0;
      grp.totalPrintCost += t.printCost || 0;
      grp.totalPaid += t.amountPaid || 0;
      grp.totalBalance += t.balance || 0;

      // Client tracking
      if (!grp.clientBreakdown[t.client]) {
        grp.clientBreakdown[t.client] = { total: 0, bill: 0, printCost: 0, count: 0 };
      }
      grp.clientBreakdown[t.client].total += t.totalBill || 0;
      grp.clientBreakdown[t.client].bill += t.bill || 0;
      grp.clientBreakdown[t.client].printCost += t.printCost || 0;
      grp.clientBreakdown[t.client].count += 1;

      // Disciplines
      if (t.ee) grp.disciplineBreakdown.EE += 1;
      if (t.pl) grp.disciplineBreakdown.Pl += 1;
      if (t.st) grp.disciplineBreakdown.St += 1;
      if (t.arch) grp.disciplineBreakdown.Arch += 1;
      if (t.ece) grp.disciplineBreakdown.ECE += 1;
      if (t.me) grp.disciplineBreakdown.ME += 1;
      if (t.others) grp.disciplineBreakdown.Others += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [transactions]);

  // Selected active month (default to latest)
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    return monthGroups.length > 0 ? monthGroups[0].monthKey : '';
  });

  // Ensure valid selection
  const currentMonthData = useMemo(() => {
    return monthGroups.find((m) => m.monthKey === selectedMonthKey) || monthGroups[0] || null;
  }, [monthGroups, selectedMonthKey]);

  if (!currentMonthData) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
        <Layers className="w-10 h-10 mx-auto text-slate-400 mb-3" />
        <h3 className="text-base font-semibold text-slate-800">No Monthly Data Available</h3>
        <p className="text-xs text-slate-500 mt-1">Record transactions to view monthly financial reports.</p>
      </div>
    );
  }

  const collectionRate = currentMonthData.totalBill > 0
    ? (currentMonthData.totalPaid / currentMonthData.totalBill) * 100
    : 0;

  const printRatio = currentMonthData.totalBill > 0
    ? (currentMonthData.totalPrintCost / currentMonthData.totalBill) * 100
    : 0;

  // Sorted clients by total billed
  const topClients = Object.entries(currentMonthData.clientBreakdown)
    .sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="space-y-6">
      {/* Month Selection Bar & Export Actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600" />
              <span>Monthly Spending & Billing Reports</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive statement of service billings, blueprint print expenditures, and receivable collection.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Month Dropdown */}
            <select
              value={currentMonthData.monthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {monthGroups.map((m) => (
                <option key={m.monthKey} value={m.monthKey}>
                  {m.label} ({m.transactions.length} records)
                </option>
              ))}
            </select>

            <button
              onClick={() => exportTransactionsToExcel(currentMonthData.transactions, currency, `Monthly_Report_${currentMonthData.monthKey}`, companyProfile)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Month (Excel)</span>
            </button>

            <button
              onClick={() => exportTransactionsToPdf(currentMonthData.transactions, currency, `Monthly Financial Report - ${currentMonthData.label}`, currentMonthData.label, companyProfile)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-medium transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export Month (PDF)</span>
            </button>
          </div>
        </div>

        {/* Financial KPI Dashboard Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-5 mt-4 border-t border-slate-100">
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Total Services Bill
            </span>
            <span className="text-base font-bold font-mono text-slate-900 mt-1 block">
              {formatCurrency(currentMonthData.totalServiceBill, currency)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Professional fees
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
              Blueprint & Print Cost
            </span>
            <span className="text-base font-bold font-mono text-slate-800 mt-1 block">
              {formatCurrency(currentMonthData.totalPrintCost, currency)}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {printRatio.toFixed(1)}% of total bill
            </span>
          </div>

          <div className="bg-indigo-50/50 p-3.5 rounded-lg border border-indigo-100">
            <span className="text-[11px] font-medium text-indigo-700 uppercase tracking-wider block">
              Grand Total Billed
            </span>
            <span className="text-base font-bold font-mono text-indigo-950 mt-1 block">
              {formatCurrency(currentMonthData.totalBill, currency)}
            </span>
            <span className="text-[10px] text-indigo-600 mt-0.5 block">
              {currentMonthData.transactions.length} projects / milestones
            </span>
          </div>

          <div className="bg-emerald-50/50 p-3.5 rounded-lg border border-emerald-100">
            <span className="text-[11px] font-medium text-emerald-700 uppercase tracking-wider block">
              Payments Collected
            </span>
            <span className="text-base font-bold font-mono text-emerald-800 mt-1 block">
              {formatCurrency(currentMonthData.totalPaid, currency)}
            </span>
            <span className="text-[10px] text-emerald-600 mt-0.5 block">
              {collectionRate.toFixed(0)}% collection efficiency
            </span>
          </div>

          <div className="bg-rose-50/50 p-3.5 rounded-lg border border-rose-100">
            <span className="text-[11px] font-medium text-rose-700 uppercase tracking-wider block">
              Outstanding Balance
            </span>
            <span className="text-base font-bold font-mono text-rose-800 mt-1 block">
              {formatCurrency(currentMonthData.totalBalance, currency)}
            </span>
            <span className="text-[10px] text-rose-600 mt-0.5 block">
              Unsettled accounts
            </span>
          </div>
        </div>
      </div>

      {/* Breakdowns: Client Spending Table + Engineering Disciplines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Spending Leaderboard */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Client Spending & Billing Breakdown ({currentMonthData.label})
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Itemized service fees, printing charges, and contribution share.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {topClients.length} active client{topClients.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Client Organization</th>
                  <th className="p-2.5 text-center">Projects</th>
                  <th className="p-2.5 text-right">Service Bill</th>
                  <th className="p-2.5 text-right">Print Cost</th>
                  <th className="p-2.5 text-right">Total Bill</th>
                  <th className="p-2.5 text-right">Share (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {topClients.map(([clientName, data]) => {
                  const share = currentMonthData.totalBill > 0
                    ? (data.total / currentMonthData.totalBill) * 100
                    : 0;

                  return (
                    <tr key={clientName} className="hover:bg-slate-50/70">
                      <td className="p-2.5 font-medium text-slate-900">{clientName}</td>
                      <td className="p-2.5 text-center font-mono text-slate-600">{data.count}</td>
                      <td className="p-2.5 text-right font-mono text-slate-700">{formatCurrency(data.bill, currency)}</td>
                      <td className="p-2.5 text-right font-mono text-slate-600">{formatCurrency(data.printCost, currency)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-slate-900">{formatCurrency(data.total, currency)}</td>
                      <td className="p-2.5 text-right font-mono text-slate-500">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(100, share)}%` }} />
                          </div>
                          <span>{share.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Engineering Disciplines Engagement in Month */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Discipline Involvement
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Number of projects involving each discipline this month.
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                { key: 'EE', name: 'Electrical Engineering', count: currentMonthData.disciplineBreakdown.EE },
                { key: 'Pl', name: 'Plumbing Engineering', count: currentMonthData.disciplineBreakdown.Pl },
                { key: 'St', name: 'Structural Engineering', count: currentMonthData.disciplineBreakdown.St },
                { key: 'Arch', name: 'Architectural Design', count: currentMonthData.disciplineBreakdown.Arch },
                { key: 'ECE', name: 'Electronics & Comms', count: currentMonthData.disciplineBreakdown.ECE },
                { key: 'ME', name: 'Mechanical Engineering', count: currentMonthData.disciplineBreakdown.ME },
                { key: 'Others', name: 'Other Specialists', count: currentMonthData.disciplineBreakdown.Others },
              ].map((item) => {
                const totalProj = currentMonthData.transactions.length || 1;
                const pct = (item.count / totalProj) * 100;

                return (
                  <div key={item.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-medium">{item.key} ({item.name})</span>
                      <span className="font-mono text-slate-900 font-bold">{item.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-600 h-full rounded-full"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Expense Split:</span> Service fees represent{' '}
            <span className="font-mono font-medium text-slate-900">
              {(100 - printRatio).toFixed(1)}%
            </span>{' '}
            and Print costs represent{' '}
            <span className="font-mono font-medium text-slate-900">{printRatio.toFixed(1)}%</span>.
          </div>
        </div>
      </div>

      {/* Month Transactions Detailed Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Transactions Recorded in {currentMonthData.label} ({currentMonthData.transactions.length})
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click 'Payment' to update receipt details or edit record.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-slate-200 font-semibold">
              <tr>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Client</th>
                <th className="p-2.5">Project Name</th>
                <th className="p-2.5">Disciplines</th>
                <th className="p-2.5">Purpose</th>
                <th className="p-2.5 text-right">Bill</th>
                <th className="p-2.5 text-right">Print Cost</th>
                <th className="p-2.5 text-right bg-slate-800">Total Bill</th>
                <th className="p-2.5 text-center">Payment Status</th>
                <th className="p-2.5 text-right">Amount Paid</th>
                <th className="p-2.5 text-right">Balance</th>
                <th className="p-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {currentMonthData.transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70">
                  <td className="p-2.5 whitespace-nowrap font-mono text-slate-700">{formatDate(t.date)}</td>
                  <td className="p-2.5 font-medium text-slate-900 whitespace-nowrap">{t.client}</td>
                  <td className="p-2.5 text-slate-800 max-w-[160px] truncate">{t.projectName}</td>
                  <td className="p-2.5 text-[11px] text-slate-600 max-w-[160px] truncate">
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
                  <td className="p-2.5 max-w-[160px] text-slate-700 truncate">{t.purpose}</td>
                  <td className="p-2.5 text-right font-mono text-slate-700">{formatCurrency(t.bill, currency)}</td>
                  <td className="p-2.5 text-right font-mono text-slate-600">{formatCurrency(t.printCost, currency)}</td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900 bg-slate-50/50">{formatCurrency(t.totalBill, currency)}</td>
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
                  <td className="p-2.5 text-right font-mono text-emerald-700">{formatCurrency(t.amountPaid, currency)}</td>
                  <td className="p-2.5 text-right font-mono">
                    {t.balance > 0 ? (
                      <span className="text-rose-600 font-medium">{formatCurrency(t.balance, currency)}</span>
                    ) : (
                      <span className="text-slate-400 font-normal">0.00</span>
                    )}
                  </td>
                  <td className="p-2.5 text-center">
                    <button
                      onClick={() => onOpenPaymentModal(t)}
                      className="px-2 py-0.5 text-[11px] text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
