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
});
