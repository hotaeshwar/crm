import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import { 
  FileText, Download, Edit2, Trash2, Save, X, 
  Plus, DollarSign, Calendar, User, Briefcase,
  CheckCircle, Clock, AlertCircle, Receipt, Tag
} from 'lucide-react';

export default function InvoiceManagement() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    clientId: '', 
    selectedServices: [],
    date: new Date().toISOString().split('T')[0], 
    status: 'unpaid',
    paymentDays: 30,
    amountReceived: 0,
    tax: 0
  });

  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [editForm, setEditForm] = useState({
    selectedServices: [],
    tax: 0,
    status: 'unpaid',
    paymentDays: 30,
    amountReceived: 0
  });

  const [editServiceName, setEditServiceName] = useState('');
  const [editServiceAmount, setEditServiceAmount] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceAmount, setNewServiceAmount] = useState('');

  useEffect(() => {
    const unsubClients = onSnapshot(collection(db, 'clients'), (s) => {
      const clientsData = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setClients(clientsData);
    });
    
    const unsubInvoices = onSnapshot(collection(db, 'invoices'), (s) => 
      setInvoices(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    return () => { 
      unsubClients(); 
      unsubInvoices(); 
    };
  }, []);

  const calculateTotalAmount = (services) => {
    return services.reduce((total, service) => {
      const amount = parseFloat(service.amount) || 0;
      return total + amount;
    }, 0);
  };

  const handleEditClick = (invoice) => {
    setEditingInvoiceId(invoice.id);
    
    const services = invoice.selectedServices && invoice.selectedServices.length > 0
      ? invoice.selectedServices
      : (invoice.service ? invoice.service.split(',').map(s => ({
          name: s.trim(),
          amount: 0
        })) : []);
    
    setEditForm({
      selectedServices: services,
      tax: invoice.taxPercentage || 0,
      status: invoice.status || 'unpaid',
      paymentDays: invoice.paymentDays || 30,
      amountReceived: invoice.amountReceived || 0
    });
    
    setEditServiceName('');
    setEditServiceAmount('');
  };

  const handleAddServiceInEdit = () => {
    if (editServiceName.trim() && editServiceAmount) {
      setEditForm({
        ...editForm,
        selectedServices: [
          ...editForm.selectedServices,
          { name: editServiceName.trim(), amount: editServiceAmount }
        ]
      });
      setEditServiceName('');
      setEditServiceAmount('');
    }
  };

  const handleRemoveServiceInEdit = (index) => {
    setEditForm({
      ...editForm,
      selectedServices: editForm.selectedServices.filter((_, i) => i !== index)
    });
  };

  const handleUpdateServiceInEdit = (index, field, value) => {
    const updatedServices = [...editForm.selectedServices];
    updatedServices[index][field] = value;
    setEditForm({
      ...editForm,
      selectedServices: updatedServices
    });
  };

  const handleSaveEdit = async (invoiceId) => {
    try {
      const subtotal = calculateTotalAmount(editForm.selectedServices);
      const taxPercentage = parseFloat(editForm.tax) || 0;
      const taxAmount = (subtotal * taxPercentage) / 100;
      const total = subtotal + taxAmount;
      const amountReceived = parseFloat(editForm.amountReceived) || 0;

      const serviceString = editForm.selectedServices.map(s => s.name).join(', ');

      await updateDoc(doc(db, 'invoices', invoiceId), {
        service: serviceString,
        selectedServices: editForm.selectedServices,
        subtotal: subtotal,
        taxPercentage: taxPercentage,
        taxAmount: taxAmount,
        total: total,
        status: editForm.status,
        paymentDays: parseInt(editForm.paymentDays) || 30,
        amountReceived: amountReceived,
        remainingAmount: total - amountReceived
      });

      setEditingInvoiceId(null);
      setEditForm({ selectedServices: [], tax: 0, status: 'unpaid', paymentDays: 30, amountReceived: 0 });
      setEditServiceName('');
      setEditServiceAmount('');
    } catch (error) {
      console.error('Error updating invoice:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingInvoiceId(null);
    setEditForm({ selectedServices: [], tax: 0, status: 'unpaid', paymentDays: 30, amountReceived: 0 });
    setEditServiceName('');
    setEditServiceAmount('');
  };

  const handleAddService = () => {
    if (newServiceName.trim() && newServiceAmount) {
      setForm({
        ...form,
        selectedServices: [
          ...form.selectedServices,
          { name: newServiceName.trim(), amount: newServiceAmount }
        ]
      });
      setNewServiceName('');
      setNewServiceAmount('');
    }
  };

  const handleRemoveService = (index) => {
    setForm({
      ...form,
      selectedServices: form.selectedServices.filter((_, i) => i !== index)
    });
  };

  const handleUpdateService = (index, field, value) => {
    const updatedServices = [...form.selectedServices];
    updatedServices[index][field] = value;
    setForm({
      ...form,
      selectedServices: updatedServices
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const subtotal = calculateTotalAmount(form.selectedServices);
    const taxPercentage = parseFloat(form.tax) || 0;
    const taxAmount = (subtotal * taxPercentage) / 100;
    const total = subtotal + taxAmount;
    const amountReceived = parseFloat(form.amountReceived) || 0;
    
    const serviceString = form.selectedServices.map(s => s.name).join(', ');
    
    await addDoc(collection(db, 'invoices'), {
      clientId: form.clientId,
      service: serviceString,
      selectedServices: form.selectedServices,
      subtotal: subtotal,
      taxPercentage: taxPercentage,
      taxAmount: taxAmount,
      total: total,
      invoiceNumber: `INV-${Date.now()}`,
      date: form.date,
      status: form.status,
      paymentDays: parseInt(form.paymentDays) || 30,
      amountReceived: amountReceived,
      remainingAmount: total - amountReceived,
      createdAt: new Date()
    });
    
    setForm({ 
      clientId: '', 
      selectedServices: [],
      date: new Date().toISOString().split('T')[0], 
      status: 'unpaid',
      paymentDays: 30,
      amountReceived: 0,
      tax: 0
    });
    setNewServiceName('');
    setNewServiceAmount('');
  };

  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0';
    
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatAmountWithCurrency = (amount) => {
    return `Rs. ${formatAmount(amount)}`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
      case 'partial': return <Clock className="w-3 h-3 sm:w-4 sm:h-4" />;
      case 'unpaid': return <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
      default: return <FileText className="w-3 h-3 sm:w-4 sm:h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'partial': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'unpaid': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const downloadPDF = async (invoice) => {
    const client = clients.find(c => c.id === invoice.clientId);
    const pdfDoc = new jsPDF();
    
    const pageWidth = pdfDoc.internal.pageSize.getWidth();
    const pageHeight = pdfDoc.internal.pageSize.getHeight();
    const leftMargin = 15;
    const rightMargin = 15;
    const contentWidth = pageWidth - leftMargin - rightMargin;
    
    let yPos = 12;
    
    // LOGO SECTION
    const logoDisplayWidth = 70;
    
    try {
      const img = new Image();
      img.src = '/images/LOGO.png';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        setTimeout(reject, 500);
      });
      
      const imageAspectRatio = img.naturalHeight / img.naturalWidth;
      const logoDisplayHeight = logoDisplayWidth * imageAspectRatio;
      const logoX = (pageWidth - logoDisplayWidth) / 2;
      
      pdfDoc.addImage(img, 'PNG', logoX, yPos, logoDisplayWidth, logoDisplayHeight, undefined, 'FAST');
      yPos += logoDisplayHeight + 8;
      
    } catch (error) {
      const fallbackHeight = 55;
      const logoX = (pageWidth - logoDisplayWidth) / 2;
      pdfDoc.setFillColor(255, 152, 0);
      pdfDoc.roundedRect(logoX, yPos, logoDisplayWidth, fallbackHeight, 3, 3, 'F');
      pdfDoc.setTextColor(255, 255, 255);
      pdfDoc.setFontSize(24);
      pdfDoc.setFont(undefined, 'bold');
      pdfDoc.text('BID', logoX + logoDisplayWidth/2, yPos + fallbackHeight/2 + 5, { align: 'center' });
      yPos += fallbackHeight + 8;
    }
    
    // Address - INCREASED FONT SIZE AND BOLD
    pdfDoc.setTextColor(0, 0, 0);
    pdfDoc.setFontSize(11);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('SCO 246, Devaji Plaza, VIP Road', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    pdfDoc.text('Zirakpur, India', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    pdfDoc.text('marketing@buildingindiadigital.com', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    pdfDoc.text('For any enquiry, Call Us:', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    pdfDoc.setFontSize(12);
    pdfDoc.text('+919041499964', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // Invoice title - INCREASED SIZE
    pdfDoc.setFillColor(255, 152, 0);
    pdfDoc.roundedRect(leftMargin, yPos, contentWidth, 12, 2, 2, 'F');
    pdfDoc.setTextColor(255, 255, 255);
    pdfDoc.setFontSize(16);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('TAX INVOICE', leftMargin + contentWidth/2, yPos + 8, { align: 'center' });
    
    yPos += 22;
    const columnWidth = contentWidth / 2;
    
    // INVOICE DETAILS - INCREASED FONT SIZE
    pdfDoc.setTextColor(0, 0, 0);
    pdfDoc.setFontSize(11);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('INVOICE DETAILS', leftMargin, yPos);
    
    pdfDoc.setFontSize(10);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('Invoice Number:', leftMargin, yPos + 8);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text(invoice.invoiceNumber, leftMargin + 38, yPos + 8);
    
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('Invoice Date:', leftMargin, yPos + 16);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text(invoice.date, leftMargin + 38, yPos + 16);
    
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('Due Date:', leftMargin, yPos + 24);
    const dueDate = new Date(invoice.date);
    const paymentDays = invoice.paymentDays || 30;
    dueDate.setDate(dueDate.getDate() + paymentDays);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text(dueDate.toISOString().split('T')[0], leftMargin + 38, yPos + 24);
    
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('Status:', leftMargin, yPos + 32);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text((invoice.status || 'unpaid').toUpperCase(), leftMargin + 38, yPos + 32);
    
    // Client details - INCREASED FONT SIZE
    pdfDoc.setFontSize(11);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('BILL TO', leftMargin + columnWidth, yPos);
    pdfDoc.setFontSize(10);
    pdfDoc.setFont(undefined, 'bold');
    
    const clientName = client?.name || 'Client Name';
    const clientCompany = client?.company || '';
    const clientEmail = client?.email || '';
    const clientPhone = client?.phone || '';
    
    pdfDoc.text(clientName, leftMargin + columnWidth, yPos + 8);
    
    let lineOffset = 8;
    if (clientCompany) {
      lineOffset += 8;
      pdfDoc.text(clientCompany, leftMargin + columnWidth, yPos + lineOffset);
    }
    if (clientEmail) {
      lineOffset += 8;
      pdfDoc.text(clientEmail, leftMargin + columnWidth, yPos + lineOffset);
    }
    if (clientPhone) {
      lineOffset += 8;
      pdfDoc.text(clientPhone, leftMargin + columnWidth, yPos + lineOffset);
    }
    
    // Items table
    yPos += 50;
    
    const services = invoice.selectedServices || 
                    (invoice.service ? invoice.service.split(',').map(s => ({
                      name: s.trim(),
                      amount: 0
                    })) : []);
    
    const headerHeight = 10;
    const rowHeight = 10;
    const totalTableHeight = headerHeight + (rowHeight * services.length);
    
    // Table header - INCREASED FONT SIZE
    pdfDoc.setFillColor(76, 175, 80);
    pdfDoc.roundedRect(leftMargin, yPos, contentWidth, headerHeight, 2, 2, 'F');
    pdfDoc.setTextColor(255, 255, 255);
    pdfDoc.setFontSize(11);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('S.NO', leftMargin + 3, yPos + 7);
    pdfDoc.text('DESCRIPTION', leftMargin + 20, yPos + 7);
    pdfDoc.text('AMOUNT', leftMargin + contentWidth - 5, yPos + 7, { align: 'right' });
    
    yPos += headerHeight;
    
    // Table border
    pdfDoc.setDrawColor(200, 200, 200);
    pdfDoc.setLineWidth(0.2);
    pdfDoc.rect(leftMargin, yPos - headerHeight, contentWidth, totalTableHeight);
    pdfDoc.line(leftMargin + 15, yPos - headerHeight, leftMargin + 15, yPos - headerHeight + totalTableHeight);
    pdfDoc.line(leftMargin + 100, yPos - headerHeight, leftMargin + 100, yPos - headerHeight + totalTableHeight);
    
    // Services - INCREASED FONT SIZE AND BOLD
    pdfDoc.setTextColor(0, 0, 0);
    pdfDoc.setFontSize(10);
    pdfDoc.setFont(undefined, 'bold');
    
    let serviceY = yPos;
    let subtotal = 0;
    
    services.forEach((service, index) => {
      pdfDoc.setFont(undefined, 'bold');
      pdfDoc.text(`${index + 1}`, leftMargin + 7, serviceY + 7);
      
      const serviceText = service.name.length > 35 ? service.name.substring(0, 32) + '...' : service.name;
      pdfDoc.setFont(undefined, 'bold');
      pdfDoc.text(serviceText, leftMargin + 18, serviceY + 7);
      
      const serviceAmount = parseFloat(service.amount) || 0;
      subtotal += serviceAmount;
      pdfDoc.setFont(undefined, 'bold');
      pdfDoc.text(formatAmountWithCurrency(serviceAmount), leftMargin + contentWidth - 5, serviceY + 7, { align: 'right' });
      
      if (index < services.length - 1) {
        pdfDoc.setDrawColor(200, 200, 200);
        pdfDoc.setLineWidth(0.2);
        pdfDoc.line(leftMargin, serviceY + rowHeight, leftMargin + contentWidth, serviceY + rowHeight);
      }
      
      serviceY += rowHeight;
    });
    
    // Totals section - INCREASED FONT SIZE AND BOLD
    yPos = serviceY + 12;
    const totalsX = leftMargin + 90;
    
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.setFontSize(11);
    pdfDoc.setTextColor(0, 0, 0);
    pdfDoc.text('Subtotal:', totalsX, yPos);
    pdfDoc.text(formatAmountWithCurrency(invoice.subtotal || subtotal), leftMargin + contentWidth - 5, yPos, { align: 'right' });
    
    yPos += 8;
    const taxPercentage = invoice.taxPercentage || 0;
    pdfDoc.text(`Tax (${taxPercentage}%):`, totalsX, yPos);
    pdfDoc.text(formatAmountWithCurrency(invoice.taxAmount || 0), leftMargin + contentWidth - 5, yPos, { align: 'right' });
    
    yPos += 4;
    pdfDoc.setDrawColor(255, 152, 0);
    pdfDoc.setLineWidth(0.5);
    pdfDoc.line(totalsX, yPos, leftMargin + contentWidth, yPos);
    
    yPos += 9;
    pdfDoc.setFillColor(255, 243, 224);
    pdfDoc.roundedRect(totalsX - 5, yPos - 6, contentWidth - (totalsX - leftMargin) + 5, 12, 2, 2, 'F');
    
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.setFontSize(13);
    pdfDoc.text('TOTAL:', totalsX, yPos);
    pdfDoc.text(formatAmountWithCurrency(invoice.total || invoice.amount), leftMargin + contentWidth - 5, yPos, { align: 'right' });
    
    // PARTIAL PAYMENT SECTION - INCREASED FONT SIZE AND BOLD
    yPos += 10;
    
    const invoiceStatus = String(invoice.status || '').toLowerCase();
    const receivedAmount = parseFloat(invoice.amountReceived || 0);
    const remainAmount = parseFloat(invoice.remainingAmount || 0);
    
    if (invoiceStatus === 'partial' && receivedAmount > 0) {
      // Separator line
      pdfDoc.setDrawColor(255, 152, 0);
      pdfDoc.setLineWidth(0.3);
      pdfDoc.line(totalsX, yPos, leftMargin + contentWidth, yPos);
      
      yPos += 8;
      
      // Amount Received
      pdfDoc.setFont(undefined, 'bold');
      pdfDoc.setFontSize(11);
      pdfDoc.setTextColor(0, 0, 0);
      pdfDoc.text('Amount Received:', totalsX, yPos);
      pdfDoc.setFont(undefined, 'bold');
      pdfDoc.setTextColor(34, 139, 34);
      pdfDoc.text(formatAmountWithCurrency(receivedAmount), leftMargin + contentWidth - 5, yPos, { align: 'right' });
      
      yPos += 8;
      
      // Remaining Amount
      pdfDoc.setFillColor(255, 248, 220);
      pdfDoc.roundedRect(totalsX - 5, yPos - 6, contentWidth - (totalsX - leftMargin) + 5, 12, 2, 2, 'F');
      
      pdfDoc.setFont(undefined, 'bold');
      pdfDoc.setFontSize(12);
      pdfDoc.setTextColor(255, 140, 0);
      pdfDoc.text('REMAINING:', totalsX, yPos);
      pdfDoc.text(formatAmountWithCurrency(remainAmount), leftMargin + contentWidth - 5, yPos, { align: 'right' });
      
      yPos += 10;
    }
    
    // Footer - INCREASED FONT SIZE AND BOLD
    const footerY = pageHeight - 30;
    yPos += 12;
    const separatorY = Math.min(yPos, footerY - 15);
    
    pdfDoc.setDrawColor(76, 175, 80);
    pdfDoc.setLineWidth(0.5);
    pdfDoc.line(leftMargin, separatorY, leftMargin + contentWidth, separatorY);
    
    pdfDoc.setTextColor(0, 0, 0);
    pdfDoc.setFontSize(10);
    pdfDoc.setFont(undefined, 'bold');
    
    pdfDoc.text('Thank you for your business!', leftMargin + contentWidth/2, footerY - 10, { align: 'center' });
    pdfDoc.setFontSize(9);
    pdfDoc.text('For any queries: marketing@buildingindiadigital.com | +919041499964', leftMargin + contentWidth/2, footerY - 3, { align: 'center' });
    pdfDoc.text('Building India Digital © 2026', leftMargin + contentWidth/2, footerY + 4, { align: 'center' });
    
    pdfDoc.save(`${invoice.invoiceNumber}.pdf`);
  };

  // UI COMPONENT CONTINUES...
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50">
      <div className="px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6 lg:px-8 lg:py-8 max-w-[1600px] mx-auto">
        
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-2.5 sm:gap-3 lg:gap-4">
              <div className="p-2 sm:p-2.5 lg:p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl sm:rounded-2xl shadow-lg flex-shrink-0">
                <Receipt className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 truncate">Invoice Management</h2>
                <p className="text-xs sm:text-sm lg:text-base text-slate-600 mt-0.5 sm:mt-1">Create and manage invoices</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600 px-3 py-2 sm:px-4 sm:py-2 bg-white rounded-lg sm:rounded-xl border border-slate-200 shadow-sm w-fit">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="font-medium">{invoices.length} Invoice{invoices.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-white p-3 sm:p-4 md:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-lg mb-4 sm:mb-6 lg:mb-8 border border-slate-200">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 lg:mb-5">
            <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg flex-shrink-0">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-slate-800">Create New Invoice</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="relative">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Client
              </label>
              <select 
                value={form.clientId} 
                onChange={(e) => setForm({...form, clientId: e.target.value})}
                className="w-full border border-slate-300 rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50" 
                required
              >
                <option value="">Select Client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.company || c.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="relative">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Date
              </label>
              <input 
                type="date" 
                value={form.date}
                onChange={(e) => setForm({...form, date: e.target.value})}
                className="w-full border border-slate-300 rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50" 
              />
            </div>
            
            <div className="relative">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Payment Days
              </label>
              <input 
                type="number" 
                placeholder="e.g., 30" 
                value={form.paymentDays}
                onChange={(e) => setForm({...form, paymentDays: e.target.value})}
                className="w-full border border-slate-300 rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
                min="1"
              />
              <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Days to receive full payment</p>
            </div>
            
            <div className="relative">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-1.5">
                Tax % (Optional)
              </label>
              <input 
                type="number" 
                placeholder="e.g., 18" 
                value={form.tax}
                onChange={(e) => setForm({...form, tax: e.target.value})}
                className="w-full border border-slate-300 rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            
            <div className="relative">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-1.5">
                Status
              </label>
              <select 
                value={form.status}
                onChange={(e) => setForm({...form, status: e.target.value})}
                className="w-full border border-slate-300 rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
              >
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
              </select>
            </div>
            
            {form.status === 'partial' && (
              <div className="relative">
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-1.5 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Amount Received (₹)
                </label>
                <input 
                  type="number" 
                  placeholder="Enter received amount" 
                  value={form.amountReceived}
                  onChange={(e) => setForm({...form, amountReceived: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-slate-50"
                  min="0"
                />
              </div>
            )}
          </div>
          
          <div className="mt-4 sm:mt-5 lg:mt-6 p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl border border-blue-200">
            <h4 className="font-semibold text-slate-800 text-sm sm:text-base mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
              <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Add Services
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Service Name</label>
                <input
                  type="text"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  placeholder="e.g., Website Development"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">Amount (₹)</label>
                <div className="flex gap-1.5 sm:gap-2">
                  <input
                    type="number"
                    value={newServiceAmount}
                    onChange={(e) => setNewServiceAmount(e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    placeholder="Enter amount"
                    min="0"
                  />
                  <button
                    type="button"
                    onClick={handleAddService}
                    disabled={!newServiceName.trim() || !newServiceAmount}
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg flex items-center gap-1 sm:gap-1.5 font-medium text-xs sm:text-sm ${
                      !newServiceName.trim() || !newServiceAmount
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Add</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {form.selectedServices.length > 0 && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-200">
              <h4 className="font-semibold text-slate-800 text-sm sm:text-base mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Selected Services ({form.selectedServices.length})
              </h4>
              <div className="space-y-2 sm:space-y-3">
                {form.selectedServices.map((service, index) => (
                  <div key={index} className="bg-white p-2.5 sm:p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                        <span className="text-xs sm:text-sm font-medium text-slate-500 flex-shrink-0">{index + 1}.</span>
                        <input
                          type="text"
                          value={service.name}
                          onChange={(e) => handleUpdateService(index, 'name', e.target.value)}
                          className="flex-1 min-w-0 border border-slate-300 rounded px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium text-slate-800"
                          placeholder="Service name"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveService(index)}
                        className="text-rose-600 hover:text-rose-800 p-1 ml-1.5 sm:ml-2 flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] sm:text-xs text-slate-600 mb-1">Amount (₹)</label>
                        <input
                          type="number"
                          value={service.amount}
                          onChange={(e) => handleUpdateService(index, 'amount', e.target.value)}
                          className="w-full border border-slate-300 rounded px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm"
                          placeholder="Enter amount"
                          min="0"
                        />
                      </div>
                      <div className="mt-4 sm:mt-5">
                        <span className="text-xs sm:text-sm font-medium text-slate-700">
                          {service.amount ? `₹${formatAmount(service.amount)}` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800 text-sm sm:text-base">Services Total:</span>
                      <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1">Sum of all service amounts</p>
                    </div>
                    <div className="text-right">
                      <span className="text-base sm:text-lg lg:text-xl font-bold text-slate-900">₹{formatAmount(calculateTotalAmount(form.selectedServices))}</span>
                      <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5 sm:mt-1">{form.selectedServices.length} service{form.selectedServices.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {form.selectedServices.length > 0 && (
            <div className="mt-4 sm:mt-5 lg:mt-6 p-3 sm:p-4 bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 rounded-lg sm:rounded-xl border border-orange-200">
              <h4 className="font-bold text-slate-800 text-sm sm:text-base mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Invoice Preview
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                <div className="bg-white p-2 sm:p-2.5 lg:p-3 rounded-lg shadow-sm">
                  <span className="text-[10px] sm:text-xs text-slate-600 block mb-0.5 sm:mb-1">Subtotal</span>
                  <span className="text-sm sm:text-base lg:text-lg font-bold text-slate-800 truncate block">₹{formatAmount(calculateTotalAmount(form.selectedServices))}</span>
                </div>
                <div className="bg-white p-2 sm:p-2.5 lg:p-3 rounded-lg shadow-sm">
                  <span className="text-[10px] sm:text-xs text-slate-600 block mb-0.5 sm:mb-1">Tax ({form.tax || 0}%)</span>
                  <span className="text-sm sm:text-base lg:text-lg font-bold text-orange-600 truncate block">₹{formatAmount((calculateTotalAmount(form.selectedServices) * parseFloat(form.tax || 0)) / 100)}</span>
                </div>
                <div className="bg-white p-2 sm:p-2.5 lg:p-3 rounded-lg shadow-sm">
                  <span className="text-[10px] sm:text-xs text-slate-600 block mb-0.5 sm:mb-1">Total Amount</span>
                  <span className="text-sm sm:text-base lg:text-lg font-bold text-emerald-600 truncate block">
                    ₹{formatAmount(calculateTotalAmount(form.selectedServices) + (calculateTotalAmount(form.selectedServices) * parseFloat(form.tax || 0)) / 100)}
                  </span>
                </div>
                {form.status === 'partial' && form.amountReceived > 0 && (
                  <div className="bg-white p-2 sm:p-2.5 lg:p-3 rounded-lg shadow-sm border-2 border-amber-300">
                    <span className="text-[10px] sm:text-xs text-slate-600 block mb-0.5 sm:mb-1">Remaining</span>
                    <span className="text-sm sm:text-base lg:text-lg font-bold text-amber-600 truncate block">
                      ₹{formatAmount((calculateTotalAmount(form.selectedServices) + (calculateTotalAmount(form.selectedServices) * parseFloat(form.tax || 0)) / 100) - parseFloat(form.amountReceived))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={form.selectedServices.length === 0 || !form.clientId}
            className={`mt-4 sm:mt-5 lg:mt-6 w-full sm:w-auto px-5 py-2.5 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 sm:gap-2 font-medium text-sm sm:text-base ${
              form.selectedServices.length === 0 || !form.clientId
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
            }`}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            Create Invoice
          </button>
        </form>
        
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-3 sm:p-4 lg:p-5 bg-gradient-to-r from-slate-50 via-orange-50 to-amber-50 border-b border-slate-200">
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-slate-800 flex items-center gap-1.5 sm:gap-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              All Invoices
            </h3>
          </div>
          
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 lg:px-4 lg:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Invoice #</th>
                  <th className="px-3 py-3 lg:px-4 lg:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Client</th>
                  <th className="px-3 py-3 lg:px-4 lg:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Services</th>
                  <th className="px-3 py-3 lg:px-4 lg:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Subtotal</th>
                  <th className="px-3 py-3 lg:px-4 lg:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tax</th>
                  <th className="px-3 py-3 lg:px-4 lg:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Total</th>
                  <th className="px-3 py-3 lg:px-4 lg:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Payment Info</th>
                  <th className="px-3 py-3 lg:px-4 lg:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 lg:px-4 lg:py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 lg:py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <div className="p-3 lg:p-4 bg-slate-50 rounded-full">
                          <FileText className="w-10 h-10 lg:w-12 lg:h-12" />
                        </div>
                        <p className="text-base lg:text-lg font-medium text-slate-600">No invoices found</p>
                        <p className="text-sm text-slate-500">Create your first invoice using the form above!</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  invoices.map(invoice => {
                    const client = clients.find(c => c.id === invoice.clientId);
                    const isEditing = editingInvoiceId === invoice.id;
                    const services = invoice.selectedServices || [];
                    
                    return (
                      <tr key={invoice.id} className="hover:bg-slate-50">
                        <td className="px-3 py-3 lg:px-4 lg:py-4">
                          <span className="font-mono text-xs sm:text-sm font-medium text-slate-900">{invoice.invoiceNumber}</span>
                        </td>
                        <td className="px-3 py-3 lg:px-4 lg:py-4">
                          <span className="text-xs sm:text-sm text-slate-900 truncate block max-w-[150px]">{client?.name || 'N/A'}</span>
                        </td>
                        
                        <td className="px-3 py-3 lg:px-4 lg:py-4">
                          {isEditing ? (
                            <div className="space-y-2 max-w-xs">
                              <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                <div className="text-xs font-semibold text-slate-700 mb-1">Add New Service:</div>
                                <div className="flex gap-1 mb-2">
                                  <input
                                    type="text"
                                    value={editServiceName}
                                    onChange={(e) => setEditServiceName(e.target.value)}
                                    className="flex-1 border rounded px-2 py-1 text-xs"
                                    placeholder="Service name"
                                  />
                                  <input
                                    type="number"
                                    value={editServiceAmount}
                                    onChange={(e) => setEditServiceAmount(e.target.value)}
                                    className="w-20 border rounded px-2 py-1 text-xs"
                                    placeholder="Amount"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleAddServiceInEdit}
                                    className="bg-blue-600 text-white px-2 rounded text-xs hover:bg-blue-700"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                              
                              <div className="space-y-1">
                                {editForm.selectedServices.map((service, idx) => (
                                  <div key={idx} className="flex items-center gap-1 bg-white p-1 rounded border">
                                    <input
                                      type="text"
                                      value={service.name}
                                      onChange={(e) => handleUpdateServiceInEdit(idx, 'name', e.target.value)}
                                      className="flex-1 border rounded px-2 py-1 text-xs"
                                    />
                                    <input
                                      type="number"
                                      value={service.amount}
                                      onChange={(e) => handleUpdateServiceInEdit(idx, 'amount', e.target.value)}
                                      className="w-20 border rounded px-2 py-1 text-xs"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveServiceInEdit(idx)}
                                      className="text-rose-600 p-1"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {services.length > 0 ? (
                                services.map((service, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-xs sm:text-sm">
                                    <div className="flex items-start min-w-0 flex-1">
                                      <span className="text-slate-500 mr-2 flex-shrink-0">{idx + 1}.</span>
                                      <span className="text-slate-700 truncate">{service.name}</span>
                                    </div>
                                    <span className="font-medium text-slate-900 ml-2 flex-shrink-0">₹{formatAmount(service.amount || 0)}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs sm:text-sm text-slate-400">No services</span>
                              )}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-3 py-3 lg:px-4 lg:py-4">
                          <span className="text-xs sm:text-sm font-medium text-slate-900">
                            {formatAmountWithCurrency(isEditing ? calculateTotalAmount(editForm.selectedServices) : (invoice.subtotal || invoice.amount))}
                          </span>
                        </td>
                        
                        <td className="px-3 py-3 lg:px-4 lg:py-4">
                          {isEditing ? (
                            <div className="space-y-1">
                              <input 
                                type="number"
                                value={editForm.tax}
                                onChange={(e) => setEditForm({...editForm, tax: e.target.value})}
                                className="border rounded px-2 py-1 w-20 text-xs sm:text-sm"
                                placeholder="Tax %"
                                min="0"
                                max="100"
                                step="0.1"
                              />
                            </div>
                          ) : (
                            <div className="text-xs sm:text-sm">
                              <div className="font-medium text-slate-900">{invoice.taxPercentage ? `${invoice.taxPercentage}%` : '0%'}</div>
                              <div className="text-xs text-slate-500 truncate">{formatAmountWithCurrency(invoice.taxAmount || 0)}</div>
                            </div>
                          )}
                        </td>
                        
                        <td className="px-3 py-3 lg:px-4 lg:py-4">
                          {isEditing ? (
                            <span className="text-xs sm:text-sm font-bold text-emerald-600">
                              ₹{formatAmount(
                                calculateTotalAmount(editForm.selectedServices) + 
                                (calculateTotalAmount(editForm.selectedServices) * parseFloat(editForm.tax)) / 100
                              )}
                            </span>
                          ) : (
                            <span className="text-xs sm:text-sm font-bold text-emerald-600">{formatAmountWithCurrency(invoice.total || invoice.amount)}</span>
                          )}
                        </td>
                        
                        <td className="px-3 py-3 lg:px-4 lg:py-4">
                          {isEditing ? (
                            <div className="space-y-2">
                              <div>
                                <label className="text-xs text-slate-600">Payment Days:</label>
                                <input 
                                  type="number"
                                  value={editForm.paymentDays}
                                  onChange={(e) => setEditForm({...editForm, paymentDays: e.target.value})}
                                  className="border rounded px-2 py-1 w-20 text-xs sm:text-sm mt-1"
                                  placeholder="Days"
                                  min="1"
                                />
                              </div>
                              {editForm.status === 'partial' && (
                                <div>
                                  <label className="text-xs text-slate-600">Received:</label>
                                  <input 
                                    type="number"
                                    value={editForm.amountReceived}
                                    onChange={(e) => setEditForm({...editForm, amountReceived: e.target.value})}
                                    className="border rounded px-2 py-1 w-24 text-xs sm:text-sm mt-1"
                                    placeholder="Amount"
                                    min="0"
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs sm:text-sm space-y-1">
                              <div className="text-slate-600">
                                <span className="font-medium">{invoice.paymentDays || 30}</span> days
                              </div>
                              {invoice.status === 'partial' && (
                                <div className="bg-amber-50 p-2 rounded border border-amber-200">
                                  <div className="text-xs text-slate-600">Received:</div>
                                  <div className="font-medium text-amber-700">₹{formatAmount(invoice.amountReceived || 0)}</div>
                                  <div className="text-xs text-slate-600 mt-1">Remaining:</div>
                                  <div className="font-bold text-amber-900">₹{formatAmount(invoice.remainingAmount || 0)}</div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-3 py-3 lg:px-4 lg:py-4">
                          {isEditing ? (
                            <select 
                              value={editForm.status}
                              onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                              className="border rounded px-2 py-1 text-xs sm:text-sm"
                            >
                              <option value="unpaid">Unpaid</option>
                              <option value="paid">Paid</option>
                              <option value="partial">Partial</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                              {getStatusIcon(invoice.status)}
                              <span className="capitalize">{invoice.status || 'unpaid'}</span>
                            </span>
                          )}
                        </td>
                        
                        <td className="px-3 py-3 lg:px-4 lg:py-4">
                          {isEditing ? (
                            <div className="flex gap-1.5">
                              <button 
                                onClick={() => handleSaveEdit(invoice.id)}
                                className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                                title="Save"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={handleCancelEdit}
                                className="p-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-1.5">
                              <button 
                                onClick={() => handleEditClick(invoice)}
                                className="p-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => downloadPDF(invoice)} 
                                className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                                title="Download PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => deleteDoc(doc(db, 'invoices', invoice.id))} 
                                className="p-1.5 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          <div className="lg:hidden divide-y divide-slate-100">
            {invoices.length === 0 ? (
              <div className="px-4 py-12 sm:px-6 sm:py-16 text-center">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <div className="p-3 sm:p-4 bg-slate-50 rounded-full">
                    <FileText className="w-10 h-10 sm:w-12 sm:h-12" />
                  </div>
                  <p className="text-base sm:text-lg font-medium text-slate-600">No invoices found</p>
                  <p className="text-sm text-slate-500">Create your first invoice!</p>
                </div>
              </div>
            ) : (
              invoices.map(invoice => {
                const client = clients.find(c => c.id === invoice.clientId);
                const isEditing = editingInvoiceId === invoice.id;
                const services = invoice.selectedServices || [];
                
                return (
                  <div key={invoice.id} className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-xs sm:text-sm font-bold text-slate-900 truncate">{invoice.invoiceNumber}</div>
                        <div className="text-xs sm:text-sm text-slate-600 mt-0.5 sm:mt-1 truncate">{client?.name || 'N/A'}</div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium border ${getStatusColor(invoice.status)} flex-shrink-0`}>
                        {getStatusIcon(invoice.status)}
                        <span className="capitalize">{invoice.status}</span>
                      </span>
                    </div>
                    
                    <div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <label className="block text-xs sm:text-sm font-medium text-slate-700">Services</label>
                          
                          <div className="bg-blue-50 p-2 rounded border border-blue-200">
                            <div className="text-[10px] sm:text-xs font-semibold text-slate-700 mb-1">Add Service:</div>
                            <div className="flex gap-1 mb-1">
                              <input
                                type="text"
                                value={editServiceName}
                                onChange={(e) => setEditServiceName(e.target.value)}
                                className="flex-1 border rounded px-2 py-1 text-xs sm:text-sm"
                                placeholder="Service name"
                              />
                            </div>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                value={editServiceAmount}
                                onChange={(e) => setEditServiceAmount(e.target.value)}
                                className="flex-1 border rounded px-2 py-1 text-xs sm:text-sm"
                                placeholder="Amount"
                              />
                              <button
                                type="button"
                                onClick={handleAddServiceInEdit}
                                className="bg-blue-600 text-white px-2.5 sm:px-3 rounded text-xs sm:text-sm hover:bg-blue-700"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            {editForm.selectedServices.map((service, idx) => (
                              <div key={idx} className="bg-white p-2 rounded border">
                                <div className="flex gap-1 mb-1">
                                  <input
                                    type="text"
                                    value={service.name}
                                    onChange={(e) => handleUpdateServiceInEdit(idx, 'name', e.target.value)}
                                    className="flex-1 border rounded px-2 py-1 text-xs sm:text-sm"
                                    placeholder="Service"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveServiceInEdit(idx)}
                                    className="text-rose-600 p-1"
                                  >
                                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  </button>
                                </div>
                                <input
                                  type="number"
                                  value={service.amount}
                                  onChange={(e) => handleUpdateServiceInEdit(idx, 'amount', e.target.value)}
                                  className="w-full border rounded px-2 py-1 text-xs sm:text-sm"
                                  placeholder="Amount"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 p-2.5 sm:p-3 rounded-lg">
                          <div className="text-[10px] sm:text-xs text-slate-600 mb-1.5 sm:mb-2">Services:</div>
                          {services.length > 0 ? (
                            <div className="space-y-1.5 sm:space-y-2">
                              {services.map((service, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2">
                                  <div className="flex items-start min-w-0 flex-1">
                                    <span className="text-slate-500 mr-1.5 sm:mr-2 text-[10px] sm:text-xs flex-shrink-0">{idx + 1}.</span>
                                    <span className="text-xs sm:text-sm text-slate-700 truncate">{service.name}</span>
                                  </div>
                                  <span className="text-xs sm:text-sm font-medium text-slate-900 flex-shrink-0">₹{formatAmount(service.amount || 0)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs sm:text-sm text-slate-400">No services</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-blue-50 p-2.5 sm:p-3 rounded-lg">
                      <div className="text-[10px] sm:text-xs text-slate-600 mb-1.5 sm:mb-2">Payment Info:</div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <div>
                            <label className="text-[10px] sm:text-xs text-slate-600">Payment Days:</label>
                            <input 
                              type="number"
                              value={editForm.paymentDays}
                              onChange={(e) => setEditForm({...editForm, paymentDays: e.target.value})}
                              className="w-full border rounded px-2 py-1 text-xs sm:text-sm mt-1"
                              placeholder="Days"
                              min="1"
                            />
                          </div>
                          {editForm.status === 'partial' && (
                            <div>
                              <label className="text-[10px] sm:text-xs text-slate-600">Amount Received:</label>
                              <input 
                                type="number"
                                value={editForm.amountReceived}
                                onChange={(e) => setEditForm({...editForm, amountReceived: e.target.value})}
                                className="w-full border rounded px-2 py-1 text-xs sm:text-sm mt-1"
                                placeholder="Received amount"
                                min="0"
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs sm:text-sm text-slate-700">
                            Payment due in: <span className="font-semibold">{invoice.paymentDays || 30} days</span>
                          </div>
                          {invoice.status === 'partial' && (
                            <div className="mt-2 bg-amber-50 p-2 rounded border border-amber-200">
                              <div className="text-[10px] sm:text-xs text-slate-600">Amount Received:</div>
                              <div className="font-medium text-amber-700 text-xs sm:text-sm">₹{formatAmount(invoice.amountReceived || 0)}</div>
                              <div className="text-[10px] sm:text-xs text-slate-600 mt-1">Remaining:</div>
                              <div className="font-bold text-amber-900 text-xs sm:text-sm">₹{formatAmount(invoice.remainingAmount || 0)}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {isEditing ? (
                      <div className="space-y-2 bg-slate-50 p-2.5 sm:p-3 rounded-lg">
                        <input 
                          type="number"
                          value={editForm.tax}
                          onChange={(e) => setEditForm({...editForm, tax: e.target.value})}
                          className="w-full border rounded px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm"
                          placeholder="Tax %"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                        <select 
                          value={editForm.status}
                          onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                          className="w-full border rounded px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm"
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="paid">Paid</option>
                          <option value="partial">Partial</option>
                        </select>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        <div className="bg-slate-50 p-1.5 sm:p-2 rounded">
                          <div className="text-[10px] sm:text-xs text-slate-600">Subtotal</div>
                          <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">{formatAmountWithCurrency(invoice.subtotal || invoice.amount)}</div>
                        </div>
                        <div className="bg-orange-50 p-1.5 sm:p-2 rounded">
                          <div className="text-[10px] sm:text-xs text-slate-600">Tax</div>
                          <div className="text-xs sm:text-sm font-bold text-orange-600 truncate">{formatAmountWithCurrency(invoice.taxAmount || 0)}</div>
                        </div>
                        <div className="bg-emerald-50 p-1.5 sm:p-2 rounded">
                          <div className="text-[10px] sm:text-xs text-slate-600">Total</div>
                          <div className="text-xs sm:text-sm font-bold text-emerald-600 truncate">{formatAmountWithCurrency(invoice.total || invoice.amount)}</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-1.5 sm:gap-2 pt-1.5 sm:pt-2">
                      {isEditing ? (
                        <>
                          <button 
                            onClick={() => handleSaveEdit(invoice.id)}
                            className="flex-1 py-2 sm:py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium"
                          >
                            <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Save
                          </button>
                          <button 
                            onClick={handleCancelEdit}
                            className="flex-1 py-2 sm:py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium"
                          >
                            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleEditClick(invoice)}
                            className="flex-1 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium"
                          >
                            <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Edit
                          </button>
                          <button 
                            onClick={() => downloadPDF(invoice)} 
                            className="flex-1 py-2 sm:py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium"
                          >
                            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            PDF
                          </button>
                          <button 
                            onClick={() => deleteDoc(doc(db, 'invoices', invoice.id))} 
                            className="p-2 sm:p-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}