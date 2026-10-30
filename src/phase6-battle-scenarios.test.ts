import {describe,expect,it} from 'vitest';
import {applyPhase4Action,createPhase4Model} from './phase4';
import {battleScenarioOptions,createBattleScenario,type BattleScenarioId} from './battle-scenario-examples';

const people=[{id:'protagonist',name:'主角',alive:true,location:'汝南郡',office:''}];

describe('A291 多類戰役場景的可驗證敘事資料',()=>{
  it('提供渡口、城門、山道撤退三種可選且參照完整的示例場景',()=>{
    const options=battleScenarioOptions();
    expect(options.map(option=>option.id)).toEqual(['river-ford','city-gate','mountain-retreat']);
    for(const option of options){
      const scenario=createBattleScenario(option.id as BattleScenarioId);
      const started=applyPhase4Action(createPhase4Model(184,1,people),{type:'StartBattle',id:`scenario-${scenario.id}`,location:scenario.location,units:scenario.units,protagonistPresent:true,scene:scenario.scene},people);
      expect(started.battle?.scene?.narrativeContext?.tacticalObjectives.length).toBeGreaterThan(0);
      expect(started.battle?.scene?.narrativeContext?.aftermathLimits.length).toBeGreaterThan(0);
      expect(started.battle?.scene?.observers.length).toBeGreaterThanOrEqual(2);
      expect(started.battle?.scene?.potentialChains.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('城門與山道的已列因果只改變場景／士氣，不會憑空增加傷亡',()=>{
    for(const id of ['city-gate','mountain-retreat'] as const){
      const scenario=createBattleScenario(id),started=applyPhase4Action(createPhase4Model(184,1,people),{type:'StartBattle',id:`cause-${id}`,location:scenario.location,units:scenario.units,protagonistPresent:true,scene:scenario.scene},people);
      const sourceId=scenario.scene.potentialChains[0]!.fromObjectId,source=scenario.scene.objects.find(object=>object.id===sourceId)!;
      const resolved=applyPhase4Action(started,{type:'ResolveBattleImpact',targetObjectId:sourceId,force:100},people);
      expect(resolved.battle?.scene?.settledChainIds?.length).toBeGreaterThan(0);
      expect(resolved.battle?.units.map(unit=>({killed:unit.killed,wounded:unit.wounded,routed:unit.routed}))).toEqual(started.battle?.units.map(unit=>({killed:unit.killed,wounded:unit.wounded,routed:unit.routed})));
      expect(resolved.battle?.scene?.objects.find(object=>object.id===sourceId)?.destroyed).toBe(true);
      expect(resolved.battle?.logs.some(log=>log.includes(source.label))).toBe(true);
    }
  });

  it('拒絕過長或空白的敘事目標與後效限制',()=>{
    const scenario=createBattleScenario('city-gate');
    for(const narrativeContext of [
      {...scenario.scene.narrativeContext!,tacticalObjectives:[' ']},
      {...scenario.scene.narrativeContext!,aftermathLimits:['x'.repeat(301)]},
      {...scenario.scene.narrativeContext!,confirmedConsequences:Array.from({length:9},()=> '已確認')},
    ])expect(()=>applyPhase4Action(createPhase4Model(184,1,people),{type:'StartBattle',id:'invalid-context',location:scenario.location,units:scenario.units,protagonistPresent:false,scene:{...scenario.scene,narrativeContext}},people)).toThrow('戰場敘事事實與限制無效');
  });
});
