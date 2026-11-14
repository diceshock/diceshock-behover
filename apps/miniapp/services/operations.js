const fields = `id title description storeId storeName address tableName hostName moduleName gameSystem status startsAt deadline priorityUntil durationMinutes feeCents minimum capacity remaining confirmedCount pendingCount timeHint tags registrationOpen`;
module.exports = {
  sessions: `query Sessions($filters: TrpgFilters) { trpgStores { id name } trpgSessions(filters: $filters) { items { ${fields} } hasMore } }`,
  session: `query Session($id: ID!) { trpgSession(id: $id) { ${fields} booking { id status reason } } }`,
  profile: "query Profile { trpgProfile { id nickname points balanceCents } }",
  records: `query Records($archive: Boolean, $offset: Int) { trpgMyRecords(archive: $archive, offset: $offset) { items { ${fields} booking { id status reason } } hasMore } }`,
  join: "mutation Join($id: ID!) { joinTrpgSession(id: $id) { success } }",
  withdraw:
    "mutation Withdraw($id: ID!) { withdrawTrpgRegistration(id: $id) { success } }",
};
