import {describe,expect,it} from 'vitest';
import {applyPhase4Action,createPhase4Model,type BattleSceneManifest,type Phase4Action,type Phase4Model,type WarUnit} from './phase4';

const people=[{id:'protagonist',name:'主角',alive:true,location:'郡府',office:''}];
const unit:WarUnit={id:'guard',faction:'守軍（示例）',commanderId:'captain',commanderName:'守將・示例',location:'木架旁',strength:20,reserve:0,supply:2,morale:60,fatigue:0,terrain:'平地',wounded:0,killed:0,routed:0,order:'防守',position:{x:1,y:0,z:0}};
const scene:BattleSceneManifest={example:true,coordinateScale:'meters',objects:[
  {id:'ram',label:'撞木',location:'前沿',condition:'待發',position:{x:0,y:0,z:0},radius:0.5,rigidBody:{massKg:1,restitution:0,velocityMps:{x:0,y:0,z:0},failureEnergyJ:20}},
  {id:'gate',label:'木門',location:'門洞',condition:'閉合',position:{x:1,y:0,z:0},radius:0.5,rigidBody:{massKg:100,anchored:true,restitution:0,velocityMps:{x:0,y:0,z:0}}},
],potentialChains:[],observers:[]};
const start=(candidate:BattleSceneManifest=scene)=>applyPhase4Action(createPhase4Model(184,1,people),{type:'StartBattle',id:'physics-sample',location:'門洞（示例）',units:[unit],protagonistPresent:false,scene:candidate},people);
const act=(state:Phase4Model,action:Phase4Action)=>applyPhase4Action(state,action,people);
const impulse:Phase4Action={type:'ResolveBattleImpulse',targetObjectId:'ram',impulseNs:{x:10,y:0,z:0}};

describe('A271 公尺座標球形剛體接觸動量',()=>{
  it('依質量、恢復係數與明示接觸結算速度和耗散；不自行增列傷亡',()=>{
    const started=start(),resolved=act(started,impulse),objects=resolved.battle!.scene!.objects;
    expect(objects[0]).toMatchObject({destroyed:true,integrity:0,rigidBody:{velocityMps:{x:0,y:0,z:0},accumulatedDissipationJ:25}});
    expect(objects[1]!.rigidBody!.velocityMps).toEqual({x:0,y:0,z:0});
    expect(resolved.battle!.units[0]).toMatchObject({strength:20,killed:0,wounded:0,routed:0,morale:60});
    expect(resolved.battle!.logs.at(-1)).toContain('撞木↔木門');
    expect(resolved.battle!.logs.at(-1)).toContain('耗散能量 50 J');
    expect(act(started,impulse)).toEqual(resolved);
    expect(()=>act(resolved,impulse)).toThrow('無效');
    expect(JSON.parse(JSON.stringify(resolved)).battle.scene).toEqual(resolved.battle!.scene);
  });

  it('不把非接觸物件當成受力目標，並保留完全彈性碰撞的動能',()=>{
    const isolated={...scene,objects:[scene.objects[0]!,{...scene.objects[1]!,position:{x:5,y:0,z:0},rigidBody:{massKg:1,restitution:1,velocityMps:{x:0,y:0,z:0}}}]},started=start(isolated),resolved=act(started,impulse);
    expect(resolved.battle!.scene!.objects[0]!.rigidBody!.velocityMps).toEqual({x:10,y:0,z:0});
    expect(resolved.battle!.scene!.objects[1]!.rigidBody!.velocityMps).toEqual({x:0,y:0,z:0});
    expect(resolved.battle!.logs.at(-1)).toContain('無球形剛體接觸');
  });

  it('兩個同質量活動剛體的正向彈性接觸交換速度並守恆動能',()=>{
    const moving={...scene,objects:[{...scene.objects[0]!,rigidBody:{...scene.objects[0]!.rigidBody!,restitution:1}},{...scene.objects[1]!,rigidBody:{massKg:1,restitution:1,velocityMps:{x:0,y:0,z:0}}}]},started=start(moving),resolved=act(started,impulse);
    expect(resolved.battle!.scene!.objects[0]!.rigidBody!.velocityMps).toEqual({x:0,y:0,z:0});
    expect(resolved.battle!.scene!.objects[1]!.rigidBody!.velocityMps).toEqual({x:10,y:0,z:0});
    expect(resolved.battle!.logs.at(-1)).toContain('碰撞耗散能量 0 J');
  });

  it('接觸後有限修正初始球體穿透位置',()=>{
    const overlapping={...scene,objects:[scene.objects[0]!,{...scene.objects[1]!,position:{x:.9,y:0,z:0}}]},resolved=act(start(overlapping),{type:'ResolveBattleImpulse',targetObjectId:'ram',impulseNs:{x:1,y:0,z:0}}),objects=resolved.battle!.scene!.objects;
    expect(Math.hypot(objects[1]!.position!.x-objects[0]!.position!.x,objects[1]!.position!.y-objects[0]!.position!.y,objects[1]!.position!.z!-objects[0]!.position!.z!)).toBeGreaterThan(.99);
  });

  it('拒絕非公尺座標、缺少剛體欄位與非法質量／恢復係數',()=>{
    expect(()=>start({...scene,coordinateScale:'normalized'})).toThrow('戰場物件資料無效');
    expect(()=>start({...scene,objects:[{...scene.objects[0]!,radius:undefined}]})).toThrow('戰場物件資料無效');
    expect(()=>start({...scene,objects:[{...scene.objects[0]!,rigidBody:{massKg:0,restitution:0}}]})).toThrow('戰場物件資料無效');
    expect(()=>start({...scene,objects:[{...scene.objects[0]!,rigidBody:{massKg:1,restitution:1.1}}]})).toThrow('戰場物件資料無效');
    expect(()=>start({...scene,objects:[{...scene.objects[1]!,rigidBody:{massKg:1,restitution:0,anchored:true,velocityMps:{x:1,y:0,z:0}}}]})).toThrow('戰場物件資料無效');
    const started=start();
    expect(()=>act(started,{type:'ResolveBattleImpulse',targetObjectId:'ram',impulseNs:{x:Number.NaN,y:0,z:0}})).toThrow('無效');
    expect(()=>act(started,{type:'ResolveBattleImpulse',targetObjectId:'gate',impulseNs:{x:10,y:0,z:0}})).toThrow('無效');
  });

  it('不改變沒有剛體屬性的舊版戰場與直接打擊行為',()=>{
    const legacy:BattleSceneManifest={example:true,objects:[{id:'beam',label:'木梁',location:'前沿',condition:'完整',position:{x:0,y:0},integrity:5}],potentialChains:[],observers:[]},started=start(legacy);
    expect(()=>act(started,impulse)).toThrow('戰場物理結算需要進行中的公尺座標戰役');
    expect(act(started,{type:'ResolveBattleImpact',targetObjectId:'beam',force:2}).battle!.scene!.objects[0]!.integrity).toBe(3);
  });
});

describe('A272 有界短時剛體推進',()=>{
  it('物件先有間距再推進接觸，時間與部隊傷亡帳保持不變',()=>{
    const started=start({...scene,objects:[scene.objects[0]!,{...scene.objects[1]!,position:{x:2,y:0,z:0}}]}),launched=act(started,impulse),action:Phase4Action={type:'AdvanceBattlePhysics',seconds:.1},advanced=act(launched,action),objects=advanced.battle!.scene!.objects;
    expect(objects[0]).toMatchObject({destroyed:true,integrity:0});
    expect(objects[0]!.position!.x).toBeGreaterThan(.9);
    expect(objects[1]!.position!.x).toBe(2);
    expect(advanced.battle!.logs.at(-1)).toContain('撞木↔木門');
    expect(advanced.battle!.units[0]).toMatchObject({strength:20,killed:0,wounded:0,routed:0});
    expect(advanced.day).toBe(started.day);
    expect(act(launched,action)).toEqual(advanced);
    expect(JSON.parse(JSON.stringify(advanced)).battle.scene).toEqual(advanced.battle!.scene);
  });

  it('限制推進時長及防止高速小半徑物件以過少子步穿越',()=>{
    const started=start();
    expect(()=>act(started,{type:'AdvanceBattlePhysics',seconds:10.1})).toThrow('不超過 10 秒');
    const fast={...scene,objects:[{...scene.objects[0]!,radius:.01,rigidBody:{massKg:1,restitution:0,velocityMps:{x:1000,y:0,z:0}}}]},fastBattle=start(fast);
    expect(()=>act(fastBattle,{type:'AdvanceBattlePhysics',seconds:10})).toThrow('子步超出上限');
    expect(fastBattle.battle!.scene!.objects[0]!.position!.x).toBe(0);
  });
});
