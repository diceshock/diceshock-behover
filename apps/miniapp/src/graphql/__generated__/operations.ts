/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
export type TrpgFilters = {
  available?: boolean | null | undefined;
  date?: string | null | undefined;
  dateFrom?: string | null | undefined;
  dateTo?: string | null | undefined;
  hostId?: string | number | null | undefined;
  offset?: number | null | undefined;
  rule?: string | null | undefined;
  status?: string | null | undefined;
  storeId?: string | number | null | undefined;
  tag?: string | null | undefined;
  unscheduled?: boolean | null | undefined;
};

export type TrpgSessionInput = {
  capacity: number;
  deadline?: string | null | undefined;
  description: string;
  durationMinutes: number;
  feeCents?: number | null | undefined;
  gameSystem: string;
  hostId?: string | number | null | undefined;
  minimum: number;
  moduleName: string;
  requestId: string | number;
  sessionType?: string | null | undefined;
  startsAt?: string | null | undefined;
  storeId?: string | number | null | undefined;
  tableId?: string | number | null | undefined;
  tags?: Array<string> | null | undefined;
  timeHint?: string | null | undefined;
  title: string;
};

export type SessionFieldsFragment = { id: string, title: string, description: string, storeId: string | null, storeName: string, address: string | null, tableName: string | null, hostName: string, moduleName: string, gameSystem: string, status: string, startsAt: string | null, deadline: string | null, priorityUntil: string | null, durationMinutes: number, sessionType: string, feeCents: number, minimum: number, capacity: number, remaining: number, confirmedCount: number, pendingCount: number, timeHint: string, tags: Array<string>, registrationOpen: boolean };

export type ManagedSessionFieldsFragment = { tableId: string | null, revision: number | null, reason: string | null, canReview: boolean, canEdit: boolean, id: string, title: string, description: string, storeId: string | null, storeName: string, address: string | null, tableName: string | null, hostName: string, moduleName: string, gameSystem: string, status: string, startsAt: string | null, deadline: string | null, priorityUntil: string | null, durationMinutes: number, sessionType: string, feeCents: number, minimum: number, capacity: number, remaining: number, confirmedCount: number, pendingCount: number, timeHint: string, tags: Array<string>, registrationOpen: boolean };

export type BookingFieldsFragment = { booking: { id: string, status: string, reason: string | null } | null };

export type SessionsQueryVariables = Exact<{
  filters?: TrpgFilters | null | undefined;
}>;


export type SessionsQuery = { trpgStores: Array<{ id: string, name: string, address: string | null, upcoming: number }>, trpgSessions: { hasMore: boolean, items: Array<{ id: string, title: string, description: string, storeId: string | null, storeName: string, address: string | null, tableName: string | null, hostName: string, moduleName: string, gameSystem: string, status: string, startsAt: string | null, deadline: string | null, priorityUntil: string | null, durationMinutes: number, sessionType: string, feeCents: number, minimum: number, capacity: number, remaining: number, confirmedCount: number, pendingCount: number, timeHint: string, tags: Array<string>, registrationOpen: boolean }> } };

export type StoresQueryVariables = Exact<{ [key: string]: never; }>;


export type StoresQuery = { trpgStores: Array<{ id: string, name: string, address: string | null, upcoming: number }> };

export type SessionQueryVariables = Exact<{
  id: string | number;
}>;


export type SessionQuery = { trpgSession: { id: string, title: string, description: string, storeId: string | null, storeName: string, address: string | null, tableName: string | null, hostName: string, moduleName: string, gameSystem: string, status: string, startsAt: string | null, deadline: string | null, priorityUntil: string | null, durationMinutes: number, sessionType: string, feeCents: number, minimum: number, capacity: number, remaining: number, confirmedCount: number, pendingCount: number, timeHint: string, tags: Array<string>, registrationOpen: boolean, booking: { id: string, status: string, reason: string | null } | null } };

export type ProfileQueryVariables = Exact<{ [key: string]: never; }>;


export type ProfileQuery = { trpgProfile: { id: string, nickname: string, points: number, balanceCents: number, admin: boolean, canManage: boolean, canHost: boolean } };

export type RecordsQueryVariables = Exact<{
  archive?: boolean | null | undefined;
  offset?: number | null | undefined;
}>;


export type RecordsQuery = { trpgMyRecords: { hasMore: boolean, items: Array<{ id: string, title: string, description: string, storeId: string | null, storeName: string, address: string | null, tableName: string | null, hostName: string, moduleName: string, gameSystem: string, status: string, startsAt: string | null, deadline: string | null, priorityUntil: string | null, durationMinutes: number, sessionType: string, feeCents: number, minimum: number, capacity: number, remaining: number, confirmedCount: number, pendingCount: number, timeHint: string, tags: Array<string>, registrationOpen: boolean, booking: { id: string, status: string, reason: string | null } | null }> } };

export type JoinMutationVariables = Exact<{
  id: string | number;
}>;


export type JoinMutation = { joinTrpgSession: { success: boolean } };

export type WithdrawMutationVariables = Exact<{
  id: string | number;
}>;


export type WithdrawMutation = { withdrawTrpgRegistration: { success: boolean } };

export type RewardsQueryVariables = Exact<{ [key: string]: never; }>;


export type RewardsQuery = { trpgRewards: Array<{ id: string, title: string, description: string, cover: string, points: number, stock: number }> };

export type VouchersQueryVariables = Exact<{
  offset?: number | null | undefined;
}>;


export type VouchersQuery = { trpgVouchers: Array<{ id: string, title: string, points: number, createdAt: string, usedAt: string | null, usedStore: string | null }> };

export type RedeemMutationVariables = Exact<{
  id: string | number;
  requestId: string;
}>;


export type RedeemMutation = { redeemTrpgReward: string };

export type MailQueryVariables = Exact<{
  offset?: number | null | undefined;
}>;


export type MailQuery = { trpgMail: Array<{ id: string, kind: string, message: string, reply: string | null, createdAt: string }> };

export type SendMailMutationVariables = Exact<{
  kind: string;
  message: string;
  requestId: string;
}>;


export type SendMailMutation = { sendTrpgMail: { success: boolean } };

export type WorkbenchQueryVariables = Exact<{
  filters?: TrpgFilters | null | undefined;
}>;


export type WorkbenchQuery = { trpgProfile: { canManage: boolean, canHost: boolean }, trpgStores: Array<{ id: string, name: string, canReview: boolean }>, trpgSessions: { hasMore: boolean, items: Array<{ tableId: string | null, revision: number | null, reason: string | null, canReview: boolean, canEdit: boolean, id: string, title: string, description: string, storeId: string | null, storeName: string, address: string | null, tableName: string | null, hostName: string, moduleName: string, gameSystem: string, status: string, startsAt: string | null, deadline: string | null, priorityUntil: string | null, durationMinutes: number, sessionType: string, feeCents: number, minimum: number, capacity: number, remaining: number, confirmedCount: number, pendingCount: number, timeHint: string, tags: Array<string>, registrationOpen: boolean }> } };

export type ManagedSessionQueryVariables = Exact<{
  id: string | number;
}>;


export type ManagedSessionQuery = { trpgManagedSession: { tableId: string | null, revision: number | null, reason: string | null, canReview: boolean, canEdit: boolean, id: string, title: string, description: string, storeId: string | null, storeName: string, address: string | null, tableName: string | null, hostName: string, moduleName: string, gameSystem: string, status: string, startsAt: string | null, deadline: string | null, priorityUntil: string | null, durationMinutes: number, sessionType: string, feeCents: number, minimum: number, capacity: number, remaining: number, confirmedCount: number, pendingCount: number, timeHint: string, tags: Array<string>, registrationOpen: boolean } };

export type HostStoresQueryVariables = Exact<{ [key: string]: never; }>;


export type HostStoresQuery = { trpgStores: Array<{ id: string, name: string, canReview: boolean }> };

export type TablesQueryVariables = Exact<{
  storeId: string | number;
}>;


export type TablesQuery = { trpgTables: Array<{ id: string, name: string, capacity: number }> };

export type CreateSessionMutationVariables = Exact<{
  input: TrpgSessionInput;
}>;


export type CreateSessionMutation = { createTrpgSession: { id: string, status: string } };

export type ResubmitSessionMutationVariables = Exact<{
  id: string | number;
  revision: number;
  input: TrpgSessionInput;
}>;


export type ResubmitSessionMutation = { resubmitTrpgSession: { success: boolean } };

export type TransitionMutationVariables = Exact<{
  id: string | number;
  revision: number;
  action: string;
  reason?: string | null | undefined;
}>;


export type TransitionMutation = { transitionTrpgSession: { success: boolean } };

export type ScheduleMutationVariables = Exact<{
  id: string | number;
  revision: number;
  tableId: string | number;
  startsAt: string;
  deadline: string;
  storeId?: string | number | null | undefined;
}>;


export type ScheduleMutation = { scheduleTrpgSession: { success: boolean } };

export type RosterQueryVariables = Exact<{
  id: string | number;
  offset?: number | null | undefined;
}>;


export type RosterQuery = { trpgRoster: { hasMore: boolean, items: Array<{ id: string, nickname: string, status: string, reason: string | null, phone: string | null }> } };

export type ReviewMutationVariables = Exact<{
  id: string | number;
  registrationId: string | number;
  decision: string;
  depositConfirmed?: boolean | null | undefined;
  reason?: string | null | undefined;
}>;


export type ReviewMutation = { reviewTrpgRegistration: { success: boolean } };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}
export const SessionFieldsFragmentDoc = new TypedDocumentString(`
    fragment SessionFields on TrpgSession {
  id
  title
  description
  storeId
  storeName
  address
  tableName
  hostName
  moduleName
  gameSystem
  status
  startsAt
  deadline
  priorityUntil
  durationMinutes
  sessionType
  feeCents
  minimum
  capacity
  remaining
  confirmedCount
  pendingCount
  timeHint
  tags
  registrationOpen
}
    `, {"fragmentName":"SessionFields"}) as unknown as TypedDocumentString<SessionFieldsFragment, unknown>;
export const ManagedSessionFieldsFragmentDoc = new TypedDocumentString(`
    fragment ManagedSessionFields on TrpgSession {
  ...SessionFields
  tableId
  revision
  reason
  canReview
  canEdit
}
    fragment SessionFields on TrpgSession {
  id
  title
  description
  storeId
  storeName
  address
  tableName
  hostName
  moduleName
  gameSystem
  status
  startsAt
  deadline
  priorityUntil
  durationMinutes
  sessionType
  feeCents
  minimum
  capacity
  remaining
  confirmedCount
  pendingCount
  timeHint
  tags
  registrationOpen
}`, {"fragmentName":"ManagedSessionFields"}) as unknown as TypedDocumentString<ManagedSessionFieldsFragment, unknown>;
export const BookingFieldsFragmentDoc = new TypedDocumentString(`
    fragment BookingFields on TrpgSession {
  booking {
    id
    status
    reason
  }
}
    `, {"fragmentName":"BookingFields"}) as unknown as TypedDocumentString<BookingFieldsFragment, unknown>;
export const SessionsDocument = new TypedDocumentString(`
    query Sessions($filters: TrpgFilters) {
  trpgStores {
    id
    name
    address
    upcoming
  }
  trpgSessions(filters: $filters) {
    items {
      ...SessionFields
    }
    hasMore
  }
}
    fragment SessionFields on TrpgSession {
  id
  title
  description
  storeId
  storeName
  address
  tableName
  hostName
  moduleName
  gameSystem
  status
  startsAt
  deadline
  priorityUntil
  durationMinutes
  sessionType
  feeCents
  minimum
  capacity
  remaining
  confirmedCount
  pendingCount
  timeHint
  tags
  registrationOpen
}`) as unknown as TypedDocumentString<SessionsQuery, SessionsQueryVariables>;
export const StoresDocument = new TypedDocumentString(`
    query Stores {
  trpgStores {
    id
    name
    address
    upcoming
  }
}
    `) as unknown as TypedDocumentString<StoresQuery, StoresQueryVariables>;
export const SessionDocument = new TypedDocumentString(`
    query Session($id: ID!) {
  trpgSession(id: $id) {
    ...SessionFields
    ...BookingFields
  }
}
    fragment SessionFields on TrpgSession {
  id
  title
  description
  storeId
  storeName
  address
  tableName
  hostName
  moduleName
  gameSystem
  status
  startsAt
  deadline
  priorityUntil
  durationMinutes
  sessionType
  feeCents
  minimum
  capacity
  remaining
  confirmedCount
  pendingCount
  timeHint
  tags
  registrationOpen
}
fragment BookingFields on TrpgSession {
  booking {
    id
    status
    reason
  }
}`) as unknown as TypedDocumentString<SessionQuery, SessionQueryVariables>;
export const ProfileDocument = new TypedDocumentString(`
    query Profile {
  trpgProfile {
    id
    nickname
    points
    balanceCents
    admin
    canManage
    canHost
  }
}
    `) as unknown as TypedDocumentString<ProfileQuery, ProfileQueryVariables>;
export const RecordsDocument = new TypedDocumentString(`
    query Records($archive: Boolean, $offset: Int) {
  trpgMyRecords(archive: $archive, offset: $offset) {
    items {
      ...SessionFields
      ...BookingFields
    }
    hasMore
  }
}
    fragment SessionFields on TrpgSession {
  id
  title
  description
  storeId
  storeName
  address
  tableName
  hostName
  moduleName
  gameSystem
  status
  startsAt
  deadline
  priorityUntil
  durationMinutes
  sessionType
  feeCents
  minimum
  capacity
  remaining
  confirmedCount
  pendingCount
  timeHint
  tags
  registrationOpen
}
fragment BookingFields on TrpgSession {
  booking {
    id
    status
    reason
  }
}`) as unknown as TypedDocumentString<RecordsQuery, RecordsQueryVariables>;
export const JoinDocument = new TypedDocumentString(`
    mutation Join($id: ID!) {
  joinTrpgSession(id: $id) {
    success
  }
}
    `) as unknown as TypedDocumentString<JoinMutation, JoinMutationVariables>;
export const WithdrawDocument = new TypedDocumentString(`
    mutation Withdraw($id: ID!) {
  withdrawTrpgRegistration(id: $id) {
    success
  }
}
    `) as unknown as TypedDocumentString<WithdrawMutation, WithdrawMutationVariables>;
export const RewardsDocument = new TypedDocumentString(`
    query Rewards {
  trpgRewards {
    id
    title
    description
    cover
    points
    stock
  }
}
    `) as unknown as TypedDocumentString<RewardsQuery, RewardsQueryVariables>;
export const VouchersDocument = new TypedDocumentString(`
    query Vouchers($offset: Int) {
  trpgVouchers(offset: $offset) {
    id
    title
    points
    createdAt
    usedAt
    usedStore
  }
}
    `) as unknown as TypedDocumentString<VouchersQuery, VouchersQueryVariables>;
export const RedeemDocument = new TypedDocumentString(`
    mutation Redeem($id: ID!, $requestId: String!) {
  redeemTrpgReward(id: $id, requestId: $requestId)
}
    `) as unknown as TypedDocumentString<RedeemMutation, RedeemMutationVariables>;
export const MailDocument = new TypedDocumentString(`
    query Mail($offset: Int) {
  trpgMail(offset: $offset) {
    id
    kind
    message
    reply
    createdAt
  }
}
    `) as unknown as TypedDocumentString<MailQuery, MailQueryVariables>;
export const SendMailDocument = new TypedDocumentString(`
    mutation SendMail($kind: String!, $message: String!, $requestId: String!) {
  sendTrpgMail(kind: $kind, message: $message, requestId: $requestId) {
    success
  }
}
    `) as unknown as TypedDocumentString<SendMailMutation, SendMailMutationVariables>;
export const WorkbenchDocument = new TypedDocumentString(`
    query Workbench($filters: TrpgFilters) {
  trpgProfile {
    canManage
    canHost
  }
  trpgStores(managed: true) {
    id
    name
    canReview
  }
  trpgSessions(managed: true, filters: $filters) {
    items {
      ...ManagedSessionFields
    }
    hasMore
  }
}
    fragment SessionFields on TrpgSession {
  id
  title
  description
  storeId
  storeName
  address
  tableName
  hostName
  moduleName
  gameSystem
  status
  startsAt
  deadline
  priorityUntil
  durationMinutes
  sessionType
  feeCents
  minimum
  capacity
  remaining
  confirmedCount
  pendingCount
  timeHint
  tags
  registrationOpen
}
fragment ManagedSessionFields on TrpgSession {
  ...SessionFields
  tableId
  revision
  reason
  canReview
  canEdit
}`) as unknown as TypedDocumentString<WorkbenchQuery, WorkbenchQueryVariables>;
export const ManagedSessionDocument = new TypedDocumentString(`
    query ManagedSession($id: ID!) {
  trpgManagedSession(id: $id) {
    ...ManagedSessionFields
  }
}
    fragment SessionFields on TrpgSession {
  id
  title
  description
  storeId
  storeName
  address
  tableName
  hostName
  moduleName
  gameSystem
  status
  startsAt
  deadline
  priorityUntil
  durationMinutes
  sessionType
  feeCents
  minimum
  capacity
  remaining
  confirmedCount
  pendingCount
  timeHint
  tags
  registrationOpen
}
fragment ManagedSessionFields on TrpgSession {
  ...SessionFields
  tableId
  revision
  reason
  canReview
  canEdit
}`) as unknown as TypedDocumentString<ManagedSessionQuery, ManagedSessionQueryVariables>;
export const HostStoresDocument = new TypedDocumentString(`
    query HostStores {
  trpgStores(managed: true) {
    id
    name
    canReview
  }
}
    `) as unknown as TypedDocumentString<HostStoresQuery, HostStoresQueryVariables>;
export const TablesDocument = new TypedDocumentString(`
    query Tables($storeId: ID!) {
  trpgTables(storeId: $storeId) {
    id
    name
    capacity
  }
}
    `) as unknown as TypedDocumentString<TablesQuery, TablesQueryVariables>;
export const CreateSessionDocument = new TypedDocumentString(`
    mutation CreateSession($input: TrpgSessionInput!) {
  createTrpgSession(input: $input) {
    id
    status
  }
}
    `) as unknown as TypedDocumentString<CreateSessionMutation, CreateSessionMutationVariables>;
export const ResubmitSessionDocument = new TypedDocumentString(`
    mutation ResubmitSession($id: ID!, $revision: Int!, $input: TrpgSessionInput!) {
  resubmitTrpgSession(id: $id, revision: $revision, input: $input) {
    success
  }
}
    `) as unknown as TypedDocumentString<ResubmitSessionMutation, ResubmitSessionMutationVariables>;
export const TransitionDocument = new TypedDocumentString(`
    mutation Transition($id: ID!, $revision: Int!, $action: String!, $reason: String) {
  transitionTrpgSession(
    id: $id
    revision: $revision
    action: $action
    reason: $reason
  ) {
    success
  }
}
    `) as unknown as TypedDocumentString<TransitionMutation, TransitionMutationVariables>;
export const ScheduleDocument = new TypedDocumentString(`
    mutation Schedule($id: ID!, $revision: Int!, $tableId: ID!, $startsAt: String!, $deadline: String!, $storeId: ID) {
  scheduleTrpgSession(
    id: $id
    revision: $revision
    tableId: $tableId
    startsAt: $startsAt
    deadline: $deadline
    storeId: $storeId
  ) {
    success
  }
}
    `) as unknown as TypedDocumentString<ScheduleMutation, ScheduleMutationVariables>;
export const RosterDocument = new TypedDocumentString(`
    query Roster($id: ID!, $offset: Int) {
  trpgRoster(id: $id, offset: $offset) {
    items {
      id
      nickname
      status
      reason
      phone
    }
    hasMore
  }
}
    `) as unknown as TypedDocumentString<RosterQuery, RosterQueryVariables>;
export const ReviewDocument = new TypedDocumentString(`
    mutation Review($id: ID!, $registrationId: ID!, $decision: String!, $depositConfirmed: Boolean, $reason: String) {
  reviewTrpgRegistration(
    id: $id
    registrationId: $registrationId
    decision: $decision
    depositConfirmed: $depositConfirmed
    reason: $reason
  ) {
    success
  }
}
    `) as unknown as TypedDocumentString<ReviewMutation, ReviewMutationVariables>;