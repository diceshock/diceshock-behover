import _ from "lodash/fp";
import React from "react";

const Gradient: React.FC<{
    gradient?: number;
    direction?: "row" | "col";
    className?: { main?: string; a?: string; b?: string };
}> = ({ gradient = 10, direction = "row", className }) => {
    const { main, a, b } = className ?? {};

    return (
        <div
            className={`flex ${main} ${
                direction === "row" ? "flex-row" : "flex-col"
            }`}
        >
            {_.range(0, gradient).map((_i, i) => (
                <React.Fragment key={i}>
                    <div
                        className={`size-full ${a}`}
                        style={
                            direction === "row"
                                ? {
                                      width: `${i}rem`,
                                  }
                                : {
                                      height: `${i}rem`,
                                  }
                        }
                    />

                    <div
                        className={`size-full ${b}`}
                        style={
                            direction === "row"
                                ? {
                                      width: `${gradient - i}rem`,
                                  }
                                : {
                                      height: `${gradient - i}rem`,
                                  }
                        }
                    />
                </React.Fragment>
            ))}
        </div>
    );
};

export default Gradient;
