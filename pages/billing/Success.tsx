import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';

export const CheckoutSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(5);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#F2F1EA] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>

        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">
          Payment Successful!
        </h1>

        <p className="text-gray-600 mb-8">
          Thank you for your subscription. Your account has been upgraded and you now have access to all premium features.
        </p>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 bg-[#1A1A1A] text-white rounded-lg font-medium hover:bg-[#333] flex items-center justify-center gap-2"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigate('/billing')}
            className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
          >
            View Billing Details
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-6">
          Redirecting to dashboard in {countdown} seconds...
        </p>

        {sessionId && (
          <p className="text-xs text-gray-400 mt-4">
            Session ID: {sessionId.substring(0, 20)}...
          </p>
        )}
      </div>
    </div>
  );
};

export default CheckoutSuccess;
