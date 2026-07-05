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
  _opts: ImageTransformOptions = {},
): string {
  // cdn-cgi/image/ transform is unavailable on this zone — pass through raw URL
  return rawUrl.startsWith(CDN_BASE) ? rawUrl : `${CDN_BASE}${rawUrl}`;
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
