import type {BattlePersonnel} from '../phase4';

const STATUS_LABELS:Record<BattlePersonnel['status'],string>={active:'現役',killed:'陣亡',wounded:'受傷',missing:'失蹤',captured:'被俘',surrendered:'投降'};

export function BattlePersonnelRegister({unitName,personnel}:{unitName:string;personnel?:BattlePersonnel[]}){
  if(!personnel?.length)return null;
  return <details className="personnel-register">
    <summary>{unitName}具名軍籍・{personnel.length} 人</summary>
    <ul aria-label={`${unitName}具名人員狀態`}>
      {personnel.map(person=><li key={person.id}>{person.name}・{STATUS_LABELS[person.status]}</li>)}
    </ul>
  </details>;
}
