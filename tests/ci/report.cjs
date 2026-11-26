// Export only allowlisted result fields; never copy .local or Docker state.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const local = path.join(root, 'tests/e2e/.local');
const output = path.join(root, 'ci-results');
fs.mkdirSync(output, {recursive: true});
const lines = ['## Business E2E results', '',
  'Build includes Backend and all four frontends. These results combine browser, API and concurrency checks.', '',
  '| Suite | Status | Passed | Other |', '|---|---|---:|---:|'];
for (const suite of ['test', 'vnpay', 'auto-cancel', 'known-gaps']) {
  const source = path.join(local, `summary-${suite}.json`);
  if (!fs.existsSync(source)) {
    lines.push(`| ${suite} | NOT_RUN | 0 | 0 |`);
    continue;
  }
  const raw = JSON.parse(fs.readFileSync(source, 'utf8'));
  const tests = raw.tests.map(t => ({title: t.title, caseIds: t.caseIds, status: t.status, durationMs: t.durationMs}));
  fs.writeFileSync(path.join(output, `summary-${suite}.json`), JSON.stringify({date: raw.date, status: raw.status, tests}, null, 2));
  const passed = tests.filter(t => t.status === 'passed').length;
  lines.push(`| ${suite} | ${raw.status} | ${passed} | ${tests.length - passed} |`);
}
for (const name of ['coverage.json', 'coverage.md']) {
  const file = path.join(local, name);
  if (fs.existsSync(file)) fs.copyFileSync(file, path.join(output, name));
}
lines.push('', 'Known gaps are opt-in and are NOT_RUN on ordinary pushes/PRs. A green baseline does not mean all known defects are fixed.',
  'Real VNPay Sandbox (PAY-12) remains manual. No real merchant credentials or production database are used.',
  'Screenshots, traces, raw error strings and environment secrets are not uploaded. See failing step logs for diagnostics.', '');
const markdown = lines.join('\n');
fs.writeFileSync(path.join(output, 'SUMMARY.md'), markdown);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
console.log(markdown);
