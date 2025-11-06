export default function NoiseFilter() {
    return (
        <svg
            viewBox="0 0 100 100"
            style={{ height: 0, width: 0, visibility: "hidden" }}
        >
            <defs>
                <filter
                    id="distort-filter-header-twitter-link"
                    x="0%"
                    y="0%"
                    width="100%"
                    height="100%"
                >
                    <feTurbulence
                        type="fractalNoise"
                        result="NOISE"
                        numOctaves="2"
                        baseFrequency="0 0"
                    >
                        <animate
                            attributeName="baseFrequency"
                            values="0 0;0 0.12;0 0;0 0.41;0 0;0 0.31"
                            dur="500ms"
                            repeatCount="indefinite"
                        />
                    </feTurbulence>
                    <feDisplacementMap
                        in="SourceGraphic"
                        in2="NOISE"
                        scale="30"
                        xChannelSelector="R"
                        yChannelSelector="R"
                    ></feDisplacementMap>
                </filter>
            </defs>
        </svg>
    );
}
