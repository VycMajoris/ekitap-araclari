export interface CachedCorrection {
  key: string;
  originalText: string;
  correctedHtml: string;
  correctedText: string;
  diffCount: number;
  model: string;
  provider: string;
  timestamp: number;
}

const DB_NAME = 'EpubOcrFixerDB';
const DB_VERSION = 1;
const STORE_NAME = 'block_corrections';

let dbInstance: IDBDatabase | null = null;

function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export function generateCacheKey(model: string, text: string): string {
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  const textHash = hashString(normalizedText);
  return `${model || 'default'}_${textHash}_${normalizedText.length}`;
}

export async function getDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }

  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('model', 'model', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        resolve(dbInstance);
      };

      request.onerror = (event) => {
        console.warn('IndexedDB açılamadı, önbellek devre dışı:', (event.target as IDBOpenDBRequest).error);
        resolve(null);
      };
    } catch (e) {
      console.warn('IndexedDB başlatma hatası:', e);
      resolve(null);
    }
  });
}

export async function getCachedCorrection(
  model: string,
  originalText: string
): Promise<CachedCorrection | null> {
  const db = await getDb();
  if (!db) return null;

  const key = generateCacheKey(model, originalText);

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

export async function saveCachedCorrection(correction: Omit<CachedCorrection, 'key' | 'timestamp'>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const key = generateCacheKey(correction.model, correction.originalText);
  const entry: CachedCorrection = {
    ...correction,
    key,
    timestamp: Date.now(),
  };

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(entry);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function saveBatchCachedCorrections(
  corrections: Omit<CachedCorrection, 'key' | 'timestamp'>[]
): Promise<void> {
  if (corrections.length === 0) return;
  const db = await getDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      for (const item of corrections) {
        const key = generateCacheKey(item.model, item.originalText);
        store.put({
          ...item,
          key,
          timestamp: Date.now(),
        });
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function getCacheStats(): Promise<{ count: number; estimatedSizeKb: number }> {
  const db = await getDb();
  if (!db) return { count: 0, estimatedSizeKb: 0 };

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const countReq = store.count();

      countReq.onsuccess = () => {
        const count = countReq.result || 0;
        const estimatedSizeKb = Math.round((count * 1.2));
        resolve({ count, estimatedSizeKb });
      };

      countReq.onerror = () => resolve({ count: 0, estimatedSizeKb: 0 });
    } catch {
      resolve({ count: 0, estimatedSizeKb: 0 });
    }
  });
}

export async function clearCache(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
