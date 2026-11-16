import {describe,expect,it} from 'vitest';
import {computeBattleVisibility} from './battle-geometry';
import type {BattleSceneManifest,WarUnit} from './phase4';

const units:WarUnit[]=[{id:'blue',faction:'守軍',commanderId:'blue-captain',commanderName:'守將',location:'前線',strength:100,reserve:0,supply:1,morale:50,fatigue:0,terrain:'平原',wounded:0,killed:0,routed:0,order:'防守',position:{x:10,y:0}}];
const scene:BattleSceneManifest={example:true,objects:[{id:'screen',label:'土牆',location:'前線',condition:'遮擋視線',position:{x:5,y:0},radius:1,blocksLineOfSight:true},{id:'flag',label:'旗幟',location:'前線',condition:'示例標記',position:{x:3,y:4}}],potentialChains:[],observers:[{id:'near',side:'觀察者',location:'後方',visibility:'舊文字描述',position:{x:0,y:0},sightRange:12}]};

describe('2D battle visibility estimate',()=>{
  it('computes range and segment-circle occlusion from coordinates',()=>{
    const result=computeBattleVisibility(scene,scene.observers[0],units)!;
    expect(result.find(item=>item.targetId==='object:flag')).toMatchObject({visible:true,distance:5});
    expect(result.find(item=>item.targetId==='unit:blue')).toMatchObject({visible:false,reason:'occluded',blockedBy:'土牆',distance:10});
  });
  it('marks targets beyond sight range without inferring they are hidden by an obstacle',()=>{
    const observer={...scene.observers[0],sightRange:4};
    expect(computeBattleVisibility(scene,observer,units)!.find(item=>item.targetId==='object:flag')).toMatchObject({visible:false,reason:'beyond-range'});
  });
  it('returns null for legacy scenes that have no observer geometry',()=>{
    expect(computeBattleVisibility(scene,{id:'legacy',side:'觀察者',location:'後方',visibility:'依舊存檔描述'},units)).toBeNull();
  });
  it('uses elevation in 3D distance and spherical occlusion',()=>{
    const elevatedScene:BattleSceneManifest={example:true,coordinateScale:'meters',objects:[{id:'wall',label:'高牆',location:'前線',condition:'高出視線',position:{x:5,y:0,z:4},radius:1,blocksLineOfSight:true},{id:'target',label:'高臺旗幟',location:'高臺',condition:'可見',position:{x:10,y:0,z:0}}],potentialChains:[],observers:[{id:'elevated-observer',side:'守軍',location:'地面',visibility:'三維座標',position:{x:0,y:0,z:0},sightRange:12}]};
    const result=computeBattleVisibility(elevatedScene,elevatedScene.observers[0],units)!;
    expect(result.find(item=>item.targetId==='object:target')).toMatchObject({visible:true,distance:10});
    expect(result.find(item=>item.targetId==='unit:blue')).toMatchObject({visible:true});
    const raisedBlocker={...elevatedScene,objects:[{...elevatedScene.objects[0],position:{x:5,y:0,z:0}},elevatedScene.objects[1]]};
    expect(computeBattleVisibility(raisedBlocker,elevatedScene.observers[0],units)!.find(item=>item.targetId==='object:target')).toMatchObject({visible:false,reason:'occluded',blockedBy:'高牆'});
    const highTarget={...elevatedScene,objects:[{...elevatedScene.objects[0],position:{x:5,y:0,z:50}}, {...elevatedScene.objects[1],position:{x:10,y:0,z:12}}],observers:[{...elevatedScene.observers[0],sightRange:10}]};
    expect(computeBattleVisibility(highTarget,highTarget.observers[0],units)!.find(item=>item.targetId==='object:target')).toMatchObject({visible:false,reason:'beyond-range',distance:15.62});
  });
  it('projects purely vertical sight segments in 3D when checking blockers',()=>{
    const vertical:BattleSceneManifest={example:true,coordinateScale:'meters',objects:[{id:'tower',label:'塔樓',location:'塔中',condition:'遮擋',position:{x:0,y:0,z:5},radius:1,blocksLineOfSight:true},{id:'roof-flag',label:'樓頂旗',location:'塔頂',condition:'目標',position:{x:0,y:0,z:10}}],potentialChains:[],observers:[{id:'courtyard',side:'守軍',location:'院內',visibility:'三維視線',position:{x:0,y:0,z:0},sightRange:12}]};
    expect(computeBattleVisibility(vertical,vertical.observers[0],[])!.find(item=>item.targetId==='object:roof-flag')).toMatchObject({visible:false,reason:'occluded',blockedBy:'塔樓',distance:10});
  });
});
