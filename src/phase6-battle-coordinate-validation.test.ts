import {describe,expect,it} from 'vitest';
import {applyPhase4Action,createPhase4Model,type BattleSceneManifest,type WarUnit} from './phase4';

const persons=[{id:'p1',name:'示例人物',alive:true,location:'郡府',office:'縣令'}];
const unit:WarUnit={id:'u1',faction:'守軍',commanderId:'c1',commanderName:'守將',location:'前線',strength:10,reserve:0,supply:1,morale:50,fatigue:0,terrain:'平原',wounded:0,killed:0,routed:0,order:'防守'};
const scene:BattleSceneManifest={example:true,coordinateScale:'meters',objects:[{id:'tower',label:'塔樓',location:'前線',condition:'立體座標',position:{x:1,y:1,z:4},radius:1}],potentialChains:[],observers:[{id:'watch',side:'守軍',location:'後陣',visibility:'立體視線',position:{x:0,y:0,z:2},sightRange:10}]};
const start=(candidate:BattleSceneManifest)=>applyPhase4Action(createPhase4Model(184,1,persons),{type:'StartBattle',id:'3d-coordinate-validation',location:'渡口',units:[unit],protagonistPresent:false,scene:candidate},persons);

describe('A260 3D battle coordinate validation',()=>{
  it('accepts metric elevation and preserves it in the battle scene',()=>{
    expect(start(scene).battle?.scene).toEqual(scene);
  });
  it('rejects non-finite elevation and unknown coordinate scales',()=>{
    expect(()=>start({...scene,objects:[{...scene.objects[0],position:{x:1,y:1,z:Number.NaN}}]})).toThrow('戰場物件資料無效');
    expect(()=>start({...scene,coordinateScale:'yards' as BattleSceneManifest['coordinateScale']})).toThrow('戰場場景資料格式無效');
  });
});

describe('A261 3D battle impact ranges',()=>{
  const rangedUnit=(position:NonNullable<WarUnit['position']>):WarUnit=>({...unit,position});
  const apply=(candidate:BattleSceneManifest,warUnit:WarUnit)=>applyPhase4Action(createPhase4Model(184,1,persons),{type:'StartBattle',id:'3d-impact-range',location:'渡口',units:[warUnit],protagonistPresent:false,scene:candidate},persons);
  it('does not transmit a chain across a vertical gap beyond its configured range',()=>{
    const candidate:BattleSceneManifest={example:true,coordinateScale:'meters',objects:[{id:'source',label:'上層木架',location:'高處',condition:'將被擊毀',position:{x:0,y:0,z:0},integrity:1},{id:'target',label:'下層門架',location:'低處',condition:'完好',position:{x:1,y:0,z:10},integrity:10}],potentialChains:[{id:'vertical-gap',fromObjectId:'source',toObjectId:'target',triggerCondition:'上層木架斷裂',possibleEffect:'傳力',affectedUnitIds:[],impactForce:2,maxDistance:2,affectedRadius:2,moraleImpact:0}],observers:[]};
    const battle=apply(candidate,rangedUnit({x:1,y:0,z:0}));
    const result=applyPhase4Action(battle,{type:'ResolveBattleImpact',targetObjectId:'source',force:1},persons);
    expect(result.battle?.scene?.objects.find(object=>object.id==='target')?.integrity).toBe(10);
    expect(result.battle?.scene?.settledChainIds).not.toContain('vertical-gap');
  });
  it('does not apply casualties to a unit outside a destination spherical radius by elevation',()=>{
    const candidate:BattleSceneManifest={example:true,coordinateScale:'meters',objects:[{id:'source',label:'木架',location:'前線',condition:'將被擊毀',position:{x:0,y:0,z:0},integrity:1},{id:'target',label:'拒馬',location:'前沿',condition:'完好',position:{x:1,y:0,z:0},integrity:10}],potentialChains:[{id:'elevated-unit',fromObjectId:'source',toObjectId:'target',triggerCondition:'木架斷裂',possibleEffect:'局部作用',affectedUnitIds:['u1'],impactForce:2,maxDistance:2,affectedRadius:2,moraleImpact:5,casualties:[{unitId:'u1',killed:1,wounded:0,routed:0}]}],observers:[]};
    const battle=apply(candidate,{...rangedUnit({x:1,y:0,z:10}),strength:10});
    const result=applyPhase4Action(battle,{type:'ResolveBattleImpact',targetObjectId:'source',force:1},persons);
    expect(result.battle?.units[0]).toMatchObject({strength:10,killed:0,morale:50});
    expect(result.battle?.scene?.objects.find(object=>object.id==='target')?.integrity).toBe(8);
  });
});
