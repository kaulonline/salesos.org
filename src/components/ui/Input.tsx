import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, icon, ...props }, ref) => {
        return (
            <div className="relative w-full">
                {icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999] pointer-events-none [&>svg]:size-4">
                        {icon}
                    </div>
                )}
                <input
                    type={type}
                    className={cn(
                        "flex w-full rounded-xl bg-[#F8F8F6] px-4 py-2.5 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#999] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#EAD07D] focus-visible:bg-white disabled:cursor-not-allowed disabled:opacity-50 transition-colors border-transparent border",
                        icon && "pl-10",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
            </div>
        );
    }
);
Input.displayName = "Input";

export { Input };
