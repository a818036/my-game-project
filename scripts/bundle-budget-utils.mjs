import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const STATIC_IMPORT = /\b(?:import|export)\s*(?:[^'";]*?\bfrom\s*)?(['"])([^'"]+)\1/g;

export function staticJavaScriptImports(source) {
  return [...source.matchAll(STATIC_IMPORT)]
    .map((match) => match[2])
    .filter((specifier) => specifier.startsWith('./') || specifier.startsWith('../'));
}

export async function collectStaticJavaScriptClosure(entryPath) {
  const visited = new Set();
  const pending = [resolve(entryPath)];

  while (pending.length) {
    const filePath = pending.pop();
    if (visited.has(filePath)) continue;
    visited.add(filePath);

    const source = await readFile(filePath, 'utf8');
    for (const specifier of staticJavaScriptImports(source)) {
      const dependency = resolve(dirname(filePath), specifier);
      if (dependency.endsWith('.js')) pending.push(dependency);
    }
  }

  const files = await Promise.all([...visited].map(async (path) => ({
    path,
    bytes: (await stat(path)).size,
  })));
  return files;
}
