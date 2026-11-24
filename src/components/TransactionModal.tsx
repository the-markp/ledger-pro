import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Calculator, Sun } from 'lucide-react';
import {
  Transaction,
  PaymentStatus,
  Currency,
  DISCIPLINES,
  DisciplineKey,
  DisciplineFeeBreakdown,
  DisciplineFeesMap,
  getDisciplineFee,
  getDisciplineSubtotal,
  computeTotalsFromDisciplineFees,
} from '../types/transaction';
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
    solarElectrical: '',
    others: '',
    disciplineFees: {},
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
      setFormData({
        ...initialTransaction,
        solarElectrical: initialTransaction.solarElectrical || '',
        disciplineFees: initialTransaction.disciplineFees ? { ...initialTransaction.disciplineFees } : {},
      });
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
        solarElectrical: '',
        others: '',
        disciplineFees: {},
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

  const feeTotals = useMemo(
    () => computeTotalsFromDisciplineFees(formData.disciplineFees),
    [formData.disciplineFees]
  );

  // Update a discipline's text note (assignee / ref)
  const handleDisciplineNoteChange = (key: DisciplineKey, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Update one of the three sub-fields (design, signAndSeal, printing) for a discipline
  const handleDisciplineFeeChange = (
    key: DisciplineKey,
    subField: keyof DisciplineFeeBreakdown,
    rawValue: string
  ) => {
    const parsed = parseFloat(rawValue);
    const safeVal = !isNaN(parsed) && parsed >= 0 ? Number(parsed.toFixed(2)) : 0;

    setFormData((prev) => {
      const existingMap: DisciplineFeesMap = { ...(prev.disciplineFees || {}) };
      const currentEntry = getDisciplineFee(prev, key);
      const nextEntry: DisciplineFeeBreakdown = {
        ...currentEntry,
        [subField]: safeVal,
      };

      if (nextEntry.design === 0 && nextEntry.signAndSeal === 0 && nextEntry.printing === 0) {
        delete existingMap[key];
      } else {
        existingMap[key] = nextEntry;
      }

      const totals = computeTotalsFromDisciplineFees(existingMap);
      const nextBill = totals.hasAnyFee ? totals.serviceBill : 0;
      const nextPrintCost = totals.hasAnyFee ? totals.printingTotal : 0;
      const nextTotal = Number((nextBill + nextPrintCost).toFixed(2));

      let amountPaid = Number(prev.amountPaid) || 0;
      if (prev.paymentStatus === 'Paid') {
        amountPaid = nextTotal;
      }
      const nextBalance = Math.max(0, Number((nextTotal - amountPaid).toFixed(2)));

      return {
        ...prev,
        disciplineFees: existingMap,
        bill: nextBill,
        printCost: nextPrintCost,
        totalBill: nextTotal,
        amountPaid,
        balance: nextBalance,
      };
    });
  };

  // Recalculate Total Bill when manual bill or printCost changes (used when no discipline sub-fields are set)
  const handleAmountChange = (field: 'bill' | 'printCost', value: number) => {
    const safeVal = !isNaN(value) && value >= 0 ? Number(value.toFixed(2)) : 0;
    const updated = { ...formData, [field]: safeVal };
    const bill = field === 'bill' ? safeVal : (Number(formData.bill) || 0);
    const printCost = field === 'printCost' ? safeVal : (Number(formData.printCost) || 0);
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
    const safePaid = !isNaN(paid) && paid >= 0 ? Number(paid.toFixed(2)) : 0;
    const total = Number(formData.totalBill) || 0;
    const balance = Number((total - safePaid).toFixed(2));

    let status: PaymentStatus = formData.paymentStatus || 'Pending';
    if (safePaid >= total && total > 0) {
      status = 'Paid';
    } else if (safePaid > 0 && safePaid < total) {
      status = 'Partially Paid';
    } else if (safePaid === 0) {
      status = 'Pending';
    }

    setFormData({
      ...formData,
      amountPaid: safePaid,
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

    const cleanFees: DisciplineFeesMap = {};
    if (formData.disciplineFees) {
      for (const d of DISCIPLINES) {
        const fee = getDisciplineFee(formData, d.key);
        if (fee.design > 0 || fee.signAndSeal > 0 || fee.printing > 0) {
          cleanFees[d.key] = fee;
        }
      }
    }

    const totals = computeTotalsFromDisciplineFees(cleanFees);
    const bill = totals.hasAnyFee ? totals.serviceBill : Number(formData.bill) || 0;
    const printCost = totals.hasAnyFee ? totals.printingTotal : Number(formData.printCost) || 0;
    const totalBill = Number((bill + printCost).toFixed(2));
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
      solarElectrical: formData.solarElectrical?.trim() || '',
      others: formData.others?.trim() || '',
      disciplineFees: cleanFees,
      purpose: formData.purpose?.trim() || '',
      bill,
      printCost,
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
      <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {initialTransaction ? 'Edit Transaction' : 'Record New Transaction'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter project details, per-discipline charges (Design, Sign &amp; Seal, Printing), and payment tracking.
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
                placeholder="e.g. Complete MEPFS, Solar/Electrical & Structural Sign-off for Building Permit"
                value={formData.purpose || ''}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className={`w-full px-3 py-2 bg-white border ${
                  errors.purpose ? 'border-rose-400' : 'border-slate-300'
                } rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              />
              {errors.purpose && <p className="text-xs text-rose-500 mt-1">{errors.purpose}</p>}
            </div>
          </div>

          {/* Section 2: Engineering & Design Disciplines with Design / Sign & Seal / Printing Sub-fields */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3 pb-1 border-b border-slate-200">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                2. Engineering Disciplines &amp; Fee Breakdown
              </div>
              <span className="text-[11px] text-slate-500">
                Enter charged amounts for <strong className="text-slate-700">Design</strong>,{' '}
                <strong className="text-slate-700">Sign &amp; Seal</strong>, and{' '}
                <strong className="text-slate-700">Printing</strong> per discipline
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 text-slate-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 min-w-[175px]">Discipline</th>
                      <th className="py-2.5 px-2.5 min-w-[140px]">Lead / Ref Note</th>
                      <th className="py-2.5 px-2.5 text-right min-w-[115px]">Design</th>
                      <th className="py-2.5 px-2.5 text-right min-w-[115px]">Sign &amp; Seal</th>
                      <th className="py-2.5 px-2.5 text-right min-w-[115px]">Printing</th>
                      <th className="py-2.5 px-3 text-right min-w-[115px] bg-slate-800 text-indigo-200">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {DISCIPLINES.map((disc) => {
                      const fee = getDisciplineFee(formData, disc.key);
                      const subtotal = getDisciplineSubtotal(fee);
                      const noteVal = (formData[disc.key] as string) || '';
                      const isActive = subtotal > 0 || noteVal.trim().length > 0;
                      const isSolar = disc.key === 'solarElectrical';

                      return (
                        <tr
                          key={disc.key}
                          className={`transition-colors ${
                            isActive ? 'bg-indigo-50/30' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${disc.colorClass}`}
                              />
                              <div>
                                <div className="font-semibold text-slate-900 flex items-center gap-1 leading-tight">
                                  <span>{disc.shortLabel}</span>
                                  {isSolar && <Sun className="w-3 h-3 text-orange-500" />}
                                </div>
                                <div className="text-[10px] text-slate-500 leading-tight">
                                  {disc.label}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-2 px-2">
                            <input
                              type="text"
                              placeholder={disc.placeholder}
                              value={noteVal}
                              onChange={(e) => handleDisciplineNoteChange(disc.key, e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>

                          <td className="py-2 px-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              aria-label={`${disc.label} Design amount`}
                              value={fee.design === 0 ? '' : fee.design}
                              onChange={(e) =>
                                handleDisciplineFeeChange(disc.key, 'design', e.target.value)
                              }
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-right font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>

                          <td className="py-2 px-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              aria-label={`${disc.label} Sign & Seal amount`}
                              value={fee.signAndSeal === 0 ? '' : fee.signAndSeal}
                              onChange={(e) =>
                                handleDisciplineFeeChange(disc.key, 'signAndSeal', e.target.value)
                              }
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-right font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>

                          <td className="py-2 px-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              aria-label={`${disc.label} Printing amount`}
                              value={fee.printing === 0 ? '' : fee.printing}
                              onChange={(e) =>
                                handleDisciplineFeeChange(disc.key, 'printing', e.target.value)
                              }
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-right font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </td>

                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 bg-slate-50/70 whitespace-nowrap">
                            {subtotal > 0 ? (
                              formatCurrency(subtotal, currency)
                            ) : (
                              <span className="text-slate-300 font-normal">0.00</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t border-slate-300 font-semibold text-slate-900">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 text-xs uppercase tracking-wider text-slate-600">
                        Discipline Sub-field Totals
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-800 whitespace-nowrap">
                        {formatCurrency(feeTotals.designTotal, currency)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-800 whitespace-nowrap">
                        {formatCurrency(feeTotals.signAndSealTotal, currency)}
                      </td>
                      <td className="py-2.5 px-2.5 text-right font-mono text-slate-800 whitespace-nowrap">
                        {formatCurrency(feeTotals.printingTotal, currency)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-950 bg-indigo-50/70 whitespace-nowrap">
                        {formatCurrency(feeTotals.totalBill, currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Section 3: Financials & Bill Computation */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3 pb-1 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                <span>3. Billing Computation</span>
              </span>
              <span className="text-[11px] font-normal text-slate-500">
                {feeTotals.hasAnyFee
                  ? 'Auto-synced from discipline breakdown (Bill = Design + Sign & Seal; Print Cost = Printing)'
                  : 'Total Bill = Bill + Print Cost (or enter discipline amounts above)'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Bill (Design + Sign &amp; Seal)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    readOnly={feeTotals.hasAnyFee}
                    value={formData.bill === 0 ? '' : formData.bill}
                    onChange={(e) => handleAmountChange('bill', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      feeTotals.hasAnyFee
                        ? 'bg-slate-100 text-slate-700 cursor-not-allowed'
                        : 'bg-white text-slate-900'
                    }`}
                  />
                </div>
                {feeTotals.hasAnyFee && (
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    Design: {formatCurrency(feeTotals.designTotal, currency)} + Sign &amp; Seal:{' '}
                    {formatCurrency(feeTotals.signAndSealTotal, currency)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Print Cost (Blueprints &amp; Printing)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    readOnly={feeTotals.hasAnyFee}
                    value={formData.printCost === 0 ? '' : formData.printCost}
                    onChange={(e) => handleAmountChange('printCost', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      feeTotals.hasAnyFee
                        ? 'bg-slate-100 text-slate-700 cursor-not-allowed'
                        : 'bg-white text-slate-900'
                    }`}
                  />
                </div>
                {feeTotals.hasAnyFee && (
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    Sum of Printing across disciplines
                  </p>
                )}
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
              4. Payment Status &amp; Tracking
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
              Remarks &amp; Accounting Notes
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
