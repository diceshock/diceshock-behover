import Image from "@/client/components/image";
import React, { useState } from "react";

const LoadingImg: React.FC<React.ComponentProps<typeof Image>> = (props) => {
    const [isLoading, loading] = useState<boolean>(true);

    return (
        <Image
            className={
                isLoading ? `skeleton ${props.className}` : props.className
            }
            {...props}
            alt={props.alt}
            onLoad={() => loading(false)}
        />
    );
};

export default LoadingImg;
