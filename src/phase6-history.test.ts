import {describe,expect,it} from 'vitest';
import {advancePhase4,createPhase4Model,upgradePhase4Content,PHASE4_CONTENT_VERSION,HISTORY_CONTENT,HISTORY_SOURCE_DATE_NOTES} from './phase4';
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
    expect(migrated.contentVersion).toBe(PHASE4_CONTENT_VERSION);
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
    expect(alliance.source).toContain('豫、青、徐、幽屬吳；兗、冀、并、涼屬蜀；司州以函谷關為界');
    expect(alliance.source).toContain('沒有提供盟約簽訂月日');
    expect(alliance.description).toContain('不表示各州實際控制狀況');
    expect(alliance.description).toContain('不轉成玩家領地變更');
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
    expect(migrated.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(migrated.nodes.find(node=>node.contentId===allianceId)?.status).toBe('pending');
    expect(migrated.nodes.find(node=>node.contentId===capitalId)?.status).toBe('pending');
    expect(migrated.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    const continued=advancePhase4(migrated,360);
    expect(continued.nodes.find(node=>node.contentId===allianceId)?.status).toBe('triggered');
    expect(continued.nodes.find(node=>node.contentId===capitalId)?.status).toBe('triggered');

    const sameYear=upgradePhase4Content(createPhase4Model(229,1,[],'phase4-scenario-117'),PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find(node=>node.contentId===allianceId)).toMatchObject({status:'resolved',resolvedYear:229});
    expect(sameYear.nodes.find(node=>node.contentId===capitalId)).toMatchObject({status:'resolved',resolvedYear:229});
    expect(sameYear.eventLedger.some(item=>item.detail.includes('吳蜀盟約分州、共同討魏'))).toBe(false);
    expect(sameYear.eventLedger.some(item=>item.detail.includes('孫權遷都建業、命陸遜留武昌輔太子'))).toBe(false);
  });

  it('the known biography answer includes the 221 and 229 sourced milestones with their date limits',()=>{
    const result=answerKnownSunQuanBiographyQuestion('請整理孫權生平年表');
    expect(result?.answer).toContain('吳蜀盟約分州、共同討魏');
    expect(result?.answer).toContain('孫權遷都建業、命陸遜留武昌輔太子');
    expect(result?.answer).toContain('群臣勸孫權即尊號，孫權不許');
    expect(result?.answer).toContain('夏四月，權群臣勸即尊號，權不許');
    expect(result?.answer).toContain('建業上報甘露降');
    expect(result?.answer).toContain('五月，建業言甘露降');
    expect(result?.answer).toContain('黃龍元年秋九月');
    expect(result?.answer).toContain('沒有提供盟約簽訂月日');
  });

  it('A233 keeps v118 event history unchanged when upgrading to current content',()=>{
    const old=createPhase4Model(227,1,[],'phase4-scenario-118');
    const prefix=structuredClone(old.eventLedger);
    const priorStatuses=Object.fromEntries(old.nodes.map(node=>[node.contentId,node.status]));
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    for(const [nodeId,status] of Object.entries(priorStatuses))if(!['sun-quan-builds-wuchang-and-warns-generals-221','sun-quan-capital-reports-sweet-dew-221','sun-quan-declines-imperial-title-221'].includes(nodeId))expect(upgraded.nodes.find(node=>node.contentId===nodeId)?.status).toBe(status);
  });

  it('A234 keeps v119 event history unchanged while adding source-only date context',()=>{
    const old=createPhase4Model(218,1,[],'phase4-scenario-119');
    const prefix=structuredClone(old.eventLedger);
    const priorStatuses=Object.fromEntries(old.nodes.map(node=>[node.contentId,node.status]));
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    for(const [nodeId,status] of Object.entries(priorStatuses))if(!['sun-quan-builds-wuchang-and-warns-generals-221','sun-quan-capital-reports-sweet-dew-221','sun-quan-declines-imperial-title-221'].includes(nodeId))expect(upgraded.nodes.find(node=>node.contentId===nodeId)?.status).toBe(status);
  });

  it('A235 records Wei investiture-era submission without assigning it a new year',()=>{
    const node=HISTORY_CONTENT.find(item=>item.id==='sun-quan-accepts-king-of-wu-title-221');
    expect(node).toMatchObject({startYear:221,endYear:221,precision:'year'});
    expect(node?.source).toContain('自魏文帝踐祚，權使命稱藩');
    expect(node?.source).toContain('原文未另給稱藩使節或月份');
    expect(node?.description).toContain('不另定月份或年份');
  });

  it('A235 upgrades v120 content without changing prior event or node history',()=>{
    const old=createPhase4Model(221,1,[],'phase4-scenario-120');
    const prefix=structuredClone(old.eventLedger);
    const priorStatuses=Object.fromEntries(old.nodes.map(node=>[node.contentId,node.status]));
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    for(const [nodeId,status] of Object.entries(priorStatuses))if(!['sun-quan-builds-wuchang-and-warns-generals-221','sun-quan-capital-reports-sweet-dew-221','sun-quan-declines-imperial-title-221'].includes(nodeId))expect(upgraded.nodes.find(node=>node.contentId===nodeId)?.status).toBe(status);
  });

  it('A236 records the sourced August 221 Wuchang construction and military order without inventing detail',()=>{
    const node=HISTORY_CONTENT.find(item=>item.id==='sun-quan-builds-wuchang-and-warns-generals-221');
    expect(node).toMatchObject({startYear:221,endYear:221,precision:'year'});
    expect(node?.sourceDateNote).toContain('黃初二年八月');
    expect(node?.source).toContain('下令諸將戒備');
    expect(node?.description).toContain('不推演未載的工程規模、軍隊數量或訓練細節');
    const advanced=advancePhase4(createPhase4Model(220,1,[],PHASE4_CONTENT_VERSION),360);
    expect(advanced.nodes.find(item=>item.contentId===node?.id)?.status).toBe('triggered');
  });

  it('A236 upgrades v121 without changing its event prefix or backfilling the same year',()=>{
    const old=createPhase4Model(220,1,[],'phase4-scenario-121');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    const nodeId='sun-quan-builds-wuchang-and-warns-generals-221';
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(item=>item.contentId===nodeId)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded,360).nodes.find(item=>item.contentId===nodeId)?.status).toBe('triggered');

    const sameYear=upgradePhase4Content(createPhase4Model(221,1,[],'phase4-scenario-121'),PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find(item=>item.contentId===nodeId)).toMatchObject({status:'resolved',resolvedYear:221});
    expect(sameYear.eventLedger.some(item=>item.detail.includes('築武昌城、告誡諸將保持戒備'))).toBe(false);
  });

  it('A237 records the 221 May report as a report, without validating an omen',()=>{
    const id='sun-quan-capital-reports-sweet-dew-221';
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:221,endYear:221,precision:'year'});
    expect(node?.source).toContain('五月，建業言甘露降');
    expect(node?.description).toContain('不把上報記錄等同現象已獲驗證');
    const advanced=advancePhase4(createPhase4Model(220,1,[],PHASE4_CONTENT_VERSION),360);
    expect(advanced.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
  });

  it('A237 upgrades v122 and does not backfill the report for a 221 save',()=>{
    const id='sun-quan-capital-reports-sweet-dew-221';
    const old=createPhase4Model(220,1,[],'phase4-scenario-122');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded,360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');

    const sameYear=upgradePhase4Content(createPhase4Model(221,1,[],'phase4-scenario-122'),PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:221});
    expect(sameYear.eventLedger.some(item=>item.detail.includes('建業上報甘露降'))).toBe(false);
  });

  it('A238 records Sun Quan declining the suggested imperial title without inferring motive',()=>{
    const id='sun-quan-declines-imperial-title-221';
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:221,endYear:221,precision:'year'});
    expect(node?.source).toContain('夏四月，權群臣勸即尊號，權不許');
    expect(node?.description).not.toContain('因為');
    expect(node?.sourceDateNote).toContain('黃初二年夏四月');
    const advanced=advancePhase4(createPhase4Model(220,1,[],PHASE4_CONTENT_VERSION),360);
    expect(advanced.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
  });

  it('A238 upgrades v123 and leaves a 221 save without a backfilled refusal event',()=>{
    const id='sun-quan-declines-imperial-title-221';
    const old=createPhase4Model(220,1,[],'phase4-scenario-123');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded,360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');

    const sameYear=upgradePhase4Content(createPhase4Model(221,1,[],'phase4-scenario-123'),PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:221});
    expect(sameYear.eventLedger.some(item=>item.detail.includes('群臣勸孫權即尊號'))).toBe(false);
  });

  it('A239 records the 222 multi-front invasion and Dongkou storm at year precision',()=>{
    const id='wei-three-front-campaign-and-dongkou-storm-222';
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:222,endYear:222,precision:'year'});
    expect(node?.source).toContain('秋九月');
    expect(node?.source).toContain('冬十一月大風');
    expect(node?.source).toContain('溺死者數千');
    expect(node?.sourceDateNote).toContain('不換算成遊戲日期');
    const advanced=advancePhase4(createPhase4Model(221,1,[],PHASE4_CONTENT_VERSION),360);
    expect(advanced.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
  });

  it('A239 upgrades v124 without changing event history or backfilling 222',()=>{
    const id='wei-three-front-campaign-and-dongkou-storm-222';
    const old=createPhase4Model(221,1,[],'phase4-scenario-124');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded,360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');

    const sameYear=upgradePhase4Content(createPhase4Model(222,1,[],'phase4-scenario-124'),PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:222});
    expect(sameYear.eventLedger.some(item=>item.detail.includes('洞口風災造成呂範部下溺亡'))).toBe(false);
  });

  it('A240 records the 223 Wu calendar reform without changing the game calendar',()=>{
    const id='wu-adopts-qianxiang-calendar-223';
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:223,endYear:223,precision:'year'});
    expect(node?.source).toContain('黃武二年春正月');
    expect(node?.source).toContain('改四分，用《乾象曆》');
    expect(node?.description).toContain('不改動玩家世界日期');
    const upgraded=upgradePhase4Content(createPhase4Model(222,1,[],'phase4-scenario-125'),PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(upgraded.eventLedger.some(item=>item.detail.includes('吳改四分、使用乾象曆'))).toBe(false);
    const advanced=advancePhase4(upgraded,360);
    expect(advanced.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');

    const sameYear=upgradePhase4Content(createPhase4Model(223,1,[],'phase4-scenario-125'),PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:223});
    expect(sameYear.eventLedger.some(item=>item.detail.includes('吳改四分、使用乾象曆'))).toBe(false);
  });

  it('A241 records the 223 Ruxu morning raid and migrates v126 without backfilling',()=>{
    const id='wei-morning-raid-ruxu-defeated-223';
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:223,endYear:223,precision:'year'});
    expect(node?.source).toContain('黃武二年三月');
    expect(node?.source).toContain('擊破常彫');
    expect(node?.description).toContain('不推演逐日戰況');
    const old= createPhase4Model(222,1,[],'phase4-scenario-126');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(upgraded.eventLedger.some(item=>item.detail.includes('魏軍晨渡濡須'))).toBe(false);
    expect(advancePhase4(upgraded,360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const sameYear=upgradePhase4Content(createPhase4Model(223,1,[],'phase4-scenario-126'),PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:223});
    expect(sameYear.eventLedger.some(item=>item.detail.includes('魏軍晨渡濡須'))).toBe(false);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
  });

  it('A242 records the 223 capture of Jin Zong at Qichun with year-level timing',()=>{
    const id='wu-captures-jin-zong-at-qichun-223';
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:223,endYear:223,precision:'year'});
    expect(node?.source).toContain('黃武二年六月');
    expect(node?.source).toContain('邵等生虜宗');
    expect(node?.description).toContain('不推演戰役過程');
    const old=createPhase4Model(222,1,[],'phase4-scenario-127');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded,360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const sameYear=upgradePhase4Content(createPhase4Model(223,1,[],'phase4-scenario-127'),PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:223});
  });

  it('A244 records Sun Quan falling ill after the southern-suburb sacrifice in 251, preserving month precision and migration history',()=>{
    const id='sun-quan-falls-ill-after-southern-suburb-sacrifice-251';
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:251,endYear:251,precision:'year',introducedRevision:129});
    expect(node?.source).toContain('太元元年冬十一月');
    expect(node?.source).toContain('權祭南郊還，寢疾');
    expect(node?.description).toContain('不推論祭祀與疾病的因果');
    expect(node?.description).toContain('不補寫病情');

    const old=createPhase4Model(250,1,[],'phase4-scenario-128');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(advancePhase4(upgraded,360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');

    const sameYear=upgradePhase4Content(createPhase4Model(251,1,[],'phase4-scenario-128'),PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:251});
    expect(sameYear.eventLedger.some(item=>item.detail.includes('孫權祭南郊還、寢疾'))).toBe(false);
  });

  it('A245 preserves the 214/215 dating difference for the Lukou and Xiang River events; v129 migration never backfills',()=>{
    const id='sun-quan-lukou-jingzhou-partition-dating-215';
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:215,endYear:215,precision:'year',introducedRevision:130});
    expect(node?.source).toContain('《資治通鑑》卷六十七');
    expect(node?.source).toContain('建安二十年（215）');
    expect(node?.source).toContain('《三國志》卷四十七');
    expect(node?.source).toContain('建安十九年（214）');
    expect(node?.description).toContain('不要把它解讀為重複出兵');

    const old=createPhase4Model(214,1,[],'phase4-scenario-129');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(advancePhase4(upgraded,360).nodes.find(item=>item.contentId===id)?.status).toBe('triggered');

    const sameYear=upgradePhase4Content(createPhase4Model(215,1,[],'phase4-scenario-129'),PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:215});
    expect(sameYear.eventLedger.some(item=>item.detail.includes('陸口駐軍與湘水分荊州'))).toBe(false);
  });

  it('A286 adds cross-polity successions in 220 and 223 with source precision and safe v137 migration',()=>{
    const cao='cao-cao-dies-cao-pi-succeeds-220';
    const shu='liu-shan-succeeds-liu-bei-223';
    const caoNode=HISTORY_CONTENT.find(item=>item.id===cao);
    const shuNode=HISTORY_CONTENT.find(item=>item.id===shu);
    expect(caoNode).toMatchObject({startYear:220,endYear:220,precision:'year',introducedRevision:138,lateSameYear:true});
    expect(caoNode?.source).toContain('《三國志》卷一〈魏書·武帝紀〉');
    expect(caoNode?.source).toContain('庚子太祖崩');
    expect(caoNode?.source).toContain('嗣位為丞相、魏王');
    expect(shuNode).toMatchObject({startYear:223,endYear:223,precision:'year',introducedRevision:138,lateSameYear:true});
    expect(shuNode?.source).toContain('《三國志》卷三十三〈蜀書·後主傳〉');
    expect(shuNode?.source).toContain('建興元年五月後主即位');
    expect(shuNode?.description).toContain('不推演未載');

    const old=createPhase4Model(219,1,[],'phase4-scenario-137');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(item=>item.contentId===cao)?.status).toBe('pending');
    expect(upgraded.nodes.find(item=>item.contentId===shu)?.status).toBe('pending');
    const advanced=advancePhase4(upgraded,1440);
    expect(advanced.nodes.find(item=>item.contentId===cao)?.status).toBe('triggered');
    expect(advanced.nodes.find(item=>item.contentId===shu)?.status).toBe('triggered');
    const sameYear=upgradePhase4Content(createPhase4Model(220,1,[],'phase4-scenario-137'),PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find(item=>item.contentId===cao)).toMatchObject({status:'resolved',resolvedYear:220});
    expect(sameYear.eventLedger.some(item=>item.detail.includes('曹操卒於洛陽'))).toBe(false);
    const later=upgradePhase4Content(createPhase4Model(223,1,[],'phase4-scenario-137'),PHASE4_CONTENT_VERSION);
    expect(later.nodes.find(item=>item.contentId===shu)).toMatchObject({status:'resolved',resolvedYear:223});
  });

});

describe('A752 220 年漢魏禪代雙史料核對',()=>{
  const id='wei-han-transition-220';

  it('並列《後漢書》與《三國志》的記事結果及不同紀月，不裁定或換算',()=>{
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:220,endYear:220,precision:'year'});
    expect(node?.source).toContain('《後漢書》卷九');
    expect(node?.source).toContain('冬十月乙卯');
    expect(node?.source).toContain('四皇子由王降為列侯');
    expect(node?.source).toContain('《三國志》卷二');
    expect(node?.source).toContain('十一月癸酉');
    expect(node?.source).toContain('行漢正朔');
    expect(node?.description).toContain('山陽公及四子封侯');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('兩書月份與干支記法不同');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('不裁定差異、不換算為模型日期');
  });

  it('v374 的 219 年世界線升級後保留舊事件帳，續玩至 220 年才形成記事',()=>{
    const old=createPhase4Model(219,1,[],'phase4-scenario-374');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe('phase4-scenario-383');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');

    const continued=advancePhase4(upgraded,360);
    expect(continued.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    const event=continued.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('漢魏禪代'));
    expect(event?.source).toContain('《後漢書》卷九');
    expect(event?.source).toContain('《三國志》卷二');
  });
});

describe('A753 釐清黃初二年孫權受封吳王的月份註記',()=>{
  const id='sun-quan-accepts-king-of-wu-title-221';

  it('只將十一月註記用於吳王策命，不移植到未標月的稱藩回述',()=>{
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:221,endYear:221,precision:'year'});
    expect(node?.source).toContain('黃初二年');
    expect(node?.source).toContain('十一月魏文帝策命孫權為吳王');
    expect(node?.source).toContain('原文未另給稱藩使節或月份');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('黃初二年十一月');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('未標該使節的月份');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('不把十一月註記套用於未繫月的回述');
  });

  it('v375 世界線升至 v376 後保留事件帳，跨年至 221 年才形成受封記事',()=>{
    const old=createPhase4Model(220,1,[],'phase4-scenario-375');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe('phase4-scenario-383');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');

    const continued=advancePhase4(upgraded,360);
    expect(continued.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    const event=continued.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('受魏封吳王'));
    expect(event?.source).toContain('十一月魏文帝策命孫權為吳王');
  });
});

describe('A754 釐清孫權使魏與孫登立太子的未繫月記事',()=>{
  const id='sun-quan-wei-envoys-and-sun-deng-investiture-221';

  it('不把同段相鄰的十一月受封日期移植到使魏、辭封與立太子記事',()=>{
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:221,endYear:221,precision:'year'});
    expect(node?.source).toContain('黃初二年記事');
    expect(node?.source).toContain('遣都尉趙咨使魏');
    expect(node?.source).toContain('孫權以孫登年幼辭封');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('未繫月日');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('不把相鄰十一月受封之月移植於此');
  });

  it('v376 的 220 年世界線升至 v377 後保留事件帳，跨年至 221 年才形成記事',()=>{
    const old=createPhase4Model(220,1,[],'phase4-scenario-376');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe('phase4-scenario-383');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(node=>node.contentId===id)?.status).toBe('pending');

    const continued=advancePhase4(upgraded,360);
    expect(continued.nodes.find(node=>node.contentId===id)?.status).toBe('triggered');
    const event=continued.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('趙咨使魏'));
    expect(event?.source).toContain('遣都尉趙咨使魏');
  });
});

describe('A755 區分魏文帝南征與魏軍多路攻吳的史料日期',()=>{
  const id='wei-three-front-campaign-and-dongkou-storm-222';

  it('並列魏、吳紀年而不把六月南征等同九月攻吳',()=>{
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-383');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('文帝紀');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('黃初三年六月');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('黃武元年秋九月');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('不把六月移作九月戰事起始日');
    expect(HISTORY_CONTENT.find(item=>item.id===id)).toMatchObject({startYear:222,endYear:222,precision:'year'});
  });

  it('v377 舊世界線升至 v378 保留事件帳，補入日期界線且仍按年級觸發',()=>{
    const old=createPhase4Model(221,1,[],'phase4-scenario-377');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,'phase4-scenario-378');
    const node=upgraded.nodes.find(item=>item.contentId===id);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.contentVersion).toBe('phase4-scenario-378');
    expect(node?.status).toBe('pending');
    expect(node?.evidence.join(' ')).toContain('不把六月移作九月戰事起始日');

    const continued=advancePhase4(upgraded,360);
    expect(continued.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    expect(continued.eventLedger.filter(item=>item.type==='史實事件形成'&&item.detail.includes('魏軍多路攻吳')).length).toBe(1);
    expect(continued.eventLedger.some(item=>item.type==='史實來源補充'&&item.detail.includes('分清南征啟程與各路攻吳日期'))).toBe(false);
  });

  it('已觸發的舊節點追加一次來源補充且重複升版不重複記帳',()=>{
    const old=createPhase4Model(222,1,[],'phase4-scenario-377');
    const upgraded=upgradePhase4Content(old,'phase4-scenario-378');
    const node=upgraded.nodes.find(item=>item.contentId===id);
    expect(node?.evidence.join(' ')).toContain('《三國志》卷二');
    expect(upgraded.eventLedger.filter(item=>item.type==='史實來源補充'&&item.detail.includes('分清南征啟程與各路攻吳日期'))).toHaveLength(1);
    const repeated=upgradePhase4Content(upgraded,'phase4-scenario-378');
    expect(repeated.eventLedger).toEqual(upgraded.eventLedger);
    expect(repeated.nodes.find(item=>item.contentId===id)?.evidence).toEqual(node?.evidence);
  });
});

describe('A756 補列黃武三年秋八月赦死罪記事',()=>{
  const id='sun-wu-amnesty-death-crimes-224';

  it('只記史書赦令與原史日期精度，不推測赦免範圍',()=>{
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-383');
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:224,endYear:224,precision:'year'});
    expect(node?.source).toContain('黃武三年秋八月');
    expect(node?.source).toContain('赦死罪');
    expect(node?.source).toContain('不推測赦免對象、例外、適用範圍');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('黃武三年秋八月');
    expect(node?.description).toContain('不推測赦免對象');
  });

  it('v378 舊存檔升至 v379 後跨年至 224 年才觸發，保留舊事件帳且不回補已到年份',()=>{
    const old=createPhase4Model(223,1,[],'phase4-scenario-378');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,'phase4-scenario-379');
    expect(upgraded.contentVersion).toBe('phase4-scenario-379');
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(item=>item.contentId===id)?.status).toBe('pending');

    const continued=advancePhase4(upgraded,360);
    expect(continued.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    expect(continued.eventLedger.filter(item=>item.type==='史實事件形成'&&item.detail.includes('赦免死罪'))).toHaveLength(1);

    for(const year of [224,225]){
      const alreadyThere=upgradePhase4Content(createPhase4Model(year,1,[],'phase4-scenario-378'),'phase4-scenario-379');
      expect(alreadyThere.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:224});
      expect(alreadyThere.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('赦免死罪'))).toBe(false);
    }
  });
});

describe('A757 補列黃武五年東安郡行政記事',()=>{
  const id='wu-establishes-dongan-and-appoints-quan-cong-226';

  it('依原文記錄置郡、任官與討擊，不推測縣界或戰果',()=>{
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-383');
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:226,endYear:226,precision:'year',introducedRevision:380});
    expect(node?.source).toContain('黃武五年條');
    expect(node?.source).toContain('分三郡惡地十縣置東安郡');
    expect(node?.source).toContain('以全琮為太守，平討山越');
    expect(node?.description).toContain('不推演縣界與戰果');
  });

  it('v379 舊存檔跨年至 226 年才觸發，既有事件帳前綴不變且晚年不回補',()=>{
    const old=createPhase4Model(225,1,[],'phase4-scenario-379');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(item=>item.contentId===id)?.status).toBe('pending');

    const continued=advancePhase4(upgraded,360);
    expect(continued.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const event=continued.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('東安郡'));
    expect(event?.source).toContain('分三郡惡地十縣置東安郡');
    expect(event?.source).toContain('全琮為太守');

    for(const year of [226,227]){
      const late=upgradePhase4Content(createPhase4Model(year,1,[],'phase4-scenario-379'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:226});
      expect(late.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('東安郡'))).toBe(false);
    }
  });
});

describe('A758 補列黃武七年罷東安郡記事',()=>{
  const id='wu-abolishes-dongan-commandery-228';

  it('依原典記錄 228 年三月罷郡，不推定後續疆界或人口變化',()=>{
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-383');
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:228,endYear:228,precision:'year',introducedRevision:381});
    expect(node?.source).toContain('黃武七年三月');
    expect(node?.source).toContain('罷東安郡');
    expect(HISTORY_SOURCE_DATE_NOTES[id]).toContain('黃武七年三月');
    expect(node?.description).toContain('不推定後續縣郡歸屬');
  });

  it('v380 舊存檔跨年至 228 年才觸發，保留帳本前綴且不回補晚年',()=>{
    const old=createPhase4Model(227,1,[],'phase4-scenario-380');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(item=>item.contentId===id)?.status).toBe('pending');

    const continued=advancePhase4(upgraded,360);
    expect(continued.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const event=continued.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('罷東安郡'));
    expect(event?.source).toContain('黃武七年三月');

    for(const year of [228,229]){
      const late=upgradePhase4Content(createPhase4Model(year,1,[],'phase4-scenario-380'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:228});
      expect(late.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('罷東安郡'))).toBe(false);
    }
  });
});

describe('A759 補列黃龍二年置廣州後復舊記事',()=>{
  const id='wu-temporarily-establishes-guangzhou-230';

  it('依《吳主傳》保留「是歲」精度與復舊記載，不推定疆界或存續日數',()=>{
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-383');
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:230,endYear:230,precision:'year',introducedRevision:382});
    expect(node?.source).toContain('黃龍二年「是歲」');
    expect(node?.source).toContain('分交州置廣州，俄復舊');
    expect(node?.description).toContain('不補疆界、存續時長');
  });

  it('v381 舊存檔跨年至 230 年才觸發，保留帳本前綴且不回補晚年',()=>{
    const old=createPhase4Model(229,1,[],'phase4-scenario-381');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(item=>item.contentId===id)?.status).toBe('pending');

    const continued=advancePhase4(upgraded,360);
    expect(continued.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const event=continued.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('分交州置廣州'));
    expect(event?.source).toContain('俄復舊');

    for(const year of [230,231]){
      const late=upgradePhase4Content(createPhase4Model(year,1,[],'phase4-scenario-381'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:230});
      expect(late.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('分交州置廣州'))).toBe(false);
    }
  });
});

describe('A760 補列衛溫、諸葛直下獄誅記事',()=>{
  const id='wu-executes-wei-wen-zhuge-zhi-231';

  it('依《吳主傳》記載處置結果及月份段落，不補獄案或擴成死亡硬節點',()=>{
    expect(PHASE4_CONTENT_VERSION).toBe('phase4-scenario-383');
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:231,endYear:231,precision:'year',introducedRevision:383});
    expect(node?.source).toContain('黃龍三年');
    expect(node?.source).toContain('皆以違詔無功，下獄誅');
    expect(node?.sourceDateNote).toContain('春二月記事段');
    expect(node?.sourceDateNote).toContain('不將二月精度擴張為本句另有明載月日');
    expect(node?.description).toContain('不建立玩家可介入的死亡節點');
    expect(HISTORY_CONTENT.filter(item=>item.kind==='death'&&item.id===id)).toHaveLength(0);
  });

  it('v382 舊存檔跨年至 231 年才觸發，保留帳本前綴且不回補晚年',()=>{
    const old=createPhase4Model(230,1,[],'phase4-scenario-382');
    const prefix=structuredClone(old.eventLedger);
    const upgraded=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(upgraded.contentVersion).toBe(PHASE4_CONTENT_VERSION);
    expect(upgraded.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(upgraded.nodes.find(item=>item.contentId===id)?.status).toBe('pending');

    const continued=advancePhase4(upgraded,360);
    expect(continued.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const event=continued.eventLedger.find(item=>item.type==='史實事件形成'&&item.detail.includes('下獄誅'));
    expect(event?.source).toContain('下獄誅');

    for(const year of [231,232]){
      const late=upgradePhase4Content(createPhase4Model(year,1,[],'phase4-scenario-382'),PHASE4_CONTENT_VERSION);
      expect(late.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:231});
      expect(late.eventLedger.some(item=>item.type==='史實事件形成'&&item.detail.includes('下獄誅'))).toBe(false);
    }
  });
});

describe('A641 補列 183 年陳倉戰事',()=>{
  const id='chen-cang-183';

  it('保留《後漢書》卷八原文與年級精度，未推演未載戰果',()=>{
    const node=HISTORY_CONTENT.find(item=>item.id===id);
    expect(node).toMatchObject({startYear:183,endYear:183,precision:'year',introducedRevision:266});
    expect(node?.source).toContain('光和六年春二月');
    expect(node?.source).toContain('皇甫嵩大破王國於陳倉');
    expect(node?.sourceDateNote).toBe('春二月');
    expect(node?.description).toContain('不推演戰事細節或傷亡');
  });

  it('v265 世界線升版後保留舊帳並只在跨年至 183 年觸發',()=>{
    const old=createPhase4Model(182,1,[],'phase4-scenario-265');
    const prefix=structuredClone(old.eventLedger);
    const migrated=upgradePhase4Content(old,PHASE4_CONTENT_VERSION);
    expect(migrated.eventLedger.slice(0,prefix.length)).toEqual(prefix);
    expect(migrated.nodes.find(item=>item.contentId===id)?.status).toBe('pending');
    const continued=advancePhase4(migrated,360);
    expect(continued.nodes.find(item=>item.contentId===id)?.status).toBe('triggered');
    const event=continued.eventLedger.find(item=>item.detail.includes('陳倉大破王國'));
    expect(event?.source).toContain('皇甫嵩大破王國於陳倉');
    expect(event?.source).toContain('春二月');

    const sameYear=upgradePhase4Content(createPhase4Model(183,1,[],'phase4-scenario-265'),PHASE4_CONTENT_VERSION);
    expect(sameYear.nodes.find(item=>item.contentId===id)).toMatchObject({status:'resolved',resolvedYear:183});
    expect(sameYear.eventLedger.some(item=>item.detail.includes('陳倉大破王國'))).toBe(false);
  });
});
