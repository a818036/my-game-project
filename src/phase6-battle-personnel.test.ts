import {describe,expect,it} from 'vitest';
import {applyPhase4Action,createPhase4Model,type BattleSceneManifest,type Phase4Action,type Phase4Model,type WarUnit} from './phase4';

const people=[{id:'protagonist',name:'主角',alive:true,location:'郡府',office:''}];
const model=()=>createPhase4Model(184,1,people);
const act=(state:Phase4Model,action:Phase4Action)=>applyPhase4Action(state,action,people);

describe('A258 具名戰場傷亡名冊',()=>{
  it('將預置具名傷亡寫回人員狀態並與部隊分類帳守恆',()=>{
    const unit:WarUnit={id:'roster-unit',faction:'守軍',commanderId:'captain',commanderName:'守將',location:'渡口北岸',strength:10,reserve:0,supply:2,morale:60,fatigue:0,terrain:'平地',wounded:0,killed:0,routed:0,order:'防守',position:{x:3,y:0},personnel:[
      {id:'named-1',name:'校尉甲',status:'active'},{id:'named-2',name:'軍士乙',status:'active'},{id:'named-3',name:'軍士丙',status:'active'},{id:'named-4',name:'軍士丁',status:'active'},{id:'named-5',name:'軍士戊',status:'active'},
    ]};
    const scene:BattleSceneManifest={example:true,objects:[{id:'beam',label:'斷梁',location:'木臺下',condition:'承重',position:{x:0,y:0},integrity:5},{id:'shield',label:'盾列',location:'梁下前沿',condition:'列陣',position:{x:2,y:0},integrity:8}],potentialChains:[{id:'beam-shield',fromObjectId:'beam',toObjectId:'shield',triggerCondition:'斷梁砸向盾列',possibleEffect:'依示例名冊更新人員狀態',affectedUnitIds:['roster-unit'],impactForce:8,maxDistance:3,affectedRadius:2,moraleImpact:0,casualties:[{unitId:'roster-unit',killed:1,wounded:1,routed:3,personnelOutcomes:[{personId:'named-1',status:'killed'},{personId:'named-2',status:'wounded'},{personId:'named-3',status:'missing'},{personId:'named-4',status:'captured'},{personId:'named-5',status:'surrendered'}]}]}],observers:[]};
    const started=act(model(),{type:'StartBattle',id:'named-casualty-chain',location:'渡口',units:[unit],protagonistPresent:true,scene});
    const resolved=act(started,{type:'ResolveBattleImpact',targetObjectId:'beam',force:5});
    const after=resolved.battle!.units[0];
    expect(after).toMatchObject({strength:5,killed:1,wounded:1,routed:3});
    expect(after.personnel?.map(person=>person.status)).toEqual(['killed','wounded','missing','captured','surrendered']);
    expect(after.strength+after.reserve+after.killed+after.wounded+after.routed).toBe(10);
    expect(resolved.battle!.logs.at(-1)).toContain('校尉甲列為killed');
    expect(resolved.battle!.logs.at(-1)).toContain('軍士戊列為surrendered');
    expect(act(started,{type:'ResolveBattleImpact',targetObjectId:'beam',force:5})).toEqual(resolved);
  });

  it('拒絕與傷亡總數不符、身分不存在或重複的人員結果',()=>{
    const unit:WarUnit={id:'u',faction:'守軍',commanderId:'c',commanderName:'守將',location:'渡口',strength:10,reserve:0,supply:2,morale:60,fatigue:0,terrain:'平地',wounded:0,killed:0,routed:0,order:'防守',personnel:[{id:'person-1',name:'軍士甲',status:'active'}]};
    const objects=[{id:'a',label:'木架',location:'岸邊',condition:'穩固',position:{x:0,y:0},integrity:5},{id:'b',label:'拒馬',location:'前列',condition:'固定',position:{x:1,y:0},integrity:5}];
    const link:BattleSceneManifest['potentialChains'][number]={id:'a-b',fromObjectId:'a',toObjectId:'b',triggerCondition:'木架倒下',possibleEffect:'可能波及部隊',affectedUnitIds:['u'],impactForce:5,maxDistance:2,affectedRadius:2,moraleImpact:0,casualties:[{unitId:'u',killed:1,wounded:0,routed:0,personnelOutcomes:[{personId:'person-1',status:'killed'}]}]};
    const start=(personnel=unit.personnel,potentialChains=[link])=>act(model(),{type:'StartBattle',id:'validation',location:'渡口',units:[{...unit,personnel}],protagonistPresent:false,scene:{example:true,objects,potentialChains,observers:[]}});
    expect(()=>start(unit.personnel,[{...link,casualties:[{...link.casualties![0],killed:0}]}])).toThrow('戰場潛在因果鏈無效');
    expect(()=>start(unit.personnel,[{...link,casualties:[{...link.casualties![0],personnelOutcomes:[{personId:'unknown',status:'killed'}]}]}])).toThrow('戰場傷亡名冊引用不存在');
    expect(()=>start([{id:'person-1',name:'甲',status:'active'},{id:'person-1',name:'乙',status:'active'}])).toThrow('具名戰場軍籍無效');
    expect(()=>start(unit.personnel,[link,{...link,id:'duplicate',fromObjectId:'b',toObjectId:'a'}])).toThrow('戰場潛在因果鏈無效');
    expect(()=>act(model(),{type:'StartBattle',id:'count-mismatch',location:'渡口',units:[{...unit,strength:0}],protagonistPresent:false})).toThrow('具名戰場軍籍無效');
  });

  it('一般輪次與撤退不替具名人員猜測個人結果',()=>{
    const unit:WarUnit={id:'u',faction:'守軍',commanderId:'c',commanderName:'守將',location:'渡口',strength:1,reserve:0,supply:2,morale:60,fatigue:0,terrain:'平地',wounded:0,killed:0,routed:0,order:'防守',personnel:[{id:'person-1',name:'軍士甲',status:'active'}]};
    const started=act(model(),{type:'StartBattle',id:'anonymous-losses',location:'渡口',units:[unit,{...unit,id:'enemy',commanderId:'enemy-c',faction:'來犯軍',personnel:undefined}],protagonistPresent:false});
    const round=act(started,{type:'BattleRound',orders:{u:'防守',enemy:'防守'}}).battle!.units.find(entry=>entry.id==='u')!;
    expect(round.personnel?.[0].status).toBe('active');
    expect(round.strength).toBe(1);
    const retreated=act(started,{type:'Retreat',unitId:'u'}).battle!.units.find(entry=>entry.id==='u')!;
    expect(retreated.personnel?.[0].status).toBe('active');
    expect(retreated.strength).toBe(1);
  });
});
