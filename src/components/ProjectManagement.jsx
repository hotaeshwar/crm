import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, serverTimestamp
} from 'firebase/firestore';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  FolderOpen, Plus, Download, Trash2, Edit2, Save, X,
  Calendar, DollarSign, User, Building2, Clock, CheckCircle,
  AlertCircle, Briefcase, Receipt, Tag, TrendingUp,
  ChevronDown, ChevronUp, Layers, Activity, Megaphone,
  Bell, Volume2, VolumeX
} from 'lucide-react';

export default function ClientAdManagement() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg: string }
  
  // Reminder states
  const [showReminders, setShowReminders] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [ongoingCampaigns, setOngoingCampaigns] = useState([]);
  const audioContextRef = useRef(null);
  const hasPlayedSound = useRef(false);

  const emptyForm = {
    clientId: '',
    projectName: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    budgetPerDay: '',
    totalCost: '',
    gst: '',
    description: '',
    status: 'ongoing',
  };
  const [form, setForm] = useState(emptyForm);

  /* ─── Audio setup for notifications ─── */
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

  const playNotificationSound = () => {
    if (!soundEnabled || hasPlayedSound.current) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') audioContext.resume();
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
      };
      const now = audioContext.currentTime;
      createBeep(now, 800, 0.15);
      createBeep(now + 0.2, 800, 0.15);
      createBeep(now + 0.4, 800, 0.15);
      hasPlayedSound.current = true;
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  /* ─── Firebase listeners ─── */
  useEffect(() => {
    const unsubClients = onSnapshot(collection(db, 'clients'), (s) => {
      setClients(s.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubProjects = onSnapshot(collection(db, 'projects'), (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setProjects(data);
    });
    return () => { unsubClients(); unsubProjects(); };
  }, []);

  // Filter ongoing campaigns without end date for reminder
  useEffect(() => {
    const ongoing = projects.filter(p => p.status === 'ongoing' && !p.endDate);
    setOngoingCampaigns(ongoing);
    if (ongoing.length > 0 && soundEnabled && !hasPlayedSound.current) {
      setTimeout(() => playNotificationSound(), 1000);
    }
  }, [projects, soundEnabled]);

  /* ─── Auto‑calculate total cost when dates or daily budget change ─── */
  useEffect(() => {
    if (form.startDate && form.budgetPerDay && parseFloat(form.budgetPerDay) > 0) {
      let days = null;
      if (form.endDate) {
        const diff = new Date(form.endDate) - new Date(form.startDate);
        days = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
      } else {
        // If no end date, we cannot calculate days → do not auto‑fill
        return;
      }
      if (days && days > 0) {
        const calculated = days * parseFloat(form.budgetPerDay);
        setForm(prev => ({ ...prev, totalCost: calculated.toString() }));
      }
    }
  }, [form.startDate, form.endDate, form.budgetPerDay]);

  /* ─── Helpers ─── */
  const fmt = (n) => new Intl.NumberFormat('en-IN').format(parseFloat(n) || 0);
  const fmtRs = (n) => `Rs. ${fmt(n)}`;

  const calcDays = (start, end) => {
    if (!start || !end) return null;
    const diff = new Date(end) - new Date(start);
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  };

  const calcTotals = (obj) => {
    const start = obj.startDate;
    const end = obj.endDate;
    const days = calcDays(start, end);

    const budgetPerDay = parseFloat(obj.budgetPerDay) || 0;
    const budgetSubtotal = days && budgetPerDay ? days * budgetPerDay : null;

    const totalCost = parseFloat(obj.totalCost) || budgetSubtotal || 0;
    const gstPct = parseFloat(obj.gst) || 0;
    const gstAmt = gstPct ? (totalCost * gstPct) / 100 : 0;
    const grandTotal = totalCost + gstAmt;

    return { days, budgetSubtotal, totalCost, gstAmt, grandTotal };
  };

  const genProjectNumber = () => {
    const now = new Date();
    return `AD-${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  /* ─── CRUD ─── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const { grandTotal, gstAmt, totalCost } = calcTotals(form);

      const payload = {
        clientId: form.clientId,
        projectName: form.projectName,
        startDate: form.startDate,
        endDate: form.endDate,
        budgetPerDay: form.budgetPerDay,
        totalCost: form.totalCost,
        gst: form.gst,
        description: form.description,
        status: form.status,
        baseCost: totalCost,
        gstAmount: gstAmt,
        grandTotal,
        updatedAt: serverTimestamp(),
      };

      if (editId) {
        const existing = projects.find(p => p.id === editId);
        payload.projectNumber = existing?.projectNumber || genProjectNumber();
        await updateDoc(doc(db, 'projects', editId), payload);
        setEditId(null);
      } else {
        payload.projectNumber = genProjectNumber();
        payload.createdAt = serverTimestamp();
        await addDoc(collection(db, 'projects'), payload);
      }

      setForm(emptyForm);
      setShowForm(false);
      showToast('success', editId ? 'Campaign updated successfully!' : 'Campaign saved successfully!');
    } catch (err) {
      setError(err.message);
      showToast('error', 'Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (p) => {
    setForm({
      clientId: p.clientId || '',
      projectName: p.projectName || '',
      startDate: p.startDate || '',
      endDate: p.endDate || '',
      budgetPerDay: p.budgetPerDay || '',
      totalCost: p.totalCost || '',
      gst: p.gst || '',
      description: p.description || '',
      status: p.status || 'ongoing',
    });
    setEditId(p.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this ad campaign? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'projects', id));
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
    setError('');
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
    hasPlayedSound.current = false;
  };

  const replaySound = () => {
    hasPlayedSound.current = false;
    if (soundEnabled) playNotificationSound();
  };

  /* ─── PDF Generation (unchanged) ─── */
  const downloadBill = async (project) => {
    const client = clients.find(c => c.id === project.clientId);
    const { days, totalCost, gstAmt, grandTotal } = calcTotals(project);

    const pdfDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdfDoc.internal.pageSize.getWidth();
    const pageHeight = pdfDoc.internal.pageSize.getHeight();
    const L = 15, R = 15;
    const cW = pageWidth - L - R;
    let y = 15;

    /* Logo / header */
    const logoW = 65;
    try {
      const img = new Image();
      img.src = '/images/LOGO.png';
      await new Promise((res, rej) => {
        img.onload = res; img.onerror = rej;
        setTimeout(rej, 500);
      });
      const ar = img.naturalHeight / img.naturalWidth;
      const logoH = logoW * ar;
      pdfDoc.addImage(img, 'PNG', L, y, logoW, logoH, undefined, 'FAST');
      const ix = L + logoW + 18;
      pdfDoc.setTextColor(0, 0, 0); pdfDoc.setFontSize(10); pdfDoc.setFont(undefined, 'bold');
      let iy = y + 5;
      ['SCO 246, Devaji Plaza, VIP Road', 'Zirakpur, India', 'marketing@buildingindiadigital.com', 'For any enquiry, Call Us:'].forEach(t => { pdfDoc.text(t, ix, iy); iy += 5; });
      pdfDoc.setFontSize(11);
      pdfDoc.text('+919041499964', ix, iy); iy += 5;
      pdfDoc.text('+919041499973', ix, iy);
      y += Math.max(logoH, iy - y) + 15;
    } catch {
      pdfDoc.setFillColor(255, 152, 0);
      pdfDoc.roundedRect(L, y, logoW, 40, 3, 3, 'F');
      pdfDoc.setTextColor(255, 255, 255); pdfDoc.setFontSize(22); pdfDoc.setFont(undefined, 'bold');
      pdfDoc.text('BID', L + logoW / 2, y + 24, { align: 'center' });
      const ix = L + logoW + 18;
      pdfDoc.setTextColor(0, 0, 0); pdfDoc.setFontSize(10); pdfDoc.setFont(undefined, 'bold');
      let iy = y + 5;
      ['SCO 246, Devaji Plaza, VIP Road', 'Zirakpur, India', 'marketing@buildingindiadigital.com', 'For any enquiry, Call Us:'].forEach(t => { pdfDoc.text(t, ix, iy); iy += 5; });
      pdfDoc.setFontSize(11);
      pdfDoc.text('+919041499964', ix, iy); iy += 5;
      pdfDoc.text('+919041499973', ix, iy);
      y += 60;
    }

    /* Title banner */
    pdfDoc.setFillColor(255, 152, 0);
    pdfDoc.roundedRect(L, y, cW, 12, 2, 2, 'F');
    pdfDoc.setTextColor(255, 255, 255); pdfDoc.setFontSize(16); pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('AD CAMPAIGN BILL', L + cW / 2, y + 8, { align: 'center' });
    y += 22;

    /* Two-column: project details + bill to */
    const col = cW / 2;
    pdfDoc.setTextColor(0, 0, 0); pdfDoc.setFontSize(11); pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('CAMPAIGN DETAILS', L, y);
    pdfDoc.text('BILL TO', L + col, y);

    pdfDoc.setFontSize(10);
    const details = [
      ['Campaign Number:', project.projectNumber],
      ['Campaign Name:', project.projectName],
      ['Start Date:', project.startDate],
      ['End Date:', project.endDate || 'Ongoing'],
      ['Duration:', days ? `${days} day${days !== 1 ? 's' : ''}` : 'Ongoing'],
    ];
    details.forEach(([label, val], i) => {
      pdfDoc.setFont(undefined, 'bold'); pdfDoc.text(label, L, y + 8 + i * 8);
      pdfDoc.setFont(undefined, 'normal'); pdfDoc.text(String(val), L + 45, y + 8 + i * 8);
    });

    pdfDoc.setFont(undefined, 'normal');
    const billLines = [
      client?.name || '—',
      client?.company || '',
      client?.email || '',
      client?.phone || '',
    ].filter(Boolean);
    billLines.forEach((line, i) => pdfDoc.text(line, L + col, y + 8 + i * 8));
    y += 60;

    /* Services / scope table */
    pdfDoc.setFillColor(76, 175, 80); pdfDoc.setTextColor(255, 255, 255);
    pdfDoc.rect(L, y - 2, cW, 11, 'F');
    pdfDoc.setFontSize(10); pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('S.NO', L + 5, y + 5);
    pdfDoc.text('DESCRIPTION', L + 22, y + 5);
    pdfDoc.text('AMOUNT', L + cW - 10, y + 5, { align: 'right' });
    y += 13;

    pdfDoc.setTextColor(0, 0, 0); pdfDoc.setFont(undefined, 'bold');
    const rows = [];
    if (project.budgetPerDay && days) {
      rows.push({
        name: `${project.projectName} — ${days} day${days !== 1 ? 's' : ''} × ${fmtRs(project.budgetPerDay)}/day`,
        amount: totalCost,
      });
    } else {
      rows.push({ name: project.projectName || 'Ad Campaign Fee', amount: totalCost });
    }
    if (project.description) rows.push({ name: `Scope: ${project.description}`, amount: null });

    rows.forEach((row, idx) => {
      const lines = pdfDoc.splitTextToSize(row.name, 120);
      const rh = 10 + (lines.length > 1 ? (lines.length - 1) * 5 : 0);
      pdfDoc.setDrawColor(180, 180, 180); pdfDoc.setLineWidth(0.3);
      pdfDoc.rect(L, y - 2, cW, rh + 2);
      pdfDoc.setFont(undefined, 'bold'); pdfDoc.text(`${idx + 1}`, L + 5, y + 5);
      lines.forEach((l, li) => pdfDoc.text(l, L + 22, y + 5 + li * 5));
      if (row.amount != null) pdfDoc.text(fmtRs(row.amount), L + cW - 10, y + 5, { align: 'right' });
      y += rh + 4;
    });
    y += 4;

    /* Status bar */
    const sColors = { ongoing: [33, 150, 243], completed: [76, 175, 80], paused: [255, 152, 0] };
    const sc = sColors[project.status] || sColors.ongoing;
    pdfDoc.setFillColor(...sc);
    pdfDoc.roundedRect(L, y, cW, 8, 2, 2, 'F');
    pdfDoc.setTextColor(255, 255, 255); pdfDoc.setFontSize(11); pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text(`CAMPAIGN STATUS: ${(project.status || 'ongoing').toUpperCase()}`, L + 5, y + 6);
    y += 14;

    /* Totals box */
    pdfDoc.setFillColor(245, 245, 245); pdfDoc.setDrawColor(200, 200, 200);
    pdfDoc.roundedRect(L, y - 4, cW, project.gst ? 34 : 26, 3, 3, 'FD');
    pdfDoc.setTextColor(0, 0, 0); pdfDoc.setFontSize(10); pdfDoc.setFont(undefined, 'bold');

    pdfDoc.text('Base Cost:', L + 5, y + 2);
    pdfDoc.text(fmtRs(totalCost), L + cW - 5, y + 2, { align: 'right' });
    y += 8;

    if (project.gst) {
      pdfDoc.text(`GST (${project.gst}%):`, L + 5, y + 2);
      pdfDoc.text(fmtRs(gstAmt), L + cW - 5, y + 2, { align: 'right' });
      y += 8;
    }

    y += 4;
    pdfDoc.setFillColor(76, 175, 80);
    pdfDoc.rect(L, y - 2, cW, 11, 'F');
    pdfDoc.setTextColor(255, 255, 255); pdfDoc.setFontSize(13); pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('GRAND TOTAL:', L + 5, y + 6);
    pdfDoc.text(fmtRs(grandTotal), L + cW - 5, y + 6, { align: 'right' });
    y += 20;

    /* Footer */
    const fy = pageHeight - 20;
    pdfDoc.setDrawColor(76, 175, 80); pdfDoc.setLineWidth(0.5);
    pdfDoc.line(L, fy - 10, L + cW, fy - 10);
    pdfDoc.setTextColor(0, 0, 0); pdfDoc.setFontSize(10); pdfDoc.setFont(undefined, 'bold');
    pdfDoc.text('Thank you for your business!', L + cW / 2, fy - 5, { align: 'center' });
    pdfDoc.setFontSize(9); pdfDoc.setFont(undefined, 'normal');
    pdfDoc.text('For any queries: marketing@buildingindiadigital.com | +919041499964 | +919041499973', L + cW / 2, fy + 2, { align: 'center' });
    pdfDoc.text('Building India Digital © 2026', L + cW / 2, fy + 8, { align: 'center' });

    pdfDoc.save(`${project.projectNumber}.pdf`);
  };

  /* ─── Status helpers ─── */
  const statusCfg = {
    ongoing: { label: 'Active', dot: 'bg-emerald-500 animate-pulse', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    completed: { label: 'Completed', dot: 'bg-slate-400', badge: 'bg-slate-50 text-slate-700 border-slate-200' },
    paused: { label: 'Paused', dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  };

  const totals = calcTotals(form);

  /* ─── Render ─── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-3 py-4 sm:px-4 sm:py-6 md:px-6 lg:px-8 lg:py-8 space-y-4 sm:space-y-6">

        {/* ── Ongoing Campaigns Reminder Banner ── */}
        {showReminders && ongoingCampaigns.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-orange-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 sm:p-5 lg:p-6">
              <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
                <div className="flex items-start gap-3 sm:gap-4 flex-1">
                  <div className="p-2 sm:p-3 bg-orange-100 rounded-full flex-shrink-0">
                    <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 animate-bounce" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-bold text-orange-800 flex items-center gap-2 mb-1">
                      <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" />
                      Ongoing Campaigns Without End Date
                    </h3>
                    <p className="text-xs sm:text-sm text-orange-700">
                      You have {ongoingCampaigns.length} active campaign{ongoingCampaigns.length > 1 ? 's' : ''} without an end date. 
                      Consider setting an end date or marking them completed.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={replaySound}
                    disabled={!soundEnabled}
                    className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                      soundEnabled 
                        ? 'hover:bg-orange-100 text-orange-600' 
                        : 'opacity-50 cursor-not-allowed text-orange-400'
                    }`}
                    title="Replay notification sound"
                  >
                    <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <button
                    onClick={toggleSound}
                    className="p-1.5 sm:p-2 hover:bg-orange-100 rounded-lg transition-colors"
                    title={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
                  >
                    {soundEnabled
                      ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                      : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                    }
                  </button>
                  <button 
                    onClick={() => setShowReminders(false)}
                    className="p-1 hover:bg-orange-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3">
                {ongoingCampaigns.slice(0, 3).map(campaign => {
                  const client = clients.find(c => c.id === campaign.clientId);
                  const amount = campaign.grandTotal || campaign.totalCost || 0;
                  return (
                    <div key={campaign.id} className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-orange-200 shadow-sm">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm sm:text-base text-slate-800 truncate">
                              {campaign.projectName}
                            </p>
                            <p className="text-xs sm:text-sm text-slate-600">Client: {client?.name || 'Unknown'}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-sm sm:text-base text-orange-600">{fmtRs(amount)}</p>
                          <p className="text-xs text-orange-700 font-medium">
                            Started: {campaign.startDate}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {ongoingCampaigns.length > 3 && (
                  <p className="text-xs sm:text-sm text-center text-orange-600 font-medium pt-2">
                    + {ongoingCampaigns.length - 3} more ongoing campaign{ongoingCampaigns.length - 3 > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-2.5 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl shadow-lg">
                <Megaphone className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800">Client Ad Management</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Track ad campaigns, budgets & generate invoices</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (showForm && !editId) {
                  handleCancel();
                } else {
                  setShowForm(true);
                  setEditId(null);
                  setForm(emptyForm);
                  setError('');
                }
              }}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-shadow"
            >
              {showForm && !editId ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showForm && !editId ? 'Cancel' : 'New Campaign'}
            </button>
          </div>

          {/* stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 pt-4 border-t border-slate-100">
            {[
              { label: 'Total', val: projects.length, color: 'text-slate-700' },
              { label: 'Active', val: projects.filter(p => p.status === 'ongoing').length, color: 'text-emerald-600' },
              { label: 'Completed', val: projects.filter(p => p.status === 'completed').length, color: 'text-blue-600' },
              { label: 'Paused', val: projects.filter(p => p.status === 'paused').length, color: 'text-amber-600' },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-lg p-2.5 text-center">
                <div className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.val}</div>
                <div className="text-xs text-slate-500 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Form ── */}
        {showForm && (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <div className="p-1.5 bg-orange-50 rounded-lg">
                <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800">
                {editId ? 'Edit Campaign' : 'Create New Campaign'}
              </h2>
              {editId && (
                <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                  Editing existing record
                </span>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2.5 rounded-lg mb-4 text-xs sm:text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Row 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Client */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                    <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5 text-orange-500" /> Client <span className="text-rose-500">*</span></span>
                  </label>
                  <select
                    value={form.clientId}
                    onChange={e => setForm({ ...form, clientId: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  >
                    <option value="">Select Client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.company || c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Campaign Name */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                    <span className="inline-flex items-center gap-1"><Megaphone className="w-3.5 h-3.5 text-orange-500" /> Campaign Name <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    value={form.projectName}
                    onChange={e => setForm({ ...form, projectName: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="e.g., Google Ads - Q1 2026"
                    required
                  />
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                    <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-orange-500" /> Start Date <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>

                {/* End Date — with clear button */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      End Date
                      <span className="text-slate-400 text-xs font-normal">(optional — leave blank for Ongoing)</span>
                    </span>
                  </label>

                  <div className="relative">
                    <input
                      type="date"
                      value={form.endDate}
                      min={form.startDate || undefined}
                      onChange={e => setForm({ ...form, endDate: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-8"
                    />
                    {form.endDate && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, endDate: '' })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Clear end date (set to Ongoing)"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {!form.endDate ? (
                    <p className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full inline-block animate-pulse" />
                      Ongoing — no end date set
                    </p>
                  ) : (
                    form.startDate && (
                      <p className="text-xs text-slate-500 mt-1">
                        Duration: <strong>{calcDays(form.startDate, form.endDate)} day(s)</strong>
                      </p>
                    )
                  )}
                </div>

                {/* Budget Per Day */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                    <span className="inline-flex items-center gap-1"><Activity className="w-3.5 h-3.5 text-orange-500" /> Daily Budget (₹) <span className="text-slate-400 text-xs font-normal">(Optional)</span></span>
                  </label>
                  <input
                    type="number"
                    value={form.budgetPerDay}
                    onChange={e => setForm({ ...form, budgetPerDay: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="e.g., 5000"
                    min="0"
                  />
                  {form.budgetPerDay && form.startDate && form.endDate && (
                    <p className="text-xs text-orange-600 font-medium mt-1">
                      {calcDays(form.startDate, form.endDate)} days × ₹{fmt(form.budgetPerDay)} = <strong>₹{fmt(calcDays(form.startDate, form.endDate) * parseFloat(form.budgetPerDay))}</strong>
                    </p>
                  )}
                </div>

                {/* Total Cost */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                    <span className="inline-flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-orange-500" /> Total Cost (₹) <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="number"
                    value={form.totalCost}
                    onChange={e => setForm({ ...form, totalCost: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Enter total campaign cost"
                    min="0"
                    required
                  />
                </div>

                {/* GST */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                    <span className="inline-flex items-center gap-1"><Tag className="w-3.5 h-3.5 text-slate-400" /> GST % <span className="text-slate-400 text-xs font-normal">(Optional)</span></span>
                  </label>
                  <input
                    type="number"
                    value={form.gst}
                    onChange={e => setForm({ ...form, gst: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="e.g., 18"
                    min="0" max="100"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                    <span className="inline-flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-orange-500" /> Status</span>
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="ongoing">Active</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Campaign Description / Scope (Optional)</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                  placeholder="Brief campaign scope..."
                  rows={2}
                />
              </div>

              {/* Live preview */}
              {form.totalCost && (
                <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-xl p-3 sm:p-4 border border-orange-200">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-700 mb-2">Invoice Preview</h3>
                  <div className="space-y-1.5 text-xs sm:text-sm">
                    <div className="flex justify-between"><span className="text-slate-600">Base Cost</span><span className="font-semibold">₹{fmt(totals.totalCost)}</span></div>
                    {form.gst && <div className="flex justify-between"><span className="text-slate-600">GST ({form.gst}%)</span><span className="font-semibold">₹{fmt(totals.gstAmt)}</span></div>}
                    <div className="flex justify-between pt-1.5 border-t border-orange-300">
                      <span className="font-bold text-slate-800">Grand Total</span>
                      <span className="font-bold text-orange-600 text-base sm:text-lg">₹{fmt(totals.grandTotal)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col xs:flex-row gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 text-white py-2.5 sm:py-3 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-shadow disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : editId ? 'Update Campaign' : 'Save Campaign'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 sm:py-3 px-5 rounded-xl font-semibold text-sm transition-colors"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Campaigns List ── */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-orange-50">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-orange-600" /> All Campaigns ({projects.length})
            </h2>
          </div>

          {projects.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-slate-400">
              <div className="p-4 bg-slate-50 rounded-full">
                <Megaphone className="w-12 h-12" />
              </div>
              <p className="text-base font-medium text-slate-600">No campaigns yet</p>
              <p className="text-sm text-slate-400">Create your first ad campaign to get started</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Campaign', 'Client', 'Start Date', 'End Date', 'Daily Budget', 'Total Cost', 'GST', 'Grand Total', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {projects.map(p => {
                      const client = clients.find(c => c.id === p.clientId);
                      const s = statusCfg[p.status] || statusCfg.ongoing;
                      const { days, totalCost, gstAmt, grandTotal } = calcTotals(p);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800 text-sm">{p.projectName}</div>
                            <div className="text-xs text-slate-400">{p.projectNumber}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-700 text-sm">{client?.name || '—'}</div>
                            <div className="text-xs text-slate-400">{client?.company || ''}</div>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600 font-medium whitespace-nowrap">
                            {p.startDate || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            {p.endDate ? (
                              <span className="text-slate-600 font-medium">{p.endDate}</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                Ongoing
                              </span>
                            )}
                            {days && (
                              <div className="text-slate-400 mt-0.5">{days}d</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                            {p.budgetPerDay ? `₹${fmt(p.budgetPerDay)}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-800">₹{fmt(totalCost)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {p.gst ? `${p.gst}%` : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-orange-600">₹{fmt(grandTotal)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${s.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                              {s.label}
                            </span>
                           </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <button onClick={() => handleEdit(p)} className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => downloadBill(p)} className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors" title="Download Invoice"><Download className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDelete(p.id)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                           </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Tablet Cards */}
              <div className="lg:hidden divide-y divide-slate-100">
                {projects.map(p => {
                  const client = clients.find(c => c.id === p.clientId);
                  const s = statusCfg[p.status] || statusCfg.ongoing;
                  const { days, totalCost, gstAmt, grandTotal } = calcTotals(p);
                  const isExpanded = expandedId === p.id;

                  return (
                    <div key={p.id} className="p-4 sm:p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-50 to-pink-50 rounded-xl flex items-center justify-center border border-orange-100 flex-shrink-0">
                            <Megaphone className="w-5 h-5 text-orange-600" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-800 text-sm sm:text-base truncate">{p.projectName}</h3>
                            <p className="text-xs text-slate-400">{p.projectNumber}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ml-2 flex-shrink-0 ${s.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate font-medium">{client?.name || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">
                            {p.startDate}
                            {p.endDate
                              ? ` → ${p.endDate}`
                              : <span className="text-emerald-600 font-semibold"> → Ongoing</span>
                            }
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-500">Grand Total</span>
                          <div className="text-lg font-bold text-orange-600">₹{fmt(grandTotal)}</div>
                        </div>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : p.id)}
                          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                        >
                          {isExpanded ? <><ChevronUp className="w-4 h-4" />Less</> : <><ChevronDown className="w-4 h-4" />Details</>}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {[
                              { label: 'Daily Budget', val: p.budgetPerDay ? `₹${fmt(p.budgetPerDay)}` : '—' },
                              { label: 'Duration', val: days ? `${days} days` : 'Ongoing' },
                              { label: 'Base Cost', val: `₹${fmt(totalCost)}` },
                              { label: 'GST', val: p.gst ? `${p.gst}% (₹${fmt(gstAmt)})` : '—' },
                            ].map(({ label, val }) => (
                              <div key={label} className="bg-slate-50 rounded-lg p-2">
                                <div className="text-slate-400">{label}</div>
                                <div className="font-semibold text-slate-700">{val}</div>
                              </div>
                            ))}
                          </div>
                          {p.description && (
                            <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2 italic">{p.description}</p>
                          )}
                          <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => handleEdit(p)} className="flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors">
                              <Edit2 className="w-3.5 h-3.5" />Edit
                            </button>
                            <button onClick={() => downloadBill(p)} className="flex items-center justify-center gap-1.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors">
                              <Download className="w-3.5 h-3.5" />Invoice
                            </button>
                            <button onClick={() => handleDelete(p.id)} className="flex items-center justify-center gap-1.5 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        {/* ── Toast notification ── */}
        {toast && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold transition-all duration-300
            ${toast.type === 'success'
              ? 'bg-emerald-600 border-emerald-500 text-white'
              : 'bg-rose-600 border-rose-500 text-white'}`}>
            {toast.type === 'success'
              ? <CheckCircle className="w-5 h-5 flex-shrink-0" />
              : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}