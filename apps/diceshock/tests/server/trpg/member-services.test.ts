import { afterEach,beforeEach,expect,it } from 'vitest';
import { createDatabase } from './database';
import { operator } from '@/server/services/trpg/access';
import { listStores } from '@/server/services/trpg/queries';
import * as services from '@/server/services/trpg/member-services';
import { executeGraphQL,type GraphQLContext } from '@/server/apis/wechat/graphql';
let f:ReturnType<typeof createDatabase>;
beforeEach(()=>{f=createDatabase();f.sqlite.exec("UPDATE user_info SET points=150 WHERE id IN ('p1','p2')");});
afterEach(()=>f.sqlite.close());
const reward={id:'r1',title:'Test reward',description:'Rules',cover:'',points:100,stock:1,active:true,revision:0};
async function setup(){await services.saveReward(f.db,await operator(f.db,'admin'),reward);}
it('counts public upcoming sessions against the outer store, without leaking drafts', async () => {
  f.sqlite.exec(`INSERT INTO trpg_sessions(id,store_id,host_id,title,description,module_name,game_system,status,duration_minutes,fee_cents,capacity,minimum,created_at,updated_at)
    VALUES ('public-a','a','host','Published','','','COC','published',300,0,6,4,0,0),
    ('draft-b','b','host','Draft','','','COC','pending',300,0,6,4,0,0);`);
  const stores=await listStores(f.db);
  expect(stores.find(s=>s.id==='a')?.upcoming).toBe(1);
  expect(stores.find(s=>s.id==='b')?.upcoming).toBe(0);
});
function ctx(id:string|null):GraphQLContext{return {db:f.db,userId:id,openId:'',auth:{role:id?'authenticated':'public',userId:id},role:id?'authenticated':'public',preferredStoreId:null,env:{DB:f.d1} as GraphQLContext['env']};}
it('deducts points and stock once, records the ledger, and rejects insufficient stock',async()=>{
  await setup();const p=await operator(f.db,'p1');
  const id=await services.redeem(f.db,p,'r1','request-1');
  expect(await services.redeem(f.db,p,'r1','request-1')).toBe(id);
  expect(f.sqlite.prepare("SELECT points FROM user_info WHERE id='p1'").get()?.points).toBe(50);
  expect(f.sqlite.prepare("SELECT sum(points) AS total,count(*) AS n FROM user_membership_plans WHERE user_id='p1'").get()).toMatchObject({total:-100,n:1});
  await expect(services.redeem(f.db,await operator(f.db,'p2'),'r1','request-2')).rejects.toThrow();
  expect(f.sqlite.prepare("SELECT points FROM user_info WHERE id='p2'").get()?.points).toBe(150);
});
it('rejects overspending, changing a retried request, stale catalog edits and unauthorized operators',async()=>{
  await setup();await expect(services.saveReward(f.db,await operator(f.db,'staff'),reward)).rejects.toThrow();
  const p=await operator(f.db,'p1');await services.redeem(f.db,p,'r1','same');
  await expect(services.redeem(f.db,p,'other','same')).rejects.toThrow();
  await expect(services.saveReward(f.db,await operator(f.db,'admin'),{...reward,revision:1,stock:10})).rejects.toThrow();
  await services.saveReward(f.db,await operator(f.db,'admin'),{...reward,id:'r2',stock:10});
  await expect(services.redeem(f.db,p,'r2','another')).rejects.toThrow();
});
it('consumes vouchers once and enforces store review permissions',async()=>{
  await setup();const id=await services.redeem(f.db,await operator(f.db,'p1'),'r1','one');const staff=await operator(f.db,'staff');
  await expect(services.consume(f.db,staff,id,'b')).rejects.toThrow();
  await expect(services.consume(f.db,await operator(f.db,'p1'),id,'a')).rejects.toThrow();
  await services.consume(f.db,staff,id,'a');await expect(services.consume(f.db,staff,id,'a')).rejects.toThrow();
});
it('keeps private mail isolated and restricts replies and management queries',async()=>{
  const p=await operator(f.db,'p1');await services.sendMail(f.db,p,'wish','A private wish','mail-1');await services.sendMail(f.db,p,'wish','A private wish','mail-1');
  expect(await services.mailbox(f.db,await operator(f.db,'p2'),false,0)).toHaveLength(0);
  const list=await services.mailbox(f.db,p,false,0);expect(list).toHaveLength(1);
  await expect(services.mailbox(f.db,await operator(f.db,'host'),true,0)).rejects.toThrow();
  await expect(services.replyMail(f.db,p,String(list[0].id),'reply')).rejects.toThrow();
  await services.replyMail(f.db,await operator(f.db,'staff'),String(list[0].id),'Thanks');
  expect((await services.mailbox(f.db,p,false,0))[0].reply).toBe('Thanks');
  const r=await executeGraphQL('{trpgMail(managed:true){id message}}',{},ctx('p1'));expect(r.errors?.length).toBeGreaterThan(0);
});
it('serves real GraphQL catalog and vouchers, and rejects unauthenticated redemption',async()=>{
  await setup();const query=await executeGraphQL('{trpgRewards{id points active}}',{},ctx(null));expect(query.errors).toBeUndefined();
  const mutation='mutation { redeemTrpgReward(id:"r1",requestId:"gql") }';
  expect((await executeGraphQL(mutation,{},ctx(null))).errors?.length).toBeGreaterThan(0);
  expect((await executeGraphQL(mutation,{},ctx('p1'))).errors).toBeUndefined();
  const vouchers=await executeGraphQL('{trpgVouchers{id title points createdAt usedAt}}',{},ctx('p1'));expect(vouchers.errors).toBeUndefined();
  expect((vouchers.data as {trpgVouchers:unknown[]}).trpgVouchers.length).toBe(1);
});
it('handles simultaneous duplicate attempts without double charging',async()=>{
  await setup();const p=await operator(f.db,'p1');
  const ids=await Promise.all([services.redeem(f.db,p,'r1','retry'),services.redeem(f.db,p,'r1','retry')]);
  expect(ids[0]).toBe(ids[1]);
  expect(f.sqlite.prepare("SELECT count(*) AS n FROM trpg_vouchers").get()?.n).toBe(1);
  expect(f.sqlite.prepare("SELECT points FROM user_info WHERE id='p1'").get()?.points).toBe(50);
});
it('rolls back the voucher, points and stock when the ledger write fails',async()=>{
  await setup();f.sqlite.exec("CREATE TRIGGER reject_ledger BEFORE INSERT ON user_membership_plans BEGIN SELECT RAISE(ABORT,'ledger unavailable'); END;");
  await expect(services.redeem(f.db,await operator(f.db,'p1'),'r1','failure')).rejects.toThrow();
  expect(f.sqlite.prepare("SELECT count(*) AS n FROM trpg_vouchers").get()?.n).toBe(0);
  expect(f.sqlite.prepare("SELECT points FROM user_info WHERE id='p1'").get()?.points).toBe(150);
  expect(f.sqlite.prepare("SELECT stock FROM trpg_rewards WHERE id='r1'").get()?.stock).toBe(1);
});
