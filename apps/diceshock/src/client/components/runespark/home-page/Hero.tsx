import ZdogComponent from "./Zdog";

const END_SLASH = (
    <span className="absolute top-1 -right-7 rotate-12 size-8 bg-base-200 border-l-2" />
);

export default function Hero() {
    return (
        <div className="h-[calc(100vh-64px)] bg-base-100 flex overflow-hidden relative z-10">
            <ZdogComponent />

            <div className="size-[300%] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [backdrop-filter:url(#inPixelF)] pointer-events-none" />

            <div
                className="size-[300%] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(var(--color-base-100) 1px, transparent 1px)`,
                    backgroundSize: "3px 3px",
                }}
            />
        </div>
    );
}
