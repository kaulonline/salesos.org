import * as React from "react";
import { cn } from "../../lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
    ({ className, variant = "default", ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    {
                        "border-transparent bg-[#EAD07D] text-[#1A1A1A] hover:bg-[#EAD07D]/80": variant === "default",
                        "border-transparent bg-[#1A1A1A] text-white hover:bg-[#1A1A1A]/80": variant === "secondary",
                        "border-transparent bg-red-100 text-red-700 hover:bg-red-100/80": variant === "destructive",
                        "text-[#1A1A1A] border-black/10": variant === "outline",
                        "border-transparent bg-[#93C01F]/20 text-[#93C01F] hover:bg-[#93C01F]/30": variant === "success",
                        "border-transparent bg-[#EAD07D]/20 text-[#1A1A1A] hover:bg-[#EAD07D]/30": variant === "warning",
                    },
                    className
                )}
                {...props}
            />
        );
    }
);
Badge.displayName = "Badge";

export { Badge };
