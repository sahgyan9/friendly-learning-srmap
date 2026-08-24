// AES-256-GCM encrypt/decrypt for the one sensitive value this project stores
// at rest: a mentor's SRM portal DOB (their real portal password). The
// primitives are shared because the algorithm must be identical on both
// sides; WHEN each is called stays split (only import-srm-portal's step:"link"
// encrypts, only sync-srm-portal decrypts) — see srm-portal.ts's header
// comment for why that split matters.
//
// The key lives ONLY in the SRM_DOB_ENCRYPTION_KEY Supabase Function secret —
// never in Postgres, never in Vault. See srm_portal_credentials' migration
// comment for the full threat-model reasoning. Generate the key once with:
//   openssl rand -base64 32
// and set it with `supabase secrets set SRM_DOB_ENCRYPTION_KEY=...`.

const IV_LENGTH_BYTES = 12; // standard/recommended GCM nonce size

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function importKey(): Promise<CryptoKey> {
  const rawKey = Deno.env.get("SRM_DOB_ENCRYPTION_KEY");
  if (!rawKey) throw new Error("SRM_DOB_ENCRYPTION_KEY is not configured.");
  const keyBytes = base64ToBytes(rawKey);
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export interface EncryptedDob {
  ciphertext: string; // base64
  iv: string; // base64
}

/**
 * Encrypts a plaintext DOB, binding the ciphertext to `userId` via GCM's
 * associated-data parameter so a ciphertext+iv pair from one row can't be
 * swapped into another row and silently "succeed" — the auth tag fails to
 * verify if the AAD doesn't match at decrypt time.
 */
export async function encryptDob(plaintextDob: string, userId: string): Promise<EncryptedDob> {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const additionalData = new TextEncoder().encode(userId);
  const plaintextBytes = new TextEncoder().encode(plaintextDob);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData },
    key,
    plaintextBytes,
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertextBuffer)),
    iv: bytesToBase64(iv),
  };
}

/** Decrypts a stored DOB. Throws if the ciphertext/iv/userId don't match. */
export async function decryptDob(ciphertext: string, iv: string, userId: string): Promise<string> {
  const key = await importKey();
  const additionalData = new TextEncoder().encode(userId);

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv), additionalData },
    key,
    base64ToBytes(ciphertext),
  );

  return new TextDecoder().decode(plaintextBuffer);
}
