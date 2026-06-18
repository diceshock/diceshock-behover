import { Base64 } from "js-base64";

function decodeAESKey(encodingAESKey: string): Uint8Array {
  return Base64.toUint8Array(encodingAESKey + "=");
}

export async function decryptMessage(
  encrypted: string,
  encodingAESKey: string,
): Promise<string> {
  const aesKey = decodeAESKey(encodingAESKey);
  const iv = aesKey.slice(0, 16);
  const ciphertext = Base64.toUint8Array(encrypted);

  const key = await crypto.subtle.importKey(
    "raw",
    aesKey,
    { name: "AES-CBC" },
    false,
    ["decrypt"],
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv },
    key,
    ciphertext,
  );

  const decryptedBytes = new Uint8Array(decrypted);

  const msgLenBytes = decryptedBytes.slice(16, 20);
  const msgLen =
    (msgLenBytes[0] << 24) |
    (msgLenBytes[1] << 16) |
    (msgLenBytes[2] << 8) |
    msgLenBytes[3];

  const msgBytes = decryptedBytes.slice(20, 20 + msgLen);

  return new TextDecoder().decode(msgBytes);
}

export async function encryptMessage(
  plaintext: string,
  encodingAESKey: string,
  appId: string,
): Promise<string> {
  const aesKey = decodeAESKey(encodingAESKey);
  const iv = aesKey.slice(0, 16);

  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const msgBytes = new TextEncoder().encode(plaintext);
  const appIdBytes = new TextEncoder().encode(appId);

  const msgLen = new Uint8Array(4);
  const dv = new DataView(msgLen.buffer);
  dv.setUint32(0, msgBytes.length, false);

  const totalLen = 16 + 4 + msgBytes.length + appIdBytes.length;
  const padLen = 32 - (totalLen % 32);
  const padBytes = new Uint8Array(padLen).fill(padLen);

  const payload = new Uint8Array(totalLen + padLen);
  payload.set(randomBytes, 0);
  payload.set(msgLen, 16);
  payload.set(msgBytes, 20);
  payload.set(appIdBytes, 20 + msgBytes.length);
  payload.set(padBytes, totalLen);

  const key = await crypto.subtle.importKey(
    "raw",
    aesKey,
    { name: "AES-CBC" },
    false,
    ["encrypt"],
  );

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv },
    key,
    payload,
  );

  return Base64.fromUint8Array(new Uint8Array(ciphertext));
}
