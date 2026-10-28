import {describe,it,expect} from 'vitest';
import {createOpeningFacts,dispatch,ENGINE_VERSION} from '../engine';
import {answerAgeQuestion,characterAgeLabel,isAgeQuestion} from './status';
describe('年齡查詢與行動分離',()=>{
  const facts=createOpeningFacts(81,184,{regions:[],surnames:[]});
  const state=dispatch(null,{version:ENGINE_VERSION,commandId:'status-start',expectedRevision:0,type:'StartGame',name:'測試',seed:81,facts}).state!;
  it('驚嘆與疑問語氣查詢年齡，僅從存檔回答，不產生事件或修改狀態',()=>{
    const before=structuredClone(state);
    for(const text of ['我才幾歲!?','我現在幾歲？','我年齡多少','請問主角多大了？'])expect(answerAgeQuestion(text,state)).toContain('0 歲 0 個月');
    expect(state).toEqual(before);
  });
  it('混合行動、他人年齡與其他問句不誤判為單純年齡詢問',()=>{
    for(const text of ['我幾歲？然後去經商','他幾歲？','我想讀書','我能幹嘛？'])expect(isAgeQuestion(text)).toBe(false);
  });
  it('幼年顯示模型月齡，跨年正確，成年維持歲數',()=>{
    expect(characterAgeLabel({...state,world:{...state.world,month:3}})).toBe('0 歲 2 個月');
    expect(characterAgeLabel({...state,world:{...state.world,year:185,month:1},character:{...state.character,age:1}})).toBe('1 歲 0 個月');
    expect(characterAgeLabel({...state,character:{...state.character,age:20}})).toBe('20 歲');
  });
});
