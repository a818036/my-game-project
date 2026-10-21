import {afterEach,describe,expect,it,vi} from 'vitest';
import {interpretFreeText,interpretWithConfiguredProvider,validateFreeTextCandidate} from './actions';

describe('第五階段・自由文字候選行動',()=>{
  afterEach(()=>vi.unstubAllGlobals());
  it('將自然文字中的先後順序與方式轉成候選，不自行執行',()=>{
    const candidate=interpretFreeText('先讀兵書，再到市集做生意',[],[]);
    expect(candidate.actions).toEqual([{intent:'耕讀自持',order:1,method:'讀兵書'},{intent:'經商營生',order:2,method:'做生意'}]);
    expect(candidate.needsConfirmation).toBe(true);
    validateFreeTextCandidate(candidate,[],[]);
  });
  it('唯一在場人物目標可作為拜訪對象並記錄條件',()=>{
    const targets=[{id:'p-1',name:'陳伯和',alive:true,present:true}];
    const candidate=interpretFreeText('若陳伯和仍在場，就拜訪陳伯和',[],targets);
    expect(candidate.actions[0]).toMatchObject({intent:'遊歷鄉里',targetId:'p-1',targetName:'陳伯和',condition:'目標仍在場'});
    expect(candidate.questions).toEqual([]);
    validateFreeTextCandidate(candidate,[],targets);
  });
  it('指定人才只有命中可招攬候選時才產生命令；未知目標須澄清',()=>{
    const targets=[{id:'sample-scribe',name:'郡府書佐・示例人才',alive:true,present:false,recruitable:true}];
    const known=interpretFreeText('招攬郡府書佐',[],targets);
    expect(known.actions[0]).toMatchObject({intent:'訪求人才',targetId:'sample-scribe'});
    const unknown=interpretFreeText('招攬諸葛亮',[],targets);
    expect(unknown.questions.join(' ')).toContain('不是目前可辨識');
  });
  it('互斥行程、否定語意及未支援能力都停在理解階段',()=>{
    expect(interpretFreeText('先讀書再去遊歷村落',[],[]).conflicts.join(' ')).toContain('地點衝突');
    expect(interpretFreeText('不要經商',[],[]).questions.join(' ')).toContain('否定');
    const ability=interpretFreeText('使用天生技治療孫堅並救回死亡者',[],[]);
    expect(ability.unsupported.join(' ')).toContain('尚未支援');
    expect(ability.actions).toEqual([]);
  });
  it('玩家勾選項目與文字候選同樣接受規則衝突檢查',()=>{
    const candidate=interpretFreeText('再去遊歷鄉里', ['耕讀自持'],[]);
    expect(candidate.conflicts.join(' ')).toContain('地點衝突');
  });
  it('mock 模式由本機確定性解析器產生候選，不呼叫 AI 解析端點',async()=>{
    const calls:string[]=[];vi.stubGlobal('fetch',async(input:string)=>{calls.push(input);return new Response(JSON.stringify({provider:'mock'}),{status:200});});
    const candidate=await interpretWithConfiguredProvider('先讀兵書，再到市集做生意',[],[],new AbortController().signal);
    expect(candidate.interpretationSource).toContain('mock');expect(candidate.actions.map(item=>item.intent)).toEqual(['耕讀自持','經商營生']);expect(calls).toEqual(['/api/health']);
  });
  it('真實供應者候選須限制在遊戲允許目標並等待玩家確認',async()=>{
    const targets=[{id:'p-1',name:'陳伯和',alive:true,present:true}];const candidate={actions:[{intent:'遊歷鄉里',order:1,targetId:'p-1',targetName:'陳伯和',method:'拜訪',condition:null}],questions:[],unsupported:[],unparsedText:''};
    vi.stubGlobal('fetch',async(input:string)=>input==='/api/health'?new Response(JSON.stringify({provider:'openai'}),{status:200}):new Response(JSON.stringify(candidate),{status:200}));
    const result=await interpretWithConfiguredProvider('拜訪陳伯和',[],targets,new AbortController().signal);
    expect(result.interpretationSource).toContain('OpenAI');expect(result.actions[0]).toMatchObject({intent:'遊歷鄉里',order:1,targetId:'p-1',targetName:'陳伯和',method:'拜訪'});expect(result.needsConfirmation).toBe(true);
  });
  it('AI 解析服務失敗時回退確定性解析並明確標示來源',async()=>{
    vi.stubGlobal('fetch',async(input:string)=>input==='/api/health'?new Response(JSON.stringify({provider:'openai'}),{status:200}):new Response(JSON.stringify({error:'上限'}),{status:429}));
    const result=await interpretWithConfiguredProvider('讀兵書',[],[],new AbortController().signal);
    expect(result.actions[0]?.intent).toBe('耕讀自持');expect(result.interpretationSource).toContain('本機確定性回退');
  });
  it('取消真實解析請求會中止等待並保留為未結算候選',async()=>{
    const controller=new AbortController();vi.stubGlobal('fetch',async(input:string,options?:RequestInit):Promise<Response>=>{
      if(input==='/api/health')return new Response(JSON.stringify({provider:'openai'}),{status:200});
      return new Promise<Response>((_resolve,reject)=>{if(options?.signal?.aborted)reject(new DOMException('Aborted','AbortError'));else options?.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')));});
    });
    const pending=interpretWithConfiguredProvider('讀兵書',[],[],controller.signal);await Promise.resolve();await Promise.resolve();controller.abort();await expect(pending).rejects.toThrow();
  });
});
