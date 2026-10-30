import {afterEach,describe,expect,it,vi} from 'vitest';
import {answerKnownHistoricalPersonTimelineQuestion,localInteraction} from './life';
import {HISTORY_CONTENT} from './phase4';
import {createOpeningFacts,dispatch,ENGINE_VERSION} from './engine';
import {understandInput} from './narration/interaction';

afterEach(()=>vi.unstubAllGlobals());

describe('A373 other-person historical timeline queries',()=>{
  it('answers a Liu Bei timeline from sourced nodes without claiming a complete biography',()=>{
    const result=answerKnownHistoricalPersonTimelineQuestion('請整理劉備生平年表');
    expect(result?.kind).toBe('question');
    expect(result?.answer).toContain('劉備殺車胄、屯兵沛地');
    expect(result?.answer).toContain('《三國志》');
    expect(result?.answer).toContain('不是完整生平');
    expect(result?.choiceIds).toEqual([]);
  });

  it('includes only a sourced node that names Zhang Jue, not another person’s unrelated timeline',()=>{
    const result=answerKnownHistoricalPersonTimelineQuestion('請整理張角生平年表');
    expect(result?.answer).toContain('黃巾起事');
    expect(result?.answer).toContain('《後漢書》');
    expect(result?.answer).not.toContain('劉備殺車胄');
  });

  it('A383 distinguishes the 20-item display limit from missing years through the player input path',async()=>{
    const person='曹操';
    const records=HISTORY_CONTENT.filter(item=>!item.retired&&item.kind==='event'&&item.source.startsWith('《')&&`${item.title} ${item.description} ${item.carrier}`.includes(person)).sort((a,b)=>a.startYear-b.startYear||a.id.localeCompare(b.id));
    expect(records).toHaveLength(24);
    const facts=createOpeningFacts(383,184,{regions:[],surnames:[]});
    const state=dispatch(null,{version:ENGINE_VERSION,commandId:'a383-person-timeline-start',expectedRevision:0,type:'StartGame',name:'測試玩家',seed:383,facts}).state!;
    const before=structuredClone(state),fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
    const result=await understandInput(`請整理${person}生平年表`,state,new AbortController().signal);
    expect(result?.answer).toContain('前 20 筆');
    expect(result?.answer).toContain('20 筆顯示上限');
    for(const record of records.slice(0,20))expect(result?.answer).toContain(record.title);
    expect(result?.answer).not.toContain(records[20]!.title);
    expect(result?.answer).toContain('沒有列出的年份可能是索引缺口，也可能是符合條件的節點超過本次 20 筆顯示上限');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(state).toEqual(before);
    expect(state.turn).toBe(0);
  });

  it('leaves Sun Quan to the existing precision-aware biography path and ignores ordinary questions',()=>{
    expect(answerKnownHistoricalPersonTimelineQuestion('請整理孫權生平年表')).toBeNull();
    expect(answerKnownHistoricalPersonTimelineQuestion('曹操是誰？')).toBeNull();
    expect(answerKnownHistoricalPersonTimelineQuestion('比較劉備與曹操的生平年表')?.answer).toContain('請指定其中一位');
    expect(answerKnownHistoricalPersonTimelineQuestion('比較孫權與劉備的生平年表')?.answer).toContain('不會擅自挑選');
  });

  it('routes a player timeline question through the local interaction without mutating the game',()=>{
    const facts=createOpeningFacts(373,184,{regions:[],surnames:[]});
    const state=dispatch(null,{version:ENGINE_VERSION,commandId:'timeline-start',expectedRevision:0,type:'StartGame',name:'測試玩家',seed:373,facts}).state!;
    const before=structuredClone(state);
    const result=localInteraction('請整理劉備生平年表',state);
    expect(result.answer).toContain('劉備殺車胄、屯兵沛地');
    expect(result.choiceIds).toEqual([]);
    expect(state).toEqual(before);
  });
});
