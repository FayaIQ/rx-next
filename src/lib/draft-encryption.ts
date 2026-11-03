const KEY_DATABASE = "rx-draft-keys";
const KEY_STORE = "keys";

export type EncryptedDraft = { version: 2; doctorId: number; iv: string; ciphertext: string };

function encode(bytes: Uint8Array): string {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

function decode(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(text), ch => ch.charCodeAt(0));
}

export async function createDraftKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

const keys = new Map<number, Promise<CryptoKey>>();

/** Persist only a non-extractable CryptoKey in IndexedDB; never serialize it. */
export function getDraftKey(doctorId: number): Promise<CryptoKey> {
  const existing = keys.get(doctorId);
  if (existing) return existing;
  const pending = (async () => {
    const candidate = await createDraftKey();
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open(KEY_DATABASE, 1);
      open.onupgradeneeded = () => open.result.createObjectStore(KEY_STORE);
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
      open.onblocked = () => reject(new Error("Draft key storage is blocked"));
    });
    try {
      return await new Promise<CryptoKey>((resolve, reject) => {
        // A read-write transaction serializes first use across different tabs.
        const tx = database.transaction(KEY_STORE, "readwrite");
        const store = tx.objectStore(KEY_STORE);
        const get = store.get(doctorId);
        let key = candidate;
        get.onsuccess = () => {
          if (get.result) key = get.result as CryptoKey;
          else store.add(candidate, doctorId);
        };
        tx.oncomplete = () => resolve(key);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error("Draft key storage was aborted"));
      });
    } finally {
      database.close();
    }
  })();
  keys.set(doctorId, pending);
  void pending.catch(() => { if (keys.get(doctorId) === pending) keys.delete(doctorId); });
  return pending;
}

export async function encryptDraft(text: string, doctorId: number, key: CryptoKey): Promise<EncryptedDraft> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(`rx-draft:v2:${doctorId}`) }, key, new TextEncoder().encode(text));
  return { version: 2, doctorId, iv: encode(iv), ciphertext: encode(new Uint8Array(ciphertext)) };
}

export async function decryptDraft(value: EncryptedDraft, doctorId: number, key: CryptoKey): Promise<string> {
  if (value.version !== 2 || value.doctorId !== doctorId || typeof value.iv !== "string" || typeof value.ciphertext !== "string" || value.ciphertext.length > 8 * 1024 * 1024) throw new Error("Invalid encrypted draft");
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(value.iv), additionalData: new TextEncoder().encode(`rx-draft:v2:${doctorId}`) }, key, decode(value.ciphertext));
  return new TextDecoder().decode(plaintext);
}
