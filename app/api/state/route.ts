import { getChatGPTUser } from '../../chatgpt-auth';
import { getDb } from '../../../db';
import { accounts } from '../../../db/schema';
import { and, eq } from 'drizzle-orm';
import { actionSchema, applyAction, initialState, type State } from '../../../lib/model';
export const dynamic='force-dynamic';
const options={headers:{'Cache-Control':'no-store'}};
async function load(userId:string){const db=getDb();await db.insert(accounts).values({userId,payload:JSON.stringify(initialState()),version:0,updatedAt:Date.now()}).onConflictDoNothing();return (await db.select().from(accounts).where(eq(accounts.userId,userId)))[0];}
export async function GET(){try{const user=await getChatGPTUser();if(!user)return Response.json({error:'Sign in to save your account.'},{status:401,...options});const row=await load(user.userId);return Response.json({state:JSON.parse(row.payload)},options);}catch(e){console.error('State read failed',e);return Response.json({error:'Your account could not be loaded. Please try again.'},{status:503,...options});}}
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return Response.json({error:'Invalid origin.'},{status:403,...options});
 const user=await getChatGPTUser();if(!user)return Response.json({error:'Please sign in again.'},{status:401,...options});
 if(Number(request.headers.get('content-length')??0)>12000)return Response.json({error:'Request too large.'},{status:413,...options});
 let parsed;try{const body=await request.text();if(body.length>12000)return Response.json({error:'Request too large.'},{status:413,...options});parsed=actionSchema.safeParse(JSON.parse(body));}catch{return Response.json({error:'Invalid request.'},{status:400,...options});}
 if(!parsed.success)return Response.json({error:'Please check your details. You must be 18 or older and choose a supported Namibian town.'},{status:400,...options});
 try{for(let i=0;i<4;i++){const row=await load(user.userId);let state:State;try{state=applyAction(JSON.parse(row.payload),parsed.data);}catch(e){return Response.json({error:e instanceof Error?e.message:'Invalid action.'},{status:400,...options});}const updated=await getDb().update(accounts).set({payload:JSON.stringify(state),version:row.version+1,updatedAt:Date.now()}).where(and(eq(accounts.userId,user.userId),eq(accounts.version,row.version))).returning({version:accounts.version});if(updated.length)return Response.json({state},options);}return Response.json({error:'Your account changed in another window. Please try again.'},{status:409,...options});}catch(e){console.error('State write failed',e);return Response.json({error:'We couldn’t save that. Please try again.'},{status:503,...options});}
}
