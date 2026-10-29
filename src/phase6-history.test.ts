import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,upgradePhase4Content,PHASE4_CONTENT_VERSION} from './phase4';
import {answerKnownSunQuanBiographyQuestion} from './life';

describe('Phase 6 sourced Sun Quan chronology',()=>{
  const id='sun-quan-protects-families-of-defectors-227';

  it('A231 records the 227 Pei Songzhi annotation without inventing a month or policy scope',()=>{
    const model=createPhase4Model(226,1,[],PHASE4_CONTENT_VERSION);
    const advanced=advancePhase4(model,360);
    expect(advanced.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    const event=advanced.eventLedger.find(item=>item.detail.includes('孫權下令不得因部下亡叛而殺其妻子'));
    expect(event?.source).toContain('裴松之注引《江表傳》');
    expect(event?.source).toContain('沒有提供詔令月日');
    expect(event?.detail).not.toContain('普遍司法制度');
  });

  it('v116 save continues into 227 and preserves its event prefix; same-year saves do not backfill',()=>{
    const old=createPhase4Model(226,1,[],'phase4-scenario-116');
    const prefix=structuredClone(old.eventLedger);
    const migrated=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(migrated.contentVersion).toBe('phase4-scenario-117');
    expect(migrated.nodes.find(node=>node.contentId===id)?.status).toBe('pending');
    expect(migrated.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(advancePhase4(migrated,360).nodes.find(node=>node.contentId===id)?.status).toBe('triggered');

    const sameYear=upgradePhase4Content(createPhase4Model(227,1,[],'phase4-scenario-116'),PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find(node=>node.contentId===id)).toMatchObject({status:'resolved',resolvedYear:227});
    expect(sameYear.eventLedger.some(item=>item.detail.includes('孫權下令不得因部下亡叛而殺其妻子'))).toBe(false);
  });

  it('the known biography answer includes the sourced policy and marks its annotation source',()=>{
    const result=answerKnownSunQuanBiographyQuestion('請整理孫權生平年表');
    expect(result?.answer).toContain('孫權下令不得因部下亡叛而殺其妻子');
    expect(result?.answer).toContain('裴松之注引《江表傳》');
    expect(result?.answer).toContain('沒有提供詔令月日');
  });
});
