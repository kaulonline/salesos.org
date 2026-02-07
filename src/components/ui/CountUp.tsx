import { useRef, useEffect } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

interface CountUpProps {
    end: number;
    duration?: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
}

export function CountUp({
    end,
    duration = 2,
    decimals = 0,
    prefix = "",
    suffix = "",
    className = "",
}: CountUpProps) {
    const ref = useRef<HTMLSpanElement>(null);
    const motionValue = useMotionValue(0);
    const springValue = useSpring(motionValue, {
        damping: 60,
        stiffness: 100,
        duration: duration * 1000,
    });
    const isInView = useInView(ref, { once: true, margin: "-10px" });

    useEffect(() => {
        if (isInView) {
            motionValue.set(end);
        }
    }, [isInView, end, motionValue]);

    useEffect(() => {
        return springValue.on("change", (latest) => {
            if (ref.current) {
                ref.current.textContent = `${prefix}${latest.toLocaleString(
                    "en-US",
                    {
                        minimumFractionDigits: decimals,
                        maximumFractionDigits: decimals
                    }
                )}${suffix}`;
            }
        });
    }, [springValue, decimals, prefix, suffix]);

    return <span className={className} ref={ref} />;
}
