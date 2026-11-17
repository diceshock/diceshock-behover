/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
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

export type TrpgRewardInput = {
  active: boolean;
  cover: string;
  description: string;
  id: string | number;
  points: number;
  revision: number;
  stock: number;
  title: string;
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

export type TrpgSessionFieldsFragment = { id: string, storeId: string | null, storeName: string, address: string | null, tableId: string | null, tableName: string | null, hostName: string, title: string, description: string, moduleName: string, gameSystem: string, status: string, startsAt: string | null, deadline: string | null, priorityUntil: string | null, durationMinutes: number, sessionType: string, feeCents: number, capacity: number, minimum: number, timeHint: string, tags: Array<string>, revision: number | null, reason: string | null, confirmedCount: number, interestedCount: number, pendingCount: number, remaining: number, canReview: boolean, canEdit: boolean, registrationOpen: boolean };

export type TrpgDashboardQueryVariables = Exact<{
  filters?: TrpgFilters | null | undefined;
}>;


export type TrpgDashboardQuery = { trpgStores: Array<{ id: string, name: string, canReview: boolean }>, trpgSessions: { hasMore: boolean, items: Array<{ id: string, storeId: string | null, storeName: string, address: string | null, tableId: string | null, tableName: string | null, hostName: string, title: string, description: string, moduleName: string, gameSystem: string, status: string, startsAt: string | null, deadline: string | null, priorityUntil: string | null, durationMinutes: number, sessionType: string, feeCents: number, capacity: number, minimum: number, timeHint: string, tags: Array<string>, revision: number | null, reason: string | null, confirmedCount: number, interestedCount: number, pendingCount: number, remaining: number, canReview: boolean, canEdit: boolean, registrationOpen: boolean }> }, trpgProfile: { id: string, nickname: string, admin: boolean } };

export type TrpgResourcesQueryVariables = Exact<{
  storeId: string | number;
}>;


export type TrpgResourcesQuery = { trpgTables: Array<{ id: string, name: string, capacity: number }> };

export type TrpgManagementContextQueryVariables = Exact<{ [key: string]: never; }>;


export type TrpgManagementContextQuery = { trpgStores: Array<{ id: string, name: string, canReview: boolean }>, trpgProfile: { id: string, nickname: string, admin: boolean } };

export type TrpgDirectoryQueryVariables = Exact<{
  storeId?: string | number | null | undefined;
  search?: string | null | undefined;
  hostsOnly?: boolean | null | undefined;
  membersOnly?: boolean | null | undefined;
  offset?: number | null | undefined;
}>;


export type TrpgDirectoryQuery = { trpgDirectory: { hasMore: boolean, items: Array<{ id: string, uid: string, nickname: string, role: string, phone: string | null, points: number, balanceCents: number, storedValueMember: boolean, host: boolean, staff: boolean, disabled: boolean, timePlans: Array<{ id: string, type: string, startsAt: string, expiresAt: string | null }> }> } };

export type TrpgHostsQueryVariables = Exact<{
  storeId: string | number;
}>;


export type TrpgHostsQuery = { trpgHosts: Array<{ id: string, uid: string, nickname: string }> };

export type TrpgRosterQueryVariables = Exact<{
  id: string | number;
  offset?: number | null | undefined;
}>;


export type TrpgRosterQuery = { trpgRoster: { hasMore: boolean, items: Array<{ id: string, nickname: string, status: string, phone: string | null, reason: string | null }> } };

export type TrpgMembersQueryVariables = Exact<{
  storeId: string | number;
  search: string;
}>;


export type TrpgMembersQuery = { trpgMembers: Array<{ id: string, uid: string, nickname: string }> };

export type TrpgMemberHistoryQueryVariables = Exact<{
  storeId?: string | number | null | undefined;
  userId: string | number;
  offset?: number | null | undefined;
}>;


export type TrpgMemberHistoryQuery = { trpgMemberHistory: { hasMore: boolean, items: Array<{ id: string, storeId: string | null, storeName: string, address: string | null, tableId: string | null, tableName: string | null, hostName: string, title: string, description: string, moduleName: string, gameSystem: string, status: string, startsAt: string | null, deadline: string | null, priorityUntil: string | null, durationMinutes: number, sessionType: string, feeCents: number, capacity: number, minimum: number, timeHint: string, tags: Array<string>, revision: number | null, reason: string | null, confirmedCount: number, interestedCount: number, pendingCount: number, remaining: number, canReview: boolean, canEdit: boolean, registrationOpen: boolean }> } };

export type CreateTrpgSessionMutationVariables = Exact<{
  input: TrpgSessionInput;
}>;


export type CreateTrpgSessionMutation = { createTrpgSession: { id: string, storeId: string | null, storeName: string, address: string | null, tableId: string | null, tableName: string | null, hostName: string, title: string, description: string, moduleName: string, gameSystem: string, status: string, startsAt: string | null, deadline: string | null, priorityUntil: string | null, durationMinutes: number, sessionType: string, feeCents: number, capacity: number, minimum: number, timeHint: string, tags: Array<string>, revision: number | null, reason: string | null, confirmedCount: number, interestedCount: number, pendingCount: number, remaining: number, canReview: boolean, canEdit: boolean, registrationOpen: boolean } };

export type ResubmitTrpgSessionMutationVariables = Exact<{
  id: string | number;
  revision: number;
  input: TrpgSessionInput;
}>;


export type ResubmitTrpgSessionMutation = { resubmitTrpgSession: { success: boolean } };

export type TransitionTrpgSessionMutationVariables = Exact<{
  id: string | number;
  revision: number;
  action: string;
  reason?: string | null | undefined;
}>;


export type TransitionTrpgSessionMutation = { transitionTrpgSession: { success: boolean } };

export type ScheduleTrpgSessionMutationVariables = Exact<{
  id: string | number;
  revision: number;
  tableId: string | number;
  startsAt: string;
  deadline: string;
}>;


export type ScheduleTrpgSessionMutation = { scheduleTrpgSession: { success: boolean } };

export type ReviewTrpgRegistrationMutationVariables = Exact<{
  id: string | number;
  registrationId: string | number;
  decision: string;
  depositConfirmed?: boolean | null | undefined;
  reason?: string | null | undefined;
}>;


export type ReviewTrpgRegistrationMutation = { reviewTrpgRegistration: { success: boolean } };

export type SetTrpgAccessMutationVariables = Exact<{
  id: string | number;
  storeId: string | number;
  staff: boolean;
  host: boolean;
}>;


export type SetTrpgAccessMutation = { setTrpgAccess: { success: boolean } };

export type SetTrpgHostMutationVariables = Exact<{
  id: string | number;
  host: boolean;
}>;


export type SetTrpgHostMutation = { setTrpgHost: { success: boolean } };

export type SetTrpgMemberMutationVariables = Exact<{
  id: string | number;
  member: boolean;
}>;


export type SetTrpgMemberMutation = { setTrpgMember: { success: boolean } };

export type TrpgRewardsAdminQueryVariables = Exact<{ [key: string]: never; }>;


export type TrpgRewardsAdminQuery = { trpgProfile: { admin: boolean }, trpgStores: Array<{ id: string, name: string, canReview: boolean }>, trpgRewards: Array<{ id: string, title: string, description: string, cover: string, points: number, stock: number, active: boolean, revision: number }> };

export type TrpgMailboxAdminQueryVariables = Exact<{
  offset?: number | null | undefined;
}>;


export type TrpgMailboxAdminQuery = { trpgMail: Array<{ id: string, kind: string, message: string, reply: string | null, createdAt: string, nickname: string }> };

export type SaveTrpgRewardMutationVariables = Exact<{
  input: TrpgRewardInput;
}>;


export type SaveTrpgRewardMutation = { saveTrpgReward: { success: boolean } };

export type ConsumeTrpgVoucherMutationVariables = Exact<{
  id: string | number;
  storeId: string | number;
}>;


export type ConsumeTrpgVoucherMutation = { consumeTrpgVoucher: { success: boolean } };

export type ReplyTrpgMailMutationVariables = Exact<{
  id: string | number;
  reply: string;
}>;


export type ReplyTrpgMailMutation = { replyTrpgMail: { success: boolean } };

export const TrpgSessionFieldsFragmentDoc = gql`
    fragment TrpgSessionFields on TrpgSession {
  id
  storeId
  storeName
  address
  tableId
  tableName
  hostName
  title
  description
  moduleName
  gameSystem
  status
  startsAt
  deadline
  priorityUntil
  durationMinutes
  sessionType
  feeCents
  capacity
  minimum
  timeHint
  tags
  revision
  reason
  confirmedCount
  interestedCount
  pendingCount
  remaining
  canReview
  canEdit
  registrationOpen
}
    `;
export const TrpgDashboardDocument = gql`
    query TrpgDashboard($filters: TrpgFilters) {
  trpgStores(managed: true) {
    id
    name
    canReview
  }
  trpgSessions(filters: $filters, managed: true) {
    items {
      ...TrpgSessionFields
    }
    hasMore
  }
  trpgProfile {
    id
    nickname
    admin
  }
}
    ${TrpgSessionFieldsFragmentDoc}`;

/**
 * __useTrpgDashboardQuery__
 *
 * To run a query within a React component, call `useTrpgDashboardQuery` and pass it any options that fit your needs.
 * When your component renders, `useTrpgDashboardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTrpgDashboardQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useTrpgDashboardQuery(baseOptions?: Apollo.QueryHookOptions<TrpgDashboardQuery, TrpgDashboardQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TrpgDashboardQuery, TrpgDashboardQueryVariables>(TrpgDashboardDocument, options);
      }
export function useTrpgDashboardLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TrpgDashboardQuery, TrpgDashboardQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TrpgDashboardQuery, TrpgDashboardQueryVariables>(TrpgDashboardDocument, options);
        }
// @ts-ignore
export function useTrpgDashboardSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TrpgDashboardQuery, TrpgDashboardQueryVariables>): Apollo.UseSuspenseQueryResult<TrpgDashboardQuery, TrpgDashboardQueryVariables>;
export function useTrpgDashboardSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrpgDashboardQuery, TrpgDashboardQueryVariables>): Apollo.UseSuspenseQueryResult<TrpgDashboardQuery | undefined, TrpgDashboardQueryVariables>;
export function useTrpgDashboardSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrpgDashboardQuery, TrpgDashboardQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TrpgDashboardQuery, TrpgDashboardQueryVariables>(TrpgDashboardDocument, options);
        }
export type TrpgDashboardQueryHookResult = ReturnType<typeof useTrpgDashboardQuery>;
export type TrpgDashboardLazyQueryHookResult = ReturnType<typeof useTrpgDashboardLazyQuery>;
export type TrpgDashboardSuspenseQueryHookResult = ReturnType<typeof useTrpgDashboardSuspenseQuery>;
export type TrpgDashboardQueryResult = Apollo.QueryResult<TrpgDashboardQuery, TrpgDashboardQueryVariables>;
export const TrpgResourcesDocument = gql`
    query TrpgResources($storeId: ID!) {
  trpgTables(storeId: $storeId) {
    id
    name
    capacity
  }
}
    `;

/**
 * __useTrpgResourcesQuery__
 *
 * To run a query within a React component, call `useTrpgResourcesQuery` and pass it any options that fit your needs.
 * When your component renders, `useTrpgResourcesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTrpgResourcesQuery({
 *   variables: {
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function useTrpgResourcesQuery(baseOptions: Apollo.QueryHookOptions<TrpgResourcesQuery, TrpgResourcesQueryVariables> & ({ variables: TrpgResourcesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TrpgResourcesQuery, TrpgResourcesQueryVariables>(TrpgResourcesDocument, options);
      }
export function useTrpgResourcesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TrpgResourcesQuery, TrpgResourcesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TrpgResourcesQuery, TrpgResourcesQueryVariables>(TrpgResourcesDocument, options);
        }
// @ts-ignore
export function useTrpgResourcesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TrpgResourcesQuery, TrpgResourcesQueryVariables>): Apollo.UseSuspenseQueryResult<TrpgResourcesQuery, TrpgResourcesQueryVariables>;
export function useTrpgResourcesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrpgResourcesQuery, TrpgResourcesQueryVariables>): Apollo.UseSuspenseQueryResult<TrpgResourcesQuery | undefined, TrpgResourcesQueryVariables>;
export function useTrpgResourcesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrpgResourcesQuery, TrpgResourcesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TrpgResourcesQuery, TrpgResourcesQueryVariables>(TrpgResourcesDocument, options);
        }
export type TrpgResourcesQueryHookResult = ReturnType<typeof useTrpgResourcesQuery>;
export type TrpgResourcesLazyQueryHookResult = ReturnType<typeof useTrpgResourcesLazyQuery>;
export type TrpgResourcesSuspenseQueryHookResult = ReturnType<typeof useTrpgResourcesSuspenseQuery>;
export type TrpgResourcesQueryResult = Apollo.QueryResult<TrpgResourcesQuery, TrpgResourcesQueryVariables>;
export const TrpgManagementContextDocument = gql`
    query TrpgManagementContext {
  trpgStores(managed: true) {
    id
    name
    canReview
  }
  trpgProfile {
    id
    nickname
    admin
  }
}
    `;

/**
 * __useTrpgManagementContextQuery__
 *
 * To run a query within a React component, call `useTrpgManagementContextQuery` and pass it any options that fit your needs.
 * When your component renders, `useTrpgManagementContextQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTrpgManagementContextQuery({
 *   variables: {
 *   },
 * });
 */
export function useTrpgManagementContextQuery(baseOptions?: Apollo.QueryHookOptions<TrpgManagementContextQuery, TrpgManagementContextQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TrpgManagementContextQuery, TrpgManagementContextQueryVariables>(TrpgManagementContextDocument, options);
      }
export function useTrpgManagementContextLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TrpgManagementContextQuery, TrpgManagementContextQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TrpgManagementContextQuery, TrpgManagementContextQueryVariables>(TrpgManagementContextDocument, options);
        }
// @ts-ignore
export function useTrpgManagementContextSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TrpgManagementContextQuery, TrpgManagementContextQueryVariables>): Apollo.UseSuspenseQueryResult<TrpgManagementContextQuery, TrpgManagementContextQueryVariables>;
export function useTrpgManagementContextSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrpgManagementContextQuery, TrpgManagementContextQueryVariables>): Apollo.UseSuspenseQueryResult<TrpgManagementContextQuery | undefined, TrpgManagementContextQueryVariables>;
export function useTrpgManagementContextSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrpgManagementContextQuery, TrpgManagementContextQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TrpgManagementContextQuery, TrpgManagementContextQueryVariables>(TrpgManagementContextDocument, options);
        }
export type TrpgManagementContextQueryHookResult = ReturnType<typeof useTrpgManagementContextQuery>;
export type TrpgManagementContextLazyQueryHookResult = ReturnType<typeof useTrpgManagementContextLazyQuery>;
export type TrpgManagementContextSuspenseQueryHookResult = ReturnType<typeof useTrpgManagementContextSuspenseQuery>;
export type TrpgManagementContextQueryResult = Apollo.QueryResult<TrpgManagementContextQuery, TrpgManagementContextQueryVariables>;
export const TrpgDirectoryDocument = gql`
    query TrpgDirectory($storeId: ID, $search: String = "", $hostsOnly: Boolean = false, $membersOnly: Boolean = false, $offset: Int = 0) {
  trpgDirectory(
    storeId: $storeId
    search: $search
    hostsOnly: $hostsOnly
    membersOnly: $membersOnly
    offset: $offset
  ) {
    items {
      id
      uid
      nickname
      role
      phone
      points
      balanceCents
      storedValueMember
      timePlans {
        id
        type
        startsAt
        expiresAt
      }
      host
      staff
      disabled
    }
    hasMore
  }
}
    `;

/**
 * __useTrpgDirectoryQuery__
 *
 * To run a query within a React component, call `useTrpgDirectoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useTrpgDirectoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTrpgDirectoryQuery({
 *   variables: {
 *      storeId: // value for 'storeId'
 *      search: // value for 'search'
 *      hostsOnly: // value for 'hostsOnly'
 *      membersOnly: // value for 'membersOnly'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useTrpgDirectoryQuery(baseOptions?: Apollo.QueryHookOptions<TrpgDirectoryQuery, TrpgDirectoryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TrpgDirectoryQuery, TrpgDirectoryQueryVariables>(TrpgDirectoryDocument, options);
      }
export function useTrpgDirectoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TrpgDirectoryQuery, TrpgDirectoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TrpgDirectoryQuery, TrpgDirectoryQueryVariables>(TrpgDirectoryDocument, options);
        }
// @ts-ignore
export function useTrpgDirectorySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TrpgDirectoryQuery, TrpgDirectoryQueryVariables>): Apollo.UseSuspenseQueryResult<TrpgDirectoryQuery, TrpgDirectoryQueryVariables>;
export function useTrpgDirectorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrpgDirectoryQuery, TrpgDirectoryQueryVariables>): Apollo.UseSuspenseQueryResult<TrpgDirectoryQuery | undefined, TrpgDirectoryQueryVariables>;
export function useTrpgDirectorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrpgDirectoryQuery, TrpgDirectoryQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TrpgDirectoryQuery, TrpgDirectoryQueryVariables>(TrpgDirectoryDocument, options);
        }
export type TrpgDirectoryQueryHookResult = ReturnType<typeof useTrpgDirectoryQuery>;
export type TrpgDirectoryLazyQueryHookResult = ReturnType<typeof useTrpgDirectoryLazyQuery>;
export type TrpgDirectorySuspenseQueryHookResult = ReturnType<typeof useTrpgDirectorySuspenseQuery>;
export type TrpgDirectoryQueryResult = Apollo.QueryResult<TrpgDirectoryQuery, TrpgDirectoryQueryVariables>;
export const TrpgHostsDocument = gql`
    query TrpgHosts($storeId: ID!) {
  trpgHosts(storeId: $storeId) {
    id
    uid
    nickname
  }
}
    `;

/**
 * __useTrpgHostsQuery__
 *
 * To run a query within a React component, call `useTrpgHostsQuery` and pass it any options that fit your needs.
 * When your component renders, `useTrpgHostsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTrpgHostsQuery({
 *   variables: {
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function useTrpgHostsQuery(baseOptions: Apollo.QueryHookOptions<TrpgHostsQuery, TrpgHostsQueryVariables> & ({ variables: TrpgHostsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TrpgHostsQuery, TrpgHostsQueryVariables>(TrpgHostsDocument, options);
      }
export function useTrpgHostsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TrpgHostsQuery, TrpgHostsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TrpgHostsQuery, TrpgHostsQueryVariables>(TrpgHostsDocument, options);
        }
// @ts-ignore
export function useTrpgHostsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TrpgHostsQuery, TrpgHostsQueryVariables>): Apollo.UseSuspenseQueryResult<TrpgHostsQuery, TrpgHostsQueryVariables>;
export function useTrpgHostsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrpgHostsQuery, TrpgHostsQueryVariables>): Apollo.UseSuspenseQueryResult<TrpgHostsQuery | undefined, TrpgHostsQueryVariables>;
export function useTrpgHostsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrpgHostsQuery, TrpgHostsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TrpgHostsQuery, TrpgHostsQueryVariables>(TrpgHostsDocument, options);
        }
export type TrpgHostsQueryHookResult = ReturnType<typeof useTrpgHostsQuery>;
export type TrpgHostsLazyQueryHookResult = ReturnType<typeof useTrpgHostsLazyQuery>;
export type TrpgHostsSuspenseQueryHookResult = ReturnType<typeof useTrpgHostsSuspenseQuery>;
export type TrpgHostsQueryResult = Apollo.QueryResult<TrpgHostsQuery, TrpgHostsQueryVariables>;
export const TrpgRosterDocument = gql`
    query TrpgRoster($id: ID!, $offset: Int = 0) {
  trpgRoster(id: $id, offset: $offset) {
    items {
      id
      nickname
      status
      phone
      reason
    }
    hasMore
  }
}
    `;

/**
 * __useTrpgRosterQuery__
 *
 * To run a query within a React component, call `useTrpgRosterQuery` and pass it any options that fit your needs.
 * When your component renders, `useTrpgRosterQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTrpgRosterQuery({
 *   variables: {
 *      id: // value for 'id'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useTrpgRosterQuery(baseOptions: Apollo.QueryHookOptions<TrpgRosterQuery, TrpgRosterQueryVariables> & ({ variables: TrpgRosterQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TrpgRosterQuery, TrpgRosterQueryVariables>(TrpgRosterDocument, options);
      }
export function useTrpgRosterLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TrpgRosterQuery, TrpgRosterQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TrpgRosterQuery, TrpgRosterQueryVariables>(TrpgRosterDocument, options);
        }
// @ts-ignore
export function useTrpgRosterSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TrpgRosterQuery, TrpgRosterQueryVariables>): Apollo.UseSuspenseQueryResult<TrpgRosterQuery, TrpgRosterQueryVariables>;
export function useTrpgRosterSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrpgRosterQuery, TrpgRosterQueryVariables>): Apollo.UseSuspenseQueryResult<TrpgRosterQuery | undefined, TrpgRosterQueryVariables>;
export function useTrpgRosterSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrpgRosterQuery, TrpgRosterQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TrpgRosterQuery, TrpgRosterQueryVariables>(TrpgRosterDocument, options);
        }
export type TrpgRosterQueryHookResult = ReturnType<typeof useTrpgRosterQuery>;
export type TrpgRosterLazyQueryHookResult = ReturnType<typeof useTrpgRosterLazyQuery>;
export type TrpgRosterSuspenseQueryHookResult = ReturnType<typeof useTrpgRosterSuspenseQuery>;
export type TrpgRosterQueryResult = Apollo.QueryResult<TrpgRosterQuery, TrpgRosterQueryVariables>;
export const TrpgMembersDocument = gql`
    query TrpgMembers($storeId: ID!, $search: String!) {
  trpgMembers(storeId: $storeId, search: $search) {
    id
    uid
    nickname
  }
}
    `;

/**
 * __useTrpgMembersQuery__
 *
 * To run a query within a React component, call `useTrpgMembersQuery` and pass it any options that fit your needs.
 * When your component renders, `useTrpgMembersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTrpgMembersQuery({
 *   variables: {
 *      storeId: // value for 'storeId'
 *      search: // value for 'search'
 *   },
 * });
 */
export function useTrpgMembersQuery(baseOptions: Apollo.QueryHookOptions<TrpgMembersQuery, TrpgMembersQueryVariables> & ({ variables: TrpgMembersQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TrpgMembersQuery, TrpgMembersQueryVariables>(TrpgMembersDocument, options);
      }
export function useTrpgMembersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TrpgMembersQuery, TrpgMembersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TrpgMembersQuery, TrpgMembersQueryVariables>(TrpgMembersDocument, options);
        }
// @ts-ignore
export function useTrpgMembersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TrpgMembersQuery, TrpgMembersQueryVariables>): Apollo.UseSuspenseQueryResult<TrpgMembersQuery, TrpgMembersQueryVariables>;
export function useTrpgMembersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrpgMembersQuery, TrpgMembersQueryVariables>): Apollo.UseSuspenseQueryResult<TrpgMembersQuery | undefined, TrpgMembersQueryVariables>;
export function useTrpgMembersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrpgMembersQuery, TrpgMembersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TrpgMembersQuery, TrpgMembersQueryVariables>(TrpgMembersDocument, options);
        }
export type TrpgMembersQueryHookResult = ReturnType<typeof useTrpgMembersQuery>;
export type TrpgMembersLazyQueryHookResult = ReturnType<typeof useTrpgMembersLazyQuery>;
export type TrpgMembersSuspenseQueryHookResult = ReturnType<typeof useTrpgMembersSuspenseQuery>;
export type TrpgMembersQueryResult = Apollo.QueryResult<TrpgMembersQuery, TrpgMembersQueryVariables>;
export const TrpgMemberHistoryDocument = gql`
    query TrpgMemberHistory($storeId: ID, $userId: ID!, $offset: Int) {
  trpgMemberHistory(storeId: $storeId, userId: $userId, offset: $offset) {
    items {
      ...TrpgSessionFields
    }
    hasMore
  }
}
    ${TrpgSessionFieldsFragmentDoc}`;

/**
 * __useTrpgMemberHistoryQuery__
 *
 * To run a query within a React component, call `useTrpgMemberHistoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useTrpgMemberHistoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTrpgMemberHistoryQuery({
 *   variables: {
 *      storeId: // value for 'storeId'
 *      userId: // value for 'userId'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useTrpgMemberHistoryQuery(baseOptions: Apollo.QueryHookOptions<TrpgMemberHistoryQuery, TrpgMemberHistoryQueryVariables> & ({ variables: TrpgMemberHistoryQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TrpgMemberHistoryQuery, TrpgMemberHistoryQueryVariables>(TrpgMemberHistoryDocument, options);
      }
export function useTrpgMemberHistoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TrpgMemberHistoryQuery, TrpgMemberHistoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TrpgMemberHistoryQuery, TrpgMemberHistoryQueryVariables>(TrpgMemberHistoryDocument, options);
        }
// @ts-ignore
export function useTrpgMemberHistorySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TrpgMemberHistoryQuery, TrpgMemberHistoryQueryVariables>): Apollo.UseSuspenseQueryResult<TrpgMemberHistoryQuery, TrpgMemberHistoryQueryVariables>;
export function useTrpgMemberHistorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrpgMemberHistoryQuery, TrpgMemberHistoryQueryVariables>): Apollo.UseSuspenseQueryResult<TrpgMemberHistoryQuery | undefined, TrpgMemberHistoryQueryVariables>;
export function useTrpgMemberHistorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrpgMemberHistoryQuery, TrpgMemberHistoryQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TrpgMemberHistoryQuery, TrpgMemberHistoryQueryVariables>(TrpgMemberHistoryDocument, options);
        }
export type TrpgMemberHistoryQueryHookResult = ReturnType<typeof useTrpgMemberHistoryQuery>;
export type TrpgMemberHistoryLazyQueryHookResult = ReturnType<typeof useTrpgMemberHistoryLazyQuery>;
export type TrpgMemberHistorySuspenseQueryHookResult = ReturnType<typeof useTrpgMemberHistorySuspenseQuery>;
export type TrpgMemberHistoryQueryResult = Apollo.QueryResult<TrpgMemberHistoryQuery, TrpgMemberHistoryQueryVariables>;
export const CreateTrpgSessionDocument = gql`
    mutation CreateTrpgSession($input: TrpgSessionInput!) {
  createTrpgSession(input: $input) {
    ...TrpgSessionFields
  }
}
    ${TrpgSessionFieldsFragmentDoc}`;
export type CreateTrpgSessionMutationFn = Apollo.MutationFunction<CreateTrpgSessionMutation, CreateTrpgSessionMutationVariables>;

/**
 * __useCreateTrpgSessionMutation__
 *
 * To run a mutation, you first call `useCreateTrpgSessionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateTrpgSessionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createTrpgSessionMutation, { data, loading, error }] = useCreateTrpgSessionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateTrpgSessionMutation(baseOptions?: Apollo.MutationHookOptions<CreateTrpgSessionMutation, CreateTrpgSessionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateTrpgSessionMutation, CreateTrpgSessionMutationVariables>(CreateTrpgSessionDocument, options);
      }
export type CreateTrpgSessionMutationHookResult = ReturnType<typeof useCreateTrpgSessionMutation>;
export type CreateTrpgSessionMutationResult = Apollo.MutationResult<CreateTrpgSessionMutation>;
export type CreateTrpgSessionMutationOptions = Apollo.BaseMutationOptions<CreateTrpgSessionMutation, CreateTrpgSessionMutationVariables>;
export const ResubmitTrpgSessionDocument = gql`
    mutation ResubmitTrpgSession($id: ID!, $revision: Int!, $input: TrpgSessionInput!) {
  resubmitTrpgSession(id: $id, revision: $revision, input: $input) {
    success
  }
}
    `;
export type ResubmitTrpgSessionMutationFn = Apollo.MutationFunction<ResubmitTrpgSessionMutation, ResubmitTrpgSessionMutationVariables>;

/**
 * __useResubmitTrpgSessionMutation__
 *
 * To run a mutation, you first call `useResubmitTrpgSessionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResubmitTrpgSessionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resubmitTrpgSessionMutation, { data, loading, error }] = useResubmitTrpgSessionMutation({
 *   variables: {
 *      id: // value for 'id'
 *      revision: // value for 'revision'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useResubmitTrpgSessionMutation(baseOptions?: Apollo.MutationHookOptions<ResubmitTrpgSessionMutation, ResubmitTrpgSessionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResubmitTrpgSessionMutation, ResubmitTrpgSessionMutationVariables>(ResubmitTrpgSessionDocument, options);
      }
export type ResubmitTrpgSessionMutationHookResult = ReturnType<typeof useResubmitTrpgSessionMutation>;
export type ResubmitTrpgSessionMutationResult = Apollo.MutationResult<ResubmitTrpgSessionMutation>;
export type ResubmitTrpgSessionMutationOptions = Apollo.BaseMutationOptions<ResubmitTrpgSessionMutation, ResubmitTrpgSessionMutationVariables>;
export const TransitionTrpgSessionDocument = gql`
    mutation TransitionTrpgSession($id: ID!, $revision: Int!, $action: String!, $reason: String) {
  transitionTrpgSession(
    id: $id
    revision: $revision
    action: $action
    reason: $reason
  ) {
    success
  }
}
    `;
export type TransitionTrpgSessionMutationFn = Apollo.MutationFunction<TransitionTrpgSessionMutation, TransitionTrpgSessionMutationVariables>;

/**
 * __useTransitionTrpgSessionMutation__
 *
 * To run a mutation, you first call `useTransitionTrpgSessionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useTransitionTrpgSessionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [transitionTrpgSessionMutation, { data, loading, error }] = useTransitionTrpgSessionMutation({
 *   variables: {
 *      id: // value for 'id'
 *      revision: // value for 'revision'
 *      action: // value for 'action'
 *      reason: // value for 'reason'
 *   },
 * });
 */
export function useTransitionTrpgSessionMutation(baseOptions?: Apollo.MutationHookOptions<TransitionTrpgSessionMutation, TransitionTrpgSessionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<TransitionTrpgSessionMutation, TransitionTrpgSessionMutationVariables>(TransitionTrpgSessionDocument, options);
      }
export type TransitionTrpgSessionMutationHookResult = ReturnType<typeof useTransitionTrpgSessionMutation>;
export type TransitionTrpgSessionMutationResult = Apollo.MutationResult<TransitionTrpgSessionMutation>;
export type TransitionTrpgSessionMutationOptions = Apollo.BaseMutationOptions<TransitionTrpgSessionMutation, TransitionTrpgSessionMutationVariables>;
export const ScheduleTrpgSessionDocument = gql`
    mutation ScheduleTrpgSession($id: ID!, $revision: Int!, $tableId: ID!, $startsAt: String!, $deadline: String!) {
  scheduleTrpgSession(
    id: $id
    revision: $revision
    tableId: $tableId
    startsAt: $startsAt
    deadline: $deadline
  ) {
    success
  }
}
    `;
export type ScheduleTrpgSessionMutationFn = Apollo.MutationFunction<ScheduleTrpgSessionMutation, ScheduleTrpgSessionMutationVariables>;

/**
 * __useScheduleTrpgSessionMutation__
 *
 * To run a mutation, you first call `useScheduleTrpgSessionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useScheduleTrpgSessionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [scheduleTrpgSessionMutation, { data, loading, error }] = useScheduleTrpgSessionMutation({
 *   variables: {
 *      id: // value for 'id'
 *      revision: // value for 'revision'
 *      tableId: // value for 'tableId'
 *      startsAt: // value for 'startsAt'
 *      deadline: // value for 'deadline'
 *   },
 * });
 */
export function useScheduleTrpgSessionMutation(baseOptions?: Apollo.MutationHookOptions<ScheduleTrpgSessionMutation, ScheduleTrpgSessionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ScheduleTrpgSessionMutation, ScheduleTrpgSessionMutationVariables>(ScheduleTrpgSessionDocument, options);
      }
export type ScheduleTrpgSessionMutationHookResult = ReturnType<typeof useScheduleTrpgSessionMutation>;
export type ScheduleTrpgSessionMutationResult = Apollo.MutationResult<ScheduleTrpgSessionMutation>;
export type ScheduleTrpgSessionMutationOptions = Apollo.BaseMutationOptions<ScheduleTrpgSessionMutation, ScheduleTrpgSessionMutationVariables>;
export const ReviewTrpgRegistrationDocument = gql`
    mutation ReviewTrpgRegistration($id: ID!, $registrationId: ID!, $decision: String!, $depositConfirmed: Boolean, $reason: String) {
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
    `;
export type ReviewTrpgRegistrationMutationFn = Apollo.MutationFunction<ReviewTrpgRegistrationMutation, ReviewTrpgRegistrationMutationVariables>;

/**
 * __useReviewTrpgRegistrationMutation__
 *
 * To run a mutation, you first call `useReviewTrpgRegistrationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReviewTrpgRegistrationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [reviewTrpgRegistrationMutation, { data, loading, error }] = useReviewTrpgRegistrationMutation({
 *   variables: {
 *      id: // value for 'id'
 *      registrationId: // value for 'registrationId'
 *      decision: // value for 'decision'
 *      depositConfirmed: // value for 'depositConfirmed'
 *      reason: // value for 'reason'
 *   },
 * });
 */
export function useReviewTrpgRegistrationMutation(baseOptions?: Apollo.MutationHookOptions<ReviewTrpgRegistrationMutation, ReviewTrpgRegistrationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReviewTrpgRegistrationMutation, ReviewTrpgRegistrationMutationVariables>(ReviewTrpgRegistrationDocument, options);
      }
export type ReviewTrpgRegistrationMutationHookResult = ReturnType<typeof useReviewTrpgRegistrationMutation>;
export type ReviewTrpgRegistrationMutationResult = Apollo.MutationResult<ReviewTrpgRegistrationMutation>;
export type ReviewTrpgRegistrationMutationOptions = Apollo.BaseMutationOptions<ReviewTrpgRegistrationMutation, ReviewTrpgRegistrationMutationVariables>;
export const SetTrpgAccessDocument = gql`
    mutation SetTrpgAccess($id: ID!, $storeId: ID!, $staff: Boolean!, $host: Boolean!) {
  setTrpgAccess(id: $id, storeId: $storeId, staff: $staff, host: $host) {
    success
  }
}
    `;
export type SetTrpgAccessMutationFn = Apollo.MutationFunction<SetTrpgAccessMutation, SetTrpgAccessMutationVariables>;

/**
 * __useSetTrpgAccessMutation__
 *
 * To run a mutation, you first call `useSetTrpgAccessMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetTrpgAccessMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setTrpgAccessMutation, { data, loading, error }] = useSetTrpgAccessMutation({
 *   variables: {
 *      id: // value for 'id'
 *      storeId: // value for 'storeId'
 *      staff: // value for 'staff'
 *      host: // value for 'host'
 *   },
 * });
 */
export function useSetTrpgAccessMutation(baseOptions?: Apollo.MutationHookOptions<SetTrpgAccessMutation, SetTrpgAccessMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SetTrpgAccessMutation, SetTrpgAccessMutationVariables>(SetTrpgAccessDocument, options);
      }
export type SetTrpgAccessMutationHookResult = ReturnType<typeof useSetTrpgAccessMutation>;
export type SetTrpgAccessMutationResult = Apollo.MutationResult<SetTrpgAccessMutation>;
export type SetTrpgAccessMutationOptions = Apollo.BaseMutationOptions<SetTrpgAccessMutation, SetTrpgAccessMutationVariables>;
export const SetTrpgHostDocument = gql`
    mutation SetTrpgHost($id: ID!, $host: Boolean!) {
  setTrpgHost(id: $id, host: $host) {
    success
  }
}
    `;
export type SetTrpgHostMutationFn = Apollo.MutationFunction<SetTrpgHostMutation, SetTrpgHostMutationVariables>;

/**
 * __useSetTrpgHostMutation__
 *
 * To run a mutation, you first call `useSetTrpgHostMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetTrpgHostMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setTrpgHostMutation, { data, loading, error }] = useSetTrpgHostMutation({
 *   variables: {
 *      id: // value for 'id'
 *      host: // value for 'host'
 *   },
 * });
 */
export function useSetTrpgHostMutation(baseOptions?: Apollo.MutationHookOptions<SetTrpgHostMutation, SetTrpgHostMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SetTrpgHostMutation, SetTrpgHostMutationVariables>(SetTrpgHostDocument, options);
      }
export type SetTrpgHostMutationHookResult = ReturnType<typeof useSetTrpgHostMutation>;
export type SetTrpgHostMutationResult = Apollo.MutationResult<SetTrpgHostMutation>;
export type SetTrpgHostMutationOptions = Apollo.BaseMutationOptions<SetTrpgHostMutation, SetTrpgHostMutationVariables>;
export const SetTrpgMemberDocument = gql`
    mutation SetTrpgMember($id: ID!, $member: Boolean!) {
  setTrpgMember(id: $id, member: $member) {
    success
  }
}
    `;
export type SetTrpgMemberMutationFn = Apollo.MutationFunction<SetTrpgMemberMutation, SetTrpgMemberMutationVariables>;

/**
 * __useSetTrpgMemberMutation__
 *
 * To run a mutation, you first call `useSetTrpgMemberMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetTrpgMemberMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setTrpgMemberMutation, { data, loading, error }] = useSetTrpgMemberMutation({
 *   variables: {
 *      id: // value for 'id'
 *      member: // value for 'member'
 *   },
 * });
 */
export function useSetTrpgMemberMutation(baseOptions?: Apollo.MutationHookOptions<SetTrpgMemberMutation, SetTrpgMemberMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SetTrpgMemberMutation, SetTrpgMemberMutationVariables>(SetTrpgMemberDocument, options);
      }
export type SetTrpgMemberMutationHookResult = ReturnType<typeof useSetTrpgMemberMutation>;
export type SetTrpgMemberMutationResult = Apollo.MutationResult<SetTrpgMemberMutation>;
export type SetTrpgMemberMutationOptions = Apollo.BaseMutationOptions<SetTrpgMemberMutation, SetTrpgMemberMutationVariables>;
export const TrpgRewardsAdminDocument = gql`
    query TrpgRewardsAdmin {
  trpgProfile {
    admin
  }
  trpgStores(managed: true) {
    id
    name
    canReview
  }
  trpgRewards(managed: true) {
    id
    title
    description
    cover
    points
    stock
    active
    revision
  }
}
    `;

/**
 * __useTrpgRewardsAdminQuery__
 *
 * To run a query within a React component, call `useTrpgRewardsAdminQuery` and pass it any options that fit your needs.
 * When your component renders, `useTrpgRewardsAdminQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTrpgRewardsAdminQuery({
 *   variables: {
 *   },
 * });
 */
export function useTrpgRewardsAdminQuery(baseOptions?: Apollo.QueryHookOptions<TrpgRewardsAdminQuery, TrpgRewardsAdminQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TrpgRewardsAdminQuery, TrpgRewardsAdminQueryVariables>(TrpgRewardsAdminDocument, options);
      }
export function useTrpgRewardsAdminLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TrpgRewardsAdminQuery, TrpgRewardsAdminQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TrpgRewardsAdminQuery, TrpgRewardsAdminQueryVariables>(TrpgRewardsAdminDocument, options);
        }
// @ts-ignore
export function useTrpgRewardsAdminSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TrpgRewardsAdminQuery, TrpgRewardsAdminQueryVariables>): Apollo.UseSuspenseQueryResult<TrpgRewardsAdminQuery, TrpgRewardsAdminQueryVariables>;
export function useTrpgRewardsAdminSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrpgRewardsAdminQuery, TrpgRewardsAdminQueryVariables>): Apollo.UseSuspenseQueryResult<TrpgRewardsAdminQuery | undefined, TrpgRewardsAdminQueryVariables>;
export function useTrpgRewardsAdminSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrpgRewardsAdminQuery, TrpgRewardsAdminQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TrpgRewardsAdminQuery, TrpgRewardsAdminQueryVariables>(TrpgRewardsAdminDocument, options);
        }
export type TrpgRewardsAdminQueryHookResult = ReturnType<typeof useTrpgRewardsAdminQuery>;
export type TrpgRewardsAdminLazyQueryHookResult = ReturnType<typeof useTrpgRewardsAdminLazyQuery>;
export type TrpgRewardsAdminSuspenseQueryHookResult = ReturnType<typeof useTrpgRewardsAdminSuspenseQuery>;
export type TrpgRewardsAdminQueryResult = Apollo.QueryResult<TrpgRewardsAdminQuery, TrpgRewardsAdminQueryVariables>;
export const TrpgMailboxAdminDocument = gql`
    query TrpgMailboxAdmin($offset: Int = 0) {
  trpgMail(managed: true, offset: $offset) {
    id
    kind
    message
    reply
    createdAt
    nickname
  }
}
    `;

/**
 * __useTrpgMailboxAdminQuery__
 *
 * To run a query within a React component, call `useTrpgMailboxAdminQuery` and pass it any options that fit your needs.
 * When your component renders, `useTrpgMailboxAdminQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTrpgMailboxAdminQuery({
 *   variables: {
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useTrpgMailboxAdminQuery(baseOptions?: Apollo.QueryHookOptions<TrpgMailboxAdminQuery, TrpgMailboxAdminQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TrpgMailboxAdminQuery, TrpgMailboxAdminQueryVariables>(TrpgMailboxAdminDocument, options);
      }
export function useTrpgMailboxAdminLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TrpgMailboxAdminQuery, TrpgMailboxAdminQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TrpgMailboxAdminQuery, TrpgMailboxAdminQueryVariables>(TrpgMailboxAdminDocument, options);
        }
// @ts-ignore
export function useTrpgMailboxAdminSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TrpgMailboxAdminQuery, TrpgMailboxAdminQueryVariables>): Apollo.UseSuspenseQueryResult<TrpgMailboxAdminQuery, TrpgMailboxAdminQueryVariables>;
export function useTrpgMailboxAdminSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrpgMailboxAdminQuery, TrpgMailboxAdminQueryVariables>): Apollo.UseSuspenseQueryResult<TrpgMailboxAdminQuery | undefined, TrpgMailboxAdminQueryVariables>;
export function useTrpgMailboxAdminSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrpgMailboxAdminQuery, TrpgMailboxAdminQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TrpgMailboxAdminQuery, TrpgMailboxAdminQueryVariables>(TrpgMailboxAdminDocument, options);
        }
export type TrpgMailboxAdminQueryHookResult = ReturnType<typeof useTrpgMailboxAdminQuery>;
export type TrpgMailboxAdminLazyQueryHookResult = ReturnType<typeof useTrpgMailboxAdminLazyQuery>;
export type TrpgMailboxAdminSuspenseQueryHookResult = ReturnType<typeof useTrpgMailboxAdminSuspenseQuery>;
export type TrpgMailboxAdminQueryResult = Apollo.QueryResult<TrpgMailboxAdminQuery, TrpgMailboxAdminQueryVariables>;
export const SaveTrpgRewardDocument = gql`
    mutation SaveTrpgReward($input: TrpgRewardInput!) {
  saveTrpgReward(input: $input) {
    success
  }
}
    `;
export type SaveTrpgRewardMutationFn = Apollo.MutationFunction<SaveTrpgRewardMutation, SaveTrpgRewardMutationVariables>;

/**
 * __useSaveTrpgRewardMutation__
 *
 * To run a mutation, you first call `useSaveTrpgRewardMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSaveTrpgRewardMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [saveTrpgRewardMutation, { data, loading, error }] = useSaveTrpgRewardMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSaveTrpgRewardMutation(baseOptions?: Apollo.MutationHookOptions<SaveTrpgRewardMutation, SaveTrpgRewardMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SaveTrpgRewardMutation, SaveTrpgRewardMutationVariables>(SaveTrpgRewardDocument, options);
      }
export type SaveTrpgRewardMutationHookResult = ReturnType<typeof useSaveTrpgRewardMutation>;
export type SaveTrpgRewardMutationResult = Apollo.MutationResult<SaveTrpgRewardMutation>;
export type SaveTrpgRewardMutationOptions = Apollo.BaseMutationOptions<SaveTrpgRewardMutation, SaveTrpgRewardMutationVariables>;
export const ConsumeTrpgVoucherDocument = gql`
    mutation ConsumeTrpgVoucher($id: ID!, $storeId: ID!) {
  consumeTrpgVoucher(id: $id, storeId: $storeId) {
    success
  }
}
    `;
export type ConsumeTrpgVoucherMutationFn = Apollo.MutationFunction<ConsumeTrpgVoucherMutation, ConsumeTrpgVoucherMutationVariables>;

/**
 * __useConsumeTrpgVoucherMutation__
 *
 * To run a mutation, you first call `useConsumeTrpgVoucherMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useConsumeTrpgVoucherMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [consumeTrpgVoucherMutation, { data, loading, error }] = useConsumeTrpgVoucherMutation({
 *   variables: {
 *      id: // value for 'id'
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function useConsumeTrpgVoucherMutation(baseOptions?: Apollo.MutationHookOptions<ConsumeTrpgVoucherMutation, ConsumeTrpgVoucherMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ConsumeTrpgVoucherMutation, ConsumeTrpgVoucherMutationVariables>(ConsumeTrpgVoucherDocument, options);
      }
export type ConsumeTrpgVoucherMutationHookResult = ReturnType<typeof useConsumeTrpgVoucherMutation>;
export type ConsumeTrpgVoucherMutationResult = Apollo.MutationResult<ConsumeTrpgVoucherMutation>;
export type ConsumeTrpgVoucherMutationOptions = Apollo.BaseMutationOptions<ConsumeTrpgVoucherMutation, ConsumeTrpgVoucherMutationVariables>;
export const ReplyTrpgMailDocument = gql`
    mutation ReplyTrpgMail($id: ID!, $reply: String!) {
  replyTrpgMail(id: $id, reply: $reply) {
    success
  }
}
    `;
export type ReplyTrpgMailMutationFn = Apollo.MutationFunction<ReplyTrpgMailMutation, ReplyTrpgMailMutationVariables>;

/**
 * __useReplyTrpgMailMutation__
 *
 * To run a mutation, you first call `useReplyTrpgMailMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReplyTrpgMailMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [replyTrpgMailMutation, { data, loading, error }] = useReplyTrpgMailMutation({
 *   variables: {
 *      id: // value for 'id'
 *      reply: // value for 'reply'
 *   },
 * });
 */
export function useReplyTrpgMailMutation(baseOptions?: Apollo.MutationHookOptions<ReplyTrpgMailMutation, ReplyTrpgMailMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReplyTrpgMailMutation, ReplyTrpgMailMutationVariables>(ReplyTrpgMailDocument, options);
      }
export type ReplyTrpgMailMutationHookResult = ReturnType<typeof useReplyTrpgMailMutation>;
export type ReplyTrpgMailMutationResult = Apollo.MutationResult<ReplyTrpgMailMutation>;
export type ReplyTrpgMailMutationOptions = Apollo.BaseMutationOptions<ReplyTrpgMailMutation, ReplyTrpgMailMutationVariables>;