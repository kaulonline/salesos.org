import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Command, X, AlertCircle, CheckCircle2, Loader2, Users, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../src/context/AuthContext';

interface InviteInfo {
  email: string;
  organizationName: string;
  inviterName: string;
  role: string;
  expiresAt: string;
}

export const AcceptInvite: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { isAuthenticated, login } = useAuth();

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form fields for new users
  const [isNewUser, setIsNewUser] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInviteInfo();
    } else {
      setIsLoading(false);
      setError('Invalid invitation link. Please check your email for the correct link.');
    }
  }, [token]);

  const fetchInviteInfo = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/invitations/info?token=${token}`, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setInviteInfo(data);
        // Check if user needs to create account
        setIsNewUser(!data.existingUser);
      } else {
        const data = await response.json();
        setError(data.message || 'Invalid or expired invitation.');
      }
    } catch (err) {
      setError('Failed to load invitation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!token) return;

    // Validate form for new users
    if (isNewUser) {
      if (!name.trim()) {
        setError('Please enter your name');
        return;
      }
      if (!password.trim() || password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    setIsAccepting(true);
    setError('');

    try {
      const body = isNewUser ? { token, name, password } : { token };

      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/invitations/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isAuthenticated ? { Authorization: `Bearer ${localStorage.getItem('token')}` } : {}),
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(true);

        // If we got a token back (new user created), log them in
        if (data.access_token) {
          localStorage.setItem('token', data.access_token);
          // Redirect to dashboard after brief delay
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        }
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to accept invitation.');
      }
    } catch (err) {
      setError('Failed to accept invitation. Please try again.');
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F1EA] flex p-4 md:p-6 relative overflow-hidden">
      {/* Background Gradient Effect */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#EAD07D]/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-[#93C01F]/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Close Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 right-6 md:top-8 md:right-8 z-50 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-[#1A1A1A] hover:bg-white transition-colors shadow-sm"
      >
        <X size={20} />
      </button>

      {/* Center Content */}
      <div className="w-full flex flex-col justify-center items-center px-4 relative z-10">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-white">
            <Command size={18} />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">
            SalesOS
          </span>
        </Link>

        <div className="max-w-md w-full">
          {isLoading ? (
            // Loading State
            <div className="text-center">
              <div className="w-16 h-16 bg-[#EAD07D]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 size={32} className="text-[#1A1A1A] animate-spin" />
              </div>
              <h1 className="text-3xl font-medium text-[#1A1A1A] mb-3">Loading Invitation</h1>
              <p className="text-[#666]">
                Please wait while we verify your invitation...
              </p>
            </div>
          ) : success ? (
            // Success State
            <div className="text-center">
              <div className="w-16 h-16 bg-[#93C01F]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} className="text-[#93C01F]" />
              </div>
              <h1 className="text-3xl font-medium text-[#1A1A1A] mb-3">Welcome to the Team!</h1>
              <p className="text-[#666] mb-8">
                You've successfully joined <strong>{inviteInfo?.organizationName}</strong>.
                {isNewUser ? " We're logging you in now..." : " You can now access the team workspace."}
              </p>
              {!isNewUser && (
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-[#1A1A1A] text-white hover:bg-[#333] rounded-xl py-3.5"
                >
                  Go to Dashboard
                </Button>
              )}
            </div>
          ) : error && !inviteInfo ? (
            // Error State (no invite info)
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <h1 className="text-3xl font-medium text-[#1A1A1A] mb-3">Invalid Invitation</h1>
              <p className="text-[#666] mb-8">
                {error}
              </p>
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-[#1A1A1A] text-white hover:bg-[#333] rounded-xl py-3.5"
              >
                Go to Sign In
              </Button>
            </div>
          ) : inviteInfo ? (
            // Invitation Card
            <div className="bg-white rounded-3xl shadow-sm border border-black/5 overflow-hidden">
              {/* Header */}
              <div className="bg-[#1A1A1A] px-8 py-6 text-center">
                <div className="w-14 h-14 bg-[#EAD07D] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users size={28} className="text-[#1A1A1A]" />
                </div>
                <h1 className="text-2xl font-medium text-white mb-1">You're Invited!</h1>
                <p className="text-white/60 text-sm">
                  Join {inviteInfo.organizationName} on SalesOS
                </p>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Invite Details */}
                <div className="bg-[#F8F8F6] rounded-2xl p-5 mb-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#666]">Invited by</span>
                      <span className="text-sm font-medium text-[#1A1A1A]">{inviteInfo.inviterName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#666]">Organization</span>
                      <span className="text-sm font-medium text-[#1A1A1A]">{inviteInfo.organizationName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#666]">Role</span>
                      <span className="px-3 py-1 bg-[#EAD07D]/20 rounded-full text-xs font-medium text-[#1A1A1A]">
                        {inviteInfo.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                    <AlertCircle size={18} />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {/* New User Form */}
                {isNewUser && (
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                        Your Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-2 focus:ring-[#EAD07D]/20 focus:border-[#EAD07D] outline-none text-[#1A1A1A]"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                        Create Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-2 focus:ring-[#EAD07D]/20 focus:border-[#EAD07D] outline-none text-[#1A1A1A] pr-12"
                          placeholder="Create a password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#999] hover:text-[#666]"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-[#999]">Minimum 6 characters</p>
                    </div>
                  </div>
                )}

                {/* Accept Button */}
                <Button
                  onClick={acceptInvitation}
                  disabled={isAccepting}
                  className="w-full bg-[#1A1A1A] text-white hover:bg-[#333] rounded-xl py-3.5 flex items-center justify-center gap-2"
                >
                  {isAccepting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Accepting Invitation...
                    </>
                  ) : (
                    <>Accept Invitation</>
                  )}
                </Button>

                {/* Existing User Login */}
                {!isNewUser && !isAuthenticated && (
                  <p className="text-center text-sm text-[#666] mt-4">
                    Already have an account?{' '}
                    <Link to="/login" className="text-[#1A1A1A] font-medium hover:underline">
                      Sign in first
                    </Link>
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;
