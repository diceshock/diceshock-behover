import React from "react";

export default function Image({ ...props }: {} & React.ComponentProps<"img">) {
    return <img {...props} />;
}
