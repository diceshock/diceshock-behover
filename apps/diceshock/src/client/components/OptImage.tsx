import clsx from "clsx";
import { useState } from "react";
import { cfImageUrl, type ImageTransformOptions } from "@/shared/utils/cfImage";

interface OptImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  rawSrc: string;
  transform?: ImageTransformOptions;
  placeholderClass?: string;
}

export default function OptImage({
  rawSrc,
  transform,
  className,
  placeholderClass,
  alt = "",
  ...rest
}: OptImageProps) {
  const [loaded, setLoaded] = useState(false);
  const src = cfImageUrl(rawSrc, transform);

  return (
    <div className={clsx("relative overflow-hidden", className)}>
      {!loaded && (
        <div
          className={clsx(
            "absolute inset-0 animate-pulse bg-base-300",
            placeholderClass,
          )}
        />
      )}
      <img
        src={src}
        alt={alt}
        className={clsx(
          "size-full object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setLoaded(true)}
        loading="lazy"
        {...rest}
      />
    </div>
  );
}
