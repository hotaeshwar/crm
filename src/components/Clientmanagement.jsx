import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Users, UserPlus, Mail, Phone, Building2,
  Edit, Trash2, User, Save, X, AlertCircle
} from 'lucide-react';

import LoginForm, { useToast } from './Loginform';
import Toast from './Loginform';

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

export default function ClientManagement() {
  const { toasts, removeToast, success, error: toastError, info } = useToast();

  const [clients, setClients]   = useState([]);
  const [form, setForm]         = useState({ name: '', email: '', phone: '', company: '' });
  const [editId, setEditId]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [formError, setFormError] = useState('');
  const [user, setUser]         = useState(null);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) fetchClients();
    });
    return unsub;
  }, []);

  const fetchClients = () => {
    onSnapshot(
      collection(db, 'clients'),
      snapshot => {
        const clientsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        // Sort alphabetically by name (A to Z)
        clientsData.sort((a, b) => {
          const nameA = (a.name || '').toLowerCase();
          const nameB = (b.name || '').toLowerCase();
          if (nameA < nameB) return -1;
          if (nameA > nameB) return 1;
          return 0;
        });
        setClients(clientsData);
      },
      err => toastError(err.message)
    );
  };

  // Add / Edit client
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      if (editId) {
        await updateDoc(doc(db, 'clients', editId), { ...form, updatedAt: serverTimestamp() });
        success(`Client "${form.name}" updated successfully.`);
        setEditId(null);
      } else {
        await addDoc(collection(db, 'clients'), {
          ...form,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.uid,
          createdByEmail: user.email,
        });
        success(`Client "${form.name}" added successfully.`);
      }
      setForm({ name: '', email: '', phone: '', company: '' });
    } catch (err) {
      setFormError(err.message);
      toastError('Failed to save client. Please try again.');
    }
  };

  const handleEdit = (client) => {
    setForm({ name: client.name || '', email: client.email || '', phone: client.phone || '', company: client.company || '' });
    setEditId(client.id);
    info(`Editing "${client.name}".`);
  };

  const handleDelete = async (id) => {
    const client = clients.find(c => c.id === id);
    if (!window.confirm(`Delete "${client?.name}"?`)) return;
    try {
      await deleteDoc(doc(db, 'clients', id));
      success(`Client "${client?.name}" deleted.`);
    } catch (err) {
      toastError('Failed to delete client.');
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm({ name: '', email: '', phone: '', company: '' });
    info('Edit cancelled.');
  };

  // Loading splash
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show login form if not authenticated
  if (!user) {
    return <LoginForm onAuthSuccess={() => {}} />;
  }

  // Authenticated view (logout and user details removed)
  return (
    <>
      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in { animation: slide-in 0.25s ease-out both; }
      `}</style>

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6 lg:px-8 lg:py-8 max-w-[1600px] mx-auto">

          {/* Header - removed user details and logout button */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
              <div className="flex items-start gap-2.5 sm:gap-3 lg:gap-4">
                <div className="p-2 sm:p-2.5 lg:p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl sm:rounded-2xl shadow-lg flex-shrink-0">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 truncate">Client Management</h1>
                  <p className="text-slate-600 text-xs sm:text-sm lg:text-base mt-0.5 sm:mt-1">Manage your customer relationships</p>
                </div>
              </div>
              {/* No logout button or user email */}
            </div>
          </div>

          {/* Inline form error */}
          {formError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl mb-4 sm:mb-6 flex items-start gap-2 sm:gap-3 shadow-sm">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
              <span className="text-xs sm:text-sm font-medium">{formError}</span>
            </div>
          )}

          {/* Add/Edit Form */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 lg:p-6 mb-4 sm:mb-6 lg:mb-8">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5 lg:mb-6 pb-3 sm:pb-4 border-b border-slate-100">
              <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg flex-shrink-0">
                <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-800">
                {editId ? 'Edit Client' : 'Add New Client'}
              </h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5 mb-4 sm:mb-5 lg:mb-6">
                {[
                  { label: 'Full Name', key: 'name', type: 'text', icon: User, placeholder: 'John Doe', required: true },
                  { label: 'Email Address', key: 'email', type: 'email', icon: Mail, placeholder: 'john@example.com' },
                  { label: 'Phone Number', key: 'phone', type: 'tel', icon: Phone, placeholder: '+1 (555) 000-0000' },
                  { label: 'Company', key: 'company', type: 'text', icon: Building2, placeholder: 'Acme Inc.' },
                ].map(({ label, key, type, icon: Icon, placeholder, required }) => (
                  <div key={key}>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                      {label} {required && <span className="text-rose-500">*</span>}
                    </label>
                    <div className="relative">
                      <Icon className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                      <input
                        type={type}
                        placeholder={placeholder}
                        value={form[key]}
                        onChange={e => setForm({ ...form, [key]: e.target.value })}
                        className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                        required={required}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 sm:gap-2 transition-shadow"
                >
                  <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  {editId ? 'Update Client' : 'Add Client'}
                </button>
                {editId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Clients Table - removed "Created By" column */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-4 sm:p-5 lg:p-6 border-b border-slate-200">
              <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 sm:gap-3">
                <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-800">
                  All Clients ({clients.length})
                </h2>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-500 bg-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-md sm:rounded-lg border border-slate-200 w-fit">
                  TOTAL: {clients.length}
                </span>
              </div>
            </div>

            {/* Desktop table - removed "Created By" column */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {['Name', 'Email', 'Phone', 'Company', 'Actions'].map(h => (
                      <th key={h} className="px-4 lg:px-6 py-3 lg:py-4 text-left">
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clients.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <div className="p-4 bg-slate-50 rounded-full">
                            <Users className="w-12 h-12" />
                          </div>
                          <p className="text-lg font-medium text-slate-600">No clients yet</p>
                          <p className="text-sm text-slate-500">Add your first client to get started</p>
                        </div>
                      </td>
                    </tr>
                  ) : clients.map(client => (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <div className="flex items-center gap-2 lg:gap-3">
                          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center border border-blue-100 flex-shrink-0">
                            <span className="text-xs lg:text-sm font-semibold text-blue-600">{client.name?.charAt(0) || 'N'}</span>
                          </div>
                          <span className="font-bold text-slate-800 text-sm lg:text-base truncate">{client.name}</span>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-slate-600 text-sm font-bold truncate max-w-[200px]">{client.email || '—'}</td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-slate-600 text-sm font-bold">{client.phone || '—'}</td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-slate-600 text-sm font-bold truncate max-w-[150px]">{client.company || '—'}</td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEdit(client)} className="p-1.5 lg:p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" title="Edit">
                            <Edit className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          </button>
                          <button onClick={() => handleDelete(client.id)} className="p-1.5 lg:p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards - removed "Created by" line */}
            <div className="lg:hidden divide-y divide-slate-100">
              {clients.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <div className="p-3 bg-slate-50 rounded-full"><Users className="w-10 h-10" /></div>
                    <p className="text-base font-medium text-slate-600">No clients yet</p>
                    <p className="text-sm text-slate-500">Add your first client to get started</p>
                  </div>
                </div>
              ) : clients.map(client => (
                <div key={client.id} className="p-4 sm:p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center border border-blue-100 flex-shrink-0">
                        <span className="text-sm sm:text-base font-semibold text-blue-600">{client.name?.charAt(0) || 'N'}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-800 text-sm sm:text-base truncate">{client.name}</h3>
                        <p className="text-xs sm:text-sm text-slate-500 truncate">{client.company || 'No company'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2 mb-3">
                    {client.email && (
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {/* Created by line removed */}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(client)} className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors">
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => handleDelete(client.id)} className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}