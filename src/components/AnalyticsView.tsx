import React, { useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Printer, 
  Layers, 
  DollarSign, 
  Users, 
  PieChart, 
  CheckCircle2, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';
import { Transaction, Currency } from '../types/transaction';
import { formatCurrency } from '../utils/formatters';

interface AnalyticsViewProps {
  transactions: Transaction[];
  currency: Currency;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ transactions, currency }) => {
  const stats = useMemo(() => {
    let totalBill = 0;
    let serviceBill = 0;
    let printCost = 0;
    let paidAmount = 0;
    let balanceAmount = 0;

    const disciplineCounts: Record<string, number> = {
      EE: 0,
      Pl: 0,
      St: 0,
      Arch: 0,
      ECE: 0,
      ME: 0,
      Others: 0,
    };

    const statusCounts = {
      Paid: 0,
      'Partially Paid': 0,
      Pending: 0,
      Overdue: 0,
    };

    const clientTotals: Record<string, number> = {};

    transactions.forEach((t) => {
      totalBill += t.totalBill || 0;
      serviceBill += t.bill || 0;
      printCost += t.printCost || 0;
      paidAmount += t.amountPaid || 0;
      balanceAmount += t.balance || 0;

      if (t.ee) disciplineCounts.EE += 1;
      if (t.pl) disciplineCounts.Pl += 1;
      if (t.st) disciplineCounts.St += 1;
      if (t.arch) disciplineCounts.Arch += 1;
      if (t.ece) disciplineCounts.ECE += 1;
      if (t.me) disciplineCounts.ME += 1;
      if (t.others) disciplineCounts.Others += 1;

      if (t.paymentStatus in statusCounts) {
        statusCounts[t.paymentStatus as keyof typeof statusCounts] += 1;
      }

      clientTotals[t.client] = (clientTotals[t.client] || 0) + (t.totalBill || 0);
    });

    const topClients = Object.entries(clientTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalBill,
      serviceBill,
      printCost,
      paidAmount,
      balanceAmount,
      disciplineCounts,
      statusCounts,
      topClients,
    };
  }, [transactions]);

  const collectionRate = stats.totalBill > 0 ? (stats.paidAmount / stats.totalBill) * 100 : 0;
  const printRatio = stats.totalBill > 0 ? (stats.printCost / stats.totalBill) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Total Billed</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="text-xl font-bold font-mono text-slate-900 block">
            {formatCurrency(stats.totalBill, currency)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            {transactions.length} total transactions recorded
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Reproduction & Prints</span>
            <Printer className="w-4 h-4 text-sky-600" />
          </div>
          <span className="text-xl font-bold font-mono text-slate-800 block">
            {formatCurrency(stats.printCost, currency)}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            {printRatio.toFixed(1)}% of all project billings
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cash Collected</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xl font-bold font-mono text-emerald-700 block">
            {formatCurrency(stats.paidAmount, currency)}
          </span>
          <span className="text-xs text-emerald-600 mt-1 block font-medium">
            {collectionRate.toFixed(1)}% Collection Efficiency
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Uncollected Balance</span>
            <Clock className="w-4 h-4 text-rose-600" />
          </div>
          <span className="text-xl font-bold font-mono text-rose-700 block">
            {formatCurrency(stats.balanceAmount, currency)}
          </span>
          <span className="text-xs text-rose-600 mt-1 block">
            {stats.statusCounts.Pending + stats.statusCounts.Overdue} unpaid / partial accounts
          </span>
        </div>
      </div>

      {/* Grid: Discipline Frequency + Payment Status Ratio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Engineering Disciplines Engagement */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="pb-3 mb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Discipline Engagement Frequency
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Number of projects with assigned engineers / specialists
              </p>
            </div>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3">
            {[
              { code: 'EE', title: 'Electrical Engineering', count: stats.disciplineCounts.EE, color: 'bg-indigo-600' },
              { code: 'Pl', title: 'Plumbing Engineering', count: stats.disciplineCounts.Pl, color: 'bg-blue-600' },
              { code: 'St', title: 'Structural Engineering', count: stats.disciplineCounts.St, color: 'bg-emerald-600' },
              { code: 'Arch', title: 'Architectural Design', count: stats.disciplineCounts.Arch, color: 'bg-purple-600' },
              { code: 'ECE', title: 'Electronics & Comms', count: stats.disciplineCounts.ECE, color: 'bg-amber-600' },
              { code: 'ME', title: 'Mechanical Engineering', count: stats.disciplineCounts.ME, color: 'bg-sky-600' },
              { code: 'Others', title: 'Other Specialists', count: stats.disciplineCounts.Others, color: 'bg-slate-600' },
            ].map((d) => {
              const maxCount = Math.max(...Object.values(stats.disciplineCounts), 1);
              const pct = (d.count / maxCount) * 100;

              return (
                <div key={d.code} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{d.code} · <span className="font-normal text-slate-500">{d.title}</span></span>
                    <span className="font-mono font-bold text-slate-900">{d.count} project{d.count === 1 ? '' : 's'}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className={`${d.color} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Status Breakdown & Top Clients */}
        <div className="space-y-6">
          {/* Payment Status Distribution */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Payment Status Breakdown
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Current transaction settlement distribution
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                <span className="text-[11px] font-medium text-emerald-800 block">Paid in Full</span>
                <span className="text-lg font-bold font-mono text-emerald-900 mt-1 block">{stats.statusCounts.Paid}</span>
                <span className="text-[10px] text-emerald-600">Settled without balance</span>
              </div>

              <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                <span className="text-[11px] font-medium text-amber-800 block">Partially Paid</span>
                <span className="text-lg font-bold font-mono text-amber-900 mt-1 block">{stats.statusCounts['Partially Paid']}</span>
                <span className="text-[10px] text-amber-600">Progress deposits received</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] font-medium text-slate-700 block">Pending (Unpaid)</span>
                <span className="text-lg font-bold font-mono text-slate-900 mt-1 block">{stats.statusCounts.Pending}</span>
                <span className="text-[10px] text-slate-500">Awaiting processing</span>
              </div>

              <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100">
                <span className="text-[11px] font-medium text-rose-800 block">Overdue</span>
                <span className="text-lg font-bold font-mono text-rose-900 mt-1 block">{stats.statusCounts.Overdue}</span>
                <span className="text-[10px] text-rose-600">Past agreed payment term</span>
              </div>
            </div>
          </div>

          {/* Top Clients by Revenue */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Top Client Billing Portfolio
              </h3>
            </div>

            <div className="space-y-2">
              {stats.topClients.map(([client, total], index) => {
                const share = stats.totalBill > 0 ? (total / stats.totalBill) * 100 : 0;
                return (
                  <div key={client} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 text-[11px]">{index + 1}.</span>
                      <span className="font-semibold text-slate-800">{client}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-900 font-bold">{formatCurrency(total, currency)}</span>
                      <span className="text-[10px] text-slate-400">({share.toFixed(0)}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
