import { afterEach, beforeEach, expect, it } from 'vitest';
import { executeGraphQL, type GraphQLContext } from '@/server/apis/wechat/graphql';
import { canEnterDashboard, operator } from '@/server/services/trpg/access';
import * as documents from '../../../../miniapp/src/graphql/__generated__/operations';
import { createDatabase } from './database';
// The exact operation strings the miniapp sends, keyed by the call names below.
const op: Record<string, string> = {
 createSession: documents.CreateSessionDocument.toString(),
 join: documents.JoinDocument.toString(),
 managedSession: documents.ManagedSessionDocument.toString(),
 profile: documents.ProfileDocument.toString(),
 resubmitSession: documents.ResubmitSessionDocument.toString(),
 review: documents.ReviewDocument.toString(),
 roster: documents.RosterDocument.toString(),
 schedule: documents.ScheduleDocument.toString(),
 sessions: documents.SessionsDocument.toString(),
 transition: documents.TransitionDocument.toString(),
 workbench: documents.WorkbenchDocument.toString(),
 hostStores: documents.HostStoresDocument.toString(),
 tables: documents.TablesDocument.toString(),
};
let f: ReturnType<typeof createDatabase>;
beforeEach(()=>{f=createDatabase();});afterEach(()=>f.sqlite.close());
async function call(name:string,variables:Record<string,unknown>,id:string|null) {
 const ctx={db:f.db,userId:id,openId:'',auth:{role:id?'authenticated':'public',userId:id},role:id?'authenticated':'public',preferredStoreId:null,env:{DB:f.d1}} as GraphQLContext;
 const result = await executeGraphQL(op[name],variables,ctx);
 return { ...result, data: result.data as Record<string, unknown> | undefined };
}
function input(){return {requestId:crypto.randomUUID(),storeId:'a',tableId:null,title:'客户端发布',description:'玩家须知',moduleName:'',gameSystem:'COC',startsAt:null,deadline:null,timeHint:'周末',tags:[],capacity:6,minimum:4,durationMinutes:300,sessionType:'commercial'};}
it('grants dashboard access only to enabled admins and store managers', async()=>{
 expect(canEnterDashboard(await operator(f.db,'admin'))).toBe(true);
 expect(canEnterDashboard(await operator(f.db,'staff'))).toBe(true);
 expect(canEnterDashboard(await operator(f.db,'host'))).toBe(false);
 f.sqlite.exec("UPDATE user SET role='staff' WHERE id='outsider'");
 expect(canEnterDashboard(await operator(f.db,'outsider'))).toBe(true);
 const host=await call('profile',{},'host');expect(host.errors).toBeUndefined();
 expect(host.data?.trpgProfile).toMatchObject({canHost:true,canManage:false});
 f.sqlite.exec("UPDATE user SET disabled=1 WHERE id='staff'");
 await expect(operator(f.db,'staff')).rejects.toThrow();
});
it('runs the miniapp submit, return, edit, approve workflow with scoped permissions',async()=>{
 const i=input(); const created=await call('createSession',{input:i},'host');expect(created.errors).toBeUndefined();
 expect(created.data?.createTrpgSession).toMatchObject({id:i.requestId,status:'pending'});
 const id=i.requestId;
 const own=await call('managedSession',{id},'host');expect(own.errors).toBeUndefined();
 expect(own.data?.trpgManagedSession).toMatchObject({canReview:false,revision:1});
 expect((await call('managedSession',{id},'p1')).errors?.length).toBeGreaterThan(0);
 expect((await call('managedSession',{id},null)).errors?.length).toBeGreaterThan(0);
 expect((await call('transition',{id,revision:1,action:'approve'},'host')).errors?.length).toBeGreaterThan(0);
 f.sqlite.exec("UPDATE trpg_access SET store_id='b' WHERE user_id='staff'");
 expect((await call('managedSession',{id},'staff')).data?.trpgManagedSession).toMatchObject({canReview:true});
 f.sqlite.exec("UPDATE trpg_access SET store_id='a' WHERE user_id='staff'");
 expect((await call('transition',{id,revision:1,action:'return',reason:'补充介绍'},'staff')).errors).toBeUndefined();
 expect((await call('resubmitSession',{id,revision:2,input:{...i,description:'已补充介绍'}},'host')).errors).toBeUndefined();
 expect((await call('transition',{id,revision:3,action:'approve'},'staff')).errors).toBeUndefined();
 const publicList=await call('sessions',{},null);expect(publicList.errors).toBeUndefined();
 expect(publicList.data?.trpgSessions).toMatchObject({items:[{id,status:'published'}]});
 for(const name of ['workbench','hostStores','tables','roster']){
 const result=await call(name,{storeId:'a',id},'host');expect(result.errors,name).toBeUndefined();
 }
});
it('validates the client schedule and registration review operations',async()=>{
 const i=input();expect((await call('createSession',{input:i},'staff')).errors).toBeUndefined();
 const id=i.requestId,start=new Date(Date.now()+86400000*3).toISOString(),deadline=new Date(Date.now()+86400000*2).toISOString();
 expect((await call('schedule',{id,revision:1,tableId:'ta',startsAt:start,deadline},'staff')).errors).toBeUndefined();
 expect((await call('join',{id},'p1')).errors).toBeUndefined();
 const roster=await call('roster',{id},'staff');expect(roster.errors).toBeUndefined();
 const registrationId=(roster.data?.trpgRoster as {items:{id:string}[]}).items[0].id;
 expect((await call('review',{id,registrationId,decision:'approve',depositConfirmed:true},'host')).errors?.length).toBeGreaterThan(0);
 expect((await call('review',{id,registrationId,decision:'approve',depositConfirmed:true},'staff')).errors).toBeUndefined();
});
