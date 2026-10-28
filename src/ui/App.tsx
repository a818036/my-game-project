import {LifeActionPanel} from './LifeActionPanel';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createOpeningFacts, dispatch, ENGINE_VERSION, SKILLS_VERSION, SOURCE_HASHES, type GameCommand } from '../engine';
import { activateWorldline, assertSlotCompatible, commitWorldline, loadWorkspace, parseSave, toJson, verifySave, type SaveFile, type WorkspaceSnapshot } from '../storage';
import { kinshipTerm, STAT_NAMES, type AccountName, type AssetName, type Phase2Action, type RelationshipKind } from '../phase2';
import { EXAMPLE_LANGUAGE, OFFICIAL_ABILITIES, sampleLightningContext, type AbilityCombinationId, type AbilityId, type HarmIntent, type IllusionDistribution, type InnateAction, type RealityDepth } from '../innate';
import { ENGINEERING, HISTORY_CONTENT, type ControlLevel, type Phase4Action, type PolicyId, type WarUnit } from '../phase4';
import { characterAgeLabel } from '../narration/status';
import { ChatGptConnection } from './ChatGptConnection';
import { buildNarrationPayload, fetchNarration, templateNarration, type NarrationPayload, type NarrationResult } from '../narration/client';

const blankWorkspace: WorkspaceSnapshot = { saves: [], profile: { regions: [], surnames: [], activeWorldlineId: null } };
const DEDICATED_ABILITY_OPERATIONS = new Set<AbilityId>(['軒轅幻術・五感天幕','全幻術系強制執行通則','萬軍共夢','千軍異夢','惑感','入實','五感實相','五感盡失','神識威壓','妖術・伏地','萬軍伏地','全雷霆系強制敘事通則','軒轅天罰','地走雷','雷震','萬雷震軍','天雷禁域','天雷破城','軒轅天罰・雷海','百脈敕令','百脈敕令・封將','萬疫敕令','軒轅觀世','天醫敕生','歲月回春','軒轅傳音','軒轅傳音・天下共視','軒轅閃','軒轅藏界','軒轅極限收斂','萬解','霸者橫攔','霸者橫攔・摧關','霸者橫攔・撼陣','霸者橫攔・霸王擲','霸者橫攔・不動','霸骨天成','山河薪火','薪火不滅','群星入懷','萬民歸心','萬軍如臂']);
const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
const commandId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
function saveName(save: SaveFile) { return `${save.state.character.name}・${save.state.character.home}・第${save.state.turn}回合`; }
function era(year: number) { return year >= 184 && year <= 189 ? `漢中平${year - 183}年` : `年號待補（${year}年）`; }
function turnInterval(birthYear: number, turn: number, endYear: number, endMonth: number, endDay: number, timelineDay?: number, elapsedDays = 90) {
  if (turn === 0) return `西元 ${endYear} 年 ${endMonth} 月／${era(endYear)}・出生`;
  if (timelineDay !== undefined) {
    const startDay = Math.max(0, timelineDay - elapsedDays);
    const startYear = birthYear + Math.floor(startDay / 360);
    const startMonth = Math.floor((startDay % 360) / 30) + 1;
    const startDayOfMonth = (startDay % 30) + 1;
    return `西元 ${startYear} 年 ${startMonth} 月 ${startDayOfMonth} 日至 ${endYear} 年 ${endMonth} 月 ${endDay} 日／${era(startYear)}至${era(endYear)}・本回合推進 ${elapsedDays} 日`;
  }
  const startMonths = (turn - 1) * 3;
  const startYear = birthYear + Math.floor(startMonths / 12);
  const startMonth = (startMonths % 12) + 1;
  return `西元 ${startYear} 年 ${startMonth} 月至 ${endYear} 年 ${endMonth} 月／${era(startYear)}至${era(endYear)}・本回合約三月`;
}

export default function App() {
  const [workspace, setWorkspace] = useState(blankWorkspace);
  const [ready, setReady] = useState(false);
  const [newTimeline, setNewTimeline] = useState(false);
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState(184);
  const [seed, setSeed] = useState(randomSeed());
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [familyAnchor, setFamilyAnchor] = useState('protagonist');
  const [skillDraft, setSkillDraft] = useState('');
  const [relationTarget, setRelationTarget] = useState('');
  const [assetName, setAssetName] = useState<AssetName>('錢');
  const [assetFrom, setAssetFrom] = useState<AccountName | 'market'>('private');
  const [assetTo, setAssetTo] = useState<AccountName | 'market'>('market');
  const [assetAmount, setAssetAmount] = useState(1);
  const [assetMemo, setAssetMemo] = useState('家用支出');
  const [messageText, setMessageText] = useState('家中一切安好，地方消息稍後再報。');
  const [messageTarget, setMessageTarget] = useState('');
  const [injuryDraft, setInjuryDraft] = useState('行旅擦傷（示例）');
  const [narrative,setNarrative]=useState<NarrationResult|null>(null);
  const [narrationPending,setNarrationPending]=useState(false);
  const [narrationError,setNarrationError]=useState('');
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('shenzhou-font-size')) || 18);
  const [activePanel, setActivePanel] = useState<'人物'|'家產'|'天生技'|'軍政'|'記事'>('人物');
  const [abilityMode, setAbilityMode] = useState('幻術');
  const [abilityTarget, setAbilityTarget] = useState('example-clerk');
  const [abilityTargets, setAbilityTargets] = useState<string[]>(['example-clerk']);
  const [abilityExclude, setAbilityExclude] = useState('');
  const [abilityObject, setAbilityObject] = useState('example-grain-store');
  const [abilityObjectTargets, setAbilityObjectTargets] = useState<string[]>(['example-grain-store']);
  const [disassemblyExcluded, setDisassemblyExcluded] = useState<string[]>([]);
  const [abilityIntensity, setAbilityIntensity] = useState<1|2|3>(2);
  const [contactDistance, setContactDistance] = useState(1);
  const [contactHazard, setContactHazard] = useState<'有害物質'|'有害能量'|'有害接觸'|'一般友善接觸'>('有害能量');
  const [illusionDistribution, setIllusionDistribution] = useState<IllusionDistribution>('單體');
  const [illusionDepth, setIllusionDepth] = useState<RealityDepth>('惑感');
  const [illusionContent, setIllusionContent] = useState<'假軍令'|'火海'|'假道路'|'假敵我'|'箭雨'>('假軍令');
  const [harmIntent, setHarmIntent] = useState<HarmIntent>('非致命');
  const [accidentOutcome, setAccidentOutcome] = useState<'無傷'|'受傷'|'致命'>('受傷');
  const [abilityText, setAbilityText] = useState('');
  const [otherAbility, setOtherAbility] = useState<AbilityId>('軒轅萬語');
  const [languageMode, setLanguageMode] = useState<'聽'|'說'|'讀'|'寫'>('聽');
  const [languageName, setLanguageName] = useState<string>(EXAMPLE_LANGUAGE.name);
  const [lightningAbility, setLightningAbility] = useState<AbilityId>('軒轅天罰');
  const [forceAbility, setForceAbility] = useState<AbilityId>('霸者橫攔・摧關');
  const [unitCommand, setUnitCommand] = useState<'前進'|'固守'|'撤退'|'護送'>('固守');
  const [p4Policy, setP4Policy] = useState<PolicyId>('屯田與水利');
  const [p4Control, setP4Control] = useState<ControlLevel>('軍事進入');
  const [p4Office, setP4Office] = useState('office-clerk');
  const [p4Person, setP4Person] = useState('example-clerk');
  const [p4Candidate, setP4Candidate] = useState('sample-scribe');
  const [p4Treaty, setP4Treaty] = useState('永久割讓示例郡縣');
  const [p4TreatyTerritory, setP4TreatyTerritory] = useState('sample-county');
  const [p4TreatySuccessor, setP4TreatySuccessor] = useState('鄰近勢力（示例）');
  const [curseAbility, setCurseAbility] = useState<'妖術・伏地'|'萬軍伏地'>('妖術・伏地');
  const [suppressSecondary, setSuppressSecondary] = useState(false);
  const [lightningPreset, setLightningPreset] = useState<'乾燥庭院'|'雨中木舍'|'潮濕金屬陣地'|'石砌關門'>('乾燥庭院');
  const [diseaseMode, setDiseaseMode] = useState<'施疫'|'壓制'|'治療'|'阻止惡化'>('施疫');
  const [combination, setCombination] = useState<AbilityCombinationId>('行走的無限軍需庫');
  const [bodySystem, setBodySystem] = useState<'神經'|'肌力'|'肌腱關節'|'循環'|'心肺'|'疼痛'|'感官'|'平衡'|'反射'|'動作協調'|'疲勞處理'|'恢復'>('心肺');
  const [bodyImprovement, setBodyImprovement] = useState(10);
  const [rejuvenationConsent, setRejuvenationConsent] = useState(false);
  const busyRef = useRef(false);
  const narrationAbort=useRef<AbortController|null>(null);
  const narrationPayload=useRef<NarrationPayload|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const activeSave = workspace.saves.find((save) => save.worldlineId === workspace.profile.activeWorldlineId) ?? null;
  const state = activeSave?.state ?? null;
  const events = activeSave?.events ?? [];
  const phase2 = state?.phase2 ?? null;
  const innate = state?.innate ?? null;
  const phase4 = state?.phase4 ?? null;
  const livingContacts = phase2?.persons.filter((person) => person.alive && person.id !== 'protagonist') ?? [];
  const selectedRelation = phase2?.relationships.find((entry) => entry.personId === relationTarget) ?? phase2?.relationships[0];
  const selectedContact = livingContacts.find((person) => person.id === messageTarget) ?? livingContacts[0];
  const preview = useMemo(() => createOpeningFacts(seed, birthYear, workspace.profile), [seed, birthYear, workspace.profile]);

  useEffect(() => { document.documentElement.style.setProperty('--reader-size', `${fontSize}px`); localStorage.setItem('shenzhou-font-size', String(fontSize)); }, [fontSize]);

  useEffect(() => { loadWorkspace().then(setWorkspace).catch(() => setNotice('無法讀取瀏覽器存檔；請確認 IndexedDB 可用。')).finally(() => setReady(true)); }, []);
  useEffect(()=>()=>{narrationAbort.current?.abort();},[]);

  async function generateNarrative(payload:NarrationPayload){
    narrationAbort.current?.abort();const controller=new AbortController();narrationAbort.current=controller;narrationPayload.current=payload;setNarrationPending(true);setNarrationError('');
    try{setNarrative(await fetchNarration(payload,controller.signal));}
    catch(error){setNarrative(templateNarration(payload));setNarrationError(error instanceof Error?error.message:'敘事服務失敗；已使用範本。');}
    finally{setNarrationPending(false);}
  }

  async function run(command: GameCommand): Promise<boolean> {
    if (busyRef.current) return false;
    busyRef.current = true; setBusy(true);
    try {
      const result = dispatch(command.type === 'StartGame' ? null : state, command);
      if (!result.event || !result.state) {
        setNotice(command.type === 'Continue' ? '已繼續目前世界線；沒有時間推進，也沒有批准任何待決事項。' : '這項命令已處理，沒有重複結算。');
        return false;
      }
      const worldlineId = result.state.worldlineId;
      const nextEvents = command.type === 'StartGame' ? [result.event] : [...events, result.event];
      const save: SaveFile = { format: 'shenzhou-save', version: 6, worldlineId, events: nextEvents, state: result.state };
      const nextProfile = command.type === 'StartGame'
        ? { regions: [...workspace.profile.regions, command.facts.birthRegion].slice(-3), surnames: [...workspace.profile.surnames, command.facts.surname].slice(-3) }
        : workspace.profile;
      await commitWorldline(save, nextProfile, true);
      setWorkspace((old) => ({ saves: [...old.saves.filter((entry) => entry.worldlineId !== worldlineId), save], profile: { ...nextProfile, activeWorldlineId: worldlineId } }));
      if(['SubmitLifePlan','SubmitActionPlan','Phase2Action','InnateAction','Phase4Action'].includes(command.type))await generateNarrative(buildNarrationPayload(result.state,result.event));
      setNewTimeline(false); setConfirmed(false); const interruptions=result.state.actions.at(-1)?.interruptions??[];const deathWindowOpen=result.state.phase4?.nodes.some(node=>node.status==='triggered'&&HISTORY_CONTENT.find(content=>content.id===node.contentId)?.kind==='death')??false;setNotice(interruptions.length?(deathWindowOpen?`行動已中斷；死亡節點介入窗口開啟：${interruptions.join('；')}`:`行動已因重大節點中斷：${interruptions.join('；')}`):'本回合已保存。');
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? `未保存任何變更：${error.message}` : '保存失敗；原世界線保持不變。');
      return false;
    } finally { busyRef.current = false; setBusy(false); }
  }
  function phaseAction(action: Phase2Action) {
    if (!state) return;
    void run({ version: ENGINE_VERSION, commandId: commandId(), expectedRevision: state.revision, worldlineId: state.worldlineId, type: 'Phase2Action', action });
  }
  function useInnate(action: InnateAction) {
    if (!state) return;
    void run({ version:ENGINE_VERSION, commandId:commandId(), expectedRevision:state.revision, worldlineId:state.worldlineId, type:'InnateAction', action });
  }
  function phase4Action(action:Phase4Action) {
    if(!state)return;
    void run({version:ENGINE_VERSION,commandId:commandId(),expectedRevision:state.revision,worldlineId:state.worldlineId,type:'Phase4Action',action});
  }
  function submitCombination() {
    if (!state || !phase2 || !innate) return;
    const targets=abilityTargets.length?abilityTargets:[abilityTarget], excluded=abilityExclude?[abilityExclude]:[];
    const context=sampleLightningContext(lightningPreset,phase2.scene.presentIds,targets,innate.objects);
    const basic=(type:'Combination',steps:Exclude<InnateAction,{type:'Combination'}>[])=>useInnate({type,combination,steps});
    switch(combination) {
      case '壓陣止戰': basic('Combination',[{type:'Curse',ability:'萬軍伏地',targets,excluded,intensity:abilityIntensity,turn:state.turn},{type:'Lightning',ability:'天雷禁域',targets,excluded,intensity:abilityIntensity,intent:harmIntent,scene:context,suppressSecondary}]);break;
      case '破城而不屠城': basic('Combination',[{type:'SetConvergence',active:true,allowedContacts:[]},{type:'Force',ability:'霸者橫攔・摧關',targets:[],excluded,objectId:abilityObject,instruction:'城門示例結構',intensity:abilityIntensity},{type:'Force',ability:'萬民歸心',targets,excluded,instruction:'明示不屠城與安全通行',intensity:abilityIntensity}]);break;
      case '天下公開示威': basic('Combination',[{type:'ShareVision',targetIds:targets},{type:'Lightning',ability:'天雷禁域',targets,excluded,intensity:abilityIntensity,intent:harmIntent,scene:context,suppressSecondary}]);break;
      case '名將級身體重塑': basic('Combination',[{type:'Diagnose',targetId:abilityTarget},{type:'Improve',targetId:abilityTarget,change:abilityText||'依診斷改善示例生理狀態',system:bodySystem,amount:bodyImprovement},{type:'Heal',targetId:abilityTarget}]);break;
      case '回春': basic('Combination',[{type:'Diagnose',targetId:abilityTarget},{type:'Heal',targetId:abilityTarget},{type:'Rejuvenate',targetId:abilityTarget,years:Number(abilityText)||5,consent:abilityTarget==='protagonist'||rejuvenationConsent}]);break;
      case '跨天下親自處理突發事件': basic('Combination',[{type:'SendThought',recipientId:abilityTarget,text:abilityText||'立即處理指定事件'},{type:'Flash',location:abilityText||'指定事件現場',bringIds:[]}]);break;
      case '行走的無限軍需庫': basic('Combination',[{type:'Store',objectId:abilityObject},{type:'Flash',location:abilityText||'前線軍需點',bringIds:[abilityObject]}]);break;
    }
  }
  function requestName(relation: RelationshipKind) {
    if (!state?.phase2) return;
    const role = relation === '婚姻' ? '配偶' : relation.includes('父母') ? (relation.includes('收養') ? '養親' : '血親父母') : relation.includes('手足') ? '血親手足' : (relation.includes('收養') ? '養子女' : '血親子女');
    const anchor = state.phase2.persons.find((person) => person.id === familyAnchor) ?? state.phase2.persons[0];
    const birthYear = relation.includes('父母') ? anchor.birthYear - 25 : relation.includes('子女') ? anchor.birthYear + 20 : anchor.birthYear;
    phaseAction({ type: 'RequestName', request: { id: commandId(), relation, role, birthYear, anchorId: anchor.id } });
  }
  function finalizeName() {
    const request = state?.phase2?.pendingNames[0]; if (!request || !nameDraft.trim()) return;
    phaseAction({ type: 'ChooseName', requestId: request.id, personId: commandId(), name: nameDraft.trim() }); setNameDraft('');
  }
  function start() {
    if (!name.trim() || !confirmed || busy) return;
    void run({ version: ENGINE_VERSION, commandId: commandId(), expectedRevision: 0, type: 'StartGame', name: `${preview.surname}${name.trim()}`, seed, facts: preview });
  }
  async function switchTimeline(id: string) {
    try { await activateWorldline(id); setWorkspace((old) => ({ ...old, profile: { ...old.profile, activeWorldlineId: id } })); setNewTimeline(false); setNotice('已切換世界線；舊存檔仍保留。'); }
    catch { setNotice('切換失敗；所有存檔均保留。'); }
  }
  function exportSave(save = activeSave) {
    if (!save) return;
    const blob = new Blob([toJson(save)], { type: 'application/json' }); const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `shenzhou-${save.worldlineId}.json`; link.click(); URL.revokeObjectURL(url);
  }
  async function importSave(file?: File) {
    if (!file) return;
    try {
      const rawText = await file.text();
      const raw = JSON.parse(rawText) as { version?: number };
      const original = raw.version !== 6 ? parseSave(rawText) : undefined;
      const imported = verifySave(rawText);
      const existing = workspace.saves.find((entry) => entry.worldlineId === imported.worldlineId);
      assertSlotCompatible(existing ?? undefined, imported);
      const save = existing ?? imported;
      await commitWorldline(save, workspace.profile, true, original);
      setWorkspace((old) => ({ saves: existing ? old.saves : [...old.saves, save], profile: { ...old.profile, activeWorldlineId: save.worldlineId } }));
      setNewTimeline(false); setNotice('存檔已重播驗證並匯入為獨立世界線。');
    } catch (error) { setNotice(error instanceof Error ? `匯入失敗：${error.message}` : '匯入失敗；目前世界線未變更。'); }
    if (fileRef.current) fileRef.current.value = '';
  }

  if (!ready) return <main className="loading">正在開啟你的世界線……</main>;
  if (!state || newTimeline) return <main className="start-page"><section className="start-card">
    <ChatGptConnection />
    <p className="eyebrow">東漢・出生確認　｜　第五階段開發中原型</p><h1>神洲三國</h1><p className="lead">先確認你的名字與出生結果，再從出生之年展開一條獨立世界線。</p>
    <label className="reader-control">閱讀字體　{fontSize}px<input type="range" min="16" max="24" step="1" value={fontSize} onChange={(event)=>setFontSize(Number(event.target.value))} /></label>
    <label>名字（不含姓氏）<input maxLength={16} value={name} onChange={(e) => { setName(e.target.value); setConfirmed(false); }} placeholder="輸入主角名字" /></label>
    {name.trim() && <>
    <label>出生年（公元）<select value={birthYear} onChange={(e) => { setBirthYear(Number(e.target.value)); setConfirmed(false); }}>{Array.from({ length: 25 }, (_, i) => 184 - i).map((y) => <option key={y} value={y}>{y} 年</option>)}</select></label>
    <div className="seed-box"><div><span className="muted">本次種子（確認前不變）</span><code>{seed}</code></div><button className="quiet" onClick={() => { setSeed(randomSeed()); setConfirmed(false); }}>重新抽取種子 ↻</button></div>
    <section className="opening-preview"><div className="section-kicker">開局隨機紀錄・確認前預覽</div><p><b>出生地：</b>{preview.birthRegion}</p><p><b>家族姓氏：</b>{preview.surname}（近期三次內不重複）</p><p><b>出身：</b>{preview.background}（示例）</p><p><b>親族與師長：</b>{preview.family.map((person) => `${person.role}：${person.name}`).join('；')}</p><p><b>潛質傾向：</b>{Object.entries(preview.potential).map(([stat, value]) => `${stat} ${value}`).join('・')}（示例，非成熟五維）</p><p><b>健康：</b>{preview.health}　<b>地方：</b>{preview.localSituation}</p><details><summary>顯示種子抽樣紀錄</summary><code>{preview.rngTrace.join(' · ')}</code><p className="caption">若結果與近期三次開局重複，只從原種子導出的候選序列重抽；種子不會暗中更換。</p></details></section>
    <p className="caption">主角固定背景依天生技 v{SKILLS_VERSION}：2026 年穿越者，保有現代／歷史知識，精通兵法、軍謀、內政與交易，偏好逛市集殺價並保留自主路線。天生技按能力覆蓋表逐項標示，未實作能力不會假稱發動，也未加入消耗、冷卻或削弱規則。</p>
    <label className="confirm"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /><span>確認「{preview.surname}{name.trim() || '未命名'}」於公元 {birthYear} 年出生，並接受上方顯示的本次隨機結果。</span></label>
    <button className="primary wide" disabled={!name.trim() || !confirmed || busy} onClick={start}>{busy ? '保存開局中…' : '確認出生並開始'}</button>
    </>}
    {workspace.saves.length > 0 && <section className="save-slots"><div className="section-kicker">已保存的其他世界線</div>{workspace.saves.map((save) => <div key={save.worldlineId}><span>{saveName(save)}</span><button className="quiet" onClick={() => void switchTimeline(save.worldlineId)}>載入</button></div>)}</section>}
    <button className="quiet" onClick={() => fileRef.current?.click()}>匯入 JSON 存檔</button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(e) => void importSave(e.target.files?.[0])} />
    <p className="caption">資料表與人物是明示的少量示例，不是完整歷史資料庫。</p>
  </section></main>;

  const c = state.character, w = state.world;
  const nextCommand = (_type: 'Continue'): GameCommand => ({ version: ENGINE_VERSION, commandId: commandId(), expectedRevision: state.revision, worldlineId: state.worldlineId, type: 'Continue' });
  return <main className="game-shell">
    <ChatGptConnection />
    <header className="topbar"><div><span className="brand-mark">神</span><strong>神洲三國</strong><span className="tag">示例原型</span></div><div className="top-actions">
      <label className="reader-control compact">字體 {fontSize}px<input aria-label="調整閱讀字體大小" type="range" min="16" max="24" step="1" value={fontSize} onChange={(event)=>setFontSize(Number(event.target.value))} /></label>
      <select aria-label="切換世界線" value={state.worldlineId} onChange={(e) => void switchTimeline(e.target.value)}>{workspace.saves.map((save) => <option key={save.worldlineId} value={save.worldlineId}>{saveName(save)}</option>)}</select>
      <button className="quiet" onClick={() => { setNewTimeline(true); setConfirmed(false); }}>新建世界線</button><button className="quiet" onClick={() => exportSave()}>匯出</button><button className="quiet" onClick={() => fileRef.current?.click()}>匯入</button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(e) => void importSave(e.target.files?.[0])} />
    </div></header>
    <section className="hero"><div><p className="eyebrow">{turnInterval(c.birthYear, state.turn, w.year, w.month, state.phase4?.dayOfMonth ?? 1, state.phase4?.day, state.actions.at(-1)?.elapsedDays ?? 90)}　｜　第 {state.turn} 回合</p><p className="location-line">所在・{phase2?.scene.location ?? c.home}</p><h1>{c.name}<small>　{characterAgeLabel(state)}・出生於 {c.home}</small></h1><p>{c.background}（示例）・{c.health}</p></div></section>
    <div className="layout"><section className="main-column">
      {phase2 && <article className="panel scene-panel story-panel"><div className="section-kicker">眼前</div><p className="scene-place"><b>{phase2.scene.location}</b><span>第 {phase2.scene.turn} 回合・在場 {phase2.scene.presentIds.map((id) => phase2.persons.find((person) => person.id === id)?.name ?? id).join('、') || '無'}</span></p><p className="scene-arrivals">新到：{phase2.scene.enteredIds.map((id) => phase2.persons.find((person) => person.id === id)?.name ?? id).join('、') || '無'}；離去：{phase2.scene.leftIds.map((id) => phase2.persons.find((person) => person.id === id)?.name ?? id).join('、') || '無'}</p>
        {phase2.scene.speeches.map((speech, index) => <p className="speech" key={`${speech.speakerId}-${index}`}><b>{speech.label}：</b>「{speech.text}」</p>)}
        {narrative&&<section className="ai-narrative" aria-live="polite"><div className="section-kicker">本回合敘事・{narrationPending?'生成中':narrationError?'範本回退':narrative.source==='mock'?'本機 mock':narrative.source==='chatgpt'?'ChatGPT 訂閱生成':narrative.source==='openai'?'供應者生成':'範本'}</div>{narrative.paragraphs.map((paragraph,index)=><p className="narrative-paragraph" key={`p-${index}`}>{paragraph}</p>)}{(()=>{const spoken=new Set(phase2.scene.speeches.map(item=>item.speakerId));return narrative.dialogue.map((line,index)=>{const speaker=phase2.persons.find(person=>person.id===line.speakerId);if(!speaker||!phase2.scene.presentIds.includes(speaker.id))return null;const age=Math.max(0,(state?.world.year??speaker.birthYear)-speaker.birthYear);const prior=spoken.has(speaker.id);spoken.add(speaker.id);return <p className="speech" key={`d-${index}`}><b>{prior?speaker.name:`${speaker.name}（${age}歲，${speaker.office||'白身'}）`}：</b>「{line.text}」</p>;});})()}{narrative.suggestions.length>0&&<p className="narrative-suggestions">可考慮：{narrative.suggestions.join('；')}</p>}{narrationError&&<p className="notice" role="status">{narrationError}</p>}<div className="button-row">{narrationPending&&<button className="quiet" onClick={()=>narrationAbort.current?.abort()}>取消敘事生成</button>}{!narrationPending&&narrationError&&<button className="quiet" onClick={()=>{if(narrationPayload.current)void generateNarrative(narrationPayload.current);}}>重試敘事（不重跑行動）</button>}</div></section>}</article>}
      {phase2?.worldUpdates.length ? <article className="panel folds"><details><summary>收合世界外事件・自動後台</summary>{phase2.worldUpdates.slice(-4).map((update, index) => <p key={`${state.worldlineId}-world-${index}`}>{update}</p>)}</details></article> : null}
      {state.historicalNodes.length > 0 && <article className="panel trend"><div className="section-kicker">歷史節點・示例</div>{state.historicalNodes.slice(-2).map((node, i) => <p key={i}>{node}</p>)}</article>}
      {state.status === 'playing' ? <><LifeActionPanel key={state.worldlineId} state={state} busy={busy||narrationPending} onRun={run}/><button className="continue" disabled={busy} onClick={()=>void run(nextCommand('Continue'))}>繼續目前人生（不推進時間）</button>{notice&&<p role="status" className="notice">{notice}</p>}</> : <article className="panel finish"><div className="section-kicker">第一人生階段示…21714 tokens truncated…ffice='白身';}
    const age=Math.max(0,phase4.year-state.character.birthYear);
    return {...state,revision:event.revision,phase4,phase2:{...phase2,age},character:{...state.character,age},...(innate?{innate}:{}),world:{...state.world,year:phase4.year,month:phase4.month},appliedCommands:{...state.appliedCommands,[event.commandId]:event.commandHash}};
  }
  if (event.type === 'Phase2Changed') {
    if (![ENGINE_VERSION,4,PHASE2_ENGINE_VERSION,3].includes(event.version) || !state.phase2) throw new Error('第二階段命令不適用於此版本存檔');
    const phase2 = applyPhase2Action(state.phase2, event.payload.action);
    let innate=state.innate;
    let phase4=state.phase4;
    if(innate&&event.payload.action.type==='MarkDeath'){
      const personId=event.payload.action.personId;innate=structuredClone(innate);
      if(innate.subjects[personId]){innate.subjects[personId].alive=false;innate.subjects[personId].location='亡者紀錄';}
      const body=innate.objects.find(object=>object.id===`person-body-${personId}`);if(body){body.kind='人類屍體';body.location='亡者紀錄';}
    }
    if(phase4&&event.payload.action.type==='MarkDeath'){
      const deceasedId=event.payload.action.personId;phase4=structuredClone(phase4);const office=phase4.offices.find(entry=>entry.holderId===deceasedId);if(office){office.holderId=null;office.vacancySince=phase4.day;phase4.externalUpdates.push(`${office.title}因任職者亡故出缺，繼任程序啟動。`);}
    }
    const changed = { ...state, revision: event.revision, phase2, ...(innate?{innate}:{}), ...(phase4?{phase4}:{}), appliedCommands: { ...state.appliedCommands, [event.commandId]: event.commandHash } };
    if (event.payload.action.type === 'TransferAsset' && event.payload.action.asset === '錢') {
      const action = event.payload.action;
      const result = applyAccountEntry(state.accounts, { id:event.eventId, eventId:event.eventId, turn:action.turn, asset:'錢', amount:action.amount, from:action.from, to:action.to, memo:action.memo });
      if (result.accounts.private !== phase2.assetBalances.錢.private) throw new Error('私帳金額與多資產帳簿不一致');
      return { ...changed, character: { ...state.character, money: result.accounts.private }, accounts: result.accounts, ledger: [...state.ledger, result.entry] };
    }
    if (event.payload.action.type === 'RecalculateMoneyAccounts') {
      const accounts = rebuildAccountBook(state.ledger);
      const balances = { ...phase2.assetBalances.錢, ...accounts };
      return { ...changed, character: { ...state.character, money: accounts.private }, accounts, phase2: { ...phase2, assetBalances: { ...phase2.assetBalances, 錢: balances } } };
    }
    return changed;
  }
  if (event.type === 'InnateChanged') {
    if (![4,ENGINE_VERSION].includes(event.version) || !state.phase2 || !state.innate) throw new Error('此世界線尚未完成天生技系統遷移');
    const scene = state.phase2.scene;
    const action=event.payload.action;const sourceInnate=structuredClone(state.innate);if(action.type==='Heal'&&action.targetId==='sun-jian'&&!sourceInnate.subjects['sun-jian']&&state.phase4){sourceInnate.subjects['sun-jian']=historicalRescueSubject(state.phase4.historicalPersons.find(p=>p.id==='sun-jian')?.location??'長江中游（節點資料）');Object.assign(sourceInnate,syncHistoricalPatient(sourceInnate,state.phase4));}
    const sunInjuriesBefore=sourceInnate.subjects['sun-jian']?.injuries.length??0;
    const innate = applyInnateAction(sourceInnate,event.payload.action,state.turn, {location:scene.location,presentIds:scene.presentIds,text:state.actions.at(-1)?.details ?? '場景尚無已記錄正文'},state.phase2);
    let phase2 = state.phase2;
    const actionSteps:InnateAction[]=action.type==='Combination'?action.steps:[action];
    const flashStep=actionSteps.find((step):step is Extract<InnateAction,{type:'Flash'}>=>step.type==='Flash');
    if(flashStep){
      const carriedPeople=flashStep.bringIds.map(id=>innate.objects.find(object=>object.id===id)).filter(object=>object?.kind==='人類活體').map(object=>object!.id.replace(/^person-body-/,''));
      const presentIds=['protagonist',...carriedPeople];
      phase2={...phase2,scene:{...phase2.scene,location:flashStep.location,presentIds,enteredIds:presentIds,leftIds:phase2.scene.presentIds.filter(id=>!presentIds.includes(id))}};
    }
    if(actionSteps.some(step=>['Store','Retrieve','Flash'].includes(step.type))){
      const moved=new Map(innate.objects.map(object=>[object.id,object]));
      phase2={...phase2,items:phase2.items.map(item=>{const object=moved.get(item.id);return object?{...item,ownerId:object.ownerId,custodianId:object.custodianId,locationId:object.location,quantity:object.quantity}:item;})};
    }
    let phase4=state.phase4&&flashStep?{...state.phase4,playerLocation:innate.subjects.protagonist.location}:state.phase4;
    const healingSteps=actionSteps.filter((step):step is Extract<InnateAction,{type:'Heal'}>=>step.type==='Heal');
    if(phase4&&healingSteps.some(step=>step.targetId==='sun-jian')&&innate.subjects['sun-jian'].injuries.length<sunInjuriesBefore)phase4=recordInnateDeathRescue(phase4,'sun-jian',true);
    if(phase4)Object.assign(innate,syncHistoricalPatient(innate,phase4));
    const lethalIllusion=action.type==='Illusion'&&action.intent==='致命'&&((action.severity===3&&(action.depth==='入實'||action.depth==='五感實相'))||action.accidentOutcome==='致命');
    const lethalLightning=action.type==='Lightning'&&action.intent==='致命'&&action.intensity===3;
    if(lethalIllusion||lethalLightning){
      const deadIds=action.targets.filter(id=>!action.excluded.includes(id));
      const cause=lethalIllusion?(action.type==='Illusion'&&action.accidentOutcome==='致命'&&!(action.severity===3&&(action.depth==='入實'||action.depth==='五感實相'))?'幻術次生事故致命傷':'幻術實相致命直接傷害'):'雷霆致命直接傷害';
      phase2={...phase2,persons:phase2.persons.map(person=>deadIds.includes(person.id)&&person.alive?{...person,alive:false,deathYear:state.world.year,deathCause:cause}:person),scene:{...phase2.scene,presentIds:phase2.scene.presentIds.filter(id=>!deadIds.includes(id))}};
      for(const id of deadIds){const body=innate.objects.find(object=>object.id===`person-body-${id}`);if(body){body.kind='人類屍體';body.location='亡者紀錄';}if(innate.subjects[id])innate.subjects[id].location='亡者紀錄';}
    }
    return { ...state, revision:event.revision, innate, phase2, ...(phase4?{phase4}:{}), appliedCommands:{...state.appliedCommands,[event.commandId]:event.commandHash} };
  }
  const turnLimit = event.version === LEGACY_ENGINE_VERSION ? 20 : MAX_TURNS;
  if (state.status === 'complete' && !(event.version === ENGINE_VERSION && state.schemaVersion >= 2) || state.turn >= turnLimit) throw new Error('本段旅程已結束');
  const intents: Intent[] | null = event.type === 'IntentResolved' ? [event.payload.intent] : event.type === 'ActionPlanResolved' ? (event.version===ENGINE_VERSION&&event.payload.executedIntents?event.payload.executedIntents:event.payload.intents) : null;
  const interruptedOnly=event.version===ENGINE_VERSION&&event.type==='ActionPlanResolved'&&intents?.length===0&&!!event.payload.interruptedIntent&&event.payload.interruptions.length>0;
  if (!intents || intents.length === 0&&!interruptedOnly || intents.some((intent) => !INTENTS.includes(intent)) || !event.eventId.startsWith(`${state.worldlineId}:`)) throw new Error('回合事件無效或屬於其他世界線');
  if (event.type === 'ActionPlanResolved' && (![4,ENGINE_VERSION].includes(event.version) || inspectActionPlan(intents).conflicts.length > 0)) throw new Error('行動計畫有衝突，請先調整');
  const freeTextActions=event.type==='ActionPlanResolved'&&event.version===ENGINE_VERSION?(event.payload.freeTextActions??[]).filter(detail=>intents.includes(detail.intent)):[];
  for(const detail of freeTextActions){
    if(!intents.includes(detail.intent)||!Number.isInteger(detail.order)||detail.order<1)throw new Error('自由文字候選行動未包含於已確認計畫');
    if(detail.method&&!({耕讀自持:['讀書','讀兵書','讀經','抄書','耕作','耕田'],訪求人才:['訪求人才','訪賢','尋訪人才','尋才','招攬','延請','登門延請','訪問'],經商營生:['經商營生','經商','做生意','買賣','交易','擺攤','市集'],遊歷鄉里:['遊歷鄉里','遊歷','走訪','遊訪','探訪','拜訪','探望','出門走走']} as Record<Intent,string[]>)[detail.intent].includes(detail.method))throw new Error('文字行動方式尚未支援');
    if(detail.condition&&detail.condition!=='目標仍在場')throw new Error('文字行動條件尚未支援');
    if(detail.targetId&&detail.intent==='訪求人才'&&!state.phase4?.candidates.some(candidate=>candidate.id===detail.targetId&&candidate.name===detail.targetName&&['available','competing'].includes(candidate.status)))throw new Error('指定人才目前不可招攬');
    if(detail.targetId&&detail.intent==='遊歷鄉里'&&!state.phase2?.persons.some(person=>person.id===detail.targetId&&person.name===detail.targetName&&person.alive&&state.phase2?.scene.presentIds.includes(person.id)))throw new Error('指定人物不在可拜訪的當前場景');
    if(detail.targetId&&!['訪求人才','遊歷鄉里'].includes(detail.intent))throw new Error('此行動尚不支援指定目標');
    if(detail.condition==='目標仍在場'&&(!detail.targetId||!state.phase2?.scene.presentIds.includes(detail.targetId)))throw new Error('行動條件不成立：目標目前不在場');
  }
  const turn = state.turn + 1;
  const elapsedDays=event.version===ENGINE_VERSION&&event.type==='ActionPlanResolved'?event.payload.elapsedDays:intents.reduce((sum,intent)=>sum+ACTION_DURATION_DAYS[intent],0);
  const interruptions=event.version===ENGINE_VERSION&&event.type==='ActionPlanResolved'?event.payload.interruptions:[];
  let phase4 = event.version===ENGINE_VERSION&&state.phase4 ? advancePhase4(state.phase4,elapsedDays) : state.phase4;
  if(phase4)for(const detail of freeTextActions)if(detail.intent==='訪求人才'&&detail.targetId){phase4=applyPhase4Action(phase4,{type:'Recruit',candidateId:detail.targetId},state.phase2?.persons.map(person=>({id:person.id,name:person.name,alive:person.alive,office:person.office,location:state.phase2?.scene.location??''}))??[]);}
  let moneyDelta = 0, reputationDelta = 0;
  const moneyDeltas: Array<{ intent:Intent; amount:number; memo:string }> = [];
  let character = { ...state.character, growth: { ...state.character.growth }, contacts: [...state.character.contacts] };
  const outcomes: string[] = [];
  for (const intent of intents) {
    const roll = random(state.world.seed, turn * 7 + INTENTS.indexOf(intent));
    switch (intent) {
      case '耕讀自持': { const income = roll > .82 ? 4 : 2; moneyDelta += income; moneyDeltas.push({intent,amount:income,memo:`田畝與書卷・家計收入 ${income}`}); outcomes.push(`田畝與書卷：學習經驗增加，家計收入錢 ${income}`); break; }
      case '訪求人才': { const target=freeTextActions.find(detail=>detail.intent==='訪求人才'&&detail.targetId);if(target){const status=phase4?.candidates.find(candidate=>candidate.id===target.targetId)?.status;outcomes.push(status==='approached'?`已向指定人才 ${target.targetName} 正式提出招攬；本人回應仍待後續結算`:`指定人才 ${target.targetName} 已被競爭勢力先行延請，招攬未成功`);}else{const result = resolvePersonnel(character, state.world.seed, turn, roll); character = result.character; reputationDelta += result.reputationDelta; outcomes.push(`${result.title}：${result.details}`);} break; }
      case '經商營生': { const trade = roll > .24 ? 5 : -2; moneyDelta += trade; moneyDeltas.push({intent,amount:trade,memo:`市集營生・${trade > 0 ? `收入 ${trade}` : '貨損支出 2'}`}); outcomes.push(`市集營生：${trade > 0 ? `收入錢 ${trade}` : '貨物折損，支出錢 2'}`); break; }
      case '遊歷鄉里': { moneyDelta -= 1; moneyDeltas.push({intent,amount:-1,memo:'行走鄉里・旅費支出 1'}); const rep = roll > .48 ? 1 : 0; reputationDelta += rep; const target=freeTextActions.find(detail=>detail.intent==='遊歷鄉里'&&detail.targetId);outcomes.push(`行走鄉里：${target?`拜訪${target.targetName}，信任 +${ENGINEERING.playerVisitTrustGain}`:'探訪村落'}，支出旅費錢 1${rep ? '，鄉里聲望 +1' : ''}`); break; }
    }
  }
  moneyDelta = Math.max(-character.money, moneyDelta);
  const recordedIntents=event.type==='ActionPlanResolved'?event.payload.intents:intents;
  const interruptedIntent=event.type==='ActionPlanResolved'&&event.version===ENGINE_VERSION?event.payload.interruptedIntent:undefined;
  const title = intents.length === 0 ? `重大節點中斷：${interruptedIntent??''}` : intents.length === 1 ? ({'耕讀自持':'田畝與書卷','訪求人才':'訪求人才','經商營生':'市集營生','遊歷鄉里':'行走鄉里'} as Record<Intent,string>)[intents[0]] : `行動計畫：${intents.join('、')}`;
  const supplement = event.type === 'ActionPlanResolved' ? event.payload.supplement.trim() : '';
  const resolvedText=freeTextActions.map(detail=>`${detail.order}. ${detail.intent}${detail.targetName?`・對象 ${detail.targetName}`:''}${detail.method?`・方式 ${detail.method}`:''}${detail.condition?`・條件 ${detail.condition}`:''}`).join('；');
  const supplementRecord=event.type==='ActionPlanResolved'&&event.payload.supplement.trim()?freeTextActions.length?'；補充說明原文已保存於本條紀錄；僅已確認候選條件參與結算':'；補充說明未解析，原文已保存於本條紀錄':'';
  const details = `${outcomes.join('；')|| (interruptedOnly?`「${interruptedIntent}」尚未完成，未結算其收益或資源`: '')}${resolvedText?`；已確認文字行動：${resolvedText}`:''}${supplementRecord}`;
  const finalDetails = `${details}${event.version===ENGINE_VERSION?`；本計畫推進 ${elapsedDays} 日${interruptions.length?`，遇重大節點後中斷：${interruptions.join('；')}`:''}`:''}`;
  character.money += moneyDelta; character.reputation += reputationDelta;
  for (const intent of intents) character = developTalent(character, intent, random(state.world.seed, turn * 7 + INTENTS.indexOf(intent)));
  const year = phase4?.year ?? state.world.year + (turn % 4 === 0 ? 1 : 0), month = phase4?.month ?? ((turn * 3) % 12) + 1;
  character.age = year - character.birthYear;
  const personnel = runPersonnelEngine(state.backend.personnel, turn);
  const talent = runTalentEngine(state.backend.talents, state.world.seed, turn);
  const node = historicalNodeAt(turn), trend = trendForTurn(state.world.seed, turn);
  let accounts = state.accounts;
  const newLedger: LedgerEntry[] = [];
  for (const [index, change] of moneyDeltas.entries()) {
    const amount = Math.abs(change.amount);
    if (!amount) continue;
    const paid = Math.min(amount, accounts.private);
    if (change.amount < 0 && paid === 0) continue;
    const entry = applyAccountEntry(accounts, { id:`${event.eventId}:asset:${index}`, eventId:event.eventId, turn, asset:'錢', amount:change.amount > 0 ? amount : paid, from:change.amount > 0 ? 'market' : 'private', to:change.amount > 0 ? 'private' : 'market', memo:change.memo });
    accounts = entry.accounts; newLedger.push(entry.entry);
  }
  const ledger = newLedger.length ? [...state.ledger, ...newLedger] : state.ledger;
  const actions = [...state.actions, { turn, intent:intents[0]??recordedIntents[0], intents:[...recordedIntents], title, details:finalDetails, ...(supplement ? { supplement } : {}), ...(freeTextActions.length?{freeTextActions}:{}), ...(event.version===ENGINE_VERSION?{elapsedDays,interruptions}: {}) }];
  const summaries = turn % 5 === 0 ? [...state.summaries, makeSummary(turn, character, state.world, actions, ledger)] : state.summaries;
  let phase2 = event.version >= PHASE2_ENGINE_VERSION && state.phase2 ? advancePhase2(state.phase2, turn, year, intents.join('＋'), character.money, event.eventId,event.version===ENGINE_VERSION?elapsedDays:undefined) : state.phase2;
  if(phase2)for(const detail of freeTextActions)if(detail.intent==='遊歷鄉里'&&detail.targetId){const relation=phase2.relationships.find(record=>record.personId===detail.targetId);if(relation)phase2=applyPhase2Action(phase2,{type:'AdjustRelation',personId:detail.targetId,axis:'trust',delta:ENGINEERING.playerVisitTrustGain,reason:`依玩家已確認的${detail.method??'拜訪'}行動建立交往`,turn});}
  let innate = event.version >= 4 && state.innate ? advanceInnate(state.innate,turn,event.version===ENGINE_VERSION?elapsedDays:undefined,year) : state.innate;
  if(innate&&phase4)innate=syncHistoricalPatient(innate,phase4);
  if(phase2&&phase4){phase2=structuredClone(phase2);for(const person of phase2.persons){const assigned=phase4.offices.find(office=>office.holderId===person.id);if(assigned)person.office=assigned.title;else if(phase4.offices.some(office=>office.title===person.office))person.office='白身';}}
  if (phase2 && turn % 5 === 0) {
    const summary = summaries.at(-1)!;
    summary.text += `；成長記錄 ${phase2.practiceLog.length} 項、持續傷勢 ${phase2.injuries.filter((injury) => injury.active).length} 項、關係人物 ${phase2.relationships.length} 位`;
  }
  return {
    ...state, schemaVersion: event.version >= PHASE2_ENGINE_VERSION ? event.version : state.schemaVersion, engineVersion: event.version >= PHASE2_ENGINE_VERSION ? event.version : state.engineVersion, status: turn === turnLimit ? 'complete' : 'playing', turn, revision: event.revision,
    character, world: { ...state.world, year, month, eventCount: state.world.eventCount + 1 }, trend,
    historicalNodes: node ? [...state.historicalNodes, node] : state.historicalNodes,
    backend: { personnelChecks: state.backend.personnelChecks + 1, talentChecks: state.backend.talentChecks + 1, historyChecks: state.backend.historyChecks + 1, trendChecks: state.backend.trendChecks + 1, personnel: personnel.messages.length ? personnel.messages : state.backend.personnel, talents: talent.names },
    accounts, ledger, actions, summaries, appliedCommands: { ...state.appliedCommands, [event.commandId]: event.commandHash }, ...(phase2 ? { phase2 } : {}), ...(innate ? { innate } : {}), ...(phase4?{phase4}:{}),
  };
}
export function makeSummary(turn: number, c: Character, world: World, actions: ActionRecord[], ledger: LedgerEntry[]): Summary {
  const period = actions.filter((entry) => entry.turn > turn - 5 && entry.turn <= turn).map((entry) => `${entry.turn}回合:${entry.title}`).join('、');
  const kind = turn % 10 === 0 ? '大記' : '小記';
  const finance = ledger.filter((entry) => entry.turn > turn - 5 && entry.turn <= turn).map((entry) => entry.memo).join('；');
  return { turn, kind, text: `第 ${turn} 回合${kind}（${world.year}年）：${c.name}生於${c.home}，現年 ${c.age} 歲、私錢 ${c.money}；本段行動：${period || '無'}；帳務：${finance || '無資產異動'}。` };
}
export const ACTION_PLAN_EFFORT_BUDGET = 2;
const ACTION_EFFORT: Record<Intent, number> = { '耕讀自持':1, '訪求人才':2, '經商營生':1, '遊歷鄉里':2 };
export const ACTION_DURATION_DAYS: Record<Intent,number> = {'耕讀自持':30,'訪求人才':7,'經商營生':10,'遊歷鄉里':14};
function plannedTimeline(state:GameState,intents:Intent[]):{executedIntents:Intent[];elapsedDays:number;interruptions:string[];interruptedIntent?:Intent}{
 let timeline=state.phase4;const executedIntents:Intent[]=[];let elapsedDays=0;const interruptions:string[]=[];
 for(let index=0;index<intents.length;index++){
  const intent=intents[index],days=ACTION_DURATION_DAYS[intent];let actionEvent:string|undefined;
  for(let day=0;day<days;day++){
   if(!timeline){elapsedDays++;continue;}
   const before=timeline.eventLedger.length;timeline=advancePhase4(timeline,1);elapsedDays++;
   const newEvents=timeline.eventLedger.slice(before),deathWindow=newEvents.find(e=>e.type==='死亡硬節點觸發');
   if(deathWindow){interruptions.push(`${deathWindow.type}：${deathWindow.detail}`);return{executedIntents,elapsedDays,interruptions,interruptedIntent:intent};}
   const major=newEvents.find(e=>['史實事件形成','史實事件取消','死亡硬節點落實'].includes(e.type));if(major)actionEvent??=`${major.type}：${major.detail}`;
  }
  executedIntents.push(intent);
  if(actionEvent){interruptions.push(actionEvent);return{executedIntents,elapsedDays,interruptions,...(intents[index+1]?{interruptedIntent:intents[index+1]}:{})};}
 }
 return {executedIntents,elapsedDays,interruptions};
}
export function inspectActionPlan(intents: Intent[]): { effort: number; conflicts: string[] } {
  const conflicts: string[] = [];
  if (new Set(intents).size !== intents.length) conflicts.push('同一行動重複勾選，請移除重複項目。');
  const effort = intents.reduce((sum, intent) => sum + (ACTION_EFFORT[intent] ?? 99), 0);
  if (effort > ACTION_PLAN_EFFORT_BUDGET) conflicts.push(`本回合可用行動時間為 ${ACTION_PLAN_EFFORT_BUDGET} 點，所選行動需要 ${effort} 點；請調整計畫。`);
  if (intents.includes('遊歷鄉里') && intents.some((intent) => intent !== '遊歷鄉里')) conflicts.push('遊歷鄉里會離開家宅；與同回合留在家宅耕讀或市集營生有地點衝突。');
  if (intents.includes('訪求人才') && intents.includes('遊歷鄉里')) conflicts.push('訪求人才與遊歷鄉里都需要外出安排，無法在此示例的一回合內保證行程相容。');
  return { effort, conflicts:[...new Set(conflicts)] };
}
export function dispatch(state: GameState | null, command: GameCommand): { state: GameState | null; event: GameEvent | null; duplicate: boolean } {
  if (command.version !== ENGINE_VERSION) throw new Error(`不支援的命令版本：${command.version}`);
  const known = state?.appliedCommands[command.commandId];
  if (known) {
    const expected = fingerprint(command);
    if (known === expected) return { state, event: null, duplicate: true };
    throw new Error('commandId 已用於不同命令');
  }
  if (command.type === 'Continue') {
    if (!state || command.worldlineId !== state.worldlineId) throw new Error('目前沒有可繼續的世界線');
    if (command.expectedRevision !== state.revision) throw new Error('狀態版本已更新，請重新檢視');
    // Continue only closes the current narrative pause; it neither advances time nor accepts any pending decision.
    return { state, event: null, duplicate: false };
  }
  if (command.type === 'RecordActionNote') {
    if (!state || command.worldlineId !== state.worldlineId || command.expectedRevision !== state.revision) throw new Error('補充說明所屬世界線或版本已變更');
    if (!command.text.trim()) throw new Error('補充說明不可為空白');
    const event: GameEvent = { version:ENGINE_VERSION, eventId:`${state.worldlineId}:${state.revision+1}`, commandId:command.commandId, commandHash:fingerprint(command), revision:state.revision+1, type:'ActionNoteRecorded', payload:{text:command.text.trim()} };
    return { state:applyEvent(state,event), event, duplicate:false };
  }
  if (command.type === 'StartGame') {
    if (state) throw new Error('請先切換到新世界線');
    if (command.expectedRevision !== 0) throw new Error('新局版本必須從零開始');
    const event = createStartEvent(command);
    return { state: applyEvent(null, event), event, duplicate: false };
  }
  if (!state || command.worldlineId !== state.worldlineId) throw new Error('命令世界線不符');
  if (command.expectedRevision !== state.revision) throw new Error('狀態版本已更新，請重新檢視');
  if (command.type === 'Phase2Action') {
    if (!state.phase2) throw new Error('此世界線尚未完成第二階段存檔遷移');
    const event: GameEvent = { version: ENGINE_VERSION, eventId: `${state.worldlineId}:${state.revision + 1}`, commandId: command.commandId, commandHash: fingerprint(command), revision: state.revision + 1, type: 'Phase2Changed', payload: { action: command.action } };
    return { state: applyEvent(state, event), event, duplicate: false };
  }
  if (command.type === 'InnateAction') {
    if (!state.innate || !state.phase2) throw new Error('此存檔尚未升級天生技系統');
    const event: GameEvent = { version: ENGINE_VERSION, eventId: `${state.worldlineId}:${state.revision + 1}`, commandId: command.commandId, commandHash: fingerprint(command), revision: state.revision + 1, type: 'InnateChanged', payload: { action: command.action } };
    return { state: applyEvent(state,event), event, duplicate:false };
  }
  if (command.type === 'Phase4Action') {
    if(!state.phase4||!state.phase2)throw new Error('此存檔尚未升級第四階段');
    const event:GameEvent={version:ENGINE_VERSION,eventId:`${state.worldlineId}:${state.revision+1}`,commandId:command.commandId,commandHash:fingerprint(command),revision:state.revision+1,type:'Phase4Changed',payload:{action:command.action}};
    return {state:applyEvent(state,event),event,duplicate:false};
  }
  if(command.type==='SubmitLifePlan'){
    const plan=inspectLifePlan(state,command.choiceIds,command.paceDays);if(plan.errors.length)throw new Error(plan.errors.join(' '));
    if(state.character.age>=15){
      const intents=plan.choices.map(c=>c.intent!);const errors=inspectActionPlan(intents).conflicts;if(errors.length)throw new Error(errors.join(' '));
      const event:GameEvent={version:5,eventId:`${state.worldlineId}:${state.revision+1}`,commandId:command.commandId,commandHash:fingerprint(command),revision:state.revision+1,type:'ActionPlanResolved',payload:{intents,supplement:command.supplement,...plannedTimeline(state,intents)}};
      return{state:applyEvent(state,event),event,duplicate:false};
    }
    const event:GameEvent={version:5,eventId:`${state.worldlineId}:${state.revision+1}`,commandId:command.commandId,commandHash:fingerprint(command),revision:state.revision+1,type:'LifePlanResolved',payload:{policyVersion:1,choiceIds:[...command.choiceIds],supplement:command.supplement,...(command.paceDays!==undefined?{paceDays:command.paceDays}:{})}};
    return{state:applyEvent(state,event),event,duplicate:false};
  }
  if (command.type === 'SubmitActionPlan') {
    if (!command.intents.length) throw new Error('行動計畫至少須勾選一項行動');
    const plan = inspectActionPlan(command.intents);
    if (plan.conflicts.length) throw new Error(plan.conflicts.join(' '));
    const schedule=plannedTimeline(state,command.intents);
    const event: GameEvent = { version:ENGINE_VERSION, eventId:`${state.worldlineId}:${state.revision+1}`, commandId:command.commandId, commandHash:fingerprint(command), revision:state.revision+1, type:'ActionPlanResolved', payload:{intents:[...command.intents],supplement:command.supplement,...schedule,...(command.freeTextActions?{freeTextActions:command.freeTextActions}:{})} };
    return { state:applyEvent(state,event), event, duplicate:false };
  }
  if (!INTENTS.includes(command.intent)) throw new Error('無效的生活意圖');
  const event: GameEvent = { version: ENGINE_VERSION, eventId: `${state.worldlineId}:${state.revision + 1}`, commandId: command.commandId, commandHash: fingerprint(command), revision: state.revision + 1, type: 'IntentResolved', payload: { intent: command.intent } };
  return { state: applyEvent(state, event), event, duplicate: false };
}
export function replay(events: GameEvent[]): GameState | null { return events.reduce<GameState | null>((state, event) => applyEvent(state, event), null); }

