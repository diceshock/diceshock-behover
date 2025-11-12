/** biome-ignore-all lint/a11y/useAltText: comp */

import type React from "react";

export default function Image({ ...props }: {} & React.ComponentProps<"img">) {
  return <img {...props} />;
}
