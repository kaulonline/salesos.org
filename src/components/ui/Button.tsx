import * as React from "react";
import { cn } from "../../lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "outline" | "ghost" | "link" | "accent";
    size?: "default" | "sm" | "lg" | "icon";
    isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "primary", size = "default", isLoading, children, disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={isLoading || disabled}
                className={cn(
                    "inline-flex items-center justify-center rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50",
                    {
                        "bg-[#1A1A1A] text-white hover:bg-[#333] shadow-sm": variant === "primary",
                        "bg-[#F2F1EA] text-[#1A1A1A] hover:bg-[#F2F1EA]/80": variant === "secondary",
                        "border border-black/10 bg-transparent text-[#666] hover:bg-white hover:text-[#1A1A1A]": variant === "outline",
                        "hover:bg-[#F8F8F6] text-[#666] hover:text-[#1A1A1A]": variant === "ghost",
                        "text-[#1A1A1A] underline-offset-4 hover:underline": variant === "link",
                        "bg-[#EAD07D] text-[#1A1A1A] hover:bg-[#EAD07D]/90 shadow-sm font-semibold": variant === "accent",
                        "h-10 px-5 py-2.5 text-sm": size === "default",
                        "h-8 px-4 text-xs": size === "sm",
                        "h-12 px-8 text-base": size === "lg",
                        "h-10 w-10 p-0": size === "icon",
                    },
                    className
                )}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
            </button>
        );
    }
);
Button.displayName = "Button";

export { Button };
