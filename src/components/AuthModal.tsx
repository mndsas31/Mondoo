import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  Check, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { motion, AnimatePresence } from 'motion/react';
import { API_URL } from '../services/api';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Initialize saved credentials from local storage
  useEffect(() => {
    if (isAuthModalOpen) {
      setError('');
      setSuccessMsg('');
      const savedEmail = localStorage.getItem('mondoflix_saved_email') || '';
      const savedRemember = localStorage.getItem('mondoflix_remember_me') !== 'false';
      
      setRememberMe(savedRemember);
      if (savedEmail && savedRemember) {
        setEmail(savedEmail);
        // Focus the password input so the user or browser autofill can immediately provide the password
        setTimeout(() => {
          passwordInputRef.current?.focus();
        }, 150);
      } else {
        setTimeout(() => {
          emailInputRef.current?.focus();
        }, 150);
      }
    } else {
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setIsCapsLockOn(false);
    }
  }, [isAuthModalOpen]);

  // Handle Caps Lock detection
  const handleKeyModifierCheck = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setIsCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  // Password strength calculation for registration
  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-slate-700' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: 'Weak', color: 'bg-red-500' };
      case 2:
        return { score: 2, label: 'Fair', color: 'bg-amber-500' };
      case 3:
        return { score: 3, label: 'Good', color: 'bg-emerald-500' };
      case 4:
        return { score: 4, label: 'Strong', color: 'bg-cyan-400' };
      default:
        return { score: 1, label: 'Weak', color: 'bg-red-500' };
    }
  };

  const strength = calculatePasswordStrength(password);

  const clearSavedEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    localStorage.removeItem('mondoflix_saved_email');
    setEmail('');
    emailInputRef.current?.focus();
  };

  const handleSuccessfulAuth = (token: string, user: any, userEmail: string) => {
    // Automatically save or clear email based on Remember Me preference
    if (rememberMe) {
      localStorage.setItem('mondoflix_saved_email', userEmail.trim());
      localStorage.setItem('mondoflix_remember_me', 'true');
    } else {
      localStorage.removeItem('mondoflix_saved_email');
      localStorage.setItem('mondoflix_remember_me', 'false');
    }

    setSuccessMsg(isLogin ? `Welcome back, ${user.username || 'friend'}!` : 'Account created successfully!');
    login(token, user);

    setTimeout(() => {
      closeAuthModal();
      setSuccessMsg('');
    }, 900);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Client-side validations
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!isLogin) {
      if (!username.trim()) {
        setError('Please choose a username.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? `${API_URL}/auth/login` : `${API_URL}/auth/register`;
      const body = isLogin 
        ? { email: email.trim(), password } 
        : { email: email.trim(), password, username: username.trim() };
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || `Authentication failed (${res.status})`);
      }

      handleSuccessfulAuth(data.token, data.user, email);
    } catch (err: any) {
      // If the backend is unreachable
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError('Cannot reach authentication server. Please check your network connection.');
      } else {
        setError(err.message || 'An error occurred during authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
          onClick={closeAuthModal}
        />
        
        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2 }}
          className="relative bg-[#0A1428] w-full max-w-md rounded-2xl overflow-hidden shadow-[0_0_60px_rgba(0,245,255,0.18)] border border-slate-700/80 z-10"
        >
          {/* Top glowing bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#00F5FF] via-[#38BDF8] to-[#8B5CF6]" />
          
          <button 
            type="button"
            onClick={closeAuthModal}
            aria-label="Close authentication modal"
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 sm:p-8">
            {/* Logo */}
            <div className="flex flex-col items-center justify-center mb-6">
              <Logo className="h-10 sm:h-11 mb-2" />
              <p className="text-xs text-slate-400 font-medium tracking-wide">
                {isLogin ? 'Sign in to access your Watchlist & sync' : 'Create an account to track your movies & shows'}
              </p>
            </div>

            {/* Mode Tabs */}
            <div className="flex gap-2 p-1 mb-6 bg-slate-900/90 rounded-xl border border-slate-800">
              <button 
                type="button"
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all relative ${
                  isLogin 
                    ? 'text-white bg-slate-800/90 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                }}
              >
                Sign In
                {isLogin && (
                  <motion.div 
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#00F5FF] shadow-[0_0_8px_rgba(0,245,255,0.8)] rounded-full"
                  />
                )}
              </button>
              <button 
                type="button"
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all relative ${
                  !isLogin 
                    ? 'text-white bg-slate-800/90 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                }}
              >
                Create Account
                {!isLogin && (
                  <motion.div 
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#00F5FF] shadow-[0_0_8px_rgba(0,245,255,0.8)] rounded-full"
                  />
                )}
              </button>
            </div>

            {/* Notifications / Alerts */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 bg-red-500/10 border border-red-500/40 text-red-300 text-xs sm:text-sm p-3 rounded-xl flex items-start gap-2.5 shadow-sm"
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="flex-1 leading-snug">{error}</span>
              </motion.div>
            )}

            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm p-3 rounded-xl flex items-center gap-2.5 shadow-sm"
              >
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="font-semibold">{successMsg}</span>
              </motion.div>
            )}

            {/* Semantic Form with Native Password Manager & Autofill Support */}
            <form 
              id={isLogin ? 'mondoflix-login-form' : 'mondoflix-register-form'}
              name={isLogin ? 'loginForm' : 'registerForm'}
              method="POST"
              action="#"
              autoComplete="on"
              onSubmit={handleSubmit} 
              className="space-y-4"
            >
              {/* Username field (Registration only) */}
              {!isLogin && (
                <div className="space-y-1">
                  <label htmlFor="auth-username" className="text-xs font-semibold text-slate-300 ml-1">
                    Username
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input 
                      id="auth-username"
                      name="username"
                      type="text" 
                      placeholder="Choose a username" 
                      required
                      autoComplete="username"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (error) setError('');
                      }}
                      className="w-full bg-slate-900/60 border border-slate-700/80 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#00F5FF] focus:ring-1 focus:ring-[#00F5FF]/50 transition-all placeholder:text-slate-500"
                    />
                  </div>
                </div>
              )}
              
              {/* Email Address */}
              <div className="space-y-1">
                <div className="flex items-center justify-between ml-1">
                  <label htmlFor="auth-email" className="text-xs font-semibold text-slate-300">
                    Email Address
                  </label>
                  {isLogin && email && localStorage.getItem('mondoflix_saved_email') === email && (
                    <button 
                      type="button"
                      onClick={clearSavedEmail}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Clear saved
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input 
                    ref={emailInputRef}
                    id="auth-email"
                    name="email"
                    type="email" 
                    placeholder="name@example.com" 
                    required
                    autoComplete="username email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    className="w-full bg-slate-900/60 border border-slate-700/80 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#00F5FF] focus:ring-1 focus:ring-[#00F5FF]/50 transition-all placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between ml-1">
                  <label htmlFor="auth-password" className="text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  {isCapsLockOn && (
                    <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                      Caps Lock is ON
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input 
                    ref={passwordInputRef}
                    id="auth-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'} 
                    placeholder={isLogin ? 'Enter your password' : 'At least 6 characters'} 
                    required
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    value={password}
                    onKeyDown={handleKeyModifierCheck}
                    onKeyUp={handleKeyModifierCheck}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError('');
                    }}
                    className="w-full bg-slate-900/60 border border-slate-700/80 text-white rounded-xl pl-10 pr-11 py-2.5 text-sm focus:outline-none focus:border-[#00F5FF] focus:ring-1 focus:ring-[#00F5FF]/50 transition-all placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength meter for registration */}
                {!isLogin && password && (
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Password strength:</span>
                      <span className="font-semibold text-slate-200">{strength.label}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div 
                          key={step} 
                          className={`h-full rounded-full transition-colors duration-300 ${
                            step <= strength.score ? strength.color : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password (Registration only) */}
              {!isLogin && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between ml-1">
                    <label htmlFor="auth-confirm-password" className="text-xs font-semibold text-slate-300">
                      Confirm Password
                    </label>
                    {confirmPassword && (
                      <span className={`text-[11px] font-medium flex items-center gap-1 ${
                        password === confirmPassword ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        {password === confirmPassword ? (
                          <>
                            <Check className="w-3 h-3" /> Passwords match
                          </>
                        ) : (
                          'Mismatch'
                        )}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input 
                      id="auth-confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'} 
                      placeholder="Re-enter your password" 
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError('');
                      }}
                      className="w-full bg-slate-900/60 border border-slate-700/80 text-white rounded-xl pl-10 pr-11 py-2.5 text-sm focus:outline-none focus:border-[#00F5FF] focus:ring-1 focus:ring-[#00F5FF]/50 transition-all placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-0.5"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Automatic Save / Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs text-slate-300 hover:text-white transition-colors">
                  <input 
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-4 h-4 rounded border border-slate-600 bg-slate-900 peer-checked:bg-[#00F5FF] peer-checked:border-[#00F5FF] flex items-center justify-center transition-all peer-focus:ring-2 peer-focus:ring-[#00F5FF]/30">
                    {rememberMe && <Check className="w-3 h-3 text-[#0A1428] stroke-[3]" />}
                  </div>
                  <span>Remember me & save login</span>
                </label>
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#00F5FF] via-[#0ea5e9] to-[#8B5CF6] text-[#0A1428] font-bold rounded-xl py-3 mt-2 hover:shadow-[0_0_25px_rgba(0,245,255,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-sm tracking-wide"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0A1428]" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{isLogin ? 'Sign In to MondoFlix' : 'Create Your Free Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 text-center text-[11px] text-slate-500 leading-relaxed">
              Your credentials are encrypted and stored safely with automatic browser password saving.
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

