import { useState, useEffect, useRef } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import {
  Mail, Shield, Eye, EyeOff, Sparkles, ArrowLeft,
  CheckCircle, AlertCircle, X, Info, Loader2
} from 'lucide-react';

// ─── Toast System ────────────────────────────────────────────────────────────
function Toast({ toasts, removeToast }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[90vw] max-w-sm pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium
            transition-all duration-300 animate-slide-in
            ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : ''}
            ${toast.type === 'error'   ? 'bg-rose-50 border-rose-200 text-rose-800'         : ''}
            ${toast.type === 'info'    ? 'bg-blue-50 border-blue-200 text-blue-800'          : ''}
          `}
        >
          <span className="flex-shrink-0 mt-0.5">
            {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
            {toast.type === 'error'   && <AlertCircle className="w-4 h-4 text-rose-600"    />}
            {toast.type === 'info'    && <Info         className="w-4 h-4 text-blue-600"    />}
          </span>
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── useToast hook ────────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timerRef = useRef({});

  const addToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    timerRef.current[id] = setTimeout(() => removeToast(id), duration);
    return id;
  };

  const removeToast = (id) => {
    clearTimeout(timerRef.current[id]);
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    const timers = timerRef.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  return { toasts, addToast, removeToast,
    success: (msg, dur) => addToast(msg, 'success', dur),
    error:   (msg, dur) => addToast(msg, 'error',   dur),
    info:    (msg, dur) => addToast(msg, 'info',     dur),
  };
}

// ─── Friendly Firebase error messages ────────────────────────────────────────
function friendlyError(code) {
  const map = {
    'auth/user-not-found':       'No account found with this email.',
    'auth/wrong-password':       'Incorrect password. Please try again.',
    'auth/invalid-credential':   'Invalid email or password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password':        'Password must be at least 6 characters.',
    'auth/invalid-email':        'Please enter a valid email address.',
    'auth/too-many-requests':    'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

// ─── LoginForm Component ──────────────────────────────────────────────────────
export default function LoginForm({ onAuthSuccess }) {
  const { toasts, removeToast, success, error: toastError, info } = useToast();

  const [isLogin, setIsLogin]             = useState(true);
  const [loginEmail, setLoginEmail]       = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [authLoading, setAuthLoading]     = useState(false);

  const [showReset, setShowReset]         = useState(false);
  const [resetEmail, setResetEmail]       = useState('');
  const [resetLoading, setResetLoading]   = useState(false);

  // ── Submit login / signup ──
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
        success('Welcome back! You are now signed in.');
        onAuthSuccess?.();
      } else {
        await createUserWithEmailAndPassword(auth, loginEmail, loginPassword);
        success('Account created! Welcome aboard 🎉');
        onAuthSuccess?.();
      }
    } catch (err) {
      toastError(friendlyError(err.code));
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Send real Firebase password-reset email ──
  const handleSendResetEmail = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      success('Password reset email sent! Check your inbox.');
      setShowReset(false);
      setResetEmail('');
    } catch (err) {
      toastError(friendlyError(err.code));
    } finally {
      setResetLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(v => !v);
    setLoginEmail('');
    setLoginPassword('');
    info(isLogin ? 'Creating a new account.' : 'Sign in to your account.');
  };

  return (
    <>
      {/* Toast container */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Slide-in animation style */}
      <style>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        .animate-slide-in { animation: slide-in 0.25s ease-out both; }
      `}</style>

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-3 py-4 sm:px-4 sm:py-6">
        <div className="bg-white p-5 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl w-full max-w-[95%] sm:max-w-md border border-slate-200">

          {/* ── Password Reset View ── */}
          {showReset ? (
            <>
              <button
                onClick={() => { setShowReset(false); setResetEmail(''); }}
                className="flex items-center text-blue-600 hover:text-blue-700 mb-5 font-medium text-xs sm:text-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Back to Login
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl mb-3 shadow-lg">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">Reset Password</h2>
                <p className="text-slate-500 text-sm mt-1">
                  We'll send a reset link to your email
                </p>
              </div>

              <form onSubmit={handleSendResetEmail} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-slate-50"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-2.5 sm:py-3 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-shadow"
                >
                  {resetLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                    : <><Mail className="w-4 h-4" /> Send Reset Link</>}
                </button>
              </form>
            </>
          ) : (
            /* ── Login / Sign-up View ── */
            <>
              <div className="text-center mb-6 sm:mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-3 shadow-lg">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  {isLogin ? 'Sign in to manage your clients' : 'Join us to get started'}
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4 sm:space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-2.5 sm:py-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword
                        ? <EyeOff className="w-4 h-4" />
                        : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember + Forgot */}
                {isLogin && (
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                      <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <span className="text-xs sm:text-sm">Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowReset(true)}
                      className="text-blue-600 hover:text-blue-700 font-medium text-xs sm:text-sm"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 sm:py-3 rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-shadow"
                >
                  {authLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> {isLogin ? 'Signing in…' : 'Creating…'}</>
                    : <><Sparkles className="w-4 h-4" /> {isLogin ? 'Sign In' : 'Create Account'}</>}
                </button>
              </form>

              {/* Switch mode */}
              <div className="mt-6 text-center">
                <p className="text-slate-600 text-sm">
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  <button onClick={switchMode} className="text-blue-600 hover:text-blue-700 font-semibold">
                    {isLogin ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}