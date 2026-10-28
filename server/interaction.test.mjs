import {describe,it,expect} from 'vitest';
import {interpretInteraction,validateInteractionPayload,validateInteractionOutput} from './interaction.mjs';
const payload={text:'我才幾歲就能經商？',context:{age:0,monthAge:2,location:'家宅庭院',presentNames:[]},choices:['observe','listen','reflect','rest'].map(id=>({id,label:id,description:'留在原處',days:1}))};
describe('互動理解的權限邊界',()=>{
  it('只接收最少公開情境，不接受完整存檔或秘密',()=>{expect(()=>validateInteractionPayload(payload)).not.toThrow();expect(()=>validateInteractionPayload({...payload,context:{...payload.context,privateFacts:['secret']}})).toThrow();});
  it('詢問不能夾帶行動，不能造出不在白名單的能力或成人行動',()=>{
    const result={kind:'question',answer:'目前兩個月。',choiceIds:[],questions:[]};expect(validateInteractionOutput(result,payload)).toEqual(result);
    expect(()=>validateInteractionOutput({...result,choiceIds:['rest']},payload)).toThrow('不得');expect(()=>validateInteractionOutput({...result,kind:'action',choiceIds:['adult-trade']},payload)).toThrow('格式');
  });
  it('真實 adapter 使用情境分類 schema，回覆不修改請求資料',async()=>{
    const before=structuredClone(payload),expected={kind:'objection',answer:'你仍在嬰幼兒階段，不應把普通經商當成已完成。',choiceIds:[],questions:[]};
    const r=await interpretInteraction(payload,{apiKey:'test',fetchImpl:async(_url,o)=>{const request=JSON.parse(o.body);expect(request.text.format.name).toBe('shenzhou_interaction');return new Response(JSON.stringify({output_text:JSON.stringify(expected)}));}});
    expect(r).toEqual(expected);expect(payload).toEqual(before);
  });
});
