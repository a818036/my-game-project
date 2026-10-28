import {describe,expect,it} from 'vitest';
import {createOpeningFacts,dispatch,ENGINE_VERSION,replay} from '../engine';
import {interpretFreeText} from './actions';

function started(){const facts=createOpeningFacts(909,184,{regions:[],surnames:[]});const event=dispatch(null,{version:ENGINE_VERSION,commandId:'phase5-opening',expectedRevision:0,type:'StartGame',name:`${facts.surname}子安`,seed:909,facts});return{state:event.state!,event:event.event!};}
describe('第五階段・規則引擎交互結算',()=>{
  it('文字指定拜訪在場親屬後，信任依明確規則改變並可重播',()=>{
    const {state, event:opening}=started();const target=state.phase2!.scene.presentIds.find(id=>id!=='protagonist')!;const person=state.phase2!.persons.find(item=>item.id===target)!;
    const candidate=interpretFreeText(`拜訪${person.name}`,[],state.phase2!.persons.map(item=>({id:item.id,name:item.name,alive:item.alive,present:state.phase2!.scene.presentIds.includes(item.id)})));
    const command={version:ENGINE_VERSION as typeof ENGINE_VERSION,commandId:'phase5-visit',expectedRevision:state.revision,worldlineId:state.worldlineId,type:'SubmitActionPlan' as const,intents:candidate.actions.map(action=>action.intent),supplement:`拜訪${person.name}`,freeTextActions:candidate.actions};
    const result=dispatch(state,command).state!;
    expect(result.phase2?.relationships.find(record=>record.personId===target)?.trust).toBe(state.phase2?.relationships.find(record=>record.personId===target)?.trust!+2);
    expect(result.actions.at(-1)?.details).toContain(`對象 ${person.name}`);
    expect(result.actions.at(-1)?.details).toContain('候選條件參與結算');
    expect(replay([opening,dispatch(state,command).event!])).toEqual(result);
  });
  it('文字指定人才會進入既有人才招攬流程，不只留下旁白',()=>{
    const {state}=started();const candidate=state.phase4!.candidates.find(item=>item.id==='sample-scribe')!;
    const action={intent:'訪求人才' as const,order:1,targetId:candidate.id,targetName:candidate.name,method:'登門延請'};
    const result=dispatch(state,{version:ENGINE_VERSION,commandId:'phase5-recruit',expectedRevision:state.revision,worldlineId:state.worldlineId,type:'SubmitActionPlan',intents:['訪求人才'],supplement:`招攬${candidate.name}`,freeTextActions:[action]}).state!;
    expect(result.phase4?.candidates.find(item=>item.id===candidate.id)?.status).toBe('approached');
    expect(result.phase4?.eventLedger.some(entry=>entry.type==='開始招攬')).toBe(true);
  });
  it('自由文字不能把天生技救援或永久條約變成通用回合命令',()=>{
    const {state}=started();
    for(const text of ['使用天生技救回已死亡者','永久割地給鄰國並批准條約']){
      const candidate=interpretFreeText(text,[],[]);
      expect(candidate.actions).toEqual([]);
      expect(candidate.unsupported.length+candidate.questions.length).toBeGreaterThan(0);
      expect(()=>dispatch(state,{version:ENGINE_VERSION,commandId:`unsafe-${text}`,expectedRevision:state.revision,worldlineId:state.worldlineId,type:'SubmitActionPlan',intents:[],supplement:text})).toThrow('至少須勾選');
    }
    expect(state.turn).toBe(0);expect(state.phase4?.treaties).toEqual([]);
  });
});
