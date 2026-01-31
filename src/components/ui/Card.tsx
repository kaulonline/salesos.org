import { motion, HTMLMotionProps } from "framer-motion";
import React from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends HTMLMotionProps<"div"> {
    variant?: "default" | "small" | "dark" | "flat" | "yellow";
    padding?: "none" | "sm" | "md" | "lg";
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = "default", padding, ...props }, ref) => {
        const isInteractive = variant === "default" || variant === "small" || variant === "dark" || variant === "yellow";

        const paddingClasses = {
            none: "p-0",
            sm: "p-4",
            md: "p-5",
            lg: "p-8",
        };

        return (
            <motion.div
                ref={ref}
                layout
                whileHover={isInteractive ? { y: -4, transition: { duration: 0.2 } } : undefined}
                className={cn(
                    "transition-shadow duration-200 relative overflow-hidden",
                    {
                        "bg-white rounded-[32px] p-6 shadow-sm hover:shadow-md border border-black/5": variant === "default",
                        "bg-white rounded-[24px] p-5 shadow-sm hover:shadow-md border border-black/5": variant === "small",
                        "bg-[#1A1A1A] text-white rounded-[32px] p-6 shadow-lg hover:shadow-xl": variant === "dark",
                        "bg-transparent border-none shadow-none p-0": variant === "flat",
                        "bg-[#EAD07D] rounded-[24px] p-5 shadow-sm hover:shadow-md": variant === "yellow",
                    },
                    padding && paddingClasses[padding],
                    className
                )}
                {...props}
            />
        );
    }
);
Card.displayName = "Card";

export { Card };
