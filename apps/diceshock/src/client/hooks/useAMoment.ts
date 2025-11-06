import { AnimationConfig, SpringValue } from "@react-spring/web";
import { useMemo } from "react";

const useAMoment = (
    progress: SpringValue<number>,
    {
        onRest,
        delay = 4000,
        config,
    }: {
        onRest?: () => void;
        config?: AnimationConfig;
        delay?: number;
    } = {}
) => {
    const show = (f?: () => void) => {
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
    };

    const styles = useMemo(
        () => ({
            zoom: progress.to((p) => 0.8 + p * 0.2),
            opacity: progress,
        }),
        [progress]
    );

    return { progress, show, styles };
};

export default useAMoment;
