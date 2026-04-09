import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileText, Wallet, Menu, X, BookOpen } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ClientManagement from './components/Clientmanagement';
import InvoiceManagement from './components/Invoicemanagement';
import PaymentTracking from './components/Paymenttracking';
import Ledger from './components/Ledger';

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

function FlashScreen() {
  return (
    <>
      <style>{FLASH_STYLES}</style>

      <div
        className="bid-bg fixed inset-0 flex items-center justify-center overflow-hidden z-[9999]"
        style={{ background: 'linear-gradient(135deg,#fdf8f0 0%,#f5edff 55%,#fdf4ff 100%)' }}
      >
        {/* Dot-grid */}
        <div
          className="bid-grid absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(139,92,246,.14) 1px,transparent 1px),
              linear-gradient(90deg,rgba(139,92,246,.14) 1px,transparent 1px)`,
            backgroundSize: '52px 52px'
          }}
        />

        {/* Scan line */}
        <div
          className="bid-scan absolute left-0 right-0 pointer-events-none"
          style={{ height:2, background:'linear-gradient(90deg,transparent,rgba(139,92,246,.5),transparent)', zIndex:1 }}
        />

        {/* Ambient orbs */}
        <div className="bid-orb1 absolute pointer-events-none rounded-full"
          style={{ width:500, height:500, top:'-110px', left:'-130px',
            background:'radial-gradient(circle,rgba(99,102,241,.30) 0%,transparent 70%)', filter:'blur(55px)' }} />
        <div className="bid-orb2 absolute pointer-events-none rounded-full"
          style={{ width:420, height:420, bottom:'-90px', right:'-100px',
            background:'radial-gradient(circle,rgba(168,85,247,.25) 0%,transparent 70%)', filter:'blur(50px)' }} />
        <div className="bid-orb3 absolute pointer-events-none rounded-full"
          style={{ width:300, height:300, bottom:'16%', left:'10%',
            background:'radial-gradient(circle,rgba(236,72,153,.18) 0%,transparent 70%)', filter:'blur(40px)' }} />

        {/* Pulsing rings — centred */}
        <div className="absolute" style={{ top:'50%', left:'50%', transform:'translate(-50%,-50%)' }}>
          {['bid-ring','bid-ring2','bid-ring3'].map(cls => (
            <div key={cls} className={`${cls} absolute rounded-full`}
              style={{ width:260, height:260, marginLeft:-130, marginTop:-130,
                border:'1.5px solid rgba(139,92,246,.30)' }} />
          ))}
        </div>

        {/* ── Main content ── */}
        <div className="relative flex flex-col items-center text-center px-6 z-10" style={{ maxWidth:560 }}>

          {/* ── LOGO ── */}
          <div className="bid-logo relative mb-5 sm:mb-7 flex items-center justify-center">

            {/* Outer soft halo */}
            <div
              className="bid-halo absolute rounded-full pointer-events-none"
              style={{
                width:'clamp(220px,38vw,320px)',
                height:'clamp(220px,38vw,320px)',
                background:'radial-gradient(circle, rgba(139,92,246,.30) 0%, rgba(99,102,241,.12) 40%, transparent 70%)',
                filter:'blur(30px)',
                top:'50%', left:'50%', transform:'translate(-50%,-50%)'
              }}
            />

            {/* Mid glow ring */}
            <div
              className="bid-logobg absolute rounded-full pointer-events-none"
              style={{
                width:'clamp(170px,30vw,250px)',
                height:'clamp(170px,30vw,250px)',
                background:'radial-gradient(circle, rgba(255,255,255,0.60) 0%, rgba(139,92,246,0.15) 45%, transparent 70%)',
                top:'50%', left:'50%', transform:'translate(-50%,-50%)'
              }}
            />

            {/* Logo plate */}
            <div
              className="bid-logo-plate bid-logoglow relative z-10 flex items-center justify-center"
              style={{
                width:'clamp(140px,24vw,210px)',
                height:'clamp(140px,24vw,210px)',
                background:'radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(245,240,255,0.60) 60%, transparent 80%)',
                borderRadius:'999px',
                padding: 'clamp(14px,2.5vw,22px)'
              }}
            >
              <img
                src="/images/LOGO.png"
                alt="BID Logo"
                style={{
                  width:'100%',
                  height:'100%',
                  objectFit:'contain',
                  filter:'drop-shadow(0 0 12px rgba(139,92,246,0.5)) drop-shadow(0 0 30px rgba(99,102,241,0.35)) brightness(1.05) contrast(1.05)',
                  display:'block'
                }}
              />
            </div>
          </div>

          {/* Title */}
          <h1
            className="bid-title"
            style={{
              fontFamily:"'Syne',sans-serif",
              fontSize:'clamp(2rem,5.8vw,3.6rem)',
              fontWeight:800,
              letterSpacing:'-0.02em',
              lineHeight:1.05,
              background:'linear-gradient(135deg,#4f46e5 0%,#7c3aed 38%,#a21caf 72%,#6366f1 100%)',
              WebkitBackgroundClip:'text', backgroundClip:'text',
              WebkitTextFillColor:'transparent',
              marginBottom:'0.4rem'
            }}
          >
            CRM Accounting
          </h1>

          {/* Tagline */}
          <p
            className="bid-tagline"
            style={{
              fontFamily:"'DM Sans',sans-serif",
              fontSize:'clamp(0.62rem,1.8vw,0.82rem)',
              color:'rgba(109,40,217,.65)',
              fontWeight:300,
              letterSpacing:'0.24em',
              textTransform:'uppercase',
              marginBottom:'2.2rem'
            }}
          >
            Business Intelligence Dashboard
          </p>

          {/* Progress + dots + label */}
          <div className="bid-barwrap w-full" style={{ maxWidth:360 }}>

            {/* Progress track */}
            <div style={{
              height:3, borderRadius:99,
              background:'rgba(139,92,246,.15)',
              overflow:'hidden', marginBottom:'1rem',
              boxShadow:'inset 0 0 0 1px rgba(139,92,246,.25)'
            }}>
              <div
                className="bid-fill"
                style={{
                  height:'100%', borderRadius:99,
                  background:'linear-gradient(90deg,#6366f1,#a855f7,#ec4899)',
                  boxShadow:'0 0 18px rgba(168,85,247,.5)'
                }}
              />
            </div>

            {/* Audio-visualiser bars */}
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:4, height:24, marginBottom:10 }}>
              {[16,24,18,30,20,26,14].map((h,i) => (
                <span key={i} className="bid-dot" style={{ width:3, height:h }} />
              ))}
            </div>

            {/* Shimmer label */}
            <p
              className="bid-launch bid-shimmer"
              style={{
                fontFamily:"'DM Sans',sans-serif",
                fontSize:'clamp(0.55rem,1.6vw,0.68rem)',
                fontWeight:400,
                letterSpacing:'0.38em',
                textTransform:'uppercase'
              }}
            >
              Initialising Systems
            </p>
          </div>
        </div>

        {/* Corner version badge */}
        <div
          className="bid-tagline absolute bottom-4 right-5"
          style={{
            fontFamily:"'DM Sans',sans-serif",
            fontSize:'0.58rem',
            letterSpacing:'0.16em',
            color:'rgba(109,40,217,.50)',
            textTransform:'uppercase'
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
  const [activeTab, setActiveTab] = useState('clients');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFlash, setShowFlash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowFlash(false), 3800);
    return () => clearTimeout(t);
  }, []);

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', component: Dashboard,         icon: LayoutDashboard },
    { id: 'clients',   name: 'Clients',   component: ClientManagement,  icon: Users },
    { id: 'invoices',  name: 'Invoices',  component: InvoiceManagement, icon: FileText },
    { id: 'payments',  name: 'Payments',  component: PaymentTracking,   icon: Wallet },
    { id: 'ledger',    name: 'Ledger',    component: Ledger,            icon: BookOpen }
  ];

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || Dashboard;

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  if (showFlash) return <FlashScreen />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-lg">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 2xl:max-w-[1920px] 2xl:mx-auto">
          <div className="flex items-center justify-between h-14 sm:h-16 md:h-18 lg:h-20">

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

            {/* Desktop pills */}
            <div className="hidden lg:flex items-center gap-2 xl:gap-3 bg-slate-100 p-1.5 xl:p-2 rounded-full">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`px-4 xl:px-6 py-2 xl:py-2.5 rounded-full flex items-center gap-2 xl:gap-2.5 font-semibold text-sm xl:text-base whitespace-nowrap transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white shadow-lg'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-md'
                    }`}
                  >
                    <Icon className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Tablet icons */}
            <div className="hidden md:flex lg:hidden items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`px-3 py-2 rounded-xl flex flex-col items-center gap-1 font-semibold text-[10px] min-w-[60px] transition-all ${
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

            {/* Mobile burger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl flex-shrink-0"
            >
              {mobileMenuOpen
                ? <X    className="w-5 h-5 sm:w-6 sm:h-6" />
                : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
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
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="w-full">
        <ActiveComponent />
      </main>
    </div>
  );
}

export default App;