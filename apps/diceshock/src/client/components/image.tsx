/** biome-ignore-all lint/a11y/useAltText: comp */

import type React from "react";
import { cfImageUrl } from "@/shared/utils/cfImage";

export default function Image({ src, ...props }: React.ComponentProps<"img">) {
  return <img src={src ? cfImageUrl(src) : undefined} {...props} />;
}
