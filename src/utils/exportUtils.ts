import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, Currency, CompanyProfile, DEFAULT_COMPANY_PROFILE } from '../types/transaction';
import { formatCurrency, formatCurrencyPdf, formatDate, getWeekDetails, getMonthDetails } from './formatters';

export function exportTransactionsToExcel(
  transactions: Transaction[],
  currency: Currency = 'PHP',
  reportTitle: string = 'Transactions_Report',
  companyProfile: CompanyProfile = DEFAULT_COMPANY_PROFILE
) {
  // Format transactions for Excel
  const excelData: Record<string, any>[] = transactions.map((t) => ({
    'Transaction ID': t.id,
    'Date': t.date,
    'Client': t.client,
    'Project Name': t.projectName,
    'EE': t.ee || '-',
    'Pl': t.pl || '-',
    'St': t.st || '-',
    'Arch': t.arch || '-',
    'ECE': t.ece || '-',
    'ME': t.me || '-',
    'Others': t.others || '-',
    'Purpose': t.purpose,
    'Bill Amount': t.bill,
    'Print Cost': t.printCost,
    'Total Bill': t.totalBill,
    'Payment Status': t.paymentStatus,
    'Amount Paid': t.amountPaid,
    'Outstanding Balance': t.balance,
    'Payment Date': t.paymentDate || '-',
    'Payment Method / Ref': [t.paymentMethod, t.paymentReference].filter(Boolean).join(' - ') || '-',
    'Remarks': t.remarks || '-',
  }));

  // Calculate totals
  const totalBill = transactions.reduce((sum, t) => sum + (t.bill || 0), 0);
  const totalPrintCost = transactions.reduce((sum, t) => sum + (t.printCost || 0), 0);
  const grandTotal = transactions.reduce((sum, t) => sum + (t.totalBill || 0), 0);
  const totalPaid = transactions.reduce((sum, t) => sum + (t.amountPaid || 0), 0);
  const totalBalance = transactions.reduce((sum, t) => sum + (t.balance || 0), 0);

  // Add summary total row
  excelData.push({
    'Transaction ID': 'TOTALS',
    'Date': `${transactions.length} records`,
    'Client': '',
    'Project Name': '',
    'EE': '',
    'Pl': '',
    'St': '',
    'Arch': '',
    'ECE': '',
    'ME': '',
    'Others': '',
    'Purpose': 'GRAND TOTALS',
    'Bill Amount': totalBill,
    'Print Cost': totalPrintCost,
    'Total Bill': grandTotal,
    'Payment Status': `${((totalPaid / (grandTotal || 1)) * 100).toFixed(1)}% Collected`,
    'Amount Paid': totalPaid,
    'Outstanding Balance': totalBalance,
    'Payment Date': '',
    'Payment Method / Ref': '',
    'Remarks': '',
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  const colWidths = [
    { wch: 14 }, // ID
    { wch: 12 }, // Date
    { wch: 22 }, // Client
    { wch: 26 }, // Project Name
    { wch: 18 }, // EE
    { wch: 18 }, // Pl
    { wch: 18 }, // St
    { wch: 18 }, // Arch
    { wch: 18 }, // ECE
    { wch: 18 }, // ME
    { wch: 18 }, // Others
    { wch: 30 }, // Purpose
    { wch: 14 }, // Bill Amount
    { wch: 12 }, // Print Cost
    { wch: 14 }, // Total Bill
    { wch: 15 }, // Status
    { wch: 14 }, // Amount Paid
    { wch: 14 }, // Balance
    { wch: 12 }, // Payment Date
    { wch: 24 }, // Method
    { wch: 32 }, // Remarks
  ];
  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');

  // Sheet 2: Executive Summary & Client Spending breakdown
  const clientBreakdown: Record<string, { count: number; bill: number; printCost: number; total: number; paid: number; balance: number }> = {};
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

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${reportTitle}_${dateStr}.xlsx`);
}

export function exportTransactionsToPdf(
  transactions: Transaction[],
  currency: Currency = 'PHP',
  reportTitle: string = 'Transaction Ledger Report',
  filterSubtitle: string = 'All Records',
  companyProfile: CompanyProfile = DEFAULT_COMPANY_PROFILE
) {
  // Use Landscape for complete horizontal space
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 58, 'F');

  let textLeft = 30;
  if (companyProfile.logoUrl) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(30, 8, 42, 42, 3, 3, 'F');
      doc.addImage(companyProfile.logoUrl, 'PNG', 32, 10, 38, 38);
      textLeft = 82;
    } catch (e) {
      // fallback to text only if image parsing fails
      textLeft = 30;
    }
  }

  // Title text with Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const orgTitle = `${companyProfile.companyName.toUpperCase()} — BILLING & SPENDING LEDGER`;
  doc.text(orgTitle, textLeft, 25);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
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

  // Data Table
  const tableHeaders = [
    ['Date', 'Client', 'Project Name', 'Disciplines (EE/Pl/St/Arch/ECE/ME/Oth)', 'Purpose', 'Bill', 'Print Cost', 'Total Bill', 'Status', 'Paid', 'Balance']
  ];

  const tableRows = transactions.map((t) => {
    const discList = [
      t.ee ? `EE: ${t.ee}` : null,
      t.pl ? `Pl: ${t.pl}` : null,
      t.st ? `St: ${t.st}` : null,
      t.arch ? `Arch: ${t.arch}` : null,
      t.ece ? `ECE: ${t.ece}` : null,
      t.me ? `ME: ${t.me}` : null,
      t.others ? `Oth: ${t.others}` : null,
    ].filter(Boolean).join(' | ');

    return [
      t.date,
      t.client,
      t.projectName,
      discList || '-',
      t.purpose,
      formatCurrencyPdf(t.bill, currency),
      formatCurrencyPdf(t.printCost, currency),
      formatCurrencyPdf(t.totalBill, currency),
      t.paymentStatus,
      formatCurrencyPdf(t.amountPaid, currency),
      formatCurrencyPdf(t.balance, currency),
    ];
  });

  // Append Total Row
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
      0: { cellWidth: 55 },  // Date
      1: { cellWidth: 80 },  // Client
      2: { cellWidth: 85 },  // Project Name
      3: { cellWidth: 155 }, // Disciplines
      4: { cellWidth: 105 }, // Purpose
      5: { cellWidth: 55, halign: 'right' },  // Bill
      6: { cellWidth: 50, halign: 'right' },  // Print Cost
      7: { cellWidth: 60, halign: 'right', fontStyle: 'bold' },  // Total Bill
      8: { cellWidth: 55, halign: 'center' }, // Status
      9: { cellWidth: 55, halign: 'right' },  // Paid
      10: { cellWidth: 55, halign: 'right' }, // Balance
    },
    didDrawPage: (data) => {
      // Footer
      const totalPages = (doc as any).internal.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `LedgerPro Financial System — Confidential Document — Page ${currentPage} of ${totalPages}`,
        30,
        pageHeight - 15
      );
    },
  });

  const fileDate = new Date().toISOString().split('T')[0];
  doc.save(`${reportTitle.replace(/\s+/g, '_')}_${fileDate}.pdf`);
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

  // Header band
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 80, 'F');

  let textLeft = 35;
  if (companyProfile.logoUrl) {
    try {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(35, 12, 54, 54, 4, 4, 'F');
      doc.addImage(companyProfile.logoUrl, 'PNG', 38, 15, 48, 48);
      textLeft = 100;
    } catch (e) {
      textLeft = 35;
    }
  }

  // Company Name & Slogan
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(companyProfile.companyName || 'STATEMENT OF ACCOUNT', textLeft, 28);

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
  doc.setTextColor(129, 140, 248); // indigo-400
  doc.text(`STATEMENT OF ACCOUNT / BILLING INVOICE · Ref: ${t.id}`, textLeft, 68);

  // Meta Section
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(35, 95, pageWidth - 70, 75, 4, 4, 'FD');

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
  doc.text(`Payment Method/Ref: ${[t.paymentMethod, t.paymentReference].filter(Boolean).join(' / ') || 'None'}`, rightColX, 157);

  // Engineering & Architectural Disciplines itemization
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('ENGINEERING & DESIGN SCOPE', 35, 190);

  const discData = [
    ['Electrical Engineering (EE)', t.ee || 'Not assigned / N/A'],
    ['Plumbing Engineering (Pl)', t.pl || 'Not assigned / N/A'],
    ['Structural Engineering (St)', t.st || 'Not assigned / N/A'],
    ['Architectural Design (Arch)', t.arch || 'Not assigned / N/A'],
    ['Electronics & Comms (ECE)', t.ece || 'Not assigned / N/A'],
    ['Mechanical Engineering (ME)', t.me || 'Not assigned / N/A'],
    ['Other Disciplines / Specialists', t.others || 'None'],
    ['Purpose / Milestone', t.purpose || '-'],
  ];

  autoTable(doc, {
    startY: 200,
    margin: { left: 35, right: 35 },
    head: [['Discipline / Item', 'Design Lead / Assigned Scope']],
    body: discData,
    theme: 'striped',
    styles: { fontSize: 8.5, cellPadding: 5 },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 18;

  // Financial Items breakdown table
  const financeData = [
    ['Professional Engineering & Design Fee (Bill)', formatCurrencyPdf(t.bill, currency)],
    ['Printing, Blueprints & Document Reproduction (Print Cost)', formatCurrencyPdf(t.printCost, currency)],
    ['TOTAL BILLABLE AMOUNT', formatCurrencyPdf(t.totalBill, currency)],
    ['Amount Paid / Remitted', formatCurrencyPdf(t.amountPaid, currency)],
    ['OUTSTANDING BALANCE DUE', formatCurrencyPdf(t.balance, currency)],
  ];

  autoTable(doc, {
    startY: finalY,
    margin: { left: 35, right: 35 },
    head: [['Financial Description', 'Amount']],
    body: financeData,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 360 },
      1: { cellWidth: 160, halign: 'right', fontStyle: 'bold' },
    },
  });

  const notesY = (doc as any).lastAutoTable.finalY + 18;
  if (t.remarks) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('Remarks / Notes:', 35, notesY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(t.remarks, 35, notesY + 14, { maxWidth: pageWidth - 70 });
  }

  // Signatures
  const sigY = 720;
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

  doc.save(`Invoice_${t.id}_${t.client.replace(/\s+/g, '_')}.pdf`);
}
