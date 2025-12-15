import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'word-pwa';
const DB_VERSION = 1;

type KVValue = unknown;

let dbPromise: Promise<IDBPDatabase> | null = null;

export async function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('kv')) {
          db.createObjectStore('kv');
        }
        if (!db.objectStoreNames.contains('progress')) {
          db.createObjectStore('progress');
        }
        if (!db.objectStoreNames.contains('stats')) {
          db.createObjectStore('stats', { keyPath: 'id', autoIncrement: true });
        }
      }
    });
  }
  return dbPromise;
}

export async function getKV<T = KVValue>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return db.get('kv', key) as Promise<T | undefined>;
}

export async function setKV<T = KVValue>(key: string, value: T) {
  const db = await getDb();
  await db.put('kv', value, key);
}

export async function deleteKV(key: string) {
  const db = await getDb();
  await db.delete('kv', key);
}

export async function putProgress<T>(key: string, value: T) {
  const db = await getDb();
  await db.put('progress', value, key);
}

export async function getProgress<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return db.get('progress', key) as Promise<T | undefined>;
}

export async function getAllProgress<T>(): Promise<T[]> {
  const db = await getDb();
  return db.getAll('progress') as Promise<T[]>;
}

export async function deleteProgress(key: string) {
  const db = await getDb();
  await db.delete('progress', key);
}

export async function addStatRecord<T extends { id?: number }>(value: T) {
  const db = await getDb();
  return db.add('stats', value);
}

export async function getAllStats<T>(): Promise<T[]> {
  const db = await getDb();
  return db.getAll('stats') as Promise<T[]>;
}

export async function clearStore(name: 'kv' | 'progress' | 'stats') {
  const db = await getDb();
  await db.clear(name);
}
