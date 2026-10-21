import type { Character, Intent } from './engine';

/** 小型人事示例：按回合做地方佐吏考課／補缺檢查，不代表完整官制或名冊。 */
export function runPersonnelEngine(current: string[], turn: number): { messages: string[] } {
  if (turn % 5 !== 0) return { messages: current };
  return { messages: [...current, `第 ${turn} 回合人事示例：縣亭佐吏完成考課，地方文書職責續行。`] };
}

/** 小型人才示例：自動掃描鄉學、商旅與工匠圈，記錄待接觸者，不保證登用。 */
export function runTalentEngine(current: string[], seed: number, turn: number): { names: string[] } {
  if (turn % 5 !== 2) return { names: current };
  const candidates = ['鄉學少年・示例人才', '行旅醫者・示例人才', '木作學徒・示例人才', '市肆帳房・示例人才'];
  const candidate = candidates[Math.floor(sample(seed, turn * 43) * candidates.length)];
  return { names: current.includes(candidate) ? current : [...current, candidate] };
}

/** 小型歷史節點示例，不是假稱已收錄完整歷史節點資料庫。 */
export function historicalNodeAt(turn: number): string | null {
  if (turn === 1) return '地方節點示例：鄉亭收到鄰近縣境的戒備通報。';
  if (turn === 6) return '地方節點示例：商旅帶來黃巾起事的遠方消息，內容仍待查證。';
  if (turn === 11) return '地方節點示例：官府更新徵募與戶籍告示。';
  if (turn === 16) return '地方節點示例：秋收後道路商旅漸增。';
  return null;
}

/** 小型人才成長示例：記錄學習／實務／交遊經驗，不虛構原文未定的成長公式。 */
export function developTalent(character: Character, intent: Intent, _roll: number): Character {
  const growth = { ...character.growth };
  if (intent === '耕讀自持') growth.study += 1;
  else if (intent === '經商營生') growth.practice += 1;
  else if (intent === '訪求人才' || intent === '遊歷鄉里') growth.social += 1;
  return { ...character, growth };
}

/** 人事小型示例：訪求人才可遇到示例地方人物，不改變 loyalty／恐懼／信任。 */
export function resolvePersonnel(character: Character, seed: number, turn: number, _roll: number): { character: Character; title: string; details: string; reputationDelta: number } {
  const people = ['荀氏門生・示例人物', '鄉亭書佐・示例人物', '行旅醫者・示例人物', '落魄遊俠・示例人物'];
  const person = people[Math.floor(sample(seed, turn * 19) * people.length)];
  const fresh = !character.contacts.includes(person);
  return { character: { ...character, contacts: fresh ? [...character.contacts, person] : character.contacts }, title: fresh ? `結識${person}` : '故友重逢', details: fresh ? `在鄉市與${person}相識；這是測試人物，不代表完整歷史名冊。` : `再次拜訪${person}，交換近況。`, reputationDelta: fresh ? 1 : 0 };
}

/** 小型天下大勢示例，固定種子可重播，每個回合都產生一條地方外部動態。 */
export function trendForTurn(seed: number, turn: number): string {
  const trends = ['朝廷下令州郡整飭戶籍，地方士人議論徵募。', '市肆糧價微漲，鄰近豪族開始整理倉儲。', '郡中募兵消息傳來，商旅改走較安全的道路。', '州府使者巡行，訪察地方吏治與民情。', '秋收將近，商旅聚於渡口，鄉里互通有無。', '遠方傳來政局變動的傳聞，內容尚未核實。', '本地學舍開講，士人議論經義與天下局勢。', '道路不靖，商隊結伴而行，鄉里加強守望。'];
  return trends[Math.floor(sample(seed, turn * 31 + 4) * trends.length)];
}
function sample(seed: number, salt: number): number {
  let x = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) | 0; x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return (x >>> 0) / 4294967296;
}
