import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileText, Wallet, Menu, X } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ClientManagement from './components/Clientmanagement';
import InvoiceManagement from './components/Invoicemanagement';
import PaymentTracking from './components/Paymenttracking';

function App() {
  const [activeTab, setActiveTab] = useState('clients');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showFlash, setShowFlash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFlash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', component: Dashboard, icon: LayoutDashboard },
    { id: 'clients', name: 'Clients', component: ClientManagement, icon: Users },
    { id: 'invoices', name: 'Invoices', component: InvoiceManagement, icon: FileText },
    { id: 'payments', name: 'Payments', component: PaymentTracking, icon: Wallet }
  ];

  const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || Dashboard;

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  if (showFlash) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-[9999]">
        <div className="text-center">
          <div className="mb-8 sm:mb-12">
            <img 
              src="/images/LOGO.png" 
              alt="BID Logo" 
              className="h-64 w-64 sm:h-80 sm:w-80 md:h-96 md:w-96 lg:h-[500px] lg:w-[500px] mx-auto object-contain drop-shadow-2xl"
            />
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4 sm:mb-6 tracking-tight">
            CRM
          </h1>
          <div className="flex items-center justify-center gap-3 sm:gap-4">
            <div className="h-3 w-3 sm:h-4 sm:w-4 bg-indigo-600 rounded-full opacity-75"></div>
            <div className="h-3 w-3 sm:h-4 sm:w-4 bg-purple-600 rounded-full opacity-75"></div>
            <div className="h-3 w-3 sm:h-4 sm:w-4 bg-pink-600 rounded-full opacity-75"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation - Ultra Responsive */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-lg">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 2xl:max-w-[1920px] 2xl:mx-auto">
          <div className="flex items-center justify-between h-14 sm:h-16 md:h-18 lg:h-20">
            {/* Logo Section - Responsive */}
            <div className="flex items-center gap-3 sm:gap-4 md:gap-5 lg:gap-6 flex-shrink-0">
              <img 
                src="/images/LOGO.png" 
                alt="BID Logo" 
                className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 xl:h-28 xl:w-28 object-contain"
              />
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-none">
                  CRM
                </h1>
                <p className="hidden sm:block text-[10px] md:text-xs lg:text-sm text-slate-500 font-medium mt-0.5 md:mt-1">Business Intelligence Dashboard</p>
              </div>
            </div>

            {/* Desktop Navigation - Horizontal Pills */}
            <div className="hidden lg:flex items-center gap-2 xl:gap-3 bg-slate-100 p-1.5 xl:p-2 rounded-full">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`px-4 xl:px-6 py-2 xl:py-2.5 rounded-full flex items-center gap-2 xl:gap-2.5 font-semibold text-sm xl:text-base whitespace-nowrap ${
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

            {/* Tablet Navigation - Icon + Text */}
            <div className="hidden md:flex lg:hidden items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`px-3 py-2 rounded-xl flex flex-col items-center gap-1 font-semibold text-[10px] min-w-[60px] ${
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

            {/* Mobile Menu Button - Gradient */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden relative p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl flex-shrink-0"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              ) : (
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              )}
            </button>
          </div>

          {/* Mobile Navigation - Full Width Cards */}
          {mobileMenuOpen && (
            <div className="md:hidden py-3 sm:py-4 border-t border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50">
              <div className="space-y-2">
                {tabs.map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.id)}
                      className={`w-full px-4 py-3 sm:py-4 rounded-xl sm:rounded-2xl flex items-center justify-between font-bold text-sm sm:text-base ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 text-white shadow-xl border-2 border-white'
                          : 'bg-white text-slate-700 hover:bg-slate-50 border-2 border-slate-200 shadow-md'
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className={`p-2 sm:p-2.5 rounded-lg ${
                          activeTab === tab.id 
                            ? 'bg-white/20' 
                            : 'bg-gradient-to-br from-indigo-100 to-purple-100'
                        }`}>
                          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${
                            activeTab === tab.id ? 'text-white' : 'text-indigo-600'
                          }`} />
                        </div>
                        <span>{tab.name}</span>
                      </div>
                      {activeTab === tab.id && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </nav>
      
      {/* Main Content - Responsive Container */}
      <main className="w-full">
        <ActiveComponent />
      </main>

      {/* Footer section completely removed as requested */}
    </div>
  );
}

export default App;