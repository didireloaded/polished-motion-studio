import { z } from 'zod';
export const towns = ['Windhoek','Swakopmund','Walvis Bay','Oshakati','Otjiwarongo','Rundu'] as const;
export const interests = ['Coffee','Road trips','Live music','Hiking','Art & design','Food','Beach days','Photography','Amapiano','Camping'];
export const people = [
 {id:'p1',name:'Ndapewa',age:26,town:'Windhoek',job:'Architect & weekend explorer',photo:'ndapewa',position:'center 35%',tags:['Art & design','Coffee','Road trips'],prompt:'The way to my heart is',answer:'A good playlist, an open road, and no particular rush to get home.',bio:'Building things during the week. Finding a little space to breathe on the weekends. Usually the one stopping for a photo.',intent:'A relationship',color:'#be8d29'},
 {id:'p2',name:'Leah',age:25,town:'Swakopmund',job:'Creative with a coastal soul',photo:'leah',position:'center 35%',tags:['Beach days','Photography','Coffee'],prompt:'My perfect Sunday',answer:'A slow coffee, salty air, and a walk that turns into an entire afternoon.',bio:'Coast girl. Film photos, second-hand bookshops, and cooking for people I like. Tell me your favourite spot by the sea.',intent:'A relationship',color:'#88adba'},
 {id:'p3',name:'Amara',age:27,town:'Windhoek',job:'Designer. Occasionally a DJ.',photo:'amara',position:'center 30%',tags:['Live music','Art & design','Amapiano'],prompt:'We’ll get along if',answer:'You have a song for every mood and you’re not afraid of the dance floor.',bio:'A little city energy, a little desert quiet. Making room for someone who is curious about both.',intent:'Open to exploring',color:'#9d654f'},
 {id:'p4',name:'Johannes',age:29,town:'Windhoek',job:'Engineer, amateur braai master',photo:'johannes',position:'center 25%',tags:['Hiking','Camping','Food'],prompt:'A small hill I’ll die on',answer:'The best conversations happen around a fire. I’ll bring the wood.',bio:'Prefer early starts and the scenic route. Looking for a real connection and someone to split the last piece of garlic bread with.',intent:'A relationship',color:'#6d826b'},
 {id:'p5',name:'Selma',age:24,town:'Oshakati',job:'Teacher & a very good listener',photo:'selma',position:'center 30%',tags:['Food','Road trips','Live music'],prompt:'Something I’d love to learn',answer:'How to grow a garden that actually survives my travel plans.',bio:'Big family, small circle. Good food and honest conversations are my kind of evening.',intent:'A relationship',color:'#9e6847'},
 {id:'p6',name:'Daniel',age:28,town:'Walvis Bay',job:'Ocean air, every day',photo:'daniel',position:'center 30%',tags:['Beach days','Coffee','Photography'],prompt:'Let’s make a plan to',answer:'Watch the flamingos, find the best fish and chips, and miss the sunset by five minutes.',bio:'Marine life enthusiast. A terrible singer with excellent road trip snacks. Looking for someone who laughs easily.',intent:'Open to exploring',color:'#7a8e9a'},
 {id:'p7',name:'Tuli',age:26,town:'Otjiwarongo',job:'Conservationist & trail seeker',photo:'tuli',position:'center 30%',tags:['Hiking','Camping','Photography'],prompt:'My happy place',answer:'Somewhere with no signal, a big sky, and the kettle just starting to boil.',bio:'Working to protect the wild places I love. Usually outdoors. Always happy to talk about birds.',intent:'A relationship',color:'#8f784b'},
 {id:'p8',name:'Michael',age:30,town:'Rundu',job:'Chef, collecting little adventures',photo:'michael',position:'center 25%',tags:['Food','Road trips','Art & design'],prompt:'I’ll cook you',answer:'Something that takes all afternoon, with a story for every ingredient.',bio:'Back home after a few years away. Rediscovering all my favourite corners of Namibia.',intent:'A relationship',color:'#806e60'},
];
export type Person = typeof people[number];
export type Message = {id:string; text:string; at:number; mine:boolean};
export type State = {profile:{name:string; age:number; town:string; bio:string; tags:string[]; answer:string; adult:boolean}; likes:string[]; blocked:string[]; messages:Record<string,Message[]>; reports:{person:string;reason:string;at:number}[]; lowData:boolean; quiz:Record<string,string>; onboarded:boolean};
export function initialState():State {return {profile:{name:'',age:25,town:'Windhoek',bio:'',tags:['Coffee','Road trips'],answer:'',adult:false},likes:[],blocked:[],messages:{p2:[{id:'seed-1',text:'A coffee by the sea or a sunset road trip? I think this is an important question.',at:1793001600000,mine:false}],p4:[{id:'seed-2',text:'Tell me about the best place you’ve found in Namibia.',at:1792998000000,mine:false}]},reports:[],lowData:false,quiz:{},onboarded:false};}
export const sampleMatches=['p2','p4'];
export const actionSchema = z.discriminatedUnion('type',[
 z.object({type:z.literal('like'),person:z.string(),value:z.boolean()}),
 z.object({type:z.literal('block'),person:z.string()}),
 z.object({type:z.literal('report'),person:z.string(),reason:z.enum(['Fake profile','Inappropriate content','Harassment','Other'])}),
 z.object({type:z.literal('message'),person:z.string(),text:z.string().trim().min(1).max(2000),id:z.string().uuid()}),
 z.object({type:z.literal('profile'),profile:z.object({name:z.string().trim().min(2).max(40),age:z.number().int().min(18).max(100),town:z.enum(towns),bio:z.string().trim().max(500),tags:z.array(z.string()).max(8),answer:z.string().trim().max(200),adult:z.literal(true)})}),
 z.object({type:z.literal('lowData'),value:z.boolean()}),
 z.object({type:z.literal('quiz'),key:z.enum(['weekend','drink','music']),value:z.string().max(50)}),
 z.object({type:z.literal('reset')})
]);
export type Action=z.infer<typeof actionSchema>;
export function applyAction(state:State,action:Action):State {
 const s=structuredClone(state);
 if('person' in action && !people.some(p=>p.id===action.person))throw new Error('Profile not found.');
 if(action.type==='reset')return initialState();
 if(action.type==='profile'){if(action.profile.tags.some(t=>!interests.includes(t)))throw new Error('Unknown interest.');s.profile=action.profile;s.onboarded=true;}
 if(action.type==='like'){if(s.blocked.includes(action.person))throw new Error('This profile is blocked.');s.likes=action.value?[...new Set([...s.likes,action.person])]:s.likes.filter(id=>id!==action.person);}
 if(action.type==='block'||action.type==='report'){if(!s.blocked.includes(action.person))s.blocked.push(action.person);s.likes=s.likes.filter(id=>id!==action.person);delete s.messages[action.person];if(action.type==='report')s.reports.push({person:action.person,reason:action.reason,at:Date.now()});}
 if(action.type==='message'){if(!sampleMatches.includes(action.person)||s.blocked.includes(action.person))throw new Error('An active connection is required.');const messages=s.messages[action.person]??[];if(messages.length>=200)throw new Error('This preview conversation is full.');if(!messages.some(m=>m.id===action.id))messages.push({id:action.id,text:action.text,at:Date.now(),mine:true});s.messages[action.person]=messages;}
 if(action.type==='lowData')s.lowData=action.value;
 if(action.type==='quiz')s.quiz[action.key]=action.value;
 return s;
}
