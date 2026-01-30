import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Command, Eye, EyeOff, X, AlertCircle, CheckCircle2, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { authApi } from '../src/api/auth';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  // Password strength validation
  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;

    if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 2) return { score, label: 'Fair', color: 'bg-orange-500' };
    if (score <= 3) return { score, label: 'Good', color: 'bg-[#EAD07D]' };
    return { score, label: 'Strong', color: 'bg-[#93C01F]' };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword({ token, newPassword: password });
      setSuccess(true);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to reset password. The link may have expired.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-[#F2F1EA] flex p-4 md:p-6 relative overflow-hidden">
      {/* Background Gradient Effect */}
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
          {success ? (
            // Success State
            <div className="text-center">
              <div className="w-16 h-16 bg-[#93C01F]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck size={32} className="text-[#93C01F]" />
              </div>
              <h1 className="text-3xl md:text-4xl font-medium text-[#1A1A1A] mb-3">Password Reset!</h1>
              <p className="text-[#666] mb-8">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-[#1A1A1A] text-white hover:bg-[#333] rounded-xl py-3.5"
              >
                Sign In
              </Button>
            </div>
          ) : (
            // Reset Form
            <>
              <div className="w-14 h-14 bg-[#EAD07D]/20 rounded-2xl flex items-center justify-center mb-6">
                <Lock size={28} className="text-[#1A1A1A]" />
              </div>
              <h1 className="text-3xl md:text-4xl font-medium text-[#1A1A1A] mb-3">Set new password</h1>
              <p className="text-[#666] mb-10">
                Create a strong password for your account
              </p>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
                  <AlertCircle size={20} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <form className="space-y-5" onSubmit={handleSubmit}>
                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl bg-white border border-black/10 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-[#1A1A1A] pr-12"
                      placeholder="Enter new password"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#666]"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-1.5 bg-[#F0EBD8] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${passwordStrength.color} transition-all duration-300`}
                            style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${
                          passwordStrength.score <= 1 ? 'text-red-500' :
                          passwordStrength.score <= 2 ? 'text-orange-500' :
                          passwordStrength.score <= 3 ? 'text-[#1A1A1A]' : 'text-[#93C01F]'
                        }`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <p className="text-xs text-[#999]">
                        Use 8+ characters with uppercase, lowercase, numbers & symbols
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full px-4 py-3.5 rounded-xl bg-white border focus:ring-2 outline-none text-[#1A1A1A] pr-12 ${
                        confirmPassword && password !== confirmPassword
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                          : confirmPassword && password === confirmPassword
                            ? 'border-[#93C01F] focus:border-[#93C01F] focus:ring-[#93C01F]/20'
                            : 'border-black/10 focus:border-[#EAD07D] focus:ring-[#EAD07D]/20'
                      }`}
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#666]"
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                  )}
                  {confirmPassword && password === confirmPassword && (
                    <p className="mt-1 text-xs text-[#93C01F] flex items-center gap-1">
                      <CheckCircle2 size={12} /> Passwords match
                    </p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
                  className="w-full bg-[#1A1A1A] text-white hover:bg-[#333] rounded-xl py-3.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>

                {/* Back to Login */}
                <p className="text-center text-sm text-[#666]">
                  Remember your password?{' '}
                  <Link to="/login" className="text-[#1A1A1A] font-medium hover:underline">
                    Sign in
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Right Column - Illustration */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center p-12">
        <div className="absolute inset-8 bg-gradient-to-br from-[#1A1A1A] to-[#333] rounded-[40px] overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-12 left-12 w-24 h-24 bg-[#EAD07D]/20 rounded-full blur-2xl" />
          <div className="absolute bottom-20 right-12 w-32 h-32 bg-[#EAD07D]/10 rounded-full blur-3xl" />

          {/* Content */}
          <div className="relative h-full flex flex-col justify-center items-center px-16 text-center">
            <div className="w-20 h-20 bg-[#EAD07D] rounded-2xl flex items-center justify-center mb-8">
              <ShieldCheck size={40} className="text-[#1A1A1A]" />
            </div>
            <h2 className="text-3xl font-light text-white mb-4">
              Secure Your Account
            </h2>
            <p className="text-white/60 text-lg leading-relaxed max-w-sm">
              Choose a strong password to protect your SalesOS account and all your valuable sales data.
            </p>

            {/* Security Tips */}
            <div className="mt-12 text-left w-full max-w-sm">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-4">Security Tips</p>
              <ul className="space-y-3">
                {[
                  'Use a unique password for SalesOS',
                  'Avoid using personal information',
                  'Consider using a password manager',
                ].map((tip, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-white/60 text-sm">
                    <div className="w-1.5 h-1.5 bg-[#EAD07D] rounded-full" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
