// Diagnostic assertions describe existing bugs, not the desired behavior.
// Run from the frontend root: node .dev-workflow/tasks/audit-2026-10-27/frontend.cjs
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
const Manager = component('calendar/event-manager/event-manager', 'EventManagerComponent');
const Presence = component('calendar/presence-dialog/presence-dialog', 'PresenceDialogComponent');
const Report = component('report/report', 'ReportComponent');
const Participants = component('manage-participants/manage-participants', 'ManageParticipantsComponent');
const Calendar = component('calendar/events-view/events-view', 'EventsViewComponent');
const Hub = load('src/app/service/hub.service.ts').HubService;
const Group = load('src/app/service/group.service.ts').GroupService;
const event = id => ({id, title:id, dateStr:'2026-10-27', presence:['p1'], frequencyFlag:true});
const instance = (Class, fields) => Object.assign(Object.create(Class.prototype), fields);
let count = 0;
async function check(name, run) { await run(); console.log(`CONFIRMED ${++count}: ${name}`); }
(async () => {
  await check('Removing presence disconnects dialog array from event; subsequent additions are also lost', () => {
    const e = event('a'); const d = instance(Presence, {presence:e.presence});
    d.manageFrequency({id:'p1'}); d.manageFrequency({id:'p2'});
    assert.equal(e.presence.join(), 'p1'); assert.equal(d.presence.join(), 'p2');
  });
  await check('Presence callback has incompatible casing', () => {
    let data;
    instance(Manager, {event:event('a'), group:{participants:[]}, hub:{notifyArgs: (_,v) => data=v.data}}).openPresenceModal();
    assert.equal(typeof data.updatePresence, 'undefined'); assert.equal(typeof data.updatepresence, 'function');
  });
  await check('Saving two new events consecutively sends only the second event', async () => {
    const writes=[];
    const m=instance(Manager, {group:{events:[]}, event:event('a'), hub:{notify(){}}, groupService:{updateEvent:async v => writes.push(structuredClone(v))}, saveImgs:async()=>{}});
    await m.saveEvent(); m.event=event('b'); await m.saveEvent();
    assert.equal(writes[0][0].id,'a'); assert.equal(writes[1].length,1); assert.equal(writes[1][0].id,'b');
  });
  await check('Successful first photo upload on new event throws and leaves spinner active', async () => {
    const m=instance(Manager,{event:event('a'), files:{nativeElement:{files:['file']}}, eventPhotoService:{uploadAsset:async()=>({id:'photo'})}});
    await assert.rejects(m.saveImgs(), /push/); assert.equal(m.isSaving,true);
  });
  await check('Repeated save uploads the same selected file again', async () => {
    let uploads=0;
    const m=instance(Manager,{event:event('a'), imgUrls:[], files:{nativeElement:{files:['file']}}, eventPhotoService:{uploadAsset:async()=>({id:String(++uploads)})}});
    await m.saveImgs(); await m.saveImgs(); assert.equal(uploads,2);
  });
  await check('Failed event save still starts photo upload', async () => {
    let uploaded=false;
    const m=instance(Manager,{event:event('a'), group:{events:[]}, hub:{notify(){}}, groupService:{updateEvent:async()=>({error:'api_unavailable'})}, saveImgs:async()=>{uploaded=true}});
    await m.saveEvent(); assert.equal(uploaded,true); assert.equal(m.isSaving,false);
  });
  await check('Participant save leaves cached roster unchanged', async () => {
    const p=instance(Participants,{group:{participants:[]}, participants:[{id:'p1'}], groupService:{updateGroupParticipants:async()=>({id:'g'})}});
    await p.saveParticipants(); assert.equal(p.group.participants.length,0); assert.equal(p.saveButtonClass,'button_disabled');
  });
  await check('Date filter includes events excluded from frequency counting', () => {
    const r=instance(Report,{group:{events:[event('a'), {...event('b'),frequencyFlag:false}]},filterStartDate:'2026-10-01',filterFinalDate:'2026-10-31'});
    r.applyFiltersSearch(); assert.equal(r.eventsToShow.length,2);
  });
  await check('Calendar month navigation leaves old day events visible', () => {
    const c=instance(Calendar,{referenceDate:new Date(2026,9,27),dayEvents:[event('a')],generateCalendarMonthLabels(){}});
    c.addMonth(1); assert.equal(c.referenceDate.getMonth(),10); assert.equal(c.dayEvents[0].dateStr,'2026-10-27');
  });
  await check('Failed delete removes event locally', async () => {
    const c=instance(Calendar,{group:{events:[event('a')]},intl:{translateWithParams:()=>''},groupService:{updateEvent:async()=>({error:'api_unavailable'})},referenceDate:new Date(2026,9,27)});
    await c.deleteEvent(event('a')); assert.equal(c.group.events.length,0);
  });
  await check('Participant with default empty role disappears during loading', async () => {
    const g=new Group(); g.getGroupInfo=async()=>({id:'g',name:'group',participants:[{id:'p',name:'P',role:''}]});
    assert.equal(await g.init(),true); assert.equal(g.group.participants.length,0);
  });
  await check('Wrong password response loses its error code', async () => {
    const result=await load('src/app/helpers/base_request.ts').login('bad'); assert.equal(result.error,'unauthorized');
  });
  await check('New session for group B reuses cached group A', async () => {
    const g=new Group(); g.group={id:'group-a',name:'A',events:[event('a')],participants:[]};
    let fetched=false; g.getGroupInfo=async()=>{fetched=true; return {id:'group-b',name:'B',participants:[]}};
    load('src/app/helpers/base_request.ts').saveSessionState('group-b');
    await g.init(); assert.equal(g.group.id,'group-a'); assert.equal(fetched,false);
  });
  await check('Editing an event without saving leaks changes into later saves of another event', async () => {
    const group={events:[event('a'),event('b')]};
    const hub=new Hub();
    const m=new Manager({init:async()=>false}, {}, {}, hub, {closeAll(){}}, {getEventPhotos:async()=>[]});
    hub.notifyArgs('EDIT_EVENT',group.events[0]); m.event.title='unsaved change';
    assert.equal(group.events[0].title,'unsaved change');
    let payload;
    const other=instance(Manager,{event:group.events[1],group,hub:{notify(){}},groupService:{updateEvent:async v=>payload=v},saveImgs:async()=>{}});
    await other.saveEvent(); assert.equal(payload[0].title,'unsaved change');
  });
  await check('Hub retains old callbacks across registrations', () => {
    const h=new Hub(); let calls=0; h.subscribe('open',()=>calls++); h.subscribe('open',()=>calls++); h.notify('open');
    assert.equal(calls,2); assert.equal(typeof h.unsubscribe,'undefined');
  });
  console.log(`${count} diagnostic checks passed (bugs reproduced). Angular rendering is not exercised.`);
})().catch(e => {console.error(e); process.exitCode=1});
