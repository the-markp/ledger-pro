import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  CreditCard,
  AlertTriangle,
  History,
} from 'lucide-react';
import {
  Transaction,
  PaymentStatus,
  PaymentRecord,
  Currency,
  getNormalizedPayments,
  computePaymentSummary,
} from '../types/transaction';
import { formatCurrency, formatDate } from '../utils/formatters';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  currency: Currency;
  onSavePayment: (updatedTransaction: Transaction) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  transaction,
  currency,
  onSavePayment,
}) => {
  const [newAmount, setNewAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<string>('Bank Transfer');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentRemarks, setPaymentRemarks] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [error, setError] = useState<string>('');

  const payments = useMemo(
    () => getNormalizedPayments(transaction),
    [transaction]
  );

  const totalBill = transaction?.totalBill || 0;
  const totalPaid = useMemo(() => {
    if (payments.length > 0) {
      return Number(payments.reduce((s, p) => s + (Number(p.amount) || 0), 0).toFixed(2));
    }
    return Number(transaction?.amountPaid) || 0;
  }, [payments, transaction]);

  const remainingBalance = Math.max(0, Number((totalBill - totalPaid).toFixed(2)));
  const paidPercent = totalBill > 0 ? Math.min(100, (totalPaid / totalBill) * 100) : 0;

  useEffect(() => {
    if (isOpen && transaction) {
      const rem = Math.max(0, Number((transaction.totalBill - (transaction.amountPaid || 0)).toFixed(2)));
      setNewAmount(rem > 0 ? String(rem) : '');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod(transaction.paymentMethod || 'Bank Transfer');
      setPaymentReference('');
      setPaymentRemarks('');
      setError('');
      setFeedback('');
    }
  }, [isOpen, transaction?.id]);

  if (!isOpen || !transaction) return null;

  const commitPayments = (
    nextPayments: PaymentRecord[],
    overrideStatus?: PaymentStatus,
    successMessage?: string
  ) => {
    const summary = computePaymentSummary(
      transaction.totalBill,
      nextPayments,
      overrideStatus ?? transaction.paymentStatus
    );

    const updated: Transaction = {
      ...transaction,
      payments: nextPayments,
      amountPaid: summary.amountPaid,
      balance: summary.balance,
      paymentStatus: summary.paymentStatus,
      paymentDate: summary.paymentDate,
      paymentMethod: summary.paymentMethod,
      paymentReference: summary.paymentReference,
      updatedAt: new Date().toISOString(),
    };

    onSavePayment(updated);

    const nextRem = updated.balance;
    setNewAmount(nextRem > 0 ? String(nextRem) : '');
    setPaymentReference('');
    setPaymentRemarks('');
    setError('');
    if (successMessage) {
      setFeedback(successMessage);
    }
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(newAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Please enter a payment amount greater than 0.');
      return;
    }

    const cleanAmount = Number(parsed.toFixed(2));
    const entry: PaymentRecord = {
      id: `PAY-${Date.now()}-${payments.length + 1}`,
      amount: cleanAmount,
      date: paymentDate || new Date().toISOString().split('T')[0],
      method: paymentMethod || 'Bank Transfer',
      reference: paymentReference.trim(),
      remarks: paymentRemarks.trim(),
      recordedAt: new Date().toISOString(),
    };

    const nextPayments = [...payments, entry];
    commitPayments(
      nextPayments,
      undefined,
      `Recorded payment of ${formatCurrency(cleanAmount, currency)}.`
    );
  };

  const handleRemovePayment = (paymentId: string) => {
    const nextPayments = payments.filter((p) => p.id !== paymentId);
    commitPayments(
      nextPayments,
      transaction.paymentStatus === 'Overdue' ? 'Overdue' : 'Pending',
      'Payment entry removed and balance recalculated.'
    );
  };

  const handleToggleOverdue = () => {
    if (remainingBalance <= 0) return;
    const nextStatus: PaymentStatus =
      transaction.paymentStatus === 'Overdue'
        ? totalPaid > 0
          ? 'Partially Paid'
          : 'Pending'
        : 'Overdue';

    commitPayments(
      payments,
      nextStatus,
      nextStatus === 'Overdue' ? 'Marked transaction as Overdue.' : 'Cleared Overdue flag.'
    );
  };

  const setQuickFraction = (fraction: number) => {
    if (remainingBalance <= 0) return;
    const amt = Number((remainingBalance * fraction).toFixed(2));
    setNewAmount(String(amt));
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Manage Payments &amp; Partial Installments</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                {transaction.client} · {transaction.projectName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Bill Summary & Progress Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center font-mono">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block uppercase font-sans font-semibold">
                  Total Bill
                </span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                  {formatCurrency(totalBill, currency)}
                </span>
              </div>
              <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200">
                <span className="text-[10px] text-emerald-700 block uppercase font-sans font-semibold">
                  Total Paid ({payments.length})
                </span>
                <span className="text-sm font-bold text-emerald-800 mt-0.5 block">
                  {formatCurrency(totalPaid, currency)}
                </span>
              </div>
              <div
                className={`p-2.5 rounded-lg border ${
                  remainingBalance > 0
                    ? 'bg-rose-50/70 border-rose-200'
                    : 'bg-emerald-50/40 border-emerald-200'
                }`}
              >
                <span
                  className={`text-[10px] block uppercase font-sans font-semibold ${
                    remainingBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  Remaining Balance
                </span>
                <span
                  className={`text-sm font-bold mt-0.5 block ${
                    remainingBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {formatCurrency(remainingBalance, currency)}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-600">
                  Status:{' '}
                  <strong
                    className={
                      transaction.paymentStatus === 'Paid'
                        ? 'text-emerald-700'
                        : transaction.paymentStatus === 'Partially Paid'
                        ? 'text-amber-700'
                        : transaction.paymentStatus === 'Overdue'
                        ? 'text-rose-700'
                        : 'text-slate-700'
                    }
                  >
                    {transaction.paymentStatus}
                  </strong>
                </span>
                <span className="font-mono font-semibold text-slate-700">
                  {paidPercent.toFixed(1)}% Paid
                </span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    paidPercent >= 100
                      ? 'bg-emerald-500'
                      : paidPercent > 0
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                  }`}
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
            </div>

            {remainingBalance > 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleToggleOverdue}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                    transaction.paymentStatus === 'Overdue'
                      ? 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>
                    {transaction.paymentStatus === 'Overdue'
                      ? 'Overdue (Click to Clear)'
                      : 'Mark as Overdue'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {feedback && (
            <div className="px-3.5 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{feedback}</span>
            </div>
          )}

          {/* Recorded Payments History */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <History className="w-3.5 h-3.5 text-indigo-600" />
                <span>Recorded Payments History ({payments.length})</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Each partial payment is tracked individually
              </span>
            </div>

            {payments.length === 0 ? (
              <div className="p-5 text-center text-slate-400 italic">
                No payments recorded yet. Add the first partial or full payment below.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[190px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 w-10">#</th>
                      <th className="py-2 px-3 whitespace-nowrap">Date</th>
                      <th className="py-2 px-3 whitespace-nowrap">Method</th>
                      <th className="py-2 px-3">Ref # / Notes</th>
                      <th className="py-2 px-3 text-right whitespace-nowrap">Amount</th>
                      <th className="py-2 px-2.5 w-10 text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">
                          {formatDate(p.date)}
                        </td>
                        <td className="py-2 px-3 text-slate-700 whitespace-nowrap">{p.method}</td>
                        <td className="py-2 px-3 text-slate-600 max-w-[200px]">
                          {p.reference && (
                            <span className="font-mono font-medium text-slate-800 block truncate">
                              {p.reference}
                            </span>
                          )}
                          {p.remarks && (
                            <span className="text-[10px] text-slate-500 block truncate">
                              {p.remarks}
                            </span>
                          )}
                          {!p.reference && !p.remarks && <span className="text-slate-400">-</span>}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                          {formatCurrency(p.amount, currency)}
                        </td>
                        <td className="py-2 px-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemovePayment(p.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Remove this payment entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add New Partial / Full Payment Form */}
          <form
            onSubmit={handleAddPayment}
            className="border border-indigo-200/80 bg-indigo-50/30 rounded-xl p-4 space-y-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-indigo-100">
              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                <span>Add Payment / Partial Installment</span>
              </span>

              {remainingBalance > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 uppercase font-medium">Quick Fill:</span>
                  <button
                    type="button"
                    onClick={() => setQuickFraction(1)}
                    className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[11px] font-medium transition-colors"
                  >
                    Full Remaining
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickFraction(0.5)}
                    className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[11px] font-medium transition-colors"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickFraction(0.25)}
                    className="px-2 py-0.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded text-[11px] font-medium transition-colors"
                  >
                    25%
                  </button>
                </div>
              )}
            </div>

            {error && (
              <p className="text-xs text-rose-600 font-medium bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5">
                {error}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Payment Amount ({currency}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={newAmount}
                  onChange={(e) => {
                    setNewAmount(e.target.value);
                    setError('');
                  }}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Cash">Cash</option>
                  <option value="Online / E-Wallet">Online / E-Wallet</option>
                  <option value="Wire Transfer">Wire Transfer</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Reference # / Check # / OR #
                </label>
                <input
                  type="text"
                  placeholder="e.g. BDO-REF-99210 or Check #004491"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Installment Note / Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1st downpayment / 2nd progress billing..."
                  value={paymentRemarks}
                  onChange={(e) => setPaymentRemarks(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Payment Entry</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Changes are saved immediately to the ledger and appear on invoices &amp; SOA.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
