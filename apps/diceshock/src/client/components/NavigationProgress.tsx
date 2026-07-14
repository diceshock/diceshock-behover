import { animated, useSpringValue } from "@react-spring/web";
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

/**
 * A floating progress bar at the top of every page.
 * Uses TanStack Router's `isLoading` state to drive a fake-progress spring animation.
 * When progress crosses 90%, opacity fades from 1 → 0.
 */
export function NavigationProgress() {
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  const progress = useSpringValue(0, { config: { tension: 30, friction: 20 } });
  const opacity = useSpringValue(1, { config: { tension: 120, friction: 14 } });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Reset and start fake progress
      opacity.start(1);
      progress.start(0, { immediate: true });

      // Incrementally advance toward 90% using a spring-friendly step
      let current = 0;
      timerRef.current = setInterval(() => {
        // Diminishing increments — slows down as it approaches 90%
        const remaining = 90 - current;
        const increment = remaining * 0.08;
        current = Math.min(current + increment, 90);
        progress.start(current);
      }, 200);
    } else {
      // Navigation finished — jump to 100% then fade out
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      progress.start(100, { config: { tension: 300, friction: 20 } });
      opacity.start(0, { delay: 200, config: { tension: 120, friction: 14 } });
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLoading, progress, opacity]);

  return (
    <animated.div
      className="fixed top-0 inset-x-0 z-[9999] h-[3px] pointer-events-none"
      style={{ opacity }}
    >
      <animated.div
        className="h-full bg-primary origin-left"
        style={{
          transform: progress.to((p) => `scaleX(${p / 100})`),
        }}
      />
    </animated.div>
  );
}
