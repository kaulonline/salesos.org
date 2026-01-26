/**
 * Smart Builder Modal
 * AI-powered cross-entity generation from a single high-level requirement
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  Loader2,
  Check,
  AlertCircle,
  Lightbulb,
  Layers,
  ChevronRight,
  Package,
  FileText,
  Users,
  Mail,
  Zap,
  Shield,
  BarChart3,
  FormInput,
  ArrowRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAIBuilder } from '../../hooks/useAIBuilder';
import {
  AIBuilderEntityType,
  GenerateConfigResponse,
  SmartBuilderConfig,
  SmartBuilderEntity,
  isSmartBuilderConfig,
} from '../../types/aiBuilder';

interface SmartBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (entities: SmartBuilderEntity[]) => void;
}

const entityIcons: Record<string, React.ReactNode> = {
  'web-form': <FormInput className="w-4 h-4" />,
  'custom-fields': <FileText className="w-4 h-4" />,
  'email-template': <Mail className="w-4 h-4" />,
  'assignment-rule': <Users className="w-4 h-4" />,
  'workflow': <Zap className="w-4 h-4" />,
  'product': <Package className="w-4 h-4" />,
  'profile': <Shield className="w-4 h-4" />,
  'report': <BarChart3 className="w-4 h-4" />,
};

const entityColors: Record<string, { bg: string; text: string }> = {
  'web-form': { bg: 'bg-blue-100', text: 'text-blue-600' },
  'custom-fields': { bg: 'bg-purple-100', text: 'text-purple-600' },
  'email-template': { bg: 'bg-green-100', text: 'text-green-600' },
  'assignment-rule': { bg: 'bg-orange-100', text: 'text-orange-600' },
  'workflow': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  'product': { bg: 'bg-pink-100', text: 'text-pink-600' },
  'profile': { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  'report': { bg: 'bg-cyan-100', text: 'text-cyan-600' },
};

const examples = [
  'Set up our complete lead qualification workflow',
  'Create our SDR team setup with roles, rules, and templates',
  'Configure customer onboarding automation',
  'Build our enterprise sales process end-to-end',
];

export function SmartBuilderModal({
  isOpen,
  onClose,
  onApply,
}: SmartBuilderModalProps) {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<SmartBuilderConfig | null>(null);
  const [selectedEntities, setSelectedEntities] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const { generate, isLoading } = useAIBuilder(AIBuilderEntityType.SMART_BUILDER);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPrompt('');
      setResult(null);
      setSelectedEntities(new Set());
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setError(null);

    try {
      const response = await generate(prompt.trim());

      if (response.success && response.rawConfig && isSmartBuilderConfig(response.rawConfig)) {
        setResult(response.rawConfig);
        // Select all entities by default
        setSelectedEntities(new Set(response.rawConfig.entities.map((_, i) => i)));
      } else {
        setError(response.error || 'Failed to generate. Please try rephrasing your request.');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
    inputRef.current?.focus();
  };

  const toggleEntity = (index: number) => {
    setSelectedEntities(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (result) {
      setSelectedEntities(new Set(result.entities.map((_, i) => i)));
    }
  };

  const selectNone = () => {
    setSelectedEntities(new Set());
  };

  const handleApply = () => {
    if (!result) return;

    const selected = result.entities
      .filter((_, i) => selectedEntities.has(i))
      .sort((a, b) => a.order - b.order);

    onApply(selected);
    onClose();
  };

  const formatEntityType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'web-form': 'Web Form',
      'custom-fields': 'Custom Fields',
      'email-template': 'Email Template',
      'assignment-rule': 'Assignment Rule',
      'workflow': 'Workflow',
      'product': 'Product',
      'profile': 'Profile',
      'report': 'Report',
    };
    return typeMap[type] || type;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#EAD07D] to-[#d4bc6c] rounded-xl">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#1A1A1A]">
                Smart Builder
              </h2>
              <p className="text-xs text-gray-500">
                Describe your goal — AI creates everything you need
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {!result ? (
            // Input Phase
            <div className="space-y-6">
              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-700">Generation Failed</p>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#EAD07D]/20 to-[#EAD07D]/5 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-[#EAD07D]" />
                </div>
                <h3 className="text-lg font-medium text-[#1A1A1A] mb-2">
                  What would you like to set up?
                </h3>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  Describe your business goal and Smart Builder will create all the
                  forms, fields, workflows, templates, and rules you need.
                </p>
              </div>

              {/* Examples */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Examples
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {examples.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => handleExampleClick(example)}
                      className="p-3 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                      <span className="text-gray-700">{example}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="space-y-3">
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
                  placeholder="Describe what you want to set up..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[#F8F8F6] rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#EAD07D] placeholder:text-gray-400"
                />
                <button
                  type="submit"
                  disabled={!prompt.trim() || isLoading}
                  className={cn(
                    'w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all',
                    prompt.trim() && !isLoading
                      ? 'bg-[#1A1A1A] text-white hover:bg-black'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  )}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Setup
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            // Results Phase
            <div className="space-y-6">
              {/* Summary */}
              <div className="p-4 bg-gradient-to-br from-[#EAD07D]/10 to-[#EAD07D]/5 rounded-xl">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-[#EAD07D] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">{result.summary}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {result.entities.length} entities will be created
                    </p>
                  </div>
                </div>
              </div>

              {/* Selection Controls */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  Select entities to create:
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Select All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={selectNone}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Entity List */}
              <div className="space-y-2">
                {result.entities
                  .sort((a, b) => a.order - b.order)
                  .map((entity, index) => {
                    const originalIndex = result.entities.indexOf(entity);
                    const isSelected = selectedEntities.has(originalIndex);
                    const colors = entityColors[entity.entityType] || { bg: 'bg-gray-100', text: 'text-gray-600' };

                    return (
                      <div
                        key={index}
                        onClick={() => toggleEntity(originalIndex)}
                        className={cn(
                          'p-4 rounded-xl border-2 cursor-pointer transition-all',
                          isSelected
                            ? 'border-[#EAD07D] bg-[#EAD07D]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <div className={cn(
                            'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5',
                            isSelected ? 'bg-[#EAD07D]' : 'border-2 border-gray-300'
                          )}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>

                          {/* Icon */}
                          <div className={cn('p-2 rounded-lg flex-shrink-0', colors.bg, colors.text)}>
                            {entityIcons[entity.entityType] || <Layers className="w-4 h-4" />}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-[#1A1A1A]">
                                {entity.name}
                              </span>
                              <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', colors.bg, colors.text)}>
                                {formatEntityType(entity.entityType)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {entity.description}
                            </p>
                            {entity.dependsOn.length > 0 && (
                              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <ChevronRight className="w-3 h-3" />
                                Depends on: Step {entity.dependsOn.map(d => d + 1).join(', ')}
                              </p>
                            )}
                          </div>

                          {/* Order Badge */}
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-medium text-gray-500">{entity.order}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Cross References */}
              {result.crossReferences && result.crossReferences.length > 0 && (
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-xs font-medium text-blue-700 mb-2">
                    Entity Connections
                  </p>
                  <div className="space-y-1">
                    {result.crossReferences.map((ref, i) => (
                      <p key={i} className="text-xs text-blue-600 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" />
                        {ref.description}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {result && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-3">
            <button
              onClick={() => {
                setResult(null);
                setSelectedEntities(new Set());
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Start Over
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {selectedEntities.size} of {result.entities.length} selected
              </span>
              <button
                onClick={handleApply}
                disabled={selectedEntities.size === 0}
                className={cn(
                  'px-6 py-2 rounded-full font-medium text-sm flex items-center gap-2 transition-all',
                  selectedEntities.size > 0
                    ? 'bg-[#EAD07D] text-[#1A1A1A] hover:bg-[#d4bc6c]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                )}
              >
                <Check className="w-4 h-4" />
                Create Selected ({selectedEntities.size})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SmartBuilderModal;
