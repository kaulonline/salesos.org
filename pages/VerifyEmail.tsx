import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Command, X, AlertCircle, CheckCircle2, Loader2, Mail, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setIsLoading(false);
      setError('Invalid verification link. Please check your email for the correct link.');
    }
  }, [token]);

  const verifyEmail = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/verify-email?token=${token}`, {
        method: 'GET',
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const data = await response.json();
        setError(data.message || 'Verification failed. The link may have expired.');
      }
    } catch (err) {
      setError('Failed to verify email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F1EA] flex p-4 md:p-6 relative overflow-hidden">
      {/* Background Gradient Effect */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#EAD07D]/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Close Button */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 right-6 md:top-8 md:right-8 z-50 w-11 h-11 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-[#1A1A1A] hover:bg-white transition-colors shadow-sm"
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

        <div className="max-w-md w-full text-center">
          {isLoading ? (
            // Loading State
            <div>
              <div className="w-16 h-16 bg-[#EAD07D]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 size={32} className="text-[#1A1A1A] animate-spin" />
              </div>
              <h1 className="text-3xl font-medium text-[#1A1A1A] mb-3">Verifying Your Email</h1>
              <p className="text-[#666]">
                Please wait while we verify your email address...
              </p>
            </div>
          ) : success ? (
            // Success State
            <div>
              <div className="w-16 h-16 bg-[#93C01F]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} className="text-[#93C01F]" />
              </div>
              <h1 className="text-3xl font-medium text-[#1A1A1A] mb-3">Email Verified!</h1>
              <p className="text-[#666] mb-8">
                Your email has been successfully verified. You can now access all features of your SalesOS account.
              </p>
              <Button
                onClick={() => navigate('/login')}
                className="w-full bg-[#1A1A1A] text-white hover:bg-[#333] rounded-xl py-3.5"
              >
                Sign In to Your Account
              </Button>
            </div>
          ) : (
            // Error State
            <div>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <h1 className="text-3xl font-medium text-[#1A1A1A] mb-3">Verification Failed</h1>
              <p className="text-[#666] mb-8">
                {error}
              </p>
              <div className="space-y-3">
                {token && (
                  <Button
                    onClick={verifyEmail}
                    variant="outline"
                    className="w-full rounded-xl py-3.5 flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={18} />
                    Try Again
                  </Button>
                )}
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-[#1A1A1A] text-white hover:bg-[#333] rounded-xl py-3.5"
                >
                  Back to Sign In
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
