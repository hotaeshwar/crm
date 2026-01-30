import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  Users, TrendingUp, Wallet, AlertCircle, 
  FileText, Calendar, IndianRupee, 
  DollarSign, CheckCircle, Clock, ArrowRight,
  PieChart, BarChart3
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
    // Calculate total invoiced (all invoices)
    const totalInvoiced = invoices.reduce((sum, inv) => {
      const amount = inv.total || inv.subtotal || inv.amount || 0;
      return sum + amount;
    }, 0);
    
    // Calculate total collected
    const collectedFromInvoices = invoices.reduce((sum, inv) => {
      if (inv.status === 'paid') {
        const amount = inv.total || inv.subtotal || inv.amount || 0;
        return sum + amount;
      } else if (inv.status === 'partial') {
        return sum + (inv.amountReceived || 0);
      }
      return sum;
    }, 0);
    
    const totalCollected = collectedFromInvoices > 0 
      ? collectedFromInvoices 
      : payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
    
    // Calculate outstanding based on invoice status
    const outstanding = invoices.reduce((sum, inv) => {
      const totalAmount = inv.total || inv.subtotal || inv.amount || 0;
      
      if (inv.status === 'paid') {
        return sum;
      } else if (inv.status === 'partial') {
        const remaining = inv.remainingAmount !== undefined 
          ? inv.remainingAmount
          : (totalAmount - (inv.amountReceived || 0));
        return sum + remaining;
      } else {
        return sum + totalAmount;
      }
    }, 0);
    
    setStats({
      totalClients: clients.length,
      totalInvoiced,
      totalCollected,
      outstanding: Math.max(0, outstanding)
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

  // Calculate collection rate
  const collectionRate = stats.totalInvoiced > 0 
    ? ((stats.totalCollected / stats.totalInvoiced) * 100).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6 lg:px-8 lg:py-8 max-w-[1600px] mx-auto">
        
        {/* Header Section - Responsive */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 mb-1 sm:mb-2">
                Business Overview
              </h1>
              <p className="text-slate-600 text-xs sm:text-sm lg:text-base">
                Real-time insights into your business performance
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 bg-white px-3 py-2 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl shadow-sm border border-slate-200 w-fit">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-xs sm:text-sm text-slate-600">Live Data</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards Grid - Fully Responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
          
          {/* Total Clients Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-2.5 lg:p-3 bg-blue-50 rounded-lg sm:rounded-xl">
                  <Users className="w-5 h-5 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md">
                  ACTIVE
                </span>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600 mb-0.5 sm:mb-1">Total Clients</p>
                <p className="text-2xl sm:text-2xl lg:text-3xl font-bold text-slate-800 mb-1 sm:mb-2">{stats.totalClients}</p>
                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-slate-500">
                  <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>Customer base</span>
                </div>
              </div>
            </div>
            <div className="h-0.5 sm:h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          </div>

          {/* Total Invoiced Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-2.5 lg:p-3 bg-emerald-50 rounded-lg sm:rounded-xl">
                  <FileText className="w-5 h-5 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-emerald-600" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md">
                  TOTAL
                </span>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600 mb-0.5 sm:mb-1">Total Invoiced</p>
                <p className="text-2xl sm:text-2xl lg:text-3xl font-bold text-slate-800 mb-1 sm:mb-2 truncate">
                  {formatCurrency(stats.totalInvoiced)}
                </p>
                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-slate-500">
                  <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="truncate">{invoices.length} invoices generated</span>
                </div>
              </div>
            </div>
            <div className="h-0.5 sm:h-1 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
          </div>

          {/* Total Collected Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-2.5 lg:p-3 bg-violet-50 rounded-lg sm:rounded-xl">
                  <Wallet className="w-5 h-5 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-violet-600" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md">
                  {collectionRate}%
                </span>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600 mb-0.5 sm:mb-1">Total Collected</p>
                <p className="text-2xl sm:text-2xl lg:text-3xl font-bold text-slate-800 mb-1 sm:mb-2 truncate">
                  {formatCurrency(stats.totalCollected)}
                </p>
                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-slate-500">
                  <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="truncate">{invoices.filter(inv => inv.status === 'paid' || inv.status === 'partial').length} payments received</span>
                </div>
              </div>
            </div>
            <div className="h-0.5 sm:h-1 bg-gradient-to-r from-violet-500 to-violet-600"></div>
          </div>

          {/* Outstanding Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-2.5 lg:p-3 bg-rose-50 rounded-lg sm:rounded-xl">
                  <AlertCircle className="w-5 h-5 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-rose-600" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md">
                  PENDING
                </span>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-slate-600 mb-0.5 sm:mb-1">Outstanding</p>
                <p className="text-2xl sm:text-2xl lg:text-3xl font-bold text-slate-800 mb-1 sm:mb-2 truncate">
                  {formatCurrency(stats.outstanding)}
                </p>
                <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-slate-500">
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="truncate">{invoices.filter(inv => inv.status === 'unpaid' || inv.status === 'partial').length} awaiting payment</span>
                </div>
              </div>
            </div>
            <div className="h-0.5 sm:h-1 bg-gradient-to-r from-rose-500 to-rose-600"></div>
          </div>
        </div>

        {/* Quick Stats Row - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 p-3.5 sm:p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-blue-50 rounded-md sm:rounded-lg">
                  <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Collection Rate</p>
                  <p className="text-lg sm:text-xl font-bold text-slate-800">{collectionRate}%</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] sm:text-xs text-slate-500">of total invoiced</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 p-3.5 sm:p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-emerald-50 rounded-md sm:rounded-lg">
                  <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Avg Invoice</p>
                  <p className="text-lg sm:text-xl font-bold text-slate-800 truncate">
                    {formatCurrency(invoices.length > 0 ? stats.totalInvoiced / invoices.length : 0)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] sm:text-xs text-slate-500">per invoice</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 p-3.5 sm:p-4 lg:p-5 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-violet-50 rounded-md sm:rounded-lg">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Paid Invoices</p>
                  <p className="text-lg sm:text-xl font-bold text-slate-800">
                    {invoices.filter(inv => inv.status === 'paid').length}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] sm:text-xs text-slate-500">completed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Invoices Section - Responsive */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header - Responsive */}
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-4 sm:p-5 lg:p-6 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Recent Invoices
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5 sm:mt-1">Latest 5 invoice records</p>
              </div>
              <div>
                <button className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 rounded-md sm:rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
                  View All
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      <FileText className="w-4 h-4" />
                      Invoice Number
                    </div>
                  </th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      <Users className="w-4 h-4" />
                      Client
                    </div>
                  </th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      <IndianRupee className="w-4 h-4" />
                      Amount
                    </div>
                  </th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      <Calendar className="w-4 h-4" />
                      Date
                    </div>
                  </th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left">
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Status
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 lg:py-16">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <div className="p-3 lg:p-4 bg-slate-50 rounded-full">
                          <FileText className="w-10 h-10 lg:w-12 lg:h-12" />
                        </div>
                        <div className="text-center">
                          <p className="text-base lg:text-lg font-medium text-slate-600">No invoices yet</p>
                          <p className="text-sm text-slate-500 mt-1">Create your first invoice to see it here</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  invoices.slice(0, 5).map((invoice, index) => {
                    const client = clients.find(c => c.id === invoice.clientId);
                    const amount = invoice.total || invoice.subtotal || invoice.amount || 0;
                    return (
                      <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 lg:px-6 py-3 lg:py-4">
                          <span className="font-mono text-sm font-semibold text-slate-800">
                            {invoice.invoiceNumber}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4">
                          <div className="flex items-center gap-2 lg:gap-3">
                            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center border border-blue-100 flex-shrink-0">
                              <span className="text-xs lg:text-sm font-semibold text-blue-600">
                                {client?.name?.charAt(0) || 'N'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">
                                {client?.name || 'N/A'}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {client?.company || 'No company'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4">
                          <span className="text-sm font-bold text-emerald-600">
                            {formatCurrency(amount)}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{invoice.date || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 lg:px-3 py-1 lg:py-1.5 rounded-lg text-xs font-semibold border ${getStatusColor(invoice.status)}`}>
                            {getStatusIcon(invoice.status)}
                            {(invoice.status || 'unpaid').toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Cards - Responsive */}
          <div className="lg:hidden divide-y divide-slate-100">
            {invoices.length === 0 ? (
              <div className="px-4 py-12 sm:px-6 sm:py-16">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <div className="p-3 sm:p-4 bg-slate-50 rounded-full">
                    <FileText className="w-10 h-10 sm:w-12 sm:h-12" />
                  </div>
                  <div className="text-center">
                    <p className="text-base sm:text-lg font-medium text-slate-600">No invoices yet</p>
                    <p className="text-sm text-slate-500 mt-1">Create your first invoice</p>
                  </div>
                </div>
              </div>
            ) : (
              invoices.slice(0, 5).map(invoice => {
                const client = clients.find(c => c.id === invoice.clientId);
                const amount = invoice.total || invoice.subtotal || invoice.amount || 0;
                return (
                  <div key={invoice.id} className="p-4 sm:p-5 hover:bg-slate-50 transition-colors">
                    {/* Top Row */}
                    <div className="flex items-start justify-between mb-3 sm:mb-4 gap-3">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center border border-blue-100 flex-shrink-0">
                          <span className="text-sm font-semibold text-blue-600">
                            {client?.name?.charAt(0) || 'N'}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-xs sm:text-sm font-bold text-slate-800 truncate">
                            {invoice.invoiceNumber}
                          </p>
                          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">
                            {client?.name || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-semibold border ${getStatusColor(invoice.status)} flex-shrink-0`}>
                        {getStatusIcon(invoice.status)}
                        <span className="hidden xs:inline">{invoice.status?.toUpperCase() || 'UNPAID'}</span>
                      </span>
                    </div>
                    
                    {/* Bottom Row */}
                    <div className="flex items-center justify-between pt-2.5 sm:pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500">
                        <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                        <span className="truncate">{invoice.date || 'N/A'}</span>
                      </div>
                      <p className="text-base sm:text-lg font-bold text-emerald-600 truncate ml-2">
                        {formatCurrency(amount)}
                      </p>
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