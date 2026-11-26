import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Transaction,
  Currency,
  CompanyProfile,
  DEFAULT_COMPANY_PROFILE,
  DISCIPLINES,
  DisciplineKey,
  getDisciplineFee,
  getDisciplineSubtotal,
  getDisciplineNote,
  hasDisciplineActivity,
  computeTotalsFromDisciplineFees,
  getNormalizedPayments,
} from '../types/transaction';
import { formatCurrencyPdf, formatDate } from './formatters';

function sanitizeFileSegment(input: string): string {
  return (input || 'Report')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) || 'Report';
}

function formatDisciplineCellForExport(
  t: Transaction,
  key: DisciplineKey,
  currency: Currency
): string {
  const note = getDisciplineNote(t, key).trim();
  const fee = getDisciplineFee(t, key);
  const subtotal = getDisciplineSubtotal(fee);
  if (!note && subtotal === 0) return '-';

  const feeParts: string[] = [];
  if (fee.design > 0) feeParts.push(`D/I:${formatCurrencyPdf(fee.design, currency)}`);
  if (fee.signAndSeal > 0) feeParts.push(`S&S:${formatCurrencyPdf(fee.signAndSeal, currency)}`);
  if (fee.printing > 0) feeParts.push(`P:${formatCurrencyPdf(fee.printing, currency)}`);

  if (note && feeParts.length > 0) {
    return `${note} (${feeParts.join(', ')})`;
  }
  if (feeParts.length > 0) {
    return feeParts.join(', ');
  }
  return note;
}

function formatCompactDisciplinesForPdf(t: Transaction, currency: Currency): string {
  const items: string[] = [];
  for (const d of DISCIPLINES) {
    if (!hasDisciplineActivity(t, d.key)) continue;
    const note = getDisciplineNote(t, d.key).trim();
    const fee = getDisciplineFee(t, d.key);
    const sub = getDisciplineSubtotal(fee);
    if (sub > 0 && note) {
      items.push(`${d.shortLabel}: ${note} (${formatCurrencyPdf(sub, currency)})`);
    } else if (sub > 0) {
      items.push(`${d.shortLabel}: ${formatCurrencyPdf(sub, currency)}`);
    } else if (note) {
      items.push(`${d.shortLabel}: ${note}`);
    }
  }
  return items.length > 0 ? items.join(' | ') : '-';
}

export function exportTransactionsToExcel(
  transactions: Transaction[],
  currency: Currency = 'PHP',
  reportTitle: string = 'Transactions_Report',
  companyProfile: CompanyProfile = DEFAULT_COMPANY_PROFILE
) {
  const excelData: Record<string, any>[] = transactions.map((t) => {
    const payments = getNormalizedPayments(t);
    const latestMethodRef = [t.paymentMethod, t.paymentReference].filter(Boolean).join(' - ');
    const paymentSummaryText =
      payments.length > 1
        ? `${payments.length} payments${latestMethodRef ? ` (Latest: ${latestMethodRef})` : ''}`
        : latestMethodRef || '-';

    return {
      'Transaction ID': t.id,
      'Date': t.date,
      'Client': t.client,
      'Project Name': t.projectName,
      'EE': formatDisciplineCellForExport(t, 'ee', currency),
      'Pl': formatDisciplineCellForExport(t, 'pl', currency),
      'St': formatDisciplineCellForExport(t, 'st', currency),
      'Arch': formatDisciplineCellForExport(t, 'arch', currency),
      'ECE': formatDisciplineCellForExport(t, 'ece', currency),
      'ME': formatDisciplineCellForExport(t, 'me', currency),
      'Solar/Electrical Installation': formatDisciplineCellForExport(t, 'solarElectrical', currency),
      'Others': formatDisciplineCellForExport(t, 'others', currency),
      'Purpose': t.purpose,
      'Bill Amount': t.bill,
      'Print Cost': t.printCost,
      'Total Bill': t.totalBill,
      'Payment Status': t.paymentStatus,
      'Payments Count': payments.length,
      'Amount Paid': t.amountPaid,
      'Outstanding Balance': t.balance,
      'Latest Payment Date': t.paymentDate || '-',
      'Payment Method / Ref': paymentSummaryText,
      'Remarks': t.remarks || '-',
    };
  });

  const totalBill = transactions.reduce((sum, t) => sum + (t.bill || 0), 0);
  const totalPrintCost = transactions.reduce((sum, t) => sum + (t.printCost || 0), 0);
  const grandTotal = transactions.reduce((sum, t) => sum + (t.totalBill || 0), 0);
  const totalPaid = transactions.reduce((sum, t) => sum + (t.amountPaid || 0), 0);
  const totalBalance = transactions.reduce((sum, t) => sum + (t.balance || 0), 0);
  const totalPaymentCount = transactions.reduce((sum, t) => sum + getNormalizedPayments(t).length, 0);

  excelData.push({
    'Transaction ID': 'TOTALS',
    'Date': `${transactions.length} records`,
    'Client': companyProfile.companyName || '',
    'Project Name': '',
    'EE': '',
    'Pl': '',
    'St': '',
    'Arch': '',
    'ECE': '',
    'ME': '',
    'Solar/Electrical Installation': '',
    'Others': '',
    'Purpose': 'GRAND TOTALS',
    'Bill Amount': totalBill,
    'Print Cost': totalPrintCost,
    'Total Bill': grandTotal,
    'Payment Status': `${((totalPaid / (grandTotal || 1)) * 100).toFixed(1)}% Collected`,
    'Payments Count': totalPaymentCount,
    'Amount Paid': totalPaid,
    'Outstanding Balance': totalBalance,
    'Latest Payment Date': '',
    'Payment Method / Ref': '',
    'Remarks': '',
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  worksheet['!cols'] = [
    { wch: 14 }, // ID
    { wch: 12 }, // Date
    { wch: 22 }, // Client
    { wch: 26 }, // Project Name
    { wch: 22 }, // EE
    { wch: 22 }, // Pl
    { wch: 22 }, // St
    { wch: 22 }, // Arch
    { wch: 22 }, // ECE
    { wch: 22 }, // ME
    { wch: 26 }, // Solar/Electrical Installation
    { wch: 22 }, // Others
    { wch: 30 }, // Purpose
    { wch: 14 }, // Bill Amount
    { wch: 12 }, // Print Cost
    { wch: 14 }, // Total Bill
    { wch: 15 }, // Status
    { wch: 14 }, // Payments Count
    { wch: 14 }, // Amount Paid
    { wch: 14 }, // Balance
    { wch: 14 }, // Latest Payment Date
    { wch: 28 }, // Method
    { wch: 32 }, // Remarks
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

  // Sheet 2: Client Summary
  const clientBreakdown: Record<
    string,
    { count: number; bill: number; printCost: number; total: number; paid: number; balance: number }
  > = {};
  transactions.forEach((t) => {
    if (!clientBreakdown[t.client]) {
      clientBreakdown[t.client] = { count: 0, bill: 0, printCost: 0, total: 0, paid: 0, balance: 0 };
    }
    clientBreakdown[t.client].count += 1;
    clientBreakdown[t.client].bill += t.bill || 0;
    clientBreakdown[t.client].printCost += t.printCost || 0;
    clientBreakdown[t.client].total += t.totalBill || 0;
    clientBreakdown[t.client].paid += t.amountPaid || 0;
    clientBreakdown[t.client].balance += t.balance || 0;
  });

  const clientSummaryRows = Object.entries(clientBreakdown).map(([client, data]) => ({
    'Client Name': client,
    'Projects / Bills': data.count,
    'Total Service Bill': data.bill,
    'Total Print Cost': data.printCost,
    'Total Billed': data.total,
    'Total Collected': data.paid,
    'Outstanding Balance': data.balance,
  }));

  const summarySheet = XLSX.utils.json_to_sheet(clientSummaryRows);
  summarySheet['!cols'] = [
    { wch: 28 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Client Summary');

  // Sheet 3: Discipline Fee Breakdown (Design / Installation, Sign & Seal, Printing)
  const disciplineRows: Record<string, any>[] = [];
  transactions.forEach((t) => {
    DISCIPLINES.forEach((d) => {
      if (!hasDisciplineActivity(t, d.key)) return;
      const fee = getDisciplineFee(t, d.key);
      const subtotal = getDisciplineSubtotal(fee);
      disciplineRows.push({
        'Transaction ID': t.id,
        'Date': t.date,
        'Client': t.client,
        'Project Name': t.projectName,
        'Discipline': d.label,
        'Lead / Notes': getDisciplineNote(t, d.key) || '-',
        'Design / Installation': fee.design,
        'Sign & Seal': fee.signAndSeal,
        'Printing': fee.printing,
        'Discipline Subtotal': subtotal,
      });
    });
  });

  if (disciplineRows.length > 0) {
    const discSheet = XLSX.utils.json_to_sheet(disciplineRows);
    discSheet['!cols'] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 22 },
      { wch: 26 },
      { wch: 28 },
      { wch: 20 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(workbook, discSheet, 'Discipline Breakdown');
  }

  // Sheet 4: Itemized Partial Payments History
  const paymentHistoryRows: Record<string, any>[] = [];
  transactions.forEach((t) => {
    const payments = getNormalizedPayments(t);
    payments.forEach((p, idx) => {
      paymentHistoryRows.push({
        'Transaction ID': t.id,
        'Client': t.client,
        'Project Name': t.projectName,
        'Installment #': idx + 1,
        'Payment Date': p.date,
        'Payment Method': p.method,
        'Reference #': p.reference || '-',
        'Notes': p.remarks || '-',
        'Amount Paid': p.amount,
      });
    });
  });

  if (paymentHistoryRows.length > 0) {
    const paySheet = XLSX.utils.json_to_sheet(paymentHistoryRows);
    paySheet['!cols'] = [
      { wch: 14 },
      { wch: 22 },
      { wch: 26 },
      { wch: 14 },
      { wch: 14 },
      { wch: 18 },
      { wch: 20 },
      { wch: 28 },
      { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(workbook, paySheet, 'Payments History');
  }

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${sanitizeFileSegment(reportTitle)}_${dateStr}.xlsx`);
}

export function exportTransactionsToPdf(
  transactions: Transaction[],
  currency: Currency = 'PHP',
  reportTitle: string = 'Transaction Ledger Report',
  filterSubtitle: string = 'All Records',
  companyProfile: CompanyProfile = DEFAULT_COMPANY_PROFILE
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 58, 'F');

  let textLeft = 30;
  if (companyProfile.logoUrl) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(30, 8, 42, 42, 3, 3, 'F');
      doc.addImage(companyProfile.logoUrl, 'PNG', 32, 10, 38, 38);
      textLeft = 82;
    } catch {
      textLeft = 30;
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const orgTitle = `${companyProfile.companyName.toUpperCase()} — BILLING & SPENDING LEDGER`;
  doc.text(orgTitle, textLeft, 25);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  const printTimestamp = new Date().toLocaleString();
  doc.text(
    `Generated: ${printTimestamp} | Scope: ${filterSubtitle} | ${companyProfile.contactInfo || companyProfile.tagline}`,
    textLeft,
    42
  );

  // Financial KPI Summary Cards
  const totalBill = transactions.reduce((sum, t) => sum + (t.bill || 0), 0);
  const totalPrintCost = transactions.reduce((sum, t) => sum + (t.printCost || 0), 0);
  const grandTotal = transactions.reduce((sum, t) => sum + (t.totalBill || 0), 0);
  const totalPaid = transactions.reduce((sum, t) => sum + (t.amountPaid || 0), 0);
  const totalBalance = transactions.reduce((sum, t) => sum + (t.balance || 0), 0);

  const startY = 70;
  const cardWidth = (pageWidth - 60 - 40) / 5;
  const cards = [
    { label: 'TOTAL BILL (SERVICES)', val: formatCurrencyPdf(totalBill, currency), color: [248, 250, 252], textColor: [15, 23, 42] },
    { label: 'PRINT & BLUEPRINT COST', val: formatCurrencyPdf(totalPrintCost, currency), color: [248, 250, 252], textColor: [15, 23, 42] },
    { label: 'GRAND TOTAL BILLED', val: formatCurrencyPdf(grandTotal, currency), color: [238, 242, 255], textColor: [30, 58, 138] },
    { label: 'TOTAL COLLECTED / PAID', val: formatCurrencyPdf(totalPaid, currency), color: [240, 253, 244], textColor: [22, 101, 52] },
    { label: 'OUTSTANDING RECEIVABLES', val: formatCurrencyPdf(totalBalance, currency), color: [254, 242, 242], textColor: [153, 27, 27] },
  ];

  cards.forEach((card, i) => {
    const x = 30 + i * (cardWidth + 10);
    doc.setFillColor(card.color[0], card.color[1], card.color[2]);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, startY, cardWidth, 42, 4, 4, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(card.label, x + 8, startY + 14);

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(card.textColor[0], card.textColor[1], card.textColor[2]);
    doc.text(card.val, x + 8, startY + 31);
  });

  const tableHeaders = [
    ['Date', 'Client', 'Project Name', 'Disciplines (incl. Solar/Elec)', 'Purpose', 'Bill', 'Print Cost', 'Total Bill', 'Status', 'Paid', 'Balance']
  ];

  const tableRows = transactions.map((t) => [
    t.date,
    t.client,
    t.projectName,
    formatCompactDisciplinesForPdf(t, currency),
    t.purpose,
    formatCurrencyPdf(t.bill, currency),
    formatCurrencyPdf(t.printCost, currency),
    formatCurrencyPdf(t.totalBill, currency),
    t.paymentStatus,
    formatCurrencyPdf(t.amountPaid, currency),
    formatCurrencyPdf(t.balance, currency),
  ]);

  tableRows.push([
    'TOTAL',
    `${transactions.length} records`,
    '-',
    '-',
    'GRAND TOTALS',
    formatCurrencyPdf(totalBill, currency),
    formatCurrencyPdf(totalPrintCost, currency),
    formatCurrencyPdf(grandTotal, currency),
    `${((totalPaid / (grandTotal || 1)) * 100).toFixed(0)}% Paid`,
    formatCurrencyPdf(totalPaid, currency),
    formatCurrencyPdf(totalBalance, currency),
  ]);

  autoTable(doc, {
    startY: 125,
    margin: { left: 30, right: 30, bottom: 40 },
    head: tableHeaders,
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 4,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 80 },
      2: { cellWidth: 85 },
      3: { cellWidth: 155 },
      4: { cellWidth: 105 },
      5: { cellWidth: 55, halign: 'right' },
      6: { cellWidth: 50, halign: 'right' },
      7: { cellWidth: 60, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 55, halign: 'center' },
      9: { cellWidth: 55, halign: 'right' },
      10: { cellWidth: 55, halign: 'right' },
    },
    didDrawPage: () => {
      const totalPages = (doc as any).internal.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `${companyProfile.companyName || 'LedgerPro'} — Confidential Document — Page ${currentPage} of ${totalPages}`,
        30,
        pageHeight - 15
      );
    },
  });

  const fileDate = new Date().toISOString().split('T')[0];
  doc.save(`${sanitizeFileSegment(reportTitle)}_${fileDate}.pdf`);
}

export function exportSingleInvoicePdf(
  t: Transaction,
  currency: Currency = 'PHP',
  companyProfile: CompanyProfile = DEFAULT_COMPANY_PROFILE
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 82, 'F');

  let textLeft = 35;
  if (companyProfile.logoUrl) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(35, 13, 54, 54, 4, 4, 'F');
      doc.addImage(companyProfile.logoUrl, 'PNG', 38, 16, 48, 48);
      textLeft = 100;
    } catch {
      textLeft = 35;
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(companyProfile.companyName || 'BILLING INVOICE', textLeft, 28);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  const companyMeta = [companyProfile.tagline, companyProfile.tinNumber].filter(Boolean).join(' | ');
  doc.text(companyMeta, textLeft, 42);

  const contactLine = [companyProfile.address, companyProfile.contactInfo].filter(Boolean).join(' · ');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(contactLine, textLeft, 55, { maxWidth: pageWidth - textLeft - 35 });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(129, 140, 248);
  doc.text(`PROJECT BILLING INVOICE · Ref: ${t.id}`, textLeft, 70);

  // Meta Section
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(35, 95, pageWidth - 70, 78, 4, 4, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT DETAILS', 48, 112);
  doc.setFont('helvetica', 'normal');
  doc.text(`Client: ${t.client}`, 48, 127);
  doc.text(`Project: ${t.projectName}`, 48, 142);
  doc.text(`Billing Date: ${formatDate(t.date)}`, 48, 157);

  const rightColX = pageWidth / 2 + 10;
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT DETAILS', rightColX, 112);
  doc.setFont('helvetica', 'normal');
  doc.text(`Status: ${t.paymentStatus}`, rightColX, 127);
  doc.text(`Payment Date: ${t.paymentDate ? formatDate(t.paymentDate) : 'Pending Settlement'}`, rightColX, 142);
  doc.text(`Method/Ref: ${[t.paymentMethod, t.paymentReference].filter(Boolean).join(' / ') || 'None'}`, rightColX, 157);

  // Discipline Breakdown Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text('ENGINEERING & DESIGN SCOPE BREAKDOWN', 35, 193);

  const feeTotals = computeTotalsFromDisciplineFees(t.disciplineFees);
  const activeDisciplines = DISCIPLINES.filter((d) => hasDisciplineActivity(t, d.key));
  const disciplinesToRender = activeDisciplines.length > 0 ? activeDisciplines : DISCIPLINES;

  if (feeTotals.hasAnyFee) {
    const discRows = disciplinesToRender.map((d) => {
      const fee = getDisciplineFee(t, d.key);
      const sub = getDisciplineSubtotal(fee);
      return [
        `${d.label} (${d.shortLabel})`,
        getDisciplineNote(t, d.key) || '-',
        fee.design > 0 ? formatCurrencyPdf(fee.design, currency) : '-',
        fee.signAndSeal > 0 ? formatCurrencyPdf(fee.signAndSeal, currency) : '-',
        fee.printing > 0 ? formatCurrencyPdf(fee.printing, currency) : '-',
        formatCurrencyPdf(sub, currency),
      ];
    });

    discRows.push([
      'SUBTOTALS',
      t.purpose || '-',
      formatCurrencyPdf(feeTotals.designTotal, currency),
      formatCurrencyPdf(feeTotals.signAndSealTotal, currency),
      formatCurrencyPdf(feeTotals.printingTotal, currency),
      formatCurrencyPdf(feeTotals.totalBill, currency),
    ]);

    autoTable(doc, {
      startY: 202,
      margin: { left: 35, right: 35 },
      head: [['Discipline', 'Lead / Note', 'Design / Installation', 'Sign & Seal', 'Printing', 'Subtotal']],
      body: discRows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 4.5 },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 135 },
        1: { cellWidth: 85 },
        2: { cellWidth: 90, halign: 'right' },
        3: { cellWidth: 70, halign: 'right' },
        4: { cellWidth: 70, halign: 'right' },
        5: { cellWidth: 75, halign: 'right', fontStyle: 'bold' },
      },
    });
  } else {
    const discData = [
      ...DISCIPLINES.map((d) => [`${d.label} (${d.shortLabel})`, getDisciplineNote(t, d.key) || 'Not assigned / N/A']),
      ['Purpose / Milestone', t.purpose || '-'],
    ];

    autoTable(doc, {
      startY: 202,
      margin: { left: 35, right: 35 },
      head: [['Discipline / Item', 'Design / Installation Lead & Scope']],
      body: discData,
      theme: 'striped',
      styles: { fontSize: 8.5, cellPadding: 4.5 },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
    });
  }

  const finalY = (doc as any).lastAutoTable.finalY + 16;

  // Financial Summary Table
  const financeData = [
    ['Professional Engineering & Installation Fee (Design / Installation + Sign & Seal)', formatCurrencyPdf(t.bill, currency)],
    ['Printing, Blueprints & Document Reproduction (Print Cost)', formatCurrencyPdf(t.printCost, currency)],
    ['TOTAL BILLABLE AMOUNT', formatCurrencyPdf(t.totalBill, currency)],
    ['Amount Paid / Remitted', formatCurrencyPdf(t.amountPaid, currency)],
    ['OUTSTANDING BALANCE DUE', formatCurrencyPdf(t.balance, currency)],
  ];

  autoTable(doc, {
    startY: finalY,
    margin: { left: 35, right: 35 },
    head: [['Financial Summary', 'Amount']],
    body: financeData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 5.5 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 365 },
      1: { cellWidth: 160, halign: 'right', fontStyle: 'bold' },
    },
  });

  let afterTableY = (doc as any).lastAutoTable.finalY + 16;

  // Payment History / Partial Installments Table
  const invoicePayments = getNormalizedPayments(t);
  if (invoicePayments.length > 0) {
    if (afterTableY > pageHeight - 160) {
      doc.addPage();
      afterTableY = 45;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(
      `PAYMENT HISTORY / INSTALLMENTS (${invoicePayments.length})`,
      35,
      afterTableY
    );

    const paymentRows = invoicePayments.map((p, idx) => [
      `#${idx + 1}`,
      formatDate(p.date),
      p.method || 'Cash',
      p.reference || '-',
      p.remarks || '-',
      formatCurrencyPdf(p.amount, currency),
    ]);

    autoTable(doc, {
      startY: afterTableY + 8,
      margin: { left: 35, right: 35 },
      head: [['#', 'Payment Date', 'Method', 'Reference #', 'Notes', 'Amount']],
      body: paymentRows,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 28, halign: 'center' },
        1: { cellWidth: 72 },
        2: { cellWidth: 85 },
        3: { cellWidth: 95 },
        4: { cellWidth: 160 },
        5: { cellWidth: 85, halign: 'right', fontStyle: 'bold' },
      },
    });

    afterTableY = (doc as any).lastAutoTable.finalY + 16;
  }

  if (t.remarks) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Remarks / Notes:', 35, afterTableY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(t.remarks, 35, afterTableY + 13, { maxWidth: pageWidth - 70 });
    afterTableY += 36;
  }

  // Ensure signatures don't overlap content
  let sigY = Math.max(afterTableY + 35, 720);
  if (sigY > pageHeight - 75) {
    doc.addPage();
    sigY = 100;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(40, sigY, 220, sigY);
  doc.line(pageWidth - 220, sigY, pageWidth - 40, sigY);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(companyProfile.signatoryName || 'Authorized Signatory', 40, sigY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(companyProfile.signatoryTitle || 'Project Lead', 40, sigY + 26);
  doc.text(companyProfile.companyName || '', 40, sigY + 37);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Received & Acknowledged By:', pageWidth - 220, sigY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${t.client} Representative`, pageWidth - 220, sigY + 26);

  doc.save(`Invoice_${sanitizeFileSegment(t.id)}_${sanitizeFileSegment(t.client)}.pdf`);
}

export interface ClientStatementOptions {
  scopeLabel: string;
  statementDate?: string;
  dueDate?: string;
  includeDisciplineBreakdown?: boolean;
  notes?: string;
}

export function exportClientStatementOfAccountPdf(
  clientName: string,
  clientTransactions: Transaction[],
  currency: Currency = 'PHP',
  companyProfile: CompanyProfile = DEFAULT_COMPANY_PROFILE,
  options: ClientStatementOptions = { scopeLabel: 'All Transactions' }
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const statementDate = options.statementDate || new Date().toISOString().split('T')[0];
  const soaRef = `SOA-${statementDate.replace(/-/g, '')}-${String(clientTransactions.length).padStart(2, '0')}`;

  // Sort chronologically for statement presentation
  const sortedTxs = [...clientTransactions].sort((a, b) => a.date.localeCompare(b.date));

  const totalBilled = sortedTxs.reduce((s, t) => s + (t.totalBill || 0), 0);
  const totalPaid = sortedTxs.reduce((s, t) => s + (t.amountPaid || 0), 0);
  const totalBalance = sortedTxs.reduce((s, t) => s + (t.balance || 0), 0);
  const totalDesign = sortedTxs.reduce((s, t) => {
    const f = computeTotalsFromDisciplineFees(t.disciplineFees);
    return s + (f.hasAnyFee ? f.designTotal : t.bill || 0);
  }, 0);
  const totalSignSeal = sortedTxs.reduce((s, t) => {
    const f = computeTotalsFromDisciplineFees(t.disciplineFees);
    return s + (f.hasAnyFee ? f.signAndSealTotal : 0);
  }, 0);
  const totalPrinting = sortedTxs.reduce((s, t) => {
    const f = computeTotalsFromDisciplineFees(t.disciplineFees);
    return s + (f.hasAnyFee ? f.printingTotal : t.printCost || 0);
  }, 0);

  // Top Header Band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 88, 'F');

  let textLeft = 35;
  if (companyProfile.logoUrl) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(35, 16, 54, 54, 4, 4, 'F');
      doc.addImage(companyProfile.logoUrl, 'PNG', 38, 19, 48, 48);
      textLeft = 100;
    } catch {
      textLeft = 35;
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13.5);
  doc.setFont('helvetica', 'bold');
  doc.text(companyProfile.companyName || 'STATEMENT OF ACCOUNT', textLeft, 30, { maxWidth: 300 });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  const metaLine = [companyProfile.tagline, companyProfile.tinNumber].filter(Boolean).join(' | ');
  doc.text(metaLine, textLeft, 44, { maxWidth: 310 });

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  const contactLine = [companyProfile.address, companyProfile.contactInfo].filter(Boolean).join(' · ');
  doc.text(contactLine, textLeft, 58, { maxWidth: 310 });

  // Right-side Statement Badge
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('STATEMENT OF ACCOUNT', pageWidth - 35, 32, { align: 'right' });

  doc.setFontSize(8.5);
  doc.setTextColor(165, 180, 252);
  doc.text(`Ref #: ${soaRef}`, pageWidth - 35, 48, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Issued: ${formatDate(statementDate)}`, pageWidth - 35, 62, { align: 'right' });
  if (options.dueDate) {
    doc.text(`Due Date: ${formatDate(options.dueDate)}`, pageWidth - 35, 74, { align: 'right' });
  }

  // Client & Summary Card
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(35, 102, pageWidth - 70, 82, 5, 5, 'FD');

  // Left: Bill To
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('STATEMENT FOR CLIENT', 48, 118);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(clientName, 48, 134, { maxWidth: 250 });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Statement Scope: ${options.scopeLabel}`, 48, 151);
  doc.text(`Total Transactions Included: ${sortedTxs.length} project record${sortedTxs.length === 1 ? '' : 's'}`, 48, 165);
  doc.text(`Account Status: ${totalBalance > 0 ? 'Balance Due' : 'Fully Settled'}`, 48, 178);

  // Right: Financial Summary Box
  const boxX = pageWidth - 245;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(boxX, 110, 198, 66, 4, 4, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Total Billed:', boxX + 10, 126);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(formatCurrencyPdf(totalBilled, currency), boxX + 188, 126, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(22, 101, 52);
  doc.text('Total Payments Paid:', boxX + 10, 141);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrencyPdf(totalPaid, currency), boxX + 188, 141, { align: 'right' });

  doc.setDrawColor(226, 232, 240);
  doc.line(boxX + 10, 148, boxX + 188, 148);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(totalBalance > 0 ? 185 : 22, totalBalance > 0 ? 28 : 101, totalBalance > 0 ? 28 : 52);
  doc.text('BALANCE DUE:', boxX + 10, 164);
  doc.text(formatCurrencyPdf(totalBalance, currency), boxX + 188, 164, { align: 'right' });

  // Section 1: Itemized Transactions Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('ITEMIZED ACCOUNT ACTIVITY', 35, 206);

  const itemRows = sortedTxs.map((t) => {
    const f = computeTotalsFromDisciplineFees(t.disciplineFees);
    const designVal = f.hasAnyFee ? f.designTotal : t.bill || 0;
    const signSealVal = f.hasAnyFee ? f.signAndSealTotal : 0;
    const printVal = f.hasAnyFee ? f.printingTotal : t.printCost || 0;
    const projectDesc = t.purpose ? `${t.projectName}\n${t.purpose}` : t.projectName;
    const pCount = getNormalizedPayments(t).length;
    const paidText =
      pCount > 1
        ? `${formatCurrencyPdf(t.amountPaid, currency)}\n(${pCount} pmts)`
        : formatCurrencyPdf(t.amountPaid, currency);

    return [
      t.date,
      t.id,
      projectDesc,
      formatCurrencyPdf(designVal, currency),
      signSealVal > 0 ? formatCurrencyPdf(signSealVal, currency) : '-',
      printVal > 0 ? formatCurrencyPdf(printVal, currency) : '-',
      formatCurrencyPdf(t.totalBill, currency),
      paidText,
      formatCurrencyPdf(t.balance, currency),
      t.paymentStatus,
    ];
  });

  itemRows.push([
    'TOTAL',
    `${sortedTxs.length} items`,
    'GRAND TOTALS',
    formatCurrencyPdf(totalDesign, currency),
    formatCurrencyPdf(totalSignSeal, currency),
    formatCurrencyPdf(totalPrinting, currency),
    formatCurrencyPdf(totalBilled, currency),
    formatCurrencyPdf(totalPaid, currency),
    formatCurrencyPdf(totalBalance, currency),
    totalBalance > 0 ? 'Due' : 'Settled',
  ]);

  autoTable(doc, {
    startY: 214,
    margin: { left: 35, right: 35, bottom: 45 },
    head: [['Date', 'Ref #', 'Project / Purpose', 'Design / Installation', 'Sign & Seal', 'Printing', 'Total Bill', 'Paid', 'Balance', 'Status']],
    body: itemRows,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 3.5,
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 44 },
      1: { cellWidth: 44 },
      2: { cellWidth: 104 },
      3: { cellWidth: 54, halign: 'right' },
      4: { cellWidth: 48, halign: 'right' },
      5: { cellWidth: 44, halign: 'right' },
      6: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 47, halign: 'right' },
      8: { cellWidth: 48, halign: 'right', fontStyle: 'bold' },
      9: { cellWidth: 42, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.row.index === itemRows.length - 1 && data.section === 'body') {
        data.cell.styles.fillColor = [238, 242, 255];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.textColor = [15, 23, 42];
      }
    },
  });

  let cursorY = (doc as any).lastAutoTable.finalY + 18;

  // Optional Section 2: Aggregated Discipline Charges Breakdown
  if (options.includeDisciplineBreakdown !== false) {
    const discTotals = DISCIPLINES.map((d) => {
      let design = 0;
      let signAndSeal = 0;
      let printing = 0;
      sortedTxs.forEach((t) => {
        const fee = getDisciplineFee(t, d.key);
        design += fee.design;
        signAndSeal += fee.signAndSeal;
        printing += fee.printing;
      });
      const subtotal = Number((design + signAndSeal + printing).toFixed(2));
      return {
        label: `${d.label} (${d.shortLabel})`,
        design,
        signAndSeal,
        printing,
        subtotal,
      };
    }).filter((row) => row.subtotal > 0);

    if (discTotals.length > 0) {
      if (cursorY > pageHeight - 160) {
        doc.addPage();
        cursorY = 45;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text('SUMMARY OF CHARGES BY ENGINEERING DISCIPLINE', 35, cursorY);

      const discBody = discTotals.map((r) => [
        r.label,
        formatCurrencyPdf(r.design, currency),
        formatCurrencyPdf(r.signAndSeal, currency),
        formatCurrencyPdf(r.printing, currency),
        formatCurrencyPdf(r.subtotal, currency),
      ]);

      autoTable(doc, {
        startY: cursorY + 8,
        margin: { left: 35, right: 35, bottom: 45 },
        head: [['Discipline', 'Design / Installation', 'Sign & Seal', 'Printing', 'Discipline Total']],
        body: discBody,
        theme: 'striped',
        styles: { fontSize: 7.5, cellPadding: 4 },
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 190 },
          1: { cellWidth: 95, halign: 'right' },
          2: { cellWidth: 80, halign: 'right' },
          3: { cellWidth: 80, halign: 'right' },
          4: { cellWidth: 80, halign: 'right', fontStyle: 'bold' },
        },
      });

      cursorY = (doc as any).lastAutoTable.finalY + 18;
    }
  }

  // Section 3: Payment Receipts / Partial Payments History
  const soaPayments = sortedTxs
    .flatMap((t) =>
      getNormalizedPayments(t).map((p) => ({
        date: p.date,
        projectName: t.projectName,
        method: p.method || 'Cash',
        reference: p.reference || '-',
        remarks: p.remarks || '-',
        amount: p.amount,
      }))
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  if (soaPayments.length > 0) {
    if (cursorY > pageHeight - 160) {
      doc.addPage();
      cursorY = 45;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(
      `PAYMENT RECEIPTS / PARTIAL PAYMENTS HISTORY (${soaPayments.length})`,
      35,
      cursorY
    );

    const paymentBody = soaPayments.map((p) => [
      formatDate(p.date),
      p.projectName,
      p.method,
      p.reference,
      p.remarks,
      formatCurrencyPdf(p.amount, currency),
    ]);

    autoTable(doc, {
      startY: cursorY + 8,
      margin: { left: 35, right: 35, bottom: 45 },
      head: [['Payment Date', 'Project', 'Method', 'Reference #', 'Notes', 'Amount']],
      body: paymentBody,
      theme: 'striped',
      styles: { fontSize: 7.5, cellPadding: 3.8, overflow: 'linebreak' },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 64 },
        1: { cellWidth: 120 },
        2: { cellWidth: 74 },
        3: { cellWidth: 82 },
        4: { cellWidth: 105 },
        5: { cellWidth: 80, halign: 'right', fontStyle: 'bold' },
      },
    });

    cursorY = (doc as any).lastAutoTable.finalY + 18;
  }

  // Optional Notes / Payment Instructions
  if (options.notes && options.notes.trim()) {
    if (cursorY > pageHeight - 110) {
      doc.addPage();
      cursorY = 45;
    }
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(35, cursorY, pageWidth - 70, 48, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('PAYMENT INSTRUCTIONS & REMARKS', 45, cursorY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(options.notes.trim(), 45, cursorY + 28, { maxWidth: pageWidth - 90 });

    cursorY += 62;
  }

  // Signatory block (safe page check)
  let sigY = Math.max(cursorY + 32, pageHeight - 110);
  if (cursorY > pageHeight - 110) {
    doc.addPage();
    sigY = 95;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(40, sigY, 220, sigY);
  doc.line(pageWidth - 220, sigY, pageWidth - 40, sigY);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(companyProfile.signatoryName || 'Authorized Signatory', 40, sigY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(companyProfile.signatoryTitle || 'Managing Principal', 40, sigY + 26);
  doc.text(companyProfile.companyName || '', 40, sigY + 37);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Acknowledged & Received By:', pageWidth - 220, sigY + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${clientName} Representative`, pageWidth - 220, sigY + 26);
  doc.text('Date Received: _____________________', pageWidth - 220, sigY + 38);

  // Page numbers on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `${companyProfile.companyName || 'LedgerPro'} — Statement of Account (${clientName}) — Page ${i} of ${totalPages}`,
      35,
      pageHeight - 18
    );
  }

  doc.save(`SOA_${sanitizeFileSegment(clientName)}_${statementDate}.pdf`);
}

export function exportClientStatementOfAccountExcel(
  clientName: string,
  clientTransactions: Transaction[],
  currency: Currency = 'PHP',
  companyProfile: CompanyProfile = DEFAULT_COMPANY_PROFILE,
  options: ClientStatementOptions = { scopeLabel: 'All Transactions' }
) {
  const statementDate = options.statementDate || new Date().toISOString().split('T')[0];
  const sortedTxs = [...clientTransactions].sort((a, b) => a.date.localeCompare(b.date));

  const rows: Record<string, any>[] = sortedTxs.map((t) => {
    const f = computeTotalsFromDisciplineFees(t.disciplineFees);
    const payments = getNormalizedPayments(t);
    return {
      'Date': t.date,
      'Ref #': t.id,
      'Project Name': t.projectName,
      'Purpose': t.purpose,
      'Design / Installation Fees': f.hasAnyFee ? f.designTotal : t.bill || 0,
      'Sign & Seal Fees': f.hasAnyFee ? f.signAndSealTotal : 0,
      'Printing Fees': f.hasAnyFee ? f.printingTotal : t.printCost || 0,
      'Total Bill': t.totalBill,
      'Payments Count': payments.length,
      'Amount Paid': t.amountPaid,
      'Balance Due': t.balance,
      'Status': t.paymentStatus,
      'Latest Payment Date': t.paymentDate || '-',
      'Remarks': t.remarks || '-',
    };
  });

  const totalBilled = sortedTxs.reduce((s, t) => s + (t.totalBill || 0), 0);
  const totalPaid = sortedTxs.reduce((s, t) => s + (t.amountPaid || 0), 0);
  const totalBalance = sortedTxs.reduce((s, t) => s + (t.balance || 0), 0);
  const totalPaymentCount = sortedTxs.reduce((s, t) => s + getNormalizedPayments(t).length, 0);
  const totalDesign = sortedTxs.reduce((s, t) => {
    const f = computeTotalsFromDisciplineFees(t.disciplineFees);
    return s + (f.hasAnyFee ? f.designTotal : t.bill || 0);
  }, 0);
  const totalSignSeal = sortedTxs.reduce((s, t) => {
    const f = computeTotalsFromDisciplineFees(t.disciplineFees);
    return s + (f.hasAnyFee ? f.signAndSealTotal : 0);
  }, 0);
  const totalPrinting = sortedTxs.reduce((s, t) => {
    const f = computeTotalsFromDisciplineFees(t.disciplineFees);
    return s + (f.hasAnyFee ? f.printingTotal : t.printCost || 0);
  }, 0);

  rows.push({
    'Date': 'TOTALS',
    'Ref #': `${sortedTxs.length} projects`,
    'Project Name': clientName,
    'Purpose': `${companyProfile.companyName} | ${options.scopeLabel}`,
    'Design / Installation Fees': totalDesign,
    'Sign & Seal Fees': totalSignSeal,
    'Printing Fees': totalPrinting,
    'Total Bill': totalBilled,
    'Payments Count': totalPaymentCount,
    'Amount Paid': totalPaid,
    'Balance Due': totalBalance,
    'Status': totalBalance > 0 ? 'Balance Due' : 'Settled',
    'Latest Payment Date': statementDate,
    'Remarks': options.notes || '',
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 26 },
    { wch: 30 },
    { wch: 24 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 26 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Statement of Account');

  // Sheet 2: Discipline Breakdown for this client
  const discRows: Record<string, any>[] = [];
  DISCIPLINES.forEach((d) => {
    let design = 0;
    let signAndSeal = 0;
    let printing = 0;
    sortedTxs.forEach((t) => {
      const fee = getDisciplineFee(t, d.key);
      design += fee.design;
      signAndSeal += fee.signAndSeal;
      printing += fee.printing;
    });
    const subtotal = Number((design + signAndSeal + printing).toFixed(2));
    if (subtotal > 0) {
      discRows.push({
        'Discipline': d.label,
        'Design / Installation': design,
        'Sign & Seal': signAndSeal,
        'Printing': printing,
        'Subtotal': subtotal,
        'Currency': currency,
      });
    }
  });

  if (discRows.length > 0) {
    const discWs = XLSX.utils.json_to_sheet(discRows);
    discWs['!cols'] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, discWs, 'Discipline Summary');
  }

  // Sheet 3: Partial Payments History for this client
  const paymentRows: Record<string, any>[] = [];
  sortedTxs.forEach((t) => {
    getNormalizedPayments(t).forEach((p, idx) => {
      paymentRows.push({
        'Payment Date': p.date,
        'Ref #': t.id,
        'Project Name': t.projectName,
        'Installment #': idx + 1,
        'Payment Method': p.method,
        'Payment Reference': p.reference || '-',
        'Notes': p.remarks || '-',
        'Amount Paid': p.amount,
        'Currency': currency,
      });
    });
  });

  if (paymentRows.length > 0) {
    paymentRows.sort((a, b) => String(a['Payment Date']).localeCompare(String(b['Payment Date'])));
    const payWs = XLSX.utils.json_to_sheet(paymentRows);
    payWs['!cols'] = [
      { wch: 14 },
      { wch: 14 },
      { wch: 26 },
      { wch: 14 },
      { wch: 18 },
      { wch: 20 },
      { wch: 28 },
      { wch: 15 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, payWs, 'Payments History');
  }

  XLSX.writeFile(wb, `SOA_${sanitizeFileSegment(clientName)}_${statementDate}.xlsx`);
}
