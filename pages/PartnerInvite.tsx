import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Handshake } from 'lucide-react';
import { authApi } from '../src/api/auth';

export default function PartnerInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link. Please check your email for the correct link.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('Invalid invitation token');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authApi.acceptPartnerInvite({
        token,
        password,
        name: name || undefined,
      });

      setSuccess(true);
      setEmail(result.email);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to accept invitation. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#F2F1EA] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-black/5 text-center">
            <div className="w-16 h-16 rounded-full bg-[#93C01F]/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} className="text-[#93C01F]" />
            </div>
            <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-2">
              Welcome to the Partner Portal!
            </h1>
            <p className="text-[#666] mb-6">
              Your account has been activated. You can now log in with your email{' '}
              <strong>{email}</strong> and the password you just set.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-black transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2F1EA] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-black/5">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#EAD07D]/20 flex items-center justify-center mx-auto mb-4">
              <Handshake size={32} className="text-[#1A1A1A]" />
            </div>
            <h1 className="text-2xl font-semibold text-[#1A1A1A] mb-2">
              Partner Portal Invitation
            </h1>
            <p className="text-[#666]">
              Set your password to access the Partner Portal
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {!token ? (
            <div className="text-center">
              <p className="text-[#666] mb-4">
                This invitation link appears to be invalid or has expired.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="text-[#1A1A1A] font-medium hover:underline"
              >
                Go to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Your Name (optional)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-2 focus:ring-[#EAD07D] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password (min. 8 characters)"
                    required
                    minLength={8}
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-2 focus:ring-[#EAD07D] outline-none text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#666]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-2 focus:ring-[#EAD07D] outline-none text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#1A1A1A] text-white rounded-full font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Activating Account...
                  </>
                ) : (
                  'Activate My Account'
                )}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-[#999] mt-6">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-[#1A1A1A] font-medium hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
