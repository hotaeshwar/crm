import { useState, useEffect, useRef } from 'react';
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
  Filter,
  CheckCircle,
  Clock,
  AlertCircle as AlertCircleIcon
} from 'lucide-react';

export default function PaymentTracking() {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    invoiceId: '', 
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'bank',
    amount: ''
  });
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
  const [billTypeFilter, setBillTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Track previous payments snapshot to detect any change
  const prevPaymentsRef = useRef([]);
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    const unsubClients = onSnapshot(
      collection(db, 'clients'), 
      (snapshot) => setClients(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => setError(err.message)
    );
    const unsubInvoices = onSnapshot(
      collection(db, 'invoices'), 
      (snapshot) => setInvoices(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => setError(err.message)
    );
    const unsubPayments = onSnapshot(
      collection(db, 'payments'), 
      (snapshot) => {
        const paymentsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        paymentsData.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
        setPayments(paymentsData);
      },
      (err) => setError(err.message)
    );
    return () => { unsubClients(); unsubInvoices(); unsubPayments(); };
  }, []);

  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  };

  const getTotalPaidForInvoice = (invoiceId, paymentsSnapshot = payments) =>
    paymentsSnapshot
      .filter(p => p.invoiceId === invoiceId)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

  const getRemainingAmount = (invoice, paymentsSnapshot = payments) => {
    if (!invoice) return 0;
    const totalPaid = getTotalPaidForInvoice(invoice.id, paymentsSnapshot);
    return Math.max(0, (invoice.total || invoice.amount || 0) - totalPaid);
  };

  const getInvoicePaymentStatus = (invoice, paymentsSnapshot = payments) => {
    if (!invoice) return 'unknown';
    const totalPaid = getTotalPaidForInvoice(invoice.id, paymentsSnapshot);
    const invoiceTotal = invoice.total || invoice.amount || 0;
    if (totalPaid === 0) return 'unpaid';
    if (totalPaid >= invoiceTotal) return 'paid';
    return 'partial';
  };

  // FIXED: Update invoice status based on payments
  const updateInvoiceStatus = async (invoiceId, paymentsSnapshot = payments) => {
    if (isUpdatingRef.current) return;
    
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    const invoicePayments = paymentsSnapshot.filter(p => p.invoiceId === invoiceId);
    if (invoicePayments.length === 0) return;

    const totalPaid = invoicePayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const invoiceTotal = invoice.total || invoice.amount || 0;

    let newStatus = 'unpaid';
    let newAmountReceived = totalPaid;
    let newRemainingAmount = invoiceTotal - totalPaid;

    if (totalPaid > 0 && totalPaid < invoiceTotal) {
      newStatus = 'partial';
    } else if (totalPaid >= invoiceTotal) {
      newStatus = 'paid';
      newAmountReceived = invoiceTotal;
      newRemainingAmount = 0;
    }

    const unchanged =
      invoice.status === newStatus &&
      invoice.amountReceived === newAmountReceived &&
      invoice.remainingAmount === newRemainingAmount;
    
    if (unchanged) return;

    isUpdatingRef.current = true;
    try {
      await updateDoc(doc(db, 'invoices', invoiceId), {
        status: newStatus,
        amountReceived: newAmountReceived,
        remainingAmount: newRemainingAmount,
        updatedAt: new Date()
      });
    } catch (err) {
      console.error('Error updating invoice status:', err);
    } finally {
      isUpdatingRef.current = false;
    }
  };

  // Sync invoices with payments
  useEffect(() => {
    if (invoices.length === 0 || payments.length === 0) return;

    const currentSig = JSON.stringify(payments.map(p => ({ id: p.id, invoiceId: p.invoiceId, amount: p.amount })));
    const prevSig = JSON.stringify(prevPaymentsRef.current.map(p => ({ id: p.id, invoiceId: p.invoiceId, amount: p.amount })));
    if (currentSig === prevSig) return;
    prevPaymentsRef.current = payments;

    const invoiceIdsWithPayments = [...new Set(payments.map(p => p.invoiceId))];
    (async () => {
      for (const id of invoiceIdsWithPayments) {
        await updateInvoiceStatus(id, payments);
      }
    })();
  }, [payments, invoices]);

  // FIXED: Handle form submit with proper edit functionality
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const inv = invoices.find(i => i.id === form.invoiceId);
      if (!inv) { 
        setError('Please select a valid invoice'); 
        return; 
      }

      const paymentAmount = parseFloat(form.amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) { 
        setError('Please enter a valid payment amount'); 
        return; 
      }

      const invoiceTotal = inv.total || inv.amount || 0;
      const paidSoFar = getTotalPaidForInvoice(inv.id);

      if (editId) {
        // Editing existing payment
        const oldPayment = payments.find(p => p.id === editId);
        if (!oldPayment) {
          setError('Payment record not found');
          return;
        }
        
        const oldAmount = oldPayment.amount || 0;
        const adjustedTotal = paidSoFar - oldAmount + paymentAmount;
        
        if (adjustedTotal > invoiceTotal) {
          setError(`Payment exceeds invoice total. Max allowed: ₹${formatAmount(invoiceTotal - (paidSoFar - oldAmount))}`);
          return;
        }
        
        await updateDoc(doc(db, 'payments', editId), {
          invoiceId: form.invoiceId,
          amount: paymentAmount,
          paymentDate: form.paymentDate,
          method: form.method,
          updatedAt: new Date()
        });
        
        // Force update invoice status after payment edit
        await updateInvoiceStatus(inv.id);
        setEditId(null);
      } else {
        // New payment
        const newTotal = paidSoFar + paymentAmount;
        if (newTotal > invoiceTotal) {
          setError(`Payment exceeds invoice total. Max allowed: ₹${formatAmount(invoiceTotal - paidSoFar)}`);
          return;
        }
        
        await addDoc(collection(db, 'payments'), {
          invoiceId: form.invoiceId,
          amount: paymentAmount,
          paymentDate: form.paymentDate,
          method: form.method,
          createdAt: new Date()
        });
        
        await updateInvoiceStatus(inv.id);
      }

      // Reset form
      setForm({ 
        invoiceId: '', 
        paymentDate: new Date().toISOString().split('T')[0], 
        method: 'bank', 
        amount: '' 
      });
      setShowInvoiceDropdown(false);
      
    } catch (err) {
      setError(err.message);
    }
  };

  // FIXED: Handle edit - properly loads payment data
  const handleEdit = (payment) => {
    setForm({
      invoiceId: payment.invoiceId || '',
      paymentDate: payment.paymentDate || new Date().toISOString().split('T')[0],
      method: payment.method || 'bank',
      amount: String(payment.amount || '')
    });
    setEditId(payment.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // FIXED: Handle delete - properly updates invoice after deletion
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this payment record?')) return;
    
    try {
      const payment = payments.find(p => p.id === id);
      if (payment) {
        await deleteDoc(doc(db, 'payments', id));
        // Force update invoice status after deletion
        await updateInvoiceStatus(payment.invoiceId);
      }
    } catch (err) { 
      setError(err.message); 
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm({ 
      invoiceId: '', 
      paymentDate: new Date().toISOString().split('T')[0], 
      method: 'bank', 
      amount: '' 
    });
    setShowInvoiceDropdown(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (showInvoiceDropdown && !e.target.closest('.invoice-dropdown-container'))
        setShowInvoiceDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showInvoiceDropdown]);

  // Derived values for selected invoice
  const selectedInvoice = invoices.find(i => i.id === form.invoiceId);
  const selectedClient = selectedInvoice ? clients.find(c => c.id === selectedInvoice.clientId) : null;

  const totalPaidForSelected = selectedInvoice
    ? getTotalPaidForInvoice(selectedInvoice.id)
    : 0;

  const remainingForSelected = selectedInvoice
    ? getRemainingAmount(selectedInvoice)
    : 0;

  const paymentStatus = selectedInvoice
    ? getInvoicePaymentStatus(selectedInvoice)
    : null;

  // UI Helpers
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

  const getBillTypeColor = (billType) =>
    billType === 'debit'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : 'bg-purple-50 text-purple-700 border-purple-200';

  const getStatusIcon = (status) => {
    switch(status) {
      case 'paid': return <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      case 'partial': return <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      case 'unpaid': return <AlertCircleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
      default: return <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'paid': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'partial': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'unpaid': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Aggregates
  const debitTotal = payments
    .filter(p => invoices.find(i => i.id === p.invoiceId)?.billType === 'debit')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const creditTotal = payments
    .filter(p => invoices.find(i => i.id === p.invoiceId)?.billType === 'credit')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const paidInvoices = invoices.filter(i => i.status === 'paid').length;
  const partialInvoices = invoices.filter(i => i.status === 'partial').length;
  const unpaidInvoices = invoices.filter(i => i.status === 'unpaid').length;

  const filteredPayments = payments.filter(payment => {
    const invoice = invoices.find(i => i.id === payment.invoiceId);
    if (billTypeFilter !== 'all' && invoice?.billType !== billTypeFilter) return false;
    if (statusFilter !== 'all' && invoice?.status !== statusFilter) return false;
    return true;
  });

  const filteredInvoicesForDropdown = invoices.filter(invoice => {
    if (billTypeFilter !== 'all' && invoice.billType !== billTypeFilter) return false;
    if (statusFilter !== 'all' && invoice.status !== statusFilter) return false;
    return true;
  });

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
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">Track payments by invoice status</p>
            </div>
          </div>
        </div>

        {/* Status Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="bg-emerald-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-emerald-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              <span className="text-xs sm:text-sm font-medium text-emerald-800">Paid</span>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-700">{paidInvoices}</div>
            <div className="text-[10px] sm:text-xs text-emerald-600 mt-0.5 sm:mt-1">invoices fully paid</div>
          </div>
          <div className="bg-amber-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-amber-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
              <span className="text-xs sm:text-sm font-medium text-amber-800">Partial</span>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-700">{partialInvoices}</div>
            <div className="text-[10px] sm:text-xs text-amber-600 mt-0.5 sm:mt-1">invoices partially paid</div>
          </div>
          <div className="bg-rose-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-rose-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <AlertCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
              <span className="text-xs sm:text-sm font-medium text-rose-800">Unpaid</span>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-rose-700">{unpaidInvoices}</div>
            <div className="text-[10px] sm:text-xs text-rose-600 mt-0.5 sm:mt-1">invoices unpaid</div>
          </div>
        </div>

        {/* Bill Type Filter */}
        <div className="mb-3 sm:mb-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { key: 'debit', label: 'Debit', amount: debitTotal, active: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white', color: 'text-blue-600' },
              { key: 'credit', label: 'Credit', amount: creditTotal, active: 'bg-gradient-to-br from-purple-500 to-purple-600 text-white', color: 'text-purple-600' },
              { key: 'all', label: 'Total', amount: debitTotal + creditTotal, active: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white', color: 'text-emerald-600' }
            ].map(({ key, label, amount, active, color }) => (
              <button key={key} onClick={() => setBillTypeFilter(key)}
                className={`px-3 py-3 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl font-semibold transition-all shadow-lg ${
                  billTypeFilter === key ? active : 'bg-white text-slate-700 hover:shadow-xl border border-slate-200'
                }`}
              >
                <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                  <CreditCard className={`w-5 h-5 sm:w-6 sm:h-6 ${billTypeFilter === key ? 'text-white' : color}`} />
                  <div className="text-xs sm:text-sm font-bold">{label}</div>
                  <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${billTypeFilter === key ? 'text-white' : color}`}>
                    ₹{amount.toLocaleString('en-IN')}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="mb-4 sm:mb-6">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
            {[
              { key: 'all', label: 'All Payments', cls: 'bg-slate-800 text-white shadow-lg' },
              { key: 'paid', label: 'Paid', cls: 'bg-emerald-600 text-white shadow-lg', icon: <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
              { key: 'partial', label: 'Partial', cls: 'bg-amber-600 text-white shadow-lg', icon: <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
              { key: 'unpaid', label: 'Unpaid', cls: 'bg-rose-600 text-white shadow-lg', icon: <AlertCircleIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
            ].map(({ key, label, cls, icon }) => (
              <button key={key} onClick={() => setStatusFilter(key)}
                className={`px-4 py-2 sm:px-6 sm:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm transition-all whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 ${
                  statusFilter === key ? cls : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {icon}{label}
              </button>
            ))}
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
              <span className="text-xs sm:text-sm font-medium text-blue-800">You are editing an existing payment record</span>
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
                Select Invoice
                {(billTypeFilter !== 'all' || statusFilter !== 'all') && (
                  <span className="text-[10px] sm:text-xs text-slate-500 ml-1">(filtered)</span>
                )}
              </label>

              <div className="relative">
                <div className="w-full border border-slate-300 rounded-lg px-2.5 py-2 sm:px-3 sm:py-2.5 flex items-center justify-between cursor-pointer bg-white"
                  onClick={() => setShowInvoiceDropdown(!showInvoiceDropdown)}>
                  <div className="min-w-0 flex-1">
                    {form.invoiceId ? (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs sm:text-sm font-medium text-slate-900 truncate block">
                            {selectedInvoice?.invoiceNumber || 'Select Invoice'}
                          </span>
                          {selectedClient && (
                            <div className="text-[10px] sm:text-xs text-slate-500 truncate">{selectedClient.name}</div>
                          )}
                        </div>
                        {paymentStatus && (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold border flex-shrink-0 ${getStatusColor(paymentStatus)}`}>
                            {getStatusIcon(paymentStatus)}{paymentStatus}
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
                      <div className="text-[10px] sm:text-xs font-semibold text-slate-700">Available Invoices</div>
                    </div>
                    {filteredInvoicesForDropdown.length > 0 ? (
                      filteredInvoicesForDropdown.map((invoice) => {
                        const client = clients.find(c => c.id === invoice.clientId);
                        const invTotal = invoice.total || invoice.amount || 0;
                        const fromPmts = getTotalPaidForInvoice(invoice.id);
                        const invStatus = invoice.status || 'unpaid';
                        const remDisplay = fromPmts > 0 ? Math.max(0, invTotal - fromPmts) : Math.max(0, invoice.remainingAmount ?? invTotal);

                        const handleSelect = () => {
                          let autoAmount = '';
                          if (invStatus === 'paid') {
                            autoAmount = '';
                          } else if (invStatus === 'partial') {
                            autoAmount = String(remDisplay);
                          } else {
                            autoAmount = String(invTotal);
                          }
                          setForm({ ...form, invoiceId: invoice.id, amount: autoAmount });
                          setShowInvoiceDropdown(false);
                        };

                        return (
                          <div key={invoice.id}
                            className={`px-2.5 py-2 sm:px-3 sm:py-2 hover:bg-blue-50 cursor-pointer transition-colors ${form.invoiceId === invoice.id ? 'bg-blue-50' : ''}`}
                            onClick={handleSelect}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <div className="text-xs sm:text-sm font-medium text-slate-900 truncate">{invoice.invoiceNumber}</div>
                                  {invoice.billType && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold border flex-shrink-0 ${getBillTypeColor(invoice.billType)}`}>
                                      {invoice.billType.charAt(0).toUpperCase() + invoice.billType.slice(1)}
                                    </span>
                                  )}
                                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold border flex-shrink-0 ${getStatusColor(invStatus)}`}>
                                    {getStatusIcon(invStatus)}{invStatus}
                                  </span>
                                </div>
                                <div className="text-[10px] sm:text-xs text-slate-600 flex items-center gap-1 mt-0.5 sm:mt-1 truncate">
                                  <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                                  {client?.name || 'Unknown Client'}
                                </div>
                                {invStatus === 'partial' && (
                                  <div className="text-[9px] sm:text-[10px] text-amber-600 mt-0.5">
                                    Paid: ₹{formatAmount(fromPmts)} · Remaining: ₹{formatAmount(remDisplay)}
                                  </div>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-xs sm:text-sm font-semibold text-emerald-600">₹{formatAmount(invTotal)}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2 text-xs sm:text-sm text-slate-500">No invoices found matching filters</div>
                    )}
                  </div>
                )}
              </div>

              {form.invoiceId && selectedInvoice && (
                <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div>
                      <div className="text-[10px] sm:text-xs text-slate-500">Invoice Total</div>
                      <div className="text-xs sm:text-sm font-bold text-slate-800">
                        ₹{formatAmount(selectedInvoice.total || selectedInvoice.amount || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] sm:text-xs text-slate-500">Already Paid</div>
                      <div className="text-xs sm:text-sm font-bold text-emerald-600">₹{formatAmount(totalPaidForSelected)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] sm:text-xs text-slate-500">Remaining</div>
                      <div className="text-xs sm:text-sm font-bold text-amber-600">₹{formatAmount(remainingForSelected)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] sm:text-xs text-slate-500">Status</div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border ${getStatusColor(paymentStatus)}`}>
                        {getStatusIcon(paymentStatus)}{paymentStatus}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">Payment Date</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                <input type="date" value={form.paymentDate}
                  onChange={(e) => setForm({...form, paymentDate: e.target.value})}
                  className="w-full pl-9 sm:pl-10 pr-2.5 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required />
              </div>
            </div>

            {/* Payment Amount */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">
                Payment Amount (₹)
                {paymentStatus === 'partial' && remainingForSelected > 0 && (
                  <span className="ml-2 text-[10px] sm:text-xs text-amber-600 font-normal">
                    Remaining: ₹{formatAmount(remainingForSelected)}
                  </span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-slate-400 font-semibold text-sm sm:text-base">₹</span>
                <input type="number" min="1" step="1"
                  value={form.amount}
                  onChange={(e) => setForm({...form, amount: e.target.value})}
                  placeholder={
                    paymentStatus === 'paid' ? 'Already fully paid' :
                    paymentStatus === 'partial' ? `Max ₹${formatAmount(remainingForSelected)}` :
                    'Enter amount'
                  }
                  className="w-full pl-7 sm:pl-8 pr-2.5 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required />
              </div>
              {selectedInvoice && remainingForSelected > 0 && (
                <div className="mt-1 text-[10px] sm:text-xs text-amber-600">
                  Maximum allowed: ₹{formatAmount(remainingForSelected)}
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2">Payment Method</label>
              <div className="relative">
                <CreditCard className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                <select value={form.method} onChange={(e) => setForm({...form, method: e.target.value})}
                  className="w-full pl-9 sm:pl-10 pr-2.5 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
                  required>
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>
          </div>

          {/* Invoice & Payment Details preview card */}
          {form.invoiceId && selectedInvoice && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-br from-slate-50 to-indigo-50 rounded-lg sm:rounded-xl border border-slate-200">
              <h4 className="text-xs sm:text-sm font-semibold text-slate-700 mb-2 sm:mb-3 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                Invoice &amp; Payment Details
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-white rounded-lg p-2 sm:p-2.5 border border-slate-200">
                  <div className="text-[10px] sm:text-xs text-slate-500 mb-0.5">Invoice Number</div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">{selectedInvoice.invoiceNumber}</div>
                </div>
                <div className="bg-white rounded-lg p-2 sm:p-2.5 border border-slate-200">
                  <div className="text-[10px] sm:text-xs text-slate-500 mb-0.5">Client</div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">{selectedClient?.name || 'N/A'}</div>
                </div>
                <div className="bg-white rounded-lg p-2 sm:p-2.5 border border-slate-200">
                  <div className="text-[10px] sm:text-xs text-slate-500 mb-0.5">Bill Type</div>
                  {selectedInvoice.billType ? (
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold border ${getBillTypeColor(selectedInvoice.billType)}`}>
                      {selectedInvoice.billType.charAt(0).toUpperCase() + selectedInvoice.billType.slice(1)}
                    </span>
                  ) : <span className="text-xs text-slate-400">—</span>}
                </div>
                <div className="bg-white rounded-lg p-2 sm:p-2.5 border border-slate-200">
                  <div className="text-[10px] sm:text-xs text-slate-500 mb-0.5">Payment Amount</div>
                  <div className={`text-xs sm:text-sm font-bold ${
                    paymentStatus === 'paid' ? 'text-emerald-600' :
                    paymentStatus === 'partial' ? 'text-amber-600' : 'text-indigo-600'
                  }`}>
                    {paymentStatus === 'paid' ? '✓ Fully Paid' : `₹${formatAmount(remainingForSelected)}`}
                  </div>
                  {paymentStatus === 'partial' && (
                    <div className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">remaining to pay</div>
                  )}
                </div>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 mt-2 sm:mt-3">
                {paymentStatus === 'paid'
                  ? 'This invoice has been fully paid.'
                  : paymentStatus === 'partial'
                  ? `₹${formatAmount(totalPaidForSelected)} already received. Amount field pre-filled with remaining balance.`
                  : 'Amount field pre-filled with full invoice total.'
                }
              </p>
            </div>
          )}

          <div className="flex flex-col xs:flex-row gap-2 sm:gap-3 mt-4 sm:mt-5 lg:mt-6">
            <button type="submit"
              disabled={!form.invoiceId || !form.amount || parseFloat(form.amount) <= 0}
              className={`px-4 py-2 sm:px-5 sm:py-2.5 lg:px-6 rounded-lg font-medium text-sm sm:text-base shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
                !form.invoiceId || !form.amount || parseFloat(form.amount) <= 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700'
              }`}>
              {editId ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              {editId ? 'Update Payment' : 'Record Payment'}
            </button>
            {editId && (
              <button type="button" onClick={cancelEdit}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 sm:px-5 sm:py-2.5 lg:px-6 rounded-lg font-medium text-sm sm:text-base flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm transition-colors">
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />Cancel
              </button>
            )}
          </div>
        </form>

        {/* Payment History */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border border-slate-100">
          <div className="p-3 sm:p-4 lg:p-5 xl:p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-indigo-50 to-purple-50">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800">
              Payment History ({filteredPayments.length})
              {(billTypeFilter !== 'all' || statusFilter !== 'all') && (
                <span className="text-xs sm:text-sm font-normal text-slate-600 ml-2">(filtered)</span>
              )}
            </h3>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Invoice #','Client','Bill Type','Invoice Status','Payment Amount','Progress','Date','Method','Actions'].map(h => (
                    <th key={h} className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-slate-50 rounded-full"><Receipt className="w-12 h-12 text-slate-300" /></div>
                        <p className="text-lg font-medium text-slate-600">No payments recorded yet</p>
                        <p className="text-sm text-slate-500">Record your first payment to get started</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(payment => {
                    const invoice = invoices.find(i => i.id === payment.invoiceId);
                    const client = invoice ? clients.find(c => c.id === invoice.clientId) : null;
                    const invoiceTotal = invoice?.total || invoice?.amount || 0;
                    const totalPaid = invoice ? getTotalPaidForInvoice(invoice.id) : 0;
                    const invStatus = invoice?.status || 'unknown';

                    return (
                      <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6">
                          <div className="flex items-center gap-2">
                            <div className="bg-indigo-100 p-1.5 lg:p-2 rounded-full flex-shrink-0">
                              <FileText className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-indigo-600" />
                            </div>
                            <span className="font-medium text-slate-800 text-xs sm:text-sm truncate">{invoice?.invoiceNumber || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6">
                          <span className="text-xs sm:text-sm text-slate-700 truncate block max-w-[150px]">{client?.name || 'N/A'}</span>
                        </td>
                        <td className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6">
                          {invoice?.billType ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${getBillTypeColor(invoice.billType)}`}>
                              <CreditCard className="w-3 h-3" />
                              {invoice.billType.charAt(0).toUpperCase() + invoice.billType.slice(1)}
                            </span>
                          ) : <span className="text-xs text-slate-400">—</span>}
                        </td>
                        <td className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border ${getStatusColor(invStatus)}`}>
                            {getStatusIcon(invStatus)}{invStatus}
                          </span>
                        </td>
                        <td className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6">
                          <span className="text-base lg:text-lg font-semibold text-emerald-600">
                            ₹{payment.amount?.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6">
                          {invStatus === 'partial' ? (
                            <div>
                              <div className="text-xs font-medium text-amber-600">
                                {Math.round((totalPaid / invoiceTotal) * 100)}% paid
                              </div>
                              <div className="text-[10px] text-slate-500">
                                ₹{formatAmount(totalPaid)} / ₹{formatAmount(invoiceTotal)}
                              </div>
                            </div>
                          ) : invStatus === 'paid' ? (
                            <div className="text-xs text-emerald-600 font-medium">Fully paid</div>
                          ) : (
                            <div className="text-xs text-rose-600 font-medium">No payments</div>
                          )}
                        </td>
                        <td className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6 text-slate-600 text-xs sm:text-sm">{payment.paymentDate}</td>
                        <td className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6">
                          <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium border ${getMethodBadgeColor(payment.method)}`}>
                            {getMethodIcon(payment.method)}<span className="capitalize">{payment.method}</span>
                          </span>
                        </td>
                        <td className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <button onClick={() => handleEdit(payment)}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-1.5 lg:p-2 rounded-lg shadow-sm transition-colors">
                              <Edit className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                            </button>
                            <button onClick={() => handleDelete(payment.id)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 lg:p-2 rounded-lg shadow-sm transition-colors">
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

          {/* Mobile Card View */}
          <div className="lg:hidden divide-y divide-slate-100">
            {filteredPayments.length === 0 ? (
              <div className="px-4 py-12 sm:px-6 sm:py-16 text-center text-slate-500">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-3 sm:p-4 bg-slate-50 rounded-full">
                    <Receipt className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300" />
                  </div>
                  <p className="text-base sm:text-lg font-medium text-slate-600">No payments recorded yet</p>
                  <p className="text-sm text-slate-500">Record your first payment to get started</p>
                </div>
              </div>
            ) : (
              filteredPayments.map(payment => {
                const invoice = invoices.find(i => i.id === payment.invoiceId);
                const client = invoice ? clients.find(c => c.id === invoice.clientId) : null;
                const invoiceTotal = invoice?.total || invoice?.amount || 0;
                const totalPaid = invoice ? getTotalPaidForInvoice(invoice.id) : 0;
                const invStatus = invoice?.status || 'unknown';

                return (
                  <div key={payment.id} className="p-3 sm:p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <div className="bg-indigo-100 p-2 sm:p-2.5 rounded-full flex-shrink-0">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-semibold text-slate-800 text-sm sm:text-base truncate">{invoice?.invoiceNumber || 'N/A'}</h4>
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold border ${getStatusColor(invStatus)}`}>
                            {getStatusIcon(invStatus)}{invStatus}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 mt-0.5 truncate">{client?.name || 'N/A'}</p>
                        <p className="text-base sm:text-lg font-bold text-emerald-600 mt-2">₹{payment.amount?.toLocaleString('en-IN')}</p>
                        {invStatus === 'partial' && (
                          <div className="mt-2 space-y-1">
                            <div className="w-full bg-slate-200 rounded-full h-1.5">
                              <div className="bg-amber-500 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, (totalPaid / invoiceTotal) * 100)}%` }} />
                            </div>
                            <p className="text-[10px] sm:text-xs text-amber-600">
                              Progress: ₹{formatAmount(totalPaid)} / ₹{formatAmount(invoiceTotal)} ({Math.round((totalPaid / invoiceTotal) * 100)}%)
                            </p>
                          </div>
                        )}
                        {invStatus === 'paid' && (
                          <p className="text-[10px] sm:text-xs text-emerald-600 mt-1">Fully paid: ₹{formatAmount(invoiceTotal)}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                        <span>{payment.paymentDate}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium border ${getMethodBadgeColor(payment.method)}`}>
                          {getMethodIcon(payment.method)}<span className="capitalize">{payment.method}</span>
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
                      <button onClick={() => handleEdit(payment)}
                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm transition-colors">
                        <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />Edit
                      </button>
                      <button onClick={() => handleDelete(payment.id)}
                        className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm transition-colors">
                        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />Delete
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