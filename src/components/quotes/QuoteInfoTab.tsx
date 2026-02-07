import React from 'react';
import { Link } from 'react-router-dom';
import { QuoteStatusBadge } from './QuoteStatusBadge';
import { formatDate, formatDateTime } from './types';
import type { Quote } from '../../types/quote';

interface QuoteInfoTabProps {
  quote: Quote;
}

export const QuoteInfoTab: React.FC<QuoteInfoTabProps> = ({ quote }) => {
  return (
    <div className="space-y-6">
      {/* Quote Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-[#1A1A1A]">Quote Details</h4>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-[#F2F1EA]">
              <span className="text-sm text-[#666]">Quote Number</span>
              <span className="text-sm font-medium text-[#1A1A1A] font-mono">{quote.quoteNumber}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#F2F1EA]">
              <span className="text-sm text-[#666]">Status</span>
              <QuoteStatusBadge status={quote.status} size="sm" />
            </div>
            <div className="flex justify-between py-2 border-b border-[#F2F1EA]">
              <span className="text-sm text-[#666]">Currency</span>
              <span className="text-sm font-medium text-[#1A1A1A]">{quote.currency}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#F2F1EA]">
              <span className="text-sm text-[#666]">Expiration Date</span>
              <span className="text-sm font-medium text-[#1A1A1A]">{formatDate(quote.expirationDate)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-[#666]">Created</span>
              <span className="text-sm font-medium text-[#1A1A1A]">{formatDateTime(quote.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-[#1A1A1A]">Related Records</h4>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-[#F2F1EA]">
              <span className="text-sm text-[#666]">Account</span>
              {quote.account ? (
                <Link to={`/dashboard/companies/${quote.accountId}`} className="text-sm font-medium text-[#EAD07D] hover:underline">
                  {quote.account.name}
                </Link>
              ) : (
                <span className="text-sm text-[#999]">-</span>
              )}
            </div>
            <div className="flex justify-between py-2 border-b border-[#F2F1EA]">
              <span className="text-sm text-[#666]">Opportunity</span>
              {quote.opportunity ? (
                <Link to={`/dashboard/deals/${quote.opportunityId}`} className="text-sm font-medium text-[#EAD07D] hover:underline">
                  {quote.opportunity.name}
                </Link>
              ) : (
                <span className="text-sm text-[#999]">-</span>
              )}
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-[#666]">Contact</span>
              {quote.contact ? (
                <Link to={`/dashboard/contacts/${quote.contactId}`} className="text-sm font-medium text-[#EAD07D] hover:underline">
                  {quote.contact.firstName} {quote.contact.lastName}
                </Link>
              ) : (
                <span className="text-sm text-[#999]">-</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Notes */}
      {(quote.terms || quote.notes) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#F2F1EA]">
          {quote.terms && (
            <div>
              <h4 className="text-sm font-semibold text-[#1A1A1A] mb-2">Terms & Conditions</h4>
              <p className="text-sm text-[#666] whitespace-pre-wrap">{quote.terms}</p>
            </div>
          )}
          {quote.notes && (
            <div>
              <h4 className="text-sm font-semibold text-[#1A1A1A] mb-2">Notes</h4>
              <p className="text-sm text-[#666] whitespace-pre-wrap">{quote.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
