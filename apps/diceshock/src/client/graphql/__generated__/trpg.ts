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
  offset?: number | null | undefined;
  rule?: string | null | undefined;
  storeId?: string | number | null | undefined;
  tag?: string | null | undefined;
};

export type TrpgSessionInput = {
  capacity: number;
  deadline?: string | null | undefined;
  description: string;
  durationMinutes: number;
  feeCents: number;
  gameSystem: string;
  hostId?: string | number | null | undefined;
  minimum: number;
  moduleName: string;
  requestId: string | number;
  startsAt?: string | null | undefined;
  storeId: string | number;
  tableId?: string | number | null | undefined;
  tags?: Array<string> | null | undefined;
  timeHint?: string | null | undefined;
  title: string;
};

export type TrpgSessionFieldsFragment = { id: string, storeId: string, storeName: string, address: string | null, tableId: string | null, tableName: string | null, hostName: string, title: string, description: string, moduleName: string, gameSystem: string, status: string, startsAt: string | null, deadline: string | null, priorityUntil: string | null, durationMinutes: number, feeCents: number, capacity: number, minimum: number, timeHint: string, tags: Array<string>, revision: number | null, reason: string | null, confirmedCount: number, interestedCount: number, pendingCount: number, remaining: number, canReview: boolean, canEdit: boolean, registrationOpen: boolean };

export type TrpgDashboardQueryVariables = Exact<{
  filters?: TrpgFilters | null | undefined;
}>;


export type TrpgDashboardQuery = { trpgStores: Array<{ id: string, name: string, canReview: boolean }>, trpgSessions: { hasMore: boolean, items: Array<{ id: string, storeId: string, storeName: string, address: string | null, tableId: string | null, tableName: string | null, hostName: string, title: string, description: string, moduleName: string, gameSystem: string, status: string, startsAt: string | null, deadline: string | null, priorityUntil: string | null, durationMinutes: number, feeCents: number, capacity: number, minimum: number, timeHint: string, tags: Array<string>, revision: number | null, reason: string | null, confirmedCount: number, interestedCount: number, pendingCount: number, remaining: number, canReview: boolean, canEdit: boolean, registrationOpen: boolean }> }, trpgProfile: { id: string, nickname: string, admin: boolean } };

export type TrpgResourcesQueryVariables = Exact<{
  storeId: string | number;
}>;


export type TrpgResourcesQuery = { trpgTables: Array<{ id: string, name: string, capacity: number }> };

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
  storeId: string | number;
  userId: string | number;
  offset?: number | null | undefined;
}>;


export type TrpgMemberHistoryQuery = { trpgMemberHistory: { hasMore: boolean, items: Array<{ id: string, storeId: string, storeName: string, address: string | null, tableId: string | null, tableName: string | null, hostName: string, title: string, description: string, moduleName: string, gameSystem: string, status: string, startsAt: string | null, deadline: string | null, priorityUntil: string | null, durationMinutes: number, feeCents: number, capacity: number, minimum: number, timeHint: string, tags: Array<string>, revision: number | null, reason: string | null, confirmedCount: number, interestedCount: number, pendingCount: number, remaining: number, canReview: boolean, canEdit: boolean, registrationOpen: boolean }> } };

export type CreateTrpgSessionMutationVariables = Exact<{
  input: TrpgSessionInput;
}>;


export type CreateTrpgSessionMutation = { createTrpgSession: { id: string, storeId: string, storeName: string, address: string | null, tableId: string | null, tableName: string | null, hostName: string, title: string, description: string, moduleName: string, gameSystem: string, status: string, startsAt: string | null, deadline: string | null, priorityUntil: string | null, durationMinutes: number, feeCents: number, capacity: number, minimum: number, timeHint: string, tags: Array<string>, revision: number | null, reason: string | null, confirmedCount: number, interestedCount: number, pendingCount: number, remaining: number, canReview: boolean, canEdit: boolean, registrationOpen: boolean } };

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
    query TrpgMemberHistory($storeId: ID!, $userId: ID!, $offset: Int) {
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