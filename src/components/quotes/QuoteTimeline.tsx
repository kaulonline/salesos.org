import React from 'react';
import { Clock } from 'lucide-react';
import { formatDateTime } from './types';
import type { Quote } from '../../types/quote';

interface QuoteTimelineProps {
  quote: Quote;
}

export const QuoteTimeline: React.FC<QuoteTimelineProps> = ({ quote }) => {
  return (
    <div className="bg-white rounded-2xl border border-[#F2F1EA] p-5">
      <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
        <Clock size={16} className="text-[#888]" />
        Timeline
      </h3>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-[#1A1A1A] mt-2" />
          <div>
            <div className="text-sm font-medium text-[#1A1A1A]">Created</div>
            <div className="text-xs text-[#888]">{formatDateTime(quote.createdAt)}</div>
          </div>
        </div>
        {quote.sentAt && (
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-[#EAD07D] mt-2" />
            <div>
              <div className="text-sm font-medium text-[#1A1A1A]">Sent</div>
              <div className="text-xs text-[#888]">{formatDateTime(quote.sentAt)}</div>
            </div>
          </div>
        )}
        {quote.viewedAt && (
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-[#1A1A1A] mt-2" />
            <div>
              <div className="text-sm font-medium text-[#1A1A1A]">Viewed</div>
              <div className="text-xs text-[#888]">{formatDateTime(quote.viewedAt)}</div>
            </div>
          </div>
        )}
        {quote.acceptedAt && (
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-[#93C01F] mt-2" />
            <div>
              <div className="text-sm font-medium text-[#1A1A1A]">Accepted</div>
              <div className="text-xs text-[#888]">{formatDateTime(quote.acceptedAt)}</div>
            </div>
          </div>
        )}
        {quote.rejectedAt && (
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-[#666] mt-2" />
            <div>
              <div className="text-sm font-medium text-[#1A1A1A]">Rejected</div>
              <div className="text-xs text-[#888]">{formatDateTime(quote.rejectedAt)}</div>
              {quote.rejectionReason && (
                <div className="text-xs text-[#666] mt-1 italic">"{quote.rejectionReason}"</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
