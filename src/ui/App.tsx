import { useEffect, useMemo, useRef, useState } from 'react';
import { createOpeningFacts, dispatch, ENGINE_VERSION, INTENTS, MAX_TURNS, SKILLS_VERSION, SOURCE_HASHES, type GameCommand } from '../engine';
import { activateWorldline, assertSlotCompatible, commitWorldline, loadWorkspace, parseSave, toJson, verifySave, type SaveFile, type WorkspaceSnapshot } from '../storage';
import { kinshipTerm, STAT_NAMES, type AccountName, type AssetName, type Phase2Action, type RelationshipKind } from '../phase2';
import { OFFICIAL_ABILITIES, type AbilityId, type HarmIntent, type IllusionDistribution, type InnateAction, type RealityDepth } from '../innate';

const blankWorkspace: WorkspaceSnapshot = { saves: [], profile: { regions: [], surnames: [], activeWorldlineId: null } };
const DEDICATED_ABILITY_OPERATIONS = new Set<AbilityId>(['軒轅幻術・五感天幕','全幻術系強制執行通則','萬軍共夢','千軍異夢','惑感','入實','五感實相','五感盡失','神識威壓','妖術・伏地','萬軍伏地','全雷霆系強制敘事通則','軒轅天罰','地走雷','雷震','萬雷震軍','天雷禁域','天雷破城','軒轅天罰・雷海','百脈敕令','百脈敕令・封將','萬疫敕令','軒轅觀世','天醫敕生','歲月回春','軒轅傳音','軒轅傳音・天下共視','軒轅閃','軒轅藏界','軒轅極限收斂','萬解','霸者橫攔','霸者橫攔・摧關','霸者橫攔・撼陣','霸者橫攔・霸王擲','霸者橫攔・不動','霸骨天成','山河薪火','薪火不滅','群星入懷','萬民歸心','萬軍如臂']);
const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
const commandId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
function saveName(save: SaveFile) { return `${save.state.character.name}・${save.state.character.home}・第${save.state.turn}回合`; }
function era(year: number) { return year >= 184 && year <= 189 ? `漢中平${year - 183}年` : `年號待補（${year}年）`; }
function turnInterval(birthYear: number, turn: number, endYear: number, endMonth: number) {
  if (turn === 0) return `西元 ${endYear} 年 ${endMonth} 月／${era(endYear)}・出生`;
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
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('shenzhou-font-size')) || 18);
  const [abilityMode, setAbilityMode] = useState('幻術');
  const [abilityTarget, setAbilityTarget] = useState('example-clerk');
  const [abilityTargets, setAbilityTargets] = useState<string[]>(['example-clerk']);
  const [abilityExclude, setAbilityExclude] = useState('');
  const [abilityObject, setAbilityObject] = useState('example-grain-store');
  const [abilityIntensity, setAbilityIntensity] = useState<1|2|3>(2);
  const [contactDistance, setContactDistance] = useState(1);
  const [illusionDistribution, setIllusionDistribution] = useState<IllusionDistribution>('單體');
  const [illusionDepth, setIllusionDepth] = useState<RealityDepth>('惑感');
  const [harmIntent, setHarmIntent] = useState<HarmIntent>('非致命');
  const [accidentOutcome, setAccidentOutcome] = useState<'無傷'|'受傷'|'致命'>('受傷');
  const [abilityText, setAbilityText] = useState('');
  const [otherAbility, setOtherAbility] = useState<AbilityId>('軒轅萬語');
  const [lightningAbility, setLightningAbility] = useState<AbilityId>('軒轅天罰');
  const [forceAbility, setForceAbility] = useState<AbilityId>('霸者橫攔・摧關');
  const [curseAbility, setCurseAbility] = useState<'妖術・伏地'|'萬軍伏地'>('妖術・伏地');
  const [suppressSecondary, setSuppressSecondary] = useState(false);
  const busyRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const activeSave = workspace.saves.find((save) => save.worldlineId === workspace.profile.activeWorldlineId) ?? null;
  const state = activeSave?.state ?? null;
  const events = activeSave?.events ?? [];
  const phase2 = state?.phase2 ?? null;
  const innate = state?.innate ?? null;
  const livingContacts = phase2?.persons.filter((person) => person.alive && person.id !== 'protagonist') ?? [];
  const selectedRelation = phase2?.relationships.find((entry) => entry.personId === relationTarget) ?? phase2?.relationships[0];
  const selectedContact = livingContacts.find((person) => person.id === messageTarget) ?? livingContacts[0];
  const preview = useMemo(() => createOpeningFacts(seed, birthYear, workspace.profile), [seed, birthYear, workspace.profile]);

  useEffect(() => { document.documentElement.style.setProperty('--reader-size', `${fontSize}px`); localStorage.setItem('shenzhou-font-size', String(fontSize)); }, [fontSize]);

  useEffect(() => { loadWorkspace().then(setWorkspace).catch(() => setNotice('無法讀取瀏覽器存檔；請確認 IndexedDB 可用。')).finally(() => setReady(true)); }, []);

  async function run(command: GameCommand) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try {
      const result = dispatch(command.type === 'StartGame' ? null : state, command);
      if (!result.event || !result.state) {
        setNotice(command.type === 'Continue' ? '已繼續目前世界線；沒有時間推進，也沒有批准任何待決事項。' : '這項命令已處理，沒有重複結算。');
        return;
      }
      const worldlineId = result.state.worldlineId;
      const nextEvents = command.type === 'StartGame' ? [result.event] : [...events, result.event];
      const save: SaveFile = { format: 'shenzhou-save', version: 4, worldlineId, events: nextEvents, state: result.state };
      const nextProfile = command.type === 'StartGame'
        ? { regions: [...workspace.profile.regions, command.facts.birthRegion].slice(-3), surnames: [...workspace.profile.surnames, command.facts.surname].slice(-3) }
        : workspace.profile;
      await commitWorldline(save, nextProfile, true);
      setWorkspace((old) => ({ saves: [...old.saves.filter((entry) => entry.worldlineId !== worldlineId), save], profile: { ...nextProfile, activeWorldlineId: worldlineId } }));
      setNewTimeline(false); setConfirmed(false); setNotice('本回合已保存。');
    } catch (error) {
      setNotice(error instanceof Error ? `未保存任何變更：${error.message}` : '保存失敗；原世界線保持不變。');
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
      const original = raw.version !== 4 ? parseSave(rawText) : undefined;
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
    <p className="eyebrow">東漢・出生確認　｜　第三階段示例原型</p><h1>神洲三國</h1><p className="lead">先確認你的名字與出生結果，再從出生之年展開一條獨立世界線。</p>
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
  const nextCommand = (type: 'Continue' | 'ChooseIntent', intent?: typeof INTENTS[number]): GameCommand => type === 'Continue'
    ? { version: ENGINE_VERSION, commandId: commandId(), expectedRevision: state.revision, worldlineId: state.worldlineId, type: 'Continue' }
    : { version: ENGINE_VERSION, commandId: commandId(), expectedRevision: state.revision, worldlineId: state.worldlineId, type: 'ChooseIntent', intent: intent! };
  return <main className="game-shell">
    <header className="topbar"><div><span className="brand-mark">神</span><strong>神洲三國</strong><span className="tag">示例原型</span></div><div className="top-actions">
      <label className="reader-control compact">字體 {fontSize}px<input aria-label="調整閱讀字體大小" type="range" min="16" max="24" step="1" value={fontSize} onChange={(event)=>setFontSize(Number(event.target.value))} /></label>
      <select aria-label="切換世界線" value={state.worldlineId} onChange={(e) => void switchTimeline(e.target.value)}>{workspace.saves.map((save) => <option key={save.worldlineId} value={save.worldlineId}>{saveName(save)}</option>)}</select>
      <button className="quiet" onClick={() => { setNewTimeline(true); setConfirmed(false); }}>新建世界線</button><button className="quiet" onClick={() => exportSave()}>匯出</button><button className="quiet" onClick={() => fileRef.current?.click()}>匯入</button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(e) => void importSave(e.target.files?.[0])} />
    </div></header>
    <section className="hero"><div><p className="eyebrow">{turnInterval(c.birthYear, state.turn, w.year, w.month)}　｜　第 {state.turn} 回合</p><h1>{c.name}<small>　{c.age} 歲・出生於 {c.home}</small></h1><p>{c.background}（示例）・{c.health}；世界線 {w.worldlineId}</p></div><div className="worldline"><span>種子 {w.seed}</span><span>規則 v{state.rulesVersion}・天生技 v{state.skillsVersion}</span></div></section>
    <div className="layout"><section className="main-column">
      <article className="panel trend"><div className="section-kicker">天下大勢　／　每回合自動推進</div><p>{state.trend}</p><span className="caption">範本敘事・小型示例事件</span></article>
      {phase2 && <article className="panel scene-panel"><div className="section-kicker">本回合場景與在場名單</div><p><b>{phase2.scene.location}</b>・第 {phase2.scene.turn} 回合</p><p>在場：{phase2.scene.presentIds.map((id) => phase2.persons.find((person) => person.id === id)?.name ?? id).join('、') || '無'}</p><p className="caption">進場：{phase2.scene.enteredIds.map((id) => phase2.persons.find((person) => person.id === id)?.name ?? id).join('、') || '無'}；離場：{phase2.scene.leftIds.map((id) => phase2.persons.find((person) => person.id === id)?.name ?? id).join('、') || '無'}</p>
        {phase2.scene.speeches.map((speech, index) => <p className="speech" key={`${speech.speakerId}-${index}`}><b>{speech.label}：</b>「{speech.text}」</p>)}</article>}
      {phase2?.worldUpdates.length ? <article className="panel folds"><details><summary>收合世界外事件・自動後台</summary>{phase2.worldUpdates.slice(-4).map((update, index) => <p key={`${state.worldlineId}-world-${index}`}>{update}</p>)}</details></article> : null}
      {state.historicalNodes.length > 0 && <article className="panel trend"><div className="section-kicker">歷史節點・示例</div>{state.historicalNodes.slice(-2).map((node, i) => <p key={i}>{node}</p>)}</article>}
      {state.status === 'playing' ? <article className="panel intents"><div className="panel-heading"><div><div className="section-kicker">本回合行動</div><h2>選擇一項互斥生活意圖</h2></div><span className="round">{state.turn} / {MAX_TURNS}</span></div>
        {state.turn === 10 && <p className="milestone">已完成第一段十回合大記，世界線仍可繼續。</p>}
        <div className="intent-grid">{INTENTS.map((intent, i) => <button className="intent" key={intent} disabled={busy} onClick={() => void run(nextCommand('ChooseIntent', intent))}><span className="intent-icon">{['禾', '士', '市', '行'][i]}</span><span><strong>{intent}</strong><small>{['耕作與讀書，累積家計及學習經驗', '訪求地方人物，交遊不等於登用成功', '往返市集，盈虧依交易結算', '遊歷附近村落，支出盤纏並聽聞消息'][i]}</small></span><b>→</b></button>)}</div>
        <button className="continue" disabled={busy} onClick={() => void run(nextCommand('Continue'))}>繼續目前人生（不推進時間、不批准待決事項）</button>
      </article> : <article className="panel finish"><div className="section-kicker">第一人生階段示例完成</div><h2>這條世界線已保存。</h2><p>{state.summaries.at(-1)?.text}</p><button className="quiet" onClick={() => { setNewTimeline(true); setConfirmed(false); }}>建立另一條世界線</button></article>}
      <article className="panel log"><div className="section-kicker">旅程紀錄</div>{state.actions.length ? <ol>{state.actions.slice().reverse().map((action) => <li key={action.turn}><span className="log-turn">{String(action.turn).padStart(2, '0')}</span><div><strong>{action.title}</strong><p>{action.details}</p></div></li>)}</ol> : <p className="muted">新生後的第一個決策節點由你選擇。</p>}</article>
    </section><aside className="side-column">
      <article className="panel profile"><div className="section-kicker">人物與潛質・示例</div><div className="stat"><span>私錢</span><strong>{c.money}</strong></div><div className="stat"><span>聲望（示例）</span><strong>{c.reputation}</strong></div><div className="skills">{Object.entries(c.potential).map(([stat, value]) => <span key={stat}>{stat} <b>{value}</b></span>)}</div><p className="contacts">學習／實務／交遊經驗：{c.growth.study}／{c.growth.practice}／{c.growth.social}</p><p className="caption">以上潛質不是出生即具備的成熟五維。</p><details><summary>家庭與背景</summary>{c.family.map((person) => <p key={person.role}>{person.role}：{person.name}</p>)}<p>健康：{c.health}</p><p>地方：{c.home}・{c.background}</p></details><p className="caption">天生技 v{SKILLS_VERSION}・狀態：{c.profile.abilitiesStatus==='phase-three-partial'?'第三階段部分支援':'等待天生技資料遷移'}。清冊中未實作項目會明確拒絕。</p></article>
      {innate && phase2 && <article className="panel folds phase-panel ability-panel"><details><summary>天生技操作台・已支援項目可實際結算</summary>
        <p className="caption">選擇目標、排除對象與強度。未完成能力會明確回覆未實作，不消耗回合；範本結果不包含 AI 推演。</p>
        <label>能力操作<select value={abilityMode} onChange={(event)=>setAbilityMode(event.target.value)}>{['幻術','神識威壓','伏地詛咒','雷霆','萬疫敕令','五感盡失','霸力／人心能力','藏界收納','藏界取出','軒轅閃移動','藏界＋軒轅閃運送','萬解','極限收斂','診斷','治療','回春','百脈改善','封將／授能','單向傳音','天下共視','萬象推演','其他正式能力'].map((mode)=><option key={mode}>{mode}</option>)}</select></label>
        <label>人物目標<select value={abilityTarget} onChange={(event)=>setAbilityTarget(event.target.value)}>{phase2.persons.map((person)=><option key={person.id} value={person.id}>{person.name}（{person.alive?'在世':'已故'}）</option>)}</select></label>
        <label>多目標選擇（支援群體分發）<select multiple value={abilityTargets} onChange={(event)=>setAbilityTargets(Array.from(event.target.selectedOptions,option=>option.value))}>{phase2.persons.map((person)=><option key={person.id} value={person.id}>{person.name}（{person.alive?'在世':'已故'}）</option>)}</select></label>
        <label>排除對象<select value={abilityExclude} onChange={(event)=>setAbilityExclude(event.target.value)}><option value="">不排除</option>{phase2.persons.map((person)=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
        <label>強度<select value={abilityIntensity} onChange={(event)=>setAbilityIntensity(Number(event.target.value) as 1|2|3)}><option value={1}>低</option><option value={2}>中</option><option value={3}>高</option></select></label>
        {abilityMode==='幻術' && <><label>分發模式<select value={illusionDistribution} onChange={(event)=>setIllusionDistribution(event.target.value as IllusionDistribution)}><option>單體</option><option>萬軍共夢</option><option>千軍異夢</option></select></label><label>實相深度<select value={illusionDepth} onChange={(event)=>setIllusionDepth(event.target.value as RealityDepth)}><option>惑感</option><option>入實</option><option>五感實相</option></select></label><label>傷害意圖<select value={harmIntent} onChange={(event)=>setHarmIntent(event.target.value as HarmIntent)}><option>非致命</option><option>致命</option></select></label><label>次生事故（選填）<input value={abilityText} onChange={(event)=>setAbilityText(event.target.value)} placeholder="例如：目標因幻覺自行跌落台階" /></label>{abilityText&&<label>事故結果<select value={accidentOutcome} onChange={(event)=>setAccidentOutcome(event.target.value as '無傷'|'受傷'|'致命')}><option>無傷</option><option>受傷</option><option>致命</option></select></label>}<button className="quiet" disabled={busy} onClick={()=>useInnate({type:'Illusion',ability:illusionDistribution==='萬軍共夢'?'萬軍共夢':illusionDistribution==='千軍異夢'?'千軍異夢':'軒轅幻術・五感天幕',targets:abilityTargets.length?abilityTargets:[abilityTarget],excluded:abilityExclude?[abilityExclude]:[],distribution:illusionDistribution,depth:illusionDepth,intent:harmIntent,severity:abilityIntensity,accident:abilityText||undefined,accidentOutcome:abilityText?accidentOutcome:undefined})}>結算所選幻術</button></>}
        {abilityMode==='神識威壓' && <><label>創傷程度<select id="trauma-select"><option>短暫</option><option>持續</option><option>深層</option></select></label><button className="quiet" disabled={busy} onClick={()=>{const trauma=(document.getElementById('trauma-select') as HTMLSelectElement).value as '短暫'|'持續'|'深層';useInnate({type:'Pressure',targets:abilityTargets.length?abilityTargets:[abilityTarget],excluded:abilityExclude?[abilityExclude]:[],intensity:abilityIntensity,trauma});}}>施展神識威壓</button></>}
        {abilityMode==='雷霆' && <><label>雷霆能力<select value={lightningAbility} onChange={(event)=>setLightningAbility(event.target.value as AbilityId)}>{['軒轅天罰','地走雷','雷震','萬雷震軍','天雷禁域','天雷破城','軒轅天罰・雷海'].map(ability=><option key={ability}>{ability}</option>)}</select></label><label>環境次生後果<input value={abilityText} onChange={(event)=>setAbilityText(event.target.value)} placeholder="例如：潮濕地面導電，鄰近水槽帶電" /></label><label className="inline-check"><input type="checkbox" checked={suppressSecondary} onChange={(event)=>setSuppressSecondary(event.target.checked)} />主動壓制次生環境影響</label><button className="quiet" disabled={busy} onClick={()=>useInnate({type:'Lightning',ability:lightningAbility as Extract<AbilityId,'軒轅天罰'|'地走雷'|'雷震'|'萬雷震軍'|'天雷禁域'|'天雷破城'|'軒轅天罰・雷海'>,targets:abilityTargets.length?abilityTargets:[abilityTarget],excluded:abilityExclude?[abilityExclude]:[],intensity:abilityIntensity,intent:harmIntent,environment:abilityText,suppressSecondary})}>結算雷霆與環境後果</button></>}
        {abilityMode==='萬疫敕令' && <><label>疾病內容<input value={abilityText} onChange={(event)=>setAbilityText(event.target.value)} placeholder="指定明確疾病狀態" /></label><button className="quiet" disabled={busy} onClick={()=>useInnate({type:'Disease',targets:abilityTargets.length?abilityTargets:[abilityTarget],excluded:abilityExclude?[abilityExclude]:[],disease:abilityText,intensity:abilityIntensity})}>對指定目標成立疾病狀態</button></>}
        {abilityMode==='五感盡失' && <button className="quiet" disabled={busy} onClick={()=>useInnate({type:'SenseSeal',targetId:abilityTarget,excluded:abilityExclude?[abilityExclude]:[]})}>使目標五感失去作用</button>}
        {abilityMode==='霸力／人心能力' && <><label>具體能力<select value={forceAbility} onChange={(event)=>setForceAbility(event.target.value as AbilityId)}>{['霸者橫攔','霸者橫攔・摧關','霸者橫攔・撼陣','霸者橫攔・霸王擲','霸者橫攔・不動','霸骨天成','山河薪火','薪火不滅','群星入懷','萬民歸心','萬軍如臂'].map(ability=><option key={ability}>{ability}</option>)}</select></label><label>施力／作用目標<input value={abilityText} onChange={(event)=>setAbilityText(event.target.value)} placeholder="例如：前線敵軍列陣／主角身體強化" /></label><button className="quiet" disabled={busy} onClick={()=>useInnate({type:'Force',ability:forceAbility as Extract<AbilityId,'霸者橫攔'|'霸者橫攔・摧關'|'霸者橫攔・撼陣'|'霸者橫攔・霸王擲'|'霸者橫攔・不動'|'霸骨天成'|'山河薪火'|'薪火不滅'|'群星入懷'|'萬民歸心'|'萬軍如臂'>,targets:abilityTargets.length?abilityTargets:[abilityTarget],excluded:abilityExclude?[abilityExclude]:[],objectId:abilityObject,instruction:abilityText,intensity:abilityIntensity})}>執行所選能力案例</button></>}
        {abilityMode==='伏地詛咒' && <><label>詛咒類型<select value={curseAbility} onChange={(event)=>setCurseAbility(event.target.value as '妖術・伏地'|'萬軍伏地')}><option>妖術・伏地</option><option>萬軍伏地</option></select></label><button className="quiet" disabled={busy} onClick={()=>useInnate({type:'Curse',ability:curseAbility,targets:abilityTargets.length?abilityTargets:[abilityTarget],excluded:abilityExclude?[abilityExclude]:[],intensity:abilityIntensity,turn:state.turn})}>成立持續性詛咒</button>{innate.curses.filter((curse)=>curse.active).map((curse)=><button key={curse.id} className="quiet" disabled={busy} onClick={()=>useInnate({type:'ReleaseCurse',curseId:curse.id})}>解除 {phase2.persons.find(person=>person.id===curse.targetId)?.name} 的詛咒（已累傷保留）</button>)}</>}
        {['藏界收納','藏界取出','藏界＋軒轅閃運送','萬解'].includes(abilityMode) && <><label>物品／生命對象<select value={abilityObject} onChange={(event)=>setAbilityObject(event.target.value)}>{innate.objects.map((object)=><option key={object.id} value={object.id}>{object.name} ×{object.quantity}・{object.kind}・{object.location}{!object.intact?'・已損壞':''}{object.disassembled?'・已分解':''}</option>)}</select></label>{abilityMode==='藏界收納'&&<button className="quiet" disabled={busy} onClick={()=>useInnate({type:'Store',objectId:abilityObject})}>收納指定對象</button>}{abilityMode==='藏界取出'&&<><label>取出位置<input value={abilityText} onChange={(event)=>setAbilityText(event.target.value)} placeholder="例如：軍營糧倉" /></label><button className="quiet" disabled={busy} onClick={()=>useInnate({type:'Retrieve',objectId:abilityObject,location:abilityText||'主角身旁'})}>取出指定物資</button></>}{abilityMode==='藏界＋軒轅閃運送'&&<><label>目的地<input value={abilityText} onChange={(event)=>setAbilityText(event.target.value)} placeholder="例如：前線軍營" /></label><button className="quiet" disabled={busy} onClick={()=>useInnate({type:'Flash',location:abilityText||'前線軍營',bringIds:[abilityObject]})}>主角親自閃現運送</button></>}{abilityMode==='萬解'&&<><label>次生後果（選填）<input value={abilityText} onChange={(event)=>setAbilityText(event.target.value)} placeholder="例如：支撐梁失效，旁側牆面坍落" /></label><button className="quiet" disabled={busy} onClick={()=>useInnate({type:'Disassemble',objectIds:[abilityObject],excluded:[],secondary:abilityText||undefined})}>分解所選物品</button></>}</>}
        {abilityMode==='軒轅閃移動'&&<><label>目的地<input value={abilityText} onChange={(event)=>setAbilityText(event.target.value)} placeholder="輸入主角親自到達的位置" /></label><button className="quiet" disabled={busy} onClick={()=>useInnate({type:'Flash',location:abilityText||'前往指定地點',bringIds:[]})}>主角獨自閃現</button></>}
        {abilityMode==='極限收斂' && <><label>允許一般接觸對象<select id="contact-select">{phase2.persons.map((person)=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label><button className="quiet" disabled={busy} onClick={()=>{const allowed=(document.getElementById('contact-select') as HTMLSelectElement).value;useInnate({type:'SetConvergence',active:!innate.convergence.active,allowedContacts:[allowed]});}}>{innate.convergence.active?'關閉':'開啟'}個人防禦（無護盾值）</button><p>狀態：{innate.convergence.active?'開啟':'關閉'}・個人感應約 {innate.convergence.radiusMeters}m・允許接觸：{innate.convergence.allowedContacts.join('、')||'無'}</p><label>接觸／攻擊距離（公尺）<input type="number" min="0" max="20" step="0.5" value={contactDistance} onChange={event=>setContactDistance(Number(event.target.value))} /></label><button className="quiet" disabled={busy||!innate.convergence.active} onClick={()=>useInnate({type:'Contact',source:abilityTarget,target:'protagonist',harmful:true,distanceMeters:contactDistance})}>測試所選目標的有害接觸</button></>}
        {abilityMode==='診斷'&&<button className="quiet" disabled={busy} onClick={()=>useInnate({type:'Diagnose',targetId:abilityTarget})}>診斷人物當前狀態</button>}
        {abilityMode==='治療'&&<button className="quiet" disabled={busy} onClick={()=>useInnate({type:'Heal',targetId:abilityTarget})}>治療一項現存傷勢／疾病</button>}
        {abilityMode==='回春'&&<><label>生理回春年數<input type="number" min="1" max="80" value={Number(abilityText)||5} onChange={(event)=>setAbilityText(event.target.value)} /></label><button className="quiet" disabled={busy} onClick={()=>useInnate({type:'Rejuvenate',targetId:abilityTarget,years:Number(abilityText)||5})}>施展歲月回春</button></>}
        {abilityMode==='百脈改善'&&<><label>改善內容<input value={abilityText} onChange={(event)=>setAbilityText(event.target.value)} placeholder="例如：提升長途行走耐力" /></label><button className="quiet" disabled={busy} onClick={()=>useInnate({type:'Improve',targetId:abilityTarget,change:abilityText||'改善身體素質'})}>改善受術者能力</button></>}
        {abilityMode==='封將／授能'&&<><label>授予受術者的能力名稱<input value={abilityText} onChange={(event)=>setAbilityText(event.target.value)} placeholder="輸入要授予的能力" /></label><button className="quiet" disabled={busy} onClick={()=>useInnate({type:'GrantGift',targetId:abilityTarget,abilityName:abilityText})}>封授能力於受術者</button></>}
        {abilityMode==='單向傳音'&&<><label>傳音內容<textarea value={abilityText} onChange={(event)=>setAbilityText(event.target.value)} /></label><button className="quiet" disabled={busy} onClick={()=>useInnate({type:'SendThought',recipientId:abilityTarget,text:abilityText})}>傳送單向訊息</button></>}
        {abilityMode==='天下共視'&&<button className="quiet" disabled={busy} onClick={()=>useInnate({type:'ShareVision',targetIds:[abilityTarget]})}>分享當前實際場景</button>}
        {abilityMode==='萬象推演'&&<><label>推演問題<input value={abilityText} onChange={(event)=>setAbilityText(event.target.value)} /></label><button className="quiet" disabled={busy} onClick={()=>useInnate({type:'Predict',question:abilityText,evidence:state.actions.at(-1)?.details??''})}>依現有資料推演並標示不確定</button></>}
        {abilityMode==='其他正式能力'&&<><label>正式能力<select value={otherAbility} onChange={(event)=>setOtherAbility(event.target.value as AbilityId)}>{OFFICIAL_ABILITIES.map((ability)=><option key={ability} value={ability}>{ability} — {ability==='軒轅之命'?'開局被動已掛載':DEDICATED_ABILITY_OPERATIONS.has(ability)?'有專屬窄案例（請選對應操作）':['照膽','軒轅萬語'].includes(ability)?'可由本欄操作':'尚未實作'}</option>)}</select></label><label>目標結果描述<input value={abilityText} onChange={(event)=>setAbilityText(event.target.value)} /></label><button className="quiet" disabled={busy} onClick={()=>useInnate({type:'UsePower',ability:otherAbility,targetIds:[abilityTarget],excluded:abilityExclude?[abilityExclude]:[],intensity:abilityIntensity,instruction:abilityText})}>嘗試操作（未支援者會拒絕結算）</button></>}
        <p>主角所在位置：{innate.subjects.protagonist.location}・場景：{phase2.scene.location}</p>
        <details><summary>物件位置、數量、所有權與保管</summary>{innate.objects.map(object=><p key={object.id}>{object.name} ×{object.quantity}・{object.location}・所有人 {object.ownerId}・保管人 {object.custodianId}{object.disassembled?'・已分解':''}{!object.intact?'・已損壞':''}</p>)}</details>
        {innate.consequences.slice(-5).reverse().map((entry)=><article className="effect-card" key={entry.id}><b>第 {entry.turn} 回合・{entry.ability}：{entry.title}</b>{entry.direct.map((text,index)=><p key={index}>直接：{text}</p>)}{entry.secondary.map((text,index)=><p key={index}>次生：{text}</p>)}</article>)}
        {Object.values(innate.subjects).map((person)=>{const roster=phase2.persons.find(entry=>entry.id===person.id);if(!roster)return null;const relation=phase2.relationships.find(entry=>entry.personId===person.id);return <p className="caption" key={person.id}>{roster.name}・恐懼 {person.fear}・創傷 {person.trauma.join('、')||'無'}・傷勢 {person.injuries.join('、')||'無'}・疾病 {person.disease.join('、')||'無'}・五感 {person.sensesLost?'失去作用':'正常'}・能力授予 {person.grantedAbilities.join('、')||'無'}{relation?`・忠誠 ${relation.loyalty}`:''}</p>;})}
      </details></article>}
      {phase2 && <>
        <article className="panel folds phase-panel"><details><summary>家庭圖譜與玩家命名</summary><p className="caption">血親、收養與婚姻分開建邊；死亡人物留在圖譜，但不再列為在場人物。</p><ul className="family-list">{phase2.persons.map((person) => <li key={person.id} className={!person.alive ? 'deceased' : ''}><span><b>{person.name}</b><small>{kinshipTerm(phase2, person.id)}・生年 {person.birthYear}{person.alive ? `・${person.office}` : `・已故 ${person.deathYear} 年`}</small></span>{person.id !== 'protagonist' && person.alive && <button className="quiet tiny" onClick={() => { if (window.confirm(`記錄「${person.name}」於西元 ${w.year} 年逝世？人物與親屬紀錄會保留。`)) phaseAction({ type:'MarkDeath', personId:person.id, deathYear:w.year }); }}>記錄逝世</button>}</li>)}</ul>
          <label>連結對象<select value={familyAnchor} onChange={(event) => setFamilyAnchor(event.target.value)}>{phase2.persons.map((person) => <option key={person.id} value={person.id}>{person.name}（{person.alive ? '在世' : '已故'}）</option>)}</select></label>
          <div className="button-row"><button className="quiet" onClick={() => requestName('血親子女')}>玩家為孩子命名</button><button className="quiet" onClick={() => requestName('收養子女')}>收養並命名</button><button className="quiet" onClick={() => requestName('婚姻')}>建立婚姻</button><button className="quiet" onClick={() => requestName('血親手足')}>新增血親手足</button><button className="quiet" onClick={() => requestName('血親父母')}>新增血親長輩</button></div>
        </details></article>
        <article className="panel folds phase-panel"><details><summary>五維、潛力與普通技能</summary><p>潛力傾向：{Object.entries(phase2.potential).map(([key, value]) => `${key} ${value}`).join('・')}</p>{phase2.stats ? <><p>一般五維：{Object.entries(phase2.stats).map(([key, value]) => `${key} ${value}`).join('・')}</p>{STAT_NAMES.map((stat) => <button className="quiet tiny" key={stat} disabled={busy || phase2.stats![stat] >= 100} onClick={() => phaseAction({ type:'TrainStat', stat, turn:state.turn })}>訓練{stat} +1</button>)}</> : <><p className="caption">主角目前 {phase2.age} 歲；童年只記錄潛力與訓練經驗，不生成成熟五維。年滿 15 歲後才可選擇原型成年評估。</p>{phase2.age >= 15 && <button className="quiet" disabled={busy} onClick={() => phaseAction({ type:'InitializeAdultStats' })}>確認成年五維示例評估</button>}</>}
          <p>普通核心技能 {phase2.coreSkills.length}／5</p><ul>{phase2.coreSkills.map((skill) => <li key={skill.id}>{skill.name}・{skill.rank}・實務記錄 {skill.practice}</li>)}</ul><label>練習／增列普通核心技能<input value={skillDraft} onChange={(event) => setSkillDraft(event.target.value)} maxLength={24} placeholder="例如：讀書、農政、騎術" /></label><button className="quiet" disabled={busy || !skillDraft.trim() || phase2.coreSkills.length >= 5 && !phase2.coreSkills.some((skill) => skill.name === skillDraft.trim())} onClick={() => { const skill = skillDraft.trim(); phaseAction({ type:'PracticeSkill', skillId:`skill-${skill}`, name:skill, turn:state.turn }); }}>記錄一次練習</button><p className="caption">普通技能上限五項；天生技獨立列管。清冊中已支援案例可在天生技操作台使用。{phase2.innateAbilities.length ? `已記錄天生技 ${phase2.innateAbilities.length} 項，不占普通技能名額。` : ''}</p><details><summary>成長紀錄・{phase2.practiceLog.length} 項</summary>{phase2.practiceLog.slice(-12).map((entry, index) => <p key={index}>第 {entry.turn} 回合・{entry.focus}：{entry.note}</p>)}</details>{phase2.overrideRecords.map((record) => <p className="caption" key={record}>{record}</p>)}</details></article>
        <article className="panel folds phase-panel"><details><summary>信任、忠誠、恐懼與恩怨</summary>{phase2.relationships.length > 0 ? <><label>人物<select value={selectedRelation?.personId ?? ''} onChange={(event) => setRelationTarget(event.target.value)}>{phase2.relationships.map((relation) => <option key={relation.personId} value={relation.personId}>{phase2.persons.find((person) => person.id === relation.personId)?.name}</option>)}</select></label>{selectedRelation && <><p>信任 {selectedRelation.trust}・忠誠 {selectedRelation.loyalty}・恐懼 {selectedRelation.fear}</p><div className="button-row"><button className="quiet tiny" onClick={() => phaseAction({ type:'AdjustRelation', personId:selectedRelation.personId, axis:'trust', delta:3, reason:'共同生活與守信', turn:state.turn })}>建立信任 +3</button><button className="quiet tiny" onClick={() => phaseAction({ type:'AdjustRelation', personId:selectedRelation.personId, axis:'loyalty', delta:3, reason:'履約與共同利益', turn:state.turn })}>履約忠誠 +3</button><button className="quiet tiny" onClick={() => phaseAction({ type:'AdjustRelation', personId:selectedRelation.personId, axis:'fear', delta:3, reason:'示例威嚇反應', turn:state.turn })}>威嚇恐懼 +3</button><button className="quiet tiny" onClick={() => { const text=window.prompt('記錄具體恩怨：'); if (text?.trim()) phaseAction({ type:'RecordGrievance', personId:selectedRelation.personId, text, turn:state.turn }); }}>記錄恩怨</button></div><p className="caption">四者分開保存；恐懼變化不會改寫忠誠。恩怨：{selectedRelation.grievances.map((item) => item.text).join('、') || '尚無'}</p></>}</> : <p>尚無可記錄關係的人物。</p>}</details></article>
        <article className="panel folds phase-panel"><details><summary>多資產帳簿與物品保管</summary><div className="asset-grid">{Object.entries(phase2.assetBalances).map(([asset, balances]) => <p key={asset}><b>{asset}</b>：{Object.entries(balances).map(([account, amount]) => `${account} ${amount}`).join('・')}</p>)}</div><label>資產<select value={assetName} onChange={(event) => setAssetName(event.target.value as AssetName)}>{(['錢','糧','貨物','馬匹','書籍'] as AssetName[]).map((asset) => <option key={asset}>{asset}</option>)}</select></label><div className="form-grid"><label>來源<select value={assetFrom} onChange={(event) => setAssetFrom(event.target.value as AccountName|'market')}>{(['private','family','public','military','sovereign','market'] as const).map((account) => <option key={account}>{account}</option>)}</select></label><label>去向<select value={assetTo} onChange={(event) => setAssetTo(event.target.value as AccountName|'market')}>{(['private','family','public','military','sovereign','market'] as const).map((account) => <option key={account}>{account}</option>)}</select></label></div><div className="form-grid"><label>數量<input type="number" min="1" step="1" value={assetAmount} onChange={(event) => setAssetAmount(Number(event.target.value))} /></label><label>事由<input value={assetMemo} onChange={(event) => setAssetMemo(event.target.value)} /></label></div><button className="quiet" disabled={busy} onClick={() => phaseAction({ type:'TransferAsset', asset:assetName, amount:assetAmount, from:assetFrom, to:assetTo, memo:assetMemo, turn:state.turn, id:commandId() })}>登錄收支</button><button className="quiet" disabled={busy} onClick={() => phaseAction({ type:'RecalculateMoneyAccounts' })}>依可靠流水重算錢帳</button><div className="ledger">{phase2.assetLedger.slice(-10).map((entry) => <div key={entry.id}><span>第 {entry.turn} 回合・{entry.memo}</span><span>{entry.from} → {entry.to}・{entry.asset} {entry.amount}</span></div>)}</div><h4>物品所有權／保管</h4>{phase2.items.map((item) => <div className="item-row" key={item.id}><span>{item.item} ×{item.quantity}<small>所有人：{phase2.persons.find((person) => person.id === item.ownerId)?.name ?? item.ownerId}；保管人：{phase2.persons.find((person) => person.id === item.custodianId)?.name ?? item.custodianId}；位置：{item.locationId}</small></span><button className="quiet tiny" onClick={() => phaseAction({ type:'ChangeCustody', itemId:item.id, custodianId:'protagonist', locationId:'主角隨身' })}>交主角保管</button></div>)}</details></article>
        <article className="panel folds phase-panel"><details><summary>通訊與消息抵達</summary>{selectedContact && <><label>收件人<select value={selectedContact.id} onChange={(event) => setMessageTarget(event.target.value)}>{livingContacts.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label>訊息<textarea value={messageText} onChange={(event) => setMessageText(event.target.value)} rows={2} /></label><div className="button-row"><button className="quiet" disabled={busy} onClick={() => phaseAction({ type:'SendMessage', id:commandId(), recipientId:selectedContact.id, channel:'軒轅傳音示例', text:messageText, turn:state.turn })}>傳送單向即時訊息</button><button className="quiet" disabled={busy} onClick={() => phaseAction({ type:'SendMessage', id:commandId(), recipientId:selectedContact.id, channel:'書信', text:messageText, turn:state.turn })}>寄信（兩回合路程）</button></div></>}{phase2.messages.slice(-8).map((message) => <p key={message.id}>{phase2.persons.find((person) => person.id === message.recipientId)?.name}・{message.channel}：第 {message.sentTurn} 回合送出，第 {message.arrivalTurn} 回合{message.arrived ? '已抵達' : '尚在途中'}。{message.text}</p>)}<p className="caption">傳音只呈現主角至指定收件者的單向語意案例；收件者不會即時回話，天生技完整能力尚未實作。</p></details></article>
        <article className="panel folds phase-panel"><details><summary>持續傷勢與目擊資訊</summary><label>記錄一項示例傷勢<input value={injuryDraft} onChange={(event) => setInjuryDraft(event.target.value)} /></label><div className="button-row"><button className="quiet" onClick={() => phaseAction({ type:'AddInjury', injury:{ id:commandId(), label:injuryDraft.trim() || '示例傷勢', severity:'輕', startedTurn:state.turn, elapsedTurns:0, active:true } })}>記錄持續傷勢</button>{selectedContact && <button className="quiet" onClick={() => phaseAction({ type:'RecordObservation', observation:{ id:commandId(), witnessId:selectedContact.id, turn:state.turn, observation:'目擊一件物品短暫消失後回到主角身旁。', known:['親眼所見物品消失並出現'], unknown:['能力名稱','容量','全部限制'] } })}>記錄目擊一次異象</button>}</div>{phase2.injuries.map((injury) => <div className="item-row" key={injury.id}><span>{injury.label}・{injury.severity}傷・持續 {injury.elapsedTurns} 回合・{injury.active ? '仍在恢復' : '已處置'}</span>{injury.active && <button className="quiet tiny" onClick={() => phaseAction({ type:'TreatInjury', injuryId:injury.id })}>記錄處置完成</button>}</div>)}{phase2.observations.map((observation) => <p key={observation.id}>{phase2.persons.find((person) => person.id === observation.witnessId)?.name}於第 {observation.turn} 回合所知：{observation.known.join('；')}。未知：{observation.unknown.join('、')}。</p>)}<p className="caption">傷勢每回合累積時間，只有明確記錄處置後才結束。目擊者只知道當次觀察，不獲得能力名稱、容量或後台限制。</p></details></article>
      </>}
      {state.summaries.length > 0 && <article className="panel summary"><div className="section-kicker">五／十／十五／二十回合摘要</div>{state.summaries.map((summary) => <details key={summary.turn} open={summary.turn === state.turn}><summary>第 {summary.turn} 回合・{summary.kind}</summary><p>{summary.text}</p></details>)}</article>}
      <article className="panel folds"><details><summary>收合狀態與規則來源</summary><p>目前：{state.status === 'playing' ? '進行中' : '已完成'}・第 {state.turn} 回合</p><p>世界線：{w.worldlineId}・種子 {w.seed}・revision {state.revision}</p><p>日期：西元 {w.year} 年 {w.month} 月／{era(w.year)}</p><p>自動後台檢查：人事 {state.backend.personnelChecks}・人才 {state.backend.talentChecks}・歷史 {state.backend.historyChecks}・天下 {state.backend.trendChecks}</p><p>來源摘要：規則 {SOURCE_HASHES.rules.slice(0,12)}…・天生技 {SOURCE_HASHES.skills.slice(0,12)}…</p><p>待決決策不會由「繼續」批准；本原型尚無待決決策流程。</p><p>RNG 抽樣序列由種子及回合決定，可經事件重播。</p></details>
        <details><summary>收合帳簿・多帳戶</summary><p>私帳 {state.accounts.private}・家帳 {state.accounts.family}・公帑 {state.accounts.public}・軍府 {state.accounts.military}・主君 {state.accounts.sovereign}</p><div className="ledger">{state.ledger.map((entry) => <div key={entry.id}><span>第 {entry.turn} 回合・{entry.memo}</span><span>{entry.from} → {entry.to}・{entry.asset} {entry.amount}</span></div>)}</div><p className="caption">物資代管保留 ownerId，保管人與位置另記；不代表第一階段已實作完整天生技效果。</p></details>
      </article>
      <article className="panel folds"><details><summary>收合自動後台示例</summary><p>人事：{state.backend.personnel.at(-1)}</p><p>待接觸人才：{state.backend.talents.at(-1) ?? '本回合無新示例候選'}</p><p>四個引擎每回合都執行檢查；示例名單不代表完整歷史資料。</p></details></article>
      <p className="caption side-caption">四引擎提供小型測試案例；自由文字解讀、完整歷史節點與清冊中列明未實作的天生技仍待完成。</p>
    </aside></div>
    {phase2?.pendingNames[0] && <div className="modal-backdrop"><section className="name-dialog" role="dialog" aria-modal="true" aria-labelledby="name-dialog-title"><div className="section-kicker">玩家命名權・待決</div><h2 id="name-dialog-title">請為「{phase2.pendingNames[0].role}」命名</h2><p>命名完成前，此人物不會加入正式家族圖。</p><label>姓名<input autoFocus maxLength={20} value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} /></label><button className="primary" disabled={!nameDraft.trim() || busy} onClick={finalizeName}>確認姓名</button></section></div>}
    {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')}>×</button></div>}
    <footer>神洲三國・第三階段原型　<span>commit-before-render 自動保存・事件版本 {state.engineVersion}</span></footer>
  </main>;
}
