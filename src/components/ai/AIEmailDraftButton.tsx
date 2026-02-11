import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Loader2, Copy, Check, X } from 'lucide-react';
import { useGenerateEmailDraft } from '../../hooks/useAI';
import { EmailDraftRequest } from '../../api/ai';
import { useToast } from '../ui/Toast';

interface AIEmailDraftButtonProps {
  recipientName: string;
  recipientCompany?: string;
  recipientTitle?: string;
  purpose?: 'introduction' | 'follow_up' | 'proposal' | 'meeting_request' | 'thank_you' | 'cold_outreach';
  additionalContext?: string;
  // Sales context signals for better personalization
  dealStage?: string;
  dealValue?: number;
  painPoints?: string[];
  lastInteraction?: string;
  competitors?: string[];
  onDraftGenerated?: (subject: string, body: string) => void;
  className?: string;
}

export const AIEmailDraftButton: React.FC<AIEmailDraftButtonProps> = ({
  recipientName,
  recipientCompany,
  recipientTitle,
  purpose = 'follow_up',
  additionalContext,
  dealStage,
  dealValue,
  painPoints,
  lastInteraction,
  competitors,
  onDraftGenerated,
  className = '',
}) => {
  const { showToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);

  const { mutate: generateDraft, isPending } = useGenerateEmailDraft();

  const handleGenerate = () => {
    // Validate required fields before calling API
    if (!recipientName) {
      console.error('Cannot generate email draft: recipient name is required');
      showToast({ type: 'error', title: 'Missing Recipient', message: 'Recipient name is required to generate an email draft' });
      return;
    }

    const request: EmailDraftRequest = {
      recipientName,
      recipientCompany: recipientCompany || 'their company', // Fallback for missing company
      recipientTitle,
      purpose,
      additionalContext,
      tone: 'professional',
      // Include all available sales signals for better personalization
      dealStage,
      dealValue,
      painPoints: painPoints?.filter(Boolean),
      lastInteraction,
      competitors: competitors?.filter(Boolean),
    };

    // Debug logging
    console.log('[AI Draft] Request:', JSON.stringify(request, null, 2));

    generateDraft(
      { request },
      {
        onSuccess: (response) => {
          setDraft({ subject: response.subject, body: response.body });
          setShowModal(true);
        },
        onError: (error) => {
          console.error('Failed to generate email draft:', error);
          showToast({ type: 'error', title: 'Email Draft Failed', message: (error as Error).message || 'Please try again' });
        },
      }
    );
  };

  const handleCopy = () => {
    if (draft) {
      navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUse = () => {
    if (draft && onDraftGenerated) {
      onDraftGenerated(draft.subject, draft.body);
    }
    setShowModal(false);
  };

  return (
    <>
      <button
        onClick={handleGenerate}
        disabled={isPending}
        className={`flex items-center gap-2 px-3 py-1.5 bg-[#EAD07D] text-[#1A1A1A] rounded-full text-sm font-medium hover:bg-[#e5c86b] transition-all disabled:opacity-50 ${className}`}
      >
        {isPending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Sparkles size={14} />
        )}
        {isPending ? 'Generating...' : 'AI Draft'}
      </button>

      {/* Modal - rendered via portal to ensure proper centering */}
      {showModal && draft && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EAD07D] flex items-center justify-center">
                  <Sparkles size={20} className="text-[#1A1A1A]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1A1A1A]">AI-Generated Email</h2>
                  <p className="text-sm text-[#666]">Review and customize before sending</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#666] mb-1">Subject</label>
                <input
                  type="text"
                  value={draft.subject}
                  onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#666] mb-1">Body</label>
                <textarea
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  rows={10}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-gray-100">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 text-[#666] hover:text-[#1A1A1A] hover:bg-[#F8F8F6] rounded-lg transition-colors"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-200 text-[#666] rounded-xl font-medium hover:bg-[#F8F8F6] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUse}
                  className="px-4 py-2 bg-[#1A1A1A] text-white rounded-xl font-medium hover:bg-black transition-colors"
                >
                  Use Draft
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default AIEmailDraftButton;
