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
    expect(node).toMatchObject({startYear:251,endYear:251,precision:'year',introducedIn:'phase4-scenario-129'});
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
    expect(node).toMatchObject({startYear:215,endYear:215,precision:'year',introducedIn:'phase4-scenario-130'});
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
    expect(caoNode).toMatchObject({startYear:220,endYear:220,precision:'year',introducedIn:'phase4-scenario-138',sameYearMigrationIsLate:true});
    expect(caoNode?.source).toContain('《三國志》卷一〈魏書·武帝紀〉');
    expect(caoNode?.source).toContain('庚子太祖崩');
    expect(caoNode?.source).toContain('嗣位為丞相、魏王');
    expect(shuNode).toMatchObject({startYear:223,endYear:223,precision:'year',introducedIn:'phase4-scenario-138',sameYearMigrationIsLate:true});
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
