import React, { useState, useEffect } from 'react';
import { Tag, Check, X, Loader2, AlertCircle, Percent, DollarSign, Sparkles } from 'lucide-react';
import { usePromoCodeValidation, useApplyDiscount } from '../../hooks/useDiscountRules';
import type { DiscountValidationResult, DiscountRule } from '../../types/discountRule';

interface DiscountCodeInputProps {
  quoteId: string;
  appliedDiscounts?: DiscountRule[];
  onDiscountApplied?: (result: DiscountValidationResult) => void;
  onDiscountRemoved?: (ruleId: string) => void;
  disabled?: boolean;
}

export function DiscountCodeInput({
  quoteId,
  appliedDiscounts = [],
  onDiscountApplied,
  onDiscountRemoved,
  disabled = false,
}: DiscountCodeInputProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { validate, isValidating, result, error: validationError, reset } = usePromoCodeValidation();
  const { apply, remove, isApplying, isRemoving } = useApplyDiscount();

  // Handle validation result
  useEffect(() => {
    if (result) {
      if (result.valid) {
        setSuccess(`Discount applied: ${formatDiscount(result.discountAmount, result.rule)}`);
        setError(null);
        setCode('');
        onDiscountApplied?.(result);
      } else {
        setError(result.message || 'Invalid code');
        setSuccess(null);
      }
      // Clear after 3 seconds
      setTimeout(() => {
        setSuccess(null);
        reset();
      }, 3000);
    }
  }, [result]);

  useEffect(() => {
    if (validationError) {
      setError(validationError);
      setSuccess(null);
    }
  }, [validationError]);

  const formatDiscount = (amount: number, rule?: DiscountRule) => {
    if (rule?.discountType === 'PERCENTAGE') {
      return `${rule.discount}% off`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleApply = async () => {
    if (!code.trim()) {
      setError('Please enter a discount code');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await validate(code.trim().toUpperCase(), quoteId);
    } catch (err: any) {
      setError(err.message || 'Failed to validate code');
    }
  };

  const handleRemove = async (ruleId: string) => {
    try {
      await remove(quoteId, ruleId);
      onDiscountRemoved?.(ruleId);
    } catch (err: any) {
      setError(err.message || 'Failed to remove discount');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  return (
    <div className="space-y-3">
      {/* Applied Discounts */}
      {appliedDiscounts.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-[#666] uppercase tracking-wider">
            Applied Discounts
          </div>
          {appliedDiscounts.map((discount) => (
            <div
              key={discount.id}
              className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  {discount.discountType === 'PERCENTAGE' ? (
                    <Percent size={14} className="text-green-600" />
                  ) : (
                    <DollarSign size={14} className="text-green-600" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-green-800">{discount.name}</div>
                  <div className="text-xs text-green-600">
                    {discount.code && <span className="font-mono">{discount.code} · </span>}
                    {discount.discountType === 'PERCENTAGE'
                      ? `${discount.discount}% off`
                      : `$${discount.discount} off`}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(discount.id)}
                disabled={isRemoving || disabled}
                className="p-1.5 text-green-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {isRemoving ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Code Input */}
      <div>
        <div className="text-xs font-medium text-[#666] uppercase tracking-wider mb-2">
          Have a promo code?
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter code"
              disabled={disabled || isValidating || isApplying}
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8F8F6] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#EAD07D] font-mono uppercase disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <button
            type="button"
            onClick={handleApply}
            disabled={!code.trim() || disabled || isValidating || isApplying}
            className="px-4 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isValidating || isApplying ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            Apply
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
            <Check size={14} />
            {success}
          </div>
        )}
      </div>

      {/* Available Discounts Hint */}
      {appliedDiscounts.length === 0 && (
        <p className="text-xs text-[#999]">
          Enter a promotional code to apply a discount to this quote.
        </p>
      )}
    </div>
  );
}

export default DiscountCodeInput;
