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
