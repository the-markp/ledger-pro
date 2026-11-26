import React, { useMemo } from 'react';
import {
  Printer,
  Layers,
  DollarSign,
  CheckCircle2,
  Clock,
  Receipt,
} from 'lucide-react';
import {
  Transaction,
  Currency,
  DISCIPLINES,
  DisciplineKey,
  getDisciplineFee,
  getDisciplineSubtotal,
  hasDisciplineActivity,
} from '../types/transaction';
import { formatCurrency } from '../utils/formatters';

interface AnalyticsViewProps {
  transactions: Transaction[];
  currency: Currency;
  onOpenClientStatement?: (clientName: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  transactions,
  currency,
  onOpenClientStatement,
}) => {
  const stats = useMemo(() => {
    let totalBill = 0;
    let serviceBill = 0;
    let printCost = 0;
    let paidAmount = 0;
    let balanceAmount = 0;

    const disciplineMetrics: Record<
      DisciplineKey,
      { count: number; design: number; signAndSeal: number; printing: number; total: number }
    > = {
      ee: { count: 0, design: 0, signAndSeal: 0, printing: 0, total: 0 },
      pl: { count: 0, design: 0, signAndSeal: 0, printing: 0, total: 0 },
      st: { count: 0, design: 0, signAndSeal: 0, printing: 0, total: 0 },
      arch: { count: 0, design: 0, signAndSeal: 0, printing: 0, total: 0 },
      ece: { count: 0, design: 0, signAndSeal: 0, printing: 0, total: 0 },
      me: { count: 0, design: 0, signAndSeal: 0, printing: 0, total: 0 },
      solarElectrical: { count: 0, design: 0, signAndSeal: 0, printing: 0, total: 0 },
      others: { count: 0, design: 0, signAndSeal: 0, printing: 0, total: 0 },
    };

    const statusCounts = {
      Paid: 0,
      'Partially Paid': 0,
      Pending: 0,
      Overdue: 0,
    };

    const clientTotals: Record<string, { total: number; balance: number }> = {};

    transactions.forEach((t) => {
      totalBill += t.totalBill || 0;
      serviceBill += t.bill || 0;
      printCost += t.printCost || 0;
      paidAmount += t.amountPaid || 0;
      balanceAmount += t.balance || 0;

      DISCIPLINES.forEach((d) => {
        if (hasDisciplineActivity(t, d.key)) {
          disciplineMetrics[d.key].count += 1;
        }
        const fee = getDisciplineFee(t, d.key);
        const sub = getDisciplineSubtotal(fee);
        disciplineMetrics[d.key].design += fee.design;
        disciplineMetrics[d.key].signAndSeal += fee.signAndSeal;
        disciplineMetrics[d.key].printing += fee.printing;
        disciplineMetrics[d.key].total += sub;
      });

      if (t.paymentStatus in statusCounts) {
        statusCounts[t.paymentStatus as keyof typeof statusCounts] += 1;
      }

      if (!clientTotals[t.client]) {
        clientTotals[t.client] = { total: 0, balance: 0 };
      }
      clientTotals[t.client].total += t.totalBill || 0;
      clientTotals[t.client].balance += t.balance || 0;
    });

    const topClients = Object.entries(clientTotals)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 6);

    return {
      totalBill,
      serviceBill,
      printCost,
      paidAmount,
      balanceAmount,
      disciplineMetrics,
      statusCounts,
      topClients,
    };
  }, [transactions]);

  const collectionRate = stats.totalBill > 0 ? (stats.paidAmount / stats.totalBill) * 100 : 0;
  const printRatio = stats.totalBill > 0 ? (stats.printCost / stats.totalBill) * 100 : 0;
  const maxDiscCount = Math.max(
    ...DISCIPLINES.map((d) => stats.disciplineMetrics[d.key].count),
    1
  );

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
            <span className="text-xs font-semibold uppercase tracking-wider">Reproduction &amp; Prints</span>
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
            {stats.statusCounts.Pending + stats.statusCounts.Overdue + stats.statusCounts['Partially Paid']} unpaid / partial accounts
          </span>
        </div>
      </div>

      {/* Grid: Discipline Frequency + Payment Status Ratio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Engineering Disciplines Engagement & Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="pb-3 mb-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Discipline Engagement &amp; Fee Breakdown
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Projects and itemized Design / Installation, Sign &amp; Seal, and Printing totals per discipline
              </p>
            </div>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3.5">
            {DISCIPLINES.map((d) => {
              const m = stats.disciplineMetrics[d.key];
              const pct = (m.count / maxDiscCount) * 100;

              return (
                <div key={d.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-semibold text-slate-800 truncate">
                      {d.shortLabel} · <span className="font-normal text-slate-500">{d.label}</span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0 font-mono">
                      {m.total > 0 && (
                        <span className="text-[11px] text-indigo-700 font-semibold">
                          {formatCurrency(m.total, currency)}
                        </span>
                      )}
                      <span className="font-bold text-slate-900">
                        {m.count} project{m.count === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`${d.colorClass} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {m.total > 0 && (
                    <div className="flex flex-wrap gap-x-3 text-[10px] font-mono text-slate-500">
                      <span>Design / Installation: {formatCurrency(m.design, currency)}</span>
                      <span>Sign &amp; Seal: {formatCurrency(m.signAndSeal, currency)}</span>
                      <span>Printing: {formatCurrency(m.printing, currency)}</span>
                    </div>
                  )}
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
                <span className="text-lg font-bold font-mono text-emerald-900 mt-1 block">
                  {stats.statusCounts.Paid}
                </span>
                <span className="text-[10px] text-emerald-600">Settled without balance</span>
              </div>

              <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                <span className="text-[11px] font-medium text-amber-800 block">Partially Paid</span>
                <span className="text-lg font-bold font-mono text-amber-900 mt-1 block">
                  {stats.statusCounts['Partially Paid']}
                </span>
                <span className="text-[10px] text-amber-600">Progress deposits received</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] font-medium text-slate-700 block">Pending (Unpaid)</span>
                <span className="text-lg font-bold font-mono text-slate-900 mt-1 block">
                  {stats.statusCounts.Pending}
                </span>
                <span className="text-[10px] text-slate-500">Awaiting processing</span>
              </div>

              <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100">
                <span className="text-[11px] font-medium text-rose-800 block">Overdue</span>
                <span className="text-lg font-bold font-mono text-rose-900 mt-1 block">
                  {stats.statusCounts.Overdue}
                </span>
                <span className="text-[10px] text-rose-600">Past agreed payment term</span>
              </div>
            </div>
          </div>

          {/* Top Clients by Revenue with Quick SOA Action */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="pb-3 mb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Top Client Billing Portfolio
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Generate a Statement of Account directly for any client below
              </p>
            </div>

            {stats.topClients.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">No client records yet.</p>
            ) : (
              <div className="space-y-2">
                {stats.topClients.map(([client, info], index) => {
                  const share = stats.totalBill > 0 ? (info.total / stats.totalBill) * 100 : 0;
                  return (
                    <div
                      key={client}
                      className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-slate-100 last:border-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-slate-400 text-[11px]">{index + 1}.</span>
                        <div className="truncate">
                          <span className="font-semibold text-slate-800 block truncate">{client}</span>
                          {info.balance > 0 && (
                            <span className="text-[10px] font-mono text-rose-600">
                              Bal: {formatCurrency(info.balance, currency)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right font-mono">
                          <span className="text-slate-900 font-bold block">
                            {formatCurrency(info.total, currency)}
                          </span>
                          <span className="text-[10px] text-slate-400">{share.toFixed(0)}%</span>
                        </div>
                        {onOpenClientStatement && (
                          <button
                            onClick={() => onOpenClientStatement(client)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition-colors"
                            title={`Generate Statement of Account for ${client}`}
                          >
                            <Receipt className="w-3 h-3" />
                            <span>SOA</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
