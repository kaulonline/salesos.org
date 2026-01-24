import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema
interface SalesOSDB extends DBSchema {
  // Cached entities for offline access
  entities: {
    key: string;
    value: {
      type: 'lead' | 'contact' | 'company' | 'deal' | 'task' | 'meeting';
      id: string;
      data: unknown;
      cachedAt: number;
      expiresAt: number;
    };
    indexes: { 'by-type': string; 'by-expiry': number };
  };

  // Pending mutations to sync when online
  pendingMutations: {
    key: number;
    value: {
      id?: number;
      type: 'create' | 'update' | 'delete';
      entity: string;
      entityId?: string;
      data?: unknown;
      timestamp: number;
      retries: number;
    };
  };

  // Query cache
  queryCache: {
    key: string;
    value: {
      queryKey: string;
      data: unknown;
      cachedAt: number;
      expiresAt: number;
    };
    indexes: { 'by-expiry': number };
  };

  // User preferences
  preferences: {
    key: string;
    value: unknown;
  };
}

const DB_NAME = 'salesos-offline';
const DB_VERSION = 1;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

let db: IDBPDatabase<SalesOSDB> | null = null;

// Initialize database
export async function initOfflineStorage(): Promise<IDBPDatabase<SalesOSDB>> {
  if (db) return db;

  db = await openDB<SalesOSDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      // Entities store
      const entityStore = database.createObjectStore('entities', { keyPath: 'id' });
      entityStore.createIndex('by-type', 'type');
      entityStore.createIndex('by-expiry', 'expiresAt');

      // Pending mutations store
      database.createObjectStore('pendingMutations', {
        keyPath: 'id',
        autoIncrement: true,
      });

      // Query cache store
      const queryStore = database.createObjectStore('queryCache', { keyPath: 'queryKey' });
      queryStore.createIndex('by-expiry', 'expiresAt');

      // Preferences store
      database.createObjectStore('preferences');
    },
  });

  return db;
}

// Get database instance
async function getDB(): Promise<IDBPDatabase<SalesOSDB>> {
  if (!db) {
    await initOfflineStorage();
  }
  return db!;
}

// Entity operations
export async function cacheEntity(
  type: SalesOSDB['entities']['value']['type'],
  id: string,
  data: unknown
): Promise<void> {
  const database = await getDB();
  const now = Date.now();

  await database.put('entities', {
    type,
    id: `${type}:${id}`,
    data,
    cachedAt: now,
    expiresAt: now + CACHE_DURATION,
  });
}

export async function getEntity<T>(
  type: SalesOSDB['entities']['value']['type'],
  id: string
): Promise<T | null> {
  const database = await getDB();
  const key = `${type}:${id}`;
  const entry = await database.get('entities', key);

  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    await database.delete('entities', key);
    return null;
  }

  return entry.data as T;
}

export async function getEntitiesByType<T>(
  type: SalesOSDB['entities']['value']['type']
): Promise<T[]> {
  const database = await getDB();
  const entries = await database.getAllFromIndex('entities', 'by-type', type);
  const now = Date.now();

  return entries
    .filter((e) => e.expiresAt > now)
    .map((e) => e.data as T);
}

export async function clearEntities(): Promise<void> {
  const database = await getDB();
  await database.clear('entities');
}

// Pending mutations (for offline sync)
export async function addPendingMutation(
  type: 'create' | 'update' | 'delete',
  entity: string,
  entityId?: string,
  data?: unknown
): Promise<number> {
  const database = await getDB();
  return database.add('pendingMutations', {
    type,
    entity,
    entityId,
    data,
    timestamp: Date.now(),
    retries: 0,
  });
}

export async function getPendingMutations(): Promise<SalesOSDB['pendingMutations']['value'][]> {
  const database = await getDB();
  return database.getAll('pendingMutations');
}

export async function removePendingMutation(id: number): Promise<void> {
  const database = await getDB();
  await database.delete('pendingMutations', id);
}

export async function incrementMutationRetry(id: number): Promise<void> {
  const database = await getDB();
  const mutation = await database.get('pendingMutations', id);
  if (mutation) {
    mutation.retries++;
    await database.put('pendingMutations', mutation);
  }
}

export async function clearPendingMutations(): Promise<void> {
  const database = await getDB();
  await database.clear('pendingMutations');
}

// Query cache
export async function cacheQuery(queryKey: string, data: unknown): Promise<void> {
  const database = await getDB();
  const now = Date.now();

  await database.put('queryCache', {
    queryKey,
    data,
    cachedAt: now,
    expiresAt: now + CACHE_DURATION,
  });
}

export async function getCachedQuery<T>(queryKey: string): Promise<T | null> {
  const database = await getDB();
  const entry = await database.get('queryCache', queryKey);

  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    await database.delete('queryCache', queryKey);
    return null;
  }

  return entry.data as T;
}

export async function clearQueryCache(): Promise<void> {
  const database = await getDB();
  await database.clear('queryCache');
}

// Preferences
export async function setPreference(key: string, value: unknown): Promise<void> {
  const database = await getDB();
  await database.put('preferences', value, key);
}

export async function getPreference<T>(key: string): Promise<T | null> {
  const database = await getDB();
  const value = await database.get('preferences', key);
  return value as T | null;
}

// Cleanup expired entries
export async function cleanupExpired(): Promise<void> {
  const database = await getDB();
  const now = Date.now();

  // Clean entities
  const tx1 = database.transaction('entities', 'readwrite');
  const entityIndex = tx1.store.index('by-expiry');
  let cursor1 = await entityIndex.openCursor(IDBKeyRange.upperBound(now));
  while (cursor1) {
    await cursor1.delete();
    cursor1 = await cursor1.continue();
  }
  await tx1.done;

  // Clean query cache
  const tx2 = database.transaction('queryCache', 'readwrite');
  const queryIndex = tx2.store.index('by-expiry');
  let cursor2 = await queryIndex.openCursor(IDBKeyRange.upperBound(now));
  while (cursor2) {
    await cursor2.delete();
    cursor2 = await cursor2.continue();
  }
  await tx2.done;
}

// Get storage stats
export async function getStorageStats(): Promise<{
  entities: number;
  pendingMutations: number;
  queryCache: number;
}> {
  const database = await getDB();
  const [entities, pendingMutations, queryCache] = await Promise.all([
    database.count('entities'),
    database.count('pendingMutations'),
    database.count('queryCache'),
  ]);

  return { entities, pendingMutations, queryCache };
}
