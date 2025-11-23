import type { AnimationConfig, SpringValue } from "@react-spring/web";
import { useCallback, useMemo, useRef } from "react";

const useAMoment = (
  progress: SpringValue<number>,
  options: {
    onRest?: () => void;
    config?: AnimationConfig;
    delay?: number;
  } = {},
) => {
  const { onRest, delay = 4000, config } = useRef(options).current;

  const show = useCallback(
    (f?: () => void) => {
      f?.();
      progress.set(1);
      progress.start(0, {
        onRest,
        delay,
        config: {
          friction: 30,
          tension: 120,
          ...config,
        },
      });
    },
    [config, delay, onRest, progress.set, progress.start],
  );

  const styles = useMemo(
    () => ({
      zoom: progress.to((p) => 0.8 + p * 0.2),
      opacity: progress,
    }),
    [progress],
  );

  return { progress, show, styles };
};

export default useAMoment;
