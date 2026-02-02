import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  Users, TrendingUp, Wallet, AlertCircle, 
  FileText, Calendar, IndianRupee, 
  DollarSign, CheckCircle, Clock, ArrowRight,
  PieChart, BarChart3, Bell, X, AlertTriangle,
  Volume2, VolumeX, CreditCard
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalInvoiced: 0,
    totalCollected: 0,
    outstanding: 0,
    debitInvoiced: 0,
    creditInvoiced: 0,
    debitCollected: 0,
    creditCollected: 0
  });
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showReminders, setShowReminders] = useState(true);
  const [overdueInvoices, setOverdueInvoices] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef(null);
  const hasPlayedSound = useRef(false);

  // Initialize audio context on user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
    };

    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('touchstart', initAudio, { once: true });

    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('touchstart', initAudio);
    };
  }, []);

  // Function to play notification sound
  const playNotificationSound = () => {
    if (!soundEnabled || hasPlayedSound.current) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;

      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const createBeep = (startTime, frequency = 800, duration = 0.15) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startTime);

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);

        return oscillator;
      };

      const now = audioContext.currentTime;
      createBeep(now, 800, 0.15);
      createBeep(now + 0.2, 800, 0.15);
      createBeep(now + 0.4, 800, 0.15);

      hasPlayedSound.current = true;
      console.log('Notification sound played successfully');
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

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

  // Check for overdue invoices and play sound
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdue = invoices.filter(invoice => {
      if (invoice.status === 'paid') return false;
      
      if (invoice.dueDate) {
        const dueDate = new Date(invoice.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate < today;
      }
      return false;
    });
    
    setOverdueInvoices(overdue);
    
    if (overdue.length > 0 && soundEnabled && !hasPlayedSound.current) {
      setTimeout(() => {
        playNotificationSound();
      }, 1000);
    }
  }, [invoices, soundEnabled]);

  useEffect(() => {
    // Calculate totals with debit/credit separation
    let totalInvoiced = 0;
    let debitInvoiced = 0;
    let creditInvoiced = 0;
    
    invoices.forEach(inv => {
      const amount = inv.total || inv.subtotal || inv.amount || 0;
      totalInvoiced += amount;
      
      // Only count if billType is explicitly set
      if (inv.billType === 'debit') {
        debitInvoiced += amount;
      } else if (inv.billType === 'credit') {
        creditInvoiced += amount;
      }
    });
    
    // Calculate collected with debit/credit separation
    let totalCollected = 0;
    let debitCollected = 0;
    let creditCollected = 0;
    
    invoices.forEach(inv => {
      const amount = inv.total || inv.subtotal || inv.amount || 0;
      let collected = 0;
      
      if (inv.status === 'paid') {
        collected = amount;
      } else if (inv.status === 'partial') {
        collected = inv.amountReceived || 0;
      }
      
      totalCollected += collected;
      
      // Only count if billType is explicitly set
      if (inv.billType === 'debit') {
        debitCollected += collected;
      } else if (inv.billType === 'credit') {
        creditCollected += collected;
      }
    });
    
    // Fallback to payments if no invoice-based collection
    if (totalCollected === 0 && payments.length > 0) {
      totalCollected = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
    }
    
    // Calculate outstanding
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
      outstanding: Math.max(0, outstanding),
      debitInvoiced,
      creditInvoiced,
      debitCollected,
      creditCollected
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

  const getDaysOverdue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    hasPlayedSound.current = false;
  };

  const replaySound = () => {
    hasPlayedSound.current = false;
    if (soundEnabled) {
      playNotificationSound();
    }
  };

  const collectionRate = stats.totalInvoiced > 0 
    ? ((stats.totalCollected / stats.totalInvoiced) * 100).toFixed(1)
    : 0;

  const unpaidInvoices = invoices.filter(inv => inv.status === 'unpaid' || inv.status === 'partial');
  
  // Count invoices by bill type
  const debitInvoiceCount = invoices.filter(inv => inv.billType === 'debit').length;
  const creditInvoiceCount = invoices.filter(inv => inv.billType === 'credit').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6 lg:px-8 lg:py-8 max-w-[1600px] mx-auto">
        
        {/* Payment Reminder Alerts */}
        {showReminders && overdueInvoices.length > 0 && (
          <div className="mb-4 sm:mb-6 bg-gradient-to-r from-rose-50 to-orange-50 border-2 border-rose-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg animate-pulse">
            <div className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
                <div className="flex items-start gap-3 sm:gap-4 flex-1">
                  <div className="p-2 sm:p-3 bg-rose-100 rounded-full flex-shrink-0">
                    <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 animate-bounce" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-rose-800 flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                      Payment Reminders
                    </h3>
                    <p className="text-xs sm:text-sm text-rose-700">
                      You have {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? 's' : ''} requiring attention
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={replaySound}
                    disabled={!soundEnabled}
                    className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                      soundEnabled 
                        ? 'hover:bg-rose-100 text-rose-600' 
                        : 'opacity-50 cursor-not-allowed text-rose-400'
                    }`}
                    title="Replay notification sound"
                  >
                    <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={toggleSound}
                    className="p-1.5 sm:p-2 hover:bg-rose-100 rounded-lg transition-colors"
                    title={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
                  >
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
                    ) : (
                      <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
                    )}
                  </button>
                  <button 
                    onClick={() => setShowReminders(false)}
                    className="p-1 hover:bg-rose-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                {overdueInvoices.slice(0, 3).map(invoice => {
                  const client = clients.find(c => c.id === invoice.clientId);
                  const amount = invoice.total || invoice.subtotal || invoice.amount || 0;
                  const daysOverdue = getDaysOverdue(invoice.dueDate);
                  
                  return (
                    <div key={invoice.id} className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-rose-200 shadow-sm">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-xs sm:text-sm font-bold text-rose-600">
                              {client?.name?.charAt(0) || 'N'}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm sm:text-base text-slate-800 truncate">
                              {client?.name || 'Unknown Client'}
                            </p>
                            <p className="text-xs sm:text-sm text-slate-600">
                              Invoice #{invoice.invoiceNumber}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-sm sm:text-base text-rose-600">
                            {formatCurrency(amount)}
                          </p>
                          <p className="text-xs text-rose-700 font-medium">
                            {daysOverdue} day{daysOverdue > 1 ? 's' : ''} overdue
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {overdueInvoices.length > 3 && (
                  <p className="text-xs sm:text-sm text-center text-rose-600 font-medium pt-2">
                    + {overdueInvoices.length - 3} more overdue invoice{overdueInvoices.length - 3 > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Unpaid Invoices Alert Banner */}
        {unpaidInvoices.length > 0 && (
          <div className="mb-4 sm:mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-semibold text-amber-800">
                  {unpaidInvoices.length} unpaid invoice{unpaidInvoices.length > 1 ? 's' : ''} • 
                  <span className="ml-1 font-bold">{formatCurrency(stats.outstanding)}</span> pending
                </p>
              </div>
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0" />
            </div>
          </div>
        )}
        
        {/* Header Section */}
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
              {soundEnabled && overdueInvoices.length > 0 && (
                <Volume2 className="w-4 h-4 text-emerald-600" />
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards Grid - Main 4 cards */}
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
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
            {unpaidInvoices.length > 0 && (
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-rose-500 rounded-full animate-pulse"></div>
              </div>
            )}
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
                  <span className="truncate">{unpaidInvoices.length} awaiting payment</span>
                </div>
              </div>
            </div>
            <div className="h-0.5 sm:h-1 bg-gradient-to-r from-rose-500 to-rose-600"></div>
          </div>
        </div>

        {/* Debit/Credit Breakdown Section - NEW */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
          {/* Debit Bills Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 sm:p-4 lg:p-5 border-b border-slate-200">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">Debit Bills</h3>
                  <p className="text-xs text-slate-600">{debitInvoiceCount} invoice{debitInvoiceCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-5 lg:p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-slate-600 mb-1 sm:mb-2">Total Invoiced</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">
                    {formatCurrency(stats.debitInvoiced)}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-600 mb-1 sm:mb-2">Collected</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600">
                    {formatCurrency(stats.debitCollected)}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-600">Collection Rate</span>
                  <span className="font-bold text-slate-800">
                    {stats.debitInvoiced > 0 
                      ? ((stats.debitCollected / stats.debitInvoiced) * 100).toFixed(1) 
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-emerald-500 h-2 rounded-full transition-all"
                    style={{ 
                      width: stats.debitInvoiced > 0 
                        ? `${Math.min(100, (stats.debitCollected / stats.debitInvoiced) * 100)}%` 
                        : '0%' 
                    }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="h-0.5 sm:h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          </div>

          {/* Credit Bills Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-3 sm:p-4 lg:p-5 border-b border-slate-200">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">Credit Bills</h3>
                  <p className="text-xs text-slate-600">{creditInvoiceCount} invoice{creditInvoiceCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
            <div className="p-4 sm:p-5 lg:p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-slate-600 mb-1 sm:mb-2">Total Invoiced</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">
                    {formatCurrency(stats.creditInvoiced)}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-600 mb-1 sm:mb-2">Collected</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600">
                    {formatCurrency(stats.creditCollected)}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-600">Collection Rate</span>
                  <span className="font-bold text-slate-800">
                    {stats.creditInvoiced > 0 
                      ? ((stats.creditCollected / stats.creditInvoiced) * 100).toFixed(1) 
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-emerald-500 h-2 rounded-full transition-all"
                    style={{ 
                      width: stats.creditInvoiced > 0 
                        ? `${Math.min(100, (stats.creditCollected / stats.creditInvoiced) * 100)}%` 
                        : '0%' 
                    }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="h-0.5 sm:h-1 bg-gradient-to-r from-purple-500 to-purple-600"></div>
          </div>
        </div>

        {/* Quick Stats Row */}
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

        {/* Recent Invoices Section Placeholder */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-4 sm:p-5 lg:p-6 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Recent Invoices
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5 sm:mt-1">Latest invoice records</p>
              </div>
            </div>
          </div>

          <div className="p-6 text-center text-slate-500">
            {invoices.length === 0 ? (
              <p>No invoices yet</p>
            ) : (
              <p>{invoices.length} total invoices</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}