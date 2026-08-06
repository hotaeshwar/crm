import { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, doc, onSnapshot, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus,
  Settings, X, Video, User, Mail, Briefcase,
  AlertCircle, CheckCircle2, Link as LinkIcon
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

const EVENT_TYPE_COLORS = {
  'Meeting': { bg: 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold', dot: 'bg-emerald-500' },
  'Shoot': { bg: 'bg-sky-50 border-sky-200 text-sky-700 font-bold', dot: 'bg-sky-500' },
  'Deadline': { bg: 'bg-rose-50 border-rose-200 text-rose-700 font-bold', dot: 'bg-rose-500' },
  'Payment Due': { bg: 'bg-amber-50 border-amber-200 text-amber-700 font-bold', dot: 'bg-amber-500' }
};

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function UnifiedCalendar() {
  const { toasts, removeToast, success, error: toastError } = useToast();

  const [currentDate, setCurrentDate] = useState(new Date(2026, 7, 1)); // Default starts on August 2026 matching screenshots
  const [localEvents, setLocalEvents] = useState([]);
  const [googleEventsList, setGoogleEventsList] = useState([]);
  const [googleSettings, setGoogleSettings] = useState(null);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Form states
  const [eventForm, setEventForm] = useState({
    title: '',
    type: 'Meeting',
    clientId: '',
    projectId: '',
    date: '',
    attendees: '',
    meetingLink: ''
  });
  const [settingsForm, setSettingsForm] = useState({
    clientId: '',
    clientSecret: ''
  });

  const [savingEvent, setSavingEvent] = useState(false);
  const [eventFormError, setEventFormError] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Listen to auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Listen to Firestore database (real-time snapshot updates)
  useEffect(() => {
    if (!user) return;

    const unsubEvents = onSnapshot(
      collection(db, 'calendar_events'),
      snap => {
        setLocalEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      err => toastError('Failed to fetch events: ' + err.message)
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'google_calendar'),
      snap => {
        if (snap.exists() && snap.data().clientId && snap.data().clientSecret) {
          setGoogleSettings(snap.data());
        } else {
          setGoogleSettings(null);
        }
      },
      err => console.warn('Failed to listen to calendar settings.')
    );

    const unsubClients = onSnapshot(
      collection(db, 'clients'),
      snap => {
        const clientsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        clientsData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setClients(clientsData);
      },
      err => toastError('Failed to fetch clients.')
    );

    const unsubProjects = onSnapshot(
      collection(db, 'projects'),
      snap => {
        setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      err => toastError('Failed to fetch projects.')
    );

    return () => {
      unsubEvents();
      unsubSettings();
      unsubClients();
      unsubProjects();
    };
  }, [user]);

  // Fetch events from Google Calendar REST API
  const fetchGoogleEvents = async (token) => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startOfMonth = new Date(year, month, 1).toISOString();
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      
      const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${startOfMonth}&timeMax=${endOfMonth}&singleEvents=true&orderBy=startTime`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          // Token is expired, remove it so user can reconnect
          await setDoc(doc(db, 'settings', 'google_calendar'), {
            ...googleSettings,
            accessToken: '',
            expiresAt: 0
          });
          setGoogleEventsList([]);
          return;
        }
        throw new Error('Google Calendar API returned status ' + res.status);
      }
      
      const data = await res.json();
      const googleEvents = (data.items || []).map(item => {
        const dateVal = item.start.dateTime || item.start.date || '';
        const dateStr = dateVal.split('T')[0];
        
        let type = 'Meeting';
        const titleLower = (item.summary || '').toLowerCase();
        if (titleLower.includes('shoot') || titleLower.includes('photoshoot') || titleLower.includes('video')) {
          type = 'Shoot';
        } else if (titleLower.includes('deadline') || titleLower.includes('due') || titleLower.includes('task')) {
          type = 'Deadline';
        } else if (titleLower.includes('pay') || titleLower.includes('invoice') || titleLower.includes('cost')) {
          type = 'Payment Due';
        }
        
        return {
          id: `google_${item.id}`,
          title: item.summary || '(No Summary)',
          type: type,
          date: dateStr,
          attendees: (item.attendees || []).map(a => a.email).join(', '),
          meetingLink: item.hangoutLink || item.htmlLink || '',
          isGoogleEvent: true
        };
      });
      
      setGoogleEventsList(googleEvents);
    } catch (err) {
      console.warn('Failed to fetch calendar events from Google API:', err);
    }
  };

  // Google OAuth API script loader
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
    return () => {
      const allScripts = document.getElementsByTagName('script');
      for (let s of allScripts) {
        if (s.src === 'https://accounts.google.com/gsi/client') {
          s.parentNode?.removeChild(s);
        }
      }
    };
  }, []);

  // Fetch Google events reactively when settings or viewed month changes
  useEffect(() => {
    if (googleSettings && googleSettings.accessToken) {
      if (googleSettings.expiresAt > Date.now()) {
        fetchGoogleEvents(googleSettings.accessToken);
      } else {
        setGoogleEventsList([]);
      }
    } else {
      setGoogleEventsList([]);
    }
  }, [googleSettings, currentDate]);

  // Compute combined calendar events
  const events = useMemo(() => {
    return [...localEvents, ...googleEventsList];
  }, [localEvents, googleEventsList]);

  // Google settings form loader
  useEffect(() => {
    if (showSettingsModal && user) {
      getDoc(doc(db, 'settings', 'google_calendar')).then(snap => {
        if (snap.exists()) {
          setSettingsForm({
            clientId: snap.data().clientId || '',
            clientSecret: snap.data().clientSecret || ''
          });
        }
      });
    }
  }, [showSettingsModal, user]);

  // When Client changes in add event form, auto-fill or append attendee email!
  const handleClientChangeInForm = (selectedClientId) => {
    const client = clients.find(c => c.id === selectedClientId);
    setEventForm(prev => {
      const emailToAdd = client?.email || '';
      // If there are existing attendees, check if email is already there
      let updatedAttendees = prev.attendees;
      if (emailToAdd) {
        if (!updatedAttendees.trim()) {
          updatedAttendees = emailToAdd;
        } else if (!updatedAttendees.includes(emailToAdd)) {
          updatedAttendees = `${updatedAttendees.trim()}, ${emailToAdd}`;
        }
      }
      return {
        ...prev,
        clientId: selectedClientId,
        attendees: updatedAttendees
      };
    });
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    setEventFormError('');
    setSavingEvent(true);

    if (!eventForm.title.trim()) {
      setEventFormError('Event Title is required.');
      setSavingEvent(false);
      return;
    }
    if (!eventForm.date) {
      setEventFormError('Event Date is required.');
      setSavingEvent(false);
      return;
    }

    try {
      const selectedClient = clients.find(c => c.id === eventForm.clientId);
      const selectedProject = projects.find(p => p.id === eventForm.projectId);

      await addDoc(collection(db, 'calendar_events'), {
        title: eventForm.title.trim(),
        type: eventForm.type,
        clientId: eventForm.clientId,
        clientName: selectedClient ? (selectedClient.company || selectedClient.name) : '',
        projectId: eventForm.projectId,
        projectName: selectedProject ? selectedProject.projectName : '',
        date: eventForm.date,
        attendees: eventForm.attendees.trim(),
        meetingLink: eventForm.meetingLink.trim(),
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        createdByEmail: user.email
      });

      success(`Event "${eventForm.title}" scheduled successfully.`);
      setShowAddEventModal(false);
      setEventForm({
        title: '',
        type: 'Meeting',
        clientId: '',
        projectId: '',
        date: '',
        attendees: '',
        meetingLink: ''
      });
    } catch (err) {
      setEventFormError(err.message);
      toastError('Failed to save calendar event.');
    } finally {
      setSavingEvent(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!settingsForm.clientId.trim()) {
      toastError('OAuth Client ID is required to connect.');
      return;
    }
    setSavingSettings(true);

    try {
      if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        toastError('Google Identity Services script is still loading. Please try again.');
        setSavingSettings(false);
        return;
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: settingsForm.clientId.trim(),
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            toastError('Google Authorization failed: ' + tokenResponse.error);
            setSavingSettings(false);
            return;
          }

          const accessToken = tokenResponse.access_token;
          const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);

          try {
            await setDoc(doc(db, 'settings', 'google_calendar'), {
              clientId: settingsForm.clientId.trim(),
              clientSecret: settingsForm.clientSecret.trim(),
              accessToken: accessToken,
              expiresAt: expiresAt,
              updatedAt: serverTimestamp(),
              updatedBy: user.uid
            });
            success('Google Calendar connected successfully!');
            setShowSettingsModal(false);
            fetchGoogleEvents(accessToken);
          } catch (err) {
            toastError('Failed to save settings: ' + err.message);
          } finally {
            setSavingSettings(false);
          }
        },
      });

      client.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      toastError('OAuth init error: ' + err.message);
      setSavingSettings(false);
    }
  };

  // Month Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthYearLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Grid Days Calculation
  const gridCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    
    // Padding from previous month
    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, dateStr: null });
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ day, dateStr });
    }

    // Complete grid to multiple of 7 (42 cells total)
    const totalSlots = 42;
    while (cells.length < totalSlots) {
      cells.push({ day: null, dateStr: null });
    }

    return cells;
  }, [year, month]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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
      `}</style>

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-3 py-4 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto space-y-6">

          {/* Header section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md text-white">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Unified Calendar</h1>
                <p className="text-slate-500 text-xs sm:text-sm font-semibold tracking-wider uppercase mt-0.5">Shoots, Deadlines, Meetings and Invoicing Schedules</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettingsModal(true)}
                className={`p-3 border rounded-xl shadow-sm cursor-pointer transition-colors relative ${
                  googleSettings 
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
                title={googleSettings ? 'Google Calendar Connected' : 'Google Calendar Settings'}
              >
                <Settings className="w-5 h-5" />
                {googleSettings && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                )}
              </button>
              <button
                onClick={() => setShowAddEventModal(true)}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md hover:shadow-lg cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" /> Add Event
              </button>
            </div>
          </div>

          {/* Calendar Box wrapper */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
            
            {/* Month title header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg sm:text-xl font-black text-slate-800">{monthYearLabel}</h2>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 p-1.5 rounded-xl">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-white text-slate-600 rounded-lg cursor-pointer shadow-sm transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-white text-slate-600 rounded-lg cursor-pointer shadow-sm transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Grid display */}
            <div className="grid grid-cols-7 gap-2">
              
              {/* Weekday headers */}
              {WEEKDAYS.map(day => (
                <div key={day} className="text-center py-2 text-xs font-bold text-slate-500 tracking-wider">
                  {day}
                </div>
              ))}

              {/* Grid cell list */}
              {gridCells.map((cell, index) => {
                const dayEvents = cell.dateStr ? events.filter(e => e.date === cell.dateStr) : [];
                return (
                  <div
                    key={index}
                    className={`min-h-[100px] border border-slate-100 rounded-xl p-2 flex flex-col space-y-1.5 transition-all
                      ${cell.day ? 'bg-white hover:bg-slate-50/50 border-slate-200/80 shadow-sm' : 'bg-slate-50/30 border-transparent'}
                    `}
                  >
                    {cell.day && (
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-extrabold text-slate-500 bg-slate-50 border border-slate-150 rounded px-1.5 py-0.5">
                          {cell.day}
                        </span>
                      </div>
                    )}
                    
                    {/* Events listed */}
                    <div className="flex-1 space-y-1 overflow-y-auto">
                      {dayEvents.map(event => {
                        const colors = EVENT_TYPE_COLORS[event.type] || EVENT_TYPE_COLORS['Meeting'];
                        return (
                          <div
                            key={event.id}
                            title={`${event.title} (${event.type})${event.clientName ? `\nClient: ${event.clientName}` : ''}${event.projectName ? `\nProject: ${event.projectName}` : ''}`}
                            className={`text-[9px] sm:text-[10px] p-1.5 rounded-lg border flex items-center gap-1 leading-tight truncate cursor-pointer transition-transform hover:scale-[1.02] ${colors.bg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                            <span className="truncate">{event.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

            </div>

          </div>

        </div>


      </div>

      {/* Schedule Calendar Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-slide-in">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">Schedule Calendar Event</h2>
                <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase mt-0.5">Unified Event Planner</p>
              </div>
              <button
                onClick={() => setShowAddEventModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Error */}
            {eventFormError && (
              <div className="bg-rose-50 border-b border-rose-100 text-rose-700 px-6 py-3 flex items-start gap-2 text-xs font-bold animate-pulse">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{eventFormError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAddEvent} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div>
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                  Event Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Autumn Clothing Shoot"
                  value={eventForm.title}
                  onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-700 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                    Event Type
                  </label>
                  <select
                    value={eventForm.type}
                    onChange={e => setEventForm({ ...eventForm, type: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-700 font-semibold"
                  >
                    <option value="Meeting">Meeting</option>
                    <option value="Shoot">Shoot</option>
                    <option value="Deadline">Deadline</option>
                    <option value="Payment Due">Payment Due</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                    Event Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-700 font-semibold"
                    required
                  />
                </div>
              </div>

              {/* Linked Client Selector */}
              <div>
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                  Linked Client <span className="text-slate-400 font-normal text-[10px] sm:text-xs">(Autopopulated)</span>
                </label>
                <select
                  value={eventForm.clientId}
                  onChange={e => handleClientChangeInForm(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-700 font-semibold"
                >
                  <option value="">No Client Linked</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.company || c.name}</option>
                  ))}
                </select>
              </div>

              {/* Linked Project Selector */}
              <div>
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                  Linked Project / Campaign
                </label>
                <select
                  value={eventForm.projectId}
                  onChange={e => setEventForm({ ...eventForm, projectId: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-700 font-semibold"
                >
                  <option value="">No Project Linked</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.projectName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                  Attendees (Comma separated emails)
                </label>
                <textarea
                  placeholder="e.g. simran@bidcrm.com, contact@client.com"
                  value={eventForm.attendees}
                  onChange={e => setEventForm({ ...eventForm, attendees: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-700 placeholder-slate-400 font-medium resize-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                  Meeting Link (Google Meet / Zoom)
                </label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/..."
                  value={eventForm.meetingLink}
                  onChange={e => setEventForm({ ...eventForm, meetingLink: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-700 placeholder-slate-400 font-medium"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEvent}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-60 cursor-pointer"
                >
                  {savingEvent ? 'Scheduling...' : 'Schedule Event'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Google Calendar Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-slide-in">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">Google Calendar Settings</h2>
                <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase mt-0.5">Google API Sync</p>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSettings} className="p-6 space-y-4">
              
              <p className="text-xs sm:text-sm font-bold text-slate-600 leading-relaxed">
                Enter Google API credentials to sync scheduled client meetings and content shoots to the BID CRM Google Workspace Calendar.
              </p>

              <div>
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                  OAuth Client ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 130125988840-web.apps.googleusercontent.com"
                  value={settingsForm.clientId}
                  onChange={e => setSettingsForm({ ...settingsForm, clientId: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-700 placeholder-slate-400 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                  OAuth Client Secret
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••••••••••••••••"
                  value={settingsForm.clientSecret}
                  onChange={e => setSettingsForm({ ...settingsForm, clientSecret: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-700 placeholder-slate-400 font-medium"
                />
              </div>

              <div className="text-[10px] text-slate-500 font-semibold bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1.5 leading-relaxed">
                <p className="text-amber-600 font-bold flex items-center gap-1">⚠️ OAuth Setup Requirements:</p>
                <p>1. In Google Cloud Console, add your redirect origin (e.g. <code className="text-indigo-600 font-bold bg-indigo-50 px-1 py-0.5 rounded">http://localhost:5173</code>) under <strong className="text-slate-700">"Authorized JavaScript Origins"</strong> in your Client ID settings.</p>
                <p>2. Enable the <strong className="text-slate-700">Google Calendar API</strong> in your Cloud Console API library.</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                {googleSettings && (
                  <button
                    type="button"
                    onClick={async () => {
                      setSavingSettings(true);
                      try {
                        await setDoc(doc(db, 'settings', 'google_calendar'), {
                          clientId: '',
                          clientSecret: '',
                          accessToken: '',
                          expiresAt: 0,
                          updatedAt: serverTimestamp(),
                          updatedBy: user.uid
                        });
                        setSettingsForm({ clientId: '', clientSecret: '' });
                        setGoogleEventsList([]);
                        success('Google Calendar disconnected.');
                        setShowSettingsModal(false);
                      } catch (err) {
                        toastError('Failed to disconnect.');
                      } finally {
                        setSavingSettings(false);
                      }
                    }}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl text-sm font-bold transition-colors cursor-pointer mr-auto"
                  >
                    Disconnect
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-60 cursor-pointer"
                >
                  {savingSettings ? 'Connecting...' : 'Connect Calendar'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}
    </>
  );
}
