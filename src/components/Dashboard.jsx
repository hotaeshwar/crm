import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  Users, TrendingUp, Wallet, AlertCircle, 
  FileText, Calendar, IndianRupee, 
  DollarSign, CheckCircle, Clock, ArrowRight,
  PieChart, BarChart3, Bell, X, AlertTriangle,
  Volume2, VolumeX, CreditCard, TrendingDown,
  Activity, Target, Percent
} from 'lucide-react';

// Helper to parse date string in local timezone without UTC shifting
const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
  }
  return new Date(dateStr);
};

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
  const [showAllInvoices, setShowAllInvoices] = useState(false); // new state for "View all"
  
  // Dashboard enhancements: dismissals, alert tunes, clock, and details modals
  const [dismissedReminders, setDismissedReminders] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissedReminders') || '[]');
    } catch {
      return [];
    }
  });
  const [showUnpaidAlert, setShowUnpaidAlert] = useState(true);
  const [beepType, setBeepType] = useState(() => localStorage.getItem('beepType') || 'triple');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedInvoiceDetail, setSelectedInvoiceDetail] = useState(null);
  const [showUnpaidListModal, setShowUnpaidListModal] = useState(false);

  const audioContextRef = useRef(null);
  const hasPlayedSound = useRef(false);

  // Sync dismissed reminders to localStorage
  useEffect(() => {
    localStorage.setItem('dismissedReminders', JSON.stringify(dismissedReminders));
  }, [dismissedReminders]);

  // Keep clock updated every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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

  const playNotificationSound = (typeOverride = null) => {
    const currentType = typeOverride || beepType;
    if (!soundEnabled || (hasPlayedSound.current && !typeOverride)) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') audioContext.resume();
      
      const createBeep = (startTime, frequency = 800, duration = 0.15, gainVal = 0.3, type = 'sine') => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, startTime);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(gainVal, startTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = audioContext.currentTime;
      if (currentType === 'single') {
        createBeep(now, 880, 0.25, 0.3);
      } else if (currentType === 'double') {
        createBeep(now, 800, 0.12, 0.3);
        createBeep(now + 0.18, 1000, 0.18, 0.3);
      } else if (currentType === 'triple') {
        createBeep(now, 800, 0.15, 0.3);
        createBeep(now + 0.2, 800, 0.15, 0.3);
        createBeep(now + 0.4, 800, 0.15, 0.3);
      } else if (currentType === 'chime') {
        // C5 (523.25), E5 (659.25), G5 (783.99) with smoother triangle waves
        createBeep(now, 523.25, 0.3, 0.25, 'triangle');
        createBeep(now + 0.1, 659.25, 0.3, 0.25, 'triangle');
        createBeep(now + 0.2, 783.99, 0.4, 0.25, 'triangle');
      } else if (currentType === 'warning') {
        createBeep(now, 600, 0.2, 0.3, 'sine');
        createBeep(now + 0.25, 450, 0.3, 0.3, 'sine');
      }

      if (!typeOverride) {
        hasPlayedSound.current = true;
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  // Firestore listeners
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

  // Check for overdue/unpaid invoices and play sound
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = invoices.filter(invoice => {
      if (invoice.status === 'paid') return false;
      if (invoice.dueDate) {
        const d = parseLocalDate(invoice.dueDate);
        d.setHours(0, 0, 0, 0);
        return d < today;
      }
      if (invoice.date && invoice.paymentDays && invoice.paymentDays !== 'N/A') {
        const invoiceDate = parseLocalDate(invoice.date);
        const paymentDays = parseInt(invoice.paymentDays);
        if (!isNaN(paymentDays)) {
          const calculatedDueDate = new Date(invoiceDate);
          calculatedDueDate.setDate(calculatedDueDate.getDate() + paymentDays);
          calculatedDueDate.setHours(0, 0, 0, 0);
          return calculatedDueDate < today;
        }
      }
      return false;
    });
    setOverdueInvoices(overdue);
    
    const unpaid = invoices.filter(inv => inv.status === 'unpaid' || inv.status === 'partial');
    
    // Play sound only if active notifications exist (active overdue reminders or active unpaid banner)
    const activeOverdue = overdue.filter(inv => !dismissedReminders.includes(inv.id));
    const activeUnpaidBanner = showUnpaidAlert && unpaid.length > 0 && overdue.length === 0;
    
    if ((activeOverdue.length > 0 || activeUnpaidBanner) && soundEnabled && !hasPlayedSound.current) {
      setTimeout(() => playNotificationSound(), 1000);
    }
  }, [invoices, soundEnabled, dismissedReminders, showUnpaidAlert]);

  // Stats calculation using payments collection as source of truth
  useEffect(() => {
    const getPaidFromPayments = (invoiceId) =>
      payments
        .filter(p => p.invoiceId === invoiceId)
        .reduce((sum, p) => sum + (p.amount || 0), 0);

    let totalInvoiced  = 0;
    let debitInvoiced  = 0;
    let creditInvoiced = 0;
    let totalCollected  = 0;
    let debitCollected  = 0;
    let creditCollected = 0;
    let outstanding    = 0;

    invoices.forEach(inv => {
      const invoiceTotal = inv.total || inv.subtotal || inv.amount || 0;
      totalInvoiced += invoiceTotal;
      if (inv.billType === 'debit')  debitInvoiced  += invoiceTotal;
      if (inv.billType === 'credit') creditInvoiced += invoiceTotal;

      const fromPayments = getPaidFromPayments(inv.id);
      let collected = 0;
      if (fromPayments > 0) {
        collected = Math.min(fromPayments, invoiceTotal);
      } else if (inv.status === 'paid') {
        collected = invoiceTotal;
      } else if (inv.status === 'partial') {
        collected = inv.amountReceived || 0;
      }

      totalCollected += collected;
      if (inv.billType === 'debit')  debitCollected  += collected;
      if (inv.billType === 'credit') creditCollected += collected;

      if (inv.status !== 'paid') {
        outstanding += Math.max(0, invoiceTotal - collected);
      }
    });

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

  const getDaysOverdue = (invoice) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let dueDate = null;
    if (invoice.dueDate) {
      dueDate = parseLocalDate(invoice.dueDate);
    } else if (invoice.date && invoice.paymentDays && invoice.paymentDays !== 'N/A') {
      const invoiceDate = parseLocalDate(invoice.date);
      const paymentDays = parseInt(invoice.paymentDays);
      if (!isNaN(paymentDays)) {
        dueDate = new Date(invoiceDate);
        dueDate.setDate(dueDate.getDate() + paymentDays);
      }
    }
    if (!dueDate) return 0;
    dueDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    hasPlayedSound.current = false;
  };

  const replaySound = () => {
    hasPlayedSound.current = false;
    if (soundEnabled) playNotificationSound();
  };

  const collectionRate = stats.totalInvoiced > 0
    ? ((stats.totalCollected / stats.totalInvoiced) * 100).toFixed(1)
    : 0;

  const unpaidInvoices = invoices.filter(inv => inv.status === 'unpaid' || inv.status === 'partial');
  const debitInvoiceCount  = invoices.filter(inv => inv.billType === 'debit').length;
  const creditInvoiceCount = invoices.filter(inv => inv.billType === 'credit').length;
  const noneInvoiceCount   = invoices.filter(inv => !inv.billType || inv.billType === 'none').length;

  // Sort invoices once for the recent list
  const sortedInvoices = [...invoices].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  const displayedInvoices = showAllInvoices ? sortedInvoices : sortedInvoices.slice(0, 5);

  // Filter overdue reminders to exclude dismissed ones
  const visibleOverdue = overdueInvoices.filter(inv => !dismissedReminders.includes(inv.id));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6 lg:px-8 lg:py-8 max-w-[1600px] mx-auto">
        
        {/* Payment Reminder Alerts */}
        {showReminders && visibleOverdue.length > 0 && (
          <div className="mb-4 sm:mb-6 bg-gradient-to-r from-rose-50 to-orange-50 border-2 border-rose-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg animate-[fadeIn_0.3s_ease-out]">
            <div className="p-4 sm:p-5 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3 sm:mb-4">
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
                      You have {visibleOverdue.length} overdue invoice{visibleOverdue.length > 1 ? 's' : ''} requiring attention
                    </p>
                  </div>
                </div>
                
                {/* Sound and Control Toolbar */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-rose-200/60 shadow-sm w-fit self-end sm:self-start">
                  {/* Beep Type Selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] sm:text-xs font-bold text-rose-700">Tone:</span>
                    <select
                      value={beepType}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setBeepType(newType);
                        localStorage.setItem('beepType', newType);
                        setTimeout(() => playNotificationSound(newType), 50);
                      }}
                      className="text-[11px] sm:text-xs font-semibold bg-white border border-rose-200 rounded px-1.5 py-0.5 text-rose-800 outline-none focus:ring-1 focus:ring-rose-400 cursor-pointer"
                    >
                      <option value="single">Single Beep</option>
                      <option value="double">Double Beep</option>
                      <option value="triple">Triple Beep</option>
                      <option value="chime">Chime Alert</option>
                      <option value="warning">Warning Tone</option>
                    </select>
                  </div>

                  {/* Reset Dismissed Reminders */}
                  {dismissedReminders.length > 0 && (
                    <button
                      onClick={() => setDismissedReminders([])}
                      className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded text-[10px] sm:text-xs font-bold transition-all border border-rose-200 cursor-pointer active:scale-95"
                      title="Reset all dismissed reminders"
                    >
                      Reset ({dismissedReminders.length})
                    </button>
                  )}

                  <div className="h-4 w-[1px] bg-rose-200/80"></div>

                  <button
                    onClick={replaySound}
                    disabled={!soundEnabled}
                    className={`p-1 rounded-lg transition-colors cursor-pointer ${
                      soundEnabled 
                        ? 'hover:bg-rose-100 text-rose-600' 
                        : 'opacity-50 cursor-not-allowed text-rose-400'
                    }`}
                    title="Replay notification sound"
                  >
                    <Bell className="w-4 h-4 text-rose-600" />
                  </button>
                  <button
                    onClick={toggleSound}
                    className="p-1 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                    title={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
                  >
                    {soundEnabled
                      ? <Volume2 className="w-4 h-4 text-rose-600" />
                      : <VolumeX className="w-4 h-4 text-rose-600" />
                    }
                  </button>
                  <button 
                    onClick={() => setShowReminders(false)}
                    className="p-1 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                    title="Close reminders panel"
                  >
                    <X className="w-4 h-4 text-rose-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {visibleOverdue.slice(0, 3).map(invoice => {
                  const client = clients.find(c => c.id === invoice.clientId);
                  const amount = invoice.total || invoice.subtotal || invoice.amount || 0;
                  const daysOverdue = getDaysOverdue(invoice);
                  return (
                    <div 
                      key={invoice.id} 
                      onClick={() => setSelectedInvoiceDetail(invoice)}
                      className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-rose-200 shadow-sm relative group hover:border-rose-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap pr-6 sm:pr-8">
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
                            <p className="text-xs sm:text-sm text-slate-600">Invoice #{invoice.invoiceNumber}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-sm sm:text-base text-rose-600">{formatCurrency(amount)}</p>
                          <p className="text-xs text-rose-700 font-medium">
                            {daysOverdue} day{daysOverdue > 1 ? 's' : ''} overdue
                          </p>
                        </div>
                      </div>
                      
                      {/* Individual Cancel/Dismiss Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDismissedReminders(prev => [...prev, invoice.id]);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        title="Cancel this notification"
                      >
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  );
                })}
                {visibleOverdue.length > 3 && (
                  <p className="text-xs sm:text-sm text-center text-rose-600 font-semibold pt-2">
                    + {visibleOverdue.length - 3} more overdue invoice{visibleOverdue.length - 3 > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Unpaid Invoices Alert Banner */}
        {showUnpaidAlert && unpaidInvoices.length > 0 && !overdueInvoices.length && (
          <div className="mb-4 sm:mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg sm:rounded-xl p-3 sm:p-4 relative group animate-[fadeIn_0.3s_ease-out]">
            <div 
              onClick={() => setShowUnpaidListModal(true)}
              className="flex items-center gap-2 sm:gap-3 pr-6 sm:pr-8 cursor-pointer"
            >
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs sm:text-sm font-semibold text-amber-800">
                  {unpaidInvoices.length} unpaid invoice{unpaidInvoices.length > 1 ? 's' : ''} • 
                  <span className="ml-1 font-bold">{formatCurrency(stats.outstanding)}</span> pending
                </p>
              </div>
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0 animate-pulse" />
            </div>
            
            {/* Dismiss/Cancel Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowUnpaidAlert(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-amber-400 hover:text-amber-700 hover:bg-amber-100/50 transition-all cursor-pointer opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              title="Dismiss warning banner"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        )}
        
        {/* Header Section */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 mb-1 sm:mb-2">
                Business Dashboard
              </h1>
              <p className="text-slate-600 text-xs sm:text-sm lg:text-base">
                Real-time insights into your business performance
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-fit sm:self-center">
              {/* Digital Clock Widget */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl shadow-md border border-slate-800 px-4 py-2 flex items-center gap-3 select-none font-mono">
                <Clock className="w-4 h-4 text-indigo-400 animate-pulse flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-sm sm:text-base font-black tracking-widest text-indigo-300 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)] leading-tight">
                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-sans font-bold leading-none mt-0.5">
                    {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Live Sync Badge */}
              <div className="flex items-center gap-2 bg-white px-3 py-2.5 rounded-xl shadow-sm border border-slate-200">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-slate-600 font-medium">Live Data</span>
                {soundEnabled && overdueInvoices.length > 0 && (
                  <Volume2 className="w-4 h-4 text-emerald-600 ml-1" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
          
          {/* Total Clients */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow">
            <div className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-2.5 lg:p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg sm:rounded-xl">
                  <Users className="w-5 h-5 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">ACTIVE</span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-600 mb-1">Total Clients</p>
              <p className="text-2xl sm:text-2xl lg:text-3xl font-bold text-slate-800 mb-2">{stats.totalClients}</p>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500">
                <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Customer base</span>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          </div>

          {/* Total Invoiced */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow">
            <div className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-2.5 lg:p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg sm:rounded-xl">
                  <FileText className="w-5 h-5 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-emerald-600" />
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">TOTAL</span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-600 mb-1">Total Invoiced</p>
              <p className="text-2xl sm:text-2xl lg:text-3xl font-bold text-slate-800 mb-2 truncate">
                {formatCurrency(stats.totalInvoiced)}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500">
                <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="truncate">{invoices.length} invoices</span>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
          </div>

          {/* Total Collected */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow">
            <div className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-2.5 lg:p-3 bg-gradient-to-br from-violet-50 to-violet-100 rounded-lg sm:rounded-xl">
                  <Wallet className="w-5 h-5 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-violet-600" />
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-1 rounded-full">
                  {collectionRate}%
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-600 mb-1">Total Collected</p>
              <p className="text-2xl sm:text-2xl lg:text-3xl font-bold text-slate-800 mb-2 truncate">
                {formatCurrency(stats.totalCollected)}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500">
                <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="truncate">
                  {invoices.filter(inv => inv.status === 'paid' || inv.status === 'partial').length} received
                </span>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-violet-500 to-violet-600"></div>
          </div>

          {/* Outstanding */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow relative">
            {unpaidInvoices.length > 0 && (
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-rose-500 rounded-full animate-pulse"></div>
              </div>
            )}
            <div className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-2.5 lg:p-3 bg-gradient-to-br from-rose-50 to-rose-100 rounded-lg sm:rounded-xl">
                  <AlertCircle className="w-5 h-5 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-rose-600" />
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">PENDING</span>
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-600 mb-1">Outstanding</p>
              <p className="text-2xl sm:text-2xl lg:text-3xl font-bold text-slate-800 mb-2 truncate">
                {formatCurrency(stats.outstanding)}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="truncate">{unpaidInvoices.length} pending</span>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-rose-500 to-rose-600"></div>
          </div>
        </div>

        {/* Debit/Credit Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">

          {/* Debit Bills */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 p-3 sm:p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-800">Debit Bills</h3>
                    <p className="text-xs text-slate-600">{debitInvoiceCount} invoice{debitInvoiceCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded-full">PAYABLE</div>
              </div>
            </div>
            <div className="p-4 sm:p-5 lg:p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs sm:text-sm text-slate-600 mb-1 sm:mb-2">Total Invoiced</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
                    {formatCurrency(stats.debitInvoiced)}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-600 mb-1 sm:mb-2">Paid</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600">
                    {formatCurrency(stats.debitCollected)}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                  <span className="text-slate-600 font-medium">Payment Progress</span>
                  <span className="font-bold text-slate-800">
                    {stats.debitInvoiced > 0
                      ? ((stats.debitCollected / stats.debitInvoiced) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                  <div
                    className="bg-gradient-to-r from-red-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: stats.debitInvoiced > 0
                        ? `${Math.min(100, (stats.debitCollected / stats.debitInvoiced) * 100)}%`
                        : '0%'
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-red-500 to-red-600"></div>
          </div>

          {/* Credit Bills */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 sm:p-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-800">Credit Bills</h3>
                    <p className="text-xs text-slate-600">{creditInvoiceCount} invoice{creditInvoiceCount !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-xs font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">RECEIVABLE</div>
              </div>
            </div>
            <div className="p-4 sm:p-5 lg:p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs sm:text-sm text-slate-600 mb-1 sm:mb-2">Total Invoiced</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                    {formatCurrency(stats.creditInvoiced)}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-600 mb-1 sm:mb-2">Received</p>
                  <p className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-600">
                    {formatCurrency(stats.creditCollected)}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                  <span className="text-slate-600 font-medium">Collection Progress</span>
                  <span className="font-bold text-slate-800">
                    {stats.creditInvoiced > 0
                      ? ((stats.creditCollected / stats.creditInvoiced) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: stats.creditInvoiced > 0
                        ? `${Math.min(100, (stats.creditCollected / stats.creditInvoiced) * 100)}%`
                        : '0%'
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-green-500 to-green-600"></div>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 p-3.5 sm:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg">
                <Percent className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Collection Rate</p>
                <p className="text-lg sm:text-xl font-bold text-slate-800">{collectionRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 p-3.5 sm:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-emerald-50 rounded-lg">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Avg Invoice</p>
                <p className="text-lg sm:text-xl font-bold text-slate-800 truncate">
                  {formatCurrency(invoices.length > 0 ? stats.totalInvoiced / invoices.length : 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 p-3.5 sm:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-violet-50 rounded-lg">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Paid Invoices</p>
                <p className="text-lg sm:text-xl font-bold text-slate-800">
                  {invoices.filter(inv => inv.status === 'paid').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 p-3.5 sm:p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-slate-50 rounded-lg">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">Untyped Bills</p>
                <p className="text-lg sm:text-xl font-bold text-slate-800">{noneInvoiceCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Invoices with "View all" button */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-3 sm:p-4 border-b border-slate-200">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                Recent Invoices
              </h2>
              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                  {invoices.length} total
                </div>
                {/* View all button */}
                <button
                  onClick={() => setShowAllInvoices(!showAllInvoices)}
                  className="px-3 py-1 text-xs font-medium rounded-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
                >
                  {showAllInvoices ? 'Show less' : 'View all'}
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {invoices.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium text-sm">No invoices yet</p>
                <p className="text-xs text-slate-400 mt-1">Create your first invoice to get started</p>
              </div>
            ) : (
              <>
                {displayedInvoices.map(invoice => {
                  const client = clients.find(c => c.id === invoice.clientId);
                  const amount = invoice.total || invoice.subtotal || invoice.amount || 0;
                  const fromPmts = payments
                    .filter(p => p.invoiceId === invoice.id)
                    .reduce((s, p) => s + (p.amount || 0), 0);
                  const collected = fromPmts > 0
                    ? fromPmts
                    : (invoice.status === 'paid' ? amount : (invoice.amountReceived || 0));

                  return (
                    <div 
                      key={invoice.id} 
                      onClick={() => setSelectedInvoiceDetail(invoice)}
                      className="p-3 sm:p-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-blue-600">
                              {client?.name?.charAt(0) || 'N'}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm text-slate-800 truncate">
                              {client?.name || 'Unknown Client'}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap mt-0.5">
                              <p className="text-xs text-slate-600">#{invoice.invoiceNumber}</p>
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusColor(invoice.status)}`}>
                                {getStatusIcon(invoice.status)}
                                {invoice.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-sm text-slate-800">{formatCurrency(amount)}</p>
                          {invoice.status === 'partial' && collected > 0 && (
                            <p className="text-xs text-amber-600 font-semibold">
                              Paid: {formatCurrency(collected)}
                            </p>
                          )}
                          <p className="text-xs text-slate-500 mt-0.5">{invoice.date || 'No date'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

      </div>

      {/* CSS Animation for Modals */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Modal 1: Unpaid Invoices List Modal */}
      {showUnpaidListModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-lg">Unpaid Invoices</h3>
              </div>
              <button
                onClick={() => setShowUnpaidListModal(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* List */}
            <div className="p-5 overflow-y-auto divide-y divide-slate-100 flex-1">
              {unpaidInvoices.map(invoice => {
                const client = clients.find(c => c.id === invoice.clientId);
                const amount = invoice.total || invoice.subtotal || invoice.amount || 0;
                const remaining = invoice.remainingAmount || (amount - (invoice.amountReceived || 0));
                return (
                  <div
                    key={invoice.id}
                    onClick={() => {
                      setShowUnpaidListModal(false);
                      setSelectedInvoiceDetail(invoice);
                    }}
                    className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 transition-colors px-3 rounded-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 flex-shrink-0 font-bold text-sm">
                        {client?.name?.charAt(0) || 'N'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">
                          {client?.name || 'Unknown Client'}
                        </p>
                        <p className="text-xs text-slate-500">Invoice #{invoice.invoiceNumber} • {invoice.date || 'No Date'}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-sm text-slate-800">{formatCurrency(amount)}</p>
                      <p className="text-xs text-rose-600 font-semibold">Pending: {formatCurrency(remaining)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex justify-end">
              <button
                onClick={() => setShowUnpaidListModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-sm transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Invoice Details Modal */}
      {selectedInvoiceDetail && (() => {
        const invoice = selectedInvoiceDetail;
        const client = clients.find(c => c.id === invoice.clientId);
        const amount = invoice.total || invoice.subtotal || invoice.amount || 0;
        const remaining = invoice.remainingAmount || (amount - (invoice.amountReceived || 0));
        const services = invoice.selectedServices || 
          (invoice.service ? invoice.service.split(',').map(s => ({ name: s.trim(), amount: 0 })) : []);
        
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">Invoice Details</h3>
                  <p className="text-xs text-indigo-200">Invoice #{invoice.invoiceNumber}</p>
                </div>
                <button
                  onClick={() => setSelectedInvoiceDetail(null)}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Badges and Core Status */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Status</span>
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(invoice.status)}`}>
                        {getStatusIcon(invoice.status)}
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Bill Type</span>
                    <div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                        invoice.billType === 'debit' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        invoice.billType === 'credit' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                        {invoice.billType || 'none'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Outstanding Balance</span>
                    <p className={`text-base font-bold ${remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatCurrency(remaining)}
                    </p>
                  </div>
                </div>

                {/* Client & Date Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-slate-200/60 p-4 rounded-xl space-y-2">
                    <h4 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-1">Client Details</h4>
                    <p className="text-sm font-semibold text-slate-700">{client?.name || 'Unknown Client'}</p>
                    {client?.company && <p className="text-xs text-slate-500">Company: {client.company}</p>}
                    {client?.email && <p className="text-xs text-slate-500">Email: {client.email}</p>}
                    {client?.phone && <p className="text-xs text-slate-500">Phone: {client.phone}</p>}
                  </div>
                  <div className="border border-slate-200/60 p-4 rounded-xl space-y-2">
                    <h4 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-1">Payment Dates</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 font-medium">Invoice Date:</span>
                        <p className="font-semibold text-slate-700 mt-0.5">{invoice.date || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Due Date:</span>
                        <p className="font-semibold text-slate-700 mt-0.5 font-mono">
                          {invoice.dueDate || (() => {
                            if (!invoice.date || !invoice.paymentDays || invoice.paymentDays === 'N/A') return 'N/A';
                            const parsedDays = parseInt(invoice.paymentDays);
                            if (isNaN(parsedDays)) return 'N/A';
                            const d = parseLocalDate(invoice.date);
                            d.setDate(d.getDate() + parsedDays);
                            return d.toISOString().split('T')[0];
                          })()}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500 font-medium">Payment Terms:</span>
                        <p className="font-semibold text-slate-700 mt-0.5">
                          {invoice.paymentDays === 'N/A' || !invoice.paymentDays ? 'N/A' : `${invoice.paymentDays} Days`}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Services Table */}
                <div className="border border-slate-200/60 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Services / Items</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {services.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 italic">
                        No service items defined.
                      </div>
                    ) : (
                      services.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start p-3 text-xs sm:text-sm">
                          <div className="min-w-0 pr-4">
                            <span className="font-semibold text-slate-800 block">{item.name || 'Unnamed service'}</span>
                          </div>
                          <span className="font-bold text-slate-700 flex-shrink-0">
                            {item.amount ? formatCurrency(item.amount) : 'Free / Included'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Billing Summary */}
                <div className="border border-slate-200/60 p-4 rounded-xl bg-slate-50/50 space-y-2.5 text-xs sm:text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(invoice.subtotal || amount - (invoice.taxAmount || 0))}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax ({invoice.taxPercentage === 'N/A' ? 'N/A' : `${invoice.taxPercentage || 0}%`})</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(invoice.taxAmount || 0)}</span>
                  </div>
                  <div className="h-[1px] bg-slate-200 my-1"></div>
                  <div className="flex justify-between font-bold text-sm sm:text-base text-slate-800">
                    <span>Total Amount</span>
                    <span>{formatCurrency(amount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Amount Paid</span>
                    <span>{formatCurrency(invoice.amountReceived || 0)}</span>
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-between items-center">
                <span className="text-xs text-slate-400">Created: {invoice.createdAt?.seconds ? new Date(invoice.createdAt.seconds * 1000).toLocaleString() : 'N/A'}</span>
                <button
                  onClick={() => setSelectedInvoiceDetail(null)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer hover:shadow-lg active:scale-95"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}