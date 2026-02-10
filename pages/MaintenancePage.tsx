import React, { useEffect } from 'react';
import { Wrench } from 'lucide-react';
import { format } from 'date-fns';

interface MaintenancePageProps {
  message?: string;
  estimatedEnd?: string | null;
}

export function MaintenancePage({ message, estimatedEnd }: MaintenancePageProps) {
  // Remove the pre-React inline overlay now that the React version has mounted
  useEffect(() => {
    const overlay = document.getElementById('maintenance-overlay');
    if (overlay) overlay.remove();
  }, []);

  const formattedEnd = estimatedEnd
    ? format(new Date(estimatedEnd), 'MMM d, yyyy h:mm a')
    : null;

  return (
    <div className="min-h-screen bg-[#F2F1EA] flex items-center justify-center px-4 py-8 sm:p-6">
      <div className="bg-white rounded-2xl sm:rounded-[32px] p-6 sm:p-8 md:p-12 shadow-sm border border-black/5 max-w-lg w-full text-center">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[#EAD07D]/20 flex items-center justify-center mx-auto mb-4 sm:mb-6">
          <Wrench size={22} className="text-[#1A1A1A] sm:hidden" />
          <Wrench size={28} className="text-[#1A1A1A] hidden sm:block" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-light text-[#1A1A1A] mb-2">SalesOS</h1>

        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#EAD07D]/20 rounded-full mb-4 sm:mb-6">
          <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EAD07D] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-[#EAD07D]" />
          </span>
          <span className="text-xs sm:text-sm font-semibold text-[#1A1A1A]">Under Maintenance</span>
        </div>

        <p className="text-sm sm:text-base text-[#666] mb-4 sm:mb-6 leading-relaxed">
          {message || "We're performing scheduled maintenance. We'll be back shortly."}
        </p>

        {formattedEnd && (
          <div className="bg-[#F8F8F6] rounded-lg sm:rounded-xl p-3 sm:p-4">
            <p className="text-xs text-[#999] mb-0.5 sm:mb-1">Estimated return</p>
            <p className="text-xs sm:text-sm font-medium text-[#1A1A1A]">{formattedEnd}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default MaintenancePage;
