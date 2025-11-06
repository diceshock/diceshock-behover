import React from "react";
import { motion, useScroll, useTransform, transform } from "motion/react";

export default function TitleScreen({
    title,
    subTitle,
}: {
    title: React.ReactNode[];
    subTitle: React.ReactNode[];
}) {
    const trackRef = React.useRef<HTMLDivElement>(null);
    const screenRef = React.useRef<HTMLDivElement>(null);

    const { scrollY } = useScroll();
    const progress = useTransform(scrollY, (y) => {
        const trackEl = trackRef.current;
        const screenEl = screenRef.current;

        if (!trackEl || !screenEl) return 0;

        const trackHeight = trackEl.scrollHeight - screenEl.clientHeight;
        const top = trackEl.offsetTop;

        // 与 TheShockScreen 保持一致的进度映射，让出现更自然
        return transform(y - top, [0, trackHeight], [0, 1]);
    });

    // 使用统一段数，保证 title 与 subtitle 在同一索引同步消失
    const segments = Math.max(title.length, subTitle.length);

    return (
        <div ref={trackRef} className="w-full h-[180vh]">
            <div
                ref={screenRef}
                className="sticky top-0 left-0 w-full h-screen"
            >
                <div className="relative size-full flex items-center justify-center">
                    <motion.div>
                        <div className="flex flex-col items-end">
                            <h1 className="text-6xl font-bold">
                                {title.map((node, index) => {
                                    const segmentStart = index / segments;
                                    const segmentEnd = (index + 1) / segments;

                                    const itemOpacity = useTransform(
                                        progress,
                                        [segmentStart, segmentEnd],
                                        [1, 0]
                                    );
                                    const itemY = useTransform(
                                        itemOpacity,
                                        [1, 0],
                                        [0, -12]
                                    );

                                    return (
                                        <motion.span
                                            key={index}
                                            className="inline-block"
                                            style={{
                                                opacity: itemOpacity,
                                                y: itemY,
                                            }}
                                        >
                                            {node}
                                        </motion.span>
                                    );
                                })}
                            </h1>

                            <h2 className="text-3xl font-bold">
                                {subTitle.map((node, index) => {
                                    const segmentStart = index / segments;
                                    const segmentEnd = (index + 1) / segments;

                                    const itemOpacity = useTransform(
                                        progress,
                                        [segmentStart, segmentEnd],
                                        [1, 0]
                                    );
                                    const itemY = useTransform(
                                        itemOpacity,
                                        [1, 0],
                                        [0, -12]
                                    );

                                    return (
                                        <motion.span
                                            key={index}
                                            className="inline-block"
                                            style={{
                                                opacity: itemOpacity,
                                                y: itemY,
                                            }}
                                        >
                                            {node}
                                        </motion.span>
                                    );
                                })}
                            </h2>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
