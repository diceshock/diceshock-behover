import "./style.css";

import clsx from "clsx";

const LensFlare = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={clsx(
            "w-[200vw] h-[200vh] lens-flare",
            "flex items-center justify-center",
            className
        )}
        {...props}
    >
        <div
            className={clsx(
                "w-1/3 h-1/5 lens-flare",
                "flex items-center justify-center"
            )}
        >
            <div className="w-1/2 h-1/2 lens-overexposed"></div>
        </div>
    </div>
);

export default LensFlare;
