
const PIXEL_SIZE = 4;

export default function InPixelFilter() {
    return (
        <svg className="size-0">
            <defs>
                <filter
                    id="inPixelF"
                    x={0}
                    y={0}
                    width="200%"
                    height="200%"
                >
                    {/* First layer: Normal pixelation effect*/}
                    <feFlood x={1} y={1} height={1} width={1} />
                    <feComposite
                        id="composite"
                        in2="SourceGraphic"
                        operator="in"
                        width={PIXEL_SIZE}
                        height={PIXEL_SIZE}
                    />
                    <feTile result="tiled" />
                    <feComposite in="SourceGraphic" in2="tiled" operator="in" />
                    <feMorphology
                        id="morphology"
                        operator="dilate"
                        radius={PIXEL_SIZE / 2}
                        result="dilatedPixelation"
                    />
                    {/* Second layer: Fallback with full-width tiling*/}
                    <feFlood
                        x={1}
                        y={1}
                        height={1}
                        width={1}
                        result="floodFallbackX"
                    />
                    <feComposite
                        id="compositeX"
                        in2="SourceGraphic"
                        operator="in"
                        width={PIXEL_SIZE / 2}
                        height={PIXEL_SIZE}
                    />
                    <feTile result="fullTileX" />
                    <feComposite
                        in="SourceGraphic"
                        in2="fullTileX"
                        operator="in"
                    />
                    <feMorphology
                        id="morphologyX"
                        operator="dilate"
                        radius={PIXEL_SIZE / 2}
                        result="dilatedFallbackX"
                    />
                    {/* Third layer: Fallback with full-height tiling*/}
                    <feFlood x={1} y={1} height={1} width={1} />
                    <feComposite
                        id="compositeY"
                        in2="SourceGraphic"
                        operator="in"
                        width={PIXEL_SIZE}
                        height={PIXEL_SIZE / 2}
                    />
                    <feTile result="fullTileY" />
                    <feComposite
                        in="SourceGraphic"
                        in2="fullTileY"
                        operator="in"
                    />
                    <feMorphology
                        id="morphologyY"
                        operator="dilate"
                        radius={PIXEL_SIZE / 2}
                        result="dilatedFallbackY"
                    />
                    {/* Combine all three layers*/}
                    <feMerge>
                        <feMergeNode in="dilatedFallbackX" />
                        <feMergeNode in="dilatedFallbackY" />
                        <feMergeNode in="dilatedPixelation" />
                    </feMerge>
                </filter>
            </defs>
        </svg>
    );
}
