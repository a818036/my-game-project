import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createServer } from 'vite';

const args = process.argv.slice(2);
const beforeReoffer = args[0] === '--before-reoffer';
const outputPath = resolve(args[beforeReoffer ? 1 : 0] ?? 'docs/fixtures/phase6-ending-reoffer-v6.json');
const vite = await createServer({
  configFile: './vite.config.ts',
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true },
});

try {
  const { createOpeningFacts, dispatch, ENGINE_VERSION } = await vite.ssrLoadModule('/src/engine.ts');
  const { ENGINEERING, shouldReofferEnding } = await vite.ssrLoadModule('/src/phase4.ts');
  const { toJson, verifySave } = await vite.ssrLoadModule('/src/storage.ts');
  const facts = createOpeningFacts(23, 160, { regions: [], surnames: [] });
  const events = [];
  const start = dispatch(null, {
    version: ENGINE_VERSION,
    commandId: 'phase6-ending-reoffer-fixture-start',
    expectedRevision: 0,
    type: 'StartGame',
    name: `${facts.surname}介面驗收`,
    seed: 23,
    facts,
  });
  if (!start.state || !start.event) throw new Error('建立結局重提測試世界線失敗');
  let state = start.state;
  events.push(start.event);

  for (let decade = 1; decade <= 12; decade++) {
    const step = dispatch(state, {
      version: ENGINE_VERSION,
      commandId: `phase6-ending-reoffer-fixture-decade-${decade}`,
      expectedRevision: state.revision,
      worldlineId: state.worldlineId,
      type: 'Phase4Action',
      action: { type: 'AdvanceDays', days: 3600 },
    });
    if (!step.state || !step.event) throw new Error(`推進長局失敗：${decade}`);
    state = step.state;
    events.push(step.event);
  }

  const unified = dispatch(state, {
    version: ENGINE_VERSION,
    commandId: 'phase6-ending-reoffer-fixture-unify',
    expectedRevision: state.revision,
    worldlineId: state.worldlineId,
    type: 'Phase4Action',
    action: { type: 'SetUnified', unified: true },
  });
  if (!unified.state || !unified.event) throw new Error('記錄統一狀態失敗');
  state = unified.state;
  events.push(unified.event);

  const continueLife = dispatch(state, {
    version: ENGINE_VERSION,
    commandId: 'phase6-ending-reoffer-fixture-continue',
    expectedRevision: state.revision,
    worldlineId: state.worldlineId,
    type: 'Phase4Action',
    action: { type: 'ContinueAfterUnification' },
  });
  if (!continueLife.state || !continueLife.event) throw new Error('記錄繼續人生狀態失敗');
  state = continueLife.state;
  events.push(continueLife.event);

  for (let index = 0; !beforeReoffer && index < ENGINEERING.endingReofferNaturalNodeCount; index++) {
    const id = `phase6-ending-reoffer-fixture-treaty-${index + 1}`;
    const draft = dispatch(state, {
      version: ENGINE_VERSION,
      commandId: `${id}-draft`,
      expectedRevision: state.revision,
      worldlineId: state.worldlineId,
      type: 'Phase4Action',
      action: {
        type: 'DraftTreaty',
        id,
        proposer: '玩家',
        clauses: [{
          id: `${id}-clause`,
          text: `介面驗收示例領地決策 ${index + 1}`,
          sovereign: true,
          territoryId: 'sample-county',
          successorOwner: `介面驗收治理 ${index + 1}`,
        }],
      },
    });
    if (!draft.state || !draft.event) throw new Error(`建立重大節點失敗：${index + 1}`);
    state = draft.state;
    events.push(draft.event);

    const approval = dispatch(state, {
      version: ENGINE_VERSION,
      commandId: `${id}-approve`,
      expectedRevision: state.revision,
      worldlineId: state.worldlineId,
      type: 'Phase4Action',
      action: { type: 'DecideTreaty', treatyId: id, decision: 'approve' },
    });
    if (!approval.state || !approval.event) throw new Error(`完成重大節點失敗：${index + 1}`);
    state = approval.state;
    events.push(approval.event);
  }

  if (!state.phase4 || state.phase4.year !== 280 || state.phase4.ending !== 'continuing' || shouldReofferEnding(state.phase4) === beforeReoffer) {
    throw new Error(`測試存檔沒有停在 280 年且${beforeReoffer ? '低於' : '達到'}結局重提門檻`);
  }
  const candidate = { format: 'shenzhou-save', version: 6, worldlineId: state.worldlineId, events, state };
  const save = verifySave(toJson(candidate));
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, toJson(save), 'utf8');
  console.log(`已建立並重播驗證 v6 結局重提存檔：${outputPath}`);
  console.log(`世界線 ${save.worldlineId}、${save.events.length} 筆引擎事件、西元 ${save.state.phase4.year} 年、ending=${save.state.phase4.ending}、${beforeReoffer ? '尚未達' : '已達'}重提門檻。`);
} finally {
  await vite.close();
}
