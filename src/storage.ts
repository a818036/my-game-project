import { replay, type GameEvent, type GameState, type OpeningHistory } from './engine';

const DB = 'shenzhou-three-kingdoms';
const DB_VERSION = 2;
const WORLDS = 'worldlines';
const META = 'profile';
export interface SaveFile { format: 'shenzhou-save'; version: 2; worldlineId: string; events: GameEvent[]; state: GameState; }
export interface SaveProfile extends OpeningHistory { activeWorldlineId: string | null; }
export interface WorkspaceSnapshot { saves: SaveFile[]; profile: SaveProfile; }

export function openSaveDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result, tx = req.transaction!;
      const worlds = db.objectStoreNames.contains(WORLDS) ? tx.objectStore(WORLDS) : db.createObjectStore(WORLDS, { keyPath: 'worldlineId' });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
      // Preserve the first prototype's single-save store when upgrading an existing browser profile.
      if ((event as IDBVersionChangeEvent).oldVersion < 2 && db.objectStoreNames.contains('session')) {
        const oldReq = tx.objectStore('session').get('active');
        oldReq.onsuccess = () => {
          const old = oldReq.result as { events?: GameEvent[]; state?: GameState } | undefined;
          const worldlineId = old?.state?.worldlineId;
          if (old && worldlineId && Array.isArray(old.events) && old.state) {
            worlds.put({ format: 'shenzhou-save', version: 2, worldlineId, events: old.events, state: old.state } satisfies SaveFile);
            tx.objectStore(META).put(worldlineId, 'activeWorldlineId');
          }
        };
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadWorkspace(): Promise<WorkspaceSnapshot> {
  const db = await openSaveDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([WORLDS, META], 'readonly');
    const worldsReq = tx.objectStore(WORLDS).getAll();
    const profileReq = tx.objectStore(META).get('openingHistory');
    const activeReq = tx.objectStore(META).get('activeWorldlineId');
    let saves: SaveFile[] = [], history: OpeningHistory | undefined, active: string | undefined;
    worldsReq.onsuccess = () => { saves = worldsReq.result as SaveFile[]; };
    profileReq.onsuccess = () => { history = profileReq.result as OpeningHistory | undefined; };
    activeReq.onsuccess = () => { active = activeReq.result as string | undefined; };
    tx.oncomplete = () => { db.close(); resolve({ saves, profile: { ...(history ?? { regions: [], surnames: [] }), activeWorldlineId: active ?? saves.at(-1)?.worldlineId ?? null } }); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('讀取存檔交易中止')); };
  });
}

export async function commitWorldline(save: SaveFile, history: OpeningHistory, makeActive = true): Promise<void> {
  const db = await openSaveDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([WORLDS, META], 'readwrite');
    try {
      tx.objectStore(WORLDS).put(save);
      tx.objectStore(META).put({ regions: history.regions.slice(-3), surnames: history.surnames.slice(-3) }, 'openingHistory');
      if (makeActive) tx.objectStore(META).put(save.worldlineId, 'activeWorldlineId');
    } catch (error) { db.close(); reject(error); return; }
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('保存交易中止')); };
  });
}

export async function activateWorldline(worldlineId: string): Promise<void> {
  const db = await openSaveDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([WORLDS, META], 'readwrite');
    const get = tx.objectStore(WORLDS).get(worldlineId);
    get.onsuccess = () => {
      if (!get.result) { tx.abort(); return; }
      tx.objectStore(META).put(worldlineId, 'activeWorldlineId');
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('找不到指定世界線')); };
  });
}

export function toJson(save: SaveFile): string { return JSON.stringify(save, null, 2); }
export function parseSave(text: string): SaveFile {
  const value = JSON.parse(text) as SaveFile;
  if (value.format !== 'shenzhou-save' || value.version !== 2 || !value.worldlineId || !Array.isArray(value.events) || !value.state || value.state.worldlineId !== value.worldlineId) throw new Error('存檔格式或版本不符');
  return value;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

export function verifySave(text: string): SaveFile {
  const save = parseSave(text);
  const restored = replay(save.events);
  if (!restored || restored.worldlineId !== save.worldlineId || stable(restored) !== stable(save.state)) throw new Error('存檔狀態與事件重播結果不一致');
  return save;
}
export function assertSlotCompatible(existing: SaveFile | undefined, candidate: SaveFile): void {
  if (existing && stable(existing) !== stable(candidate)) throw new Error('此世界線 ID 已存在不同存檔，未覆蓋舊資料');
}
