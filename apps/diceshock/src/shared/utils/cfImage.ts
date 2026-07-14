export const CDN_BASE = "https://assets.runespark.fun/";
const CDN_PATH = "/cdn/";

/** Convert an R2 object key to a client-facing URL path */
export function cdnUrl(key: string): string {
  return `${CDN_PATH}${key}`;
}

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  fit?: "cover" | "contain" | "scale-down" | "crop" | "pad";
  quality?: number;
  format?: "webp" | "avif" | "jpeg" | "png";
}

export function cfImageUrl(
  rawUrl: string,
  _opts: ImageTransformOptions = {},
): string {
  // Use /cdn/ path prefix so assets route through the same origin (GFW-safe)
  if (rawUrl.startsWith(CDN_BASE)) {
    return CDN_PATH + rawUrl.slice(CDN_BASE.length);
  }
  if (rawUrl.startsWith("/") || rawUrl.startsWith("http")) {
    return rawUrl;
  }
  return `${CDN_PATH}${rawUrl}`;
}

export function cfAvatarUrl(rawUrl: string, size = 256): string {
  return cfImageUrl(rawUrl, { width: size, height: size, fit: "cover" });
}

export function cfThumbUrl(rawUrl: string, width = 400): string {
  return cfImageUrl(rawUrl, { width, fit: "scale-down" });
}

export function avatarCardUrl(userId: string): string {
  return `/edge/media/card/avatar/${userId}`;
}
