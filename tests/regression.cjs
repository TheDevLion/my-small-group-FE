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
  window:{dispatchEvent(){}}, Event,
  document:{fullscreenElement:null,documentElement:{requestFullscreen:async()=>{context.document.fullscreenElement={}}},exitFullscreen:async()=>{context.document.fullscreenElement=null}},
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

const api=load('src/app/helpers/base_request.ts');
api.saveSessionState('g');
const Group=load('src/app/service/group.service.ts').GroupService;
const Calendar=component('calendar/events-view/events-view','EventsViewComponent');
test('Save updates cache, retains previous events and isolates unsaved edits',async()=>{
  const service=new Group(); service.group={id:'g',name:'G',events:[],participants:[],template:{}};
  const m=instance(Manager,{group:service.group,event:event('a'),hub:{notify(){}},groupService:service,router:{navigate:async()=>true},saveImgs:async()=>{},intl:{showError(){throw Error('unexpected failure')}}});
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
  const m=instance(Manager,{group:service.group,event:event('b'),hub:{notify(){}},groupService:service,router:{navigate:async()=>true},saveImgs:async()=>{uploaded=true},intl:{showError(){errors++}}});
  await m.saveEvent(); assert.equal(uploaded,false); assert.equal(service.group.events.length,1); assert.equal(m.isSaving,false);
  const c=instance(Calendar,{group:service.group,groupService:service,intl:{translateWithParams:()=>'',showError(){errors++}}});
  await c.deleteEvent(event('a')); assert.equal(service.group.events.length,1); assert.equal(errors,2);
  response={ok:true,status:200,json:async()=>({id:'g'})};
});

test('Photo retries skip successful files and resume publication without reupload',async()=>{
  const first=new Blob(['one']); const second=new Blob(['two']); let uploads=0, publications=0;
  const input={files:[first,second],value:'selected'};
  const m=instance(Manager,{event:event('a'),imgUrls:[],uploadedFiles:new Set(),pendingPublications:new Map(),files:{nativeElement:input},intl:{showError(){}},eventPhotoService:{
    uploadAsset:async()=>++uploads===1?{id:'one',url:'one'}:{id:'two',error:'publication_failed'},
    publishImg:async id=>{publications++;return {id,url:id}}
  }});
  await m.saveImgs(); assert.equal(m.imgUrls.length,1); assert.equal(input.value,'selected');
  await m.saveImgs(); assert.equal(uploads,2); assert.equal(publications,1); assert.equal(m.imgUrls.length,2); assert.equal(input.value,'');
});

test('Expired session cannot reuse or write previous group cache',async()=>{
  const service=new Group();service.group={id:'g',name:'G',events:[],participants:[],template:{}};
  api.clearSessionState();assert.equal(await service.init(),false);assert.equal(service.group.id,'');
  api.saveSessionState('other');service.group={id:'g',name:'G'};
  assert.equal((await service.updateEvent([])).error,'unauthorized');
  response={ok:true,status:200,json:async()=>({id:'other',name:'Other',participants:[],events:[],template:{}})};
  assert.equal(await service.init(),true);assert.equal(service.group.id,'other');
  api.saveSessionState('g');response={ok:true,status:200,json:async()=>({id:'g'})};
});
test('Login preserves wrong-password response',async()=>{
  response={ok:false,status:401,json:async()=>({error:'wrong_password'})};
  assert.equal((await api.login('bad')).error,'wrong_password');
  api.saveSessionState('g');response={ok:true,status:200,json:async()=>({id:'g'})};
});

test('Hub releases destroyed owners without removing other subscribers',()=>{
  const Hub=load('src/app/service/hub.service.ts').HubService;const hub=new Hub();
  const a={},b={};let calls=0;hub.subscribe('open',()=>calls++,a);hub.subscribe('open',()=>calls++,b);
  hub.unsubscribe(a);hub.notify('open');assert.equal(calls,1);hub.unsubscribe(b);assert.equal(hub.events.length,0);
});
test('Editor reload loads a copy of the event identified by the URL',async()=>{
  const group={id:'g',events:[event('a')]};
  const m=instance(Manager,{groupService:{init:async()=>true,group},route:{snapshot:{queryParamMap:{get:k=>k==='id'?'a':null}}},getImgs:async()=>{},intl:{showError(){throw Error('unexpected error')}}});
  await m.getGroup();assert.equal(m.event.id,'a');m.event.title='unsaved';assert.equal(group.events[0].title,'a');assert.equal(m.isLoading,false);
});
test('Month navigation refreshes visible events',()=>{
  const c=instance(Calendar,{referenceDate:new Date(2026,9,27),dayEvents:[event('a')],group:{events:[event('a')]},generateCalendarMonthLabels(){}});
  c.addMonth(1);assert.equal(c.dayEvents.length,0);
});
test('Frequency filtering and clearing preserve the counting flag and legacy attendance',()=>{
  const Report=component('report/report','ReportComponent');
  const r=instance(Report,{group:{events:[event('a'),{...event('b'),frequencyFlag:false}],participants:[]},filterStartDate:'2026-10-01',filterFinalDate:'2026-10-31',intl:{translate:()=> 'Removed participant'}});
  r.applyFiltersSearch();assert.equal(r.eventsToShow.length,1);assert.equal(r.participantsToShow.length,1);
  r.filterStartDate='';r.filterFinalDate='';r.applyFiltersSearch();assert.equal(r.eventsToShow.length,1);
});
test('Dates reject impossible calendar dates and use local day values',()=>{
  const dates=load('src/app/helpers/date_time.ts');assert.equal(dates.isValidDate('2026-02-30'),false);assert.equal(dates.isValidDate('2024-02-29'),true);
  assert.match(load('src/app/interface/event.ts').createEmptyEvent().dateStr,/^\d{4}-\d{2}-\d{2}$/);
});

test('Settings stop after failed title save and always release loading state',async()=>{
  const Settings=component('settings/settings','SettingsComponent');let templates=0;
  const settings=instance(Settings,{newGroupTitle:'New',group:{name:'Old',template:{}},intl:{showError(){}},groupService:{updateGroupName:async()=>({error:'conflict'}),updateTemplate:async()=>{templates++}}});
  await settings.updateAll();assert.equal(templates,0);assert.equal(settings.group.name,'Old');assert.equal(settings.isUpdatingTitle,false);assert.equal(settings.isSavingAll,false);
});
test('Fullscreen uses browser state including external exit',async()=>{
  const Fullscreen=load('src/app/feature/fullscreen/fullscreen.component.ts').FullscreenComponent;const screen=new Fullscreen();
  assert.equal(screen.isFullScreen,false);await screen.toggleFullScreen();assert.equal(screen.isFullScreen,true);
  context.document.fullscreenElement=null;assert.equal(screen.isFullScreen,false);await screen.toggleFullScreen();await screen.toggleFullScreen();assert.equal(screen.isFullScreen,false);
});

(async()=>{for(const {name,run} of tests){await run(); console.log(`PASS ${name}`)}})().catch(e=>{console.error(e);process.exitCode=1});
