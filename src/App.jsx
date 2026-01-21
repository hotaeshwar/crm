import { useState } from 'react';
import { LayoutDashboard, Users, FileText, Wallet, Menu, X } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ClientManagement from './components/Clientmanagement';
import InvoiceManagement from './components/Invoicemanagement';
import PaymentTracking from './components/Paymenttracking';

function App() {
  // Change 'dashboard' to 'clients' to show Client Management by default
  const [activeTab, setActiveTab] = useState('clients');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navigation */}
      <nav className="bg-white shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img 
                src="/images/LOGO.png" 
                alt="BID Logo" 
                className="h-10 w-auto object-contain"
              />
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                BID CRM
              </h1>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 font-medium ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden lg:inline">{tab.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700" />
              )}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`w-full px-4 py-3 rounded-lg transition-all duration-200 flex items-center gap-3 font-medium mb-2 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="container mx-auto">
        <ActiveComponent />
      </main>
    </div>
  );
}

export default App;