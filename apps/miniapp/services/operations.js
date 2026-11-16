const fields = `id title description storeId storeName address tableName hostName moduleName gameSystem status startsAt deadline priorityUntil durationMinutes sessionType feeCents minimum capacity remaining confirmedCount pendingCount timeHint tags registrationOpen`;
const manageFields = `${fields} tableId revision reason canReview canEdit`;
module.exports = {
  schedule:
    "mutation($id:ID!,$revision:Int!,$tableId:ID!,$startsAt:String!,$deadline:String!,$storeId:ID) { scheduleTrpgSession(id:$id,revision:$revision,tableId:$tableId,startsAt:$startsAt,deadline:$deadline,storeId:$storeId) { success } }",
  workbench: `query Workbench($filters:TrpgFilters) { trpgProfile { canManage canHost } trpgStores(managed:true) { id name canReview } trpgSessions(managed:true,filters:$filters) { items { ${manageFields} } hasMore } }`,
  managedSession: `query Managed($id:ID!) { trpgManagedSession(id:$id) { ${manageFields} } }`,
  hostStores: "query { trpgStores(managed:true) { id name canReview } }",
  tables:
    "query($storeId:ID!) { trpgTables(storeId:$storeId) { id name capacity } }",
  createSession:
    "mutation($input:TrpgSessionInput!) { createTrpgSession(input:$input) { id status } }",
  resubmitSession:
    "mutation($id:ID!,$revision:Int!,$input:TrpgSessionInput!) { resubmitTrpgSession(id:$id,revision:$revision,input:$input) { success } }",
  transition:
    "mutation($id:ID!,$revision:Int!,$action:String!,$reason:String) { transitionTrpgSession(id:$id,revision:$revision,action:$action,reason:$reason) { success } }",
  roster:
    "query($id:ID!,$offset:Int) { trpgRoster(id:$id,offset:$offset) { items { id nickname status reason phone } hasMore } }",
  review:
    "mutation($id:ID!,$registrationId:ID!,$decision:String!,$depositConfirmed:Boolean,$reason:String) { reviewTrpgRegistration(id:$id,registrationId:$registrationId,decision:$decision,depositConfirmed:$depositConfirmed,reason:$reason) { success } }",

  sessions: `query Sessions($filters: TrpgFilters) { trpgStores { id name address upcoming } trpgSessions(filters: $filters) { items { ${fields} } hasMore } }`,
  stores: `query Stores { trpgStores { id name address upcoming } }`,
  rewards: `query Rewards { trpgRewards { id title description cover points stock } }`,
  vouchers: `query Vouchers($offset:Int) { trpgVouchers(offset:$offset) { id title points createdAt usedAt usedStore } }`,
  redeem: `mutation Redeem($id:ID!,$requestId:String!) { redeemTrpgReward(id:$id,requestId:$requestId) }`,
  mail: `query Mail($offset:Int) { trpgMail(offset:$offset) { id kind message reply createdAt } }`,
  sendMail: `mutation SendMail($kind:String!,$message:String!,$requestId:String!) { sendTrpgMail(kind:$kind,message:$message,requestId:$requestId) { success } }`,
  session: `query Session($id: ID!) { trpgSession(id: $id) { ${fields} booking { id status reason } } }`,
  profile:
    "query Profile { trpgProfile { id nickname points balanceCents admin canManage canHost } }",
  records: `query Records($archive: Boolean, $offset: Int) { trpgMyRecords(archive: $archive, offset: $offset) { items { ${fields} booking { id status reason } } hasMore } }`,
  join: "mutation Join($id: ID!) { joinTrpgSession(id: $id) { success } }",
  withdraw:
    "mutation Withdraw($id: ID!) { withdrawTrpgRegistration(id: $id) { success } }",
};
