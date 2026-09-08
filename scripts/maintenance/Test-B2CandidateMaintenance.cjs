const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Public source only. Neither maintenance mode nor any real Chrome API is run.
const source = fs.readFileSync(path.join(__dirname, 'Prepare-B2CandidateMaintenance.ps1'), 'utf8');
const template = source.match(/\$js = @'\r?\n([\s\S]*?)\r?\n'@/)[1];
const exportJs = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8').match(/```javascript\r?\n([\s\S]*?)\r?\n```/)[1];
const b1 = '2.0.76-beta.1', b2 = '2.0.76-beta.2';
const now = Date.parse('2026-09-08T03:00:00Z');
const candidate = 'https://syntheticaccount.blob.core.windows.net/new/b2.zip?sp=r&sr=b&spr=https&se=2026-09-08T06%3A47%3A00Z&sig=synthetic&sv=2021-12-02';
const saved = {state: {kind: 'preparing', errorCode: 'update_prepare_failed', transactionId: '404ded6a59bbcc86fb681c28c9827b6c', priorVersion: b1, targetVersion: b2, update: {version: b2, url: 'https://syntheticaccount.blob.core.windows.net/old/b2.zip?sig=old', isPrerelease: true}}, workerVersion: b1, workerInstance: 'a'.repeat(32), legacyPresent: false};
const clone = v => JSON.parse(JSON.stringify(v));
const encode = v => Buffer.from(v, 'utf8').toString('base64');
const compile = (backup = saved, url = candidate) => template.replace('__BACKUP64__', encode(JSON.stringify(backup))).replace('__URL64__', encode(url));
let passed = 0;
function test(name, run) {
  try { run(); passed++; } catch (error) { throw new Error(name, {cause: error}); }
}
function harness(options = {}) {
  const stored = {dh_update_state: clone(saved.state), dh_update_worker_version: b1, dh_update_worker_instance: saved.workerInstance};
  const queue = [], writes = [], logs = [], copies = [];
  let reloads = 0;
  const runtime = {getManifest: () => ({version_name: options.version || b1}), reload: () => { reloads++; }};
  const context = vm.createContext({URL, TextDecoder, Uint8Array, atob, Date: class extends Date {static now() {return options.now ?? now;}}, console: {log: value => logs.push(value)}, copy: value => copies.push(value), chrome: {runtime, storage: {local: {
    get: (keys, callback) => {
      assert.deepEqual(Array.from(keys), ['dh_update_state', 'pending_update', 'dh_update_worker_version', 'dh_update_worker_instance']);
      queue.push(() => { runtime.lastError = options.getError ? {message: 'SENSITIVE'} : undefined; callback(clone(stored)); runtime.lastError = undefined; });
    },
    set: (value, callback) => {
      writes.push(clone(value));
      queue.push(() => { runtime.lastError = options.setError ? {message: 'SENSITIVE'} : undefined; callback(); runtime.lastError = undefined; });
    },
  }}}});
  return {stored, writes, logs, copies, context, get reloads() {return reloads;}, run: (code = compile()) => vm.runInContext(code, context), drain: () => {while (queue.length) queue.shift()();}};
}
test('success and concurrent duplicate paste write/reload once', () => {
  const h = harness(); h.run(); h.run(); h.drain(); h.run(); h.drain();
  assert.deepEqual(h.writes, [{dh_update_state: {kind: 'available', update: {version: b2, url: candidate, isPrerelease: true}}}]);
  assert.equal(h.reloads, 1);
});
for (const [name, mutate] of [
  ['missing state', r => delete r.dh_update_state], ['nested change', r => r.dh_update_state.update.url += 'x'],
  ['additional state field', r => r.dh_update_state.extra = 1], ['different transaction', r => r.dh_update_state.transactionId = 'b'.repeat(32)],
  ['new worker', r => r.dh_update_worker_instance = 'b'.repeat(32)], ['missing worker', r => delete r.dh_update_worker_instance],
  ['different stored version', r => r.dh_update_worker_version = b2], ['legacy even null', r => r.pending_update = null],
]) test(name, () => { const h = harness(); mutate(h.stored); h.run(); h.drain(); assert.equal(h.writes.length, 0); assert.equal(h.reloads, 0); });
for (const options of [{getError: true}, {version: b2}, {now: Date.parse('2026-09-08T06:37:00Z')}, {now: Date.parse('2026-09-08T06:48:00Z')}]) {
  test('read/version/expiry guard ' + JSON.stringify(options), () => {const h = harness(options); h.run(); h.drain(); assert.equal(h.writes.length, 0); assert.equal(h.reloads, 0);});
}
test('write callback failure retains latch and never reloads', () => {
  const h = harness({setError: true}); h.run(); h.drain(); h.run(); h.drain();
  assert.equal(h.writes.length, 1); assert.equal(h.reloads, 0); assert.deepEqual(h.logs, ['B2_MAINTENANCE_STOP', 'B2_MAINTENANCE_STOP']);
});
test('canonical comparison ignores object order but preserves all values', () => {
  const h = harness(); h.stored.dh_update_state = Object.fromEntries(Object.entries(h.stored.dh_update_state).reverse());
  h.run(); h.drain(); assert.equal(h.writes.length, 1);
});
for (const url of [candidate.replace('https:', 'http:'), candidate.replace('syntheticaccount', 'otheraccount'), candidate.replace('/new/', '/old/'), candidate.replace('b2.zip', 'other.zip'), candidate.replace('sp=r', 'sp=rw'), candidate.replace('sr=b', 'sr=c'), candidate.replace('spr=https', 'spr=http'), candidate + '&sp=r', candidate.replace('2026-09-08T06%3A47%3A00Z', 'invalid')]) {
  test('URL guard', () => {const h = harness(); h.run(compile(saved, url)); h.drain(); assert.equal(h.writes.length, 0);});
}
test('expiry rechecked inside get callback', () => {
  const opts = {}; const h = harness(opts); h.run(); opts.now = Date.parse('2026-09-08T06:40:00Z'); h.drain(); assert.equal(h.writes.length, 0);
});
test('export keeps exact complete envelope privately', () => {
  const h = harness(); h.run(exportJs); h.drain(); assert.deepEqual(JSON.parse(h.copies[0]), saved); assert.deepEqual(h.logs, ['BACKUP_CLIPBOARD_READY']); assert.equal(h.writes.length, 0);
});
for (const mutate of [r => r.dh_update_state.extra = 1, r => r.dh_update_state.errorCode = 'other', r => r.dh_update_worker_instance = 'bad', r => r.pending_update = null, r => r.dh_update_state.update.isPrerelease = 'true']) {
  test('export fails closed', () => {const h = harness(); mutate(h.stored); h.run(exportJs); h.drain(); assert.equal(h.copies.length, 0); assert.deepEqual(h.logs, ['B2_BACKUP_STOP']);});
}
test('no DevTools copy helper stops without mutation', () => {const h = harness(); delete h.context.copy; h.run(exportJs); h.drain(); assert.equal(h.copies.length, 0); assert.equal(h.writes.length, 0);});
test('only bounded public source operations', () => {
  assert(!/sendMessage|sendNativeMessage|connectNative|fetch\(|\.remove\(|\.clear\(|prompt\(/.test(template));
  assert(source.includes('[System.IO.FileMode]::CreateNew'));
  assert(source.includes('Set-Clipboard -Value $js'));
  assert(!/New-Item|Set-Acl|Invoke-WebRequest|Invoke-RestMethod|Start-Process/.test(source));
});
console.log(`PASS ${passed}/${passed} offline checks; no maintenance modes or private inputs used.`);
