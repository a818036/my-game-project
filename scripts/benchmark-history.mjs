import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { createServer } from 'vite';

const warmups = 2;
const samples = 9;
const vite = await createServer({
  configFile: './vite.config.ts',
  appType: 'custom',
  logLevel: 'error',
  server: { middlewareMode: true },
});

try {
  const { createOpeningFacts, dispatch, ENGINE_VERSION, replay } = await vite.ssrLoadModule('/src/engine.ts');

  function reachYear280() {
    const facts = createOpeningFacts(170, 160, { regions: [], surnames: [] });
    const started = dispatch(null, {
      version: ENGINE_VERSION,
      commandId: 'phase6-bench-start',
      expectedRevision: 0,
      type: 'StartGame',
      name: `${facts.surname}長局`,
      seed: 170,
      facts,
    });
    if (!started.state || !started.event) throw new Error(`Could not start benchmark worldline: ${started.reason ?? 'unknown error'}`);

    let state = started.state;
    const events = [started.event];
    let decade = 0;
    while (state.world.year < 280) {
      decade += 1;
      const result = dispatch(state, {
        version: ENGINE_VERSION,
        commandId: `phase6-bench-decade-${decade}`,
        expectedRevision: state.revision,
        worldlineId: state.worldlineId,
        type: 'Phase4Action',
        action: { type: 'AdvanceDays', days: 3600 },
      });
      if (!result.state || !result.event) throw new Error(`Could not advance benchmark worldline in step ${decade}: ${result.reason ?? 'unknown error'}`);
      state = result.state;
      events.push(result.event);
    }
    if (state.world.year < 280) throw new Error(`Benchmark worldline ended in ${state.world.year}, expected at least 280`);
    return { state, events };
  }

  function percentile(sorted, fraction) {
    return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
  }

  function measure(label, operation) {
    for (let index = 0; index < warmups; index += 1) operation();
    const values = [];
    for (let index = 0; index < samples; index += 1) {
      const start = performance.now();
      operation();
      values.push(performance.now() - start);
    }
    values.sort((a, b) => a - b);
    const median = percentile(values, 0.5);
    const p95 = percentile(values, 0.95);
    console.log(`${label}: median ${median.toFixed(1)} ms; p95 ${p95.toFixed(1)} ms; min ${values[0].toFixed(1)} ms; n=${samples}`);
  }

  const reference = reachYear280();
  const { events } = reference;
  console.log(`Historical performance benchmark (deterministic 160–${reference.state.world.year}, ${events.length} events)`);
  console.log(`Runtime: Node ${process.version}; ${process.platform}/${process.arch}; ${os.cpus()[0]?.model ?? 'CPU unknown'}; ${os.cpus().length} logical cores`);
  console.log(`Sampling: ${warmups} warmups, ${samples} measured runs; results are local rule-engine time, not browser rendering.`);
  measure(`Advance one worldline from 160 through ${reference.state.world.year}`, reachYear280);
  measure(`Replay the 160–${reference.state.world.year} year event stream`, () => replay(events));
} finally {
  await vite.close();
}
