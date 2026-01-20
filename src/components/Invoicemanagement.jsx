import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import { 
  FileText, Download, Edit2, Trash2, Save, X, 
  Plus, DollarSign, Calendar, User, Briefcase,
  CheckCircle, Clock, AlertCircle, Receipt, ChevronDown, Tag
} from 'lucide-react';

export default function InvoiceManagement() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    clientId: '', 
    selectedServices: [], // Array of selected services with their amounts
    service: '', // String for display
    totalAmount: '', // Total calculated from all service amounts
    tax: 0,
    date: new Date().toISOString().split('T')[0], 
    status: 'unpaid'
  });

  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [editForm, setEditForm] = useState({
    service: '',
    amount: '',
    tax: 0,
    status: 'unpaid'
  });

  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [customService, setCustomService] = useState('');
  const [availableServices, setAvailableServices] = useState([]);

  useEffect(() => {
    const unsubClients = onSnapshot(collection(db, 'clients'), (s) => {
      const clientsData = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setClients(clientsData);
      
      // Extract unique services from all clients
      const servicesSet = new Set();
      clientsData.forEach(client => {
        if (client.services) {
          // Split by comma and trim each service
          const clientServices = client.services.split(',')
            .map(service => service.trim())
            .filter(service => service.length > 0);
          
          clientServices.forEach(service => servicesSet.add(service));
        }
      });
      
      // Convert Set to Array and sort alphabetically
      const uniqueServices = Array.from(servicesSet).sort();
      setAvailableServices(uniqueServices);
    });
    
    const unsubInvoices = onSnapshot(collection(db, 'invoices'), (s) => 
      setInvoices(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    return () => { 
      unsubClients(); 
      unsubInvoices(); 
    };
  }, []);

  // Calculate total amount from all services
  const calculateTotalAmount = (services) => {
    return services.reduce((total, service) => {
      const amount = parseFloat(service.amount) || 0;
      return total + amount;
    }, 0);
  };

  const handleEditClick = (invoice) => {
    setEditingInvoiceId(invoice.id);
    setEditForm({
      service: invoice.service || '',
      amount: invoice.subtotal || invoice.amount || '',
      tax: invoice.taxPercentage || 0,
      status: invoice.status || 'unpaid'
    });
  };

  const handleSaveEdit = async (invoiceId) => {
    try {
      const subtotal = parseFloat(editForm.amount) || 0;
      const taxPercentage = parseFloat(editForm.tax) || 0;
      const taxAmount = (subtotal * taxPercentage) / 100;
      const total = subtotal + taxAmount;

      await updateDoc(doc(db, 'invoices', invoiceId), {
        service: editForm.service,
        subtotal: subtotal,
        taxPercentage: taxPercentage,
        taxAmount: taxAmount,
        total: total,
        status: editForm.status
      });

      setEditingInvoiceId(null);
      setEditForm({ service: '', amount: '', tax: 0, status: 'unpaid' });
    } catch (error) {
      console.error('Error updating invoice:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingInvoiceId(null);
    setEditForm({ service: '', amount: '', tax: 0, status: 'unpaid' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const subtotal = parseFloat(form.totalAmount) || 0;
    const taxPercentage = parseFloat(form.tax) || 0;
    const taxAmount = (subtotal * taxPercentage) / 100;
    const total = subtotal + taxAmount;
    
    await addDoc(collection(db, 'invoices'), {
      clientId: form.clientId,
      service: form.service,
      selectedServices: form.selectedServices, // Store selected services with amounts
      subtotal: subtotal,
      taxPercentage: taxPercentage,
      taxAmount: taxAmount,
      total: total,
      invoiceNumber: `INV-${Date.now()}`,
      date: form.date,
      status: form.status,
      createdAt: new Date()
    });
    
    setForm({ 
      clientId: '', 
      selectedServices: [],
      service: '',
      totalAmount: '',
      tax: 0,
      date: new Date().toISOString().split('T')[0], 
      status: 'unpaid'
    });
    setCustomService('');
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
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'partial': return <Clock className="w-4 h-4" />;
      case 'unpaid': return <AlertCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-300';
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'unpaid': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const handleServiceSelect = (serviceName) => {
    const isSelected = form.selectedServices.find(s => s.name === serviceName);
    let newSelectedServices;
    
    if (isSelected) {
      // Remove service if already selected
      newSelectedServices = form.selectedServices.filter(s => s.name !== serviceName);
    } else {
      // Add service if not selected (with empty amount initially)
      newSelectedServices = [...form.selectedServices, { 
        name: serviceName, 
        amount: '' 
      }];
    }
    
    const serviceNames = newSelectedServices.map(s => s.name).join(', ');
    const totalAmount = calculateTotalAmount(newSelectedServices);
    
    setForm({
      ...form,
      selectedServices: newSelectedServices,
      service: serviceNames,
      totalAmount: totalAmount.toString()
    });
    
    setShowServiceDropdown(false);
  };

  const handleCustomServiceAdd = () => {
    if (customService.trim()) {
      const newSelectedServices = [...form.selectedServices, { 
        name: customService.trim(), 
        amount: '' 
      }];
      const serviceNames = newSelectedServices.map(s => s.name).join(', ');
      const totalAmount = calculateTotalAmount(newSelectedServices);
      
      setForm({
        ...form,
        selectedServices: newSelectedServices,
        service: serviceNames,
        totalAmount: totalAmount.toString()
      });
      
      setCustomService('');
      setShowServiceDropdown(false);
    }
  };

  const updateServiceAmount = (index, newAmount) => {
    const updatedServices = [...form.selectedServices];
    updatedServices[index].amount = newAmount;
    
    const serviceNames = updatedServices.map(s => s.name).join(', ');
    const totalAmount = calculateTotalAmount(updatedServices);
    
    setForm({
      ...form,
      selectedServices: updatedServices,
      service: serviceNames,
      totalAmount: totalAmount.toString()
    });
  };

  const removeService = (index) => {
    const updatedServices = form.selectedServices.filter((_, i) => i !== index);
    const serviceNames = updatedServices.map(s => s.name).join(', ');
    const totalAmount = calculateTotalAmount(updatedServices);
    
    setForm({
      ...form,
      selectedServices: updatedServices,
      service: serviceNames,
      totalAmount: totalAmount.toString()
    });
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
    
    // ============ CENTERED LOGO SECTION ============
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
      pdfDoc.setFontSize(20);
      pdfDoc.setFont(undefined, 'bold');
      pdfDoc.text('BID', logoX + logoDisplayWidth/2, yPos + fallbackHeight/2 + 5, { align: 'center' });
      yPos += fallbackHeight + 8;
    }
    
    // Address
    pdfDoc.setFontSize(9);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('SCO 246, Devaji Plaza, VIP Road', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    pdfDoc.text('Zirakpur, India', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    pdfDoc.text('marketing@buildingindiadigital.com', pageWidth / 2, yPos, { align: 'center' });
    yPos += 6;
    pdfDoc.text('+91 8054481253', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // Invoice title
    pdfDoc.setFillColor(255, 152, 0);
    pdfDoc.roundedRect(leftMargin, yPos, contentWidth, 10, 2, 2, 'F');
    pdfDoc.setTextColor(255, 255, 255);
    pdfDoc.setFontSize(12);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('TAX INVOICE', leftMargin + contentWidth/2, yPos + 7, { align: 'center' });
    
    // Invoice details
    yPos += 20;
    const columnWidth = contentWidth / 2;
    
    pdfDoc.setTextColor(0, 0, 0);
    pdfDoc.setFontSize(9);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('INVOICE DETAILS', leftMargin, yPos);
    
    pdfDoc.setFontSize(8);
    pdfDoc.setFont(undefined, 'normal');
    pdfDoc.text(`Invoice Number:`, leftMargin, yPos + 7);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text(invoice.invoiceNumber, leftMargin + 35, yPos + 7);
    pdfDoc.setFont(undefined, 'normal');
    pdfDoc.text(`Invoice Date:`, leftMargin, yPos + 14);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text(invoice.date, leftMargin + 35, yPos + 14);
    pdfDoc.setFont(undefined, 'normal');
    pdfDoc.text(`Due Date:`, leftMargin, yPos + 21);
    const dueDate = new Date(invoice.date);
    dueDate.setDate(dueDate.getDate() + 30);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text(dueDate.toISOString().split('T')[0], leftMargin + 35, yPos + 21);
    pdfDoc.setFont(undefined, 'normal');
    pdfDoc.text(`Status:`, leftMargin, yPos + 28);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text(invoice.status.toUpperCase(), leftMargin + 35, yPos + 28);
    
    // Client details
    pdfDoc.setFontSize(9);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('BILL TO', leftMargin + columnWidth, yPos);
    pdfDoc.setFontSize(8);
    pdfDoc.setFont(undefined, 'normal');
    
    const clientName = client?.name || 'Client Name';
    const clientCompany = client?.company || '';
    const clientEmail = client?.email || '';
    const clientPhone = client?.phone || '';
    
    pdfDoc.text(clientName, leftMargin + columnWidth, yPos + 7);
    
    let lineOffset = 7;
    if (clientCompany) {
      lineOffset += 7;
      pdfDoc.text(clientCompany, leftMargin + columnWidth, yPos + lineOffset);
    }
    if (clientEmail) {
      lineOffset += 7;
      pdfDoc.text(clientEmail, leftMargin + columnWidth, yPos + lineOffset);
    }
    if (clientPhone) {
      lineOffset += 7;
      pdfDoc.text(clientPhone, leftMargin + columnWidth, yPos + lineOffset);
    }
    
    // Items table WITH HEADER
    yPos += 45;
    
    // Get services from invoice
    const services = invoice.selectedServices || 
                    (invoice.service ? invoice.service.split(',').map(s => ({
                      name: s.trim(),
                      amount: 0
                    })) : []);
    
    const headerHeight = 8;
    const rowHeight = 8;
    const totalTableHeight = headerHeight + (rowHeight * services.length);
    
    // Draw table header
    pdfDoc.setFillColor(76, 175, 80);
    pdfDoc.roundedRect(leftMargin, yPos, contentWidth, headerHeight, 2, 2, 'F');
    pdfDoc.setTextColor(255, 255, 255);
    pdfDoc.setFontSize(9);
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('S.NO', leftMargin + 3, yPos + 6);
    pdfDoc.text('DESCRIPTION', leftMargin + 20, yPos + 6);
    pdfDoc.text('AMOUNT', leftMargin + contentWidth - 5, yPos + 6, { align: 'right' });
    
    yPos += headerHeight;
    
    // Draw table border
    pdfDoc.setDrawColor(200, 200, 200);
    pdfDoc.setLineWidth(0.2);
    pdfDoc.rect(leftMargin, yPos - headerHeight, contentWidth, totalTableHeight);
    pdfDoc.line(leftMargin + 15, yPos - headerHeight, leftMargin + 15, yPos - headerHeight + totalTableHeight);
    pdfDoc.line(leftMargin + 100, yPos - headerHeight, leftMargin + 100, yPos - headerHeight + totalTableHeight);
    
    // Add services with their individual amounts
    pdfDoc.setTextColor(0, 0, 0);
    pdfDoc.setFontSize(9);
    pdfDoc.setFont(undefined, 'normal');
    
    let serviceY = yPos;
    let subtotal = 0;
    
    services.forEach((service, index) => {
      // Serial number
      pdfDoc.text(`${index + 1}`, leftMargin + 7, serviceY + 6);
      
      // Service description
      const serviceText = service.name.length > 35 ? service.name.substring(0, 32) + '...' : service.name;
      pdfDoc.text(serviceText, leftMargin + 18, serviceY + 6);
      
      // Service amount
      const serviceAmount = parseFloat(service.amount) || 0;
      subtotal += serviceAmount;
      pdfDoc.text(formatAmountWithCurrency(serviceAmount), leftMargin + contentWidth - 5, serviceY + 6, { align: 'right' });
      
      // Draw horizontal line between services
      if (index < services.length - 1) {
        pdfDoc.setDrawColor(200, 200, 200);
        pdfDoc.setLineWidth(0.2);
        pdfDoc.line(leftMargin, serviceY + rowHeight, leftMargin + contentWidth, serviceY + rowHeight);
      }
      
      serviceY += rowHeight;
    });
    
    // Totals section
    yPos = serviceY + 10;
    const totalsX = leftMargin + 90;
    
    pdfDoc.setFont(undefined, 'normal');
    pdfDoc.setFontSize(9);
    pdfDoc.text('Subtotal:', totalsX, yPos);
    pdfDoc.text(formatAmountWithCurrency(invoice.subtotal || subtotal), leftMargin + contentWidth - 5, yPos, { align: 'right' });
    
    const taxPercentage = invoice.taxPercentage || 0;
    pdfDoc.text(`Tax (${taxPercentage}%):`, totalsX, yPos + 7);
    pdfDoc.text(formatAmountWithCurrency(invoice.taxAmount || 0), leftMargin + contentWidth - 5, yPos + 7, { align: 'right' });
    
    pdfDoc.setDrawColor(255, 152, 0);
    pdfDoc.setLineWidth(0.5);
    pdfDoc.line(totalsX, yPos + 10, leftMargin + contentWidth, yPos + 10);
    
    yPos += 15;
    pdfDoc.setFillColor(255, 243, 224);
    pdfDoc.roundedRect(totalsX - 5, yPos - 5, 50, 10, 2, 2, 'F');
    
    pdfDoc.setFont(undefined, 'bold');
    pdfDoc.setFontSize(11);
    pdfDoc.text('TOTAL:', totalsX, yPos);
    pdfDoc.text(formatAmountWithCurrency(invoice.total || invoice.amount), leftMargin + contentWidth - 5, yPos, { align: 'right' });
    
    // Footer
    const footerY = pageHeight - 30;
    yPos += 25;
    const separatorY = Math.min(yPos, footerY - 15);
    
    pdfDoc.setDrawColor(76, 175, 80);
    pdfDoc.setLineWidth(0.5);
    pdfDoc.line(leftMargin, separatorY, leftMargin + contentWidth, separatorY);
    
    pdfDoc.setTextColor(0, 0, 0);
    pdfDoc.setFontSize(8);
    pdfDoc.setFont(undefined, 'normal');
    
    pdfDoc.text('Thank you for your business!', leftMargin + contentWidth/2, footerY - 10, { align: 'center' });
    pdfDoc.text('For any queries: marketing@buildingindiadigital.com | +91 8054481253', leftMargin + contentWidth/2, footerY - 3, { align: 'center' });
    pdfDoc.text('Building India Digital © 2025', leftMargin + contentWidth/2, footerY + 4, { align: 'center' });
    
    pdfDoc.save(`${invoice.invoiceNumber}.pdf`);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Receipt className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Invoice Management</h2>
            <p className="text-sm text-gray-500 mt-1">Create and manage invoices</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FileText className="w-4 h-4" />
          <span className="font-medium">{invoices.length} Invoice{invoices.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      
      {/* Create Invoice Form */}
      <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-xl shadow-lg mb-6 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Create New Invoice</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Client */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <User className="w-4 h-4" />
              Client
            </label>
            <select 
              value={form.clientId} 
              onChange={(e) => setForm({...form, clientId: e.target.value})}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
              required
            >
              <option value="">Select Client</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          
          {/* Service Dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Briefcase className="w-4 h-4" />
              Select Services
            </label>
            <div className="relative">
              <div 
                className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition flex items-center justify-between cursor-pointer"
                onClick={() => setShowServiceDropdown(!showServiceDropdown)}
              >
                <span className={form.selectedServices.length > 0 ? "text-gray-900" : "text-gray-500"}>
                  {form.selectedServices.length > 0 ? `${form.selectedServices.length} service(s) selected` : "Select services"}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showServiceDropdown ? 'rotate-180' : ''}`} />
              </div>
              
              {showServiceDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {availableServices.length > 0 ? (
                    <>
                      <div className="p-2 bg-gray-50 border-b">
                        <div className="text-xs font-semibold text-gray-700 mb-1">Services from Clients</div>
                        {availableServices.map((service, index) => {
                          const isSelected = form.selectedServices.find(s => s.name === service);
                          return (
                            <div
                              key={index}
                              className={`px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between ${isSelected ? 'bg-blue-50' : ''}`}
                              onClick={() => handleServiceSelect(service)}
                            >
                              <div className="flex items-center">
                                <span className="text-sm text-gray-700">{service}</span>
                                {isSelected && <CheckCircle className="w-3 h-3 text-blue-600 ml-2" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="border-t border-gray-200 p-2">
                        <div className="text-xs text-gray-500 mb-1 px-2">Or enter custom service:</div>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={customService}
                            onChange={(e) => setCustomService(e.target.value)}
                            className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                            placeholder="Enter custom service"
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleCustomServiceAdd())}
                          />
                          <button
                            type="button"
                            onClick={handleCustomServiceAdd}
                            className="bg-blue-100 text-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-200"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-3">
                      <div className="text-sm text-gray-500 mb-2">No services found in clients. Add services in Client Management or enter custom services:</div>
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={customService}
                          onChange={(e) => setCustomService(e.target.value)}
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                          placeholder="Enter custom service"
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleCustomServiceAdd())}
                        />
                        <button
                          type="button"
                          onClick={handleCustomServiceAdd}
                          className="bg-blue-100 text-blue-600 px-3 py-1 rounded text-sm hover:bg-blue-200"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Total Amount (Auto-calculated from individual services) */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <DollarSign className="w-4 h-4" />
              Total Amount (₹)
            </label>
            <div className="relative">
              <input 
                type="number" 
                value={form.totalAmount}
                readOnly
                className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-gray-900 font-semibold"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-600">
                Auto-calculated
              </div>
            </div>
          </div>
          
          {/* Tax Percentage */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tax % (Optional)
            </label>
            <input 
              type="number" 
              placeholder="e.g., 18" 
              value={form.tax}
              onChange={(e) => setForm({...form, tax: e.target.value})}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
          
          {/* Date */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Date
            </label>
            <input 
              type="date" 
              value={form.date}
              onChange={(e) => setForm({...form, date: e.target.value})}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" 
            />
          </div>
          
          {/* Status */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select 
              value={form.status}
              onChange={(e) => setForm({...form, status: e.target.value})}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
            </select>
          </div>
        </div>
        
        {/* Selected Services List with Individual Amount Fields */}
        {form.selectedServices.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Selected Services ({form.selectedServices.length})
            </h4>
            <div className="space-y-3">
              {form.selectedServices.map((service, index) => (
                <div key={index} className="bg-white p-3 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{index + 1}. {service.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeService(index)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">Amount for this service (₹)</label>
                      <input
                        type="number"
                        value={service.amount}
                        onChange={(e) => updateServiceAmount(index, e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        placeholder="Enter amount"
                        required
                      />
                    </div>
                    <div className="mt-5">
                      <span className="text-sm font-medium text-gray-700">
                        {service.amount ? `₹${formatAmount(service.amount)}` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Total Summary */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-gray-800">Services Total:</span>
                    <p className="text-xs text-gray-600 mt-1">Sum of all individual service amounts</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-gray-900">₹{formatAmount(form.totalAmount)}</span>
                    <p className="text-xs text-gray-600 mt-1">{form.selectedServices.length} service{form.selectedServices.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Preview - Only shown when total amount is > 0 */}
        {form.totalAmount && parseFloat(form.totalAmount) > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Invoice Preview
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <span className="text-xs text-gray-600 block mb-1">Subtotal</span>
                <span className="text-lg font-bold text-gray-800">₹{formatAmount(form.totalAmount)}</span>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <span className="text-xs text-gray-600 block mb-1">Tax ({form.tax}%)</span>
                <span className="text-lg font-bold text-orange-600">₹{formatAmount((parseFloat(form.totalAmount) * parseFloat(form.tax)) / 100)}</span>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <span className="text-xs text-gray-600 block mb-1">Total Amount</span>
                <span className="text-lg font-bold text-green-600">
                  ₹{formatAmount(parseFloat(form.totalAmount) + (parseFloat(form.totalAmount) * parseFloat(form.tax)) / 100)}
                </span>
              </div>
            </div>
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={!form.totalAmount || parseFloat(form.totalAmount) === 0 || !form.clientId}
          className={`mt-6 w-full sm:w-auto px-6 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 font-medium ${
            !form.totalAmount || parseFloat(form.totalAmount) === 0 || !form.clientId
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
          }`}
        >
          <Plus className="w-5 h-5" />
          Create Invoice
        </button>
      </form>
      
      {/* Invoices List */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            All Invoices
          </h3>
        </div>
        
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice #</th>
                <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Client</th>
                <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Services</th>
                <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Subtotal</th>
                <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tax</th>
                <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                      <FileText className="w-12 h-12 text-gray-300" />
                      <p className="text-lg">No invoices found</p>
                      <p className="text-sm">Create your first invoice using the form above!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map(invoice => {
                  const client = clients.find(c => c.id === invoice.clientId);
                  const isEditing = editingInvoiceId === invoice.id;
                  const services = invoice.selectedServices || [];
                  
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition">
                      <td className="p-4">
                        <span className="font-mono text-sm font-medium text-gray-900">{invoice.invoiceNumber}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-900">{client?.name || 'N/A'}</span>
                      </td>
                      
                      {/* Services Field with Individual Amounts */}
                      <td className="p-4">
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editForm.service}
                              onChange={(e) => setEditForm({...editForm, service: e.target.value})}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                              placeholder="Enter services (comma separated)"
                              rows="3"
                            />
                            <p className="text-xs text-gray-500">Edit services</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {services.length > 0 ? (
                              services.map((service, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                  <div className="flex items-start">
                                    <span className="text-gray-500 mr-2">{idx + 1}.</span>
                                    <span className="text-gray-700">{service.name}</span>
                                  </div>
                                  <span className="font-medium text-gray-900">₹{formatAmount(service.amount || 0)}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-sm text-gray-400">No services</span>
                            )}
                          </div>
                        )}
                      </td>
                      
                      <td className="p-4">
                        {isEditing ? (
                          <input 
                            type="number"
                            value={editForm.amount}
                            onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                            className="border rounded px-2 py-1 w-28 text-sm"
                            placeholder="Amount"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-900">{formatAmountWithCurrency(invoice.subtotal || invoice.amount)}</span>
                        )}
                      </td>
                      
                      <td className="p-4">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input 
                              type="number"
                              value={editForm.tax}
                              onChange={(e) => setEditForm({...editForm, tax: e.target.value})}
                              className="border rounded px-2 py-1 w-20 text-sm"
                              placeholder="Tax %"
                              min="0"
                              max="100"
                              step="0.1"
                            />
                            <div className="text-xs text-gray-500">
                              ₹{formatAmount((parseFloat(editForm.amount || invoice.subtotal || invoice.amount) * parseFloat(editForm.tax)) / 100)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{invoice.taxPercentage ? `${invoice.taxPercentage}%` : '0%'}</div>
                            <div className="text-xs text-gray-500">{formatAmountWithCurrency(invoice.taxAmount || 0)}</div>
                          </div>
                        )}
                      </td>
                      
                      <td className="p-4">
                        {isEditing ? (
                          <span className="text-sm font-bold text-green-600">
                            ₹{formatAmount(
                              parseFloat(editForm.amount || invoice.subtotal || invoice.amount) + 
                              (parseFloat(editForm.amount || invoice.subtotal || invoice.amount) * parseFloat(editForm.tax)) / 100
                            )}
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-green-600">{formatAmountWithCurrency(invoice.total || invoice.amount)}</span>
                        )}
                      </td>
                      
                      <td className="p-4">
                        {isEditing ? (
                          <select 
                            value={editForm.status}
                            onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="unpaid">Unpaid</option>
                            <option value="paid">Paid</option>
                            <option value="partial">Partial</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                            {getStatusIcon(invoice.status)}
                            {invoice.status || 'unpaid'}
                          </span>
                        )}
                      </td>
                      
                      <td className="p-4">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleSaveEdit(invoice.id)}
                              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                              title="Save"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={handleCancelEdit}
                              className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleEditClick(invoice)}
                              className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => downloadPDF(invoice)} 
                              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteDoc(doc(db, 'invoices', invoice.id))} 
                              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
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
        
        {/* Mobile/Tablet Cards */}
        <div className="lg:hidden divide-y divide-gray-200">
          {invoices.length === 0 ? (
            <div className="p-8 text-center">
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <FileText className="w-12 h-12 text-gray-300" />
                <p className="text-lg">No invoices found</p>
                <p className="text-sm">Create your first invoice!</p>
              </div>
            </div>
          ) : (
            invoices.map(invoice => {
              const client = clients.find(c => c.id === invoice.clientId);
              const isEditing = editingInvoiceId === invoice.id;
              const services = invoice.selectedServices || [];
              
              return (
                <div key={invoice.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-sm font-bold text-gray-900">{invoice.invoiceNumber}</div>
                      <div className="text-sm text-gray-600 mt-1">{client?.name || 'N/A'}</div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                      {getStatusIcon(invoice.status)}
                      {invoice.status}
                    </span>
                  </div>
                  
                  {/* Services Display/Edit with Individual Amounts */}
                  <div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Services</label>
                        <textarea
                          value={editForm.service}
                          onChange={(e) => setEditForm({...editForm, service: e.target.value})}
                          className="w-full border rounded px-2 py-1.5 text-sm"
                          placeholder="SEO, Ads, Web Development"
                          rows="3"
                        />
                        <p className="text-xs text-gray-500">Edit services</p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-xs text-gray-600 mb-2">Services:</div>
                        {services.length > 0 ? (
                          <div className="space-y-2">
                            {services.map((service, idx) => (
                              <div key={idx} className="flex items-center justify-between">
                                <div className="flex items-start">
                                  <span className="text-gray-500 mr-2 text-xs">{idx + 1}.</span>
                                  <span className="text-sm text-gray-700">{service.name}</span>
                                </div>
                                <span className="text-sm font-medium text-gray-900">₹{formatAmount(service.amount || 0)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No services</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {isEditing ? (
                    <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                      <input 
                        type="number"
                        value={editForm.amount}
                        onChange={(e) => setEditForm({...editForm, amount: e.target.value})}
                        className="w-full border rounded px-2 py-1.5 text-sm"
                        placeholder="Amount"
                      />
                      <input 
                        type="number"
                        value={editForm.tax}
                        onChange={(e) => setEditForm({...editForm, tax: e.target.value})}
                        className="w-full border rounded px-2 py-1.5 text-sm"
                        placeholder="Tax %"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                      <select 
                        value={editForm.status}
                        onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                        className="w-full border rounded px-2 py-1.5 text-sm"
                      >
                        <option value="unpaid">Unpaid</option>
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="text-xs text-gray-600">Subtotal</div>
                        <div className="text-sm font-bold text-gray-900">{formatAmountWithCurrency(invoice.subtotal || invoice.amount)}</div>
                      </div>
                      <div className="bg-orange-50 p-2 rounded">
                        <div className="text-xs text-gray-600">Tax</div>
                        <div className="text-sm font-bold text-orange-600">{formatAmountWithCurrency(invoice.taxAmount || 0)}</div>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <div className="text-xs text-gray-600">Total</div>
                        <div className="text-sm font-bold text-green-600">{formatAmountWithCurrency(invoice.total || invoice.amount)}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    {isEditing ? (
                      <>
                        <button 
                          onClick={() => handleSaveEdit(invoice.id)}
                          className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <Save className="w-4 h-4" />
                          Save
                        </button>
                        <button 
                          onClick={handleCancelEdit}
                          className="flex-1 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleEditClick(invoice)}
                          className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button 
                          onClick={() => downloadPDF(invoice)} 
                          className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <Download className="w-4 h-4" />
                          PDF
                        </button>
                        <button 
                          onClick={() => deleteDoc(doc(db, 'invoices', invoice.id))} 
                          className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                          <Trash2 className="w-4 h-4" />
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
  );
}