import type React from "react";
import { useState } from "react";
import Image from "@/client/components/image";

const LoadingImg: React.FC<React.ComponentProps<typeof Image>> = (props) => {
  const [isLoading, loading] = useState<boolean>(true);

  return (
    <Image
      className={isLoading ? `skeleton ${props.className}` : props.className}
      {...props}
      alt={props.alt}
      onLoad={() => loading(false)}
    />
  );
};

export default LoadingImg;
