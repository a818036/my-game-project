import { applyEvent, ENGINE_VERSION, LEGACY_ENGINE_VERSION, PHASE2_ENGINE_VERSION, RULES_VERSION, SOURCE_HASHES, replay, type GameEvent, type GameState, type OpeningHistory } from './engine';
import { migrationPhase2State } from './phase2';
import { createInnateModel } from './innate';
import { PHASE4_CONTENT_VERSION } from './phase4';

const DB = 'shenzhou-three-kingdoms';
const DB_VERSION = 2;
const WORLDS = 'worldlines';
const META = 'profile';
export interface LegacySaveFile { format: 'shenzhou-save'; version: 2; worldlineId: string; events: GameEvent[]; state: GameState; }
export interface Phase2SaveFile { format: 'shenzhou-save'; version: 3; worldlineId: string; events: GameEvent[]; state: GameState; }
export interface Phase3SaveFile { format: 'shenzhou-save'; version: 4; worldlineId: string; events: GameEvent[]; state: GameState; }
export interface Phase3WorldSaveFile { format: 'shenzhou-save'; version: 5; worldlineId: string; events: GameEvent[]; state: GameState; }
export interface SaveFile { format: 'shenzhou-save'; version: 6; worldlineId: string; events: GameEvent[]; state: GameState; }
export type AnySaveFile = SaveFile | Phase3WorldSaveFile | Phase3SaveFile | Phase2SaveFile | LegacySaveFile;
export interface SaveProfile extends OpeningHistory { activeWorldlineId: string | null; }
export interface UnreadableSave { worldlineId: string; version: number; reason: string; raw: AnySaveFile; }
export interface WorkspaceSnapshot { saves: SaveFile[]; profile: SaveProfile; unreadableSaves?: UnreadableSave[]; }

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
            worlds.put({ format: 'shenzhou-save', version: 2, worldlineId, events: old.events, state: old.state } satisfies LegacySaveFile);
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
    let rawSaves: AnySaveFile[] = [], history: OpeningHistory | undefined, active: string | undefined;
    worldsReq.onsuccess = () => { rawSaves = worldsReq.result as AnySaveFile[]; };
    profileReq.onsuccess = () => { history = profileReq.result as OpeningHistory | undefined; };
    activeReq.onsuccess = () => { active = activeReq.result as string | undefined; };
    tx.oncomplete = async () => {
      db.close();
      try {
        const migrated: SaveFile[] = [];
        const unreadableSaves: UnreadableSave[] = [];
        for (const raw of rawSaves) {
          try { migrated.push(migrateSaveFile(raw)); }
          catch (error) {
            unreadableSaves.push({ worldlineId: raw.worldlineId, version: raw.version, reason: error instanceof Error ? error.message : String(error), raw });
          }
        }
        const changed = migrated.filter((entry) => {
          const original = rawSaves.find((candidate) => candidate.worldlineId === entry.worldlineId);
          return original !== undefined && stable(entry) !== stable(original);
        });
        if (changed.length) {
          const writeDb = await openSaveDb();
          await new Promise<void>((done, fail) => {
            const write = writeDb.transaction([WORLDS, META], 'readwrite');
            changed.forEach((entry) => {
              const original = rawSaves.find((candidate) => candidate.worldlineId === entry.worldlineId)!;
              write.objectStore(META).put(original, `legacy:${entry.worldlineId}:v${original.version}${original.version===6?`-${original.state.phase4?.contentVersion??'unknown'}`:''}`);
              write.objectStore(WORLDS).put(entry);
            });
            write.oncomplete = () => { writeDb.close(); done(); };
            write.onerror = () => { writeDb.close(); fail(write.error); };
            write.onabort = () => { writeDb.close(); fail(write.error ?? new Error('舊存檔遷移交易中止')); };
          });
        }
        resolve({ saves: migrated, unreadableSaves, profile: { ...(history ?? { regions: [], surnames: [] }), activeWorldlineId: active ?? migrated.at(-1)?.worldlineId ?? null } });
      } catch (error) { reject(error); }
    };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('讀取存檔交易中止')); };
  });
}

export async function commitWorldline(save: SaveFile, history: OpeningHistory, makeActive = true, migrationBackup?: AnySaveFile): Promise<void> {
  const db = await openSaveDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([WORLDS, META], 'readwrite');
    try {
      tx.objectStore(WORLDS).put(save);
      tx.objectStore(META).put({ regions: history.regions.slice(-3), surnames: history.surnames.slice(-3) }, 'openingHistory');
      if (makeActive) tx.objectStore(META).put(save.worldlineId, 'activeWorldlineId');
    if (migrationBackup) tx.objectStore(META).put(migrationBackup, `legacy:${save.worldlineId}:v${migrationBackup.version}`);
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
export function parseSave(text: string): AnySaveFile {
  const value = JSON.parse(text) as AnySaveFile;
  if (value.format !== 'shenzhou-save' || ![2, 3, 4, 5, 6].includes(value.version) || !value.worldlineId || !Array.isArray(value.events) || !value.state || value.state.worldlineId !== value.worldlineId) throw new Error('存檔格式或版本不符');
  return value;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([,item])=>item!==undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`;
  return JSON.stringify(value);
}

export function migrateSaveFile(raw: AnySaveFile): SaveFile {
  if (raw.version === 6) {
    let current = replay(raw.events);
    if (!current || stable(current) !== stable(raw.state) || current.engineVersion !== ENGINE_VERSION) throw new Error('存檔狀態與事件重播結果不一致');
    const events = [...raw.events];
    if(current.phase4&&current.phase4.contentVersion!==PHASE4_CONTENT_VERSION){
      const event:GameEvent={version:ENGINE_VERSION,eventId:`${raw.worldlineId}:${current.revision+1}`,commandId:`${raw.worldlineId}:phase4-content-${PHASE4_CONTENT_VERSION}`,commandHash:`phase4-content-${PHASE4_CONTENT_VERSION}`,revision:current.revision+1,type:'Phase4ContentUpdated',payload:{contentVersion:PHASE4_CONTENT_VERSION}};
      current=applyEvent(current,event);
      events.push(event);
    }
    current=appendCurrentRuleSourceUpdate(current,events,raw.worldlineId);
    return events.length===raw.events.length?raw:{...raw,events,state:current};
  }
  let state = replay(raw.events);
  if (!state || stable(state) !== stable(raw.state)) throw new Error('舊存檔事件重播不一致，未改動原存檔');
  const events = [...raw.events];
  if (raw.version === 2) {
    if (state.engineVersion !== LEGACY_ENGINE_VERSION) throw new Error('第一階段存檔版本不符');
    const phase2Event: GameEvent = { version: PHASE2_ENGINE_VERSION, eventId: `${raw.worldlineId}:upgrade-v2`, commandId: `${raw.worldlineId}:upgrade-v2`, commandHash: 'upgrade-v2', revision: state.revision + 1, type: 'WorldlineUpgraded', payload: { phase2: migrationPhase2State(state.character.name, state.character.birthYear, state.character.family, state.character.potential, state.character.money, state.character.age) } };
    state = applyEvent(state,phase2Event);events.push(phase2Event);
  }
  if (state.engineVersion === PHASE2_ENGINE_VERSION && !state.phase2) throw new Error('第二階段存檔版本不符');
  if (state.engineVersion === PHASE2_ENGINE_VERSION) {
    const innateEvent: GameEvent = { version: 3, eventId: `${raw.worldlineId}:upgrade-v3`, commandId: `${raw.worldlineId}:upgrade-v3`, commandHash: 'upgrade-v3', revision: state.revision + 1, type: 'InnateSystemUpgraded', payload: { innate:createInnateModel(state.phase2!,state.character.birthYear,state.character.home) } };
    state = applyEvent(state,innateEvent);events.push(innateEvent);
  }
  if (state.engineVersion === 3) {
    const engineUpgrade: GameEvent = { version:4, eventId:`${raw.worldlineId}:upgrade-v4`, commandId:`${raw.worldlineId}:upgrade-v4`, commandHash:'upgrade-v4', revision:state.revision+1, type:'EngineUpgraded' };
    state=applyEvent(state,engineUpgrade);events.push(engineUpgrade);
  }
  if (state.engineVersion !== 4) throw new Error('第三階段存檔引擎版本不符');
  const worldUpgrade: GameEvent = {version:5,eventId:`${raw.worldlineId}:upgrade-v5`,commandId:`${raw.worldlineId}:upgrade-v5`,commandHash:'upgrade-v5',revision:state.revision+1,type:'EngineUpgraded'};
  state=applyEvent(state,worldUpgrade);events.push(worldUpgrade);
  if(state.phase4&&state.phase4.contentVersion!==PHASE4_CONTENT_VERSION){const contentUpdate:GameEvent={version:ENGINE_VERSION,eventId:`${raw.worldlineId}:${state.revision+1}`,commandId:`${raw.worldlineId}:phase4-content-${PHASE4_CONTENT_VERSION}`,commandHash:`phase4-content-${PHASE4_CONTENT_VERSION}`,revision:state.revision+1,type:'Phase4ContentUpdated',payload:{contentVersion:PHASE4_CONTENT_VERSION}};state=applyEvent(state,contentUpdate);events.push(contentUpdate);}
  state=appendCurrentRuleSourceUpdate(state,events,raw.worldlineId);
  return { format:'shenzhou-save',version:6,worldlineId:raw.worldlineId,events,state };
}

function appendCurrentRuleSourceUpdate(state:GameState,events:GameEvent[],worldlineId:string):GameState{
  if(state.rulesVersion===RULES_VERSION&&stable(state.sourceHashes)===stable(SOURCE_HASHES))return state;
  const event:GameEvent={version:ENGINE_VERSION,eventId:`${worldlineId}:${state.revision+1}`,commandId:`${worldlineId}:rules-${RULES_VERSION}`,commandHash:`rules-${RULES_VERSION}-${SOURCE_HASHES.rules}`,revision:state.revision+1,type:'RulesUpdated',payload:{fromVersion:state.rulesVersion,toVersion:RULES_VERSION,sourceHashes:SOURCE_HASHES}};
  const updated=applyEvent(state,event);events.push(event);return updated;
}

export function verifySave(text: string): SaveFile {
  const save = parseSave(text);
  return migrateSaveFile(save);
}
export function assertSlotCompatible(existing: SaveFile | undefined, candidate: SaveFile): void {
  if (existing && stable(existing) !== stable(candidate)) throw new Error('此世界線 ID 已存在不同存檔，未覆蓋舊資料');
}
