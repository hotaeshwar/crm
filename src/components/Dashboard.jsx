import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  Users, TrendingUp, Wallet, AlertCircle, 
  FileText, Calendar, IndianRupee, ArrowUpRight,
  ArrowDownRight, DollarSign, CheckCircle, Clock
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalInvoiced: 0,
    totalCollected: 0,
    outstanding: 0
  });
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    const unsubClients = onSnapshot(collection(db, 'clients'), (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubInvoices = onSnapshot(collection(db, 'invoices'), (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubPayments = onSnapshot(collection(db, 'payments'), (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubClients(); unsubInvoices(); unsubPayments(); };
  }, []);

  useEffect(() => {
    // FIX: Use invoice.total (or subtotal/amount as fallback)
    const totalInvoiced = invoices.reduce((sum, inv) => {
      const amount = inv.total || inv.subtotal || inv.amount || 0;
      return sum + amount;
    }, 0);
    
    const totalCollected = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
    
    setStats({
      totalClients: clients.length,
      totalInvoiced,
      totalCollected,
      outstanding: totalInvoiced - totalCollected
    });
  }, [clients, invoices, payments]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
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

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          Dashboard
        </h2>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">Overview of your business metrics</p>
      </div>

      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Total Clients */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 rounded-xl shadow-lg border border-blue-200 hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-blue-500 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <ArrowUpRight className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-gray-600 text-xs sm:text-sm font-medium mb-1">Total Clients</h3>
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-700">{stats.totalClients}</p>
          <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
            <Users className="w-3 h-3" />
            Active customers
          </p>
        </div>

        {/* Total Invoiced */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 sm:p-6 rounded-xl shadow-lg border border-green-200 hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-green-500 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <h3 className="text-gray-600 text-xs sm:text-sm font-medium mb-1">Total Invoiced</h3>
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-700 break-all">
            {formatCurrency(stats.totalInvoiced)}
          </p>
          <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {invoices.length} invoices
          </p>
        </div>

        {/* Total Collected */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 sm:p-6 rounded-xl shadow-lg border border-purple-200 hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-purple-500 rounded-lg">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <ArrowDownRight className="w-5 h-5 text-purple-600" />
          </div>
          <h3 className="text-gray-600 text-xs sm:text-sm font-medium mb-1">Total Collected</h3>
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-purple-700 break-all">
            {formatCurrency(stats.totalCollected)}
          </p>
          <p className="text-xs text-purple-600 mt-2 flex items-center gap-1">
            <Wallet className="w-3 h-3" />
            {payments.length} payments
          </p>
        </div>

        {/* Outstanding */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 sm:p-6 rounded-xl shadow-lg border border-red-200 hover:shadow-xl transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-red-500 rounded-lg">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <DollarSign className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-gray-600 text-xs sm:text-sm font-medium mb-1">Outstanding</h3>
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-700 break-all">
            {formatCurrency(stats.outstanding)}
          </p>
          <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Pending payment
          </p>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 sm:p-6 border-b border-gray-200">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            Recent Invoices
          </h3>
          <p className="text-sm text-gray-600 mt-1">Last 5 invoices</p>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Invoice #
                  </div>
                </th>
                <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Client
                  </div>
                </th>
                <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="w-4 h-4" />
                    Amount
                  </div>
                </th>
                <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Date
                  </div>
                </th>
                <th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                      <FileText className="w-12 h-12 text-gray-300" />
                      <p className="text-lg">No invoices yet</p>
                      <p className="text-sm">Create your first invoice to see it here!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.slice(0, 5).map(invoice => {
                  const client = clients.find(c => c.id === invoice.clientId);
                  const amount = invoice.total || invoice.subtotal || invoice.amount || 0;
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50 transition">
                      <td className="p-4">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {client?.name || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-bold text-green-600">
                          {formatCurrency(amount)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-gray-600 flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {invoice.date || 'N/A'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                          {getStatusIcon(invoice.status)}
                          {invoice.status || 'unpaid'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Cards */}
        <div className="md:hidden divide-y divide-gray-200">
          {invoices.length === 0 ? (
            <div className="p-8 text-center">
              <div className="flex flex-col items-center gap-3 text-gray-500">
                <FileText className="w-12 h-12 text-gray-300" />
                <p className="text-lg">No invoices yet</p>
                <p className="text-sm">Create your first invoice!</p>
              </div>
            </div>
          ) : (
            invoices.slice(0, 5).map(invoice => {
              const client = clients.find(c => c.id === invoice.clientId);
              const amount = invoice.total || invoice.subtotal || invoice.amount || 0;
              return (
                <div key={invoice.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-mono text-sm font-bold text-gray-900 mb-1">
                        {invoice.invoiceNumber}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        {client?.name || 'N/A'}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)}`}>
                      {getStatusIcon(invoice.status)}
                      {invoice.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {invoice.date || 'N/A'}
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(amount)}
                    </div>
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