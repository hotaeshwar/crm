import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileText, Wallet, Menu, X, BookOpen, Megaphone, LogOut, UserCircle, ExternalLink } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

import Dashboard          from './components/Dashboard';
import ClientManagement   from './components/Clientmanagement';
import InvoiceManagement  from './components/Invoicemanagement';
import PaymentTracking    from './components/Paymenttracking';
import Ledger             from './components/Ledger';
import ClientAdManagement from './components/ProjectManagement';
import LoginForm          from './components/Loginform';

/* ═══════════════════════════════════════════
   FLASH SCREEN STYLES
═══════════════════════════════════════════ */
const FLASH_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400&display=swap');

  @keyframes bid-fadeIn {
    from { opacity:0; } to { opacity:1; }
  }
  @keyframes bid-fadeInUp {
    from { opacity:0; transform:translateY(28px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes bid-logoEntry {
    0%   { opacity:0; transform:scale(0.5) translateY(-20px); filter:blur(20px) brightness(0); }
    50%  { opacity:0.8; transform:scale(1.08) translateY(0px); filter:blur(2px) brightness(1.6); }
    75%  { opacity:1; transform:scale(0.97) translateY(0px); filter:blur(0) brightness(1.2); }
    100% { opacity:1; transform:scale(1) translateY(0px); filter:blur(0) brightness(1); }
  }
  @keyframes bid-progress {
    0%   { width:0%; }
    12%  { width:15%; }
    38%  { width:44%; }
    68%  { width:71%; }
    88%  { width:89%; }
    100% { width:100%; }
  }
  @keyframes bid-shimmer {
    0%   { background-position:-500px 0; }
    100% { background-position: 500px 0; }
  }
  @keyframes bid-orb1 {
    0%,100% { transform:translateY(0) scale(1); }
    50%      { transform:translateY(-22px) scale(1.05); }
  }
  @keyframes bid-orb2 {
    0%,100% { transform:translateY(0) scale(1); }
    50%      { transform:translateY(-15px) scale(1.03); }
  }
  @keyframes bid-grid {
    0%,100% { opacity:0.08; }
    50%      { opacity:0.18; }
  }
  @keyframes bid-ring {
    0%   { transform:scale(0.6); opacity:0.6; }
    100% { transform:scale(2.6); opacity:0; }
  }
  @keyframes bid-scan {
    0%   { top:-3px; }
    100% { top:100%; }
  }
  @keyframes bid-bar {
    0%,80%,100% { transform:scaleY(0.3); opacity:0.25; }
    40%          { transform:scaleY(1);   opacity:1; }
  }
  @keyframes bid-logoGlow {
    0%,100% { box-shadow: 0 0 60px 20px rgba(139,92,246,0.25), 0 0 120px 40px rgba(99,102,241,0.15); }
    50%      { box-shadow: 0 0 80px 30px rgba(168,85,247,0.40), 0 0 160px 60px rgba(139,92,246,0.22); }
  }
  @keyframes bid-halo {
    0%,100% { opacity:0.4; transform:scale(1); }
    50%      { opacity:0.70; transform:scale(1.08); }
  }
  @keyframes bid-logoBg {
    0%,100% { opacity:0.6; }
    50%      { opacity:0.9; }
  }

  .bid-logo     { animation: bid-logoEntry  1.0s cubic-bezier(.22,1,.36,1) 0.25s both; }
  .bid-title    { animation: bid-fadeInUp   0.70s cubic-bezier(.22,1,.36,1) 1.1s both; }
  .bid-tagline  { animation: bid-fadeIn     0.60s ease 1.70s both; }
  .bid-barwrap  { animation: bid-fadeIn     0.40s ease 1.95s both; }
  .bid-fill     { animation: bid-progress   1.55s cubic-bezier(.4,0,.2,1) 2.05s both; width:0; }
  .bid-launch   { animation: bid-fadeIn     0.50s ease 3.35s both; opacity:0; }
  .bid-bg       { animation: bid-fadeIn     0.45s ease 0s both; }
  .bid-grid     { animation: bid-grid       3.2s ease-in-out 0s infinite; }
  .bid-orb1     { animation: bid-orb1       5.0s ease-in-out 0s infinite; }
  .bid-orb2     { animation: bid-orb2       6.5s ease-in-out 1.3s infinite; }
  .bid-orb3     { animation: bid-orb2       7.2s ease-in-out 2.7s infinite; }
  .bid-ring     { animation: bid-ring       2.6s ease-out 0s infinite; }
  .bid-ring2    { animation: bid-ring       2.6s ease-out 0.87s infinite; }
  .bid-ring3    { animation: bid-ring       2.6s ease-out 1.74s infinite; }
  .bid-scan     { animation: bid-scan       3.0s linear 0.6s infinite; }
  .bid-logoglow { animation: bid-logoGlow   2.5s ease-in-out 1.2s infinite; }
  .bid-halo     { animation: bid-halo       2.8s ease-in-out 1.0s infinite; }
  .bid-logobg   { animation: bid-logoBg     2.0s ease-in-out 1.2s infinite; }

  .bid-shimmer {
    background: linear-gradient(90deg,
      rgba(79,70,229,0.3)  0%,
      rgba(124,58,237,1.0) 45%,
      rgba(79,70,229,0.3)  90%);
    background-size: 500px 100%;
    -webkit-background-clip:text; background-clip:text;
    -webkit-text-fill-color:transparent;
    animation: bid-shimmer 1.6s linear 3.35s infinite;
  }

  .bid-dot {
    display:inline-block; border-radius:2px;
    background:rgba(109,40,217,0.65);
    animation: bid-bar 1.1s ease-in-out infinite;
  }
  .bid-dot:nth-child(2){ animation-delay:0.14s; }
  .bid-dot:nth-child(3){ animation-delay:0.28s; }
  .bid-dot:nth-child(4){ animation-delay:0.42s; }
  .bid-dot:nth-child(5){ animation-delay:0.56s; }
  .bid-dot:nth-child(6){ animation-delay:0.70s; }
  .bid-dot:nth-child(7){ animation-delay:0.84s; }

  .bid-logo-plate {
    border-radius: 999px;
    background: radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.05) 55%, transparent 75%);
    padding: 18px;
  }
`;

/* ═══════════════════════════════════════════
   FLASH SCREEN
═══════════════════════════════════════════ */
function FlashScreen() {
  return (
    <>
      <style>{FLASH_STYLES}</style>
      <div
        className="bid-bg fixed inset-0 flex items-center justify-center overflow-hidden z-[9999]"
        style={{ background: 'linear-gradient(135deg,#fdf8f0 0%,#f5edff 55%,#fdf4ff 100%)' }}
      >
        <div className="bid-grid absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(139,92,246,.14) 1px,transparent 1px),
              linear-gradient(90deg,rgba(139,92,246,.14) 1px,transparent 1px)`,
            backgroundSize: '52px 52px'
          }}
        />
        <div className="bid-scan absolute left-0 right-0 pointer-events-none"
          style={{ height:2, background:'linear-gradient(90deg,transparent,rgba(139,92,246,.5),transparent)', zIndex:1 }}
        />
        <div className="bid-orb1 absolute pointer-events-none rounded-full"
          style={{ width:500, height:500, top:'-110px', left:'-130px',
            background:'radial-gradient(circle,rgba(99,102,241,.30) 0%,transparent 70%)', filter:'blur(55px)' }} />
        <div className="bid-orb2 absolute pointer-events-none rounded-full"
          style={{ width:420, height:420, bottom:'-90px', right:'-100px',
            background:'radial-gradient(circle,rgba(168,85,247,.25) 0%,transparent 70%)', filter:'blur(50px)' }} />
        <div className="bid-orb3 absolute pointer-events-none rounded-full"
          style={{ width:300, height:300, bottom:'16%', left:'10%',
            background:'radial-gradient(circle,rgba(236,72,153,.18) 0%,transparent 70%)', filter:'blur(40px)' }} />

        <div className="absolute" style={{ top:'50%', left:'50%', transform:'translate(-50%,-50%)' }}>
          {['bid-ring','bid-ring2','bid-ring3'].map(cls => (
            <div key={cls} className={`${cls} absolute rounded-full`}
              style={{ width:260, height:260, marginLeft:-130, marginTop:-130,
                border:'1.5px solid rgba(139,92,246,.30)' }} />
          ))}
        </div>

        <div className="relative flex flex-col items-center text-center px-6 z-10" style={{ maxWidth:560 }}>
          <div className="bid-logo relative mb-5 sm:mb-7 flex items-center justify-center">
            <div className="bid-halo absolute rounded-full pointer-events-none"
              style={{
                width:'clamp(220px,38vw,320px)', height:'clamp(220px,38vw,320px)',
                background:'radial-gradient(circle, rgba(139,92,246,.30) 0%, rgba(99,102,241,.12) 40%, transparent 70%)',
                filter:'blur(30px)', top:'50%', left:'50%', transform:'translate(-50%,-50%)'
              }}
            />
            <div className="bid-logobg absolute rounded-full pointer-events-none"
              style={{
                width:'clamp(170px,30vw,250px)', height:'clamp(170px,30vw,250px)',
                background:'radial-gradient(circle, rgba(255,255,255,0.60) 0%, rgba(139,92,246,0.15) 45%, transparent 70%)',
                top:'50%', left:'50%', transform:'translate(-50%,-50%)'
              }}
            />
            <div className="bid-logo-plate bid-logoglow relative z-10 flex items-center justify-center"
              style={{
                width:'clamp(140px,24vw,210px)', height:'clamp(140px,24vw,210px)',
                background:'radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(245,240,255,0.60) 60%, transparent 80%)',
                borderRadius:'999px', padding:'clamp(14px,2.5vw,22px)'
              }}
            >
              <img src="/images/LOGO.png" alt="BID Logo"
                style={{
                  width:'100%', height:'100%', objectFit:'contain',
                  filter:'drop-shadow(0 0 12px rgba(139,92,246,0.5)) drop-shadow(0 0 30px rgba(99,102,241,0.35)) brightness(1.05) contrast(1.05)',
                  display:'block'
                }}
              />
            </div>
          </div>

          <h1 className="bid-title"
            style={{
              fontFamily:"'Syne',sans-serif",
              fontSize:'clamp(2rem,5.8vw,3.6rem)',
              fontWeight:800, letterSpacing:'-0.02em', lineHeight:1.05,
              background:'linear-gradient(135deg,#4f46e5 0%,#7c3aed 38%,#a21caf 72%,#6366f1 100%)',
              WebkitBackgroundClip:'text', backgroundClip:'text',
              WebkitTextFillColor:'transparent', marginBottom:'0.4rem'
            }}
          >
            CRM Accounting
          </h1>

          <p className="bid-tagline"
            style={{
              fontFamily:"'DM Sans',sans-serif",
              fontSize:'clamp(0.62rem,1.8vw,0.82rem)',
              color:'rgba(109,40,217,.65)', fontWeight:300,
              letterSpacing:'0.24em', textTransform:'uppercase', marginBottom:'2.2rem'
            }}
          >
            Business Intelligence Dashboard
          </p>

          <div className="bid-barwrap w-full" style={{ maxWidth:360 }}>
            <div style={{
              height:3, borderRadius:99, background:'rgba(139,92,246,.15)',
              overflow:'hidden', marginBottom:'1rem',
              boxShadow:'inset 0 0 0 1px rgba(139,92,246,.25)'
            }}>
              <div className="bid-fill"
                style={{
                  height:'100%', borderRadius:99,
                  background:'linear-gradient(90deg,#6366f1,#a855f7,#ec4899)',
                  boxShadow:'0 0 18px rgba(168,85,247,.5)'
                }}
              />
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:4, height:24, marginBottom:10 }}>
              {[16,24,18,30,20,26,14].map((h,i) => (
                <span key={i} className="bid-dot" style={{ width:3, height:h }} />
              ))}
            </div>
            <p className="bid-launch bid-shimmer"
              style={{
                fontFamily:"'DM Sans',sans-serif",
                fontSize:'clamp(0.55rem,1.6vw,0.68rem)',
                fontWeight:400, letterSpacing:'0.38em', textTransform:'uppercase'
              }}
            >
              Initialising Systems
            </p>
          </div>
        </div>

        <div className="bid-tagline absolute bottom-4 right-5"
          style={{
            fontFamily:"'DM Sans',sans-serif", fontSize:'0.58rem',
            letterSpacing:'0.16em', color:'rgba(109,40,217,.50)', textTransform:'uppercase'
          }}
        >
          v2.0 · 2026
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════ */
function App() {
  const [activeTab, setActiveTab]       = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [showFlash, setShowFlash]       = useState(true);
  const [user, setUser]                 = useState(null);
  const [authLoading, setAuthLoading]   = useState(true); // prevents flicker

  // ── Flash timer ──
  useEffect(() => {
    const t = setTimeout(() => setShowFlash(false), 3800);
    return () => clearTimeout(t);
  }, []);

  // ── Firebase auth listener ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const tabs = [
    { id: 'dashboard', name: 'Dashboard',    component: Dashboard,          icon: LayoutDashboard },
    { id: 'clients',   name: 'Clients',      component: ClientManagement,   icon: Users           },
    { id: 'campaigns', name: 'Ad Campaigns', component: ClientAdManagement, icon: Megaphone       },
    { id: 'invoices',  name: 'Invoices',     component: InvoiceManagement,  icon: FileText        },
    { id: 'payments',  name: 'Payments',     component: PaymentTracking,    icon: Wallet          },
    { id: 'ledger',    name: 'Ledger',       component: Ledger,             icon: BookOpen        },
  ];

  const externalLinks = [
    { id: 'workallocater', name: 'Work Allocater', url: 'https://workallocater.buildingindiadigital.com/', icon: LayoutDashboard },
    { id: 'accounts',      name: 'Accounts',      url: 'https://accounts.buildingindiadigital.com/',      icon: Users },
    { id: 'posting',       name: 'Posting',       url: 'https://posting.buildingindiadigital.com/',       icon: FileText },
  ];

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || Dashboard;

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await auth.signOut();
    setActiveTab('dashboard');
    setMobileMenuOpen(false);
  };

  // 1️⃣ Flash screen (always shown on first load regardless of auth)
  if (showFlash) return <FlashScreen />;

  // 2️⃣ Waiting for Firebase to resolve auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 3️⃣ Not logged in → show login page (no nav, no tabs)
  if (!user) {
    return <LoginForm onAuthSuccess={() => setActiveTab('dashboard')} />;
  }

  // 4️⃣ Logged in → full app with nav
  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 transition-all duration-300 ${sidebarOpen ? 'lg:pl-72' : 'lg:pl-20'}`}>

      {/* ── Navigation ── */}
      <nav
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
        className={`bg-white border-b border-slate-200 sticky top-0 z-50 shadow-lg transition-all duration-300 lg:fixed lg:inset-y-0 lg:left-0 lg:border-r lg:border-b-0 ${sidebarOpen ? 'lg:w-72' : 'lg:w-20'}`}
      >
        <div className="lg:hidden w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 2xl:max-w-[1920px] 2xl:mx-auto">
          <div className="flex items-center justify-between h-14 sm:h-16 md:h-18 lg:h-20 gap-2 xl:gap-4">

            {/* Logo */}
            <div className="flex items-center gap-3 sm:gap-4 md:gap-5 lg:gap-6 flex-shrink-0">
              <img
                src="/images/LOGO.png"
                alt="BID Logo"
                className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 xl:h-28 xl:w-28 object-contain"
              />
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-none">
                  CRM Accounting
                </h1>
                <p className="hidden sm:block text-[10px] md:text-xs lg:text-sm text-slate-500 font-medium mt-0.5 md:mt-1">
                  Business Intelligence Dashboard
                </p>
              </div>
            </div>

            {/* Tablet / Mobile controls */}
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        className={`px-3 py-2 rounded-xl flex flex-col items-center gap-1 font-semibold text-[10px] min-w-[56px] transition-all ${
                          activeTab === tab.id
                            ? 'bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white shadow-lg'
                            : 'text-slate-600 hover:bg-white hover:text-slate-900'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className="leading-tight">{tab.name}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col items-center gap-0.5 pl-2 border-l border-slate-200">
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 rounded-lg max-w-[90px]">
                    <UserCircle className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                    <span className="text-[8px] font-semibold text-slate-600 truncate">{user.email}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[9px] font-semibold border border-rose-200 transition-colors w-full justify-center"
                  >
                    <LogOut className="w-2.5 h-2.5" />
                    Logout
                  </button>
                </div>
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl flex-shrink-0"
              >
                {mobileMenuOpen
                  ? <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden py-3 sm:py-4 border-t border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50">
              <div className="space-y-2">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      className={`w-full px-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl flex items-center justify-between font-bold text-sm sm:text-base transition-all ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white shadow-xl border-2 border-white'
                          : 'bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200 shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className={`p-2 sm:p-2.5 rounded-lg ${
                          activeTab === tab.id ? 'bg-white/20' : 'bg-gradient-to-br from-indigo-100 to-purple-100'
                        }`}>
                          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${
                            activeTab === tab.id ? 'text-white' : 'text-indigo-600'
                          }`} />
                        </div>
                        <span>{tab.name}</span>
                      </div>
                      {activeTab === tab.id && <div className="w-2 h-2 bg-white rounded-full" />}
                    </button>
                  );
                })}
                {externalLinks.map(link => {
                  const Icon = link.icon;
                  return (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group w-full px-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl flex items-center gap-3 font-bold text-sm sm:text-base transition-all bg-white text-slate-700 border-2 border-slate-200 shadow-md hover:bg-gradient-to-r hover:from-indigo-500 hover:via-purple-600 hover:to-pink-500 hover:text-white hover:shadow-lg"
                    >
                      <div className="p-2 sm:p-2.5 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 group-hover:bg-white/20 transition-colors">
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 group-hover:text-white" />
                      </div>
                      <span>{link.name}</span>
                    </a>
                  );
                })}

                <div className="border-t border-slate-200 pt-2 mt-1 space-y-2">
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <UserCircle className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-700 truncate">{user.email}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border-2 border-rose-200 font-bold text-sm transition-colors shadow-sm"
                  >
                    <div className="p-2 bg-rose-100 rounded-lg">
                      <LogOut className="w-5 h-5 text-rose-600" />
                    </div>
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:flex lg:flex-col lg:h-full lg:overflow-hidden">
          <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  title={tab.name}
                  className={`w-full flex items-center ${sidebarOpen ? 'justify-start' : 'justify-center'} gap-3 rounded-2xl px-3 py-3 font-semibold text-sm transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white shadow-lg'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="p-2 rounded-lg transition-colors">
                    <Icon className="w-5 h-5 flex-shrink-0 text-indigo-600" />
                  </div>
                  <span className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>{tab.name}</span>
                </button>
              );
            })}
            {externalLinks.map(link => {
              const Icon = link.icon;
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  title={link.name}
                  className={`group w-full flex items-center ${sidebarOpen ? 'justify-start' : 'justify-center'} gap-3 rounded-2xl px-3 py-3 transition-all bg-white text-slate-700 border-2 border-slate-200 shadow-md hover:bg-gradient-to-r hover:from-indigo-500 hover:via-purple-600 hover:to-pink-500 hover:text-white hover:shadow-lg`}
                >
                  <div className="p-2 sm:p-2.5 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 group-hover:bg-white/20 transition-colors">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 group-hover:text-white" />
                  </div>
                  <span className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>{link.name}</span>
                </a>
              );
            })}
          </div>

          <div className="px-2 pb-4">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 transition-all">
              <UserCircle className="w-5 h-5 text-indigo-600 flex-shrink-0" />
              <div className={`min-w-0 overflow-hidden transition-all duration-200 ${sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
                <p className="text-sm font-semibold text-slate-900 truncate">{user.email}</p>
                <p className="text-xs text-slate-500">Signed in</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className={`transition-all duration-200 ${sidebarOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Page content ── */}
      <main className="w-full">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-6 lg:py-8">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-2xl bg-indigo-50 ring-1 ring-slate-200 flex items-center justify-center shadow-sm">
              <img src="/images/LOGO.png" alt="BID Logo" className="h-16 w-16 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900">CRM Accounting</h1>
              <p className="text-sm text-slate-500">Business Intelligence Dashboard</p>
            </div>
          </div>
        </div>
        <ActiveComponent />
      </main>
    </div>
  );
}

export default App;