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
  User
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
        // Update existing payment
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
        // Create new payment
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
      
      // Reset form
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
    // Scroll to form on mobile
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
      case 'bank': return <CreditCard className="w-4 h-4" />;
      case 'cash': return <Wallet className="w-4 h-4" />;
      case 'upi': return <DollarSign className="w-4 h-4" />;
      case 'card': return <CreditCard className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const getMethodBadgeColor = (method) => {
    switch(method) {
      case 'bank': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cash': return 'bg-green-100 text-green-700 border-green-200';
      case 'upi': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'card': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Get selected invoice details
  const selectedInvoice = invoices.find(i => i.id === form.invoiceId);
  const selectedClient = selectedInvoice ? clients.find(c => c.id === selectedInvoice.clientId) : null;

  // Close dropdown when clicking outside
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-lg">
                <Receipt className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Payment Tracking</h2>
                <p className="text-sm text-gray-500 mt-1">Monitor and manage all payments</p>
              </div>
            </div>
            
            {/* Stats Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase">Total Received</span>
              </div>
              <p className="text-2xl font-bold text-green-800">₹{totalPayments.toLocaleString('en-IN')}</p>
              <p className="text-xs text-green-600 mt-1">{payments.length} payment{payments.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-start gap-2 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg mb-6 border border-gray-100">
          {editId && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                You are editing an existing payment record
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-800">
              {editId ? 'Edit Payment Record' : 'Record New Payment'}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Invoice Dropdown */}
            <div className="relative invoice-dropdown-container">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Invoice
              </label>
              <div className="relative">
                <div 
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition flex items-center justify-between cursor-pointer bg-white"
                  onClick={() => setShowInvoiceDropdown(!showInvoiceDropdown)}
                >
                  <div>
                    {form.invoiceId ? (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {selectedInvoice?.invoiceNumber || 'Select Invoice'}
                          </span>
                          {selectedClient && (
                            <div className="text-xs text-gray-500">
                              ({selectedClient.name})
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-500">Select Invoice</span>
                      </div>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showInvoiceDropdown ? 'rotate-180' : ''}`} />
                </div>
                
                {showInvoiceDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 bg-gray-50 border-b">
                      <div className="text-xs font-semibold text-gray-700 mb-1">Available Invoices</div>
                      {invoices.length > 0 ? (
                        invoices.map((invoice) => {
                          const client = clients.find(c => c.id === invoice.clientId);
                          const isSelected = form.invoiceId === invoice.id;
                          return (
                            <div
                              key={invoice.id}
                              className={`px-3 py-2 hover:bg-blue-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                              onClick={() => {
                                setForm({...form, invoiceId: invoice.id});
                                setShowInvoiceDropdown(false);
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                                  <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                                    <User className="w-3 h-3" />
                                    {client?.name || 'Unknown Client'}
                                  </div>
                                </div>
                                <div className="text-right ml-2">
                                  <div className="text-sm font-semibold text-green-600">
                                    ₹{formatAmount(invoice.subtotal || invoice.amount || 0)}
                                  </div>
                                  <div className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                                    invoice.status === 'paid' 
                                      ? 'bg-green-100 text-green-700' 
                                      : invoice.status === 'partial'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {invoice.status || 'unpaid'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          No invoices found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {form.invoiceId && selectedInvoice && (
                <div className="mt-2 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>Payment amount will be: ₹{formatAmount(selectedInvoice.subtotal || selectedInvoice.amount || 0)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${selectedInvoice.status === 'paid' ? 'bg-green-100 text-green-700' : selectedInvoice.status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {selectedInvoice.status || 'unpaid'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="date" 
                  value={form.paymentDate}
                  onChange={(e) => setForm({...form, paymentDate: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  required
                />
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select 
                  value={form.method}
                  onChange={(e) => setForm({...form, method: e.target.value})}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition appearance-none bg-white"
                  required
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>

            {/* Empty column for layout */}
            <div></div>
          </div>

          {/* Invoice Details Preview */}
          {form.invoiceId && selectedInvoice && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Invoice & Payment Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <span className="text-xs text-gray-600 block mb-1">Invoice Number</span>
                  <span className="text-sm font-medium text-gray-900">{selectedInvoice.invoiceNumber}</span>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <span className="text-xs text-gray-600 block mb-1">Client</span>
                  <span className="text-sm font-medium text-gray-900">{selectedClient?.name || 'N/A'}</span>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <span className="text-xs text-gray-600 block mb-1">Payment Amount</span>
                  <span className="text-sm font-bold text-green-600">
                    ₹{formatAmount(selectedInvoice.subtotal || selectedInvoice.amount || 0)}
                  </span>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Note: Payment amount is automatically set to the invoice total amount.
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button 
              type="submit" 
              disabled={!form.invoiceId}
              className={`px-6 py-2.5 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                !form.invoiceId
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700'
              }`}
            >
              {editId ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {editId ? 'Update Payment' : 'Record Payment'}
            </button>
            
            {editId && (
              <button 
                type="button"
                onClick={cancelEdit}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Payment Records Table/Cards */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                Payment History ({payments.length})
              </h3>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invoice #</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment Method</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-lg font-medium">No payments recorded yet</p>
                      <p className="text-sm">Record your first payment to get started</p>
                    </td>
                  </tr>
                ) : (
                  payments.map(payment => {
                    const invoice = invoices.find(i => i.id === payment.invoiceId);
                    const client = invoice ? clients.find(c => c.id === invoice.clientId) : null;
                    
                    return (
                      <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="bg-indigo-100 p-2 rounded-full">
                              <FileText className="w-4 h-4 text-indigo-600" />
                            </div>
                            <span className="font-medium text-gray-800">
                              {invoice?.invoiceNumber || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700">
                            {client?.name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-lg font-semibold text-green-600">
                            ₹{payment.amount?.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {payment.paymentDate}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getMethodBadgeColor(payment.method)}`}>
                            {getMethodIcon(payment.method)}
                            {payment.method.charAt(0).toUpperCase() + payment.method.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleEdit(payment)} 
                              className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-2 rounded-lg transition-colors shadow-sm"
                              title="Edit payment"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(payment.id)} 
                              className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors shadow-sm"
                              title="Delete payment"
                            >
                              <Trash2 className="w-4 h-4" />
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
          <div className="lg:hidden divide-y divide-gray-200">
            {payments.length === 0 ? (
              <div className="px-4 py-12 text-center text-gray-500">
                <Receipt className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">No payments recorded yet</p>
                <p className="text-sm">Record your first payment to get started</p>
              </div>
            ) : (
              payments.map(payment => {
                const invoice = invoices.find(i => i.id === payment.invoiceId);
                const client = invoice ? clients.find(c => c.id === invoice.clientId) : null;
                
                return (
                  <div key={payment.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2.5 rounded-full">
                          <FileText className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            {invoice?.invoiceNumber || 'N/A'}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">{client?.name || 'N/A'}</p>
                          <p className="text-lg font-bold text-green-600 mt-1">
                            ₹{payment.amount?.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{payment.paymentDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getMethodBadgeColor(payment.method)}`}>
                          {getMethodIcon(payment.method)}
                          {payment.method.charAt(0).toUpperCase() + payment.method.slice(1)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(payment)} 
                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 px-4 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(payment.id)} 
                        className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-2 px-4 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
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