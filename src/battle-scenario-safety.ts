export interface BattleScenarioRevision {worldlineId:string;revision:number;}

export function isBattleScenarioRevisionCurrent(origin:BattleScenarioRevision,current:BattleScenarioRevision|null):boolean{
  return current!==null&&current.worldlineId===origin.worldlineId&&current.revision===origin.revision;
}
