/**
 * AI Builder Modal
 * Main interface for AI-powered configuration generation
 */

import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Send, Loader2, Check, Edit3, AlertCircle, Lightbulb } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAIBuilder } from '../../hooks/useAIBuilder';
import {
  AIBuilderEntityType,
  GenerateConfigResponse,
  GenerationContext,
  isWebFormConfig,
  isCustomFieldsConfig,
  isEmailTemplateConfig,
  isAssignmentRuleConfig,
  isWorkflowConfig,
  isProductConfig,
  isProfileConfig,
  isReportConfig,
  isTerritoryConfig,
} from '../../types/aiBuilder';
import {
  WebFormPreview,
  CustomFieldsPreview,
  EmailTemplatePreview,
  AssignmentRulePreview,
  WorkflowPreview,
  ProductPreview,
  ProfilePreview,
  ReportPreview,
  TerritoryPreview,
} from './EntityPreviews';

interface AIBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: AIBuilderEntityType;
  entityLabel: string;
  context?: GenerationContext;
  onApply: (config: Record<string, any>) => void;
  onEditManually?: (config: Record<string, any>) => void;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  config?: Record<string, any>;
  preview?: GenerateConfigResponse['preview'];
}

const entityExamples: Record<AIBuilderEntityType, string[]> = {
  [AIBuilderEntityType.WEB_FORM]: [
    'Create a demo request form for our SaaS product',
    'Build a contact form with name, email, and message',
    'Design an event registration form',
  ],
  [AIBuilderEntityType.CUSTOM_FIELDS]: [
    'Add BANT qualification fields to leads',
    'Create fields to track competitor info on deals',
    'Add company size and industry fields to accounts',
  ],
  [AIBuilderEntityType.EMAIL_TEMPLATE]: [
    'Write a follow-up email for demo attendees',
    'Create a proposal delivery email',
    'Build a cold outreach template for enterprise prospects',
  ],
  [AIBuilderEntityType.ASSIGNMENT_RULE]: [
    'Route enterprise leads to senior reps',
    'Distribute leads by region',
    'Assign high-value deals to experienced AEs',
  ],
  [AIBuilderEntityType.WORKFLOW]: [
    'When a deal moves to Negotiation, create a task for legal review',
    'Send a welcome email when a new lead is created',
    'Notify the manager when a large deal closes',
  ],
  [AIBuilderEntityType.PRODUCT]: [
    'Add our Pro plan: $49/user/month with unlimited features',
    'Create a one-time implementation service for $2,500',
    'Add Enterprise license with volume pricing tiers',
  ],
  [AIBuilderEntityType.PROFILE]: [
    'Create a role for SDRs who can create leads but not delete',
    'Build a Sales Manager profile with full team access',
    'Set up a read-only executive dashboard role',
  ],
  [AIBuilderEntityType.REPORT]: [
    'Show conversion rates by lead source for last quarter',
    'Create a pipeline report showing deals by stage',
    'Build a monthly revenue trend report for this year',
  ],
  [AIBuilderEntityType.SMART_BUILDER]: [
    'Set up our complete lead qualification workflow',
    'Create our SDR team setup with roles and templates',
    'Configure customer onboarding automation',
  ],
  [AIBuilderEntityType.TERRITORY]: [
    'Create a West Coast territory for CA, OR, WA states',
    'Set up an Enterprise territory for companies with 500+ employees',
    'Create a Healthcare industry territory',
  ],
};

export function AIBuilderModal({
  isOpen,
  onClose,
  entityType,
  entityLabel,
  context,
  onApply,
  onEditManually,
}: AIBuilderModalProps) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConfig, setCurrentConfig] = useState<Record<string, any> | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();

  const { generate, refine, isLoading } = useAIBuilder(entityType);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setCurrentConfig(null);
      setPrompt('');
      setConversationId(undefined);
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || isLoading) return;

    const userMessage = prompt.trim();
    setPrompt('');

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      let response: GenerateConfigResponse;

      if (currentConfig) {
        // Refine existing config
        response = await refine(userMessage, currentConfig, conversationId);
      } else {
        // Generate new config
        response = await generate(userMessage, context);
      }

      if (response.success && response.rawConfig) {
        setCurrentConfig(response.rawConfig);
        setConversationId(response.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: response.preview?.summary || 'Generated configuration',
            config: response.rawConfig,
            preview: response.preview,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'system',
            content: response.error || 'Failed to generate. Please try again.',
          },
        ]);
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'system',
          content: error.message || 'Something went wrong. Please try again.',
        },
      ]);
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
    inputRef.current?.focus();
  };

  const handleApply = () => {
    if (currentConfig) {
      onApply(currentConfig);
      onClose();
    }
  };

  const handleEditManually = () => {
    if (currentConfig && onEditManually) {
      onEditManually(currentConfig);
      onClose();
    }
  };

  const renderPreview = (config: Record<string, any>) => {
    if (isWebFormConfig(config)) {
      return <WebFormPreview config={config} />;
    }
    if (isCustomFieldsConfig(config)) {
      return <CustomFieldsPreview config={config} />;
    }
    if (isEmailTemplateConfig(config)) {
      return <EmailTemplatePreview config={config} />;
    }
    if (isAssignmentRuleConfig(config)) {
      return <AssignmentRulePreview config={config} />;
    }
    if (isWorkflowConfig(config)) {
      return <WorkflowPreview config={config} />;
    }
    if (isProductConfig(config)) {
      return <ProductPreview config={config} />;
    }
    if (isProfileConfig(config)) {
      return <ProfilePreview config={config} />;
    }
    if (isReportConfig(config)) {
      return <ReportPreview config={config} />;
    }
    if (isTerritoryConfig(config)) {
      return <TerritoryPreview config={config} />;
    }
    // Fallback: JSON preview
    return (
      <pre className="text-xs bg-gray-50 p-4 rounded-xl overflow-auto max-h-64">
        {JSON.stringify(config, null, 2)}
      </pre>
    );
  };

  if (!isOpen) return null;

  const examples = entityExamples[entityType] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#EAD07D]/20 rounded-xl">
              <Sparkles className="w-5 h-5 text-[#EAD07D]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1A1A1A]">
                Create {entityLabel} with AI
              </h2>
              <p className="text-xs text-gray-500">
                Describe what you need in plain language
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[300px]">
          {messages.length === 0 ? (
            // Empty State with Examples
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-4 bg-gray-50 rounded-2xl mb-4">
                <Lightbulb className="w-8 h-8 text-[#EAD07D]" />
              </div>
              <h3 className="text-base font-medium text-[#1A1A1A] mb-2">
                What would you like to create?
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Try one of these examples or describe your own
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {examples.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(example)}
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Message List
            messages.map((message, index) => (
              <div key={index} className="space-y-3">
                {/* Message Bubble */}
                <div
                  className={cn(
                    'max-w-[90%] rounded-2xl px-4 py-3',
                    message.role === 'user'
                      ? 'ml-auto bg-[#1A1A1A] text-white'
                      : message.role === 'system'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-gray-100 text-[#1A1A1A]'
                  )}
                >
                  {message.role === 'system' && (
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">Error</span>
                    </div>
                  )}
                  <p className="text-sm">{message.content}</p>
                </div>

                {/* Preview */}
                {message.config && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-4">
                    {/* Warnings */}
                    {message.preview?.warnings && message.preview.warnings.length > 0 && (
                      <div className="mb-4 p-3 bg-amber-50 rounded-xl">
                        {message.preview.warnings.map((warning, i) => (
                          <p key={i} className="text-xs text-amber-700">
                            {warning}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Entity Preview */}
                    {renderPreview(message.config)}

                    {/* Suggestions */}
                    {message.preview?.suggestions && message.preview.suggestions.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-xl">
                        {message.preview.suggestions.map((suggestion, i) => (
                          <p key={i} className="text-xs text-blue-700">
                            {suggestion}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Generating...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-100">
          {/* Action Buttons (when config exists) */}
          {currentConfig && !isLoading && (
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={handleApply}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#EAD07D] text-[#1A1A1A] rounded-full font-medium text-sm hover:bg-[#d4bc6c] transition-colors"
              >
                <Check className="w-4 h-4" />
                Apply Configuration
              </button>
              {onEditManually && (
                <button
                  onClick={handleEditManually}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-full font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Manually
                </button>
              )}
            </div>
          )}

          {/* Chat Input */}
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={
                  currentConfig
                    ? 'Describe changes (e.g., "Add a phone field", "Make it shorter")'
                    : `Describe your ${entityLabel.toLowerCase()}...`
                }
                rows={1}
                className="w-full px-4 py-3 pr-12 bg-[#F8F8F6] rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#EAD07D] placeholder:text-gray-400"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              <button
                type="submit"
                disabled={!prompt.trim() || isLoading}
                className={cn(
                  'absolute right-2 bottom-2 p-2 rounded-lg transition-colors',
                  prompt.trim() && !isLoading
                    ? 'bg-[#EAD07D] text-[#1A1A1A] hover:bg-[#d4bc6c]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AIBuilderModal;
