type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type CacheStore = Map<string, CacheEntry<unknown>>;

declare global {
  var __mortgagearch_cache__: CacheStore | undefined;
}

const cacheStore: CacheStore = global.__mortgagearch_cache__ ?? new Map();

if (process.env.NODE_ENV !== "production") {
  global.__mortgagearch_cache__ = cacheStore;
}

export function getServerCache<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    cacheStore.delete(key);
    return null;
  }

  return entry.value as T;
}

export function setServerCache<T>(key: string, value: T, ttlMs: number) {
  cacheStore.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function clearServerCacheByPrefix(prefix: string) {
  cacheStore.forEach((_value, key) => {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  });
}
