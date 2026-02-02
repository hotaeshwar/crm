import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc, query, where, getDocs } from 'firebase/firestore';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { FileText, Download, Edit2, Trash2, Save, X, Plus, DollarSign, Calendar, User, Briefcase, CheckCircle, Clock, AlertCircle, Receipt, Tag, TrendingUp, TrendingDown, Minus, Calendar as CalendarIcon, FolderArchive, CalendarDays, Grid, ChevronLeft, ChevronRight, Filter, Search, BarChart3, PieChart, FileSpreadsheet, Archive } from 'lucide-react';

export default function InvoiceManagement() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    clientId: '',
    selectedServices: [],
    date: new Date().toISOString().split('T')[0],
    status: 'unpaid',
    paymentDays: '30',
    amountReceived: 0,
    tax: '0',
    billType: 'none'
  });
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [editForm, setEditForm] = useState({
    selectedServices: [],
    tax: '0',
    status: 'unpaid',
    paymentDays: '30',
    amountReceived: 0,
    billType: 'none'
  });
  const [editServiceName, setEditServiceName] = useState('');
  const [editServiceAmount, setEditServiceAmount] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceAmount, setNewServiceAmount] = useState('');
  
  // Calendar View State
  const [activeTab, setActiveTab] = useState('invoices');
  const [calendarView, setCalendarView] = useState('monthly');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubClients = onSnapshot(collection(db, 'clients'), (s) => {
      const clientsData = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setClients(clientsData);
    });

    const unsubInvoices = onSnapshot(collection(db, 'invoices'), (s) => {
      const invoicesData = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setInvoices(invoicesData);
      if (activeTab === 'calendar' && selectedDate) {
        filterInvoicesByDate(selectedDate, invoicesData);
      }
    });

    return () => {
      unsubClients();
      unsubInvoices();
    };
  }, []);

  const generateInvoiceNumber = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `INV-${day}${month}${year}-${randomNum}`;
  };

  const filterInvoicesByDate = (date, invoiceList = invoices) => {
    let filtered = invoiceList.filter(invoice => {
      const invoiceDate = new Date(invoice.date);
      return invoiceDate.toDateString() === date.toDateString();
    });

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(inv => {
        const client = clients.find(c => c.id === inv.clientId);
        return (
          inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          client?.company?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    setFilteredInvoices(filtered);
  };

  const getInvoicesByMonthYear = (month, year) => {
    return invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.date);
      return invoiceDate.getMonth() === month && 
             invoiceDate.getFullYear() === year;
    });
  };

  const getInvoicesByYear = (year) => {
    return invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.date);
      return invoiceDate.getFullYear() === year;
    });
  };

  const exportToExcel = (invoicesToExport, fileName) => {
    const data = invoicesToExport.map(inv => {
      const client = clients.find(c => c.id === inv.clientId);
      return {
        'Invoice Number': inv.invoiceNumber,
        'Date': inv.date,
        'Client Name': client?.name || 'N/A',
        'Client Company': client?.company || 'N/A',
        'Services': inv.service || '',
        'Subtotal': inv.subtotal || 0,
        'Tax %': inv.taxPercentage || 0,
        'Tax Amount': inv.taxAmount || 0,
        'Total': inv.total || 0,
        'Status': inv.status,
        'Payment Days': inv.paymentDays || 30,
        'Amount Received': inv.amountReceived || 0,
        'Remaining Amount': inv.remainingAmount || 0,
        'Bill Type': inv.billType || 'none',
        'Created At': inv.createdAt ? new Date(inv.createdAt.seconds * 1000).toLocaleDateString() : ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${fileName}.xlsx`);
  };

  const archiveMonthlyData = async () => {
    try {
      const currentDate = new Date();
      const lastMonth = currentDate.getMonth() === 0 ? 11 : currentDate.getMonth() - 1;
      const lastMonthYear = currentDate.getMonth() === 0 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();
      
      const monthlyInvoices = getInvoicesByMonthYear(lastMonth, lastMonthYear);
      
      if (monthlyInvoices.length > 0) {
        const monthName = new Date(2000, lastMonth).toLocaleString('default', { month: 'long' });
        const fileName = `invoices_${monthName}_${lastMonthYear}`;
        exportToExcel(monthlyInvoices, fileName);
        
        const deletePromises = monthlyInvoices.map(invoice => 
          deleteDoc(doc(db, 'invoices', invoice.id))
        );
        
        await Promise.all(deletePromises);
        alert(`Monthly data for ${monthName} ${lastMonthYear} archived successfully!`);
      } else {
        alert('No invoices found for the previous month.');
      }
    } catch (error) {
      console.error('Error archiving monthly data:', error);
      alert('Error archiving monthly data. Please try again.');
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    filterInvoicesByDate(date);
  };

  const renderMonthlyCalendar = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const firstDay = new Date(selectedYear, selectedMonth, 1).getDay();
    const days = [];
    
    const prevMonthLastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(selectedYear, selectedMonth - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
        invoices: []
      });
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day);
      const dayInvoices = invoices.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate.getDate() === day && 
               invDate.getMonth() === selectedMonth && 
               invDate.getFullYear() === selectedYear;
      });
      days.push({
        date,
        isCurrentMonth: true,
        invoices: dayInvoices
      });
    }
    
    const totalCells = 42;
    const nextMonthDays = totalCells - days.length;
    for (let i = 1; i <= nextMonthDays; i++) {
      days.push({
        date: new Date(selectedYear, selectedMonth + 1, i),
        isCurrentMonth: false,
        invoices: []
      });
    }
    
    return days;
  };

  const renderYearlyView = () => {
    const currentYear = new Date().getFullYear();
    
    const invoiceYears = [...new Set(invoices.map(inv => 
      new Date(inv.date).getFullYear()
    ))];
    
    if (!invoiceYears.includes(currentYear)) {
      invoiceYears.push(currentYear);
    }
    
    invoiceYears.sort((a, b) => b - a);
    
    return invoiceYears.map(year => {
      const yearInvoices = getInvoicesByYear(year);
      const monthlySummary = Array(12).fill().map((_, month) => {
        const monthInvoices = yearInvoices.filter(inv => 
          new Date(inv.date).getMonth() === month
        );
        const total = monthInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const paid = monthInvoices.filter(inv => inv.status === 'paid').length;
        const unpaid = monthInvoices.filter(inv => inv.status === 'unpaid').length;
        const partial = monthInvoices.filter(inv => inv.status === 'partial').length;
        return {
          count: monthInvoices.length,
          total: total,
          paid,
          unpaid,
          partial
        };
      });
      
      return {
        year,
        invoices: yearInvoices,
        monthlySummary,
        totalAmount: yearInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
        paidAmount: yearInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0),
        unpaidAmount: yearInvoices.filter(inv => inv.status === 'unpaid').reduce((sum, inv) => sum + (inv.total || 0), 0)
      };
    });
  };

  const calculateTotalAmount = (services) => {
    return services.reduce((total, service) => {
      const amount = parseFloat(service.amount) || 0;
      return total + amount;
    }, 0);
  };

  const isNA = (value) => {
    if (!value) return false;
    const str = String(value).toLowerCase().trim();
    return str === 'n/a' || str === 'na' || str === 'not applicable' || str === 'notapplicable';
  };

  const getBillTypeIcon = (billType) => {
    switch (billType) {
      case 'debit':
        return <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      case 'credit':
        return <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      case 'none':
        return <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      default:
        return <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
    }
  };

  const getBillTypeColor = (billType) => {
    switch (billType) {
      case 'debit':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'credit':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'none':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleEditClick = (invoice) => {
    setEditingInvoiceId(invoice.id);
    const services = invoice.selectedServices && invoice.selectedServices.length > 0
      ? invoice.selectedServices
      : (invoice.service ? invoice.service.split(',').map(s => ({ name: s.trim(), amount: 0 })) : []);

    setEditForm({
      selectedServices: services,
      tax: String(invoice.taxPercentage || 0),
      status: invoice.status || 'unpaid',
      paymentDays: String(invoice.paymentDays || 30),
      amountReceived: invoice.amountReceived || 0,
      billType: invoice.billType || 'none'
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
      const taxValue = isNA(editForm.tax) ? 'N/A' : parseFloat(editForm.tax) || 0;
      const taxAmount = taxValue === 'N/A' ? 0 : (subtotal * taxValue) / 100;
      const total = subtotal + taxAmount;
      const amountReceived = parseFloat(editForm.amountReceived) || 0;
      const serviceString = editForm.selectedServices.map(s => s.name).join(', ');
      const paymentDaysValue = isNA(editForm.paymentDays) ? 'N/A' : parseInt(editForm.paymentDays) || 30;

      await updateDoc(doc(db, 'invoices', invoiceId), {
        service: serviceString,
        selectedServices: editForm.selectedServices,
        subtotal: subtotal,
        taxPercentage: taxValue,
        taxAmount: taxAmount,
        total: total,
        status: editForm.status,
        paymentDays: paymentDaysValue,
        amountReceived: amountReceived,
        remainingAmount: total - amountReceived,
        billType: editForm.billType
      });

      setEditingInvoiceId(null);
      setEditForm({
        selectedServices: [],
        tax: '0',
        status: 'unpaid',
        paymentDays: '30',
        amountReceived: 0,
        billType: 'none'
      });
      setEditServiceName('');
      setEditServiceAmount('');
    } catch (error) {
      console.error('Error updating invoice:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingInvoiceId(null);
    setEditForm({
      selectedServices: [],
      tax: '0',
      status: 'unpaid',
      paymentDays: '30',
      amountReceived: 0,
      billType: 'none'
    });
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
    const taxValue = isNA(form.tax) ? 'N/A' : parseFloat(form.tax) || 0;
    const taxAmount = taxValue === 'N/A' ? 0 : (subtotal * taxValue) / 100;
    const total = subtotal + taxAmount;
    const amountReceived = parseFloat(form.amountReceived) || 0;
    const serviceString = form.selectedServices.map(s => s.name).join(', ');
    const paymentDaysValue = isNA(form.paymentDays) ? 'N/A' : parseInt(form.paymentDays) || 30;

    const invoiceNumber = generateInvoiceNumber();

    await addDoc(collection(db, 'invoices'), {
      clientId: form.clientId,
      service: serviceString,
      selectedServices: form.selectedServices,
      subtotal: subtotal,
      taxPercentage: taxValue,
      taxAmount: taxAmount,
      total: total,
      invoiceNumber: invoiceNumber,
      date: form.date,
      status: form.status,
      paymentDays: paymentDaysValue,
      amountReceived: amountReceived,
      remainingAmount: total - amountReceived,
      billType: form.billType,
      createdAt: new Date()
    });

    setForm({
      clientId: '',
      selectedServices: [],
      date: new Date().toISOString().split('T')[0],
      status: 'unpaid',
      paymentDays: '30',
      amountReceived: 0,
      tax: '0',
      billType: 'none'
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
      case 'paid':
        return <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      case 'partial':
        return <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      case 'unpaid':
        return <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      default:
        return <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'partial':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'unpaid':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
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
    let yPos = 15;

    const logoWidth = 65;
    const logoStartX = leftMargin;
    
    try {
      const img = new Image();
      img.src = '/images/LOGO.png';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        setTimeout(reject, 500);
      });
      const imageAspectRatio = img.naturalHeight / img.naturalWidth;
      const logoHeight = logoWidth * imageAspectRatio;
      pdfDoc.addImage(img, 'PNG', logoStartX, yPos, logoWidth, logoHeight, undefined, 'FAST');
      
      const infoStartX = logoStartX + logoWidth + 18;
      pdfDoc.setTextColor(0, 0, 0);
      pdfDoc.setFontSize(10);
      pdfDoc.setFont(undefined, 'bold');
      
      let infoY = yPos + 5;
      pdfDoc.text('SCO 246, Devaji Plaza, VIP Road', infoStartX, infoY);
      infoY += 5;
      pdfDoc.text('Zirakpur, India', infoStartX, infoY);
      infoY += 5;
      pdfDoc.text('marketing@buildingindiadigital.com', infoStartX, infoY);
      infoY += 5;
      pdfDoc.text('For any enquiry, Call Us:', infoStartX, infoY);
      infoY += 5;
      pdfDoc.setFontSize(11);
      pdfDoc.text('+919041499964', infoStartX, infoY);
      infoY += 5;
      pdfDoc.text('+919041499973', infoStartX, infoY);
      
      yPos += Math.max(logoHeight, infoY - yPos) + 10;
    } catch (error) {
      const fallbackHeight = 50;
      pdfDoc.setFillColor(255, 152, 0);
      pdfDoc.roundedRect(logoStartX, yPos, logoWidth, fallbackHeight, 3, 3, 'F');
      pdfDoc.setTextColor(255, 255, 255);
      pdfDoc.setFontSize(24);
      pdfDoc.setFont(undefined, 'bold');
      pdfDoc.text('BID', logoStartX + logoWidth/2, yPos + fallbackHeight/2 + 3, { align: 'center' });
      
      const infoStartX = logoStartX + logoWidth + 18;
      pdfDoc.setTextColor(0, 0, 0);
      pdfDoc.setFontSize(10);
      pdfDoc.setFont(undefined, 'bold');
      
      let infoY = yPos + 5;
      pdfDoc.text('SCO 246, Devaji Plaza, VIP Road', infoStartX, infoY);
      infoY += 5;
      pdfDoc.text('Zirakpur, India', infoStartX, infoY);
      infoY += 5;
      pdfDoc.text('marketing@buildingindiadigital.com', infoStartX, infoY);
      infoY += 5;
      pdfDoc.text('For any enquiry, Call Us:', infoStartX, infoY);
      infoY += 5;
      pdfDoc.setFontSize(11);
      pdfDoc.text('+919041499964', infoStartX, infoY);
      infoY += 5;
      pdfDoc.text('+919041499973', infoStartX, infoY);
      
      yPos += Math.max(fallbackHeight, infoY - yPos) + 10;
    }

    pdfDoc.setFillColor(255, 152, 0);
    pdfDoc.roundedRect(leftMargin, yPos, contentWidth, 12, 2, 2, 'F');
    pdfDoc.setTextColor(255, 255, 255);
    pdfDoc.setFontSize(16);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('TAX INVOICE', leftMargin + contentWidth/2, yPos + 8, { align: 'center' });
    yPos += 22;

    const columnWidth = contentWidth / 2;

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
    
    if (isNA(invoice.paymentDays)) {
      pdfDoc.setFont(undefined, 'bold');
      pdfDoc.text('N/A', leftMargin + 38, yPos + 24);
    } else {
      const dueDate = new Date(invoice.date);
      const paymentDays = invoice.paymentDays || 30;
      dueDate.setDate(dueDate.getDate() + paymentDays);
      pdfDoc.setFont(undefined, 'bold');
      pdfDoc.text(dueDate.toISOString().split('T')[0], leftMargin + 38, yPos + 24);
    }

    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('Status:', leftMargin, yPos + 32);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text((invoice.status || 'unpaid').toUpperCase(), leftMargin + 38, yPos + 32);

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

    yPos += 50;
    const services = invoice.selectedServices || (invoice.service ? invoice.service.split(',').map(s => ({ name: s.trim(), amount: 0 })) : []);
    const headerHeight = 10;
    const rowHeight = 10;
    const totalTableHeight = headerHeight + (rowHeight * services.length);

    pdfDoc.setFillColor(76, 175, 80);
    pdfDoc.roundedRect(leftMargin, yPos, contentWidth, headerHeight, 2, 2, 'F');
    pdfDoc.setTextColor(255, 255, 255);
    pdfDoc.setFontSize(11);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('S.NO', leftMargin + 3, yPos + 7);
    pdfDoc.text('DESCRIPTION', leftMargin + 20, yPos + 7);
    pdfDoc.text('AMOUNT', leftMargin + contentWidth - 5, yPos + 7, { align: 'right' });
    yPos += headerHeight;

    pdfDoc.setDrawColor(200, 200, 200);
    pdfDoc.setLineWidth(0.2);
    pdfDoc.rect(leftMargin, yPos - headerHeight, contentWidth, totalTableHeight);
    pdfDoc.line(leftMargin + 15, yPos - headerHeight, leftMargin + 15, yPos - headerHeight + totalTableHeight);
    pdfDoc.line(leftMargin + 100, yPos - headerHeight, leftMargin + 100, yPos - headerHeight + totalTableHeight);

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

    yPos = serviceY + 12;
    const totalsX = leftMargin + 90;

    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.setFontSize(11);
    pdfDoc.setTextColor(0, 0, 0);
    pdfDoc.text('Subtotal:', totalsX, yPos);
    pdfDoc.text(formatAmountWithCurrency(invoice.subtotal || subtotal), leftMargin + contentWidth - 5, yPos, { align: 'right' });

    yPos += 8;
    const taxPercentage = invoice.taxPercentage;
    const taxDisplay = isNA(taxPercentage) ? 'N/A' : `${taxPercentage}%`;
    pdfDoc.text(`Tax (${taxDisplay}):`, totalsX, yPos);
    pdfDoc.text(isNA(taxPercentage) ? 'N/A' : formatAmountWithCurrency(invoice.taxAmount || 0), leftMargin + contentWidth - 5, yPos, { align: 'right' });

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

    yPos += 10;
    const invoiceStatus = String(invoice.status || '').toLowerCase();
    const receivedAmount = parseFloat(invoice.amountReceived || 0);
    const remainAmount = parseFloat(invoice.remainingAmount || 0);

    if (invoiceStatus === 'partial' && receivedAmount > 0) {
      pdfDoc.setDrawColor(255, 152, 0);
      pdfDoc.setLineWidth(0.3);
      pdfDoc.line(totalsX, yPos, leftMargin + contentWidth, yPos);
      yPos += 8;

      pdfDoc.setFont(undefined, 'bold');
      pdfDoc.setFontSize(11);
      pdfDoc.setTextColor(0, 0, 0);
      pdfDoc.text('Amount Received:', totalsX, yPos);
      pdfDoc.setFont(undefined, 'bold');
      pdfDoc.setTextColor(34, 139, 34);
      pdfDoc.text(formatAmountWithCurrency(receivedAmount), leftMargin + contentWidth - 5, yPos, { align: 'right' });

      yPos += 8;

      pdfDoc.setFillColor(255, 248, 220);
      pdfDoc.roundedRect(totalsX - 5, yPos - 6, contentWidth - (totalsX - leftMargin) + 5, 12, 2, 2, 'F');
      pdfDoc.setFont(undefined, 'bold');
      pdfDoc.setFontSize(12);
      pdfDoc.setTextColor(255, 140, 0);
      pdfDoc.text('REMAINING:', totalsX, yPos);
      pdfDoc.text(formatAmountWithCurrency(remainAmount), leftMargin + contentWidth - 5, yPos, { align: 'right' });

      yPos += 10;
    }

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
    pdfDoc.text('For any queries: marketing@buildingindiadigital.com | +919041499964 | +919041499973', leftMargin + contentWidth/2, footerY - 3, { align: 'center' });
    pdfDoc.text('Building India Digital © 2026', leftMargin + contentWidth/2, footerY + 4, { align: 'center' });

    pdfDoc.save(`${invoice.invoiceNumber}.pdf`);
  };

  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  const getMonthName = (month) => {
    return new Date(2000, month).toLocaleString('default', { month: 'long' });
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
    setSelectedDate(today);
    filterInvoicesByDate(today);
  };

  // Calculate statistics for current month
  const currentMonthStats = () => {
    const monthInvoices = getInvoicesByMonthYear(selectedMonth, selectedYear);
    const total = monthInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const paid = monthInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (inv.total || 0), 0);
    const unpaid = monthInvoices.filter(inv => inv.status === 'unpaid').reduce((sum, inv) => sum + (inv.total || 0), 0);
    const partial = monthInvoices.filter(inv => inv.status === 'partial').reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    return {
      count: monthInvoices.length,
      total,
      paid,
      unpaid,
      partial,
      paidCount: monthInvoices.filter(inv => inv.status === 'paid').length,
      unpaidCount: monthInvoices.filter(inv => inv.status === 'unpaid').length,
      partialCount: monthInvoices.filter(inv => inv.status === 'partial').length
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header - Keep existing */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                <div className="p-2 sm:p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl">
                  <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Invoice Management
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 ml-11 sm:ml-14">Create, manage, and archive invoices</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl border border-blue-200">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <span className="text-lg sm:text-xl font-bold text-blue-600">{invoices.length}</span>
              <span className="text-xs sm:text-sm text-slate-600">Invoice{invoices.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* REVAMPED: Tab Navigation with Archive */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="flex flex-wrap border-b border-slate-200">
            <button
              className={`flex-1 min-w-[120px] py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-base font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'invoices' 
                  ? 'text-blue-600 bg-blue-50 border-b-3 border-blue-600' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
              onClick={() => setActiveTab('invoices')}
            >
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Invoices</span>
              <span className="sm:hidden">List</span>
            </button>
            
            <button
              className={`flex-1 min-w-[120px] py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-base font-semibold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'calendar' 
                  ? 'text-blue-600 bg-blue-50 border-b-3 border-blue-600' 
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
              onClick={() => setActiveTab('calendar')}
            >
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              Calendar
            </button>
            
            <button
              className="py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-base font-semibold flex items-center justify-center gap-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 transition-all border-l border-slate-200"
              onClick={archiveMonthlyData}
              title="Archive previous month's data"
            >
              <Archive className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden lg:inline">Archive</span>
            </button>
          </div>
        </div>

        {/* Invoices Tab Content */}
        {activeTab === 'invoices' && (
          <>
            {/* Create New Invoice Section */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6 lg:p-8">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-4 sm:mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                Create New Invoice
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {/* Client */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
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

                  {/* Date */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                      Date
                    </label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({...form, date: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
                    />
                  </div>

                  {/* Payment Days */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                      Payment Days
                    </label>
                    <input
                      type="text"
                      value={form.paymentDays}
                      onChange={(e) => setForm({...form, paymentDays: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
                      placeholder="30 or N/A or Not Applicable"
                    />
                    <p className="text-xs text-slate-500 mt-1">Enter days or "N/A" or "Not Applicable"</p>
                  </div>

                  {/* Tax */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                      Tax % (Optional)
                    </label>
                    <input
                      type="text"
                      value={form.tax}
                      onChange={(e) => setForm({...form, tax: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
                      placeholder="0-100 or N/A or Not Applicable"
                    />
                    <p className="text-xs text-slate-500 mt-1">Enter % or "N/A" or "Not Applicable"</p>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
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

                  {/* Bill Type */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
                      Bill Type
                    </label>
                    <select
                      value={form.billType}
                      onChange={(e) => setForm({...form, billType: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-slate-50"
                    >
                      <option value="none">None</option>
                      <option value="debit">Debit</option>
                      <option value="credit">Credit</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Categorize as Debit, Credit, or None</p>
                  </div>

                  {/* Amount Received */}
                  {form.status === 'partial' && (
                    <div>
                      <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
                        Amount Received (₹)
                      </label>
                      <input
                        type="number"
                        value={form.amountReceived}
                        onChange={(e) => setForm({...form, amountReceived: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg sm:rounded-xl px-2.5 py-2 sm:px-3 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-slate-50"
                        min="0"
                      />
                    </div>
                  )}
                </div>

                {/* Add Services Section */}
                <div className="border-t pt-4 sm:pt-6">
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    Add Services
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <div className="sm:col-span-6">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Service Name</label>
                      <input
                        type="text"
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        placeholder="e.g., Website Development"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹)</label>
                      <input
                        type="number"
                        value={newServiceAmount}
                        onChange={(e) => setNewServiceAmount(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        placeholder="Enter amount"
                        min="0"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-end">
                      <button
                        type="button"
                        onClick={handleAddService}
                        className="w-full py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium"
                      >
                        <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Selected Services List */}
                  {form.selectedServices.length > 0 && (
                    <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-200">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-700 mb-2 sm:mb-3">
                        Selected Services ({form.selectedServices.length})
                      </h4>
                      <div className="space-y-2">
                        {form.selectedServices.map((service, index) => (
                          <div key={index} className="bg-white rounded-lg border border-slate-200 p-2 sm:p-3">
                            <div className="flex items-start gap-2 mb-2">
                              <span className="text-xs font-semibold text-slate-600 mt-1.5">{index + 1}.</span>
                              <input
                                type="text"
                                value={service.name}
                                onChange={(e) => handleUpdateService(index, 'name', e.target.value)}
                                className="flex-1 min-w-0 border border-slate-300 rounded px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-medium text-slate-800"
                                placeholder="Service name"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveService(index)}
                                className="text-rose-600 hover:text-rose-800 p-1 ml-1.5 sm:ml-2 flex-shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                            </div>
                            <div className="flex items-center justify-between pl-5 sm:pl-6">
                              <div className="flex-1">
                                <label className="block text-xs text-slate-600 mb-1">Amount (₹)</label>
                                <input
                                  type="number"
                                  value={service.amount}
                                  onChange={(e) => handleUpdateService(index, 'amount', e.target.value)}
                                  className="w-full border border-slate-300 rounded px-2 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm"
                                  placeholder="Enter amount"
                                  min="0"
                                />
                              </div>
                              <div className="ml-3 sm:ml-4 text-right">
                                <div className="text-xs text-slate-500 mb-1">Total</div>
                                <div className="text-sm sm:text-base font-bold text-blue-600">
                                  {service.amount ? `₹${formatAmount(service.amount)}` : '—'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-300 flex justify-between items-center">
                        <div className="text-xs sm:text-sm text-slate-600">
                          Services Total:
                          <span className="block text-xs text-slate-500 mt-0.5">Sum of all service amounts</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg sm:text-xl font-bold text-blue-600">
                            ₹{formatAmount(calculateTotalAmount(form.selectedServices))}
                          </div>
                          <div className="text-xs text-slate-500">
                            {form.selectedServices.length} service{form.selectedServices.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Invoice Preview */}
                {form.selectedServices.length > 0 && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-blue-200">
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-2 sm:mb-3">Invoice Preview</h3>
                    <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Subtotal</span>
                        <span className="font-semibold text-slate-800">₹{formatAmount(calculateTotalAmount(form.selectedServices))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tax ({isNA(form.tax) ? 'N/A' : `${form.tax || 0}%`})</span>
                        <span className="font-semibold text-slate-800">
                          {isNA(form.tax) ? 'N/A' : `₹${formatAmount((calculateTotalAmount(form.selectedServices) * parseFloat(form.tax || 0)) / 100)}`}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-blue-300">
                        <span className="font-bold text-slate-800">Total Amount</span>
                        <span className="font-bold text-blue-600 text-base sm:text-lg">
                          ₹{formatAmount(calculateTotalAmount(form.selectedServices) + (isNA(form.tax) ? 0 : (calculateTotalAmount(form.selectedServices) * parseFloat(form.tax || 0)) / 100))}
                        </span>
                      </div>
                      {form.status === 'partial' && form.amountReceived > 0 && (
                        <div className="flex justify-between text-amber-600 font-semibold">
                          <span>Remaining</span>
                          <span>₹{formatAmount((calculateTotalAmount(form.selectedServices) + (isNA(form.tax) ? 0 : (calculateTotalAmount(form.selectedServices) * parseFloat(form.tax || 0)) / 100)) - parseFloat(form.amountReceived))}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  Create Invoice
                </button>
              </form>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-200">
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  All Invoices
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-slate-50 to-blue-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Invoice #</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Client</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Bill Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Services</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Subtotal</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Tax</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Payment Info</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {invoices.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="px-4 py-12 text-center">
                          <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500 font-medium">No invoices found</p>
                          <p className="text-sm text-slate-400 mt-1">Create your first invoice!</p>
                        </td>
                      </tr>
                    ) : (
                      invoices.map(invoice => {
                        const client = clients.find(c => c.id === invoice.clientId);
                        const isEditing = editingInvoiceId === invoice.id;
                        const services = invoice.selectedServices || [];

                        return (
                          <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-xs sm:text-sm font-bold text-slate-800">{invoice.invoiceNumber}</td>
                            <td className="px-4 py-3 text-xs sm:text-sm font-bold text-slate-600">{client?.name || 'N/A'}</td>
                            
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <select
                                  value={editForm.billType}
                                  onChange={(e) => setEditForm({...editForm, billType: e.target.value})}
                                  className="border rounded px-2 py-1 text-xs sm:text-sm"
                                >
                                  <option value="none">None</option>
                                  <option value="debit">Debit</option>
                                  <option value="credit">Credit</option>
                                </select>
                              ) : (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getBillTypeColor(invoice.billType || 'none')}`}>
                                  {getBillTypeIcon(invoice.billType || 'none')}
                                  {(invoice.billType || 'none').charAt(0).toUpperCase() + (invoice.billType || 'none').slice(1)}
                                </span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {isEditing ? (
                                <div className="space-y-2">
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
                                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                  {editForm.selectedServices.map((service, idx) => (
                                    <div key={idx} className="flex gap-1 items-start bg-slate-50 p-1.5 rounded">
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
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs space-y-0.5">
                                  {services.length > 0 ? (
                                    services.map((service, idx) => (
                                      <div key={idx} className="flex justify-between items-start gap-2">
                                        <span className="text-slate-600 font-bold">{idx + 1}. {service.name}</span>
                                        <span className="font-bold text-slate-800 whitespace-nowrap">
                                          ₹{formatAmount(service.amount || 0)}
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-slate-400 italic">No services</span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs sm:text-sm font-semibold text-slate-800">
                              {formatAmountWithCurrency(isEditing ? calculateTotalAmount(editForm.selectedServices) : (invoice.subtotal || invoice.amount))}
                            </td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editForm.tax}
                                  onChange={(e) => setEditForm({...editForm, tax: e.target.value})}
                                  className="border rounded px-2 py-1 w-20 text-xs sm:text-sm"
                                  placeholder="% or N/A"
                                />
                              ) : (
                                <div className="text-xs sm:text-sm font-semibold text-slate-800">
                                  {isNA(invoice.taxPercentage) ? 'N/A' : (invoice.taxPercentage ? `${invoice.taxPercentage}%` : '0%')}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs sm:text-sm font-bold text-blue-600">
                              {isEditing ? (
                                <span>
                                  ₹{formatAmount(
                                    calculateTotalAmount(editForm.selectedServices) +
                                    (isNA(editForm.tax) ? 0 : (calculateTotalAmount(editForm.selectedServices) * parseFloat(editForm.tax)) / 100)
                                  )}
                                </span>
                              ) : (
                                formatAmountWithCurrency(invoice.total || invoice.amount)
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <div>
                                  <div className="text-xs text-slate-600">Payment Days:</div>
                                  <input
                                    type="text"
                                    value={editForm.paymentDays}
                                    onChange={(e) => setEditForm({...editForm, paymentDays: e.target.value})}
                                    className="border rounded px-2 py-1 w-20 text-xs sm:text-sm mt-1"
                                    placeholder="Days/N/A"
                                  />
                                  {editForm.status === 'partial' && (
                                    <div className="mt-2">
                                      <div className="text-xs text-slate-600">Received:</div>
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
                                <div className="text-xs sm:text-sm">
                                  {invoice.status === 'paid' ? (
                                    <div className="text-emerald-600 font-bold">—</div>
                                  ) : (
                                    <div className="font-bold">{isNA(invoice.paymentDays) ? 'N/A' : `${invoice.paymentDays || 30} days`}</div>
                                  )}
                                  {invoice.status === 'partial' && (
                                    <>
                                      <div className="text-emerald-600 mt-1 font-bold">Received: ₹{formatAmount(invoice.amountReceived || 0)}</div>
                                      <div className="text-amber-600 mt-0.5 font-bold">Remaining: ₹{formatAmount(invoice.remainingAmount || 0)}</div>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
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
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(invoice.status)}`}>
                                  {getStatusIcon(invoice.status)}
                                  {invoice.status || 'unpaid'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {isEditing ? (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleSaveEdit(invoice.id)}
                                    className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                                    title="Save"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="p-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                                    title="Cancel"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleEditClick(invoice)}
                                    className="p-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => downloadPDF(invoice)}
                                    className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                                    title="Download PDF"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => deleteDoc(doc(db, 'invoices', invoice.id))}
                                    className="p-1.5 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
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
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 sm:space-y-4">
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  All Invoices
                </h2>
              </div>

              {invoices.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 text-center">
                  <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No invoices found</p>
                  <p className="text-sm text-slate-400 mt-1">Create your first invoice!</p>
                </div>
              ) : (
                invoices.map(invoice => {
                  const client = clients.find(c => c.id === invoice.clientId);
                  const isEditing = editingInvoiceId === invoice.id;
                  const services = invoice.selectedServices || [];

                  return (
                    <div key={invoice.id} className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs text-slate-500 mb-0.5">Invoice Number</div>
                          <div className="font-bold text-slate-800">{invoice.invoiceNumber}</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-0.5 text-right">Client</div>
                          <div className="font-semibold text-slate-700 text-right">{client?.name || 'N/A'}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(invoice.status)}`}>
                          {getStatusIcon(invoice.status)}
                          {invoice.status}
                        </span>
                        
                        {isEditing ? (
                          <select
                            value={editForm.billType}
                            onChange={(e) => setEditForm({...editForm, billType: e.target.value})}
                            className="border rounded px-2 py-1 text-xs"
                          >
                            <option value="none">None</option>
                            <option value="debit">Debit</option>
                            <option value="credit">Credit</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getBillTypeColor(invoice.billType || 'none')}`}>
                            {getBillTypeIcon(invoice.billType || 'none')}
                            {(invoice.billType || 'none').charAt(0).toUpperCase() + (invoice.billType || 'none').slice(1)}
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-slate-500 mb-1">Services:</div>
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-slate-700">Add Service:</div>
                            <div className="grid grid-cols-12 gap-1.5 mb-2">
                              <input
                                type="text"
                                value={editServiceName}
                                onChange={(e) => setEditServiceName(e.target.value)}
                                className="col-span-6 border rounded px-2 py-1 text-xs sm:text-sm"
                                placeholder="Service name"
                              />
                              <input
                                type="number"
                                value={editServiceAmount}
                                onChange={(e) => setEditServiceAmount(e.target.value)}
                                className="col-span-4 border rounded px-2 py-1 text-xs sm:text-sm"
                                placeholder="Amount"
                              />
                              <button
                                type="button"
                                onClick={handleAddServiceInEdit}
                                className="col-span-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 flex items-center justify-center"
                              >
                                Add
                              </button>
                            </div>
                            {editForm.selectedServices.map((service, idx) => (
                              <div key={idx} className="bg-slate-50 rounded p-2 space-y-1.5">
                                <div className="flex gap-1.5 items-start">
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
                                    <Trash2 className="w-4 h-4" />
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
                        ) : (
                          <div className="bg-slate-50 rounded-lg p-2.5">
                            {services.length > 0 ? (
                              <div className="space-y-1.5">
                                {services.map((service, idx) => (
                                  <div key={idx} className="flex justify-between items-start">
                                    <span className="text-xs text-slate-600">{idx + 1}. {service.name}</span>
                                    <span className="text-xs font-semibold text-slate-800 ml-2">
                                      ₹{formatAmount(service.amount || 0)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">No services</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-xs text-slate-500 mb-1">Payment Info:</div>
                        {isEditing ? (
                          <div>
                            <div className="text-xs text-slate-600">Payment Days:</div>
                            <input
                              type="text"
                              value={editForm.paymentDays}
                              onChange={(e) => setEditForm({...editForm, paymentDays: e.target.value})}
                              className="w-full border rounded px-2 py-1 text-xs sm:text-sm mt-1"
                              placeholder="Days or N/A"
                            />
                            {editForm.status === 'partial' && (
                              <div className="mt-2">
                                <div className="text-xs text-slate-600">Amount Received:</div>
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
                          <div className="text-xs sm:text-sm">
                            {invoice.status === 'paid' ? (
                              <div className="text-emerald-600 font-medium">—</div>
                            ) : (
                              <div>{isNA(invoice.paymentDays) ? 'N/A' : `${invoice.paymentDays || 30} days`}</div>
                            )}
                            {invoice.status === 'partial' && (
                              <>
                                <div className="text-emerald-600 mt-1">Received: ₹{formatAmount(invoice.amountReceived || 0)}</div>
                                <div className="text-amber-600 mt-0.5">Remaining: ₹{formatAmount(invoice.remainingAmount || 0)}</div>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="border-t pt-3 space-y-1.5">
                        {isEditing ? (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-slate-600">Tax</label>
                              <input
                                type="text"
                                value={editForm.tax}
                                onChange={(e) => setEditForm({...editForm, tax: e.target.value})}
                                className="w-full border rounded px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs sm:text-sm"
                                placeholder="% or N/A"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-600">Status</label>
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
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between text-xs sm:text-sm">
                              <span className="text-slate-600">Subtotal</span>
                              <span className="font-semibold text-slate-800">{formatAmountWithCurrency(invoice.subtotal || invoice.amount)}</span>
                            </div>
                            <div className="flex justify-between text-xs sm:text-sm">
                              <span className="text-slate-600">Tax ({isNA(invoice.taxPercentage) ? 'N/A' : `${invoice.taxPercentage || 0}%`})</span>
                              <span className="font-semibold text-slate-800">{isNA(invoice.taxPercentage) ? 'N/A' : `₹${formatAmount(invoice.taxAmount || 0)}`}</span>
                            </div>
                            <div className="flex justify-between text-sm sm:text-base font-bold border-t pt-1.5">
                              <span className="text-slate-800">Total</span>
                              <span className="text-blue-600">{formatAmountWithCurrency(invoice.total || invoice.amount)}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
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
          </>
        )}

        {/* REVAMPED: Calendar Tab Content */}
        {activeTab === 'calendar' && (
          <div className="space-y-4 sm:space-y-6">
            
            {/* REVAMPED: Compact Calendar Controls & Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Calendar View Toggle & Navigation */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-slate-200 p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                      <CalendarDays className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-800">Invoice Calendar</h2>
                      <p className="text-[10px] sm:text-xs text-slate-500">Track invoices by date</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-all ${
                        calendarView === 'monthly' 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      onClick={() => setCalendarView('monthly')}
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      Monthly
                    </button>
                    <button
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-all ${
                        calendarView === 'yearly' 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      onClick={() => setCalendarView('yearly')}
                    >
                      <Grid className="w-3.5 h-3.5" />
                      Yearly
                    </button>
                  </div>
                </div>
              </div>

              {/* REVAMPED: Compact Quick Stats Card */}
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-3 sm:p-4 text-white">
                <div className="flex items-center gap-1.5 mb-2">
                  <BarChart3 className="w-4 h-4" />
                  <h3 className="text-xs sm:text-sm font-semibold">
                    {calendarView === 'monthly' ? getMonthName(selectedMonth) : 'Total'} Stats
                  </h3>
                </div>
                {calendarView === 'monthly' ? (
                  <>
                    <div className="text-xl sm:text-2xl font-bold mb-2">
                      ₹{formatAmount(currentMonthStats().total)}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-[10px] sm:text-xs">
                      <div className="bg-white/20 backdrop-blur rounded-lg p-1.5">
                        <div className="text-white/80">Paid</div>
                        <div className="font-bold text-sm">{currentMonthStats().paidCount}</div>
                      </div>
                      <div className="bg-white/20 backdrop-blur rounded-lg p-1.5">
                        <div className="text-white/80">Unpaid</div>
                        <div className="font-bold text-sm">{currentMonthStats().unpaidCount}</div>
                      </div>
                      <div className="bg-white/20 backdrop-blur rounded-lg p-1.5">
                        <div className="text-white/80">Partial</div>
                        <div className="font-bold text-sm">{currentMonthStats().partialCount}</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xl sm:text-2xl font-bold mb-1">
                      {invoices.length}
                    </div>
                    <div className="text-xs text-white/80">Total Invoices</div>
                  </>
                )}
              </div>
            </div>

            {/* REVAMPED: Compact Monthly Calendar View */}
            {calendarView === 'monthly' && (
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                
                {/* Compact Calendar Header with Navigation */}
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-3 sm:p-4 border-b border-slate-200">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        onClick={() => navigateMonth('prev')}
                        className="p-1.5 hover:bg-white rounded-lg transition-all shadow-sm border border-slate-200"
                        title="Previous month"
                      >
                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                      </button>
                      
                      <div className="text-center min-w-[150px]">
                        <h3 className="text-lg sm:text-xl font-bold text-slate-800">
                          {getMonthName(selectedMonth)}
                        </h3>
                        <p className="text-xs text-slate-500">{selectedYear}</p>
                      </div>
                      
                      <button
                        onClick={() => navigateMonth('next')}
                        className="p-1.5 hover:bg-white rounded-lg transition-all shadow-sm border border-slate-200"
                        title="Next month"
                      >
                        <ChevronRight className="w-4 h-4 text-slate-600" />
                      </button>
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={goToToday}
                        className="flex-1 sm:flex-none px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-xs font-medium shadow-sm"
                      >
                        Today
                      </button>
                      <button
                        onClick={() => exportToExcel(getInvoicesByMonthYear(selectedMonth, selectedYear), `invoices_${getMonthName(selectedMonth)}_${selectedYear}`)}
                        className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-xs font-medium shadow-sm flex items-center justify-center gap-1.5"
                        disabled={getInvoicesByMonthYear(selectedMonth, selectedYear).length === 0}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Export
                      </button>
                    </div>
                  </div>
                  
                  {/* Compact Month Summary */}
                  <div className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-2">
                    <div className="bg-white rounded-lg p-1.5 sm:p-2 border border-slate-200">
                      <div className="text-[10px] sm:text-xs text-slate-500">Total</div>
                      <div className="text-sm sm:text-base font-bold text-slate-800">
                        {currentMonthStats().count}
                      </div>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-1.5 sm:p-2 border border-emerald-200">
                      <div className="text-[10px] sm:text-xs text-emerald-600">Paid</div>
                      <div className="text-xs sm:text-sm font-bold text-emerald-700">
                        ₹{formatAmount(currentMonthStats().paid)}
                      </div>
                    </div>
                    <div className="bg-rose-50 rounded-lg p-1.5 sm:p-2 border border-rose-200">
                      <div className="text-[10px] sm:text-xs text-rose-600">Unpaid</div>
                      <div className="text-xs sm:text-sm font-bold text-rose-700">
                        ₹{formatAmount(currentMonthStats().unpaid)}
                      </div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-1.5 sm:p-2 border border-amber-200">
                      <div className="text-[10px] sm:text-xs text-amber-600">Partial</div>
                      <div className="text-xs sm:text-sm font-bold text-amber-700">
                        ₹{formatAmount(currentMonthStats().partial)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compact Calendar Grid */}
                <div className="p-2 sm:p-3">
                  <div className="grid grid-cols-7 gap-1">
                    {/* Day headers */}
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center py-1.5 sm:py-2">
                        <span className="text-[10px] sm:text-xs font-bold text-slate-600">{day}</span>
                      </div>
                    ))}

                    {/* Calendar days */}
                    {renderMonthlyCalendar().map((day, index) => {
                      const isToday = day.date.toDateString() === new Date().toDateString();
                      const isSelected = selectedDate && day.date.toDateString() === selectedDate.toDateString();
                      const hasInvoices = day.invoices.length > 0;
                      
                      return (
                        <button
                          key={index}
                          onClick={() => handleDateClick(day.date)}
                          className={`min-h-[60px] sm:min-h-[80px] p-1 sm:p-1.5 rounded-lg border-2 transition-all duration-200 ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 shadow-lg scale-105'
                              : isToday
                              ? 'border-purple-400 bg-purple-50 shadow-md'
                              : hasInvoices
                              ? 'border-blue-200 bg-blue-25 hover:border-blue-400 hover:shadow-md'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          } ${
                            day.isCurrentMonth ? 'opacity-100' : 'opacity-30'
                          }`}
                        >
                          <div className="flex flex-col h-full">
                            <div className="flex justify-between items-start mb-0.5">
                              <span className={`text-[10px] sm:text-xs font-bold ${
                                isToday 
                                  ? 'text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full' 
                                  : isSelected
                                  ? 'text-blue-600'
                                  : 'text-slate-700'
                              }`}>
                                {day.date.getDate()}
                              </span>
                              {hasInvoices && (
                                <span className={`text-[9px] sm:text-[10px] px-1 py-0.5 rounded-full font-bold ${
                                  isSelected 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {day.invoices.length}
                                </span>
                              )}
                            </div>
                            
                            {/* Compact Invoice preview dots */}
                            {hasInvoices && (
                              <div className="flex-1 flex flex-col gap-0.5 overflow-hidden">
                                {day.invoices.slice(0, 2).map(invoice => (
                                  <div 
                                    key={invoice.id} 
                                    className={`text-[8px] sm:text-[10px] px-1 py-0.5 rounded truncate ${
                                      invoice.status === 'paid' 
                                        ? 'bg-emerald-100 text-emerald-700' 
                                        : invoice.status === 'unpaid'
                                        ? 'bg-rose-100 text-rose-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    ₹{formatAmount(invoice.total || 0)}
                                  </div>
                                ))}
                                {day.invoices.length > 2 && (
                                  <div className="text-[8px] sm:text-[10px] text-slate-500 text-center font-medium">
                                    +{day.invoices.length - 2}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* REVAMPED: Compact Yearly View */}
            {calendarView === 'yearly' && (
              <div className="space-y-3 sm:space-y-4">
                {renderYearlyView().map(yearData => (
                  <div key={yearData.year} className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                    
                    {/* Compact Year Header */}
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
                        <div>
                          <h4 className="text-xl sm:text-2xl font-bold text-white mb-0.5">
                            {yearData.year}
                          </h4>
                          <p className="text-white/80 text-xs">Annual Invoice Summary</p>
                        </div>
                        <div className="bg-white/20 backdrop-blur rounded-lg p-2 sm:p-3 min-w-[160px]">
                          <div className="text-white/80 text-[10px] mb-0.5">Total Revenue</div>
                          <div className="text-xl sm:text-2xl font-bold text-white">
                            ₹{formatAmount(yearData.totalAmount)}
                          </div>
                          <div className="text-white/80 text-[10px] mt-0.5">
                            {yearData.invoices.length} invoice{yearData.invoices.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      {/* Compact Year Stats Row */}
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-3">
                        <div className="bg-white/10 backdrop-blur rounded-lg p-1.5 sm:p-2">
                          <div className="text-white/70 text-[10px]">Paid</div>
                          <div className="text-sm sm:text-base font-bold text-white">
                            ₹{formatAmount(yearData.paidAmount)}
                          </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-lg p-1.5 sm:p-2">
                          <div className="text-white/70 text-[10px]">Unpaid</div>
                          <div className="text-sm sm:text-base font-bold text-white">
                            ₹{formatAmount(yearData.unpaidAmount)}
                          </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-lg p-1.5 sm:p-2">
                          <div className="text-white/70 text-[10px]">Avg/Invoice</div>
                          <div className="text-sm sm:text-base font-bold text-white">
                            ₹{formatAmount(yearData.invoices.length ? yearData.totalAmount / yearData.invoices.length : 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Compact Monthly Breakdown */}
                    <div className="p-3 sm:p-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2">
                        {yearData.monthlySummary.map((month, monthIndex) => {
                          const monthName = getMonthName(monthIndex);
                          const hasInvoices = month.count > 0;
                          
                          return (
                            <button
                              key={monthIndex}
                              onClick={() => {
                                setSelectedMonth(monthIndex);
                                setSelectedYear(yearData.year);
                                setCalendarView('monthly');
                              }}
                              className={`p-2 sm:p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                                hasInvoices
                                  ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-400 hover:shadow-lg'
                                  : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                              }`}
                            >
                              <div className="text-[10px] sm:text-xs font-bold text-slate-700 mb-1">
                                {monthName.substring(0, 3)}
                              </div>
                              
                              {hasInvoices ? (
                                <>
                                  <div className="text-base sm:text-lg font-bold text-blue-600 mb-0.5">
                                    {month.count}
                                  </div>
                                  <div className="text-[9px] sm:text-[10px] text-slate-600 font-medium truncate">
                                    ₹{formatAmount(month.total)}
                                  </div>
                                  
                                  {/* Compact Status indicators */}
                                  <div className="flex gap-0.5 mt-1.5">
                                    {month.paid > 0 && (
                                      <div className="flex-1 h-1 bg-emerald-400 rounded" title={`${month.paid} paid`} />
                                    )}
                                    {month.partial > 0 && (
                                      <div className="flex-1 h-1 bg-amber-400 rounded" title={`${month.partial} partial`} />
                                    )}
                                    {month.unpaid > 0 && (
                                      <div className="flex-1 h-1 bg-rose-400 rounded" title={`${month.unpaid} unpaid`} />
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="text-sm sm:text-base font-bold text-slate-400">
                                  —
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Compact Export Year Button */}
                      {yearData.invoices.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200 flex justify-center">
                          <button
                            onClick={() => exportToExcel(yearData.invoices, `invoices_${yearData.year}`)}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg hover:from-emerald-700 hover:to-green-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-xs sm:text-sm font-semibold"
                          >
                            <Download className="w-4 h-4" />
                            Export {yearData.year} Data
                            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
                              {yearData.invoices.length}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* REVAMPED: Compact Selected Date Invoices */}
            {selectedDate && calendarView === 'monthly' && (
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 sm:p-4 border-b border-slate-200">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-0.5">
                        {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </h3>
                      <p className="text-xs text-slate-600">
                        {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} found
                      </p>
                    </div>
                    
                    {/* Compact Filters */}
                    <div className="flex gap-2 w-full sm:w-auto">
                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(e.target.value);
                          filterInvoicesByDate(selectedDate);
                        }}
                        className="flex-1 sm:flex-none px-2 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Status</option>
                        <option value="paid">Paid</option>
                        <option value="unpaid">Unpaid</option>
                        <option value="partial">Partial</option>
                      </select>
                      
                      {filteredInvoices.length > 0 && (
                        <button
                          onClick={() => exportToExcel(filteredInvoices, `invoices_${selectedDate.toISOString().split('T')[0]}`)}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 text-xs font-medium"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Export</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {filteredInvoices.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-bold text-slate-700 uppercase">Invoice #</th>
                          <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-bold text-slate-700 uppercase">Client</th>
                          <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-bold text-slate-700 uppercase">Amount</th>
                          <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-bold text-slate-700 uppercase">Status</th>
                          <th className="px-3 py-2 text-left text-[10px] sm:text-xs font-bold text-slate-700 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredInvoices.map(invoice => {
                          const client = clients.find(c => c.id === invoice.clientId);
                          return (
                            <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-3 py-2">
                                <div className="text-xs font-bold text-slate-800">{invoice.invoiceNumber}</div>
                              </td>
                              <td className="px-3 py-2">
                                <div className="text-xs font-semibold text-slate-700">{client?.name || 'N/A'}</div>
                                {client?.company && (
                                  <div className="text-[10px] text-slate-500">{client.company}</div>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <div className="text-xs font-bold text-blue-600">
                                  ₹{formatAmount(invoice.total || 0)}
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusColor(invoice.status)}`}>
                                  {getStatusIcon(invoice.status)}
                                  {invoice.status}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => downloadPDF(invoice)}
                                    className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                                    title="Download PDF"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleEditClick(invoice);
                                      setActiveTab('invoices');
                                    }}
                                    className="p-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                    title="Edit Invoice"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium text-sm">No invoices found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No invoices match your filters for this date
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}