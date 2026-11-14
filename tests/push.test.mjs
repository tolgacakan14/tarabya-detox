import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function compile(file, imports, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => {
    if (!(name in imports)) throw new Error('Unexpected import: ' + name);
    return imports[name];
  }, console, process: { env: { VAPID_PRIVATE_KEY: 'test-only' } }, URL, Uint8Array, ...globals });
  return exports;
}
function pushFixture(records = [], deliver = async () => {}) {
  const calls = [];
  const store = {
    list: async () => records,
    add: async (...args) => calls.push(['add', ...args]),
    update: async (...args) => calls.push(['update', ...args]),
    remove: async (...args) => calls.push(['remove', ...args]),
  };
  const api = compile('src/lib/push.ts', {
    'web-push': { setVapidDetails() {}, sendNotification: async (sub) => { calls.push(['send', sub.endpoint]); await deliver(sub); } },
    './store': store, './state': {}, './dates': { today: () => '2026-11-14' },
  });
  return { api, calls };
}
const sub = (id, endpoint) => ({ id, data: { endpoint, keys: { p256dh: 'key', auth: 'auth' } } });

test('test notification targets this device, not all other phones', async () => {
  const { api, calls } = pushFixture([sub('1','https://push.test/phone-a'), sub('2','https://push.test/phone-b')]);
  assert.equal(await api.sendTo('tolga', { title:'test', body:'test' }, 'test', 'https://push.test/phone-b'), 1);
  assert.deepEqual(calls.filter(x=>x[0]==='send'), [['send','https://push.test/phone-b']]);
});
test('expired subscriptions are removed and no successful notification is recorded', async () => {
  const { api, calls } = pushFixture([sub('1','https://push.test/expired')], async () => { throw { statusCode:410 }; });
  assert.equal(await api.sendTo('tolga', { title:'test', body:'test' }, 'test'), 0);
  assert.deepEqual(calls.filter(x=>x[0]==='remove'), [['remove','tolga','1']]);
  assert.equal(calls.filter(x=>x[0]==='add').length,0);
});
test('subscription restoration updates existing row without delete/reinsert', async () => {
  const { api, calls } = pushFixture([sub('1','https://push.test/device')]);
  await api.saveSubscription('tolga', sub('1','https://push.test/device').data, 'Phone', 'https://ikimiz.duckdns.org');
  assert.equal(calls.filter(x=>x[0]==='update').length,1);
  assert.equal(calls.filter(x=>['add','remove'].includes(x[0])).length,0);
});
test('test endpoint cannot report success when push service accepts nothing', async () => {
  const api = compile('src/app/api/push/route.ts', {
    'next/server': { NextResponse: { json: (data, init) => ({ data, status:init?.status ?? 200 }) } },
    '@/lib/store': {}, '@/lib/dates': {}, '@/lib/session': { getSession:async ()=>'tolga' },
    '@/lib/push': { pushConfigured:()=>true, sendTo:async()=>0 },
  });
  const response = await api.PUT({ json:async()=>({endpoint:'https://push.test/device'}) });
  assert.equal(response.status,502);
  assert.equal(response.data.ok,false);
});
function clientFixture({ localSub = null, permission = 'granted', saveOk = true, testResult = { ok:true, sent:1 } } = {}) {
  const states = []; let cursor=0; const requests=[];
  const useState = initial => { const n=cursor++; if (!(n in states)) states[n]=initial; return [states[n],v=>{states[n]=v;}]; };
  const registration = { pushManager: { getSubscription:async()=>localSub } };
  const api = compile('src/components/Notify.tsx', {
    'react':{useState,useCallback:f=>f,useEffect(){}}, './ui':{}, 'react/jsx-runtime':{},
  }, {
    window:{PushManager:{},Notification:{},matchMedia:()=>({matches:false})},
    navigator:{userAgent:'test',serviceWorker:{getRegistration:async()=>registration}},
    Notification:{permission},
    fetch:async(_url, options={})=>{
      requests.push(options.method ?? 'GET');
      if(options.method==='POST') return {ok:saveOk};
      if(options.method==='PUT') return {ok:true,json:async()=>testResult};
      return {ok:true,json:async()=>({key:'key',configured:true,subscribed:true,partnerSubscribed:true})};
    },
  });
  return { render:()=>{cursor=0;return api.usePush();}, requests };
}
test('another subscribed phone does not make this unsubscribed browser look enabled', async () => {
  const f=clientFixture(); await f.render().reload();
  assert.equal(f.render().st.subscribed,false);
});
test('this device is restored even when the account already has another device', async () => {
  const f=clientFixture({localSub:{endpoint:'https://push.test/device',toJSON:()=>({endpoint:'https://push.test/device'})}});
  await f.render().reload();
  assert.equal(f.render().st.subscribed,true);
  assert.deepEqual(f.requests,['GET','POST']);
});
test('a failed device registration never shows enabled', async () => {
  const f=clientFixture({localSub:{toJSON:()=>({})},saveOk:false}); await f.render().reload();
  assert.equal(f.render().st,null);
  assert.match(f.render().msg,/kaydedilemedi/);
});
test('legacy HTTP-200 test failure is shown as failure, never as sent', async () => {
  const f=clientFixture({localSub:{endpoint:'https://push.test/device'},testResult:{ok:false,sent:0}});
  await f.render().test();
  assert.match(f.render().msg,/gönderilemedi/);
  assert.doesNotMatch(f.render().msg,/iletildi/);
});
