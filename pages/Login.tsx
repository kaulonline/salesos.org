import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Command, Eye, EyeOff, X, Apple, AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../src/context/AuthContext';
import { authApi } from '../src/api/auth';

// Custom Google Icon component since Lucide doesn't have the colored G
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.52 12.29C23.52 11.43 23.44 10.64 23.3 9.87H12V14.51H18.46C18.18 15.99 17.34 17.25 16.08 18.1V21.09H19.95C22.21 19 23.52 15.92 23.52 12.29Z" fill="#4285F4"/>
    <path d="M12 24C15.24 24 17.96 22.92 19.95 21.09L16.08 18.1C15 18.82 13.62 19.25 12 19.25C8.87 19.25 6.22 17.14 5.27 14.29H1.27V17.38C3.25 21.32 7.31 24 12 24Z" fill="#34A853"/>
    <path d="M5.27 14.29C5.03 13.57 4.9 12.8 4.9 12C4.9 11.2 5.03 10.43 5.27 9.71V6.62H1.27C0.46 8.23 0 10.06 0 12C0 13.94 0.46 15.77 1.27 17.38L5.27 14.29Z" fill="#FBBC05"/>
    <path d="M12 4.75C13.76 4.75 15.34 5.36 16.58 6.55L20.03 3.1C17.96 1.16 15.24 0 12 0C7.31 0 3.25 2.68 1.27 6.62L5.27 9.71C6.22 6.86 8.87 4.75 12 4.75Z" fill="#EA4335"/>
  </svg>
);

// OAuth status interface
interface OAuthStatus {
  google: { enabled: boolean; configured: boolean };
  apple: { enabled: boolean; configured: boolean };
}

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  // OAuth status state
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);
  const [oauthLoading, setOauthLoading] = useState(true);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Fetch OAuth status on mount
  useEffect(() => {
    const fetchOAuthStatus = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/auth/oauth-status`);
        if (response.ok) {
          const data = await response.json();
          setOauthStatus(data);
        }
      } catch (err) {
        console.error('Failed to fetch OAuth status:', err);
      } finally {
        setOauthLoading(false);
      }
    };
    fetchOAuthStatus();
  }, []);

  // Clear errors when inputs change
  useEffect(() => {
    if (error) clearError();
    if (localError) setLocalError('');
  }, [email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!email.trim()) {
      setLocalError('Email is required');
      return;
    }

    if (!password.trim()) {
      setLocalError('Password is required');
      return;
    }

    try {
      await login({ email: email.trim(), password });
      // Navigation happens via useEffect when isAuthenticated changes
    } catch {
      // Error is handled by AuthContext
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (!forgotEmail.trim()) {
      setForgotError('Email is required');
      return;
    }

    setForgotLoading(true);
    try {
      await authApi.forgotPassword(forgotEmail.trim());
      setForgotSuccess(true);
    } catch (err: any) {
      setForgotError(err.response?.data?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleOAuthLogin = (provider: 'google' | 'apple') => {
    // Check if provider is enabled
    const providerStatus = oauthStatus?.[provider];
    if (!providerStatus?.enabled) {
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
      if (!providerStatus?.configured) {
        alert(`${providerName} login is being configured. Please use email login for now.`);
      } else {
        alert(`${providerName} login is currently disabled. Please use email login.`);
      }
      return;
    }

    // OAuth endpoints - redirect to the OAuth provider
    const oauthUrls: Record<string, string> = {
      google: `${import.meta.env.VITE_API_URL || ''}/auth/google`,
      apple: `${import.meta.env.VITE_API_URL || ''}/auth/apple`,
    };

    window.location.href = oauthUrls[provider];
  };

  const closeForgotPassword = () => {
    setShowForgotPassword(false);
    setForgotEmail('');
    setForgotSuccess(false);
    setForgotError('');
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-[#F2F1EA] flex p-4 md:p-6 relative overflow-hidden">
      {/* Background Gradient Effect for Left Side */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#EAD07D]/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Close Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 right-6 md:top-8 md:right-8 z-50 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-[#1A1A1A] hover:bg-white transition-colors shadow-sm"
      >
        <X size={20} />
      </button>

      {/* Left Column - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-4 md:px-12 lg:px-20 relative z-10">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-16 w-fit">
          <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-white">
            <Command size={18} />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">
            SalesOS
          </span>
        </Link>

        <div className="max-w-md w-full mx-auto lg:mx-0">
          <h1 className="text-3xl md:text-4xl font-medium text-[#1A1A1A] mb-3">Welcome back</h1>
          <p className="text-[#666] mb-10">Enter your details to access your account</p>

          {/* Error Message */}
          {displayError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
              <AlertCircle size={20} />
              <span className="text-sm">{displayError}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#666] ml-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-6 py-4 rounded-full bg-white border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all text-[#1A1A1A] placeholder-gray-400 font-medium"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-1.5 relative">
              <label className="text-xs font-medium text-[#666] ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-6 py-4 rounded-full bg-white border-transparent focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all text-[#1A1A1A] placeholder-gray-400 font-medium pr-12"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#1A1A1A] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              variant="secondary"
              className="w-full py-4 rounded-full text-base font-bold shadow-none hover:shadow-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* OAuth Buttons - Only show if at least one provider is configured */}
          {!oauthLoading && (oauthStatus?.google.configured || oauthStatus?.apple.configured) && (
            <div className="grid grid-cols-2 gap-4 mt-6">
              {oauthStatus?.apple.configured && (
                <button
                  type="button"
                  onClick={() => handleOAuthLogin('apple')}
                  className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border border-black/5 bg-transparent hover:bg-white hover:border-transparent transition-all text-sm font-medium text-[#1A1A1A] disabled:opacity-50 ${!oauthStatus.apple.enabled ? 'opacity-60' : ''}`}
                  disabled={isLoading}
                  title={!oauthStatus.apple.enabled ? 'Apple login is currently disabled' : 'Sign in with Apple'}
                >
                  <Apple size={18} /> Apple
                </button>
              )}
              {oauthStatus?.google.configured && (
                <button
                  type="button"
                  onClick={() => handleOAuthLogin('google')}
                  className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border border-black/5 bg-transparent hover:bg-white hover:border-transparent transition-all text-sm font-medium text-[#1A1A1A] disabled:opacity-50 ${!oauthStatus.google.enabled ? 'opacity-60' : ''}`}
                  disabled={isLoading}
                  title={!oauthStatus.google.enabled ? 'Google login is currently disabled' : 'Sign in with Google'}
                >
                  <GoogleIcon /> Google
                </button>
              )}
            </div>
          )}

          <div className="flex justify-between items-center mt-12 text-sm">
            <div className="text-[#666]">
              Don't have an account? <Link to="/signup" className="text-[#1A1A1A] underline font-medium hover:text-[#EAD07D] transition-colors">Sign up</Link>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-[#666] underline hover:text-[#1A1A1A] transition-colors"
            >
              Forgot Password?
            </button>
          </div>
        </div>
      </div>

      {/* Right Column - Image & Overlay Cards */}
      <div className="hidden lg:block w-1/2 relative">
        <div className="absolute inset-0 bg-[#E5E5E5] rounded-[2.5rem] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&q=80&w=1000"
            alt="Office Team"
            className="w-full h-full object-cover"
          />

          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-black/10"></div>

          {/* Floating Cards - Positioned to match design */}

          {/* Top Yellow/Dark Card - Frosted Dark */}
          <div className="absolute top-[15%] left-[10%] bg-[#1A1A1A]/80 backdrop-blur-md p-4 rounded-2xl shadow-2xl min-w-[220px] animate-float border border-white/10">
             <div className="bg-[#EAD07D] text-[#1A1A1A] p-3 rounded-xl mb-3 relative">
                <div className="flex justify-between items-start">
                   <span className="text-sm font-bold">Task Review With Team</span>
                   <div className="w-1.5 h-1.5 bg-[#1A1A1A] rounded-full"></div>
                </div>
                <div className="mt-1 text-xs opacity-80">09:30am-10:00am</div>
             </div>
             <div className="text-white/40 text-xs px-1">09:30am-10:00am</div>
          </div>

          {/* Calendar Strip (Simulated) - Frosted White */}
          <div className="absolute top-[50%] right-[10%] left-[20%] h-24 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-between px-6 text-white border border-white/20 shadow-lg">
             {[
               {d: '22', day: 'Sun'},
               {d: '23', day: 'Mon'},
               {d: '24', day: 'Tue'},
               {d: '25', day: 'Wed', active: true},
               {d: '26', day: 'Thu'},
               {d: '27', day: 'Fri'},
               {d: '28', day: 'Sat'}
             ].map((item, i) => (
               <div key={i} className={`flex flex-col items-center gap-1 ${item.active ? 'opacity-100 scale-110 font-bold' : 'opacity-60'}`}>
                  <span className="text-[10px] uppercase">{item.day}</span>
                  <span className="text-lg">{item.d}</span>
                  {item.active && <div className="w-1 h-1 bg-[#EAD07D] rounded-full mt-1"></div>}
               </div>
             ))}
          </div>

          {/* Bottom White Card - Frosted White */}
          <div className="absolute bottom-[20%] left-[15%] bg-white/90 backdrop-blur-md p-5 rounded-3xl shadow-2xl min-w-[260px] animate-float border border-white/40" style={{ animationDelay: '1.5s' }}>
             <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-[#1A1A1A]">Daily Meeting</h4>
                  <p className="text-xs text-[#666] mt-1">12:00pm-01:00pm</p>
                </div>
                <div className="w-1.5 h-1.5 bg-[#EAD07D] rounded-full mt-1"></div>
             </div>
             <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <img key={i} src={`https://picsum.photos/50/50?random=${i+20}`} className="w-8 h-8 rounded-full border-2 border-white" alt="Avatar" />
                ))}
             </div>
          </div>

        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-8 pb-0">
              <h2 className="text-2xl font-medium text-[#1A1A1A]">Reset Password</h2>
              <button
                onClick={closeForgotPassword}
                className="text-[#666] hover:text-[#1A1A1A] transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 pt-6">
              {forgotSuccess ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-[#93C01F]/20 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-[#93C01F]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Check your email</h3>
                  <p className="text-[#666] text-sm mb-6">
                    We've sent password reset instructions to <strong>{forgotEmail}</strong>
                  </p>
                  <button
                    onClick={closeForgotPassword}
                    className="px-6 py-3 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium"
                  >
                    Back to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword}>
                  <p className="text-[#666] text-sm mb-6">
                    Enter your email address and we'll send you instructions to reset your password.
                  </p>

                  {forgotError && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
                      <AlertCircle size={20} />
                      <span className="text-sm">{forgotError}</span>
                    </div>
                  )}

                  <div className="space-y-1.5 mb-6">
                    <label className="text-xs font-medium text-[#666] ml-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-[#999]" size={18} />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full pl-12 pr-6 py-4 rounded-full bg-[#F8F8F6] border-transparent focus:bg-white focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none transition-all text-[#1A1A1A] placeholder-gray-400 font-medium"
                        disabled={forgotLoading}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={closeForgotPassword}
                      className="flex-1 py-3.5 rounded-full border border-black/10 text-[#666] hover:bg-[#F8F8F6] transition-colors font-medium"
                      disabled={forgotLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={forgotLoading}
                    >
                      {forgotLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 size={18} className="animate-spin" />
                          Sending...
                        </span>
                      ) : (
                        'Send Reset Link'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
