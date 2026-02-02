import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  FileText, 
  Edit, 
  Trash2, 
  Save,
  X,
  AlertCircle,
  Wallet,
  TrendingUp,
  Receipt,
  Check,
  ChevronDown,
  User,
  Filter
} from 'lucide-react';

export default function PaymentTracking() {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    invoiceId: '', 
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'bank'
  });
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
  const [billTypeFilter, setBillTypeFilter] = useState('all');

  useEffect(() => {
    const unsubClients = onSnapshot(
      collection(db, 'clients'), 
      (snapshot) => {
        setClients(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (err) => setError(err.message)
    );
    
    const unsubInvoices = onSnapshot(
      collection(db, 'invoices'), 
      (snapshot) => {
        setInvoices(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (err) => setError(err.message)
    );
    
    const unsubPayments = onSnapshot(
      collection(db, 'payments'), 
      (snapshot) => {
        setPayments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (err) => setError(err.message)
    );
    
    return () => { 
      unsubClients(); 
      unsubInvoices(); 
      unsubPayments(); 
    };
  }, []);

  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0';
    
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatAmountWithCurrency = (amount) => {
    return `₹${formatAmount(amount)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const selectedInvoice = invoices.find(i => i.id === form.invoiceId);
      if (!selectedInvoice) {
        setError('Please select a valid invoice');
        return;
      }

      const paymentAmount = selectedInvoice.subtotal || selectedInvoice.amount || 0;
      
      if (editId) {
        await updateDoc(doc(db, 'payments', editId), {
          invoiceId: form.invoiceId,
          amount: parseFloat(paymentAmount),
          paymentDate: form.paymentDate,
          method: form.method,
          updatedAt: new Date()
        });
        console.log('Payment updated successfully:', editId);
        setEditId(null);
      } else {
        const paymentData = {
          invoiceId: form.invoiceId,
          amount: parseFloat(paymentAmount),
          paymentDate: form.paymentDate,
          method: form.method,
          createdAt: new Date()
        };
        const docRef = await addDoc(collection(db, 'payments'), paymentData);
        console.log('Payment created successfully:', docRef.id);
      }
      
      setForm({ 
        invoiceId: '', 
        paymentDate: new Date().toISOString().split('T')[0], 
        method: 'bank' 
      });
      setShowInvoiceDropdown(false);
    } catch (err) {
      console.error('Error saving payment:', err);
      setError(err.message);
    }
  };

  const handleEdit = (payment) => {
    console.log('Editing payment:', payment);
    setForm({
      invoiceId: payment.invoiceId || '',
      paymentDate: payment.paymentDate || new Date().toISOString().split('T')[0],
      method: payment.method || 'bank'
    });
    setEditId(payment.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this payment record?')) {
      try {
        await deleteDoc(doc(db, 'payments', id));
        console.log('Payment deleted successfully:', id);
      } catch (err) {
        console.error('Error deleting payment:', err);
        setError(err.message);
      }
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm({ 
      invoiceId: '', 
      paymentDate: new Date().toISOString().split('T')[0], 
      method: 'bank' 
    });
    setShowInvoiceDropdown(false);
  };

  const getMethodIcon = (method) => {
    switch(method) {
      case 'bank': return <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />;
      case 'cash': return <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />;
      case 'upi': return <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />;
      case 'card': return <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />;
      default: return <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />;
    }
  };

  const getMethodBadgeColor = (method) => {
    switch(method) {
      case 'bank': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'cash': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'upi': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'card': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getBillTypeColor = (billType) => {
    return billType === 'debit' 
      ? 'bg-blue-50 text-blue-700 border-blue-200' 
      : 'bg-purple-50 text-purple-700 border-purple-200';
  };

  // Calculate totals by bill type - ONLY count invoices with explicit billType
  const debitTotal = payments
    .filter(payment => {
      const invoice = invoices.find(i => i.id === payment.invoiceId);
      return invoice && invoice.billType === 'debit';
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const creditTotal = payments
    .filter(payment => {
      const invoice = invoices.find(i => i.id === payment.invoiceId);
      return invoice && invoice.billType === 'credit';
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const debitCount = payments.filter(p => {
    const inv = invoices.find(i => i.id === p.invoiceId);
    return inv && inv.billType === 'debit';
  }).length;

  const creditCount = payments.filter(p => {
    const inv = invoices.find(i => i.id === p.invoiceId);
    return inv && inv.billType === 'credit';
  }).length;

  // Filter payments based on bill type - ONLY show payments with explicit billType when filtering
  const filteredPayments = payments.filter(payment => {
    if (billTypeFilter === 'all') return true;
    const invoice = invoices.find(i => i.id === payment.invoiceId);
    return invoice && invoice.billType === billTypeFilter;
  });

  // Filter invoices for dropdown based on bill type filter
  const filteredInvoicesForDropdown = invoices.filter(invoice => {
    if (billTypeFilter === 'all') return true;
    return invoice.billType === billTypeFilter;
  });

  const selectedInvoice = invoices.find(i => i.id === form.invoiceId);
  const selectedClient = selectedInvoice ? clients.find(c => c.id === selectedInvoice.clientId) : null;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showInvoiceDropdown && !event.target.closest('.invoice-dropdown-container')) {
        setShowInvoiceDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInvoiceDropdown]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      <div className="px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6 lg:px-8 lg:py-8 max-w-[1600px] mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-5 md:p-6 mb-4 sm:mb-6 border border-slate-100">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 sm:p-2.5 lg:p-3 rounded-xl shadow-lg flex-shrink-0">
              <Receipt className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 truncate">Payment Tracking</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">Monitor and manage all payments</p>
            </div>
          </div>
        </div>

        {/* Bill Type Filter Tabs - 3 Equal Tabs */}
        <div className="mb-4 sm:mb-6">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <button
              onClick={() => setBillTypeFilter('debit')}
              className={`px-3 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl font-semibold transition-all shadow-lg ${
                billTypeFilter === 'debit'
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-200'
                  : 'bg-white text-slate-700 hover:shadow-xl border border-slate-200'
              }`}
            >
              <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                <CreditCard className={`w-5 h-5 sm:w-6 sm:h-6 ${billTypeFilter === 'debit' ? 'text-white' : 'text-blue-600'}`} />
                <div className="text-xs sm:text-sm font-bold">Debit</div>
                <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${billTypeFilter === 'debit' ? 'text-white' : 'text-blue-600'}`}>
                  ₹{debitTotal.toLocaleString('en-IN')}
                </div>
                <div className={`text-[10px] sm:text-xs ${billTypeFilter === 'debit' ? 'text-white/80' : 'text-slate-500'}`}>
                  {debitCount} payment{debitCount !== 1 ? 's' : ''}
                </div>
              </div>
            </button>

            <button
              onClick={() => setBillTypeFilter('credit')}
              className={`px-3 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl font-semibold transition-all shadow-lg ${
                billTypeFilter === 'credit'
                  ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-purple-200'
                  : 'bg-white text-slate-700 hover:shadow-xl border border-slate-200'
              }`}
            >
              <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                <CreditCard className={`w-5 h-5 sm:w-6 sm:h-6 ${billTypeFilter === 'credit' ? 'text-white' : 'text-purple-600'}`} />
                <div className="text-xs sm:text-sm font-bold">Credit</div>
                <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${billTypeFilter === 'credit' ? 'text-white' : 'text-purple-600'}`}>
                  ₹{creditTotal.toLocaleString('en-IN')}
                </div>
                <div className={`text-[10px] sm:text-xs ${billTypeFilter === 'credit' ? 'text-white/80' : 'text-slate-500'}`}>
                  {creditCount} payment{creditCount !== 1 ? 's' : ''}
                </div>
              </div>
            </button>

            <button
              onClick={() => setBillTypeFilter('all')}
              className={`px-3 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl font-semibold transition-all shadow-lg ${
                billTypeFilter === 'all'
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-200'
                  : 'bg-white text-slate-700 hover:shadow-xl border border-slate-200'
              }`}
            >
              <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                <TrendingUp className={`w-5 h-5 sm:w-6 sm:h-6 ${billTypeFilter === 'all' ? 'text-white' : 'text-emerald-600'}`} />
                <div className="text-xs sm:text-sm font-bold">Total</div>
                <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${billTypeFilter === 'all' ? 'text-white' : 'text-emerald-600'}`}>
                  ₹{(debitTotal + creditTotal).toLocaleString('en-IN')}
                </div>
                <div className={`text-[10px] sm:text-xs ${billTypeFilter === 'all' ? 'text-white/80' : 'text-slate-500'}`}>
                  {payments.length} payment{payments.length !== 1 ? 's' : ''}
                </div>
              </div>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl mb-4 sm:mb-6 flex items-start gap-2 shadow-sm">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
            <span className="text-xs sm:text-sm">{error}</span>
          </div>
        )}

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="bg-white p-3 sm:p-4 md:p-5 lg:p-6 rounded-xl sm:rounded-2xl shadow-lg mb-4 sm:mb-6 border border-slate-100">
          {editId && (
            <div className="mb-3 sm:mb-4 p-2.5 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-1.5 sm:gap-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span className="text-xs sm:text-sm font-medium text-blue-800">
                You are editing an existing payment record
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
            <div className="p-1.5 sm:p-2 bg-indigo-50 rounded-lg flex-shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-800">
              {editId ? 'Edit Payment Record' : 'Record New Payment'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
            {/* Invoice Dropdown */}
            <div className="relative invoice-dropdown-container sm:col-span-2 md:col-span-1">
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">
                Select Invoice {billTypeFilter !== 'all' && (
                  <span className="text-[10px] sm:text-xs text-slate-500">
                    (showing {billTypeFilter} bills only)
                  </span>
                )}
              </label>
              <div className="relative">
                <div 
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 sm:px-3 sm:py-2.5 text-sm sm:text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent flex items-center justify-between cursor-pointer bg-white"
                  onClick={() => setShowInvoiceDropdown(!showInvoiceDropdown)}
                >
                  <div className="min-w-0 flex-1">
                    {form.invoiceId ? (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs sm:text-sm font-medium text-slate-900 truncate block">
                            {selectedInvoice?.invoiceNumber || 'Select Invoice'}
                          </span>
                          {selectedClient && (
                            <div className="text-[10px] sm:text-xs text-slate-500 truncate">
                              ({selectedClient.name})
                            </div>
                          )}
                        </div>
                        {selectedInvoice?.billType && (
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold border flex-shrink-0 ${getBillTypeColor(selectedInvoice.billType)}`}>
                            {selectedInvoice.billType.toUpperCase()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-500 text-xs sm:text-sm">Select Invoice</span>
                      </div>
                    )}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0 ml-2 transition-transform ${showInvoiceDropdown ? 'rotate-180' : ''}`} />
                </div>
                
                {showInvoiceDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-48 sm:max-h-60 overflow-y-auto">
                    <div className="p-2 bg-slate-50 border-b sticky top-0">
                      <div className="text-[10px] sm:text-xs font-semibold text-slate-700 mb-1">
                        Available Invoices {billTypeFilter !== 'all' && `(${billTypeFilter})`}
                      </div>
                    </div>
                    {filteredInvoicesForDropdown.length > 0 ? (
                      filteredInvoicesForDropdown.map((invoice) => {
                        const client = clients.find(c => c.id === invoice.clientId);
                        const isSelected = form.invoiceId === invoice.id;
                        return (
                          <div
                            key={invoice.id}
                            className={`px-2.5 py-2 sm:px-3 sm:py-2 hover:bg-blue-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                            onClick={() => {
                              setForm({...form, invoiceId: invoice.id});
                              setShowInvoiceDropdown(false);
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <div className="text-xs sm:text-sm font-medium text-slate-900 truncate">{invoice.invoiceNumber}</div>
                                  {invoice.billType && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold border flex-shrink-0 ${getBillTypeColor(invoice.billType)}`}>
                                      {invoice.billType.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] sm:text-xs text-slate-600 flex items-center gap-1 mt-0.5 sm:mt-1 truncate">
                                  <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                                  {client?.name || 'Unknown Client'}
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-xs sm:text-sm font-semibold text-emerald-600">
                                  ₹{formatAmount(invoice.subtotal || invoice.amount || 0)}
                                </div>
                                <div className={`text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full mt-0.5 sm:mt-1 inline-block ${
                                  invoice.status === 'paid' 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : invoice.status === 'partial'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-rose-100 text-rose-700'
                                }`}>
                                  {invoice.status || 'unpaid'}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2 text-xs sm:text-sm text-slate-500">
                        No {billTypeFilter !== 'all' ? billTypeFilter : ''} invoices found
                      </div>
                    )}
                  </div>
                )}
              </div>
              {form.invoiceId && selectedInvoice && (
                <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="truncate">Payment amount will be: ₹{formatAmount(selectedInvoice.subtotal || selectedInvoice.amount || 0)}</span>
                    <span className={`px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-[10px] sm:text-xs flex-shrink-0 ${selectedInvoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : selectedInvoice.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                      {selectedInvoice.status || 'unpaid'}
                    </span>
                    {selectedInvoice.billType && (
                      <span className={`px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-[10px] sm:text-xs flex-shrink-0 border font-semibold ${getBillTypeColor(selectedInvoice.billType)}`}>
                        {selectedInvoice.billType.charAt(0).toUpperCase() + selectedInvoice.billType.slice(1)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">
                Payment Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                <input 
                  type="date" 
                  value={form.paymentDate}
                  onChange={(e) => setForm({...form, paymentDate: e.target.value})}
                  className="w-full pl-9 sm:pl-10 pr-2.5 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">
                Payment Method
              </label>
              <div className="relative">
                <CreditCard className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                <select 
                  value={form.method}
                  onChange={(e) => setForm({...form, method: e.target.value})}
                  className="w-full pl-9 sm:pl-10 pr-2.5 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
                  required
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>
          </div>

          {/* Invoice Details Preview */}
          {form.invoiceId && selectedInvoice && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h4 className="font-semibold text-slate-800 text-sm sm:text-base mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Invoice & Payment Details
              </h4>
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                <div className="bg-white p-2 sm:p-2.5 lg:p-3 rounded-lg shadow-sm">
                  <span className="text-[10px] sm:text-xs text-slate-600 block mb-0.5 sm:mb-1">Invoice Number</span>
                  <span className="text-xs sm:text-sm font-medium text-slate-900 truncate block">{selectedInvoice.invoiceNumber}</span>
                </div>
                <div className="bg-white p-2 sm:p-2.5 lg:p-3 rounded-lg shadow-sm">
                  <span className="text-[10px] sm:text-xs text-slate-600 block mb-0.5 sm:mb-1">Client</span>
                  <span className="text-xs sm:text-sm font-medium text-slate-900 truncate block">{selectedClient?.name || 'N/A'}</span>
                </div>
                {selectedInvoice.billType && (
                  <div className="bg-white p-2 sm:p-2.5 lg:p-3 rounded-lg shadow-sm">
                    <span className="text-[10px] sm:text-xs text-slate-600 block mb-0.5 sm:mb-1">Bill Type</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border ${getBillTypeColor(selectedInvoice.billType)}`}>
                      <CreditCard className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      {selectedInvoice.billType.charAt(0).toUpperCase() + selectedInvoice.billType.slice(1)}
                    </span>
                  </div>
                )}
                <div className="bg-white p-2 sm:p-2.5 lg:p-3 rounded-lg shadow-sm xs:col-span-2 md:col-span-1">
                  <span className="text-[10px] sm:text-xs text-slate-600 block mb-0.5 sm:mb-1">Payment Amount</span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-600 truncate block">
                    ₹{formatAmount(selectedInvoice.subtotal || selectedInvoice.amount || 0)}
                  </span>
                </div>
              </div>
              <div className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-slate-500">
                Note: Payment amount is automatically set to the invoice total amount.
              </div>
            </div>
          )}

          <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 mt-4 sm:mt-5 lg:mt-6">
            <button 
              type="submit" 
              disabled={!form.invoiceId}
              className={`px-4 py-2 sm:px-5 sm:py-2.5 lg:px-6 rounded-lg font-medium text-sm sm:text-base shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
                !form.invoiceId
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700'
              }`}
            >
              {editId ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              {editId ? 'Update Payment' : 'Record Payment'}
            </button>
            
            {editId && (
              <button 
                type="button"
                onClick={cancelEdit}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 sm:px-5 sm:py-2.5 lg:px-6 rounded-lg font-medium text-sm sm:text-base flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm transition-colors"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Payment Records Table/Cards */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-slate-100">
          <div className="p-3 sm:p-4 lg:p-5 xl:p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-indigo-50 to-purple-50">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800">
                Payment History ({filteredPayments.length})
                {billTypeFilter !== 'all' && (
                  <span className="text-xs sm:text-sm font-normal text-slate-600 ml-2">
                    ({billTypeFilter} bills)
                  </span>
                )}
              </h3>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Invoice #</th>
                  <th className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Client</th>
                  <th className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Bill Type</th>
                  <th className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                  <th className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                  <th className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Payment Method</th>
                  <th className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 lg:py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 lg:p-4 bg-slate-50 rounded-full">
                          <Receipt className="w-10 h-10 lg:w-12 lg:h-12 text-slate-300" />
                        </div>
                        <p className="text-base lg:text-lg font-medium text-slate-600">
                          No {billTypeFilter !== 'all' ? billTypeFilter : ''} payments recorded yet
                        </p>
                        <p className="text-sm text-slate-500">Record your first payment to get started</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(payment => {
                    const invoice = invoices.find(i => i.id === payment.invoiceId);
                    const client = invoice ? clients.find(c => c.id === invoice.clientId) : null;
                    
                    return (
                      <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6">
                          <div className="flex items-center gap-2">
                            <div className="bg-indigo-100 p-1.5 lg:p-2 rounded-full flex-shrink-0">
                              <FileText className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-indigo-600" />
                            </div>
                            <span className="font-medium text-slate-800 text-xs sm:text-sm truncate">
                              {invoice?.invoiceNumber || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6">
                          <span className="text-xs sm:text-sm text-slate-700 truncate block max-w-[150px]">
                            {client?.name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6">
                          {invoice?.billType ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${getBillTypeColor(invoice.billType)}`}>
                              <CreditCard className="w-3 h-3" />
                              {invoice.billType.charAt(0).toUpperCase() + invoice.billType.slice(1)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6">
                          <span className="text-base lg:text-lg font-semibold text-emerald-600">
                            ₹{payment.amount?.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6 text-slate-600 text-xs sm:text-sm">
                          {payment.paymentDate}
                        </td>
                        <td className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6">
                          <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium border ${getMethodBadgeColor(payment.method)}`}>
                            {getMethodIcon(payment.method)}
                            <span className="capitalize">{payment.method}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <button 
                              onClick={() => handleEdit(payment)} 
                              className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-1.5 lg:p-2 rounded-lg shadow-sm transition-colors"
                              title="Edit payment"
                            >
                              <Edit className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(payment.id)} 
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 lg:p-2 rounded-lg shadow-sm transition-colors"
                              title="Delete payment"
                            >
                              <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="lg:hidden divide-y divide-slate-100">
            {filteredPayments.length === 0 ? (
              <div className="px-4 py-12 sm:px-6 sm:py-16 text-center text-slate-500">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 sm:p-4 bg-slate-50 rounded-full">
                    <Receipt className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300" />
                  </div>
                  <p className="text-base sm:text-lg font-medium text-slate-600">
                    No {billTypeFilter !== 'all' ? billTypeFilter : ''} payments recorded yet
                  </p>
                  <p className="text-sm text-slate-500">Record your first payment to get started</p>
                </div>
              </div>
            ) : (
              filteredPayments.map(payment => {
                const invoice = invoices.find(i => i.id === payment.invoiceId);
                const client = invoice ? clients.find(c => c.id === invoice.clientId) : null;
                
                return (
                  <div key={payment.id} className="p-3 sm:p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="bg-indigo-100 p-2 sm:p-2.5 rounded-full flex-shrink-0">
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-slate-800 text-sm sm:text-base truncate">
                            {invoice?.invoiceNumber || 'N/A'}
                          </h4>
                          <p className="text-xs sm:text-sm text-slate-600 mt-0.5 sm:mt-1 truncate">{client?.name || 'N/A'}</p>
                          <p className="text-base sm:text-lg font-bold text-emerald-600 mt-1 sm:mt-1.5">
                            ₹{payment.amount?.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{payment.paymentDate}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium border ${getMethodBadgeColor(payment.method)}`}>
                          {getMethodIcon(payment.method)}
                          <span className="capitalize">{payment.method}</span>
                        </span>
                        {invoice?.billType && (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-semibold border ${getBillTypeColor(invoice.billType)}`}>
                            <CreditCard className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            {invoice.billType.charAt(0).toUpperCase() + invoice.billType.slice(1)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1.5 sm:gap-2">
                      <button 
                        onClick={() => handleEdit(payment)} 
                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(payment.id)} 
                        className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Delete
                      </button>
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