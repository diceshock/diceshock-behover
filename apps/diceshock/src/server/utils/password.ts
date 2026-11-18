const ALGORITHM = "PBKDF2";
const HASH = "SHA-256";
const KEY_LENGTH_BITS = 256;
const DEFAULT_ITERATIONS = 600_000;
const SALT_BYTES = 16;

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    ALGORITHM,
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: ALGORITHM, salt: salt as BufferSource, iterations, hash: HASH },
    key,
    KEY_LENGTH_BITS,
  );
}

export async function hashPassword(password: string): Promise<{
  hash: string;
  salt: string;
  iterations: number;
}> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const bits = await deriveKey(password, salt, DEFAULT_ITERATIONS);
  return {
    hash: toHex(bits),
    salt: toHex(salt),
    iterations: DEFAULT_ITERATIONS,
  };
}

export async function verifyPassword(
  password: string,
  hash: string,
  salt: string,
  iterations: number,
): Promise<boolean> {
  const bits = await deriveKey(password, fromHex(salt), iterations);
  const derived = toHex(bits);
  // Constant-time comparison
  if (derived.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < derived.length; i++) {
    diff |= derived.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return diff === 0;
}
