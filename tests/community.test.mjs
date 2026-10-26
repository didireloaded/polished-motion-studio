import test from 'node:test';
import assert from 'node:assert/strict';
import {communityActionSchema,validatePostAction,isConversationParticipant,publicPost} from '../lib/community.ts';

test('public posts never expose the author account identifier',()=>{
 const post={id:crypto.randomUUID(),authorId:'private-owner-id',town:'Windhoek',kind:'thought',body:'Coffee after work?',eventTitle:null,eventAt:null,eventPlace:null,createdAt:10};
 assert.equal('authorId' in publicPost(post,'reader',false),false);
 assert.deepEqual(publicPost(post,'private-owner-id',false).own,true);
});
test('event invitations require a real future date and place',()=>{
 const now=Date.now(), a={type:'post',id:crypto.randomUUID(),kind:'event',town:'Windhoek',body:'Who wants to go with me?',eventTitle:'Live music',eventPlace:'City venue',eventAt:now+86400000};
 assert.equal(communityActionSchema.safeParse(a).success,true);
 assert.equal(validatePostAction(a,now),null);
 assert.ok(validatePostAction({...a,eventAt:now-1},now));
 assert.ok(validatePostAction({...a,eventPlace:''},now));
 assert.equal(communityActionSchema.safeParse({...a,town:'London'}).success,false);
});
test('only poster and responder can read an accepted conversation',()=>{
 assert.equal(isConversationParticipant('poster','poster','responder',null),false);
 assert.equal(isConversationParticipant('poster','poster','responder',10),true);
 assert.equal(isConversationParticipant('responder','poster','responder',10),true);
 assert.equal(isConversationParticipant('stranger','poster','responder',10),false);
});
