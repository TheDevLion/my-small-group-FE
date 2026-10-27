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
let response = {ok:true,status:200,json:async()=>({id:"g"})};
const context = {
  console, structuredClone, FormData, setTimeout, performance,
  confirm: () => true,
  sessionStorage: { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) },
  fetch: async () => response,
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

const Group=load('src/app/service/group.service.ts').GroupService;
const Calendar=component('calendar/events-view/events-view','EventsViewComponent');
test('Save updates cache, retains previous events and isolates unsaved edits',async()=>{
  const service=new Group(); service.group={id:'g',name:'G',events:[],participants:[],template:{}};
  const m=instance(Manager,{group:service.group,event:event('a'),hub:{notify(){}},groupService:service,saveImgs:async()=>{},intl:{showError(){throw Error('unexpected failure')}}});
  await m.saveEvent(); assert.equal(service.group.events[0].id,'a');
  m.event.title='unsaved'; assert.equal(service.group.events[0].title,'a');
  m.event=event('b'); await m.saveEvent(); assert.equal(service.group.events.length,2);
  m.event={...event('a'),title:'updated'}; await m.saveEvent(); assert.equal(service.group.events.find(x=>x.id==='a').title,'updated');
  await service.updateGroupParticipants([{id:'p1',name:'Name',alias:'N',role:'member'}]);
  assert.equal(service.group.participants.length,1);
});
test('Failed event writes retain cache and skip uploads',async()=>{
  response={ok:false,status:502,json:async()=>({error:'api_unavailable'})};
  const service=new Group(); service.group={id:'g',name:'G',events:[event('a')],participants:[],template:{}};
  let uploaded=false, errors=0;
  const m=instance(Manager,{group:service.group,event:event('b'),hub:{notify(){}},groupService:service,saveImgs:async()=>{uploaded=true},intl:{showError(){errors++}}});
  await m.saveEvent(); assert.equal(uploaded,false); assert.equal(service.group.events.length,1); assert.equal(m.isSaving,false);
  const c=instance(Calendar,{group:service.group,groupService:service,intl:{translateWithParams:()=>'',showError(){errors++}}});
  await c.deleteEvent(event('a')); assert.equal(service.group.events.length,1); assert.equal(errors,2);
  response={ok:true,status:200,json:async()=>({id:'g'})};
});

(async()=>{for(const {name,run} of tests){await run(); console.log(`PASS ${name}`)}})().catch(e=>{console.error(e);process.exitCode=1});
