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
  const [projects, setProjects] = useState([]);
  const [trackingMode, setTrackingMode] = useState('invoices'); // 'invoices' or 'campaigns'
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
      (snapshot) => {
        const invoicesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        invoicesData.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date(0);
          return dateB - dateA;
        });
        setInvoices(invoicesData);
      },
      (err) => setError(err.message)
    );
    const unsubProjects = onSnapshot(
      collection(db, 'projects'), 
      (snapshot) => {
        const projectsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        projectsData.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date(0);
          return dateB - dateA;
        });
        setProjects(projectsData);
      },
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
    return () => { unsubClients(); unsubInvoices(); unsubProjects(); unsubPayments(); };
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

  const getRemainingAmount = (item, paymentsSnapshot = payments, isProject = (trackingMode === 'campaigns')) => {
    if (!item) return 0;
    const totalPaid = getTotalPaidForInvoice(item.id, paymentsSnapshot);
    const itemTotal = isProject ? (item.grandTotal || item.totalCost || 0) : (item.total || item.amount || 0);
    return Math.max(0, itemTotal - totalPaid);
  };

  const getInvoicePaymentStatus = (invoice, paymentsSnapshot = payments) => {
    if (!invoice) return 'unknown';
    const totalPaid = getTotalPaidForInvoice(invoice.id, paymentsSnapshot);
    const invoiceTotal = invoice.total || invoice.amount || 0;
    if (totalPaid === 0) return 'unpaid';
    if (totalPaid >= invoiceTotal) return 'paid';
    return 'partial';
  };

  const getProjectPaymentStatus = (project, paymentsSnapshot = payments) => {
    if (!project) return 'unknown';
    const totalPaid = getTotalPaidForInvoice(project.id, paymentsSnapshot);
    const projectTotal = project.grandTotal || project.totalCost || 0;
    if (totalPaid === 0) return 'unpaid';
    if (totalPaid >= projectTotal && projectTotal > 0) return 'paid';
    return 'partial';
  };

  const updateProjectStatus = async (projectId, paymentsSnapshot = payments) => {
    if (isUpdatingRef.current) return;
    
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const projectPayments = paymentsSnapshot.filter(p => p.invoiceId === projectId);
    const totalPaid = projectPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const projectTotal = project.grandTotal || project.totalCost || 0;

    let newStatus = 'unpaid';
    let newAmountReceived = totalPaid;
    let newRemainingAmount = projectTotal - totalPaid;

    if (totalPaid > 0 && totalPaid < projectTotal) {
      newStatus = 'partial';
    } else if (totalPaid >= projectTotal && projectTotal > 0) {
      newStatus = 'paid';
      newAmountReceived = projectTotal;
      newRemainingAmount = 0;
    }

    const unchanged =
      project.paymentStatus === newStatus &&
      project.amountReceived === newAmountReceived &&
      project.remainingAmount === newRemainingAmount;
    
    if (unchanged) return;

    isUpdatingRef.current = true;
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        paymentStatus: newStatus,
        amountReceived: newAmountReceived,
        remainingAmount: newRemainingAmount,
        updatedAt: new Date()
      });
    } catch (err) {
      console.error('Error updating project payment status:', err);
    } finally {
      isUpdatingRef.current = false;
    }
  };

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

  useEffect(() => {
    if (payments.length === 0) return;

    const currentSig = JSON.stringify(payments.map(p => ({ id: p.id, invoiceId: p.invoiceId, amount: p.amount })));
    const prevSig = JSON.stringify(prevPaymentsRef.current.map(p => ({ id: p.id, invoiceId: p.invoiceId, amount: p.amount })));
    if (currentSig === prevSig) return;
    prevPaymentsRef.current = payments;

    const invoiceIdsWithPayments = [...new Set(payments.map(p => p.invoiceId))];
    (async () => {
      for (const id of invoiceIdsWithPayments) {
        if (invoices.some(i => i.id === id)) {
          await updateInvoiceStatus(id, payments);
        } else if (projects.some(p => p.id === id)) {
          await updateProjectStatus(id, payments);
        }
      }
    })();
  }, [payments, invoices, projects]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const isCamp = trackingMode === 'campaigns';
      const item = isCamp 
        ? projects.find(p => p.id === form.invoiceId)
        : invoices.find(i => i.id === form.invoiceId);
        
      if (!item) { 
        setError(`Please select a valid ${isCamp ? 'ad campaign' : 'invoice'}`); 
        return; 
      }

      const paymentAmount = parseFloat(form.amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) { 
        setError('Please enter a valid payment amount'); 
        return; 
      }

      const itemTotal = isCamp ? (item.grandTotal || item.totalCost || 0) : (item.total || item.amount || 0);
      const paidSoFar = getTotalPaidForInvoice(item.id);

      if (editId) {
        const oldPayment = payments.find(p => p.id === editId);
        if (!oldPayment) {
          setError('Payment record not found');
          return;
        }
        
        const oldAmount = oldPayment.amount || 0;
        const adjustedTotal = paidSoFar - oldAmount + paymentAmount;
        
        if (adjustedTotal > itemTotal) {
          setError(`Payment exceeds total. Max allowed: ₹${formatAmount(itemTotal - (paidSoFar - oldAmount))}`);
          return;
        }
        
        await updateDoc(doc(db, 'payments', editId), {
          invoiceId: form.invoiceId,
          amount: paymentAmount,
          paymentDate: form.paymentDate,
          method: form.method,
          updatedAt: new Date()
        });
        
        if (isCamp) {
          await updateProjectStatus(item.id);
        } else {
          await updateInvoiceStatus(item.id);
        }
        setEditId(null);
      } else {
        const newTotal = paidSoFar + paymentAmount;
        if (newTotal > itemTotal) {
          setError(`Payment exceeds total. Max allowed: ₹${formatAmount(itemTotal - paidSoFar)}`);
          return;
        }
        
        await addDoc(collection(db, 'payments'), {
          invoiceId: form.invoiceId,
          amount: paymentAmount,
          paymentDate: form.paymentDate,
          method: form.method,
          createdAt: new Date()
        });
        
        if (isCamp) {
          await updateProjectStatus(item.id);
        } else {
          await updateInvoiceStatus(item.id);
        }
      }

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

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this payment record?')) return;
    
    try {
      const payment = payments.find(p => p.id === id);
      if (payment) {
        await deleteDoc(doc(db, 'payments', id));
        if (invoices.some(i => i.id === payment.invoiceId)) {
          await updateInvoiceStatus(payment.invoiceId);
        } else if (projects.some(p => p.id === payment.invoiceId)) {
          await updateProjectStatus(payment.invoiceId);
        }
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

  useEffect(() => {
    const handler = (e) => {
      if (showInvoiceDropdown && !e.target.closest('.invoice-dropdown-container'))
        setShowInvoiceDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showInvoiceDropdown]);

  const selectedItem = trackingMode === 'campaigns'
    ? projects.find(p => p.id === form.invoiceId)
    : invoices.find(i => i.id === form.invoiceId);
  const selectedInvoice = selectedItem; // Keep original variable name for JSX compatibility
  const selectedClient = selectedItem ? clients.find(c => c.id === selectedItem.clientId) : null;

  const totalPaidForSelected = selectedItem
    ? getTotalPaidForInvoice(selectedItem.id)
    : 0;

  const remainingForSelected = selectedItem
    ? getRemainingAmount(selectedItem, payments, trackingMode === 'campaigns')
    : 0;

  const paymentStatus = selectedItem
    ? (trackingMode === 'campaigns' ? getProjectPaymentStatus(selectedItem) : getInvoicePaymentStatus(selectedItem))
    : null;

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

  const debitTotal = payments
    .filter(p => invoices.find(i => i.id === p.invoiceId)?.billType === 'debit')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const creditTotal = payments
    .filter(p => {
      const invoice = invoices.find(i => i.id === p.invoiceId);
      if (invoice && invoice.billType === 'credit') return true;
      const project = projects.find(pr => pr.id === p.invoiceId);
      if (project) return true; // Ad campaigns are credit by default
      return false;
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const paidInvoices = trackingMode === 'campaigns'
    ? projects.filter(p => getProjectPaymentStatus(p) === 'paid').length
    : invoices.filter(i => i.status === 'paid').length;

  const partialInvoices = trackingMode === 'campaigns'
    ? projects.filter(p => getProjectPaymentStatus(p) === 'partial').length
    : invoices.filter(i => i.status === 'partial').length;

  const unpaidInvoices = trackingMode === 'campaigns'
    ? projects.filter(p => getProjectPaymentStatus(p) === 'unpaid').length
    : invoices.filter(i => i.status === 'unpaid').length;

  const filteredPayments = payments.filter(payment => {
    const invoice = invoices.find(i => i.id === payment.invoiceId);
    const project = projects.find(p => p.id === payment.invoiceId);
    
    if (trackingMode === 'invoices' && !invoice) return false;
    if (trackingMode === 'campaigns' && !project) return false;

    const item = invoice || project;
    const isProj = !!project;
    const billType = isProj ? 'credit' : item.billType;
    const status = isProj ? getProjectPaymentStatus(project) : item.status;

    if (billTypeFilter !== 'all' && billType !== billTypeFilter) return false;
    if (statusFilter !== 'all' && status !== statusFilter) return false;
    return true;
  });

  const filteredInvoicesForDropdown = trackingMode === 'campaigns'
    ? projects
        .filter(project => {
          const status = getProjectPaymentStatus(project);
          if (status === 'paid') return false;
          if (billTypeFilter !== 'all' && billTypeFilter !== 'credit') return false;
          if (statusFilter !== 'all') {
            if (statusFilter === 'paid') return false;
            if (statusFilter !== status) return false;
          }
          return true;
        })
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date(0);
          return dateB - dateA;
        })
    : invoices
        .filter(invoice => {
          const status = invoice.status || 'unpaid';
          if (status === 'paid') return false;
          if (billTypeFilter !== 'all' && invoice.billType !== billTypeFilter) return false;
          if (statusFilter !== 'all') {
            if (statusFilter === 'paid') return false;
            if (statusFilter !== status) return false;
          }
          return true;
        })
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date(0);
          return dateB - dateA;
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
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1">
                {trackingMode === 'campaigns' ? 'Track payments by ad campaign status' : 'Track payments by invoice status'}
              </p>
            </div>
          </div>
        </div>

        {/* Tracking Mode Selector */}
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100 w-fit mb-4 sm:mb-6">
          <button
            onClick={() => { setTrackingMode('invoices'); setBillTypeFilter('all'); setStatusFilter('all'); }}
            className={`px-5 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all duration-200 ${
              trackingMode === 'invoices'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            Invoices Payments
          </button>
          <button
            onClick={() => { setTrackingMode('campaigns'); setBillTypeFilter('all'); setStatusFilter('all'); }}
            className={`px-5 py-2.5 rounded-lg font-bold text-xs sm:text-sm transition-all duration-200 ${
              trackingMode === 'campaigns'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            Ad Campaigns Payments
          </button>
        </div>

        {/* Status Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="bg-emerald-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-emerald-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              <span className="text-xs sm:text-sm font-medium text-emerald-800">Paid</span>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-700">{paidInvoices}</div>
            <div className="text-[10px] sm:text-xs text-emerald-600 mt-0.5 sm:mt-1">
              {trackingMode === 'campaigns' ? 'campaigns fully paid' : 'invoices fully paid'}
            </div>
          </div>
          <div className="bg-amber-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-amber-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
              <span className="text-xs sm:text-sm font-medium text-amber-800">Partial</span>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-700">{partialInvoices}</div>
            <div className="text-[10px] sm:text-xs text-amber-600 mt-0.5 sm:mt-1">
              {trackingMode === 'campaigns' ? 'campaigns partially paid' : 'invoices partially paid'}
            </div>
          </div>
          <div className="bg-rose-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-rose-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <AlertCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
              <span className="text-xs sm:text-sm font-medium text-rose-800">Unpaid</span>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-rose-700">{unpaidInvoices}</div>
            <div className="text-[10px] sm:text-xs text-rose-600 mt-0.5 sm:mt-1">
              {trackingMode === 'campaigns' ? 'campaigns unpaid' : 'invoices unpaid'}
            </div>
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
                {trackingMode === 'campaigns' ? 'Select Ad Campaign' : 'Select Invoice'}
                {(billTypeFilter !== 'all' || statusFilter !== 'all') && (
                  <span className="text-[10px] sm:text-xs text-slate-500 ml-1">(filtered)</span>
                )}
                <span className="text-amber-600 ml-2 text-[10px] sm:text-xs font-normal">
                  (Only Partial &amp; Unpaid shown)
                </span>
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
                            {selectedInvoice?.invoiceNumber || selectedInvoice?.projectNumber || (trackingMode === 'campaigns' ? 'Select Ad Campaign' : 'Select Invoice')}
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
                        <span className="text-slate-500 text-xs sm:text-sm">
                          {trackingMode === 'campaigns' ? 'Select Ad Campaign' : 'Select Invoice'}
                        </span>
                      </div>
                    )}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0 ml-2 transition-transform ${showInvoiceDropdown ? 'rotate-180' : ''}`} />
                </div>

                {showInvoiceDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-48 sm:max-h-60 overflow-y-auto">
                    <div className="p-2 bg-slate-50 border-b sticky top-0">
                      <div className="text-[10px] sm:text-xs font-semibold text-slate-700">
                        {trackingMode === 'campaigns' ? 'Available Ad Campaigns (Partial & Unpaid Only)' : 'Available Invoices (Partial & Unpaid Only)'}
                      </div>
                    </div>
                    {filteredInvoicesForDropdown.length > 0 ? (
                      filteredInvoicesForDropdown.map((invoice) => {
                        const client = clients.find(c => c.id === invoice.clientId);
                        const invTotal = invoice.grandTotal || invoice.totalCost || invoice.total || invoice.amount || 0;
                        const fromPmts = getTotalPaidForInvoice(invoice.id);
                        const invStatus = trackingMode === 'campaigns' ? getProjectPaymentStatus(invoice) : (invoice.status || 'unpaid');
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
                                  <div className="text-xs sm:text-sm font-medium text-slate-900 truncate">
                                    {invoice.invoiceNumber || invoice.projectNumber}
                                  </div>
                                  {(invoice.billType || trackingMode === 'campaigns') && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold border flex-shrink-0 ${getBillTypeColor(invoice.billType || 'credit')}`}>
                                      {(invoice.billType || 'credit').charAt(0).toUpperCase() + (invoice.billType || 'credit').slice(1)}
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
                      <div className="px-3 py-4 text-xs sm:text-sm text-slate-500 text-center">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                        {trackingMode === 'campaigns' ? 'No partial or unpaid ad campaigns found' : 'No partial or unpaid invoices found'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {form.invoiceId && selectedInvoice && paymentStatus && paymentStatus !== 'paid' && (
                <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div>
                      <div className="text-[10px] sm:text-xs text-slate-500">
                        {trackingMode === 'campaigns' ? 'Campaign Budget' : 'Invoice Total'}
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-slate-800">
                        ₹{formatAmount(selectedInvoice.grandTotal || selectedInvoice.totalCost || selectedInvoice.total || selectedInvoice.amount || 0)}
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

           {form.invoiceId && selectedInvoice && paymentStatus && paymentStatus !== 'paid' && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gradient-to-br from-slate-50 to-indigo-50 rounded-lg sm:rounded-xl border border-slate-200">
              <h4 className="text-xs sm:text-sm font-semibold text-slate-700 mb-2 sm:mb-3 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                {trackingMode === 'campaigns' ? 'Campaign & Payment Details' : 'Invoice & Payment Details'}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-white rounded-lg p-2 sm:p-2.5 border border-slate-200">
                  <div className="text-[10px] sm:text-xs text-slate-500 mb-0.5">
                    {trackingMode === 'campaigns' ? 'Campaign Number' : 'Invoice Number'}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                    {selectedInvoice.invoiceNumber || selectedInvoice.projectNumber}
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2 sm:p-2.5 border border-slate-200">
                  <div className="text-[10px] sm:text-xs text-slate-500 mb-0.5">Client</div>
                  <div className="text-xs sm:text-sm font-bold text-slate-800 truncate">{selectedClient?.name || 'N/A'}</div>
                </div>
                <div className="bg-white rounded-lg p-2 sm:p-2.5 border border-slate-200">
                  <div className="text-[10px] sm:text-xs text-slate-500 mb-0.5">Bill Type</div>
                  {trackingMode === 'campaigns' ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold border bg-purple-50 text-purple-700 border-purple-200">
                      Credit
                    </span>
                  ) : selectedInvoice.billType ? (
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
                  ? `This ${trackingMode === 'campaigns' ? 'campaign' : 'invoice'} has been fully paid.`
                  : paymentStatus === 'partial'
                  ? `₹${formatAmount(totalPaidForSelected)} already received. Amount field pre-filled with remaining balance.`
                  : `Amount field pre-filled with full ${trackingMode === 'campaigns' ? 'campaign budget' : 'invoice total'}.`
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
                  {[(trackingMode === 'campaigns' ? 'Campaign #' : 'Invoice #'),'Client','Bill Type', (trackingMode === 'campaigns' ? 'Campaign Status' : 'Invoice Status'),'Payment Amount','Progress','Date','Method','Actions'].map(h => (
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
                    const project = projects.find(p => p.id === payment.invoiceId);
                    const item = invoice || project;
                    const isCamp = !!project;
                    
                    const client = item ? clients.find(c => c.id === item.clientId) : null;
                    const invoiceTotal = isCamp ? (item.grandTotal || item.totalCost || 0) : (item.total || item.amount || 0);
                    const totalPaid = item ? getTotalPaidForInvoice(item.id) : 0;
                    const invStatus = isCamp ? getProjectPaymentStatus(item) : (item.status || 'unknown');

                    return (
                      <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6">
                          <div className="flex items-center gap-2">
                            <div className="bg-indigo-100 p-1.5 lg:p-2 rounded-full flex-shrink-0">
                              <FileText className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-indigo-600" />
                            </div>
                            <span className="font-medium text-slate-800 text-xs sm:text-sm truncate">
                              {item?.invoiceNumber || item?.projectNumber || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6">
                          <span className="text-xs sm:text-sm text-slate-700 truncate block max-w-[150px]">{client?.name || 'N/A'}</span>
                        </td>
                        <td className="px-3 py-3 lg:px-4 lg:py-4 xl:px-6">
                          {isCamp ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border bg-purple-50 text-purple-700 border-purple-200">
                              <CreditCard className="w-3 h-3" />
                              Credit
                            </span>
                          ) : invoice?.billType ? (
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
                                {invoiceTotal > 0 ? Math.round((totalPaid / invoiceTotal) * 100) : 0}% paid
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
                const project = projects.find(p => p.id === payment.invoiceId);
                const item = invoice || project;
                const isCamp = !!project;
                
                const client = item ? clients.find(c => c.id === item.clientId) : null;
                const invoiceTotal = isCamp ? (item.grandTotal || item.totalCost || 0) : (item.total || item.amount || 0);
                const totalPaid = item ? getTotalPaidForInvoice(item.id) : 0;
                const invStatus = isCamp ? getProjectPaymentStatus(item) : (item.status || 'unknown');

                return (
                  <div key={payment.id} className="p-3 sm:p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <div className="bg-indigo-100 p-2 sm:p-2.5 rounded-full flex-shrink-0">
                        <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-semibold text-slate-800 text-sm sm:text-base truncate">
                            {item?.invoiceNumber || item?.projectNumber || 'N/A'}
                          </h4>
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
                                style={{ width: invoiceTotal > 0 ? `${Math.min(100, (totalPaid / invoiceTotal) * 100)}%` : '0%' }} />
                            </div>
                            <p className="text-[10px] sm:text-xs text-amber-600">
                              Progress: ₹{formatAmount(totalPaid)} / ₹{formatAmount(invoiceTotal)} ({invoiceTotal > 0 ? Math.round((totalPaid / invoiceTotal) * 100) : 0}%)
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
                        {isCamp ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-semibold border bg-purple-50 text-purple-700 border-purple-200">
                            <CreditCard className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            Credit
                          </span>
                        ) : invoice?.billType ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] sm:text-xs font-semibold border ${getBillTypeColor(invoice.billType)}`}>
                            <CreditCard className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            {invoice.billType.charAt(0).toUpperCase() + invoice.billType.slice(1)}
                          </span>
                        ) : null}
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
