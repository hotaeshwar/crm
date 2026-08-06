import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Search, Plus, X, Calendar, Mail, Phone,
  TrendingUp, User, Info, Check, AlertCircle, UserCheck
} from 'lucide-react';
import { useToast } from './Loginform';

// Toast Container Helper
function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[90vw] max-w-sm pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium
            transition-all duration-300 animate-slide-in
            ${t.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : ''}
            ${t.type === 'error'   ? 'bg-rose-50    border-rose-200    text-rose-800'    : ''}
            ${t.type === 'info'    ? 'bg-blue-50    border-blue-200    text-blue-800'    : ''}
          `}
        >
          <span className="flex-1 leading-snug">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="opacity-60 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

const STAGES = [
  { id: 'New', label: 'NEW' },
  { id: 'Contacted', label: 'CONTACTED' },
  { id: 'Proposal Sent', label: 'PROPOSAL SENT' },
  { id: 'Negotiating', label: 'NEGOTIATING' },
  { id: 'Closed Won', label: 'CLOSED WON' },
  { id: 'Closed Lost', label: 'CLOSED LOST' },
];

export default function LeadPipeline() {
  const { toasts, removeToast, success, error: toastError } = useToast();

  const [leads, setLeads] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Form state
  const [form, setForm] = useState({
    representative: '',
    company: '',
    contactInfo: '',
    source: 'Direct Outreach',
    followUpDate: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Listen to auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        fetchLeads();
      }
    });
    return unsub;
  }, []);

  const fetchLeads = () => {
    onSnapshot(
      collection(db, 'leads'),
      snapshot => {
        const leadsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort by creation date descending
        leadsData.sort((a, b) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        });
        setLeads(leadsData);
      },
      err => toastError('Failed to fetch leads: ' + err.message)
    );
  };

  const handleAddLead = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    if (!form.representative.trim()) {
      setFormError('Contact Representative is required.');
      setSaving(false);
      return;
    }

    try {
      await addDoc(collection(db, 'leads'), {
        representative: form.representative.trim(),
        company: form.company.trim(),
        contactInfo: form.contactInfo.trim(),
        source: form.source,
        followUpDate: form.followUpDate,
        notes: form.notes.trim(),
        status: 'New',
        converted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        createdByEmail: user.email
      });

      success(`Lead opportunity for "${form.representative}" added.`);
      setShowAddModal(false);
      setForm({
        representative: '',
        company: '',
        contactInfo: '',
        source: 'Direct Outreach',
        followUpDate: '',
        notes: ''
      });
    } catch (err) {
      setFormError(err.message);
      toastError('Failed to save lead. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (leadId, newStatus) => {
    try {
      await updateDoc(doc(db, 'leads', leadId), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      success(`Lead status updated to ${newStatus}.`);
    } catch (err) {
      toastError('Failed to update status.');
    }
  };

  const handleConvertLead = async (lead) => {
    try {
      // Parse email and phone from contactInfo
      let email = '';
      let phone = '';
      const text = lead.contactInfo || '';

      if (text.includes('@')) {
        // Simple extraction
        const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
        email = emailMatch ? emailMatch[0] : text;
      }
      
      // Look for phone digits (7 or more digits)
      const phoneDigits = text.replace(/\D/g, '');
      if (phoneDigits.length >= 7) {
        phone = text;
      } else {
        phone = '';
      }

      if (!email && !phone) {
        // Fallback
        email = text;
      }

      // Add to clients collection
      await addDoc(collection(db, 'clients'), {
        name: lead.representative,
        company: lead.company || 'Direct Client',
        email: email,
        phone: phone,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        createdByEmail: user.email
      });

      // Update lead document
      await updateDoc(doc(db, 'leads', lead.id), {
        converted: true,
        status: 'Closed Won',
        updatedAt: serverTimestamp()
      });

      success(`Lead "${lead.representative}" converted to Client successfully!`);
    } catch (err) {
      toastError('Failed to convert lead: ' + err.message);
    }
  };

  // Filter leads by search query
  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const query = searchQuery.toLowerCase();
    return leads.filter(l => 
      (l.representative || '').toLowerCase().includes(query) || 
      (l.company || '').toLowerCase().includes(query)
    );
  }, [leads, searchQuery]);

  // Group leads by stage
  const leadsByStage = useMemo(() => {
    const groups = {};
    STAGES.forEach(s => {
      groups[s.id] = [];
    });
    filteredLeads.forEach(l => {
      const stage = l.status || 'New';
      if (groups[stage]) {
        groups[stage].push(l);
      } else {
        // Fallback for unexpected status
        groups['New'].push(l);
      }
    });
    return groups;
  }, [filteredLeads]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in { animation: slide-in 0.25s ease-out both; }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto space-y-6">
          
          {/* Header section */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/85 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl shadow-md text-white">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Leads Pipeline</h1>
                <p className="text-slate-500 text-xs sm:text-sm font-semibold tracking-wider uppercase mt-0.5">Sales Pipeline & Opportunity Stages</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" /> Add Opportunity
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search leads name or business..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 placeholder-slate-400 font-medium text-sm sm:text-base"
            />
          </div>

          {/* Pipeline Columns Board */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto no-scrollbar pb-4">
            {STAGES.map(stage => {
              const stageLeads = leadsByStage[stage.id] || [];
              return (
                <div key={stage.id} className="flex flex-col min-w-[240px] bg-slate-50/50 rounded-2xl border border-slate-200/60 p-3 min-h-[500px]">
                  
                  {/* Stage Header */}
                  <div className="flex items-center justify-between bg-white px-3 py-2.5 rounded-xl border border-slate-200/80 shadow-sm mb-3">
                    <span className="text-xs font-extrabold text-slate-700 tracking-wider">{stage.label}</span>
                    <span className="text-xs font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Cards container */}
                  <div className="flex-1 space-y-3">
                    {stageLeads.length === 0 ? (
                      <div className="h-28 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-xs font-semibold">
                        No leads
                      </div>
                    ) : (
                      stageLeads.map(lead => (
                        <div
                          key={lead.id}
                          className="bg-white rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-3.5 space-y-3 relative group"
                        >
                          {/* Lead info */}
                          <div>
                            <h3 className="font-extrabold text-slate-800 text-sm tracking-wide uppercase truncate">
                              {lead.representative}
                            </h3>
                            <p className="text-[10px] sm:text-xs font-extrabold text-slate-500 uppercase tracking-wide truncate mt-0.5">
                              {lead.company || 'No Company'}
                            </p>
                          </div>

                          {/* Contact and Source */}
                          <div className="space-y-1.5 pt-1.5 border-t border-slate-100/60">
                            {lead.contactInfo && (
                              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 truncate">
                                {lead.contactInfo.includes('@') ? (
                                  <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                ) : (
                                  <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                )}
                                <span className="truncate">{lead.contactInfo}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-slate-500 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                              <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span>Source: {lead.source}</span>
                            </div>
                          </div>

                          {/* Notes Preview if available */}
                          {lead.notes && (
                            <div className="text-[11px] text-slate-500 font-medium bg-slate-50/50 p-2 rounded-lg border border-dashed border-slate-200 line-clamp-2">
                              {lead.notes}
                            </div>
                          )}

                          {/* Date and Status Selector */}
                          <div className="flex items-center gap-1.5 justify-between pt-2 border-t border-slate-100/60">
                            <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-slate-500">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="uppercase text-[9px] tracking-wide">
                                {lead.followUpDate ? lead.followUpDate : 'No Date'}
                              </span>
                            </div>

                            <select
                              value={lead.status || 'New'}
                              onChange={e => handleUpdateStatus(lead.id, e.target.value)}
                              className="text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 px-2 py-1.5 rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-teal-500 transition-colors cursor-pointer"
                            >
                              {STAGES.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.id}</option>
                              ))}
                            </select>
                          </div>

                          {/* Convert button */}
                          <div className="pt-1.5">
                            {lead.converted ? (
                              <div className="w-full flex items-center justify-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-200 py-2 rounded-xl text-xs font-extrabold select-none">
                                <Check className="w-3.5 h-3.5" /> Converted
                              </div>
                            ) : (
                              <button
                                onClick={() => handleConvertLead(lead)}
                                className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-655 hover:shadow text-white py-2 rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
                              >
                                <UserCheck className="w-3.5 h-3.5" /> Convert to Client
                              </button>
                            )}
                          </div>

                        </div>
                      ))
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Add Opportunity Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-slide-in">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">Add Lead Opportunity</h2>
                <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase mt-0.5">Sales Pipeline Tracker</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Error */}
            {formError && (
              <div className="bg-rose-50 border-b border-rose-100 text-rose-700 px-6 py-3 flex items-start gap-2 text-xs font-bold">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAddLead} className="p-6 space-y-4">
              
              <div>
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                  Contact Representative <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Miller"
                  value={form.representative}
                  onChange={e => setForm({ ...form, representative: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm sm:text-base border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50 text-slate-700 placeholder-slate-400 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                  Brand / Business Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Miller Co. Marketing"
                  value={form.company}
                  onChange={e => setForm({ ...form, company: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm sm:text-base border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50 text-slate-700 placeholder-slate-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                  Contact Information (Email / Phone)
                </label>
                <input
                  type="text"
                  placeholder="john@millerco.com"
                  value={form.contactInfo}
                  onChange={e => setForm({ ...form, contactInfo: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm sm:text-base border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50 text-slate-700 placeholder-slate-400 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                    Lead Source
                  </label>
                  <select
                    value={form.source}
                    onChange={e => setForm({ ...form, source: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm sm:text-base border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50 text-slate-700 font-semibold"
                  >
                    <option value="Direct Outreach">Direct Outreach</option>
                    <option value="Social Media">Social Media</option>
                    <option value="Referral">Referral</option>
                    <option value="Website">Website</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                    Follow Up Date
                  </label>
                  <input
                    type="date"
                    value={form.followUpDate}
                    onChange={e => setForm({ ...form, followUpDate: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm sm:text-base border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50 text-slate-700 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                  Lead Notes
                </label>
                <textarea
                  placeholder="Detail proposal items, budget expectations..."
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm sm:text-base border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50 text-slate-700 placeholder-slate-400 font-medium resize-none"
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-60 cursor-pointer"
                >
                  {saving ? 'Adding...' : 'Add Lead'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}
    </>
  );
}
