import { useEffect, useMemo, useRef, useState } from 'react';
import { createOpeningFacts, dispatch, ENGINE_VERSION, INTENTS, MAX_TURNS, SKILLS_VERSION, SOURCE_HASHES, type GameCommand } from '../engine';
import { activateWorldline, assertSlotCompatible, commitWorldline, loadWorkspace, toJson, verifySave, type SaveFile, type WorkspaceSnapshot } from '../storage';

const blankWorkspace: WorkspaceSnapshot = { saves: [], profile: { regions: [], surnames: [], activeWorldlineId: null } };
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
  const busyRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const activeSave = workspace.saves.find((save) => save.worldlineId === workspace.profile.activeWorldlineId) ?? null;
  const state = activeSave?.state ?? null;
  const events = activeSave?.events ?? [];
  const preview = useMemo(() => createOpeningFacts(seed, birthYear, workspace.profile), [seed, birthYear, workspace.profile]);

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
      const save: SaveFile = { format: 'shenzhou-save', version: 2, worldlineId, events: nextEvents, state: result.state };
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
      const imported = verifySave(await file.text());
      const existing = workspace.saves.find((entry) => entry.worldlineId === imported.worldlineId);
      assertSlotCompatible(existing ?? undefined, imported);
      const save = existing ?? imported;
      await commitWorldline(save, workspace.profile, true);
      setWorkspace((old) => ({ saves: existing ? old.saves : [...old.saves, save], profile: { ...old.profile, activeWorldlineId: save.worldlineId } }));
      setNewTimeline(false); setNotice('存檔已重播驗證並匯入為獨立世界線。');
    } catch (error) { setNotice(error instanceof Error ? `匯入失敗：${error.message}` : '匯入失敗；目前世界線未變更。'); }
    if (fileRef.current) fileRef.current.value = '';
  }

  if (!ready) return <main className="loading">正在開啟你的世界線……</main>;
  if (!state || newTimeline) return <main className="start-page"><section className="start-card">
    <p className="eyebrow">東漢・出生確認　｜　第一階段示例原型</p><h1>神洲三國</h1><p className="lead">先確認你的名字與出生結果，再從出生之年展開一條獨立世界線。</p>
    <label>名字（不含姓氏）<input maxLength={16} value={name} onChange={(e) => { setName(e.target.value); setConfirmed(false); }} placeholder="輸入主角名字" /></label>
    {name.trim() && <>
    <label>出生年（公元）<select value={birthYear} onChange={(e) => { setBirthYear(Number(e.target.value)); setConfirmed(false); }}>{Array.from({ length: 25 }, (_, i) => 184 - i).map((y) => <option key={y} value={y}>{y} 年</option>)}</select></label>
    <div className="seed-box"><div><span className="muted">本次種子（確認前不變）</span><code>{seed}</code></div><button className="quiet" onClick={() => { setSeed(randomSeed()); setConfirmed(false); }}>重新抽取種子 ↻</button></div>
    <section className="opening-preview"><div className="section-kicker">開局隨機紀錄・確認前預覽</div><p><b>出生地：</b>{preview.birthRegion}</p><p><b>家族姓氏：</b>{preview.surname}（近期三次內不重複）</p><p><b>出身：</b>{preview.background}（示例）</p><p><b>親族與師長：</b>{preview.family.map((person) => `${person.role}：${person.name}`).join('；')}</p><p><b>潛質傾向：</b>{Object.entries(preview.potential).map(([stat, value]) => `${stat} ${value}`).join('・')}（示例，非成熟五維）</p><p><b>健康：</b>{preview.health}　<b>地方：</b>{preview.localSituation}</p><details><summary>顯示種子抽樣紀錄</summary><code>{preview.rngTrace.join(' · ')}</code><p className="caption">若結果與近期三次開局重複，只從原種子導出的候選序列重抽；種子不會暗中更換。</p></details></section>
    <p className="caption">主角固定背景依天生技 v{SKILLS_VERSION}：2026 年穿越者，保有現代／歷史知識，精通兵法、軍謀、內政與交易，偏好逛市集殺價並保留自主路線。天生技完整效果尚未實作，未加入消耗、冷卻或削弱規則。</p>
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
      <select aria-label="切換世界線" value={state.worldlineId} onChange={(e) => void switchTimeline(e.target.value)}>{workspace.saves.map((save) => <option key={save.worldlineId} value={save.worldlineId}>{saveName(save)}</option>)}</select>
      <button className="quiet" onClick={() => { setNewTimeline(true); setConfirmed(false); }}>新建世界線</button><button className="quiet" onClick={() => exportSave()}>匯出</button><button className="quiet" onClick={() => fileRef.current?.click()}>匯入</button><input ref={fileRef} hidden type="file" accept="application/json,.json" onChange={(e) => void importSave(e.target.files?.[0])} />
    </div></header>
    <section className="hero"><div><p className="eyebrow">{turnInterval(c.birthYear, state.turn, w.year, w.month)}　｜　第 {state.turn} 回合</p><h1>{c.name}<small>　{c.age} 歲・出生於 {c.home}</small></h1><p>{c.background}（示例）・{c.health}；世界線 {w.worldlineId}</p></div><div className="worldline"><span>種子 {w.seed}</span><span>規則 v{state.rulesVersion}・天生技 v{state.skillsVersion}</span></div></section>
    <div className="layout"><section className="main-column">
      <article className="panel trend"><div className="section-kicker">天下大勢　／　每回合自動推進</div><p>{state.trend}</p><span className="caption">範本敘事・小型示例事件</span></article>
      {state.historicalNodes.length > 0 && <article className="panel trend"><div className="section-kicker">歷史節點・示例</div>{state.historicalNodes.slice(-2).map((node, i) => <p key={i}>{node}</p>)}</article>}
      {state.status === 'playing' ? <article className="panel intents"><div className="panel-heading"><div><div className="section-kicker">本回合行動</div><h2>選擇一項互斥生活意圖</h2></div><span className="round">{state.turn} / {MAX_TURNS}</span></div>
        {state.turn === 10 && <p className="milestone">已完成第一段十回合大記，世界線仍可繼續。</p>}
        <div className="intent-grid">{INTENTS.map((intent, i) => <button className="intent" key={intent} disabled={busy} onClick={() => void run(nextCommand('ChooseIntent', intent))}><span className="intent-icon">{['禾', '士', '市', '行'][i]}</span><span><strong>{intent}</strong><small>{['耕作與讀書，累積家計及學習經驗', '訪求地方人物，交遊不等於登用成功', '往返市集，盈虧依交易結算', '遊歷附近村落，支出盤纏並聽聞消息'][i]}</small></span><b>→</b></button>)}</div>
        <button className="continue" disabled={busy} onClick={() => void run(nextCommand('Continue'))}>繼續目前人生（不推進時間、不批准待決事項）</button>
      </article> : <article className="panel finish"><div className="section-kicker">二十回合原型旅程完成</div><h2>這條世界線已保存。</h2><p>{state.summaries.at(-1)?.text}</p><button className="quiet" onClick={() => { setNewTimeline(true); setConfirmed(false); }}>建立另一條世界線</button></article>}
      <article className="panel log"><div className="section-kicker">旅程紀錄</div>{state.actions.length ? <ol>{state.actions.slice().reverse().map((action) => <li key={action.turn}><span className="log-turn">{String(action.turn).padStart(2, '0')}</span><div><strong>{action.title}</strong><p>{action.details}</p></div></li>)}</ol> : <p className="muted">新生後的第一個決策節點由你選擇。</p>}</article>
    </section><aside className="side-column">
      <article className="panel profile"><div className="section-kicker">人物與潛質・示例</div><div className="stat"><span>私錢</span><strong>{c.money}</strong></div><div className="stat"><span>聲望（示例）</span><strong>{c.reputation}</strong></div><div className="skills">{Object.entries(c.potential).map(([stat, value]) => <span key={stat}>{stat} <b>{value}</b></span>)}</div><p className="contacts">學習／實務／交遊經驗：{c.growth.study}／{c.growth.practice}／{c.growth.social}</p><p className="caption">以上潛質不是出生即具備的成熟五維。</p><details><summary>家庭與背景</summary>{c.family.map((person) => <p key={person.role}>{person.role}：{person.name}</p>)}<p>健康：{c.health}</p><p>地方：{c.home}・{c.background}</p></details><p className="caption">天生技 v{SKILLS_VERSION} 已記錄版本基準；能力執行尚未實作，遊戲不會假稱已發動。</p></article>
      {state.summaries.length > 0 && <article className="panel summary"><div className="section-kicker">五／十回合摘要</div>{state.summaries.map((summary) => <details key={summary.turn} open={summary.turn === state.turn}><summary>第 {summary.turn} 回合・{summary.kind}</summary><p>{summary.text}</p></details>)}</article>}
      <article className="panel folds"><details><summary>收合狀態與規則來源</summary><p>目前：{state.status === 'playing' ? '進行中' : '已完成'}・第 {state.turn} 回合</p><p>世界線：{w.worldlineId}・種子 {w.seed}・revision {state.revision}</p><p>日期：西元 {w.year} 年 {w.month} 月／{era(w.year)}</p><p>自動後台檢查：人事 {state.backend.personnelChecks}・人才 {state.backend.talentChecks}・歷史 {state.backend.historyChecks}・天下 {state.backend.trendChecks}</p><p>來源摘要：規則 {SOURCE_HASHES.rules.slice(0,12)}…・天生技 {SOURCE_HASHES.skills.slice(0,12)}…</p><p>待決決策不會由「繼續」批准；本原型尚無待決決策流程。</p><p>RNG 抽樣序列由種子及回合決定，可經事件重播。</p></details>
        <details><summary>收合帳簿・多帳戶</summary><p>私帳 {state.accounts.private}・家帳 {state.accounts.family}・公帑 {state.accounts.public}・軍府 {state.accounts.military}・主君 {state.accounts.sovereign}</p><div className="ledger">{state.ledger.map((entry) => <div key={entry.id}><span>第 {entry.turn} 回合・{entry.memo}</span><span>{entry.from} → {entry.to}・{entry.asset} {entry.amount}</span></div>)}</div><p className="caption">物資代管保留 ownerId，保管人與位置另記；不代表第一階段已實作完整天生技效果。</p></details>
      </article>
      <article className="panel folds"><details><summary>收合自動後台示例</summary><p>人事：{state.backend.personnel.at(-1)}</p><p>待接觸人才：{state.backend.talents.at(-1) ?? '本回合無新示例候選'}</p><p>四個引擎每回合都執行檢查；示例名單不代表完整歷史資料。</p></details></article>
      <p className="caption side-caption">四引擎提供小型測試案例；自由文字解讀、完整歷史節點與天生技效果尚未實作。</p>
    </aside></div>
    {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')}>×</button></div>}
    <footer>神洲三國・第一階段示例　<span>commit-before-render 自動保存・事件版本 {state.engineVersion}</span></footer>
  </main>;
}
