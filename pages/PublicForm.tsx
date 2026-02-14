import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import client from '../src/api/client';

interface WebFormFieldOption {
  label: string;
  value: string;
}

interface WebFormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: WebFormFieldOption[] | string[]; // For select/radio fields - can be objects or strings
}

interface PublicWebForm {
  id: string;
  name: string;
  description?: string;
  fields: WebFormField[];
  styling?: {
    primaryColor?: string;
    backgroundColor?: string;
    fontFamily?: string;
    buttonText?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    textColor?: string;
    borderColor?: string;
    borderRadius?: string;
    fontSize?: string;
  };
  settings?: {
    showTitle?: boolean;
    showDescription?: boolean;
    enableCaptcha?: boolean;
    submitButtonText?: string;
  };
}

interface SubmitResponse {
  success: boolean;
  message?: string;
  redirectUrl?: string;
}

// Generate random math challenge
function generateMathChallenge(): { num1: number; num2: number; operator: '+' | '-'; answer: number } {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const useAddition = Math.random() > 0.5;

  if (useAddition) {
    return { num1, num2, operator: '+', answer: num1 + num2 };
  } else {
    // Ensure positive result for subtraction
    const larger = Math.max(num1, num2);
    const smaller = Math.min(num1, num2);
    return { num1: larger, num2: smaller, operator: '-', answer: larger - smaller };
  }
}

export function PublicForm() {
  const { slug } = useParams<{ slug: string }>();
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  // CAPTCHA state
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaError, setCaptchaError] = useState(false);
  const [mathChallenge, setMathChallenge] = useState(() => generateMathChallenge());

  // Fetch form data
  const { data: form, isLoading, error } = useQuery({
    queryKey: ['publicForm', slug],
    queryFn: async () => {
      const response = await client.get<PublicWebForm>(`/web-forms/public/${slug}`);
      return response.data;
    },
    enabled: !!slug,
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (data: Record<string, string | boolean>) => {
      const response = await client.post<SubmitResponse>(`/web-forms/public/${slug}/submit`, { data });
      return response.data;
    },
    onSuccess: (result) => {
      setSubmitted(true);
      setSubmitMessage(result.message || 'Thank you for your submission!');
      if (result.redirectUrl) {
        setRedirectUrl(result.redirectUrl);
        setTimeout(() => {
          window.location.href = result.redirectUrl!;
        }, 2000);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate CAPTCHA if enabled
    const captchaEnabled = form?.settings?.enableCaptcha;
    if (captchaEnabled) {
      const userAnswer = parseInt(captchaAnswer, 10);
      if (isNaN(userAnswer) || userAnswer !== mathChallenge.answer) {
        setCaptchaError(true);
        // Generate new challenge on error
        setMathChallenge(generateMathChallenge());
        setCaptchaAnswer('');
        return;
      }
      setCaptchaError(false);
    }

    submitMutation.mutate(formData);
  };

  const handleInputChange = (name: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F2F1EA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-[#EAD07D] animate-spin" />
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !form) {
    return (
      <div className="min-h-screen bg-[#F2F1EA] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-lg">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Form Not Found</h1>
          <p className="text-gray-600">
            This form may have been removed or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F2F1EA] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-lg">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Submitted!</h1>
          <p className="text-gray-600">{submitMessage}</p>
          {redirectUrl && (
            <p className="text-sm text-gray-500 mt-4">Redirecting...</p>
          )}
        </div>
      </div>
    );
  }

  const styling = form.styling || {};
  const settings = form.settings || {};
  // Filter out invalid fields (empty arrays, objects without name)
  const fields = (form.fields || []).filter(
    (field): field is WebFormField =>
      field && typeof field === 'object' && !Array.isArray(field) && typeof field.name === 'string'
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: styling.backgroundColor || '#F2F1EA' }}
    >
      <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-lg">
        {settings.showTitle !== false && (
          <h1
            className="text-2xl font-semibold text-gray-900 mb-2"
            style={{ fontFamily: styling.fontFamily }}
          >
            {form.name}
          </h1>
        )}

        {settings.showDescription !== false && form.description && (
          <p className="text-gray-600 mb-6">{form.description}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => {
            // Generate display label - fallback to formatted field name if label is missing
            const displayLabel = field.label || (field.name || 'Field')
              .replace(/_/g, ' ')
              .replace(/([A-Z])/g, ' $1')
              .replace(/^./, (s) => s.toUpperCase())
              .trim();

            return (
            <div key={field.name}>
              {field.type !== 'checkbox' && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {displayLabel}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
              )}

              {field.type === 'textarea' ? (
                <textarea
                  name={field.name}
                  placeholder={field.placeholder}
                  required={field.required}
                  value={(formData[field.name] as string) || ''}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none resize-none"
                />
              ) : field.type === 'select' ? (
                <select
                  name={field.name}
                  required={field.required}
                  value={(formData[field.name] as string) || ''}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                >
                  <option value="">Select an option</option>
                  {field.options?.map((opt) => {
                    // Handle both {label, value} objects and plain strings
                    const optValue = typeof opt === 'string' ? opt : opt.value;
                    const optLabel = typeof opt === 'string' ? opt : opt.label;
                    return (
                      <option key={optValue} value={optValue}>{optLabel}</option>
                    );
                  })}
                </select>
              ) : field.type === 'radio' ? (
                <div className="space-y-2">
                  {field.options?.map((opt) => {
                    const optValue = typeof opt === 'string' ? opt : opt.value;
                    const optLabel = typeof opt === 'string' ? opt : opt.label;
                    return (
                      <label key={optValue} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={field.name}
                          value={optValue}
                          checked={formData[field.name] === optValue}
                          onChange={(e) => handleInputChange(field.name, e.target.value)}
                          className="w-4 h-4 border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                        />
                        <span className="text-sm text-gray-600">{optLabel}</span>
                      </label>
                    );
                  })}
                </div>
              ) : field.type === 'checkbox' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name={field.name}
                    checked={!!formData[field.name]}
                    onChange={(e) => handleInputChange(field.name, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#EAD07D] focus:ring-[#EAD07D]"
                  />
                  <span className="text-sm text-gray-600">{field.placeholder || displayLabel}</span>
                </label>
              ) : (
                <input
                  type={field.type}
                  name={field.name}
                  placeholder={field.placeholder}
                  required={field.required}
                  value={(formData[field.name] as string) || ''}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none"
                />
              )}
            </div>
          );
          })}

          {/* CAPTCHA Section */}
          {settings.enableCaptcha && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck size={18} className="text-[#EAD07D]" />
                <span className="text-sm font-medium text-gray-700">Security Check</span>
              </div>
              <label className="block text-sm text-gray-600 mb-2">
                What is {mathChallenge.num1} {mathChallenge.operator} {mathChallenge.num2}?
              </label>
              <input
                type="number"
                value={captchaAnswer}
                onChange={(e) => {
                  setCaptchaAnswer(e.target.value);
                  setCaptchaError(false);
                }}
                placeholder="Enter your answer"
                className={`w-full px-4 py-2 rounded-xl border ${
                  captchaError
                    ? 'border-red-300 bg-red-50 focus:border-red-400'
                    : 'border-gray-200 bg-white focus:border-[#EAD07D]'
                } focus:ring-2 focus:ring-[#EAD07D]/20 outline-none`}
                required
              />
              {captchaError && (
                <p className="text-red-500 text-xs mt-1">Incorrect answer. Please try again.</p>
              )}
            </div>
          )}

          {submitMutation.error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {(submitMutation.error as Error).message || 'Failed to submit form'}
            </div>
          )}

          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="w-full px-6 py-3 rounded-full text-white font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: styling.buttonColor || styling.primaryColor || '#1A1A1A' }}
          >
            {submitMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              settings.submitButtonText || styling.buttonText || 'Submit'
            )}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          Powered by SalesOS
        </p>
      </div>
    </div>
  );
}

export default PublicForm;
