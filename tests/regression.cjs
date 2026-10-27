// Run from the frontend root: node tests/regression.cjs
// Execute actual TS methods; Angular rendering is covered by the build/browser checks.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = process.cwd();
const cache = new Map();
const storage = new Map();
const context = {
  console, structuredClone, FormData, setTimeout, performance,
  confirm: () => true,
  sessionStorage: { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) },
  fetch: async () => ({ ok: false, status: 401, json: async () => ({error: 'wrong_password'}) }),
};
function load(file) {
  file = path.resolve(root, file);
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true },
  }).outputText;
  const requireLocal = name => {
    if (name.startsWith('@')) return new Proxy({}, {get: () => () => () => {}});
    return load((name.startsWith('src/') ? path.join(root, name) : path.resolve(path.dirname(file), name)) + '.ts');
  };
  vm.runInNewContext(code, {...context, exports, require: requireLocal}, {filename: file});
  return exports;
}

const component = (dir, name) => load(`src/app/component/${dir}.component.ts`)[name];
const instance = (Class, fields) => Object.assign(Object.create(Class.prototype), fields);
const event = id => ({id, title:id, dateStr:'2026-10-27', description:'', presence:['p1'], frequencyFlag:true});
const tests = [];
const test = (name, run) => tests.push({name, run});
const Presence = component('calendar/presence-dialog/presence-dialog', 'PresenceDialogComponent');
const Manager = component('calendar/event-manager/event-manager', 'EventManagerComponent');
test('Presence removes, adds and reopens without losing changes', () => {
  let data;
  const e = event('a');
  instance(Manager,{event:e, group:{participants:[]}, hub:{notifyArgs:(_,v)=>data=v.data}}).openPresenceModal();
  const callbacks=[];
  const hub={subscribe:(_,f)=>callbacks.push(f), notify(){}};
  const dialog=new Presence(hub, {});
  callbacks[0](data);
  dialog.manageFrequency({id:'p1'}); dialog.manageFrequency({id:'p2'}); dialog.closeDialog();
  assert.equal(e.presence.join(), 'p2');
  callbacks[0]({...data,presence:e.presence});
  assert.equal(dialog.presence.join(),'p2');
});

(async()=>{for(const {name,run} of tests){await run(); console.log(`PASS ${name}`)}})().catch(e=>{console.error(e);process.exitCode=1});
