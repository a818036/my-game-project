import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,upgradePhase4Content,PHASE4_CONTENT_VERSION,HISTORY_CONTENT} from './phase4';
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
    expect(migrated.contentVersion).toBe('phase4-scenario-118');
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

  it('A232 records the 229 Wu–Shu treaty and September move to Jianye at source precision',()=>{
    const allianceId='wu-shu-alliance-partition-229';
    const capitalId='sun-quan-moves-capital-to-jianye-229';
    const advanced=advancePhase4(createPhase4Model(228,1,[],PHASE4_CONTENT_VERSION),360);
    expect(advanced.nodes.find(node=>node.contentId===allianceId)?.status).toBe('triggered');
    expect(advanced.nodes.find(node=>node.contentId===capitalId)?.status).toBe('triggered');
    const alliance=HISTORY_CONTENT.find(item=>item.id===allianceId)!;
    const capital=HISTORY_CONTENT.find(item=>item.id===capitalId)!;
    expect(alliance.precision).toBe('year');
    expect(alliance.source).toContain('沒有提供盟約簽訂月日');
    expect(alliance.description).toContain('不將盟書轉成玩家領地變更');
    expect(capital.precision).toBe('year');
    expect(capital.sourceDateNote).toContain('秋九月');
    expect(capital.source).toContain('輔太子孫登、掌武昌留事');
  });

  it('v117 migration preserves the event prefix, triggers only future 229 nodes, and never backfills',()=>{
    const allianceId='wu-shu-alliance-partition-229';
    const capitalId='sun-quan-moves-capital-to-jianye-229';
    const old=createPhase4Model(228,1,[],'phase4-scenario-117');
    const prefix=structuredClone(old.eventLedger);
    const migrated=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(migrated.contentVersion).toBe('phase4-scenario-118');
    expect(migrated.nodes.find(node=>node.contentId===allianceId)?.status).toBe('pending');
    expect(migrated.nodes.find(node=>node.contentId===capitalId)?.status).toBe('pending');
    expect(migrated.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    const continued=advancePhase4(migrated,360);
    expect(continued.nodes.find(node=>node.contentId===allianceId)?.status).toBe('triggered');
    expect(continued.nodes.find(node=>node.contentId===capitalId)?.status).toBe('triggered');

    const sameYear=upgradePhase4Content(createPhase4Model(229,1,[],'phase4-scenario-117'),PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find(node=>node.contentId===allianceId)).toMatchObject({status:'resolved',resolvedYear:229});
    expect(sameYear.nodes.find(node=>node.contentId===capitalId)).toMatchObject({status:'resolved',resolvedYear:229});
    expect(sameYear.eventLedger.some(item=>item.detail.includes('吳蜀約定分界、共同討魏'))).toBe(false);
    expect(sameYear.eventLedger.some(item=>item.detail.includes('孫權遷都建業、命陸遜留武昌輔太子'))).toBe(false);
  });

  it('the known biography answer includes 229 sourced milestones with their date limits',()=>{
    const result=answerKnownSunQuanBiographyQuestion('請整理孫權生平年表');
    expect(result?.answer).toContain('吳蜀約定分界、共同討魏');
    expect(result?.answer).toContain('孫權遷都建業、命陸遜留武昌輔太子');
    expect(result?.answer).toContain('黃龍元年秋九月');
    expect(result?.answer).toContain('沒有提供盟約簽訂月日');
  });
});
