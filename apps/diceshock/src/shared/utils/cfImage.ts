const CDN_BASE = "https://assets.runespark.fun/";

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  fit?: "cover" | "contain" | "scale-down" | "crop" | "pad";
  quality?: number;
  format?: "webp" | "avif" | "jpeg" | "png";
}

export function cfImageUrl(
  rawUrl: string,
  opts: ImageTransformOptions = {},
): string {
  const { width, height, fit = "cover", quality = 80, format = "webp" } = opts;

  const parts: string[] = [
    `format=${format}`,
    `quality=${quality}`,
    `fit=${fit}`,
  ];
  if (width) parts.push(`width=${width}`);
  if (height) parts.push(`height=${height}`);

  const origin = rawUrl.startsWith(CDN_BASE) ? rawUrl : `${CDN_BASE}${rawUrl}`;
  return `${CDN_BASE}cdn-cgi/image/${parts.join(",")}/${origin}`;
}

export function cfAvatarUrl(rawUrl: string, size = 256): string {
  return cfImageUrl(rawUrl, { width: size, height: size, fit: "cover" });
}

export function cfThumbUrl(rawUrl: string, width = 400): string {
  return cfImageUrl(rawUrl, { width, fit: "scale-down" });
}
