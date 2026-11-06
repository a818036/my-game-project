import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,upgradePhase4Content,PHASE4_CONTENT_VERSION,HISTORY_CONTENT,HISTORY_SOURCE_DATE_NOTES} from './phase4';
import {answerKnownHistoricalEventQuestion} from './life';
import {createOpeningFacts,dispatch,ENGINE_VERSION,type GameState,type OpeningHistory} from './engine';

function world():GameState {
  const history:OpeningHistory={regions:[],surnames:[]};
  const facts=createOpeningFacts(23,184,history);
  return dispatch(null,{version:ENGINE_VERSION,commandId:'yuan-shu-chronology-world',expectedRevision:0,type:'StartGame',name:`${facts.surname}史料`,seed:23,facts}).state!;
}

describe('A263 Yuan Shu source chronology reconciliation',()=>{
  const canonicalId='yuan-shu-proclaims-emperor-195';
  const variantId='yuan-shu-proclaims-zhong-jia-197';

  it('keeps the two source dates as one playable event and explains the 197 query',()=>{
    const advanced=advancePhase4(createPhase4Model(194,1,[],PHASE4_CONTENT_VERSION),1080);
    const records=advanced.eventLedger.filter(item=>item.detail.includes('袁術僭號仲氏'));
    expect(records).toHaveLength(1);
    expect(records[0].year).toBe(195);
    expect(HISTORY_SOURCE_DATE_NOTES[canonicalId]).toContain('同一稱帝記事');
    expect(HISTORY_CONTENT.find(node=>node.id===variantId)?.retired).toBe(true);
    expect(answerKnownHistoricalEventQuestion('西元 197 年袁術發生了什麼事？',world())?.answer).toContain('只在 195 年結算一次');
  });

  it('v135 saves preserve their old event prefix while retiring the duplicate dating node',()=>{
    const before195=advancePhase4(createPhase4Model(194,1,[],'phase4-scenario-135'),720);
    expect(before195.nodes.find(node=>node.contentId===canonicalId)?.status).toBe('triggered');
    expect(before195.nodes.find(node=>node.contentId===variantId)?.status).toBe('pending');
    const prefix=structuredClone(before195.eventLedger);
    const upgraded=upgradePhase4Content(before195,PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(node=>node.contentId===canonicalId)?.status).toBe('triggered');
    expect(upgraded.nodes.some(node=>node.contentId===variantId)).toBe(false);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.eventLedger.at(-1)?.type).toBe('史實來源補充');

    const after197=advancePhase4(createPhase4Model(194,1,[],'phase4-scenario-135'),1080);
    const oldPrefix=structuredClone(after197.eventLedger);
    expect(after197.eventLedger.filter(item=>item.detail.includes('袁術'))).toHaveLength(2);
    const corrected=upgradePhase4Content(after197,PHASE4_CONTENT_VERSION);
    expect(corrected.eventLedger.slice(0,oldPrefix.length)).toEqual(oldPrefix);
    expect(corrected.eventLedger.at(-1)?.detail).toContain('只以既有節點結算一次');
    expect(corrected.nodes.some(node=>node.contentId===variantId)).toBe(false);
  });
});
