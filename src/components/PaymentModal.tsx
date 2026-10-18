import React, { useState } from 'react';
import { X, CheckCircle2, DollarSign } from 'lucide-react';
import { Transaction, PaymentStatus, Currency } from '../types/transaction';
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
  if (!isOpen || !transaction) return null;

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    transaction.paymentStatus === 'Pending' ? 'Paid' : transaction.paymentStatus
  );
  const [amountPaid, setAmountPaid] = useState<number>(
    transaction.amountPaid || transaction.totalBill
  );
  const [paymentDate, setPaymentDate] = useState<string>(
    transaction.paymentDate || new Date().toISOString().split('T')[0]
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    transaction.paymentMethod || 'Bank Transfer'
  );
  const [paymentReference, setPaymentReference] = useState<string>(
    transaction.paymentReference || ''
  );
  const [remarks, setRemarks] = useState<string>(transaction.remarks || '');

  const totalBill = transaction.totalBill;
  const balance = Math.max(0, totalBill - (Number(amountPaid) || 0));

  const handleFullPayment = () => {
    setAmountPaid(totalBill);
    setPaymentStatus('Paid');
  };

  const handlePartialPayment = () => {
    const half = Math.round(totalBill / 2);
    setAmountPaid(half);
    setPaymentStatus('Partially Paid');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paidNum = Number(amountPaid) || 0;
    const finalBalance = Math.max(0, totalBill - paidNum);

    let finalStatus: PaymentStatus = paymentStatus;
    if (paidNum >= totalBill && totalBill > 0) {
      finalStatus = 'Paid';
    } else if (paidNum > 0 && paidNum < totalBill) {
      finalStatus = 'Partially Paid';
    } else if (paidNum === 0) {
      finalStatus = 'Pending';
    }

    const updated: Transaction = {
      ...transaction,
      paymentStatus: finalStatus,
      amountPaid: paidNum,
      balance: finalBalance,
      paymentDate,
      paymentMethod,
      paymentReference,
      remarks,
      updatedAt: new Date().toISOString(),
    };

    onSavePayment(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Update Payment Status</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {transaction.client} · {transaction.projectName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Bill summary callout */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-100 rounded-lg text-center font-mono">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">Total Bill</span>
              <span className="text-xs font-bold text-slate-900">{formatCurrency(totalBill, currency)}</span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-600 block uppercase">Paid Amount</span>
              <span className="text-xs font-bold text-emerald-700">{formatCurrency(amountPaid, currency)}</span>
            </div>
            <div>
              <span className="text-[10px] text-rose-600 block uppercase">Remaining</span>
              <span className="text-xs font-bold text-rose-700">{formatCurrency(balance, currency)}</span>
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Quick Fill:</span>
            <button
              type="button"
              onClick={handleFullPayment}
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded text-[11px] font-medium transition-colors"
            >
              100% Full Payment
            </button>
            <button
              type="button"
              onClick={handlePartialPayment}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[11px] font-medium transition-colors"
            >
              50% Partial Payment
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Paid">Paid in Full</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Pending">Pending (Unpaid)</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Amount Paid ({currency})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amountPaid}
                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Check">Check</option>
                <option value="Cash">Cash</option>
                <option value="Online / E-Wallet">Online / E-Wallet</option>
                <option value="Wire Transfer">Wire Transfer</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Check / Reference # / Deposit Slip
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
            <label className="block text-slate-700 font-medium mb-1">Payment Remarks</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Client deposited balance into corporate account..."
              className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium shadow-sm flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
