import { useEffect, useMemo } from "react";
import { useInView, useScroll } from "@react-spring/web";

const useSticky = () => {
    const [ref, inView] = useInView();
    const { scrollY } = useScroll();

    const progress = useMemo(
        () =>
            scrollY.to((y) => {
                if (!ref.current) return 0;

                const { offsetTop, scrollHeight } =
                    ref.current as HTMLDivElement;

                return (y - offsetTop) / scrollHeight;
            }),
        [ref, scrollY]
    );

    useEffect(() => {
        if (!inView) return;

        const ctrler = new AbortController();
        const container = document.scrollingElement;

        if (!container) return;

        container.addEventListener(
            "scroll",
            () => scrollY.start(container.scrollTop),
            {
                signal: ctrler.signal,
            }
        );

        return () => ctrler.abort();
    }, [inView, scrollY]);

    return { ref, progress, inView };
};

export default useSticky;
