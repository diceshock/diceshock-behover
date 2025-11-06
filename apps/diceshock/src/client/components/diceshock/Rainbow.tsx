import React from "react";
import _ from "lodash/fp";

const { ceil } = Math;

const Rainbow: React.FC<{
    gradient?: number;
    direction?: "row" | "col";
    className?: string;
}> = ({ gradient = 5, className, direction = "row" }) => {
    const levels = ceil(gradient / 2);

    return (
        <div
            className={`flex ${className} ${
                direction === "row" ? "flex-row" : "flex-col"
            }`}
        >
            <div
                className={`size-full flex bg-primary mix-blend-normal ${
                    direction === "row" ? "flex-row" : "flex-col"
                }`}
            >
                {_.range(0, levels).map((i) => (
                    <span
                        key={i}
                        className="size-full bg-secondary"
                        style={{ opacity: i / levels }}
                    />
                ))}
            </div>
            <div
                className={`size-full flex ${
                    direction === "row" ? "flex-row" : "flex-col"
                }`}
            >
                {_.range(0, levels).map((i) => (
                    <span
                        key={i}
                        className="size-full bg-secondary"
                        style={{ opacity: 1 - i / levels }}
                    />
                ))}
            </div>
        </div>
    );
};

export default Rainbow;
