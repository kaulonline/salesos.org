import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, MessageCircle } from 'lucide-react';

export const CheckoutCancel: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F2F1EA] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-12 h-12 text-gray-400" />
        </div>

        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">
          Checkout Cancelled
        </h1>

        <p className="text-gray-600 mb-8">
          Your checkout was cancelled. No charges were made. Feel free to try again when you're ready.
        </p>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/pricing')}
            className="w-full py-3 bg-[#1A1A1A] text-white rounded-lg font-medium hover:bg-[#333] flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Pricing
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
          >
            Go to Dashboard
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-3">
            Have questions about our plans?
          </p>
          <a
            href="/contact"
            className="inline-flex items-center gap-2 text-sm text-[#1A1A1A] font-medium hover:underline"
          >
            <MessageCircle className="w-4 h-4" />
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
};

export default CheckoutCancel;
