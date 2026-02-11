import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Sparkles } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useToast } from './ui/Toast';

export interface TourStep {
  id: string;
  target: string; // CSS selector for the target element
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  highlightPadding?: number;
  action?: () => void; // Optional action when step is shown
}

interface ProductTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onStepChange?: (step: number) => void;
}

const TOUR_COMPLETED_KEY = 'salesos_product_tour_completed';

export const ProductTour: React.FC<ProductTourProps> = ({
  steps,
  isOpen,
  onClose,
  onComplete,
  onStepChange,
}) => {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Position the tooltip relative to the target element
  const positionTooltip = useCallback(() => {
    if (!step) return;

    const targetElement = document.querySelector(step.target);
    if (!targetElement) {
      console.warn(`Tour target not found: ${step.target}`);
      showToast({ type: 'error', title: 'Tour Step Not Found', message: `Could not find target element for step: ${step.title}` });
      return;
    }

    const rect = targetElement.getBoundingClientRect();
    const padding = step.highlightPadding ?? 8;
    const tooltipWidth = 320;
    const tooltipHeight = 180;
    const offset = 16;

    // Store highlight rect
    setHighlightRect(new DOMRect(
      rect.left - padding,
      rect.top - padding,
      rect.width + padding * 2,
      rect.height + padding * 2
    ));

    // Calculate best position
    let position = step.position || 'auto';

    if (position === 'auto') {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Check available space on each side
      const spaceTop = rect.top;
      const spaceBottom = viewportHeight - rect.bottom;
      const spaceLeft = rect.left;
      const spaceRight = viewportWidth - rect.right;

      // Choose position with most space
      const spaces = [
        { pos: 'bottom', space: spaceBottom },
        { pos: 'top', space: spaceTop },
        { pos: 'right', space: spaceRight },
        { pos: 'left', space: spaceLeft },
      ];
      spaces.sort((a, b) => b.space - a.space);
      position = spaces[0].pos as typeof position;
    }

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = rect.top - tooltipHeight - offset;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = rect.bottom + offset;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - offset;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + offset;
        break;
    }

    // Keep tooltip within viewport
    const margin = 16;
    left = Math.max(margin, Math.min(left, window.innerWidth - tooltipWidth - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - tooltipHeight - margin));

    setTooltipPosition({ top, left });

    // Scroll element into view if needed
    if (rect.top < 100 || rect.bottom > window.innerHeight - 100) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [step]);

  // Update position on step change or window resize
  useEffect(() => {
    if (!isOpen) return;

    positionTooltip();

    const handleResize = () => positionTooltip();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [isOpen, currentStep, positionTooltip]);

  // Execute step action
  useEffect(() => {
    if (isOpen && step?.action) {
      step.action();
    }
  }, [isOpen, step]);

  // Notify parent of step change
  useEffect(() => {
    onStepChange?.(currentStep);
  }, [currentStep, onStepChange]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    onClose();
  };

  if (!isOpen || !step) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Backdrop with highlight cutout */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="tour-highlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {highlightRect && (
              <rect
                x={highlightRect.x}
                y={highlightRect.y}
                width={highlightRect.width}
                height={highlightRect.height}
                rx="12"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.5)"
          mask="url(#tour-highlight-mask)"
        />
      </svg>

      {/* Highlight border */}
      {highlightRect && (
        <div
          className="absolute border-2 border-[#EAD07D] rounded-xl pointer-events-none animate-pulse"
          style={{
            top: highlightRect.y,
            left: highlightRect.x,
            width: highlightRect.width,
            height: highlightRect.height,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute w-80 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 z-10"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1A1A1A]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#EAD07D]" />
            <span className="text-xs font-medium text-white/60">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="text-white/40 hover:text-white/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[#F0EBD8]">
          <div
            className="h-full bg-[#EAD07D] transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">{step.title}</h3>
          <p className="text-sm text-[#666] leading-relaxed">{step.content}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-black/5">
          <button
            onClick={handleSkip}
            className="text-sm text-[#999] hover:text-[#666] transition-colors"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={isFirstStep}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isFirstStep
                  ? 'text-[#999] cursor-not-allowed'
                  : 'text-[#666] hover:bg-[#F8F8F6]'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-1.5 bg-[#1A1A1A] text-white rounded-full text-sm font-medium hover:bg-[#333] transition-colors"
            >
              {isLastStep ? (
                <>
                  <Check className="w-4 h-4" />
                  Finish
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Click blocker (allows clicking on highlighted element) */}
      <div
        className="absolute inset-0"
        onClick={(e) => {
          if (highlightRect) {
            const { clientX, clientY } = e;
            const isInHighlight =
              clientX >= highlightRect.x &&
              clientX <= highlightRect.x + highlightRect.width &&
              clientY >= highlightRect.y &&
              clientY <= highlightRect.y + highlightRect.height;
            if (!isInHighlight) {
              e.preventDefault();
              e.stopPropagation();
            }
          }
        }}
      />
    </div>,
    document.body
  );
};

/**
 * Hook to manage product tour state
 */
export function useProductTour(tourId: string = 'main') {
  const [isOpen, setIsOpen] = useState(false);
  const storageKey = `${TOUR_COMPLETED_KEY}_${tourId}`;

  const isCompleted = localStorage.getItem(storageKey) === 'true';

  const startTour = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeTour = useCallback(() => {
    setIsOpen(false);
  }, []);

  const completeTour = useCallback(() => {
    localStorage.setItem(storageKey, 'true');
    setIsOpen(false);
  }, [storageKey]);

  const resetTour = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    isOpen,
    isCompleted,
    startTour,
    closeTour,
    completeTour,
    resetTour,
  };
}

/**
 * Default dashboard tour steps
 */
export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: '[data-tour="logo"]',
    title: 'Welcome to SalesOS!',
    content: 'Let\'s take a quick tour of the main features. This will only take a minute.',
    position: 'bottom',
  },
  {
    id: 'navigation',
    target: '[data-tour="main-nav"]',
    title: 'Main Navigation',
    content: 'Access your leads, contacts, accounts, and opportunities from here. These are the core areas where you\'ll spend most of your time.',
    position: 'bottom',
  },
  {
    id: 'search',
    target: '[data-tour="search"]',
    title: 'Quick Search',
    content: 'Press Cmd+K (or Ctrl+K) anytime to quickly search across all your data - contacts, deals, companies, and more.',
    position: 'bottom',
  },
  {
    id: 'ai',
    target: '[data-tour="ai-menu"]',
    title: 'AI-Powered Features',
    content: 'Our AI assistant can help you with insights, automate tasks, and provide recommendations to close more deals.',
    position: 'bottom',
  },
  {
    id: 'settings',
    target: '[data-tour="settings-menu"]',
    title: 'Settings & Configuration',
    content: 'Customize your workspace, manage team members, set up integrations, and configure automations here.',
    position: 'bottom',
  },
  {
    id: 'notifications',
    target: '[data-tour="notifications"]',
    title: 'Stay Updated',
    content: 'Get notified about important updates, task reminders, and deal changes. You can customize your notification preferences in settings.',
    position: 'left',
  },
  {
    id: 'complete',
    target: '[data-tour="user-menu"]',
    title: 'You\'re All Set!',
    content: 'That\'s the basics! Explore around, and don\'t hesitate to use the AI assistant if you need help. Happy selling!',
    position: 'left',
  },
];

export default ProductTour;
