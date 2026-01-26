/**
 * Email Template Preview
 * Visual preview of AI-generated email template
 */

import React, { useState } from 'react';
import { EmailTemplateConfig } from '../../../types/aiBuilder';
import { cn } from '../../../lib/utils';
import { Mail, Tag, Eye, Code, Variable } from 'lucide-react';

interface EmailTemplatePreviewProps {
  config: EmailTemplateConfig;
  className?: string;
}

// Sample data for merge field replacement
const sampleData: Record<string, string> = {
  firstName: 'John',
  lastName: 'Smith',
  fullName: 'John Smith',
  email: 'john@acmecorp.com',
  company: 'Acme Corp',
  jobTitle: 'VP of Sales',
  phone: '(555) 123-4567',
  senderName: 'Sarah Johnson',
  senderTitle: 'Account Executive',
  senderEmail: 'sarah@salesos.org',
  senderPhone: '(555) 987-6543',
  senderCompany: 'SalesOS',
  meetingLink: 'https://calendly.com/sarah-salesos',
  dealName: 'Acme Corp - Enterprise Plan',
  dealValue: '$50,000',
  productName: 'SalesOS Enterprise',
  currentDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
};

// Replace merge fields with sample data
function replaceMergeFields(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, field) => {
    return sampleData[field] || `{{${field}}}`;
  });
}

export function EmailTemplatePreview({ config, className }: EmailTemplatePreviewProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'html'>('preview');
  const { name, subject, bodyHtml, bodyText, preheader, category, variables, ctaText } = config;

  const previewSubject = replaceMergeFields(subject || '');
  const previewBody = replaceMergeFields(bodyHtml || '');

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#1A1A1A]">{name}</h3>
          {category && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 text-xs bg-gray-100 text-gray-600 rounded-full">
              <Tag className="w-3 h-3" />
              {category}
            </span>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setViewMode('preview')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              viewMode === 'preview'
                ? 'bg-white text-[#1A1A1A] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Eye className="w-3.5 h-3.5 inline mr-1" />
            Preview
          </button>
          <button
            onClick={() => setViewMode('html')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              viewMode === 'html'
                ? 'bg-white text-[#1A1A1A] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Code className="w-3.5 h-3.5 inline mr-1" />
            HTML
          </button>
        </div>
      </div>

      {/* Email Preview */}
      <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
        {/* Email Header */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#EAD07D] flex items-center justify-center">
              <Mail className="w-4 h-4 text-[#1A1A1A]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#1A1A1A] truncate">
                {previewSubject}
              </div>
              <div className="text-xs text-gray-500 truncate">
                From: {sampleData.senderName} &lt;{sampleData.senderEmail}&gt;
              </div>
            </div>
          </div>
          {preheader && (
            <div className="mt-2 text-xs text-gray-400 italic">
              {replaceMergeFields(preheader)}
            </div>
          )}
        </div>

        {/* Email Body */}
        <div className="p-4">
          {viewMode === 'preview' ? (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: previewBody }}
            />
          ) : (
            <pre className="text-xs bg-gray-50 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap">
              {bodyHtml}
            </pre>
          )}
        </div>

        {/* CTA Preview */}
        {ctaText && (
          <div className="px-4 pb-4">
            <button
              disabled
              className="px-6 py-2 bg-[#EAD07D] text-[#1A1A1A] rounded-full text-sm font-medium"
            >
              {ctaText}
            </button>
          </div>
        )}
      </div>

      {/* Merge Fields Used */}
      {variables && variables.length > 0 && (
        <div className="p-3 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
            <Variable className="w-3.5 h-3.5" />
            <span className="font-medium">Merge Fields Used</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {variables.map((field, i) => (
              <code
                key={i}
                className="px-2 py-0.5 text-xs bg-white border border-gray-200 rounded text-gray-600"
              >
                {`{{${field}}}`}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Plain Text Fallback */}
      {bodyText && (
        <details className="group">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
            View plain text version
          </summary>
          <pre className="mt-2 text-xs bg-gray-50 p-4 rounded-xl overflow-x-auto whitespace-pre-wrap">
            {replaceMergeFields(bodyText)}
          </pre>
        </details>
      )}
    </div>
  );
}

export default EmailTemplatePreview;
