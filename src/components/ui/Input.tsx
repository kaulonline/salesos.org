import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: React.ReactNode;
    /** Error message to display */
    error?: string;
    /** Hint text to display below input */
    hint?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, icon, error, hint, id, "aria-describedby": ariaDescribedBy, ...props }, ref) => {
        const errorId = error && id ? `${id}-error` : undefined;
        const hintId = hint && id ? `${id}-hint` : undefined;
        const describedBy = [ariaDescribedBy, errorId, hintId].filter(Boolean).join(' ') || undefined;

        return (
            <div className="relative w-full">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999] pointer-events-none [&>svg]:size-4" aria-hidden="true">
                        {icon}
                    </div>
                )}
                <input
                    type={type}
                    id={id}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    className={cn(
                        "flex w-full rounded-xl bg-[#F8F8F6] px-4 py-2.5 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#999] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#EAD07D] focus-visible:bg-white disabled:cursor-not-allowed disabled:opacity-50 transition-colors border-transparent border",
                        icon && "pl-10",
                        error && "border-red-300 bg-red-50 focus-visible:ring-red-400",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {error && (
                    <p id={errorId} className="text-xs text-red-500 mt-1" role="alert">
                        {error}
                    </p>
                )}
                {hint && !error && (
                    <p id={hintId} className="text-xs text-[#999] mt-1">
                        {hint}
                    </p>
                )}
            </div>
        );
    }
);
Input.displayName = "Input";

export { Input };
