import {describe,expect,it} from 'vitest';
import {applyPhase4Action,createPhase4Model} from './phase4';
import {battleScenarioOptions,createBattleScenario,type BattleScenarioId} from './battle-scenario-examples';
import {isBattleScenarioRevisionCurrent} from './battle-scenario-safety';

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

  it('A469 逐段驗證三個示例完整可達的因果鏈與傷亡界線',()=>{
    const expectations={
      'river-ford':{firstCascade:['platform-rope','rope-barrier','barrier-shield-rank'],blockedSource:undefined,finalMorale:57,finalObject:{id:'blue-shield-rank',integrity:16}},
      'city-gate':{firstCascade:['ram-beam','beam-leaf'],blockedSource:'gate-leaf',finalMorale:60,finalObject:{id:'inner-barrier',integrity:2}},
      'mountain-retreat':{firstCascade:['cart-rocks','rocks-road'],blockedSource:'narrow-road',finalMorale:59,finalObject:{id:'rear-rank',integrity:18}},
    } as const;

    for(const [id,expected] of Object.entries(expectations) as [BattleScenarioId,typeof expectations[BattleScenarioId]][]){
      const scenario=createBattleScenario(id),started=applyPhase4Action(createPhase4Model(184,1,people),{type:'StartBattle',id:`a469-${id}`,location:scenario.location,units:scenario.units,protagonistPresent:true,scene:scenario.scene},people);
      const firstSourceId=scenario.scene.potentialChains[0]!.fromObjectId;
      const notBroken=applyPhase4Action(started,{type:'ResolveBattleImpact',targetObjectId:firstSourceId,force:1},people);
      expect(notBroken.battle?.scene?.settledChainIds??[]).toEqual([]);

      const broken=applyPhase4Action(notBroken,{type:'ResolveBattleImpact',targetObjectId:firstSourceId,force:100},people);
      expect(broken.battle?.scene?.settledChainIds).toEqual(expected.firstCascade);
      expect(broken.battle?.units.map(unit=>({killed:unit.killed,wounded:unit.wounded,routed:unit.routed}))).toEqual(started.battle?.units.map(unit=>({killed:unit.killed,wounded:unit.wounded,routed:unit.routed})));

      const completed=expected.blockedSource
        ? applyPhase4Action(broken,{type:'ResolveBattleImpact',targetObjectId:expected.blockedSource,force:100},people)
        : broken;
      expect(completed.battle?.scene?.settledChainIds).toEqual(scenario.scene.potentialChains.map(chain=>chain.id));
      expect(completed.battle?.units.every(unit=>unit.killed===0&&unit.wounded===0&&unit.routed===0)).toBe(true);
      expect(completed.battle?.units[0]?.morale).toBe(expected.finalMorale);
      expect(completed.battle?.scene?.objects.find(object=>object.id===expected.finalObject.id)).toMatchObject(expected.finalObject);
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

describe('A292 動態載入戰役資料的世界線版本檢查',()=>{
  it('只有來源世界線與 revision 都未變時才允許派發',()=>{
    const origin={worldlineId:'line-a',revision:12};
    expect(isBattleScenarioRevisionCurrent(origin,{...origin})).toBe(true);
    expect(isBattleScenarioRevisionCurrent(origin,{worldlineId:'line-b',revision:12})).toBe(false);
    expect(isBattleScenarioRevisionCurrent(origin,{worldlineId:'line-a',revision:13})).toBe(false);
    expect(isBattleScenarioRevisionCurrent(origin,null)).toBe(false);
  });
});
