import { spawnSync } from 'child_process';
import fs from 'fs';

const file = new URL('./scenarios.mjs', import.meta.url);
const names = [...fs.readFileSync(file, 'utf8').matchAll(/^  async (\w+)\(\)/gm)].map((m) => m[1]);
let failed = 0;
for (const name of names) {
  const out = spawnSync(process.execPath, [file.pathname, name], { encoding: 'utf8', timeout: 60000 });
  const line = (out.stdout + out.stderr).split('\n').find((l) => /^(PASS|FAIL)/.test(l)) || `FAIL ${name}: crashed\n${out.stderr}`;
  if (!line.startsWith('PASS')) failed++;
  console.log(line);
}
console.log(failed ? `\n${failed} scenario(s) failed` : `\nAll ${names.length} scenarios passed`);
process.exit(failed ? 1 : 0);
