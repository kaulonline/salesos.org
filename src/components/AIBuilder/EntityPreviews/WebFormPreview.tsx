/**
 * Web Form Preview
 * Visual preview of AI-generated web form configuration
 */

import React from 'react';
import { WebFormConfig } from '../../../types/aiBuilder';
import { cn } from '../../../lib/utils';

interface WebFormPreviewProps {
  config: WebFormConfig;
  className?: string;
}

export function WebFormPreview({ config, className }: WebFormPreviewProps) {
  const { name, description, fields, settings, styling, thankYouMessage } = config;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Form Header */}
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold text-[#1A1A1A]">{name}</h3>
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>

      {/* Form Preview */}
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{
          backgroundColor: styling?.backgroundColor || '#ffffff',
          color: styling?.textColor || '#1A1A1A',
        }}
      >
        {fields?.map((field, index) => (
          <div key={index} className="space-y-1.5">
            {settings?.showLabels !== false && (
              <label className="block text-sm font-medium">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}

            {/* Text/Email/Phone/Number Input */}
            {['text', 'email', 'phone', 'number'].includes(field.type) && (
              <input
                type={field.type}
                placeholder={settings?.showPlaceholders !== false ? field.placeholder : ''}
                disabled
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-0 text-sm placeholder:text-gray-400"
                style={{ borderRadius: styling?.borderRadius || '0.75rem' }}
              />
            )}

            {/* Textarea */}
            {field.type === 'textarea' && (
              <textarea
                placeholder={settings?.showPlaceholders !== false ? field.placeholder : ''}
                disabled
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-0 text-sm placeholder:text-gray-400 resize-none"
                style={{ borderRadius: styling?.borderRadius || '0.75rem' }}
              />
            )}

            {/* Select */}
            {field.type === 'select' && (
              <select
                disabled
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-0 text-sm text-gray-400"
                style={{ borderRadius: styling?.borderRadius || '0.75rem' }}
              >
                <option>{field.placeholder || 'Select an option'}</option>
                {field.options?.map((opt, i) => (
                  <option key={i} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}

            {/* Radio */}
            {field.type === 'radio' && (
              <div className="space-y-2">
                {field.options?.map((opt, i) => (
                  <label key={i} className="flex items-center gap-2 text-sm">
                    <input type="radio" disabled className="w-4 h-4" />
                    {opt.label}
                  </label>
                ))}
              </div>
            )}

            {/* Checkbox */}
            {field.type === 'checkbox' && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" disabled className="w-4 h-4 rounded" />
                {field.placeholder || field.label}
              </label>
            )}

            {/* Date */}
            {field.type === 'date' && (
              <input
                type="date"
                disabled
                className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-0 text-sm"
                style={{ borderRadius: styling?.borderRadius || '0.75rem' }}
              />
            )}
          </div>
        ))}

        {/* Submit Button */}
        <button
          disabled
          className="w-full py-2.5 rounded-full font-medium text-sm transition-colors"
          style={{
            backgroundColor: styling?.buttonColor || '#EAD07D',
            color: styling?.buttonTextColor || '#1A1A1A',
          }}
        >
          {settings?.submitButtonText || 'Submit'}
        </button>
      </div>

      {/* Thank You Message Preview */}
      {thankYouMessage && (
        <div className="text-center p-4 bg-green-50 rounded-xl">
          <p className="text-sm text-green-700">{thankYouMessage}</p>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
        <span>{fields?.length || 0} fields</span>
        <span>{fields?.filter(f => f.required).length || 0} required</span>
        {settings?.enableCaptcha && <span>CAPTCHA enabled</span>}
      </div>
    </div>
  );
}

export default WebFormPreview;
