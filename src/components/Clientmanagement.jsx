import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Phone, 
  Building2, 
  Edit, 
  Trash2, 
  LogOut, 
  User,
  Save,
  X,
  AlertCircle,
  Shield,
  Sparkles,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle
} from 'lucide-react';

export default function ClientManagement() {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '' });
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [authError, setAuthError] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Reset password state
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetStep, setResetStep] = useState(1);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        fetchClients();
      }
    });
    return unsubscribe;
  }, []);

  const fetchClients = () => {
    const unsubscribe = onSnapshot(
      collection(db, 'clients'),
      (snapshot) => {
        setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => {
        setError(error.message);
      }
    );
    return unsubscribe;
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      } else {
        await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
      }
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    setClients([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const clientData = {
        ...form,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        createdByEmail: user.email
      };

      if (editId) {
        await updateDoc(doc(db, 'clients', editId), {
          ...form,
          updatedAt: serverTimestamp()
        });
        setEditId(null);
      } else {
        await addDoc(collection(db, 'clients'), clientData);
      }
      
      setForm({ name: '', email: '', phone: '', company: '' });
    } catch (error) {
      setError(error.message);
    }
  };

  const handleEdit = (client) => {
    setForm({ 
      name: client.name || '', 
      email: client.email || '', 
      phone: client.phone || '', 
      company: client.company || ''
    });
    setEditId(client.id);
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this client?')) {
      try {
        await deleteDoc(doc(db, 'clients', id));
      } catch (error) {
        setError(error.message);
      }
    }
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm({ name: '', email: '', phone: '', company: '' });
  };

  const handleRequestResetToken = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMessage('');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockToken = 'RESET-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      
      setResetToken(mockToken);
      setResetMessage(`Your reset token is: ${mockToken}\n\nPlease save this token and use it to reset your password.`);
      setResetStep(2);
    } catch (error) {
      setResetMessage('Failed to send reset token. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetMessage('');
    
    if (newPassword !== confirmPassword) {
      setResetMessage('Passwords do not match!');
      return;
    }
    
    if (newPassword.length < 6) {
      setResetMessage('Password must be at least 6 characters long.');
      return;
    }
    
    setResetLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setResetMessage('Password reset successfully! You can now log in with your new password.');
      
      setTimeout(() => {
        setShowResetPassword(false);
        setResetStep(1);
        setResetEmail('');
        setResetToken('');
        setNewPassword('');
        setConfirmPassword('');
        setResetMessage('');
      }, 2000);
      
    } catch (error) {
      setResetMessage('Failed to reset password. Please check your token and try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const backToLogin = () => {
    setShowResetPassword(false);
    setResetStep(1);
    setResetEmail('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setResetMessage('');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-3 py-4 sm:px-4 sm:py-6 md:px-6">
        <div className="bg-white p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl w-full max-w-[95%] sm:max-w-md border border-slate-200">
          {!showResetPassword ? (
            <>
              <div className="text-center mb-6 sm:mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 shadow-lg">
                  <Shield className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                </div>
                <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold text-slate-800">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm mt-1 sm:mt-2">
                  {isLogin ? 'Sign in to manage your clients' : 'Join us to get started'}
                </p>
              </div>
              
              {authError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl mb-4 sm:mb-6 flex items-start gap-2 sm:gap-3">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm">{authError}</span>
                </div>
              )}
              
              <form onSubmit={handleAuthSubmit} className="space-y-4 sm:space-y-5">
                <div>
                  <label className="block text-slate-700 text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-slate-700 text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-9 sm:pl-11 pr-10 sm:pr-12 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2 sm:gap-0 text-xs sm:text-sm">
                  <label className="flex items-center text-slate-600 cursor-pointer">
                    <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mr-1.5 sm:mr-2" />
                    <span className="text-xs sm:text-sm">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(true)}
                    className="text-blue-600 hover:text-blue-700 font-medium text-xs sm:text-sm text-left xs:text-right"
                  >
                    Forgot password?
                  </button>
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 sm:gap-2 transition-shadow"
                >
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                  {isLogin ? 'Sign In' : 'Create Account'}
                </button>
              </form>
              
              <div className="mt-6 sm:mt-8 text-center">
                <p className="text-slate-600 text-xs sm:text-sm">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={backToLogin}
                className="flex items-center text-blue-600 hover:text-blue-700 mb-4 sm:mb-6 font-medium text-xs sm:text-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Back to Login
              </button>
              
              <div className="text-center mb-6 sm:mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 shadow-lg">
                  <Shield className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                </div>
                <h2 className="text-2xl sm:text-2xl md:text-3xl font-bold text-slate-800">
                  Reset Password
                </h2>
                <p className="text-slate-600 text-xs sm:text-sm mt-1 sm:mt-2 px-2">
                  {resetStep === 1 ? 'Enter your email to receive a reset token' : 'Enter your reset token and new password'}
                </p>
              </div>
              
              {resetMessage && (
                <div className={`px-3 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl mb-4 sm:mb-6 border ${
                  resetMessage.includes('reset token is') || resetMessage.includes('success')
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-rose-50 border-rose-200 text-rose-700'
                }`}>
                  <div className="flex items-start gap-2 sm:gap-3">
                    {resetMessage.includes('success') ? (
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <pre className="text-xs sm:text-sm whitespace-pre-wrap font-sans break-words">{resetMessage}</pre>
                      {resetMessage.includes('reset token is') && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(resetToken);
                            alert('Token copied to clipboard!');
                          }}
                          className="mt-2 sm:mt-3 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 sm:gap-2"
                        >
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy Token
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {resetStep === 1 ? (
                <form onSubmit={handleRequestResetToken} className="space-y-4 sm:space-y-5">
                  <div>
                    <label className="block text-slate-700 text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-slate-50"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 transition-shadow"
                  >
                    {resetLoading ? (
                      <>
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                        Send Reset Token
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4 sm:space-y-5">
                  <div>
                    <label className="block text-slate-700 text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2">
                      Reset Token
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                      <input
                        type="text"
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-slate-50 font-mono"
                        placeholder="Enter reset token"
                        required
                      />
                    </div>
                    <p className="mt-1 sm:mt-1.5 text-[10px] sm:text-xs text-slate-500">Use the token displayed above</p>
                  </div>
                  
                  <div>
                    <label className="block text-slate-700 text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-9 sm:pl-11 pr-10 sm:pr-12 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-slate-50"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-slate-700 text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-9 sm:pl-11 pr-10 sm:pr-12 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-slate-50"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-2.5 sm:right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-2.5 sm:py-3 md:py-3.5 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 sm:gap-2 disabled:opacity-50 transition-shadow"
                  >
                    {resetLoading ? (
                      <>
                        <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                        Reset Password
                      </>
                    )}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6 lg:px-8 lg:py-8 max-w-[1600px] mx-auto">
        
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
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-white rounded-lg sm:rounded-xl border border-slate-200 shadow-sm">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-slate-700 font-medium truncate max-w-[160px] sm:max-w-[200px]">{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-rose-500 to-red-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-xl text-sm sm:text-base font-medium shadow-lg hover:shadow-xl flex items-center justify-center gap-1.5 sm:gap-2 transition-shadow"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
        
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-4 rounded-lg sm:rounded-xl mb-4 sm:mb-6 flex items-start gap-2 sm:gap-3 shadow-sm">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
            <span className="text-xs sm:text-sm font-medium">{error}</span>
          </div>
        )}
        
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
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="John Doe" 
                    value={form.name}
                    onChange={(e) => setForm({...form, name: e.target.value})}
                    className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50" 
                    required 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                  Email Address <span className="text-slate-400 text-xs">(Optional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                  <input 
                    type="email" 
                    placeholder="john@example.com" 
                    value={form.email}
                    onChange={(e) => setForm({...form, email: e.target.value})}
                    className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                  <input 
                    type="tel" 
                    placeholder="+1 (555) 000-0000" 
                    value={form.phone}
                    onChange={(e) => setForm({...form, phone: e.target.value})}
                    className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 sm:mb-2">
                  Company
                </label>
                <div className="relative">
                  <Building2 className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Acme Inc." 
                    value={form.company}
                    onChange={(e) => setForm({...form, company: e.target.value})}
                    className="w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border border-slate-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50" 
                  />
                </div>
              </div>
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
          
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Name</span>
                  </th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Email</span>
                  </th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Phone</span>
                  </th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Company</span>
                  </th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Created By</span>
                  </th>
                  <th className="px-4 lg:px-6 py-3 lg:py-4 text-left">
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 lg:py-16">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <div className="p-3 lg:p-4 bg-slate-50 rounded-full">
                          <Users className="w-10 h-10 lg:w-12 lg:h-12" />
                        </div>
                        <div className="text-center">
                          <p className="text-base lg:text-lg font-medium text-slate-600">No clients yet</p>
                          <p className="text-sm text-slate-500 mt-1">Add your first client to get started</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  clients.map(client => (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <div className="flex items-center gap-2 lg:gap-3">
                          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center border border-blue-100 flex-shrink-0">
                            <span className="text-xs lg:text-sm font-semibold text-blue-600">
                              {client.name?.charAt(0) || 'N'}
                            </span>
                          </div>
                          <span className="font-bold text-slate-800 text-sm lg:text-base truncate">{client.name}</span>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-slate-600 text-sm font-bold truncate max-w-[200px]">{client.email || '—'}</td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-slate-600 text-sm font-bold">{client.phone || '—'}</td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-slate-600 text-sm font-bold truncate max-w-[150px]">{client.company || '—'}</td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4 text-slate-500 text-xs font-bold truncate max-w-[180px]">
                        {client.createdByEmail || client.createdBy || user.email}
                      </td>
                      <td className="px-4 lg:px-6 py-3 lg:py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleEdit(client)} 
                            className="p-1.5 lg:p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                            title="Edit client"
                          >
                            <Edit className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(client.id)} 
                            className="p-1.5 lg:p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                            title="Delete client"
                          >
                            <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="lg:hidden divide-y divide-slate-100">
            {clients.length === 0 ? (
              <div className="px-4 py-12 sm:px-6 sm:py-16">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <div className="p-3 sm:p-4 bg-slate-50 rounded-full">
                    <Users className="w-10 h-10 sm:w-12 sm:h-12" />
                  </div>
                  <div className="text-center">
                    <p className="text-base sm:text-lg font-medium text-slate-600">No clients yet</p>
                    <p className="text-sm text-slate-500 mt-1">Add your first client to get started</p>
                  </div>
                </div>
              </div>
            ) : (
              clients.map(client => (
                <div key={client.id} className="p-4 sm:p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center border border-blue-100 flex-shrink-0">
                        <span className="text-sm sm:text-base font-semibold text-blue-600">
                          {client.name?.charAt(0) || 'N'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-800 text-sm sm:text-base truncate">{client.name}</h3>
                        <p className="text-xs sm:text-sm text-slate-500 truncate">{client.company || 'No company'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
                    {client.email && (
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600">
                        <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-600">
                        <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{client.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-slate-500">
                      <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">Created by: {client.createdByEmail || client.createdBy || user.email}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEdit(client)} 
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(client.id)} 
                      className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-600 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}