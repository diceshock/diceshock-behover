const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32Decode(encoded: string): Uint8Array {
  const cleaned = encoded.replace(/[=\s]/g, "").toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of cleaned) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

export function generateTotpSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

async function hmacSha1(
  key: Uint8Array,
  message: Uint8Array,
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    message.buffer as ArrayBuffer,
  );
  return new Uint8Array(signature);
}

export async function generateTOTP(
  secret: string,
  timeStep = 30,
  digits = 6,
  now?: number,
): Promise<string> {
  const key = base32Decode(secret);
  const time = Math.floor((now ?? Date.now()) / 1000 / timeStep);

  const timeBuffer = new ArrayBuffer(8);
  const view = new DataView(timeBuffer);
  view.setUint32(0, Math.floor(time / 0x100000000), false);
  view.setUint32(4, time & 0xffffffff, false);

  const hmac = await hmacSha1(key, new Uint8Array(timeBuffer));

  // RFC 4226 §5.4 dynamic truncation
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);

  const otp = code % 10 ** digits;
  return otp.toString().padStart(digits, "0");
}

export function getRemainingSeconds(timeStep = 30): number {
  return timeStep - (Math.floor(Date.now() / 1000) % timeStep);
}
