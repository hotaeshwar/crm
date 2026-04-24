import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BookOpen,
  User,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  Receipt,
  Wallet,
  FileText,
  Calendar,
  Search,
  BarChart3,
  Percent,
  Minus,
  CircleDollarSign,
  Activity,
  X,
  SlidersHorizontal,
  Mail,
  Phone,
  Download
} from 'lucide-react';

// Toast notification component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-blue-600';
  return (
    <div className={`fixed bottom-4 right-4 z-50 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right-5`}>
      {type === 'success' && <CheckCircle className="w-5 h-5" />}
      {type === 'error' && <AlertCircle className="w-5 h-5" />}
      {type === 'info' && <AlertCircle className="w-5 h-5" />}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

export default function Ledger() {
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    const unsubClients = onSnapshot(collection(db, 'clients'), s =>
      setClients(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubInvoices = onSnapshot(collection(db, 'invoices'), s =>
      setInvoices(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubPayments = onSnapshot(collection(db, 'payments'), s =>
      setPayments(s.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => { unsubClients(); unsubInvoices(); unsubPayments(); };
  }, []);

  const formatAmount = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  };

  const formatAmountWithCurrency = (amount) => {
    return `₹ ${formatAmount(amount)}`;
  };

  const getPaymentsForInvoice = (invoiceId) =>
    payments
      .filter(p => p.invoiceId === invoiceId)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const clientInvoices = invoices.filter(inv => inv.clientId === selectedClientId);

  const filteredInvoices = clientInvoices.filter(inv => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'debit') return inv.billType === 'debit';
    if (activeFilter === 'credit') return inv.billType === 'credit';
    if (activeFilter === 'paid') return inv.status === 'paid';
    if (activeFilter === 'unpaid') return inv.status === 'unpaid';
    if (activeFilter === 'partial') return inv.status === 'partial';
    return true;
  });

  const totalQuoted = clientInvoices.reduce((sum, inv) => sum + (inv.total || inv.amount || 0), 0);
  
  const totalReceived = clientInvoices.reduce((sum, inv) => {
    const invoiceTotal = inv.total || inv.amount || 0;
    const paymentsForInvoice = getPaymentsForInvoice(inv.id);
    if (paymentsForInvoice > 0) return sum + Math.min(paymentsForInvoice, invoiceTotal);
    if (inv.status === 'paid') return sum + invoiceTotal;
    if (inv.status === 'partial') return sum + (inv.amountReceived || 0);
    return sum;
  }, 0);
  
  const totalOutstanding = Math.max(0, totalQuoted - totalReceived);
  
  const debitQuoted = clientInvoices.filter(inv => inv.billType === 'debit').reduce((sum, inv) => sum + (inv.total || inv.amount || 0), 0);
  const debitReceived = clientInvoices.filter(inv => inv.billType === 'debit').reduce((sum, inv) => {
    const invoiceTotal = inv.total || inv.amount || 0;
    const paymentsForInvoice = getPaymentsForInvoice(inv.id);
    if (paymentsForInvoice > 0) return sum + Math.min(paymentsForInvoice, invoiceTotal);
    if (inv.status === 'paid') return sum + invoiceTotal;
    if (inv.status === 'partial') return sum + (inv.amountReceived || 0);
    return sum;
  }, 0);
  
  const creditQuoted = clientInvoices.filter(inv => inv.billType === 'credit').reduce((sum, inv) => sum + (inv.total || inv.amount || 0), 0);
  const creditReceived = clientInvoices.filter(inv => inv.billType === 'credit').reduce((sum, inv) => {
    const invoiceTotal = inv.total || inv.amount || 0;
    const paymentsForInvoice = getPaymentsForInvoice(inv.id);
    if (paymentsForInvoice > 0) return sum + Math.min(paymentsForInvoice, invoiceTotal);
    if (inv.status === 'paid') return sum + invoiceTotal;
    if (inv.status === 'partial') return sum + (inv.amountReceived || 0);
    return sum;
  }, 0);
  
  const paidCount = clientInvoices.filter(inv => inv.status === 'paid').length;
  const partialCount = clientInvoices.filter(inv => inv.status === 'partial').length;
  const unpaidCount = clientInvoices.filter(inv => inv.status === 'unpaid').length;
  const collectionRate = totalQuoted > 0 ? ((totalReceived / totalQuoted) * 100).toFixed(1) : '0.0';

  const filteredClients = clients.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusStyles = (status) => {
    switch (status) {
      case 'paid': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle className="w-3 h-3" /> };
      case 'partial': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <Clock className="w-3 h-3" /> };
      case 'unpaid': return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: <AlertCircle className="w-3 h-3" /> };
      default: return { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: <Receipt className="w-3 h-3" /> };
    }
  };

  const getBillTypeStyles = (type) => {
    switch (type) {
      case 'debit': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: <TrendingDown className="w-3 h-3" /> };
      case 'credit': return { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: <TrendingUp className="w-3 h-3" /> };
      default: return { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', icon: <Minus className="w-3 h-3" /> };
    }
  };

  const Badge = ({ styles, label }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles.bg} ${styles.text} ${styles.border}`}>
      {styles.icon}
      {label}
    </span>
  );

  const downloadPDF = () => {
    if (!selectedClient) {
      showToast('Please select a client first', 'error');
      return;
    }

    try {
      const pdfDoc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = pdfDoc.internal.pageSize.getWidth();
      const pageHeight = pdfDoc.internal.pageSize.getHeight();
      const leftMargin = 15;
      const rightMargin = 15;
      const contentWidth = pageWidth - leftMargin - rightMargin;
      let yPos = 15;

      // Header
      pdfDoc.setFillColor(79, 70, 229);
      pdfDoc.roundedRect(leftMargin, yPos, contentWidth, 50, 5, 5, 'F');
      pdfDoc.setTextColor(255, 255, 255);
      pdfDoc.setFontSize(24);
      pdfDoc.setFont(undefined, 'bold');
      pdfDoc.text('CLIENT LEDGER', leftMargin + contentWidth/2, yPos + 18, { align: 'center' });
      pdfDoc.setFontSize(12);
      pdfDoc.text(selectedClient.name, leftMargin + contentWidth/2, yPos + 33, { align: 'center' });
      if (selectedClient.company) {
        pdfDoc.setFontSize(10);
        pdfDoc.text(selectedClient.company, leftMargin + contentWidth/2, yPos + 45, { align: 'center' });
      }
      yPos += 60;

      // Client Details
      pdfDoc.setFillColor(245, 245, 245);
      pdfDoc.roundedRect(leftMargin, yPos, contentWidth, 38, 3, 3, 'F');
      pdfDoc.setTextColor(79, 70, 229);
      pdfDoc.setFontSize(12);
      pdfDoc.setFont(undefined, 'bold');
      pdfDoc.text('CLIENT DETAILS', leftMargin + 5, yPos + 8);
      pdfDoc.setFontSize(10);
      pdfDoc.setFont(undefined, 'normal');
      pdfDoc.setTextColor(0, 0, 0);
      let detailY = yPos + 18;
      pdfDoc.text(`Name: ${selectedClient.name}`, leftMargin + 5, detailY);
      if (selectedClient.company) pdfDoc.text(`Company: ${selectedClient.company}`, leftMargin + 80, detailY);
      detailY += 7;
      if (selectedClient.email) pdfDoc.text(`Email: ${selectedClient.email}`, leftMargin + 5, detailY);
      if (selectedClient.phone) pdfDoc.text(`Phone: ${selectedClient.phone}`, leftMargin + 80, detailY);
      yPos += 48;

      // Financial Summary
      pdfDoc.setFillColor(245, 245, 245);
      pdfDoc.roundedRect(leftMargin, yPos, contentWidth, 45, 3, 3, 'F');
      pdfDoc.setTextColor(79, 70, 229);
      pdfDoc.setFontSize(12);
      pdfDoc.setFont(undefined, 'bold');
      pdfDoc.text('FINANCIAL SUMMARY', leftMargin + 5, yPos + 8);
      pdfDoc.setFontSize(9);
      pdfDoc.setTextColor(0, 0, 0);
      const summaryX = leftMargin + 5;
      let summaryY = yPos + 18;
      pdfDoc.text(`Total Quoted/Invoiced: ${formatAmountWithCurrency(totalQuoted)}`, summaryX, summaryY);
      pdfDoc.text(`Total Received: ${formatAmountWithCurrency(totalReceived)}`, summaryX + 70, summaryY);
      pdfDoc.text(`Total Outstanding: ${formatAmountWithCurrency(totalOutstanding)}`, summaryX + 140, summaryY);
      summaryY += 7;
      pdfDoc.text(`Collection Rate: ${collectionRate}%`, summaryX, summaryY);
      summaryY += 7;
      pdfDoc.text(`Debit - Quoted: ${formatAmountWithCurrency(debitQuoted)} | Received: ${formatAmountWithCurrency(debitReceived)}`, summaryX, summaryY);
      summaryY += 5;
      pdfDoc.text(`Credit - Quoted: ${formatAmountWithCurrency(creditQuoted)} | Received: ${formatAmountWithCurrency(creditReceived)}`, summaryX, summaryY);
      yPos += 55;

      // Invoice Summary Stats
      pdfDoc.setFillColor(79, 70, 229);
      pdfDoc.roundedRect(leftMargin, yPos, contentWidth, 14, 2, 2, 'F');
      pdfDoc.setTextColor(255, 255, 255);
      pdfDoc.setFontSize(13);
      pdfDoc.setFont(undefined, 'bold');
      pdfDoc.text('INVOICE SUMMARY', leftMargin + contentWidth/2, yPos + 10, { align: 'center' });
      yPos += 20;

      const stats = [
        { label: 'Paid', value: paidCount, color: [76, 175, 80] },
        { label: 'Partial', value: partialCount, color: [255, 152, 0] },
        { label: 'Unpaid', value: unpaidCount, color: [244, 67, 54] },
        { label: 'Total', value: clientInvoices.length, color: [79, 70, 229] }
      ];
      const statWidth = contentWidth / stats.length;
      stats.forEach((stat, idx) => {
        const statX = leftMargin + (idx * statWidth);
        pdfDoc.setFillColor(...stat.color);
        pdfDoc.roundedRect(statX + 2, yPos, statWidth - 4, 24, 3, 3, 'F');
        pdfDoc.setTextColor(255, 255, 255);
        pdfDoc.setFontSize(18);
        pdfDoc.setFont(undefined, 'bold');
        pdfDoc.text(stat.value.toString(), statX + statWidth/2, yPos + 14, { align: 'center' });
        pdfDoc.setFontSize(9);
        pdfDoc.text(stat.label, statX + statWidth/2, yPos + 22, { align: 'center' });
      });
      yPos += 32;

      // Invoices Table
      if (filteredInvoices.length > 0) {
        if (yPos > pageHeight - 50) {
          pdfDoc.addPage();
          yPos = 20;
        }

        pdfDoc.setFillColor(79, 70, 229);
        pdfDoc.roundedRect(leftMargin, yPos, contentWidth, 12, 2, 2, 'F');
        pdfDoc.setTextColor(255, 255, 255);
        pdfDoc.setFontSize(12);
        pdfDoc.setFont(undefined, 'bold');
        pdfDoc.text('INVOICE DETAILS', leftMargin + contentWidth/2, yPos + 8, { align: 'center' });
        yPos += 18;

        const tableData = filteredInvoices.map(inv => {
          const invoiceTotal = inv.total || inv.amount || 0;
          const paymentsForInvoice = getPaymentsForInvoice(inv.id);
          const received = paymentsForInvoice > 0
            ? Math.min(paymentsForInvoice, invoiceTotal)
            : inv.status === 'paid'
              ? invoiceTotal
              : (inv.amountReceived || 0);
          const remaining = Math.max(0, invoiceTotal - received);
          const services = inv.selectedServices?.map(s => s.name).join(', ') || inv.service || 'N/A';
          const billTypeLabel = (inv.billType || 'none').charAt(0).toUpperCase() + (inv.billType || 'none').slice(1);
          return [
            inv.invoiceNumber || 'N/A',
            inv.date || 'N/A',
            services.length > 35 ? services.substring(0, 32) + '...' : services,
            billTypeLabel,
            formatAmountWithCurrency(invoiceTotal),
            formatAmountWithCurrency(received),
            formatAmountWithCurrency(remaining),
            inv.status || 'unpaid'
          ];
        });

        // ✅ Fixed: autoTable as standalone function
        autoTable(pdfDoc, {
          startY: yPos,
          head: [['Invoice #', 'Date', 'Services', 'Type', 'Quoted', 'Received', 'Outstanding', 'Status']],
          body: tableData,
          theme: 'striped',
          headStyles: {
            fillColor: [79, 70, 229],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 3
          },
          bodyStyles: {
            fontSize: 7,
            cellPadding: 2.5,
            valign: 'middle'
          },
          alternateRowStyles: {
            fillColor: [248, 248, 250]
          },
          columnStyles: {
            0: { cellWidth: 32 },
            1: { cellWidth: 18 },
            2: { cellWidth: 45 },
            3: { cellWidth: 16, halign: 'center' },
            4: { cellWidth: 22, halign: 'right' },
            5: { cellWidth: 22, halign: 'right' },
            6: { cellWidth: 22, halign: 'right' },
            7: { cellWidth: 18, halign: 'center' }
          },
          margin: { left: leftMargin, right: rightMargin },
          didParseCell: (data) => {
            if (data.column.index === 3 && data.row.index > 0) {
              const invoice = filteredInvoices[data.row.index - 1];
              if (invoice?.billType === 'debit') {
                data.cell.styles.textColor = [200, 0, 0];
                data.cell.styles.fontStyle = 'bold';
              } else if (invoice?.billType === 'credit') {
                data.cell.styles.textColor = [0, 100, 0];
                data.cell.styles.fontStyle = 'bold';
              }
            }
            if (data.column.index === 7 && data.row.index > 0) {
              const invoice = filteredInvoices[data.row.index - 1];
              if (invoice?.status === 'paid') {
                data.cell.styles.textColor = [76, 175, 80];
                data.cell.styles.fontStyle = 'bold';
              } else if (invoice?.status === 'partial') {
                data.cell.styles.textColor = [255, 152, 0];
                data.cell.styles.fontStyle = 'bold';
              } else if (invoice?.status === 'unpaid') {
                data.cell.styles.textColor = [244, 67, 54];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          },
          didDrawPage: (data) => {
            const footerY = pdfDoc.internal.pageSize.getHeight() - 10;
            pdfDoc.setFontSize(8);
            pdfDoc.setTextColor(150, 150, 150);
            pdfDoc.text(`Generated on ${new Date().toLocaleString()}`, leftMargin, footerY);
            pdfDoc.text(`Page ${pdfDoc.internal.getNumberOfPages()}`, pageWidth - rightMargin, footerY, { align: 'right' });
          }
        });

        yPos = pdfDoc.lastAutoTable.finalY + 10;
      }

      // Footer
      const finalY = Math.min(yPos + 10, pageHeight - 25);
      pdfDoc.setDrawColor(79, 70, 229);
      pdfDoc.setLineWidth(0.5);
      pdfDoc.line(leftMargin, finalY, leftMargin + contentWidth, finalY);
      pdfDoc.setFontSize(8);
      pdfDoc.setTextColor(100, 100, 100);
      pdfDoc.text('Building India Digital - Client Ledger Statement', leftMargin + contentWidth/2, finalY + 5, { align: 'center' });
      pdfDoc.setFontSize(7);
      pdfDoc.text('This is a computer generated statement and does not require a signature.', leftMargin + contentWidth/2, finalY + 10, { align: 'center' });

      pdfDoc.save(`Ledger_${selectedClient.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast(`Ledger PDF downloaded for ${selectedClient.name}`, 'success');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      showToast('Error generating PDF. Please try again.', 'error');
    }
  };

  const filterButtons = [
    { key: 'all', label: 'All', count: clientInvoices.length },
    { key: 'debit', label: 'Debit', count: clientInvoices.filter(i => i.billType === 'debit').length },
    { key: 'credit', label: 'Credit', count: clientInvoices.filter(i => i.billType === 'credit').length },
    { key: 'paid', label: 'Paid', count: paidCount },
    { key: 'partial', label: 'Partial', count: partialCount },
    { key: 'unpaid', label: 'Unpaid', count: unpaidCount },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      <div className="px-3 py-4 sm:px-5 sm:py-6 md:px-8 md:py-8 max-w-[1400px] mx-auto space-y-4 sm:space-y-5">

        {toast && (
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        )}

        {/* Page Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-lg flex-shrink-0">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Client Ledger</h1>
              <p className="text-sm text-slate-500 mt-0.5">Complete financial summary per client</p>
            </div>
          </div>
          {selectedClient && (
            <button
              onClick={downloadPDF}
              className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-2 text-sm font-semibold shadow-lg hover:shadow-xl"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          )}
        </div>

        {/* Client Selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Select Client</p>
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:border-indigo-400 hover:bg-white transition-all text-left"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${selectedClient ? 'bg-gradient-to-br from-indigo-400 to-purple-500' : 'bg-slate-200'}`}>
                  {selectedClient
                    ? <span className="text-sm font-black text-white">{selectedClient.name?.charAt(0)?.toUpperCase()}</span>
                    : <User className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="min-w-0">
                  {selectedClient ? (
                    <>
                      <p className="text-sm font-bold text-slate-800 truncate">{selectedClient.name}</p>
                      {selectedClient.company && <p className="text-xs text-slate-500 truncate">{selectedClient.company}</p>}
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">Choose a client to view ledger…</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedClient && (
                  <button
                    onClick={e => { e.stopPropagation(); setSelectedClientId(''); setActiveFilter('all'); }}
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {showDropdown && (
              <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-3 border-b border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search by name or company…"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 outline-none"
                      onClick={e => e.stopPropagation()}
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredClients.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-slate-400 text-center">No clients found</div>
                  ) : (
                    filteredClients.map(client => (
                      <button
                        key={client.id}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-indigo-50 transition-colors ${selectedClientId === client.id ? 'bg-indigo-50' : ''}`}
                        onClick={() => { setSelectedClientId(client.id); setShowDropdown(false); setSearchTerm(''); setActiveFilter('all'); }}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-black text-white">{client.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">{client.name}</p>
                          {client.company && <p className="text-xs text-slate-500 truncate">{client.company}</p>}
                        </div>
                        {selectedClientId === client.id && <CheckCircle className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Empty State */}
        {!selectedClientId && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <BookOpen className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1.5">No Client Selected</h3>
            <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">Select a client from the dropdown to view their complete ledger and financial summary.</p>
          </div>
        )}

        {selectedClient && (
          <>
            {/* Client Banner */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-xl p-5 sm:p-6 text-white relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
              <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/30">
                    <span className="text-2xl font-black text-white">{selectedClient.name?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-white">{selectedClient.name}</h2>
                    {selectedClient.company && <p className="text-indigo-200 text-sm mt-0.5">{selectedClient.company}</p>}
                    <div className="flex flex-wrap gap-4 mt-1.5">
                      {selectedClient.email && (
                        <span className="text-xs text-indigo-200 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                          {selectedClient.email}
                        </span>
                      )}
                      {selectedClient.phone && (
                        <span className="text-xs text-indigo-200 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                          {selectedClient.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white/15 border border-white/20 px-4 py-2.5 rounded-xl w-fit">
                  <Activity className="w-4 h-4 text-white" />
                  <span className="text-sm font-bold text-white">{clientInvoices.length} Invoice{clientInvoices.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            {/* 4 KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Total Quoted', value: `₹${formatAmount(totalQuoted)}`, color: 'blue', icon: <FileText className="w-4 h-4 text-blue-600" />, bar: 'from-blue-400 to-blue-600', barW: '100%' },
                { label: 'Total Received', value: `₹${formatAmount(totalReceived)}`, color: 'emerald', icon: <Wallet className="w-4 h-4 text-emerald-600" />, bar: 'from-emerald-400 to-emerald-600', barW: `${Math.min(100, parseFloat(collectionRate))}%` },
                { label: 'Outstanding', value: `₹${formatAmount(totalOutstanding)}`, color: 'rose', icon: <AlertCircle className="w-4 h-4 text-rose-600" />, bar: 'from-rose-400 to-rose-600', barW: totalQuoted > 0 ? `${Math.min(100, (totalOutstanding / totalQuoted) * 100)}%` : '0%' },
                { label: 'Collection Rate', value: `${collectionRate}%`, color: 'violet', icon: <Percent className="w-4 h-4 text-violet-600" />, bar: 'from-violet-400 to-violet-600', barW: `${Math.min(100, parseFloat(collectionRate))}%` },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 bg-${card.color}-50 rounded-xl`}>{card.icon}</div>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-semibold leading-tight">{card.label}</p>
                  </div>
                  <p className={`text-xl sm:text-2xl font-black text-${card.color === 'blue' ? 'slate-800' : card.color + '-600'} leading-none`}>{card.value}</p>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${card.bar} rounded-full transition-all duration-700`} style={{ width: card.barW }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Debit / Credit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-red-50 rounded-xl"><TrendingDown className="w-4 h-4 text-red-500" /></div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Debit Bills</p>
                      <p className="text-xs text-slate-400">{clientInvoices.filter(i => i.billType === 'debit').length} invoices</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">PAYABLE</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Quoted Amount</p>
                    <p className="text-2xl font-black text-red-600">₹{formatAmount(debitQuoted)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Received Amount</p>
                    <p className="text-lg font-bold text-emerald-600">₹{formatAmount(debitReceived)}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Collection Progress</span>
                    <span className="font-bold text-red-600">{debitQuoted > 0 ? ((debitReceived / debitQuoted) * 100).toFixed(1) : '0'}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-gradient-to-r from-red-400 to-red-600 h-1.5 rounded-full" style={{ width: debitQuoted > 0 ? `${Math.min(100, (debitReceived / debitQuoted) * 100)}%` : '0%' }} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-green-50 rounded-xl"><TrendingUp className="w-4 h-4 text-green-600" /></div>
                    <div>
                      <p className="text-sm font-bold text-slate-700">Credit Bills</p>
                      <p className="text-xs text-slate-400">{clientInvoices.filter(i => i.billType === 'credit').length} invoices</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full">RECEIVABLE</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Quoted Amount</p>
                    <p className="text-2xl font-black text-green-600">₹{formatAmount(creditQuoted)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Received Amount</p>
                    <p className="text-lg font-bold text-emerald-600">₹{formatAmount(creditReceived)}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Collection Progress</span>
                    <span className="font-bold text-green-600">{creditQuoted > 0 ? ((creditReceived / creditQuoted) * 100).toFixed(1) : '0'}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div className="bg-gradient-to-r from-green-400 to-green-600 h-1.5 rounded-full" style={{ width: creditQuoted > 0 ? `${Math.min(100, (creditReceived / creditQuoted) * 100)}%` : '0%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Status Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 bg-emerald-50 rounded-xl"><CheckCircle className="w-4 h-4 text-emerald-600" /></div>
                  <p className="text-sm font-bold text-slate-700">Paid</p>
                </div>
                <p className="text-3xl font-black text-emerald-600">{paidCount}</p>
                <p className="text-xs text-slate-400 mt-1">Invoices</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 bg-amber-50 rounded-xl"><Clock className="w-4 h-4 text-amber-600" /></div>
                  <p className="text-sm font-bold text-slate-700">Partial</p>
                </div>
                <p className="text-3xl font-black text-amber-600">{partialCount}</p>
                <p className="text-xs text-slate-400 mt-1">Invoices</p>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 bg-rose-50 rounded-xl"><AlertCircle className="w-4 h-4 text-rose-600" /></div>
                  <p className="text-sm font-bold text-slate-700">Unpaid</p>
                </div>
                <p className="text-3xl font-black text-rose-600">{unpaidCount}</p>
                <p className="text-xs text-slate-400 mt-1">Invoices</p>
              </div>
            </div>

            {/* Collection Progress */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 rounded-xl"><CircleDollarSign className="w-4 h-4 text-indigo-600" /></div>
                  <p className="text-sm font-bold text-slate-700">Overall Collection Progress</p>
                </div>
                <span className="text-base font-black text-indigo-600">{collectionRate}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden mb-2.5">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-4 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, parseFloat(collectionRate))}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span className="font-medium">₹{formatAmount(totalReceived)} <span className="text-slate-400 font-normal">received</span></span>
                <span className="font-medium text-rose-500">₹{formatAmount(totalOutstanding)} <span className="text-slate-400 font-normal">outstanding</span></span>
              </div>
            </div>

            {/* Invoice Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-50 rounded-xl"><Receipt className="w-4 h-4 text-indigo-600" /></div>
                    <h3 className="text-base font-bold text-slate-800">Invoice History</h3>
                    <span className="text-xs text-slate-400 font-normal">({filteredInvoices.length} shown)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Filter by</span>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {filterButtons.map(f => (
                    <button
                      key={f.key}
                      onClick={() => setActiveFilter(f.key)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                        activeFilter === f.key
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-200'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                    >
                      {f.label}
                      <span className={`w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-black ${activeFilter === f.key ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {f.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {filteredInvoices.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Receipt className="w-7 h-7 text-slate-300" />
                  </div>
                  <p className="text-sm font-bold text-slate-500">No invoices found</p>
                  <p className="text-xs text-slate-400 mt-1">{activeFilter !== 'all' ? 'Try a different filter.' : 'No invoices for this client yet.'}</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          {['Invoice #', 'Date', 'Services', 'Type', 'Quoted', 'Received', 'Outstanding', 'Status'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredInvoices.map((invoice, idx) => {
                          const invoiceTotal = invoice.total || invoice.amount || 0;
                          const paymentsForInvoice = getPaymentsForInvoice(invoice.id);
                          const received = paymentsForInvoice > 0
                            ? Math.min(paymentsForInvoice, invoiceTotal)
                            : invoice.status === 'paid'
                              ? invoiceTotal
                              : (invoice.amountReceived || 0);
                          const outstanding = Math.max(0, invoiceTotal - received);
                          const services = invoice.selectedServices || [];
                          const statusS = getStatusStyles(invoice.status);
                          const billS = getBillTypeStyles(invoice.billType);

                          return (
                            <tr key={invoice.id} className={`border-b border-slate-50 hover:bg-indigo-50/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2">
                                  <div className="bg-indigo-100 p-1.5 rounded-lg"><FileText className="w-3 h-3 text-indigo-600" /></div>
                                  <span className="text-xs font-bold text-slate-800 whitespace-nowrap">{invoice.invoiceNumber}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {invoice.date || '—'}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 max-w-[180px]">
                                {services.length > 0 ? (
                                  <div className="space-y-0.5">
                                    {services.slice(0, 2).map((s, i) => <p key={i} className="text-xs text-slate-600 truncate">{s.name}</p>)}
                                    {services.length > 2 && <p className="text-[10px] text-indigo-500 font-semibold">+{services.length - 2} more</p>}
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">{invoice.service || '—'}</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5">
                                <Badge styles={billS} label={(invoice.billType || 'none').charAt(0).toUpperCase() + (invoice.billType || 'none').slice(1)} />
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="text-sm font-black text-slate-800 whitespace-nowrap">₹{formatAmount(invoiceTotal)}</span>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="text-xs font-bold text-emerald-600 whitespace-nowrap">₹{formatAmount(received)}</span>
                              </td>
                              <td className="px-4 py-3.5">
                                <span className={`text-xs font-bold whitespace-nowrap ${outstanding > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                  {outstanding > 0 ? `₹${formatAmount(outstanding)}` : '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3.5">
                                <Badge styles={statusS} label={invoice.status || 'unpaid'} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden divide-y divide-slate-50">
                    {filteredInvoices.map(invoice => {
                      const invoiceTotal = invoice.total || invoice.amount || 0;
                      const paymentsForInvoice = getPaymentsForInvoice(invoice.id);
                      const received = paymentsForInvoice > 0
                        ? Math.min(paymentsForInvoice, invoiceTotal)
                        : invoice.status === 'paid'
                          ? invoiceTotal
                          : (invoice.amountReceived || 0);
                      const outstanding = Math.max(0, invoiceTotal - received);
                      const services = invoice.selectedServices || [];
                      const statusS = getStatusStyles(invoice.status);
                      const billS = getBillTypeStyles(invoice.billType);

                      return (
                        <div key={invoice.id} className="p-4 hover:bg-indigo-50/20 transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="bg-indigo-100 p-1.5 rounded-lg flex-shrink-0"><FileText className="w-3.5 h-3.5 text-indigo-600" /></div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-800 truncate">{invoice.invoiceNumber}</p>
                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3" />{invoice.date || '—'}</p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <Badge styles={statusS} label={invoice.status || 'unpaid'} />
                              <Badge styles={billS} label={(invoice.billType || 'none').charAt(0).toUpperCase() + (invoice.billType || 'none').slice(1)} />
                            </div>
                          </div>

                          {services.length > 0 && (
                            <div className="mb-3 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                              {services.slice(0, 2).map((s, i) => (
                                <p key={i} className="text-xs text-slate-600 truncate">{i + 1}. {s.name} — ₹{formatAmount(s.amount || 0)}</p>
                              ))}
                              {services.length > 2 && <p className="text-[10px] text-indigo-500 font-semibold mt-0.5">+{services.length - 2} more</p>}
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                              <p className="text-[9px] text-slate-400 font-semibold mb-0.5">QUOTED</p>
                              <p className="text-sm font-black text-slate-800">₹{formatAmount(invoiceTotal)}</p>
                            </div>
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-center">
                              <p className="text-[9px] text-emerald-500 font-semibold mb-0.5">RECEIVED</p>
                              <p className="text-sm font-black text-emerald-600">₹{formatAmount(received)}</p>
                            </div>
                            <div className={`rounded-xl p-2.5 text-center border ${outstanding > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                              <p className={`text-[9px] font-semibold mb-0.5 ${outstanding > 0 ? 'text-rose-500' : 'text-slate-400'}`}>OUTSTANDING</p>
                              <p className={`text-sm font-black ${outstanding > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{outstanding > 0 ? `₹${formatAmount(outstanding)}` : '—'}</p>
                            </div>
                          </div>

                          {invoice.status === 'partial' && invoiceTotal > 0 && (
                            <div className="mt-3">
                              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                <span>Payment progress</span>
                                <span className="font-bold text-amber-600">{((received / invoiceTotal) * 100).toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-gradient-to-r from-amber-400 to-amber-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, (received / invoiceTotal) * 100)}%` }} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {filteredInvoices.length > 0 && (
                <div className="px-4 sm:px-5 py-3.5 border-t border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 font-medium">{filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} shown</span>
                  <div className="flex gap-4 text-xs">
                    <span className="text-slate-500">Total Quoted: <span className="font-black text-slate-800">₹{formatAmount(filteredInvoices.reduce((s, i) => s + (i.total || i.amount || 0), 0))}</span></span>
                    <span className="text-slate-500">Total Received: <span className="font-black text-emerald-600">₹{formatAmount(filteredInvoices.reduce((s, i) => {
                      const total = i.total || i.amount || 0;
                      const pmts = getPaymentsForInvoice(i.id);
                      return s + (pmts > 0 ? Math.min(pmts, total) : (i.status === 'paid' ? total : (i.amountReceived || 0)));
                    }, 0))}</span></span>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
