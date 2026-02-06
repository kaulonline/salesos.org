import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  /** ID for the input - will be auto-generated if not provided */
  id?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  hint,
  children,
  className = '',
  id: providedId,
}) => {
  const generatedId = useId();
  const inputId = providedId || generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  // Clone children to inject accessibility props
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      const describedBy = [
        error ? errorId : null,
        hint && !error ? hintId : null,
      ].filter(Boolean).join(' ') || undefined;

      return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
        id: inputId,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        'aria-required': required,
      });
    }
    return child;
  });

  return (
    <div className={className}>
      <label htmlFor={inputId} className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
        {label}
        {required && (
          <>
            <span className="text-red-500 ml-1" aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </>
        )}
      </label>
      {enhancedChildren}
      {error && (
        <div id={errorId} role="alert" className="flex items-center gap-1.5 mt-1.5 text-red-500">
          <AlertCircle size={14} aria-hidden="true" />
          <span className="text-xs">{error}</span>
        </div>
      )}
      {hint && !error && (
        <p id={hintId} className="text-xs text-[#999] mt-1.5">{hint}</p>
      )}
    </div>
  );
};

// Input styles that change based on error state
export const getInputClassName = (hasError?: boolean, baseClassName?: string): string => {
  const base = baseClassName || 'w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-colors';
  const normal = 'bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D]';
  const errorStyle = 'bg-red-50 border border-red-300 focus:bg-white focus:ring-1 focus:ring-red-400';

  return `${base} ${hasError ? errorStyle : normal}`;
};

export default FormField;
