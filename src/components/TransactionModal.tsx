import React, { useState, useEffect } from 'react';
import { X, Calculator, Check, AlertCircle } from 'lucide-react';
import { Transaction, PaymentStatus, Currency } from '../types/transaction';
import { formatCurrency } from '../utils/formatters';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  initialTransaction?: Transaction | null;
  currency: Currency;
  existingClients: string[];
  existingProjects: string[];
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTransaction,
  currency,
  existingClients,
  existingProjects,
}) => {
  const [formData, setFormData] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split('T')[0],
    client: '',
    projectName: '',
    ee: '',
    pl: '',
    st: '',
    arch: '',
    ece: '',
    me: '',
    others: '',
    purpose: '',
    bill: 0,
    printCost: 0,
    totalBill: 0,
    paymentStatus: 'Pending',
    amountPaid: 0,
    balance: 0,
    paymentDate: '',
    paymentMethod: 'Bank Transfer',
    paymentReference: '',
    remarks: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialTransaction) {
      setFormData(initialTransaction);
    } else {
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        id: `TRX-${Date.now().toString().slice(-6)}`,
        date: today,
        client: '',
        projectName: '',
        ee: '',
        pl: '',
        st: '',
        arch: '',
        ece: '',
        me: '',
        others: '',
        purpose: '',
        bill: 0,
        printCost: 0,
        totalBill: 0,
        paymentStatus: 'Pending',
        amountPaid: 0,
        balance: 0,
        paymentDate: '',
        paymentMethod: 'Bank Transfer',
        paymentReference: '',
        remarks: '',
      });
    }
    setErrors({});
  }, [initialTransaction, isOpen]);

  // Recalculate Total Bill when bill or printCost changes
  const handleAmountChange = (field: 'bill' | 'printCost', value: number) => {
    const updated = { ...formData, [field]: value };
    const bill = field === 'bill' ? value : (Number(formData.bill) || 0);
    const printCost = field === 'printCost' ? value : (Number(formData.printCost) || 0);
    const total = Number((bill + printCost).toFixed(2));
    
    let amountPaid = Number(formData.amountPaid) || 0;
    if (formData.paymentStatus === 'Paid') {
      amountPaid = total;
    }
    const balance = Number((total - amountPaid).toFixed(2));

    setFormData({
      ...updated,
      totalBill: total,
      amountPaid,
      balance: balance < 0 ? 0 : balance,
    });
  };

  const handleStatusChange = (status: PaymentStatus) => {
    const total = Number(formData.totalBill) || 0;
    let amountPaid = Number(formData.amountPaid) || 0;
    let paymentDate = formData.paymentDate;

    if (status === 'Paid') {
      amountPaid = total;
      if (!paymentDate) {
        paymentDate = new Date().toISOString().split('T')[0];
      }
    } else if (status === 'Pending') {
      amountPaid = 0;
      paymentDate = '';
    }

    const balance = Number((total - amountPaid).toFixed(2));

    setFormData({
      ...formData,
      paymentStatus: status,
      amountPaid,
      paymentDate,
      balance: balance < 0 ? 0 : balance,
    });
  };

  const handleAmountPaidChange = (paid: number) => {
    const total = Number(formData.totalBill) || 0;
    const balance = Number((total - paid).toFixed(2));
    
    let status: PaymentStatus = formData.paymentStatus || 'Pending';
    if (paid >= total && total > 0) {
      status = 'Paid';
    } else if (paid > 0 && paid < total) {
      status = 'Partially Paid';
    } else if (paid === 0) {
      status = 'Pending';
    }

    setFormData({
      ...formData,
      amountPaid: paid,
      balance: balance < 0 ? 0 : balance,
      paymentStatus: status,
    });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.date) errs.date = 'Date is required';
    if (!formData.client?.trim()) errs.client = 'Client name is required';
    if (!formData.projectName?.trim()) errs.projectName = 'Project name is required';
    if (!formData.purpose?.trim()) errs.purpose = 'Purpose is required';
    if ((formData.totalBill || 0) < 0) errs.totalBill = 'Total cannot be negative';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const totalBill = Number(((Number(formData.bill) || 0) + (Number(formData.printCost) || 0)).toFixed(2));
    const amountPaid = Number(formData.amountPaid) || 0;
    const balance = Number((totalBill - amountPaid).toFixed(2));

    const finalTransaction: Transaction = {
      id: formData.id || `TRX-${Date.now().toString().slice(-6)}`,
      date: formData.date || new Date().toISOString().split('T')[0],
      client: formData.client?.trim() || '',
      projectName: formData.projectName?.trim() || '',
      ee: formData.ee?.trim() || '',
      pl: formData.pl?.trim() || '',
      st: formData.st?.trim() || '',
      arch: formData.arch?.trim() || '',
      ece: formData.ece?.trim() || '',
      me: formData.me?.trim() || '',
      others: formData.others?.trim() || '',
      purpose: formData.purpose?.trim() || '',
      bill: Number(formData.bill) || 0,
      printCost: Number(formData.printCost) || 0,
      totalBill,
      paymentStatus: (formData.paymentStatus as PaymentStatus) || 'Pending',
      amountPaid,
      balance: balance < 0 ? 0 : balance,
      paymentDate: formData.paymentDate || undefined,
      paymentMethod: formData.paymentMethod || undefined,
      paymentReference: formData.paymentReference || undefined,
      remarks: formData.remarks?.trim() || '',
      createdAt: initialTransaction?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(finalTransaction);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {initialTransaction ? 'Edit Transaction' : 'Record New Transaction'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter engineering project details, discipline assignments, and billing breakdown.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Section 1: Core Transaction Info */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 pb-1 border-b border-slate-200">
              1. General Information
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Transaction Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={`w-full px-3 py-2 bg-white border ${
                    errors.date ? 'border-rose-400' : 'border-slate-300'
                  } rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                {errors.date && <p className="text-xs text-rose-500 mt-1">{errors.date}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Client Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="client-suggestions"
                  placeholder="e.g. Apex Industrial Corp"
                  value={formData.client || ''}
                  onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                  className={`w-full px-3 py-2 bg-white border ${
                    errors.client ? 'border-rose-400' : 'border-slate-300'
                  } rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                <datalist id="client-suggestions">
                  {existingClients.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                {errors.client && <p className="text-xs text-rose-500 mt-1">{errors.client}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Project Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="project-suggestions"
                  placeholder="e.g. High-Bay Logistics Hub"
                  value={formData.projectName || ''}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  className={`w-full px-3 py-2 bg-white border ${
                    errors.projectName ? 'border-rose-400' : 'border-slate-300'
                  } rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                <datalist id="project-suggestions">
                  {existingProjects.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
                {errors.projectName && <p className="text-xs text-rose-500 mt-1">{errors.projectName}</p>}
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Purpose / Milestone <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Complete MEPFS & Structural Sign-off for Building Permit"
                value={formData.purpose || ''}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className={`w-full px-3 py-2 bg-white border ${
                  errors.purpose ? 'border-rose-400' : 'border-slate-300'
                } rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              {errors.purpose && <p className="text-xs text-rose-500 mt-1">{errors.purpose}</p>}
            </div>
          </div>

          {/* Section 2: Engineering & Architectural Disciplines */}
          <div>
            <div className="flex items-center justify-between mb-3 pb-1 border-b border-slate-200">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                2. Engineering & Design Disciplines
              </div>
              <span className="text-[11px] text-slate-400">
                Assigned engineers, licenses, or scope notes
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  EE <span className="text-slate-400 font-normal">(Electrical)</span>
                </label>
                <input
                  type="text"
                  placeholder="Engr. / Ref"
                  value={formData.ee || ''}
                  onChange={(e) => setFormData({ ...formData, ee: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Pl <span className="text-slate-400 font-normal">(Plumbing)</span>
                </label>
                <input
                  type="text"
                  placeholder="Engr. / Ref"
                  value={formData.pl || ''}
                  onChange={(e) => setFormData({ ...formData, pl: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  St <span className="text-slate-400 font-normal">(Structural)</span>
                </label>
                <input
                  type="text"
                  placeholder="Engr. / Ref"
                  value={formData.st || ''}
                  onChange={(e) => setFormData({ ...formData, st: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Arch <span className="text-slate-400 font-normal">(Architectural)</span>
                </label>
                <input
                  type="text"
                  placeholder="Arch. / Ref"
                  value={formData.arch || ''}
                  onChange={(e) => setFormData({ ...formData, arch: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  ECE <span className="text-slate-400 font-normal">(Electronics)</span>
                </label>
                <input
                  type="text"
                  placeholder="Engr. / Ref"
                  value={formData.ece || ''}
                  onChange={(e) => setFormData({ ...formData, ece: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  ME <span className="text-slate-400 font-normal">(Mechanical)</span>
                </label>
                <input
                  type="text"
                  placeholder="Engr. / Ref"
                  value={formData.me || ''}
                  onChange={(e) => setFormData({ ...formData, me: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                  Others <span className="text-slate-400 font-normal">(Geotech, Fire, Acoustic, etc.)</span>
                </label>
                <input
                  type="text"
                  placeholder="Other specialists or consultants"
                  value={formData.others || ''}
                  onChange={(e) => setFormData({ ...formData, others: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Financials & Bill Computation */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3 pb-1 border-b border-slate-200 flex items-center justify-between">
              <span>3. Billing Computation</span>
              <span className="text-[11px] font-normal text-slate-500">
                Total Bill = Bill + Print Cost
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Bill (Engineering & Design Fee)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.bill === 0 ? '' : formData.bill}
                    onChange={(e) => handleAmountChange('bill', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Print Cost (Blueprints & Repro)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.printCost === 0 ? '' : formData.printCost}
                    onChange={(e) => handleAmountChange('printCost', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-xs">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 block">
                  Total Bill (Auto-Calculated)
                </span>
                <span className="text-xl font-bold font-mono text-indigo-950 mt-1 block">
                  {formatCurrency(formData.totalBill || 0, currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Payment Status & Settlement */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 pb-1 border-b border-slate-200">
              4. Payment Status & Tracking
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Payment Status
                </label>
                <select
                  value={formData.paymentStatus}
                  onChange={(e) => handleStatusChange(e.target.value as PaymentStatus)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Pending">Pending (Unpaid)</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Paid">Paid in Full</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Amount Paid
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amountPaid === 0 ? '' : formData.amountPaid}
                  onChange={(e) => handleAmountPaidChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-[11px] font-medium text-slate-500 block">Outstanding Balance</span>
                <span className={`text-base font-bold font-mono ${
                  (formData.balance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}>
                  {formatCurrency(formData.balance || 0, currency)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={formData.paymentDate || ''}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={formData.paymentMethod || 'Bank Transfer'}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Cash">Cash</option>
                  <option value="Online / E-Wallet">Online / E-Wallet (GCash/Maya)</option>
                  <option value="Wire Transfer">Wire Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reference # / Check #
                </label>
                <input
                  type="text"
                  placeholder="e.g. CHK-10928 / REF-892"
                  value={formData.paymentReference || ''}
                  onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Remarks */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Remarks & Accounting Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Invoiced to client accounting, blueprint sets delivered, 30 days credit term..."
              value={formData.remarks || ''}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{initialTransaction ? 'Save Changes' : 'Record Transaction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
