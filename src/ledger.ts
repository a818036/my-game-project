export type AccountId = 'private'|'family'|'public'|'military'|'sovereign';
export type AccountSource = AccountId|'market';
export type Asset = '錢'|'糧'|'貨物';
export type AccountBook = Record<AccountId, number>;
export interface AccountEntry {
  id: string; eventId: string; turn: number; asset: Asset; amount: number;
  from: AccountSource; to: AccountSource; memo: string;
}
export interface ItemLot { id: string; item: string; quantity: number; ownerId: string; custodianId: string; locationId: string; }

export function openingEntry(worldlineId: string, year: number): AccountEntry {
  return { id: `${worldlineId}:opening`, eventId: `${worldlineId}:1`, turn: 0, asset: '錢', amount: 12, from: 'market', to: 'private', memo: `開局示例家計（${year}）` };
}

/** Double-entry transfer used by game settlement and acceptance scenarios. */
export function applyAccountEntry(book: AccountBook, input: AccountEntry): { accounts: AccountBook; entry: AccountEntry } {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) throw new Error('帳務金額必須是正整數');
  if (input.from === input.to) throw new Error('帳務來源與去向不可相同');
  const accounts = { ...book };
  if (input.from !== 'market') {
    if (accounts[input.from] < input.amount) throw new Error(`${input.from} 帳資產不足`);
    accounts[input.from] -= input.amount;
  }
  if (input.to !== 'market') accounts[input.to] += input.amount;
  return { accounts, entry: { ...input } };
}

/** Custody may move while legal ownership and quantity remain unchanged. */
export function changeCustody(lot: ItemLot, custodianId: string, locationId: string): ItemLot {
  if (!Number.isSafeInteger(lot.quantity) || lot.quantity <= 0 || !custodianId || !locationId) throw new Error('物資保管資料無效');
  return { ...lot, custodianId, locationId };
}

export function placeInSubspace(lot: ItemLot, ownerId: string, locationId: string, withinReach: boolean): ItemLot {
  if (!withinReach) throw new Error('物資不在可存取範圍');
  return changeCustody(lot, ownerId, `subspace:${ownerId}:${locationId}`);
}
