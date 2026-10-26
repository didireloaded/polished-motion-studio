import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,applyAction,actionSchema} from '../lib/model.ts';
test('likes are unique, reversible, and do not mutate prior state',()=>{const s=initialState();const a=applyAction(s,{type:'like',person:'p1',value:true});const b=applyAction(a,{type:'like',person:'p1',value:true});assert.deepEqual(s.likes,[]);assert.deepEqual(b.likes,['p1']);assert.deepEqual(applyAction(b,{type:'like',person:'p1',value:false}).likes,[])});
test('block removes likes and conversation, prevents future contact',()=>{let s=initialState();s=applyAction(s,{type:'like',person:'p2',value:true});s=applyAction(s,{type:'block',person:'p2'});assert.deepEqual(s.likes,[]);assert.equal(s.messages.p2,undefined);assert.throws(()=>applyAction(s,{type:'message',person:'p2',text:'test',id:crypto.randomUUID()}));assert.throws(()=>applyAction(s,{type:'like',person:'p2',value:true}));});
test('messages require a connection and deduplicate retries',()=>{const action={type:'message',person:'p2',text:'Coffee at the coast?',id:crypto.randomUUID()};let s=applyAction(initialState(),action);s=applyAction(s,action);assert.equal(s.messages.p2.filter(m=>m.id===action.id).length,1);assert.throws(()=>applyAction(s,{...action,person:'p1'}));});
test('server schema rejects underage, unsupported towns and empty messages',()=>{const p={...initialState().profile,name:'Test',adult:true};assert.equal(actionSchema.safeParse({type:'profile',profile:{...p,age:17}}).success,false);assert.equal(actionSchema.safeParse({type:'profile',profile:{...p,town:'London'}}).success,false);assert.equal(actionSchema.safeParse({type:'profile',profile:{...p,adult:false}}).success,false);assert.equal(actionSchema.safeParse({type:'message',person:'p2',text:' ',id:crypto.randomUUID()}).success,false);});
test('report records reason and blocks sample; reset returns clean account',()=>{const s=applyAction(initialState(),{type:'report',person:'p1',reason:'Other'});assert.equal(s.reports.length,1);assert.ok(s.blocked.includes('p1'));assert.deepEqual(applyAction(s,{type:'reset'}).reports,[]);});

test('profile intent is validated and old profiles remain compatible',()=>{
 const profile={...initialState().profile,name:'Preview Tester',adult:true};
 const legacy=actionSchema.safeParse({type:'profile',profile});
 assert.equal(legacy.success,true);
 const current=actionSchema.parse({type:'profile',profile:{...profile,intent:'Coffee & conversations'}});
 assert.equal(applyAction(initialState(),current).profile.intent,'Coffee & conversations');
 assert.equal(actionSchema.safeParse({type:'profile',profile:{...profile,intent:'Unsupported'}}).success,false);
});

test('saved profiles are private bookmarks, compatible with existing accounts',()=>{
 const legacy=initialState(); delete legacy.saved;
 const s=applyAction(legacy,actionSchema.parse({type:'save',person:'p1',value:true}));
 assert.deepEqual(s.saved,['p1']); assert.deepEqual(s.likes,[]);
 assert.deepEqual(applyAction(s,{type:'save',person:'p1',value:true}).saved,['p1']);
 assert.deepEqual(applyAction(s,{type:'save',person:'p1',value:false}).saved,[]);
 assert.equal(legacy.saved,undefined);
 assert.throws(()=>applyAction(s,{type:'save',person:'unknown',value:true}));
});
test('blocking or reporting removes bookmarks and prevents saving again',()=>{
 const s=applyAction(initialState(),{type:'save',person:'p2',value:true});
 for(const action of [{type:'block',person:'p2'},{type:'report',person:'p2',reason:'Other'}]) {
  const blocked=applyAction(s,action);
  assert.deepEqual(blocked.saved,[]);
  assert.throws(()=>applyAction(blocked,{type:'save',person:'p2',value:true}));
 }
 assert.deepEqual(applyAction(s,{type:'reset'}).saved,[]);
});
