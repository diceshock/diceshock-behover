/* eslint-disable */
// @ts-nocheck
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import * as Types from './schema';

import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
const defaultOptions = {} as const;
export type ActiveDateRange =
  | 'MONTH'
  | 'TODAY'
  | 'WEEK'
  | 'YEAR';

export type ActiveFilterInput = {
  creator?: string | null | undefined;
  dateFrom?: string | null | undefined;
  dateTo?: string | null | undefined;
  pagination?: CursorPaginationInput | null | undefined;
  search?: string | null | undefined;
  sortBy?: string | null | undefined;
  sortOrder?: SortOrder | null | undefined;
  status?: Array<string> | null | undefined;
  store?: string | null | undefined;
  type?: string | null | undefined;
};

export type ActiveListInput = {
  dateRange?: ActiveDateRange | null | undefined;
  pagination?: CursorPaginationInput | null | undefined;
  showExpired?: boolean | null | undefined;
  storeId?: string | number | null | undefined;
};

export type AddOccupancyInput = {
  tableId: string | number;
  userId: string | number;
};

export type AddPointsInput = {
  amount: number;
  note?: string | null | undefined;
  userId: string | number;
};

export type AddWechatTemplateFromLibraryInput = {
  keywordNameList?: Array<string> | null | undefined;
  slot: WechatTemplateSlotKey;
  templateIdShort: string;
};

export type ArticleType =
  | 'ACTIVE'
  | 'EVENT';

export type BatchSettleInput = {
  deductFromStoredValue?: boolean | null | undefined;
  ids: Array<string | number>;
  note?: string | null | undefined;
};

export type BoardGameFilterInput = {
  isBestNumOfPlayers?: boolean | null | undefined;
  numOfPlayers?: number | null | undefined;
  pagination?: PaginationInput | null | undefined;
  searchWords?: string | null | undefined;
  tags?: Array<string> | null | undefined;
};

export type CreateActiveInput = {
  boardGameId?: string | number | null | undefined;
  content?: string | null | undefined;
  date: string;
  isGame?: boolean | null | undefined;
  maxPlayers: number;
  storeId?: string | number | null | undefined;
  time?: string | null | undefined;
  title: string;
};

export type CreateMembershipPlanInput = {
  amount?: number | null | undefined;
  endDate?: string | null | undefined;
  planType: MembershipPlanType;
  startDate: string;
  userId: string | number;
};

export type CreateTableInput = {
  capacity?: number | null | undefined;
  description?: string | null | undefined;
  name: string;
  scope: TableScope;
  storeId?: string | number | null | undefined;
  type: TableType;
};

export type CursorPaginationInput = {
  cursor?: string | null | undefined;
  limit?: number | null | undefined;
};

export type DeductPointsInput = {
  amount: number;
  note?: string | null | undefined;
  userId: string | number;
};

export type DeductStoredValueInput = {
  amount: number;
  date: string;
  note: string;
  userId: string | number;
};

export type EventFilterInput = {
  dateFrom?: string | null | undefined;
  dateTo?: string | null | undefined;
  pagination?: PaginationInput | null | undefined;
  search?: string | null | undefined;
  sortBy?: string | null | undefined;
  sortOrder?: SortOrder | null | undefined;
  status?: Array<string> | null | undefined;
  store?: string | null | undefined;
  type?: string | null | undefined;
};

export type EventInput = {
  content?: string | null | undefined;
  coverImageUrl?: string | null | undefined;
  description?: string | null | undefined;
  storeId?: string | number | null | undefined;
  title: string;
};

export type LeaderboardCategory =
  | 'STORE_3P_HANCHAN'
  | 'STORE_3P_TONPUU'
  | 'STORE_4P_HANCHAN'
  | 'STORE_4P_TONPUU'
  | 'TOURNAMENT';

export type LeaderboardPeriod =
  | 'DAY'
  | 'MONTH'
  | 'WEEK';

export type LeaveTableInput = {
  code: string;
  occupancyId: string | number;
};

export type MahjongFilterInput = {
  completion?: Array<string> | null | undefined;
  dateFrom?: string | null | undefined;
  dateTo?: string | null | undefined;
  format?: Array<string> | null | undefined;
  mode?: Array<string> | null | undefined;
  pagination?: PaginationInput | null | undefined;
  search?: string | null | undefined;
  sortBy?: string | null | undefined;
  sortOrder?: SortOrder | null | undefined;
  store?: string | null | undefined;
  syncStatus?: Array<string> | null | undefined;
  tableCode?: string | null | undefined;
};

export type MahjongFormat =
  | 'HANCHAN'
  | 'TONPUU';

export type MahjongMatchHistoryInput = {
  endDate?: string | null | undefined;
  format?: MahjongFormat | null | undefined;
  matchType?: MahjongMatchType | null | undefined;
  mode?: MahjongMode | null | undefined;
  pagination?: CursorPaginationInput | null | undefined;
  search?: string | null | undefined;
  startDate?: string | null | undefined;
  storeId?: string | number | null | undefined;
  userId?: string | number | null | undefined;
};

export type MahjongMatchType =
  | 'STORE'
  | 'TOURNAMENT';

export type MahjongMode =
  | 'FOUR_PLAYER'
  | 'THREE_PLAYER';

export type MahjongPlayerInput = {
  finalScore: number;
  nickname: string;
  seat?: string | null | undefined;
  userId: string | number;
};

export type MahjongTerminationReason =
  | 'ADMIN_ABORT'
  | 'ORDER_INVALID'
  | 'SCORE_COMPLETE'
  | 'VOTE';

export type MediaListInput = {
  contentTypeFilter?: string | null | undefined;
  cursor?: string | null | undefined;
  limit?: number | null | undefined;
  search?: string | null | undefined;
};

export type MembershipPlanType =
  | 'MONTHLY'
  | 'MONTHLY_CC'
  | 'STORED_VALUE'
  | 'YEARLY';

export type OccupyTableInput = {
  code: string;
};

export type OrderFilterInput = {
  dateFrom?: string | null | undefined;
  dateTo?: string | null | undefined;
  groupBy?: string | null | undefined;
  pagination?: PaginationInput | null | undefined;
  search?: string | null | undefined;
  sortBy?: string | null | undefined;
  sortOrder?: SortOrder | null | undefined;
  status?: Array<string> | null | undefined;
  store?: string | null | undefined;
  tableCode?: string | null | undefined;
};

export type OrderGroupBy =
  | 'DATE'
  | 'NONE'
  | 'TABLE'
  | 'USER';

export type OrderListInput = {
  groupBy?: OrderGroupBy | null | undefined;
  pagination?: PaginationInput | null | undefined;
  search?: string | null | undefined;
  sortBy?: OrderSortBy | null | undefined;
  sortOrder?: SortOrder | null | undefined;
  status?: OrderStatusFilter | null | undefined;
  storeId?: string | number | null | undefined;
};

export type OrderSortBy =
  | 'END_AT'
  | 'START_AT';

export type OrderStatus =
  | 'ACTIVE'
  | 'CANCELLED'
  | 'PAUSED'
  | 'SETTLED';

export type OrderStatusFilter =
  | 'ACTIVE'
  | 'ALL'
  | 'PAUSED'
  | 'SETTLED';

export type PaginationInput = {
  limit?: number | null | undefined;
  offset?: number | null | undefined;
};

export type PricingSnapshotDataInput = {
  config: string;
  plans: string;
};

export type PricingSnapshotStatus =
  | 'DRAFT'
  | 'PUBLISHED';

export type PublishArticleInput = {
  /** If true, immediately publish after creating draft */
  autoPublish?: boolean | null | undefined;
  id: string | number;
  type: ArticleType;
};

export type RegisterMahjongInput = {
  gszName: string;
  phone: string;
  smsCode: string;
  syncNickname?: boolean | null | undefined;
};

export type RequestSmsCodeInput = {
  botcheck?: string | null | undefined;
  phone: string;
};

export type SavePricingSnapshotInput = {
  data: PricingSnapshotDataInput;
  name: string;
  storeId?: string | number | null | undefined;
};

export type SaveWechatMenuSnapshotInput = {
  data: string;
  name: string;
  storeId?: string | number | null | undefined;
};

export type SendSmsCodeInput = {
  botcheck?: string | null | undefined;
  phone: string;
};

export type SettleOrderInput = {
  deductFromStoredValue?: boolean | null | undefined;
  id: string | number;
};

export type SortOrder =
  | 'ASC'
  | 'DESC';

export type TableFilterInput = {
  pagination?: PaginationInput | null | undefined;
  search?: string | null | undefined;
  sortBy?: string | null | undefined;
  sortOrder?: SortOrder | null | undefined;
  status?: Array<string> | null | undefined;
  store?: string | null | undefined;
  type?: Array<string> | null | undefined;
};

export type TableScope =
  | 'BOARDGAME'
  | 'CONSOLE'
  | 'MAHJONG'
  | 'TRPG';

export type TableStatus =
  | 'ACTIVE'
  | 'INACTIVE';

export type TableType =
  | 'FIXED'
  | 'SOLO';

export type TempIdentityOccupyInput = {
  code: string;
  tempId: string | number;
};

export type UnsyncableReasonCode =
  | 'NO_PHONE'
  | 'TEMP_USER';

export type UpdateActiveInput = {
  boardGameId?: string | number | null | undefined;
  content?: string | null | undefined;
  date?: string | null | undefined;
  id: string | number;
  isGame?: boolean | null | undefined;
  maxPlayers?: number | null | undefined;
  time?: string | null | undefined;
  title?: string | null | undefined;
};

export type UpdateEventInput = {
  content?: string | null | undefined;
  coverImageUrl?: string | null | undefined;
  description?: string | null | undefined;
  id: string | number;
  title: string;
};

export type UpdateManagedUserInput = {
  id: string | number;
  name?: string | null | undefined;
  nickname?: string | null | undefined;
  phone?: string | null | undefined;
};

export type UpdateMembershipPlanInput = {
  amount?: number | null | undefined;
  endDate?: string | null | undefined;
  id: string | number;
  planType?: MembershipPlanType | null | undefined;
  startDate?: string | null | undefined;
};

export type UpdateMyUserInfoInput = {
  code?: string | null | undefined;
  nickname?: string | null | undefined;
  phone?: string | null | undefined;
};

export type UpdatePreferencesInput = {
  preferredLocale?: string | null | undefined;
  preferredStoreId?: string | number | null | undefined;
  preferredTheme?: string | null | undefined;
};

export type UpdateRoleInput = {
  id: string | number;
  role: UserRole;
};

export type UpdateTableInput = {
  capacity?: number | null | undefined;
  description?: string | null | undefined;
  id: string | number;
  name?: string | null | undefined;
  scope?: TableScope | null | undefined;
  type?: TableType | null | undefined;
};

export type UpsertBusinessCardInput = {
  customContent?: string | null | undefined;
  qq?: string | null | undefined;
  sharePhone?: boolean | null | undefined;
  wechat?: string | null | undefined;
};

export type UserFilterInput = {
  dateFrom?: string | null | undefined;
  dateTo?: string | null | undefined;
  pagination?: PaginationInput | null | undefined;
  role?: Array<string> | null | undefined;
  search?: string | null | undefined;
  sortBy?: string | null | undefined;
  sortOrder?: SortOrder | null | undefined;
  store?: string | null | undefined;
};

export type UserRole =
  | 'ADMIN'
  | 'CUSTOMER'
  | 'STAFF';

export type VerifyTotpInput = {
  loginTime: number;
  totp: string;
  userAgent: string;
};

export type WechatMenuSnapshotStatus =
  | 'DRAFT'
  | 'PUBLISHED';

export type WechatTemplateSlotKey =
  | 'MAHJONG_GSZ_SYNC'
  | 'MAHJONG_START'
  | 'MEMBERSHIP_CHANGE'
  | 'ORDER_SETTLED'
  | 'ORDER_START'
  | 'PASS_EXPIRING'
  | 'PHONE_BOUND'
  | 'TABLE_TRANSFER';

export type GetActivesQueryVariables = Exact<{
  input?: Types.ActiveListInput | null | undefined;
}>;


export type GetActivesQuery = { actives: { items: Array<{ id: string, creatorId: string, title: string, boardGameId: string | null, storeId: string | null, date: string, time: string | null, maxPlayers: number, content: string | null, isGame: boolean, isSystemRecommended: boolean, createdAt: string | null, updatedAt: string | null, creator: { id: string, name: string | null, nickname: string | null, uid: string | null, image: string | null } | null, boardGame: { id: string, schName: string | null, engName: string | null, gstoneRating: number | null } | null, boardGames: Array<{ id: string, schName: string | null, engName: string | null, gstoneRating: number | null }>, registrations: Array<{ id: string, activeId: string, userId: string, isWatching: boolean, nickname: string | null, uid: string | null, createdAt: string | null }> }>, pageInfo: { offset: number, limit: number, total: number | null, nextCursor: string | null, hasMore: boolean } } };

export type GetActiveQueryVariables = Exact<{
  id: string | number;
}>;


export type GetActiveQuery = { active: { id: string, creatorId: string, title: string, boardGameId: string | null, storeId: string | null, date: string, time: string | null, maxPlayers: number, content: string | null, isGame: boolean, isSystemRecommended: boolean, createdAt: string | null, updatedAt: string | null, creator: { id: string, name: string | null, nickname: string | null, uid: string | null, image: string | null } | null, boardGame: { id: string, schName: string | null, engName: string | null, gstoneRating: number | null } | null, boardGames: Array<{ id: string, schName: string | null, engName: string | null, gstoneRating: number | null }>, registrations: Array<{ id: string, activeId: string, userId: string, isWatching: boolean, nickname: string | null, uid: string | null, createdAt: string | null }> } };

export type JoinActiveMutationVariables = Exact<{
  activeId: string | number;
  isWatching?: boolean | null | undefined;
}>;


export type JoinActiveMutation = { joinActive: { id: string, userId: string, isWatching: boolean, nickname: string | null } };

export type LeaveActiveMutationVariables = Exact<{
  activeId: string | number;
}>;


export type LeaveActiveMutation = { leaveActive: { id: string } | null };

export type WatchActiveMutationVariables = Exact<{
  activeId: string | number;
}>;


export type WatchActiveMutation = { joinActive: { id: string, userId: string, isWatching: boolean, nickname: string | null } };

export type GetActiveParticipantsQueryVariables = Exact<{
  activeId: string | number;
}>;


export type GetActiveParticipantsQuery = { activeParticipants: Array<{ id: string, userId: string, nickname: string | null, isWatching: boolean, createdAt: string | null }> };

export type ActiveParticipantsChangedSubscriptionVariables = Exact<{
  activeId: string | number;
}>;


export type ActiveParticipantsChangedSubscription = { activeParticipantsChanged: { updatedAt: string } };

export type GetLeaderboardQueryVariables = Exact<{
  category: Types.LeaderboardCategory;
  period: Types.LeaderboardPeriod;
}>;


export type GetLeaderboardQuery = { leaderboard: { category: Types.LeaderboardCategory, period: Types.LeaderboardPeriod, computedAt: string | null, entries: Array<{ userId: string, nickname: string, totalPP: number, matchCount: number, rank: number, prevRank: number | null }> } };

export type GetOwnedBoardGameCountQueryVariables = Exact<{ [key: string]: never; }>;


export type GetOwnedBoardGameCountQuery = { ownedBoardGameCount: { current: number, removed: number, latestDate: string | null } };

export type GetOwnedBoardGameQueryVariables = Exact<{
  id: string | number;
}>;


export type GetOwnedBoardGameQuery = { ownedBoardGame: { id: string, schName: string | null, engName: string | null, gstoneId: number | null, gstoneRating: number | null, category: string | null, mode: string | null, playerNum: string | null, bestPlayerNum: string | null, content: string | null, removeDate: string | null } | null };

export type GetOwnedBoardGamesQueryVariables = Exact<{
  input?: Types.BoardGameFilterInput | null | undefined;
}>;


export type GetOwnedBoardGamesQuery = { ownedBoardGames: Array<{ id: string, schName: string | null, engName: string | null, gstoneId: number | null, gstoneRating: number | null, category: string | null, mode: string | null, playerNum: string | null, bestPlayerNum: string | null, content: string | null, removeDate: string | null }> };

export type ParticipantBusinessCardsQueryVariables = Exact<{
  activeId: string | number;
}>;


export type ParticipantBusinessCardsQuery = { participantBusinessCards: Array<{ userId: string, nickname: string | null, uid: string | null, sharePhone: boolean, phone: string | null, wechat: string | null, qq: string | null, customContent: string | null, isWatching: boolean | null, registrationId: string | null, createdAt: string | null, updatedAt: string | null }> };

export type BusinessCardByUserIdQueryVariables = Exact<{
  userId: string | number;
  activeId: string | number;
}>;


export type BusinessCardByUserIdQuery = { businessCard: { userId: string, nickname: string | null, uid: string | null, sharePhone: boolean, phone: string | null, wechat: string | null, qq: string | null, customContent: string | null, isWatching: boolean | null, registrationId: string | null, createdAt: string | null, updatedAt: string | null } | null };

export type CreateActiveMutationVariables = Exact<{
  input: Types.CreateActiveInput;
}>;


export type CreateActiveMutation = { createActive: { id: string, creatorId: string, title: string, boardGameId: string | null, storeId: string | null, date: string, time: string | null, maxPlayers: number, content: string | null, isGame: boolean, createdAt: string | null, boardGame: { id: string, schName: string | null, engName: string | null, gstoneRating: number | null } | null, registrations: Array<{ id: string, activeId: string, userId: string, isWatching: boolean, nickname: string | null, uid: string | null, createdAt: string | null }> } };

export type ManagedActivesQueryVariables = Exact<{
  filter?: Types.ActiveFilterInput | null | undefined;
}>;


export type ManagedActivesQuery = { managedActives: Array<{ id: string, creatorId: string, title: string, boardGameId: string | null, storeId: string | null, date: string, time: string | null, maxPlayers: number, content: string | null, isGame: boolean, createdAt: string | null, updatedAt: string | null, creator: { id: string, name: string | null } | null, boardGame: { id: string, schName: string | null, engName: string | null } | null, registrations: Array<{ id: string, activeId: string, userId: string, isWatching: boolean, nickname: string | null, uid: string | null }> }> };

export type ManagedActiveQueryVariables = Exact<{
  id: string | number;
}>;


export type ManagedActiveQuery = { managedActive: { id: string, creatorId: string, title: string, boardGameId: string | null, storeId: string | null, date: string, time: string | null, maxPlayers: number, content: string | null, isGame: boolean, createdAt: string | null, updatedAt: string | null, creator: { id: string, name: string | null } | null, boardGame: { id: string, schName: string | null, engName: string | null } | null, registrations: Array<{ id: string, activeId: string, userId: string, isWatching: boolean, nickname: string | null, uid: string | null }> } };

export type RemoveActiveMutationVariables = Exact<{
  id: string | number;
}>;


export type RemoveActiveMutation = { removeActive: { id: string } };

export type BatchRemoveActivesMutationVariables = Exact<{
  ids: Array<string | number> | string | number;
}>;


export type BatchRemoveActivesMutation = { batchRemoveActives: Array<{ id: string }> };

export type UpdateActiveMutationVariables = Exact<{
  input: Types.UpdateActiveInput;
}>;


export type UpdateActiveMutation = { updateActive: { id: string, title: string, date: string, time: string | null, maxPlayers: number, boardGameId: string | null, content: string | null, isGame: boolean } };

export type RemoveActiveRegistrationMutationVariables = Exact<{
  registrationId: string | number;
}>;


export type RemoveActiveRegistrationMutation = { removeActiveRegistration: { id: string } };

export type PublishArticleToWechatMutationVariables = Exact<{
  input: Types.PublishArticleInput;
}>;


export type PublishArticleToWechatMutation = { publishArticleToWechat: { success: boolean, draftMediaId: string | null, publishId: string | null, imageUrls: Array<string> | null, error: string | null } };

export type CrawlerStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type CrawlerStatsQuery = { crawlerStats: { total: number, crawled: number, errors: number, imagesCached: number, maxId: number, estimatedMax: number } };

export type CrawlerErrorsQueryVariables = Exact<{
  limit?: number | null | undefined;
}>;


export type CrawlerErrorsQuery = { crawlerErrors: Array<{ gstoneId: number, error: string | null, retryCount: number, updatedAt: string | null }> };

export type ResetCrawlerErrorsMutationVariables = Exact<{ [key: string]: never; }>;


export type ResetCrawlerErrorsMutation = { resetCrawlerErrors: { total: number, crawled: number, errors: number, imagesCached: number, maxId: number, estimatedMax: number } };

export type ManagedEventsQueryVariables = Exact<{
  filter?: Types.EventFilterInput | null | undefined;
}>;


export type ManagedEventsQuery = { managedEvents: Array<{ id: string, title: string, description: string | null, coverImageUrl: string | null, content: string | null, isPublished: boolean, createdAt: string | null, updatedAt: string | null }> };

export type ManagedEventQueryVariables = Exact<{
  id: string | number;
}>;


export type ManagedEventQuery = { managedEvent: { id: string, title: string, description: string | null, coverImageUrl: string | null, content: string | null, isPublished: boolean, createdAt: string | null, updatedAt: string | null } };

export type CreateEventMutationVariables = Exact<{
  input: Types.EventInput;
}>;


export type CreateEventMutation = { createEvent: { id: string, title: string, description: string | null, coverImageUrl: string | null, content: string | null, isPublished: boolean, createdAt: string | null, updatedAt: string | null } };

export type UpdateEventMutationVariables = Exact<{
  input: Types.UpdateEventInput;
}>;


export type UpdateEventMutation = { updateEvent: { id: string, title: string, description: string | null, coverImageUrl: string | null, content: string | null, isPublished: boolean, createdAt: string | null, updatedAt: string | null } };

export type RemoveEventMutationVariables = Exact<{
  id: string | number;
}>;


export type RemoveEventMutation = { removeEvent: { id: string } };

export type ToggleEventPublishMutationVariables = Exact<{
  id: string | number;
}>;


export type ToggleEventPublishMutation = { toggleEventPublish: { id: string, isPublished: boolean } };

export type MahjongMatchQueryVariables = Exact<{
  id: string | number;
  storeId?: string | number | null | undefined;
}>;


export type MahjongMatchQuery = { mahjongMatch: { id: string, tableId: string | null, matchType: Types.MahjongMatchType | null, gszRecordId: number | null, gszSynced: boolean, gszError: string | null, gszSyncedAt: string | null, mode: Types.MahjongMode, format: Types.MahjongFormat, startedAt: string, endedAt: string, terminationReason: Types.MahjongTerminationReason, playersJson: string, scores: string | null, createdAt: string | null, table: { id: string, name: string, code: string } | null, players: Array<{ userId: string, nickname: string, seat: string | null, finalScore: number }>, config: { type: string | null, mode: string, format: string } | null, unsyncableReasons: Array<{ nickname: string, userId: string, reason: Types.UnsyncableReasonCode }> } | null };

export type TerminateMahjongMatchMutationVariables = Exact<{
  tableCode: string;
  reason?: Types.MahjongTerminationReason | null | undefined;
}>;


export type TerminateMahjongMatchMutation = { terminateMahjongMatch: { id: string, terminationReason: Types.MahjongTerminationReason, terminatedAt: string } };

export type UpdateMahjongScoreMutationVariables = Exact<{
  matchId: string | number;
  players: Array<Types.MahjongPlayerInput> | Types.MahjongPlayerInput;
}>;


export type UpdateMahjongScoreMutation = { updateMahjongScore: { id: string, playersJson: string, players: Array<{ userId: string, nickname: string, seat: string | null, finalScore: number }> } };

export type SyncMahjongMatchToGszMutationVariables = Exact<{
  matchId: string | number;
}>;


export type SyncMahjongMatchToGszMutation = { syncMahjongMatchToGsz: { success: boolean, error: string | null, successCount: number | null, failCount: number | null, total: number | null } };

export type BatchSyncMahjongMatchesToGszMutationVariables = Exact<{
  matchIds: Array<string | number> | string | number;
}>;


export type BatchSyncMahjongMatchesToGszMutation = { batchSyncMahjongMatchesToGsz: { success: boolean, error: string | null, successCount: number | null, failCount: number | null, total: number | null } };

export type ManagedMahjongMatchesQueryVariables = Exact<{
  filter?: Types.MahjongFilterInput | null | undefined;
}>;


export type ManagedMahjongMatchesQuery = { managedMahjongMatches: { items: Array<{ id: string, tableId: string | null, matchType: Types.MahjongMatchType | null, gszRecordId: number | null, gszSynced: boolean, gszError: string | null, gszSyncedAt: string | null, mode: Types.MahjongMode, format: Types.MahjongFormat, startedAt: string, endedAt: string, terminationReason: Types.MahjongTerminationReason, playersJson: string, table: { id: string, name: string, code: string, scope: Types.TableScope } | null, players: Array<{ userId: string, nickname: string, seat: string | null, finalScore: number }>, unsyncableReasons: Array<{ nickname: string, userId: string, reason: Types.UnsyncableReasonCode }> }>, pageInfo: { offset: number, limit: number, total: number | null, nextCursor: string | null, hasMore: boolean } } };

export type ActiveMahjongMatchesQueryVariables = Exact<{ [key: string]: never; }>;


export type ActiveMahjongMatchesQuery = { activeMahjongMatches: Array<{ tableCode: string, tableName: string, tableId: string, phase: string, matchType: Types.MahjongMatchType, mode: Types.MahjongMode, format: Types.MahjongFormat, startedAt: string | null, players: Array<{ userId: string, nickname: string, seat: string | null, currentPoints: number | null }> }> };

export type MahjongTablesQueryVariables = Exact<{ [key: string]: never; }>;


export type MahjongTablesQuery = { mahjongTables: Array<{ id: string, name: string, code: string }> };

export type MediaObjectsQueryVariables = Exact<{
  input?: Types.MediaListInput | null | undefined;
}>;


export type MediaObjectsQuery = { mediaObjects: { truncated: boolean, cursor: string | null, items: Array<{ key: string, name: string, contentType: string, size: number, uploaded: string, url: string }> } };

export type RenameMediaObjectMutationVariables = Exact<{
  oldKey: string;
  newName: string;
}>;


export type RenameMediaObjectMutation = { renameMediaObject: { key: string, name: string, contentType: string, size: number, uploaded: string, url: string } };

export type RemoveMediaObjectMutationVariables = Exact<{
  key: string;
}>;


export type RemoveMediaObjectMutation = { removeMediaObject: { key: string, name: string, contentType: string, size: number, uploaded: string, url: string } };

export type OrdersQueryVariables = Exact<{
  input?: Types.OrderListInput | null | undefined;
  filter?: Types.OrderFilterInput | null | undefined;
}>;


export type OrdersQuery = { orders: { items: Array<{ id: string, tableId: string, userId: string | null, tempId: string | null, nickname: string | null, uid: string | null, phone: string | null, seats: number, status: Types.OrderStatus, startAt: string, endAt: string | null, finalPrice: number | null, pricingSnapshotId: string | null, table: { id: string, name: string, code: string, scope: Types.TableScope } | null }>, pageInfo: { offset: number, limit: number, total: number | null, nextCursor: string | null, hasMore: boolean } } };

export type OrderQueryVariables = Exact<{
  id: string | number;
}>;


export type OrderQuery = { order: { id: string, tableId: string, userId: string | null, tempId: string | null, nickname: string | null, uid: string | null, phone: string | null, seats: number, status: Types.OrderStatus, startAt: string, endAt: string | null, finalPrice: number | null, pricingSnapshotId: string | null, priceBreakdown: string | null, settlementSnapshot: string | null, table: { id: string, name: string, code: string, scope: Types.TableScope } | null, user: { id: string, uid: string | null, name: string | null, nickname: string | null, role: Types.UserRole } | null } };

export type SettlementPreviewQueryVariables = Exact<{
  id: string | number;
}>;


export type SettlementPreviewQuery = { settlementPreview: { totalMinutes: number, pausedMinutes: number, billableMinutes: number, finalPrice: number, order: { id: string, tableId: string, userId: string | null, tempId: string | null, nickname: string | null, uid: string | null, status: Types.OrderStatus, startAt: string, endAt: string | null, finalPrice: number | null, table: { id: string, name: string, code: string, scope: Types.TableScope } | null }, priceBreakdown: { planName: string, planType: string, billingType: string, unitPrice: number, totalMinutes: number, billableHalfHours: number, rawPrice: number, capApplied: boolean, capType: string | null, finalPrice: number } | null, membership: { hasTimePlan: boolean, timePlanActive: boolean, timePlanType: string | null, timePlanEndDate: string | null, storedValueBalance: number }, pauseLogs: Array<{ pausedAt: string, resumedAt: string | null }>, pricingPlans: Array<{ name: string, planType: string, billingType: string, price: number, matched: boolean }>, recentOrders: Array<{ id: string, tableName: string, startAt: string, endAt: string | null, finalPrice: number | null, status: Types.OrderStatus }> } };

export type BatchSettlementPreviewMutationVariables = Exact<{
  ids: Array<string | number> | string | number;
}>;


export type BatchSettlementPreviewMutation = { batchSettlementPreview: Array<{ totalMinutes: number, pausedMinutes: number, billableMinutes: number, finalPrice: number, order: { id: string, tableId: string, userId: string | null, tempId: string | null, nickname: string | null, uid: string | null, status: Types.OrderStatus, startAt: string, endAt: string | null, finalPrice: number | null, table: { id: string, name: string, code: string, scope: Types.TableScope } | null }, priceBreakdown: { planName: string, planType: string, billingType: string, unitPrice: number, totalMinutes: number, billableHalfHours: number, rawPrice: number, capApplied: boolean, capType: string | null, finalPrice: number } | null, membership: { hasTimePlan: boolean, timePlanActive: boolean, timePlanType: string | null, timePlanEndDate: string | null, storedValueBalance: number }, pauseLogs: Array<{ pausedAt: string, resumedAt: string | null }>, pricingPlans: Array<{ name: string, planType: string, billingType: string, price: number, matched: boolean }>, recentOrders: Array<{ id: string, tableName: string, startAt: string, endAt: string | null, finalPrice: number | null, status: Types.OrderStatus }> }> };

export type PauseOrderMutationVariables = Exact<{
  id: string | number;
}>;


export type PauseOrderMutation = { pauseOrder: { id: string, status: Types.OrderStatus } };

export type ResumeOrderMutationVariables = Exact<{
  id: string | number;
}>;


export type ResumeOrderMutation = { resumeOrder: { id: string, status: Types.OrderStatus } };

export type EndOrderMutationVariables = Exact<{
  id: string | number;
}>;


export type EndOrderMutation = { endOrder: { id: string, status: Types.OrderStatus, endAt: string | null } };

export type SettleOrderMutationVariables = Exact<{
  input: Types.SettleOrderInput;
}>;


export type SettleOrderMutation = { settleOrder: { price: number, snapshot: string | null, order: { id: string, status: Types.OrderStatus, finalPrice: number | null }, storedValueDeduction: { deducted: boolean, amount: number, note: string, balanceBefore: number, balanceAfter: number } | null } };

export type BatchSettleOrdersMutationVariables = Exact<{
  input: Types.BatchSettleInput;
}>;


export type BatchSettleOrdersMutation = { batchSettleOrders: { batchId: string | null, results: Array<{ id: string, success: boolean, price: number | null, restored: boolean | null, error: string | null }> } };

export type CancelBatchSettlementMutationVariables = Exact<{
  ids: Array<string | number> | string | number;
}>;


export type CancelBatchSettlementMutation = { cancelBatchSettlement: Array<{ id: string, success: boolean, restored: boolean | null, error: string | null }> };

export type BatchPauseOrdersMutationVariables = Exact<{
  ids: Array<string | number> | string | number;
}>;


export type BatchPauseOrdersMutation = { batchPauseOrders: Array<{ id: string, success: boolean, error: string | null }> };

export type BatchResumeOrdersMutationVariables = Exact<{
  ids: Array<string | number> | string | number;
}>;


export type BatchResumeOrdersMutation = { batchResumeOrders: Array<{ id: string, success: boolean, error: string | null }> };

export type PublishedPricingQueryVariables = Exact<{
  storeId?: string | number | null | undefined;
}>;


export type PublishedPricingQuery = { publishedPricing: { id: string, data: { plans: string, config: { daytimeStart: string, daytimeEnd: string } } } | null };

export type OrderStatusChangedSubscriptionVariables = Exact<{
  orderId?: string | number | null | undefined;
  tableId?: string | number | null | undefined;
  storeId?: string | number | null | undefined;
}>;


export type OrderStatusChangedSubscription = { orderStatusChanged: { previousStatus: Types.OrderStatus | null, currentStatus: Types.OrderStatus, updatedAt: string, order: { id: string, tableId: string, userId: string | null, tempId: string | null, nickname: string | null, uid: string | null, phone: string | null, seats: number, status: Types.OrderStatus, startAt: string, endAt: string | null, finalPrice: number | null, table: { id: string, name: string, code: string, scope: Types.TableScope } | null } } };

export type PricingDraftQueryVariables = Exact<{
  storeId?: string | number | null | undefined;
}>;


export type PricingDraftQuery = { pricingDraft: { snapshotId: string | null, snapshotName: string | null, status: Types.PricingSnapshotStatus | null, data: { plans: string, config: { daytimeStart: string, daytimeEnd: string } } } };

export type PricingSnapshotsQueryVariables = Exact<{
  storeId?: string | number | null | undefined;
}>;


export type PricingSnapshotsQuery = { pricingSnapshots: Array<{ id: string, name: string, storeId: string | null, status: Types.PricingSnapshotStatus, summary: string | null, createdAt: string | null, publishedAt: string | null, data: { plans: string, config: { daytimeStart: string, daytimeEnd: string } } }> };

export type PricingSnapshotQueryVariables = Exact<{
  id: string | number;
}>;


export type PricingSnapshotQuery = { pricingSnapshot: { id: string, name: string, storeId: string | null, status: Types.PricingSnapshotStatus, summary: string | null, createdAt: string | null, publishedAt: string | null, data: { plans: string, config: { daytimeStart: string, daytimeEnd: string } } } };

export type SavePricingSnapshotMutationVariables = Exact<{
  input: Types.SavePricingSnapshotInput;
}>;


export type SavePricingSnapshotMutation = { savePricingSnapshot: { id: string, name: string, storeId: string | null, status: Types.PricingSnapshotStatus, summary: string | null, createdAt: string | null, publishedAt: string | null, data: { plans: string, config: { daytimeStart: string, daytimeEnd: string } } } };

export type PublishPricingSnapshotMutationVariables = Exact<{
  storeId?: string | number | null | undefined;
}>;


export type PublishPricingSnapshotMutation = { publishPricingSnapshot: { id: string, name: string, status: Types.PricingSnapshotStatus, publishedAt: string | null } };

export type RestorePricingSnapshotMutationVariables = Exact<{
  id: string | number;
}>;


export type RestorePricingSnapshotMutation = { restorePricingSnapshot: { id: string, name: string, status: Types.PricingSnapshotStatus, summary: string | null, createdAt: string | null, publishedAt: string | null, data: { plans: string, config: { daytimeStart: string, daytimeEnd: string } } } };

export type CaptchaSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type CaptchaSettingsQuery = { captchaSettings: { enabled: boolean, disabledUntil: string | null, prefix: string | null, sceneId: string | null } };

export type SetCaptchaEnabledMutationVariables = Exact<{
  enabled: boolean;
}>;


export type SetCaptchaEnabledMutation = { setCaptchaEnabled: { enabled: boolean, disabledUntil: string | null } };

export type ManagedTablesQueryVariables = Exact<{
  filter?: Types.TableFilterInput | null | undefined;
}>;


export type ManagedTablesQuery = { managedTables: Array<{ id: string, name: string, type: Types.TableType, scope: Types.TableScope, status: Types.TableStatus, capacity: number, code: string, description: string | null, storeId: string | null, createdAt: string | null, updatedAt: string | null, occupancies: Array<{ id: string, tableId: string, userId: string | null, nickname: string | null, uid: string | null, seats: number, status: Types.OrderStatus }> }> };

export type ManagedTableQueryVariables = Exact<{
  id: string | number;
}>;


export type ManagedTableQuery = { managedTable: { id: string, name: string, type: Types.TableType, scope: Types.TableScope, status: Types.TableStatus, capacity: number, code: string, description: string | null, storeId: string | null, createdAt: string | null, updatedAt: string | null, occupancies: Array<{ id: string, tableId: string, userId: string | null, nickname: string | null, uid: string | null, phone: string | null, seats: number, status: Types.OrderStatus, startAt: string, endAt: string | null, finalPrice: number | null }> } };

export type CreateTableMutationVariables = Exact<{
  input: Types.CreateTableInput;
}>;


export type CreateTableMutation = { createTable: { id: string, name: string, type: Types.TableType, scope: Types.TableScope, status: Types.TableStatus, capacity: number, code: string, occupancies: Array<{ id: string, tableId: string, userId: string | null, nickname: string | null, uid: string | null, seats: number, status: Types.OrderStatus }> } };

export type UpdateTableMutationVariables = Exact<{
  input: Types.UpdateTableInput;
}>;


export type UpdateTableMutation = { updateTable: { id: string, name: string, type: Types.TableType, scope: Types.TableScope, status: Types.TableStatus, capacity: number, description: string | null } };

export type RemoveTableMutationVariables = Exact<{
  id: string | number;
}>;


export type RemoveTableMutation = { removeTable: { id: string } };

export type ToggleTableStatusMutationVariables = Exact<{
  id: string | number;
}>;


export type ToggleTableStatusMutation = { toggleTableStatus: { id: string, status: Types.TableStatus } };

export type RegenerateTableCodeMutationVariables = Exact<{
  id: string | number;
}>;


export type RegenerateTableCodeMutation = { regenerateTableCode: { id: string, code: string } };

export type AddTableOccupancyMutationVariables = Exact<{
  input: Types.AddOccupancyInput;
}>;


export type AddTableOccupancyMutation = { addTableOccupancy: { id: string, tableId: string, userId: string | null, nickname: string | null, uid: string | null, status: Types.OrderStatus } };

export type UsersQueryVariables = Exact<{
  filter?: Types.UserFilterInput | null | undefined;
}>;


export type UsersQuery = { managedUsers: { items: Array<{ id: string, uid: string | null, name: string | null, email: string | null, image: string | null, role: Types.UserRole, disabled: boolean | null, nickname: string | null, phone: string | null, points: number | null, preferredLocale: string | null, preferredStoreId: string | null, preferredTheme: string | null, meta: string | null, createdAt: string | null, membershipPlans: Array<{ id: string, userId: string, planType: Types.MembershipPlanType, amount: number | null, note: string | null, startDate: string, endDate: string | null, createdAt: string | null, updatedAt: string | null }> }>, pageInfo: { offset: number, limit: number, total: number | null, nextCursor: string | null, hasMore: boolean } } };

export type UserQueryVariables = Exact<{
  id: string | number;
}>;


export type UserQuery = { user: { id: string, uid: string | null, name: string | null, email: string | null, image: string | null, role: Types.UserRole, disabled: boolean | null, nickname: string | null, phone: string | null, points: number | null, preferredLocale: string | null, preferredStoreId: string | null, preferredTheme: string | null, meta: string | null, createdAt: string | null, membershipPlans: Array<{ id: string, userId: string, planType: Types.MembershipPlanType, amount: number | null, note: string | null, startDate: string, endDate: string | null, createdAt: string | null, updatedAt: string | null }> } | null };

export type DisableUserMutationVariables = Exact<{
  id: string | number;
}>;


export type DisableUserMutation = { disableUser: { id: string, role: Types.UserRole, disabled: boolean | null } };

export type EnableUserMutationVariables = Exact<{
  id: string | number;
}>;


export type EnableUserMutation = { enableUser: { id: string, role: Types.UserRole, disabled: boolean | null } };

export type UpdateUserMutationVariables = Exact<{
  input: Types.UpdateManagedUserInput;
}>;


export type UpdateUserMutation = { updateUser: { id: string, uid: string | null, name: string | null, email: string | null, role: Types.UserRole, nickname: string | null, phone: string | null } };

export type UpdateUserRoleMutationVariables = Exact<{
  input: Types.UpdateRoleInput;
}>;


export type UpdateUserRoleMutation = { updateUserRole: { id: string, role: Types.UserRole } };

export type MembershipPlansByUserQueryVariables = Exact<{
  userId: string | number;
}>;


export type MembershipPlansByUserQuery = { membershipPlansByUser: Array<{ id: string, userId: string, planType: Types.MembershipPlanType, amount: number | null, note: string | null, startDate: string, endDate: string | null, createdAt: string | null, updatedAt: string | null }> };

export type CreateMembershipPlanMutationVariables = Exact<{
  input: Types.CreateMembershipPlanInput;
}>;


export type CreateMembershipPlanMutation = { createMembershipPlan: { id: string, userId: string, planType: Types.MembershipPlanType, amount: number | null, note: string | null, startDate: string, endDate: string | null, createdAt: string | null, updatedAt: string | null } };

export type UpdateMembershipPlanMutationVariables = Exact<{
  input: Types.UpdateMembershipPlanInput;
}>;


export type UpdateMembershipPlanMutation = { updateMembershipPlan: { id: string, userId: string, planType: Types.MembershipPlanType, amount: number | null, note: string | null, startDate: string, endDate: string | null, createdAt: string | null, updatedAt: string | null } };

export type RemoveMembershipPlanMutationVariables = Exact<{
  id: string | number;
}>;


export type RemoveMembershipPlanMutation = { removeMembershipPlan: { id: string } };

export type DeductStoredValueMutationVariables = Exact<{
  input: Types.DeductStoredValueInput;
}>;


export type DeductStoredValueMutation = { deductStoredValue: { deducted: number, plan: { id: string, userId: string, planType: Types.MembershipPlanType, amount: number | null } } };

export type OccupanciesByUserQueryVariables = Exact<{
  userId: string | number;
}>;


export type OccupanciesByUserQuery = { occupanciesByUser: Array<{ id: string, tableId: string, userId: string | null, tempId: string | null, nickname: string | null, uid: string | null, phone: string | null, seats: number, status: Types.OrderStatus, startAt: string, endAt: string | null, finalPrice: number | null, table: { id: string, name: string, code: string, scope: Types.TableScope } | null }> };

export type PointsLogByUserQueryVariables = Exact<{
  userId: string | number;
}>;


export type PointsLogByUserQuery = { pointsLogByUser: Array<{ id: string, userId: string, amount: number, balanceAfter: number, note: string | null, createdBy: string | null, createdAt: string | null }> };

export type AddPointsMutationVariables = Exact<{
  input: Types.AddPointsInput;
}>;


export type AddPointsMutation = { addPoints: { id: string, userId: string, amount: number, balanceAfter: number, note: string | null, createdBy: string | null, createdAt: string | null } };

export type DeductPointsMutationVariables = Exact<{
  input: Types.DeductPointsInput;
}>;


export type DeductPointsMutation = { deductPoints: { id: string, userId: string, amount: number, balanceAfter: number, note: string | null, createdBy: string | null, createdAt: string | null } };

export type VerifyTotpDashMutationVariables = Exact<{
  input: Types.VerifyTotpInput;
}>;


export type VerifyTotpDashMutation = { verifyTotp: { success: boolean, userId: string | null } };

export type SyncOwnedBoardGamesMutationVariables = Exact<{
  pageFrom: number;
  pageTo: number;
  date: string;
}>;


export type SyncOwnedBoardGamesMutation = { syncOwnedBoardGames: { success: boolean, message: string | null, processed: number | null } };

export type WakeOwnedBoardGamesMutationVariables = Exact<{
  date: string;
}>;


export type WakeOwnedBoardGamesMutation = { wakeOwnedBoardGames: { success: boolean, message: string | null, processed: number | null } };

export type WechatMenuDraftQueryVariables = Exact<{
  storeId?: string | number | null | undefined;
}>;


export type WechatMenuDraftQuery = { wechatMenuDraft: { data: string, snapshotId: string | null, snapshotName: string | null, status: Types.WechatMenuSnapshotStatus | null } };

export type WechatMenuSnapshotsQueryVariables = Exact<{
  storeId?: string | number | null | undefined;
}>;


export type WechatMenuSnapshotsQuery = { wechatMenuSnapshots: Array<{ id: string, name: string, storeId: string | null, data: string, status: Types.WechatMenuSnapshotStatus, summary: string | null, createdAt: string | null, publishedAt: string | null }> };

export type WechatMenuSnapshotQueryVariables = Exact<{
  id: string | number;
}>;


export type WechatMenuSnapshotQuery = { wechatMenuSnapshot: { id: string, name: string, storeId: string | null, data: string, status: Types.WechatMenuSnapshotStatus, summary: string | null, createdAt: string | null, publishedAt: string | null } };

export type WechatMenuVariablesQueryVariables = Exact<{ [key: string]: never; }>;


export type WechatMenuVariablesQuery = { wechatMenuVariables: Array<{ id: string, label: string, description: string | null, example: string | null }> };

export type SaveWechatMenuSnapshotMutationVariables = Exact<{
  input: Types.SaveWechatMenuSnapshotInput;
}>;


export type SaveWechatMenuSnapshotMutation = { saveWechatMenuSnapshot: { id: string, name: string, storeId: string | null, data: string, status: Types.WechatMenuSnapshotStatus, summary: string | null, createdAt: string | null, publishedAt: string | null } };

export type PublishWechatMenuSnapshotMutationVariables = Exact<{
  storeId?: string | number | null | undefined;
}>;


export type PublishWechatMenuSnapshotMutation = { publishWechatMenuSnapshot: { success: boolean, error: string | null, snapshot: { id: string, name: string, status: Types.WechatMenuSnapshotStatus, publishedAt: string | null } | null } };

export type RestoreWechatMenuSnapshotMutationVariables = Exact<{
  id: string | number;
}>;


export type RestoreWechatMenuSnapshotMutation = { restoreWechatMenuSnapshot: { id: string, name: string, data: string, status: Types.WechatMenuSnapshotStatus, summary: string | null, createdAt: string | null, publishedAt: string | null } };

export type TranslateWechatMenuTextMutationVariables = Exact<{
  text: string;
  targetLocales: Array<string> | string;
}>;


export type TranslateWechatMenuTextMutation = { translateWechatMenuText: { translations: Array<{ locale: string, text: string }> } };

export type WechatTemplatesQueryVariables = Exact<{ [key: string]: never; }>;


export type WechatTemplatesQuery = { wechatTemplates: { success: boolean, error: string | null, templates: Array<{ templateId: string, title: string, primaryIndustry: string | null, deputyIndustry: string | null, content: string | null, example: string | null }> } };

export type WechatTemplateSlotsQueryVariables = Exact<{ [key: string]: never; }>;


export type WechatTemplateSlotsQuery = { wechatTemplateSlots: Array<{ key: Types.WechatTemplateSlotKey, label: string, templateId: string | null }> };

export type AddWechatTemplateFromLibraryMutationVariables = Exact<{
  input: Types.AddWechatTemplateFromLibraryInput;
}>;


export type AddWechatTemplateFromLibraryMutation = { addWechatTemplateFromLibrary: { success: boolean, error: string | null, templateId: string | null, slot: Types.WechatTemplateSlotKey | null, label: string | null } };

export type AssignWechatTemplateSlotMutationVariables = Exact<{
  slot: Types.WechatTemplateSlotKey;
  templateId: string;
}>;


export type AssignWechatTemplateSlotMutation = { assignWechatTemplateSlot: { key: Types.WechatTemplateSlotKey, label: string, templateId: string | null } };

export type RemoveWechatTemplateMutationVariables = Exact<{
  templateId: string;
}>;


export type RemoveWechatTemplateMutation = { removeWechatTemplate: { success: boolean, error: string | null, templateId: string | null, slot: Types.WechatTemplateSlotKey | null, label: string | null } };

export type SendWechatTemplateTestMutationVariables = Exact<{
  userId: string | number;
  slot: Types.WechatTemplateSlotKey;
}>;


export type SendWechatTemplateTestMutation = { sendWechatTemplateTest: { success: boolean, error: string | null, templateId: string | null, slot: Types.WechatTemplateSlotKey | null, label: string | null } };

export type GetEventsQueryVariables = Exact<{
  storeId?: string | number | null | undefined;
}>;


export type GetEventsQuery = { events: Array<{ id: string, title: string, description: string | null, coverImageUrl: string | null, content: string | null, isPublished: boolean, createdAt: string | null, updatedAt: string | null }> };

export type GetEventQueryVariables = Exact<{
  id: string | number;
}>;


export type GetEventQuery = { event: { id: string, title: string, description: string | null, coverImageUrl: string | null, content: string | null, isPublished: boolean, createdAt: string | null, updatedAt: string | null } };

export type GetMyPpStatsQueryVariables = Exact<{
  storeId?: string | number | null | undefined;
}>;


export type GetMyPpStatsQuery = { myPPStats: { totalPP: number, categories: string, raw: string } };

export type GetMahjongHeatmapQueryVariables = Exact<{
  userId?: string | number | null | undefined;
  storeId?: string | number | null | undefined;
}>;


export type GetMahjongHeatmapQuery = { mahjongHeatmap: string };

export type GetMyBadgesQueryVariables = Exact<{
  storeId?: string | number | null | undefined;
}>;


export type GetMyBadgesQuery = { myBadges: Array<{ id: string, userId: string | null, badgeType: string, badgeRank: number, category: string, periodLabel: string, title: string, awardedAt: string | null, createdAt: string | null }> };

export type GetMyRankingsQueryVariables = Exact<{
  storeId?: string | number | null | undefined;
}>;


export type GetMyRankingsQuery = { myRankings: Array<{ category: Types.LeaderboardCategory, period: Types.LeaderboardPeriod, rank: number | null, totalPP: number, prevRank: number | null, matchCount: number }> };

export type GetUserBadgesQueryVariables = Exact<{
  userId: string | number;
  storeId?: string | number | null | undefined;
}>;


export type GetUserBadgesQuery = { userBadges: Array<{ id: string, userId: string | null, badgeType: string, badgeRank: number, category: string, periodLabel: string, title: string, awardedAt: string | null, createdAt: string | null }> };

export type GetMahjongMatchHistoryQueryVariables = Exact<{
  input?: Types.MahjongMatchHistoryInput | null | undefined;
}>;


export type GetMahjongMatchHistoryQuery = { mahjongMatchHistory: { items: Array<{ id: string, tableId: string | null, matchType: Types.MahjongMatchType | null, gszRecordId: number | null, gszSynced: boolean, mode: Types.MahjongMode, format: Types.MahjongFormat, startedAt: string, endedAt: string, terminationReason: Types.MahjongTerminationReason, playersJson: string, scores: string | null, table: { id: string, name: string } | null, players: Array<{ userId: string, nickname: string, seat: string | null, finalScore: number }>, config: { type: string | null, mode: string, format: string } | null, unsyncableReasons: Array<{ nickname: string, userId: string, reason: Types.UnsyncableReasonCode }> }>, pageInfo: { offset: number, limit: number, total: number | null, nextCursor: string | null, hasMore: boolean } } };

export type MyMahjongMatchesQueryVariables = Exact<{
  storeId?: string | number | null | undefined;
}>;


export type MyMahjongMatchesQuery = { myMahjongMatches: Array<{ id: string, tableId: string | null, matchType: Types.MahjongMatchType | null, gszRecordId: number | null, gszSynced: boolean, gszError: string | null, gszSyncedAt: string | null, mode: Types.MahjongMode, format: Types.MahjongFormat, startedAt: string, endedAt: string, terminationReason: Types.MahjongTerminationReason, playersJson: string, scores: string | null, createdAt: string | null, table: { id: string, name: string, code: string } | null, players: Array<{ userId: string, nickname: string, seat: string | null, finalScore: number }>, config: { type: string | null, mode: string, format: string } | null }> };

export type MyMahjongRegistrationQueryVariables = Exact<{ [key: string]: never; }>;


export type MyMahjongRegistrationQuery = { myMahjongRegistration: { hasPhone: boolean, phone: string | null, nickname: string | null, registered: boolean, gszName: string | null, gszId: number | null, gszSynced: boolean, gszError: string | null, alreadyExisted: boolean | null, nicknameSynced: boolean | null } };

export type RegisterMahjongMutationVariables = Exact<{
  input: Types.RegisterMahjongInput;
}>;


export type RegisterMahjongMutation = { registerMahjong: { hasPhone: boolean, phone: string | null, nickname: string | null, registered: boolean, gszName: string | null, gszId: number | null, gszSynced: boolean, gszError: string | null, alreadyExisted: boolean | null, nicknameSynced: boolean | null } };

export type NotificationReceivedSubscriptionVariables = Exact<{
  userId: string | number;
}>;


export type NotificationReceivedSubscription = { notificationReceived: { id: string, userId: string, type: string, title: string | null, body: string | null, activeId: string | null, createdAt: string } };

export type WechatOpenConfigQueryVariables = Exact<{ [key: string]: never; }>;


export type WechatOpenConfigQuery = { wechatOpenConfig: { appId: string | null } };

export type SeatUpdatedSubscriptionVariables = Exact<{
  tableCode: string;
}>;


export type SeatUpdatedSubscription = { seatUpdated: { tableCode: string, updatedAt: string, table: { id: string, name: string, type: Types.TableType, scope: Types.TableScope, status: Types.TableStatus, capacity: number, code: string }, occupancies: Array<{ id: string, userId: string | null, nickname: string | null, uid: string | null, seats: number, startAt: string, status: Types.OrderStatus, tableId: string }> } };

export type TableByCodeQueryVariables = Exact<{
  code: string;
  storeId?: string | number | null | undefined;
}>;


export type TableByCodeQuery = { tableByCode: { id: string, name: string, type: Types.TableType, scope: Types.TableScope, status: Types.TableStatus, capacity: number, code: string, description: string | null, storeId: string | null, createdAt: string | null, updatedAt: string | null, occupancies: Array<{ id: string, tableId: string, userId: string | null, tempId: string | null, nickname: string | null, uid: string | null, seats: number, status: Types.OrderStatus, startAt: string, endAt: string | null, finalPrice: number | null }> } };

export type MyActiveOccupanciesQueryVariables = Exact<{
  storeId?: string | number | null | undefined;
}>;


export type MyActiveOccupanciesQuery = { myActiveOccupancies: Array<{ code: string, name: string, status: Types.OrderStatus }> };

export type PauseMyOrderMutationVariables = Exact<{
  input: Types.LeaveTableInput;
}>;


export type PauseMyOrderMutation = { pauseMyOrder: { id: string, tableId: string, userId: string | null, nickname: string | null, status: Types.OrderStatus, startAt: string, endAt: string | null } };

export type OccupyTableMutationVariables = Exact<{
  input: Types.OccupyTableInput;
}>;


export type OccupyTableMutation = { occupyTable: { occupancy: { id: string, tableId: string, userId: string | null, nickname: string | null, status: Types.OrderStatus, startAt: string, endAt: string | null }, table: { id: string, code: string, name: string } } };

export type CreateTempIdentityMutationVariables = Exact<{ [key: string]: never; }>;


export type CreateTempIdentityMutation = { createTempIdentity: { id: string, nickname: string, totpSecret: string, expiresAt: string, valid: boolean } };

export type ValidateTempIdentityQueryVariables = Exact<{
  tempId: string | number;
}>;


export type ValidateTempIdentityQuery = { validateTempIdentity: { id: string, nickname: string, totpSecret: string, expiresAt: string, valid: boolean } };

export type TempIdentityActiveOccupanciesQueryVariables = Exact<{
  tempId: string | number;
}>;


export type TempIdentityActiveOccupanciesQuery = { tempIdentityActiveOccupancies: Array<{ code: string, name: string, status: Types.OrderStatus }> };

export type TransferTempIdentityMutationVariables = Exact<{
  tempId: string | number;
  userId: string | number;
}>;


export type TransferTempIdentityMutation = { transferTempIdentity: { transferred: boolean, occupancy: { id: string, tableId: string, userId: string | null, nickname: string | null, status: Types.OrderStatus } | null } };

export type OccupyTableWithTempIdentityMutationVariables = Exact<{
  input: Types.TempIdentityOccupyInput;
}>;


export type OccupyTableWithTempIdentityMutation = { occupyTableWithTempIdentity: { occupancy: { id: string, tableId: string, userId: string | null, nickname: string | null, status: Types.OrderStatus }, table: { id: string, code: string, name: string } } };

export type GetMyBusinessCardQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMyBusinessCardQuery = { myBusinessCard: { userId: string, nickname: string | null, uid: string | null, sharePhone: boolean, phone: string | null, wechat: string | null, qq: string | null, customContent: string | null, isWatching: boolean | null, registrationId: string | null, createdAt: string | null, updatedAt: string | null } | null };

export type UpsertBusinessCardMutationVariables = Exact<{
  input: Types.UpsertBusinessCardInput;
}>;


export type UpsertBusinessCardMutation = { upsertBusinessCard: { userId: string, nickname: string | null, uid: string | null, sharePhone: boolean, phone: string | null, wechat: string | null, qq: string | null, customContent: string | null, isWatching: boolean | null, registrationId: string | null, createdAt: string | null, updatedAt: string | null } };

export type GetMyMembershipPlansQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMyMembershipPlansQuery = { myMembershipPlans: Array<{ id: string, userId: string, planType: Types.MembershipPlanType, amount: number | null, note: string | null, startDate: string, endDate: string | null, createdAt: string | null, updatedAt: string | null }> };

export type UpdateMyUserInfoMutationVariables = Exact<{
  input: Types.UpdateMyUserInfoInput;
}>;


export type UpdateMyUserInfoMutation = { updateMyUserInfo: { success: boolean, message: string | null, user: { id: string, uid: string | null, name: string | null, email: string | null, image: string | null, avatarUrl: string | null, role: Types.UserRole, nickname: string | null, phone: string | null, preferredLocale: string | null, preferredStoreId: string | null, preferredTheme: string | null, meta: string | null, createdAt: string | null, membershipPlans: Array<{ id: string, userId: string, planType: Types.MembershipPlanType, amount: number | null, note: string | null, startDate: string, endDate: string | null, createdAt: string | null, updatedAt: string | null }> } | null } };

export type UpdateMyPreferencesMutationVariables = Exact<{
  input: Types.UpdatePreferencesInput;
}>;


export type UpdateMyPreferencesMutation = { updateMyPreferences: { id: string, uid: string | null, name: string | null, email: string | null, image: string | null, role: Types.UserRole, nickname: string | null, phone: string | null, preferredLocale: string | null, preferredStoreId: string | null, preferredTheme: string | null, meta: string | null, createdAt: string | null, membershipPlans: Array<{ id: string, userId: string, planType: Types.MembershipPlanType, amount: number | null, note: string | null, startDate: string, endDate: string | null, createdAt: string | null, updatedAt: string | null }> } };

export type RequestSmsCodeMutationVariables = Exact<{
  input: Types.RequestSmsCodeInput;
}>;


export type RequestSmsCodeMutation = { requestSmsCode: { success: boolean, message: string | null, expiresInMs: number | null } };

export type SendSmsCodeMutationVariables = Exact<{
  input: Types.SendSmsCodeInput;
}>;


export type SendSmsCodeMutation = { sendSmsCode: { success: boolean, message: string | null, expiresInMs: number | null } };

export type GetTotpSecretQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTotpSecretQuery = { getTotpSecret: { success: boolean, message: string | null, secret: string | null } };

export type GetMyPointsBalanceQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMyPointsBalanceQuery = { myPointsBalance: number };


export const GetActivesDocument = gql`
    query GetActives($input: ActiveListInput) {
  actives(input: $input) {
    items {
      id
      creatorId
      creator {
        id
        name
        nickname
        uid
        image
      }
      title
      boardGameId
      boardGame {
        id
        schName
        engName
        gstoneRating
      }
      boardGames {
        id
        schName
        engName
        gstoneRating
      }
      storeId
      date
      time
      maxPlayers
      content
      isGame
      isSystemRecommended
      registrations {
        id
        activeId
        userId
        isWatching
        nickname
        uid
        createdAt
      }
      createdAt
      updatedAt
    }
    pageInfo {
      offset
      limit
      total
      nextCursor
      hasMore
    }
  }
}
    `;

/**
 * __useGetActivesQuery__
 *
 * To run a query within a React component, call `useGetActivesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetActivesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetActivesQuery({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGetActivesQuery(baseOptions?: Apollo.QueryHookOptions<Types.GetActivesQuery, Types.GetActivesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetActivesQuery, Types.GetActivesQueryVariables>(GetActivesDocument, options);
      }
export function useGetActivesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetActivesQuery, Types.GetActivesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetActivesQuery, Types.GetActivesQueryVariables>(GetActivesDocument, options);
        }
// @ts-ignore
export function useGetActivesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.GetActivesQuery, Types.GetActivesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetActivesQuery, Types.GetActivesQueryVariables>;
export function useGetActivesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetActivesQuery, Types.GetActivesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetActivesQuery | undefined, Types.GetActivesQueryVariables>;
export function useGetActivesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetActivesQuery, Types.GetActivesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetActivesQuery, Types.GetActivesQueryVariables>(GetActivesDocument, options);
        }
export type GetActivesQueryHookResult = ReturnType<typeof useGetActivesQuery>;
export type GetActivesLazyQueryHookResult = ReturnType<typeof useGetActivesLazyQuery>;
export type GetActivesSuspenseQueryHookResult = ReturnType<typeof useGetActivesSuspenseQuery>;
export type GetActivesQueryResult = Apollo.QueryResult<Types.GetActivesQuery, Types.GetActivesQueryVariables>;
export const GetActiveDocument = gql`
    query GetActive($id: ID!) {
  active(id: $id) {
    id
    creatorId
    creator {
      id
      name
      nickname
      uid
      image
    }
    title
    boardGameId
    boardGame {
      id
      schName
      engName
      gstoneRating
    }
    boardGames {
      id
      schName
      engName
      gstoneRating
    }
    storeId
    date
    time
    maxPlayers
    content
    isGame
    isSystemRecommended
    registrations {
      id
      activeId
      userId
      isWatching
      nickname
      uid
      createdAt
    }
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetActiveQuery__
 *
 * To run a query within a React component, call `useGetActiveQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetActiveQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetActiveQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetActiveQuery(baseOptions: Apollo.QueryHookOptions<Types.GetActiveQuery, Types.GetActiveQueryVariables> & ({ variables: Types.GetActiveQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetActiveQuery, Types.GetActiveQueryVariables>(GetActiveDocument, options);
      }
export function useGetActiveLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetActiveQuery, Types.GetActiveQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetActiveQuery, Types.GetActiveQueryVariables>(GetActiveDocument, options);
        }
// @ts-ignore
export function useGetActiveSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.GetActiveQuery, Types.GetActiveQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetActiveQuery, Types.GetActiveQueryVariables>;
export function useGetActiveSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetActiveQuery, Types.GetActiveQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetActiveQuery | undefined, Types.GetActiveQueryVariables>;
export function useGetActiveSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetActiveQuery, Types.GetActiveQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetActiveQuery, Types.GetActiveQueryVariables>(GetActiveDocument, options);
        }
export type GetActiveQueryHookResult = ReturnType<typeof useGetActiveQuery>;
export type GetActiveLazyQueryHookResult = ReturnType<typeof useGetActiveLazyQuery>;
export type GetActiveSuspenseQueryHookResult = ReturnType<typeof useGetActiveSuspenseQuery>;
export type GetActiveQueryResult = Apollo.QueryResult<Types.GetActiveQuery, Types.GetActiveQueryVariables>;
export const JoinActiveDocument = gql`
    mutation JoinActive($activeId: ID!, $isWatching: Boolean = false) {
  joinActive(input: {activeId: $activeId, isWatching: $isWatching}) {
    id
    userId
    isWatching
    nickname
  }
}
    `;
export type JoinActiveMutationFn = Apollo.MutationFunction<Types.JoinActiveMutation, Types.JoinActiveMutationVariables>;

/**
 * __useJoinActiveMutation__
 *
 * To run a mutation, you first call `useJoinActiveMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useJoinActiveMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [joinActiveMutation, { data, loading, error }] = useJoinActiveMutation({
 *   variables: {
 *      activeId: // value for 'activeId'
 *      isWatching: // value for 'isWatching'
 *   },
 * });
 */
export function useJoinActiveMutation(baseOptions?: Apollo.MutationHookOptions<Types.JoinActiveMutation, Types.JoinActiveMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.JoinActiveMutation, Types.JoinActiveMutationVariables>(JoinActiveDocument, options);
      }
export type JoinActiveMutationHookResult = ReturnType<typeof useJoinActiveMutation>;
export type JoinActiveMutationResult = Apollo.MutationResult<Types.JoinActiveMutation>;
export type JoinActiveMutationOptions = Apollo.BaseMutationOptions<Types.JoinActiveMutation, Types.JoinActiveMutationVariables>;
export const LeaveActiveDocument = gql`
    mutation LeaveActive($activeId: ID!) {
  leaveActive(activeId: $activeId) {
    id
  }
}
    `;
export type LeaveActiveMutationFn = Apollo.MutationFunction<Types.LeaveActiveMutation, Types.LeaveActiveMutationVariables>;

/**
 * __useLeaveActiveMutation__
 *
 * To run a mutation, you first call `useLeaveActiveMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLeaveActiveMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [leaveActiveMutation, { data, loading, error }] = useLeaveActiveMutation({
 *   variables: {
 *      activeId: // value for 'activeId'
 *   },
 * });
 */
export function useLeaveActiveMutation(baseOptions?: Apollo.MutationHookOptions<Types.LeaveActiveMutation, Types.LeaveActiveMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.LeaveActiveMutation, Types.LeaveActiveMutationVariables>(LeaveActiveDocument, options);
      }
export type LeaveActiveMutationHookResult = ReturnType<typeof useLeaveActiveMutation>;
export type LeaveActiveMutationResult = Apollo.MutationResult<Types.LeaveActiveMutation>;
export type LeaveActiveMutationOptions = Apollo.BaseMutationOptions<Types.LeaveActiveMutation, Types.LeaveActiveMutationVariables>;
export const WatchActiveDocument = gql`
    mutation WatchActive($activeId: ID!) {
  joinActive(input: {activeId: $activeId, isWatching: true}) {
    id
    userId
    isWatching
    nickname
  }
}
    `;
export type WatchActiveMutationFn = Apollo.MutationFunction<Types.WatchActiveMutation, Types.WatchActiveMutationVariables>;

/**
 * __useWatchActiveMutation__
 *
 * To run a mutation, you first call `useWatchActiveMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useWatchActiveMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [watchActiveMutation, { data, loading, error }] = useWatchActiveMutation({
 *   variables: {
 *      activeId: // value for 'activeId'
 *   },
 * });
 */
export function useWatchActiveMutation(baseOptions?: Apollo.MutationHookOptions<Types.WatchActiveMutation, Types.WatchActiveMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.WatchActiveMutation, Types.WatchActiveMutationVariables>(WatchActiveDocument, options);
      }
export type WatchActiveMutationHookResult = ReturnType<typeof useWatchActiveMutation>;
export type WatchActiveMutationResult = Apollo.MutationResult<Types.WatchActiveMutation>;
export type WatchActiveMutationOptions = Apollo.BaseMutationOptions<Types.WatchActiveMutation, Types.WatchActiveMutationVariables>;
export const GetActiveParticipantsDocument = gql`
    query GetActiveParticipants($activeId: ID!) {
  activeParticipants(activeId: $activeId) {
    id
    userId
    nickname
    isWatching
    createdAt
  }
}
    `;

/**
 * __useGetActiveParticipantsQuery__
 *
 * To run a query within a React component, call `useGetActiveParticipantsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetActiveParticipantsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetActiveParticipantsQuery({
 *   variables: {
 *      activeId: // value for 'activeId'
 *   },
 * });
 */
export function useGetActiveParticipantsQuery(baseOptions: Apollo.QueryHookOptions<Types.GetActiveParticipantsQuery, Types.GetActiveParticipantsQueryVariables> & ({ variables: Types.GetActiveParticipantsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetActiveParticipantsQuery, Types.GetActiveParticipantsQueryVariables>(GetActiveParticipantsDocument, options);
      }
export function useGetActiveParticipantsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetActiveParticipantsQuery, Types.GetActiveParticipantsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetActiveParticipantsQuery, Types.GetActiveParticipantsQueryVariables>(GetActiveParticipantsDocument, options);
        }
// @ts-ignore
export function useGetActiveParticipantsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.GetActiveParticipantsQuery, Types.GetActiveParticipantsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetActiveParticipantsQuery, Types.GetActiveParticipantsQueryVariables>;
export function useGetActiveParticipantsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetActiveParticipantsQuery, Types.GetActiveParticipantsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetActiveParticipantsQuery | undefined, Types.GetActiveParticipantsQueryVariables>;
export function useGetActiveParticipantsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetActiveParticipantsQuery, Types.GetActiveParticipantsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetActiveParticipantsQuery, Types.GetActiveParticipantsQueryVariables>(GetActiveParticipantsDocument, options);
        }
export type GetActiveParticipantsQueryHookResult = ReturnType<typeof useGetActiveParticipantsQuery>;
export type GetActiveParticipantsLazyQueryHookResult = ReturnType<typeof useGetActiveParticipantsLazyQuery>;
export type GetActiveParticipantsSuspenseQueryHookResult = ReturnType<typeof useGetActiveParticipantsSuspenseQuery>;
export type GetActiveParticipantsQueryResult = Apollo.QueryResult<Types.GetActiveParticipantsQuery, Types.GetActiveParticipantsQueryVariables>;
export const ActiveParticipantsChangedDocument = gql`
    subscription ActiveParticipantsChanged($activeId: ID!) {
  activeParticipantsChanged(activeId: $activeId) {
    updatedAt
  }
}
    `;

/**
 * __useActiveParticipantsChangedSubscription__
 *
 * To run a query within a React component, call `useActiveParticipantsChangedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useActiveParticipantsChangedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useActiveParticipantsChangedSubscription({
 *   variables: {
 *      activeId: // value for 'activeId'
 *   },
 * });
 */
export function useActiveParticipantsChangedSubscription(baseOptions: Apollo.SubscriptionHookOptions<Types.ActiveParticipantsChangedSubscription, Types.ActiveParticipantsChangedSubscriptionVariables> & ({ variables: Types.ActiveParticipantsChangedSubscriptionVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<Types.ActiveParticipantsChangedSubscription, Types.ActiveParticipantsChangedSubscriptionVariables>(ActiveParticipantsChangedDocument, options);
      }
export type ActiveParticipantsChangedSubscriptionHookResult = ReturnType<typeof useActiveParticipantsChangedSubscription>;
export type ActiveParticipantsChangedSubscriptionResult = Apollo.SubscriptionResult<Types.ActiveParticipantsChangedSubscription>;
export const GetLeaderboardDocument = gql`
    query GetLeaderboard($category: LeaderboardCategory!, $period: LeaderboardPeriod!) {
  leaderboard(category: $category, period: $period) {
    category
    period
    computedAt
    entries {
      userId
      nickname
      totalPP
      matchCount
      rank
      prevRank
    }
  }
}
    `;

/**
 * __useGetLeaderboardQuery__
 *
 * To run a query within a React component, call `useGetLeaderboardQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetLeaderboardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetLeaderboardQuery({
 *   variables: {
 *      category: // value for 'category'
 *      period: // value for 'period'
 *   },
 * });
 */
export function useGetLeaderboardQuery(baseOptions: Apollo.QueryHookOptions<Types.GetLeaderboardQuery, Types.GetLeaderboardQueryVariables> & ({ variables: Types.GetLeaderboardQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetLeaderboardQuery, Types.GetLeaderboardQueryVariables>(GetLeaderboardDocument, options);
      }
export function useGetLeaderboardLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetLeaderboardQuery, Types.GetLeaderboardQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetLeaderboardQuery, Types.GetLeaderboardQueryVariables>(GetLeaderboardDocument, options);
        }
// @ts-ignore
export function useGetLeaderboardSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.GetLeaderboardQuery, Types.GetLeaderboardQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetLeaderboardQuery, Types.GetLeaderboardQueryVariables>;
export function useGetLeaderboardSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetLeaderboardQuery, Types.GetLeaderboardQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetLeaderboardQuery | undefined, Types.GetLeaderboardQueryVariables>;
export function useGetLeaderboardSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetLeaderboardQuery, Types.GetLeaderboardQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetLeaderboardQuery, Types.GetLeaderboardQueryVariables>(GetLeaderboardDocument, options);
        }
export type GetLeaderboardQueryHookResult = ReturnType<typeof useGetLeaderboardQuery>;
export type GetLeaderboardLazyQueryHookResult = ReturnType<typeof useGetLeaderboardLazyQuery>;
export type GetLeaderboardSuspenseQueryHookResult = ReturnType<typeof useGetLeaderboardSuspenseQuery>;
export type GetLeaderboardQueryResult = Apollo.QueryResult<Types.GetLeaderboardQuery, Types.GetLeaderboardQueryVariables>;
export const GetOwnedBoardGameCountDocument = gql`
    query GetOwnedBoardGameCount {
  ownedBoardGameCount {
    current
    removed
    latestDate
  }
}
    `;

/**
 * __useGetOwnedBoardGameCountQuery__
 *
 * To run a query within a React component, call `useGetOwnedBoardGameCountQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetOwnedBoardGameCountQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetOwnedBoardGameCountQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetOwnedBoardGameCountQuery(baseOptions?: Apollo.QueryHookOptions<Types.GetOwnedBoardGameCountQuery, Types.GetOwnedBoardGameCountQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetOwnedBoardGameCountQuery, Types.GetOwnedBoardGameCountQueryVariables>(GetOwnedBoardGameCountDocument, options);
      }
export function useGetOwnedBoardGameCountLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetOwnedBoardGameCountQuery, Types.GetOwnedBoardGameCountQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetOwnedBoardGameCountQuery, Types.GetOwnedBoardGameCountQueryVariables>(GetOwnedBoardGameCountDocument, options);
        }
// @ts-ignore
export function useGetOwnedBoardGameCountSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.GetOwnedBoardGameCountQuery, Types.GetOwnedBoardGameCountQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetOwnedBoardGameCountQuery, Types.GetOwnedBoardGameCountQueryVariables>;
export function useGetOwnedBoardGameCountSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetOwnedBoardGameCountQuery, Types.GetOwnedBoardGameCountQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetOwnedBoardGameCountQuery | undefined, Types.GetOwnedBoardGameCountQueryVariables>;
export function useGetOwnedBoardGameCountSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetOwnedBoardGameCountQuery, Types.GetOwnedBoardGameCountQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetOwnedBoardGameCountQuery, Types.GetOwnedBoardGameCountQueryVariables>(GetOwnedBoardGameCountDocument, options);
        }
export type GetOwnedBoardGameCountQueryHookResult = ReturnType<typeof useGetOwnedBoardGameCountQuery>;
export type GetOwnedBoardGameCountLazyQueryHookResult = ReturnType<typeof useGetOwnedBoardGameCountLazyQuery>;
export type GetOwnedBoardGameCountSuspenseQueryHookResult = ReturnType<typeof useGetOwnedBoardGameCountSuspenseQuery>;
export type GetOwnedBoardGameCountQueryResult = Apollo.QueryResult<Types.GetOwnedBoardGameCountQuery, Types.GetOwnedBoardGameCountQueryVariables>;
export const GetOwnedBoardGameDocument = gql`
    query GetOwnedBoardGame($id: ID!) {
  ownedBoardGame(id: $id) {
    id
    schName
    engName
    gstoneId
    gstoneRating
    category
    mode
    playerNum
    bestPlayerNum
    content
    removeDate
  }
}
    `;

/**
 * __useGetOwnedBoardGameQuery__
 *
 * To run a query within a React component, call `useGetOwnedBoardGameQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetOwnedBoardGameQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetOwnedBoardGameQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetOwnedBoardGameQuery(baseOptions: Apollo.QueryHookOptions<Types.GetOwnedBoardGameQuery, Types.GetOwnedBoardGameQueryVariables> & ({ variables: Types.GetOwnedBoardGameQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetOwnedBoardGameQuery, Types.GetOwnedBoardGameQueryVariables>(GetOwnedBoardGameDocument, options);
      }
export function useGetOwnedBoardGameLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetOwnedBoardGameQuery, Types.GetOwnedBoardGameQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetOwnedBoardGameQuery, Types.GetOwnedBoardGameQueryVariables>(GetOwnedBoardGameDocument, options);
        }
// @ts-ignore
export function useGetOwnedBoardGameSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.GetOwnedBoardGameQuery, Types.GetOwnedBoardGameQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetOwnedBoardGameQuery, Types.GetOwnedBoardGameQueryVariables>;
export function useGetOwnedBoardGameSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetOwnedBoardGameQuery, Types.GetOwnedBoardGameQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetOwnedBoardGameQuery | undefined, Types.GetOwnedBoardGameQueryVariables>;
export function useGetOwnedBoardGameSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetOwnedBoardGameQuery, Types.GetOwnedBoardGameQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetOwnedBoardGameQuery, Types.GetOwnedBoardGameQueryVariables>(GetOwnedBoardGameDocument, options);
        }
export type GetOwnedBoardGameQueryHookResult = ReturnType<typeof useGetOwnedBoardGameQuery>;
export type GetOwnedBoardGameLazyQueryHookResult = ReturnType<typeof useGetOwnedBoardGameLazyQuery>;
export type GetOwnedBoardGameSuspenseQueryHookResult = ReturnType<typeof useGetOwnedBoardGameSuspenseQuery>;
export type GetOwnedBoardGameQueryResult = Apollo.QueryResult<Types.GetOwnedBoardGameQuery, Types.GetOwnedBoardGameQueryVariables>;
export const GetOwnedBoardGamesDocument = gql`
    query GetOwnedBoardGames($input: BoardGameFilterInput) {
  ownedBoardGames(input: $input) {
    id
    schName
    engName
    gstoneId
    gstoneRating
    category
    mode
    playerNum
    bestPlayerNum
    content
    removeDate
  }
}
    `;

/**
 * __useGetOwnedBoardGamesQuery__
 *
 * To run a query within a React component, call `useGetOwnedBoardGamesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetOwnedBoardGamesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetOwnedBoardGamesQuery({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGetOwnedBoardGamesQuery(baseOptions?: Apollo.QueryHookOptions<Types.GetOwnedBoardGamesQuery, Types.GetOwnedBoardGamesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetOwnedBoardGamesQuery, Types.GetOwnedBoardGamesQueryVariables>(GetOwnedBoardGamesDocument, options);
      }
export function useGetOwnedBoardGamesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetOwnedBoardGamesQuery, Types.GetOwnedBoardGamesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetOwnedBoardGamesQuery, Types.GetOwnedBoardGamesQueryVariables>(GetOwnedBoardGamesDocument, options);
        }
// @ts-ignore
export function useGetOwnedBoardGamesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.GetOwnedBoardGamesQuery, Types.GetOwnedBoardGamesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetOwnedBoardGamesQuery, Types.GetOwnedBoardGamesQueryVariables>;
export function useGetOwnedBoardGamesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetOwnedBoardGamesQuery, Types.GetOwnedBoardGamesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetOwnedBoardGamesQuery | undefined, Types.GetOwnedBoardGamesQueryVariables>;
export function useGetOwnedBoardGamesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetOwnedBoardGamesQuery, Types.GetOwnedBoardGamesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetOwnedBoardGamesQuery, Types.GetOwnedBoardGamesQueryVariables>(GetOwnedBoardGamesDocument, options);
        }
export type GetOwnedBoardGamesQueryHookResult = ReturnType<typeof useGetOwnedBoardGamesQuery>;
export type GetOwnedBoardGamesLazyQueryHookResult = ReturnType<typeof useGetOwnedBoardGamesLazyQuery>;
export type GetOwnedBoardGamesSuspenseQueryHookResult = ReturnType<typeof useGetOwnedBoardGamesSuspenseQuery>;
export type GetOwnedBoardGamesQueryResult = Apollo.QueryResult<Types.GetOwnedBoardGamesQuery, Types.GetOwnedBoardGamesQueryVariables>;
export const ParticipantBusinessCardsDocument = gql`
    query ParticipantBusinessCards($activeId: ID!) {
  participantBusinessCards(activeId: $activeId) {
    userId
    nickname
    uid
    sharePhone
    phone
    wechat
    qq
    customContent
    isWatching
    registrationId
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useParticipantBusinessCardsQuery__
 *
 * To run a query within a React component, call `useParticipantBusinessCardsQuery` and pass it any options that fit your needs.
 * When your component renders, `useParticipantBusinessCardsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useParticipantBusinessCardsQuery({
 *   variables: {
 *      activeId: // value for 'activeId'
 *   },
 * });
 */
export function useParticipantBusinessCardsQuery(baseOptions: Apollo.QueryHookOptions<Types.ParticipantBusinessCardsQuery, Types.ParticipantBusinessCardsQueryVariables> & ({ variables: Types.ParticipantBusinessCardsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.ParticipantBusinessCardsQuery, Types.ParticipantBusinessCardsQueryVariables>(ParticipantBusinessCardsDocument, options);
      }
export function useParticipantBusinessCardsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.ParticipantBusinessCardsQuery, Types.ParticipantBusinessCardsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.ParticipantBusinessCardsQuery, Types.ParticipantBusinessCardsQueryVariables>(ParticipantBusinessCardsDocument, options);
        }
// @ts-ignore
export function useParticipantBusinessCardsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.ParticipantBusinessCardsQuery, Types.ParticipantBusinessCardsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.ParticipantBusinessCardsQuery, Types.ParticipantBusinessCardsQueryVariables>;
export function useParticipantBusinessCardsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.ParticipantBusinessCardsQuery, Types.ParticipantBusinessCardsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.ParticipantBusinessCardsQuery | undefined, Types.ParticipantBusinessCardsQueryVariables>;
export function useParticipantBusinessCardsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.ParticipantBusinessCardsQuery, Types.ParticipantBusinessCardsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.ParticipantBusinessCardsQuery, Types.ParticipantBusinessCardsQueryVariables>(ParticipantBusinessCardsDocument, options);
        }
export type ParticipantBusinessCardsQueryHookResult = ReturnType<typeof useParticipantBusinessCardsQuery>;
export type ParticipantBusinessCardsLazyQueryHookResult = ReturnType<typeof useParticipantBusinessCardsLazyQuery>;
export type ParticipantBusinessCardsSuspenseQueryHookResult = ReturnType<typeof useParticipantBusinessCardsSuspenseQuery>;
export type ParticipantBusinessCardsQueryResult = Apollo.QueryResult<Types.ParticipantBusinessCardsQuery, Types.ParticipantBusinessCardsQueryVariables>;
export const BusinessCardByUserIdDocument = gql`
    query BusinessCardByUserId($userId: ID!, $activeId: ID!) {
  businessCard(userId: $userId, activeId: $activeId) {
    userId
    nickname
    uid
    sharePhone
    phone
    wechat
    qq
    customContent
    isWatching
    registrationId
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useBusinessCardByUserIdQuery__
 *
 * To run a query within a React component, call `useBusinessCardByUserIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useBusinessCardByUserIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBusinessCardByUserIdQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *      activeId: // value for 'activeId'
 *   },
 * });
 */
export function useBusinessCardByUserIdQuery(baseOptions: Apollo.QueryHookOptions<Types.BusinessCardByUserIdQuery, Types.BusinessCardByUserIdQueryVariables> & ({ variables: Types.BusinessCardByUserIdQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.BusinessCardByUserIdQuery, Types.BusinessCardByUserIdQueryVariables>(BusinessCardByUserIdDocument, options);
      }
export function useBusinessCardByUserIdLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.BusinessCardByUserIdQuery, Types.BusinessCardByUserIdQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.BusinessCardByUserIdQuery, Types.BusinessCardByUserIdQueryVariables>(BusinessCardByUserIdDocument, options);
        }
// @ts-ignore
export function useBusinessCardByUserIdSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.BusinessCardByUserIdQuery, Types.BusinessCardByUserIdQueryVariables>): Apollo.UseSuspenseQueryResult<Types.BusinessCardByUserIdQuery, Types.BusinessCardByUserIdQueryVariables>;
export function useBusinessCardByUserIdSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.BusinessCardByUserIdQuery, Types.BusinessCardByUserIdQueryVariables>): Apollo.UseSuspenseQueryResult<Types.BusinessCardByUserIdQuery | undefined, Types.BusinessCardByUserIdQueryVariables>;
export function useBusinessCardByUserIdSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.BusinessCardByUserIdQuery, Types.BusinessCardByUserIdQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.BusinessCardByUserIdQuery, Types.BusinessCardByUserIdQueryVariables>(BusinessCardByUserIdDocument, options);
        }
export type BusinessCardByUserIdQueryHookResult = ReturnType<typeof useBusinessCardByUserIdQuery>;
export type BusinessCardByUserIdLazyQueryHookResult = ReturnType<typeof useBusinessCardByUserIdLazyQuery>;
export type BusinessCardByUserIdSuspenseQueryHookResult = ReturnType<typeof useBusinessCardByUserIdSuspenseQuery>;
export type BusinessCardByUserIdQueryResult = Apollo.QueryResult<Types.BusinessCardByUserIdQuery, Types.BusinessCardByUserIdQueryVariables>;
export const CreateActiveDocument = gql`
    mutation CreateActive($input: CreateActiveInput!) {
  createActive(input: $input) {
    id
    creatorId
    title
    boardGameId
    boardGame {
      id
      schName
      engName
      gstoneRating
    }
    storeId
    date
    time
    maxPlayers
    content
    isGame
    registrations {
      id
      activeId
      userId
      isWatching
      nickname
      uid
      createdAt
    }
    createdAt
  }
}
    `;
export type CreateActiveMutationFn = Apollo.MutationFunction<Types.CreateActiveMutation, Types.CreateActiveMutationVariables>;

/**
 * __useCreateActiveMutation__
 *
 * To run a mutation, you first call `useCreateActiveMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateActiveMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createActiveMutation, { data, loading, error }] = useCreateActiveMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateActiveMutation(baseOptions?: Apollo.MutationHookOptions<Types.CreateActiveMutation, Types.CreateActiveMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.CreateActiveMutation, Types.CreateActiveMutationVariables>(CreateActiveDocument, options);
      }
export type CreateActiveMutationHookResult = ReturnType<typeof useCreateActiveMutation>;
export type CreateActiveMutationResult = Apollo.MutationResult<Types.CreateActiveMutation>;
export type CreateActiveMutationOptions = Apollo.BaseMutationOptions<Types.CreateActiveMutation, Types.CreateActiveMutationVariables>;
export const ManagedActivesDocument = gql`
    query ManagedActives($filter: ActiveFilterInput) {
  managedActives(filter: $filter) {
    id
    creatorId
    creator {
      id
      name
    }
    title
    boardGameId
    boardGame {
      id
      schName
      engName
    }
    storeId
    date
    time
    maxPlayers
    content
    isGame
    registrations {
      id
      activeId
      userId
      isWatching
      nickname
      uid
    }
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useManagedActivesQuery__
 *
 * To run a query within a React component, call `useManagedActivesQuery` and pass it any options that fit your needs.
 * When your component renders, `useManagedActivesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useManagedActivesQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *   },
 * });
 */
export function useManagedActivesQuery(baseOptions?: Apollo.QueryHookOptions<Types.ManagedActivesQuery, Types.ManagedActivesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.ManagedActivesQuery, Types.ManagedActivesQueryVariables>(ManagedActivesDocument, options);
      }
export function useManagedActivesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.ManagedActivesQuery, Types.ManagedActivesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.ManagedActivesQuery, Types.ManagedActivesQueryVariables>(ManagedActivesDocument, options);
        }
// @ts-ignore
export function useManagedActivesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.ManagedActivesQuery, Types.ManagedActivesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.ManagedActivesQuery, Types.ManagedActivesQueryVariables>;
export function useManagedActivesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.ManagedActivesQuery, Types.ManagedActivesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.ManagedActivesQuery | undefined, Types.ManagedActivesQueryVariables>;
export function useManagedActivesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.ManagedActivesQuery, Types.ManagedActivesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.ManagedActivesQuery, Types.ManagedActivesQueryVariables>(ManagedActivesDocument, options);
        }
export type ManagedActivesQueryHookResult = ReturnType<typeof useManagedActivesQuery>;
export type ManagedActivesLazyQueryHookResult = ReturnType<typeof useManagedActivesLazyQuery>;
export type ManagedActivesSuspenseQueryHookResult = ReturnType<typeof useManagedActivesSuspenseQuery>;
export type ManagedActivesQueryResult = Apollo.QueryResult<Types.ManagedActivesQuery, Types.ManagedActivesQueryVariables>;
export const ManagedActiveDocument = gql`
    query ManagedActive($id: ID!) {
  managedActive(id: $id) {
    id
    creatorId
    creator {
      id
      name
    }
    title
    boardGameId
    boardGame {
      id
      schName
      engName
    }
    storeId
    date
    time
    maxPlayers
    content
    isGame
    registrations {
      id
      activeId
      userId
      isWatching
      nickname
      uid
    }
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useManagedActiveQuery__
 *
 * To run a query within a React component, call `useManagedActiveQuery` and pass it any options that fit your needs.
 * When your component renders, `useManagedActiveQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useManagedActiveQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useManagedActiveQuery(baseOptions: Apollo.QueryHookOptions<Types.ManagedActiveQuery, Types.ManagedActiveQueryVariables> & ({ variables: Types.ManagedActiveQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.ManagedActiveQuery, Types.ManagedActiveQueryVariables>(ManagedActiveDocument, options);
      }
export function useManagedActiveLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.ManagedActiveQuery, Types.ManagedActiveQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.ManagedActiveQuery, Types.ManagedActiveQueryVariables>(ManagedActiveDocument, options);
        }
// @ts-ignore
export function useManagedActiveSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.ManagedActiveQuery, Types.ManagedActiveQueryVariables>): Apollo.UseSuspenseQueryResult<Types.ManagedActiveQuery, Types.ManagedActiveQueryVariables>;
export function useManagedActiveSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.ManagedActiveQuery, Types.ManagedActiveQueryVariables>): Apollo.UseSuspenseQueryResult<Types.ManagedActiveQuery | undefined, Types.ManagedActiveQueryVariables>;
export function useManagedActiveSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.ManagedActiveQuery, Types.ManagedActiveQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.ManagedActiveQuery, Types.ManagedActiveQueryVariables>(ManagedActiveDocument, options);
        }
export type ManagedActiveQueryHookResult = ReturnType<typeof useManagedActiveQuery>;
export type ManagedActiveLazyQueryHookResult = ReturnType<typeof useManagedActiveLazyQuery>;
export type ManagedActiveSuspenseQueryHookResult = ReturnType<typeof useManagedActiveSuspenseQuery>;
export type ManagedActiveQueryResult = Apollo.QueryResult<Types.ManagedActiveQuery, Types.ManagedActiveQueryVariables>;
export const RemoveActiveDocument = gql`
    mutation RemoveActive($id: ID!) {
  removeActive(id: $id) {
    id
  }
}
    `;
export type RemoveActiveMutationFn = Apollo.MutationFunction<Types.RemoveActiveMutation, Types.RemoveActiveMutationVariables>;

/**
 * __useRemoveActiveMutation__
 *
 * To run a mutation, you first call `useRemoveActiveMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveActiveMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeActiveMutation, { data, loading, error }] = useRemoveActiveMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRemoveActiveMutation(baseOptions?: Apollo.MutationHookOptions<Types.RemoveActiveMutation, Types.RemoveActiveMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.RemoveActiveMutation, Types.RemoveActiveMutationVariables>(RemoveActiveDocument, options);
      }
export type RemoveActiveMutationHookResult = ReturnType<typeof useRemoveActiveMutation>;
export type RemoveActiveMutationResult = Apollo.MutationResult<Types.RemoveActiveMutation>;
export type RemoveActiveMutationOptions = Apollo.BaseMutationOptions<Types.RemoveActiveMutation, Types.RemoveActiveMutationVariables>;
export const BatchRemoveActivesDocument = gql`
    mutation BatchRemoveActives($ids: [ID!]!) {
  batchRemoveActives(ids: $ids) {
    id
  }
}
    `;
export type BatchRemoveActivesMutationFn = Apollo.MutationFunction<Types.BatchRemoveActivesMutation, Types.BatchRemoveActivesMutationVariables>;

/**
 * __useBatchRemoveActivesMutation__
 *
 * To run a mutation, you first call `useBatchRemoveActivesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useBatchRemoveActivesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [batchRemoveActivesMutation, { data, loading, error }] = useBatchRemoveActivesMutation({
 *   variables: {
 *      ids: // value for 'ids'
 *   },
 * });
 */
export function useBatchRemoveActivesMutation(baseOptions?: Apollo.MutationHookOptions<Types.BatchRemoveActivesMutation, Types.BatchRemoveActivesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.BatchRemoveActivesMutation, Types.BatchRemoveActivesMutationVariables>(BatchRemoveActivesDocument, options);
      }
export type BatchRemoveActivesMutationHookResult = ReturnType<typeof useBatchRemoveActivesMutation>;
export type BatchRemoveActivesMutationResult = Apollo.MutationResult<Types.BatchRemoveActivesMutation>;
export type BatchRemoveActivesMutationOptions = Apollo.BaseMutationOptions<Types.BatchRemoveActivesMutation, Types.BatchRemoveActivesMutationVariables>;
export const UpdateActiveDocument = gql`
    mutation UpdateActive($input: UpdateActiveInput!) {
  updateActive(input: $input) {
    id
    title
    date
    time
    maxPlayers
    boardGameId
    content
    isGame
  }
}
    `;
export type UpdateActiveMutationFn = Apollo.MutationFunction<Types.UpdateActiveMutation, Types.UpdateActiveMutationVariables>;

/**
 * __useUpdateActiveMutation__
 *
 * To run a mutation, you first call `useUpdateActiveMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateActiveMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateActiveMutation, { data, loading, error }] = useUpdateActiveMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateActiveMutation(baseOptions?: Apollo.MutationHookOptions<Types.UpdateActiveMutation, Types.UpdateActiveMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.UpdateActiveMutation, Types.UpdateActiveMutationVariables>(UpdateActiveDocument, options);
      }
export type UpdateActiveMutationHookResult = ReturnType<typeof useUpdateActiveMutation>;
export type UpdateActiveMutationResult = Apollo.MutationResult<Types.UpdateActiveMutation>;
export type UpdateActiveMutationOptions = Apollo.BaseMutationOptions<Types.UpdateActiveMutation, Types.UpdateActiveMutationVariables>;
export const RemoveActiveRegistrationDocument = gql`
    mutation RemoveActiveRegistration($registrationId: ID!) {
  removeActiveRegistration(registrationId: $registrationId) {
    id
  }
}
    `;
export type RemoveActiveRegistrationMutationFn = Apollo.MutationFunction<Types.RemoveActiveRegistrationMutation, Types.RemoveActiveRegistrationMutationVariables>;

/**
 * __useRemoveActiveRegistrationMutation__
 *
 * To run a mutation, you first call `useRemoveActiveRegistrationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveActiveRegistrationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeActiveRegistrationMutation, { data, loading, error }] = useRemoveActiveRegistrationMutation({
 *   variables: {
 *      registrationId: // value for 'registrationId'
 *   },
 * });
 */
export function useRemoveActiveRegistrationMutation(baseOptions?: Apollo.MutationHookOptions<Types.RemoveActiveRegistrationMutation, Types.RemoveActiveRegistrationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.RemoveActiveRegistrationMutation, Types.RemoveActiveRegistrationMutationVariables>(RemoveActiveRegistrationDocument, options);
      }
export type RemoveActiveRegistrationMutationHookResult = ReturnType<typeof useRemoveActiveRegistrationMutation>;
export type RemoveActiveRegistrationMutationResult = Apollo.MutationResult<Types.RemoveActiveRegistrationMutation>;
export type RemoveActiveRegistrationMutationOptions = Apollo.BaseMutationOptions<Types.RemoveActiveRegistrationMutation, Types.RemoveActiveRegistrationMutationVariables>;
export const PublishArticleToWechatDocument = gql`
    mutation PublishArticleToWechat($input: PublishArticleInput!) {
  publishArticleToWechat(input: $input) {
    success
    draftMediaId
    publishId
    imageUrls
    error
  }
}
    `;
export type PublishArticleToWechatMutationFn = Apollo.MutationFunction<Types.PublishArticleToWechatMutation, Types.PublishArticleToWechatMutationVariables>;

/**
 * __usePublishArticleToWechatMutation__
 *
 * To run a mutation, you first call `usePublishArticleToWechatMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePublishArticleToWechatMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [publishArticleToWechatMutation, { data, loading, error }] = usePublishArticleToWechatMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function usePublishArticleToWechatMutation(baseOptions?: Apollo.MutationHookOptions<Types.PublishArticleToWechatMutation, Types.PublishArticleToWechatMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.PublishArticleToWechatMutation, Types.PublishArticleToWechatMutationVariables>(PublishArticleToWechatDocument, options);
      }
export type PublishArticleToWechatMutationHookResult = ReturnType<typeof usePublishArticleToWechatMutation>;
export type PublishArticleToWechatMutationResult = Apollo.MutationResult<Types.PublishArticleToWechatMutation>;
export type PublishArticleToWechatMutationOptions = Apollo.BaseMutationOptions<Types.PublishArticleToWechatMutation, Types.PublishArticleToWechatMutationVariables>;
export const CrawlerStatsDocument = gql`
    query CrawlerStats {
  crawlerStats {
    total
    crawled
    errors
    imagesCached
    maxId
    estimatedMax
  }
}
    `;

/**
 * __useCrawlerStatsQuery__
 *
 * To run a query within a React component, call `useCrawlerStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useCrawlerStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCrawlerStatsQuery({
 *   variables: {
 *   },
 * });
 */
export function useCrawlerStatsQuery(baseOptions?: Apollo.QueryHookOptions<Types.CrawlerStatsQuery, Types.CrawlerStatsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.CrawlerStatsQuery, Types.CrawlerStatsQueryVariables>(CrawlerStatsDocument, options);
      }
export function useCrawlerStatsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.CrawlerStatsQuery, Types.CrawlerStatsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.CrawlerStatsQuery, Types.CrawlerStatsQueryVariables>(CrawlerStatsDocument, options);
        }
// @ts-ignore
export function useCrawlerStatsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.CrawlerStatsQuery, Types.CrawlerStatsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.CrawlerStatsQuery, Types.CrawlerStatsQueryVariables>;
export function useCrawlerStatsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.CrawlerStatsQuery, Types.CrawlerStatsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.CrawlerStatsQuery | undefined, Types.CrawlerStatsQueryVariables>;
export function useCrawlerStatsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.CrawlerStatsQuery, Types.CrawlerStatsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.CrawlerStatsQuery, Types.CrawlerStatsQueryVariables>(CrawlerStatsDocument, options);
        }
export type CrawlerStatsQueryHookResult = ReturnType<typeof useCrawlerStatsQuery>;
export type CrawlerStatsLazyQueryHookResult = ReturnType<typeof useCrawlerStatsLazyQuery>;
export type CrawlerStatsSuspenseQueryHookResult = ReturnType<typeof useCrawlerStatsSuspenseQuery>;
export type CrawlerStatsQueryResult = Apollo.QueryResult<Types.CrawlerStatsQuery, Types.CrawlerStatsQueryVariables>;
export const CrawlerErrorsDocument = gql`
    query CrawlerErrors($limit: Int = 20) {
  crawlerErrors(limit: $limit) {
    gstoneId
    error
    retryCount
    updatedAt
  }
}
    `;

/**
 * __useCrawlerErrorsQuery__
 *
 * To run a query within a React component, call `useCrawlerErrorsQuery` and pass it any options that fit your needs.
 * When your component renders, `useCrawlerErrorsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCrawlerErrorsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useCrawlerErrorsQuery(baseOptions?: Apollo.QueryHookOptions<Types.CrawlerErrorsQuery, Types.CrawlerErrorsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.CrawlerErrorsQuery, Types.CrawlerErrorsQueryVariables>(CrawlerErrorsDocument, options);
      }
export function useCrawlerErrorsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.CrawlerErrorsQuery, Types.CrawlerErrorsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.CrawlerErrorsQuery, Types.CrawlerErrorsQueryVariables>(CrawlerErrorsDocument, options);
        }
// @ts-ignore
export function useCrawlerErrorsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.CrawlerErrorsQuery, Types.CrawlerErrorsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.CrawlerErrorsQuery, Types.CrawlerErrorsQueryVariables>;
export function useCrawlerErrorsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.CrawlerErrorsQuery, Types.CrawlerErrorsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.CrawlerErrorsQuery | undefined, Types.CrawlerErrorsQueryVariables>;
export function useCrawlerErrorsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.CrawlerErrorsQuery, Types.CrawlerErrorsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.CrawlerErrorsQuery, Types.CrawlerErrorsQueryVariables>(CrawlerErrorsDocument, options);
        }
export type CrawlerErrorsQueryHookResult = ReturnType<typeof useCrawlerErrorsQuery>;
export type CrawlerErrorsLazyQueryHookResult = ReturnType<typeof useCrawlerErrorsLazyQuery>;
export type CrawlerErrorsSuspenseQueryHookResult = ReturnType<typeof useCrawlerErrorsSuspenseQuery>;
export type CrawlerErrorsQueryResult = Apollo.QueryResult<Types.CrawlerErrorsQuery, Types.CrawlerErrorsQueryVariables>;
export const ResetCrawlerErrorsDocument = gql`
    mutation ResetCrawlerErrors {
  resetCrawlerErrors {
    total
    crawled
    errors
    imagesCached
    maxId
    estimatedMax
  }
}
    `;
export type ResetCrawlerErrorsMutationFn = Apollo.MutationFunction<Types.ResetCrawlerErrorsMutation, Types.ResetCrawlerErrorsMutationVariables>;

/**
 * __useResetCrawlerErrorsMutation__
 *
 * To run a mutation, you first call `useResetCrawlerErrorsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResetCrawlerErrorsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resetCrawlerErrorsMutation, { data, loading, error }] = useResetCrawlerErrorsMutation({
 *   variables: {
 *   },
 * });
 */
export function useResetCrawlerErrorsMutation(baseOptions?: Apollo.MutationHookOptions<Types.ResetCrawlerErrorsMutation, Types.ResetCrawlerErrorsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.ResetCrawlerErrorsMutation, Types.ResetCrawlerErrorsMutationVariables>(ResetCrawlerErrorsDocument, options);
      }
export type ResetCrawlerErrorsMutationHookResult = ReturnType<typeof useResetCrawlerErrorsMutation>;
export type ResetCrawlerErrorsMutationResult = Apollo.MutationResult<Types.ResetCrawlerErrorsMutation>;
export type ResetCrawlerErrorsMutationOptions = Apollo.BaseMutationOptions<Types.ResetCrawlerErrorsMutation, Types.ResetCrawlerErrorsMutationVariables>;
export const ManagedEventsDocument = gql`
    query ManagedEvents($filter: EventFilterInput) {
  managedEvents(filter: $filter) {
    id
    title
    description
    coverImageUrl
    content
    isPublished
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useManagedEventsQuery__
 *
 * To run a query within a React component, call `useManagedEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useManagedEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useManagedEventsQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *   },
 * });
 */
export function useManagedEventsQuery(baseOptions?: Apollo.QueryHookOptions<Types.ManagedEventsQuery, Types.ManagedEventsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.ManagedEventsQuery, Types.ManagedEventsQueryVariables>(ManagedEventsDocument, options);
      }
export function useManagedEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.ManagedEventsQuery, Types.ManagedEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.ManagedEventsQuery, Types.ManagedEventsQueryVariables>(ManagedEventsDocument, options);
        }
// @ts-ignore
export function useManagedEventsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.ManagedEventsQuery, Types.ManagedEventsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.ManagedEventsQuery, Types.ManagedEventsQueryVariables>;
export function useManagedEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.ManagedEventsQuery, Types.ManagedEventsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.ManagedEventsQuery | undefined, Types.ManagedEventsQueryVariables>;
export function useManagedEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.ManagedEventsQuery, Types.ManagedEventsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.ManagedEventsQuery, Types.ManagedEventsQueryVariables>(ManagedEventsDocument, options);
        }
export type ManagedEventsQueryHookResult = ReturnType<typeof useManagedEventsQuery>;
export type ManagedEventsLazyQueryHookResult = ReturnType<typeof useManagedEventsLazyQuery>;
export type ManagedEventsSuspenseQueryHookResult = ReturnType<typeof useManagedEventsSuspenseQuery>;
export type ManagedEventsQueryResult = Apollo.QueryResult<Types.ManagedEventsQuery, Types.ManagedEventsQueryVariables>;
export const ManagedEventDocument = gql`
    query ManagedEvent($id: ID!) {
  managedEvent(id: $id) {
    id
    title
    description
    coverImageUrl
    content
    isPublished
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useManagedEventQuery__
 *
 * To run a query within a React component, call `useManagedEventQuery` and pass it any options that fit your needs.
 * When your component renders, `useManagedEventQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useManagedEventQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useManagedEventQuery(baseOptions: Apollo.QueryHookOptions<Types.ManagedEventQuery, Types.ManagedEventQueryVariables> & ({ variables: Types.ManagedEventQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.ManagedEventQuery, Types.ManagedEventQueryVariables>(ManagedEventDocument, options);
      }
export function useManagedEventLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.ManagedEventQuery, Types.ManagedEventQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.ManagedEventQuery, Types.ManagedEventQueryVariables>(ManagedEventDocument, options);
        }
// @ts-ignore
export function useManagedEventSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.ManagedEventQuery, Types.ManagedEventQueryVariables>): Apollo.UseSuspenseQueryResult<Types.ManagedEventQuery, Types.ManagedEventQueryVariables>;
export function useManagedEventSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.ManagedEventQuery, Types.ManagedEventQueryVariables>): Apollo.UseSuspenseQueryResult<Types.ManagedEventQuery | undefined, Types.ManagedEventQueryVariables>;
export function useManagedEventSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.ManagedEventQuery, Types.ManagedEventQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.ManagedEventQuery, Types.ManagedEventQueryVariables>(ManagedEventDocument, options);
        }
export type ManagedEventQueryHookResult = ReturnType<typeof useManagedEventQuery>;
export type ManagedEventLazyQueryHookResult = ReturnType<typeof useManagedEventLazyQuery>;
export type ManagedEventSuspenseQueryHookResult = ReturnType<typeof useManagedEventSuspenseQuery>;
export type ManagedEventQueryResult = Apollo.QueryResult<Types.ManagedEventQuery, Types.ManagedEventQueryVariables>;
export const CreateEventDocument = gql`
    mutation CreateEvent($input: EventInput!) {
  createEvent(input: $input) {
    id
    title
    description
    coverImageUrl
    content
    isPublished
    createdAt
    updatedAt
  }
}
    `;
export type CreateEventMutationFn = Apollo.MutationFunction<Types.CreateEventMutation, Types.CreateEventMutationVariables>;

/**
 * __useCreateEventMutation__
 *
 * To run a mutation, you first call `useCreateEventMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateEventMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createEventMutation, { data, loading, error }] = useCreateEventMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateEventMutation(baseOptions?: Apollo.MutationHookOptions<Types.CreateEventMutation, Types.CreateEventMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.CreateEventMutation, Types.CreateEventMutationVariables>(CreateEventDocument, options);
      }
export type CreateEventMutationHookResult = ReturnType<typeof useCreateEventMutation>;
export type CreateEventMutationResult = Apollo.MutationResult<Types.CreateEventMutation>;
export type CreateEventMutationOptions = Apollo.BaseMutationOptions<Types.CreateEventMutation, Types.CreateEventMutationVariables>;
export const UpdateEventDocument = gql`
    mutation UpdateEvent($input: UpdateEventInput!) {
  updateEvent(input: $input) {
    id
    title
    description
    coverImageUrl
    content
    isPublished
    createdAt
    updatedAt
  }
}
    `;
export type UpdateEventMutationFn = Apollo.MutationFunction<Types.UpdateEventMutation, Types.UpdateEventMutationVariables>;

/**
 * __useUpdateEventMutation__
 *
 * To run a mutation, you first call `useUpdateEventMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateEventMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateEventMutation, { data, loading, error }] = useUpdateEventMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateEventMutation(baseOptions?: Apollo.MutationHookOptions<Types.UpdateEventMutation, Types.UpdateEventMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.UpdateEventMutation, Types.UpdateEventMutationVariables>(UpdateEventDocument, options);
      }
export type UpdateEventMutationHookResult = ReturnType<typeof useUpdateEventMutation>;
export type UpdateEventMutationResult = Apollo.MutationResult<Types.UpdateEventMutation>;
export type UpdateEventMutationOptions = Apollo.BaseMutationOptions<Types.UpdateEventMutation, Types.UpdateEventMutationVariables>;
export const RemoveEventDocument = gql`
    mutation RemoveEvent($id: ID!) {
  removeEvent(id: $id) {
    id
  }
}
    `;
export type RemoveEventMutationFn = Apollo.MutationFunction<Types.RemoveEventMutation, Types.RemoveEventMutationVariables>;

/**
 * __useRemoveEventMutation__
 *
 * To run a mutation, you first call `useRemoveEventMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveEventMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeEventMutation, { data, loading, error }] = useRemoveEventMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRemoveEventMutation(baseOptions?: Apollo.MutationHookOptions<Types.RemoveEventMutation, Types.RemoveEventMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.RemoveEventMutation, Types.RemoveEventMutationVariables>(RemoveEventDocument, options);
      }
export type RemoveEventMutationHookResult = ReturnType<typeof useRemoveEventMutation>;
export type RemoveEventMutationResult = Apollo.MutationResult<Types.RemoveEventMutation>;
export type RemoveEventMutationOptions = Apollo.BaseMutationOptions<Types.RemoveEventMutation, Types.RemoveEventMutationVariables>;
export const ToggleEventPublishDocument = gql`
    mutation ToggleEventPublish($id: ID!) {
  toggleEventPublish(id: $id) {
    id
    isPublished
  }
}
    `;
export type ToggleEventPublishMutationFn = Apollo.MutationFunction<Types.ToggleEventPublishMutation, Types.ToggleEventPublishMutationVariables>;

/**
 * __useToggleEventPublishMutation__
 *
 * To run a mutation, you first call `useToggleEventPublishMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useToggleEventPublishMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [toggleEventPublishMutation, { data, loading, error }] = useToggleEventPublishMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useToggleEventPublishMutation(baseOptions?: Apollo.MutationHookOptions<Types.ToggleEventPublishMutation, Types.ToggleEventPublishMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.ToggleEventPublishMutation, Types.ToggleEventPublishMutationVariables>(ToggleEventPublishDocument, options);
      }
export type ToggleEventPublishMutationHookResult = ReturnType<typeof useToggleEventPublishMutation>;
export type ToggleEventPublishMutationResult = Apollo.MutationResult<Types.ToggleEventPublishMutation>;
export type ToggleEventPublishMutationOptions = Apollo.BaseMutationOptions<Types.ToggleEventPublishMutation, Types.ToggleEventPublishMutationVariables>;
export const MahjongMatchDocument = gql`
    query MahjongMatch($id: ID!, $storeId: ID) {
  mahjongMatch(id: $id, storeId: $storeId) {
    id
    tableId
    table {
      id
      name
      code
    }
    matchType
    gszRecordId
    gszSynced
    gszError
    gszSyncedAt
    mode
    format
    startedAt
    endedAt
    terminationReason
    players {
      userId
      nickname
      seat
      finalScore
    }
    playersJson
    scores
    config {
      type
      mode
      format
    }
    createdAt
    unsyncableReasons {
      nickname
      userId
      reason
    }
  }
}
    `;

/**
 * __useMahjongMatchQuery__
 *
 * To run a query within a React component, call `useMahjongMatchQuery` and pass it any options that fit your needs.
 * When your component renders, `useMahjongMatchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMahjongMatchQuery({
 *   variables: {
 *      id: // value for 'id'
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function useMahjongMatchQuery(baseOptions: Apollo.QueryHookOptions<Types.MahjongMatchQuery, Types.MahjongMatchQueryVariables> & ({ variables: Types.MahjongMatchQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.MahjongMatchQuery, Types.MahjongMatchQueryVariables>(MahjongMatchDocument, options);
      }
export function useMahjongMatchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.MahjongMatchQuery, Types.MahjongMatchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.MahjongMatchQuery, Types.MahjongMatchQueryVariables>(MahjongMatchDocument, options);
        }
// @ts-ignore
export function useMahjongMatchSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.MahjongMatchQuery, Types.MahjongMatchQueryVariables>): Apollo.UseSuspenseQueryResult<Types.MahjongMatchQuery, Types.MahjongMatchQueryVariables>;
export function useMahjongMatchSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.MahjongMatchQuery, Types.MahjongMatchQueryVariables>): Apollo.UseSuspenseQueryResult<Types.MahjongMatchQuery | undefined, Types.MahjongMatchQueryVariables>;
export function useMahjongMatchSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.MahjongMatchQuery, Types.MahjongMatchQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.MahjongMatchQuery, Types.MahjongMatchQueryVariables>(MahjongMatchDocument, options);
        }
export type MahjongMatchQueryHookResult = ReturnType<typeof useMahjongMatchQuery>;
export type MahjongMatchLazyQueryHookResult = ReturnType<typeof useMahjongMatchLazyQuery>;
export type MahjongMatchSuspenseQueryHookResult = ReturnType<typeof useMahjongMatchSuspenseQuery>;
export type MahjongMatchQueryResult = Apollo.QueryResult<Types.MahjongMatchQuery, Types.MahjongMatchQueryVariables>;
export const TerminateMahjongMatchDocument = gql`
    mutation TerminateMahjongMatch($tableCode: String!, $reason: MahjongTerminationReason) {
  terminateMahjongMatch(tableCode: $tableCode, reason: $reason) {
    id
    terminatedAt: endedAt
    terminationReason
  }
}
    `;
export type TerminateMahjongMatchMutationFn = Apollo.MutationFunction<Types.TerminateMahjongMatchMutation, Types.TerminateMahjongMatchMutationVariables>;

/**
 * __useTerminateMahjongMatchMutation__
 *
 * To run a mutation, you first call `useTerminateMahjongMatchMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useTerminateMahjongMatchMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [terminateMahjongMatchMutation, { data, loading, error }] = useTerminateMahjongMatchMutation({
 *   variables: {
 *      tableCode: // value for 'tableCode'
 *      reason: // value for 'reason'
 *   },
 * });
 */
export function useTerminateMahjongMatchMutation(baseOptions?: Apollo.MutationHookOptions<Types.TerminateMahjongMatchMutation, Types.TerminateMahjongMatchMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.TerminateMahjongMatchMutation, Types.TerminateMahjongMatchMutationVariables>(TerminateMahjongMatchDocument, options);
      }
export type TerminateMahjongMatchMutationHookResult = ReturnType<typeof useTerminateMahjongMatchMutation>;
export type TerminateMahjongMatchMutationResult = Apollo.MutationResult<Types.TerminateMahjongMatchMutation>;
export type TerminateMahjongMatchMutationOptions = Apollo.BaseMutationOptions<Types.TerminateMahjongMatchMutation, Types.TerminateMahjongMatchMutationVariables>;
export const UpdateMahjongScoreDocument = gql`
    mutation UpdateMahjongScore($matchId: ID!, $players: [MahjongPlayerInput!]!) {
  updateMahjongScore(matchId: $matchId, players: $players) {
    id
    players {
      userId
      nickname
      seat
      finalScore
    }
    playersJson
  }
}
    `;
export type UpdateMahjongScoreMutationFn = Apollo.MutationFunction<Types.UpdateMahjongScoreMutation, Types.UpdateMahjongScoreMutationVariables>;

/**
 * __useUpdateMahjongScoreMutation__
 *
 * To run a mutation, you first call `useUpdateMahjongScoreMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateMahjongScoreMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateMahjongScoreMutation, { data, loading, error }] = useUpdateMahjongScoreMutation({
 *   variables: {
 *      matchId: // value for 'matchId'
 *      players: // value for 'players'
 *   },
 * });
 */
export function useUpdateMahjongScoreMutation(baseOptions?: Apollo.MutationHookOptions<Types.UpdateMahjongScoreMutation, Types.UpdateMahjongScoreMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.UpdateMahjongScoreMutation, Types.UpdateMahjongScoreMutationVariables>(UpdateMahjongScoreDocument, options);
      }
export type UpdateMahjongScoreMutationHookResult = ReturnType<typeof useUpdateMahjongScoreMutation>;
export type UpdateMahjongScoreMutationResult = Apollo.MutationResult<Types.UpdateMahjongScoreMutation>;
export type UpdateMahjongScoreMutationOptions = Apollo.BaseMutationOptions<Types.UpdateMahjongScoreMutation, Types.UpdateMahjongScoreMutationVariables>;
export const SyncMahjongMatchToGszDocument = gql`
    mutation SyncMahjongMatchToGsz($matchId: ID!) {
  syncMahjongMatchToGsz(matchId: $matchId) {
    success
    error
    successCount
    failCount
    total
  }
}
    `;
export type SyncMahjongMatchToGszMutationFn = Apollo.MutationFunction<Types.SyncMahjongMatchToGszMutation, Types.SyncMahjongMatchToGszMutationVariables>;

/**
 * __useSyncMahjongMatchToGszMutation__
 *
 * To run a mutation, you first call `useSyncMahjongMatchToGszMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSyncMahjongMatchToGszMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [syncMahjongMatchToGszMutation, { data, loading, error }] = useSyncMahjongMatchToGszMutation({
 *   variables: {
 *      matchId: // value for 'matchId'
 *   },
 * });
 */
export function useSyncMahjongMatchToGszMutation(baseOptions?: Apollo.MutationHookOptions<Types.SyncMahjongMatchToGszMutation, Types.SyncMahjongMatchToGszMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.SyncMahjongMatchToGszMutation, Types.SyncMahjongMatchToGszMutationVariables>(SyncMahjongMatchToGszDocument, options);
      }
export type SyncMahjongMatchToGszMutationHookResult = ReturnType<typeof useSyncMahjongMatchToGszMutation>;
export type SyncMahjongMatchToGszMutationResult = Apollo.MutationResult<Types.SyncMahjongMatchToGszMutation>;
export type SyncMahjongMatchToGszMutationOptions = Apollo.BaseMutationOptions<Types.SyncMahjongMatchToGszMutation, Types.SyncMahjongMatchToGszMutationVariables>;
export const BatchSyncMahjongMatchesToGszDocument = gql`
    mutation BatchSyncMahjongMatchesToGsz($matchIds: [ID!]!) {
  batchSyncMahjongMatchesToGsz(matchIds: $matchIds) {
    success
    error
    successCount
    failCount
    total
  }
}
    `;
export type BatchSyncMahjongMatchesToGszMutationFn = Apollo.MutationFunction<Types.BatchSyncMahjongMatchesToGszMutation, Types.BatchSyncMahjongMatchesToGszMutationVariables>;

/**
 * __useBatchSyncMahjongMatchesToGszMutation__
 *
 * To run a mutation, you first call `useBatchSyncMahjongMatchesToGszMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useBatchSyncMahjongMatchesToGszMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [batchSyncMahjongMatchesToGszMutation, { data, loading, error }] = useBatchSyncMahjongMatchesToGszMutation({
 *   variables: {
 *      matchIds: // value for 'matchIds'
 *   },
 * });
 */
export function useBatchSyncMahjongMatchesToGszMutation(baseOptions?: Apollo.MutationHookOptions<Types.BatchSyncMahjongMatchesToGszMutation, Types.BatchSyncMahjongMatchesToGszMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.BatchSyncMahjongMatchesToGszMutation, Types.BatchSyncMahjongMatchesToGszMutationVariables>(BatchSyncMahjongMatchesToGszDocument, options);
      }
export type BatchSyncMahjongMatchesToGszMutationHookResult = ReturnType<typeof useBatchSyncMahjongMatchesToGszMutation>;
export type BatchSyncMahjongMatchesToGszMutationResult = Apollo.MutationResult<Types.BatchSyncMahjongMatchesToGszMutation>;
export type BatchSyncMahjongMatchesToGszMutationOptions = Apollo.BaseMutationOptions<Types.BatchSyncMahjongMatchesToGszMutation, Types.BatchSyncMahjongMatchesToGszMutationVariables>;
export const ManagedMahjongMatchesDocument = gql`
    query ManagedMahjongMatches($filter: MahjongFilterInput) {
  managedMahjongMatches(filter: $filter) {
    items {
      id
      tableId
      table {
        id
        name
        code
        scope
      }
      matchType
      gszRecordId
      gszSynced
      gszError
      gszSyncedAt
      mode
      format
      startedAt
      endedAt
      terminationReason
      players {
        userId
        nickname
        seat
        finalScore
      }
      playersJson
      unsyncableReasons {
        nickname
        userId
        reason
      }
    }
    pageInfo {
      offset
      limit
      total
      nextCursor
      hasMore
    }
  }
}
    `;

/**
 * __useManagedMahjongMatchesQuery__
 *
 * To run a query within a React component, call `useManagedMahjongMatchesQuery` and pass it any options that fit your needs.
 * When your component renders, `useManagedMahjongMatchesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useManagedMahjongMatchesQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *   },
 * });
 */
export function useManagedMahjongMatchesQuery(baseOptions?: Apollo.QueryHookOptions<Types.ManagedMahjongMatchesQuery, Types.ManagedMahjongMatchesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.ManagedMahjongMatchesQuery, Types.ManagedMahjongMatchesQueryVariables>(ManagedMahjongMatchesDocument, options);
      }
export function useManagedMahjongMatchesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.ManagedMahjongMatchesQuery, Types.ManagedMahjongMatchesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.ManagedMahjongMatchesQuery, Types.ManagedMahjongMatchesQueryVariables>(ManagedMahjongMatchesDocument, options);
        }
// @ts-ignore
export function useManagedMahjongMatchesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.ManagedMahjongMatchesQuery, Types.ManagedMahjongMatchesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.ManagedMahjongMatchesQuery, Types.ManagedMahjongMatchesQueryVariables>;
export function useManagedMahjongMatchesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.ManagedMahjongMatchesQuery, Types.ManagedMahjongMatchesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.ManagedMahjongMatchesQuery | undefined, Types.ManagedMahjongMatchesQueryVariables>;
export function useManagedMahjongMatchesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.ManagedMahjongMatchesQuery, Types.ManagedMahjongMatchesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.ManagedMahjongMatchesQuery, Types.ManagedMahjongMatchesQueryVariables>(ManagedMahjongMatchesDocument, options);
        }
export type ManagedMahjongMatchesQueryHookResult = ReturnType<typeof useManagedMahjongMatchesQuery>;
export type ManagedMahjongMatchesLazyQueryHookResult = ReturnType<typeof useManagedMahjongMatchesLazyQuery>;
export type ManagedMahjongMatchesSuspenseQueryHookResult = ReturnType<typeof useManagedMahjongMatchesSuspenseQuery>;
export type ManagedMahjongMatchesQueryResult = Apollo.QueryResult<Types.ManagedMahjongMatchesQuery, Types.ManagedMahjongMatchesQueryVariables>;
export const ActiveMahjongMatchesDocument = gql`
    query ActiveMahjongMatches {
  activeMahjongMatches {
    tableCode
    tableName
    tableId
    phase
    matchType
    mode
    format
    players {
      userId
      nickname
      seat
      currentPoints
    }
    startedAt
  }
}
    `;

/**
 * __useActiveMahjongMatchesQuery__
 *
 * To run a query within a React component, call `useActiveMahjongMatchesQuery` and pass it any options that fit your needs.
 * When your component renders, `useActiveMahjongMatchesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useActiveMahjongMatchesQuery({
 *   variables: {
 *   },
 * });
 */
export function useActiveMahjongMatchesQuery(baseOptions?: Apollo.QueryHookOptions<Types.ActiveMahjongMatchesQuery, Types.ActiveMahjongMatchesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.ActiveMahjongMatchesQuery, Types.ActiveMahjongMatchesQueryVariables>(ActiveMahjongMatchesDocument, options);
      }
export function useActiveMahjongMatchesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.ActiveMahjongMatchesQuery, Types.ActiveMahjongMatchesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.ActiveMahjongMatchesQuery, Types.ActiveMahjongMatchesQueryVariables>(ActiveMahjongMatchesDocument, options);
        }
// @ts-ignore
export function useActiveMahjongMatchesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.ActiveMahjongMatchesQuery, Types.ActiveMahjongMatchesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.ActiveMahjongMatchesQuery, Types.ActiveMahjongMatchesQueryVariables>;
export function useActiveMahjongMatchesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.ActiveMahjongMatchesQuery, Types.ActiveMahjongMatchesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.ActiveMahjongMatchesQuery | undefined, Types.ActiveMahjongMatchesQueryVariables>;
export function useActiveMahjongMatchesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.ActiveMahjongMatchesQuery, Types.ActiveMahjongMatchesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.ActiveMahjongMatchesQuery, Types.ActiveMahjongMatchesQueryVariables>(ActiveMahjongMatchesDocument, options);
        }
export type ActiveMahjongMatchesQueryHookResult = ReturnType<typeof useActiveMahjongMatchesQuery>;
export type ActiveMahjongMatchesLazyQueryHookResult = ReturnType<typeof useActiveMahjongMatchesLazyQuery>;
export type ActiveMahjongMatchesSuspenseQueryHookResult = ReturnType<typeof useActiveMahjongMatchesSuspenseQuery>;
export type ActiveMahjongMatchesQueryResult = Apollo.QueryResult<Types.ActiveMahjongMatchesQuery, Types.ActiveMahjongMatchesQueryVariables>;
export const MahjongTablesDocument = gql`
    query MahjongTables {
  mahjongTables {
    id
    name
    code
  }
}
    `;

/**
 * __useMahjongTablesQuery__
 *
 * To run a query within a React component, call `useMahjongTablesQuery` and pass it any options that fit your needs.
 * When your component renders, `useMahjongTablesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMahjongTablesQuery({
 *   variables: {
 *   },
 * });
 */
export function useMahjongTablesQuery(baseOptions?: Apollo.QueryHookOptions<Types.MahjongTablesQuery, Types.MahjongTablesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.MahjongTablesQuery, Types.MahjongTablesQueryVariables>(MahjongTablesDocument, options);
      }
export function useMahjongTablesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.MahjongTablesQuery, Types.MahjongTablesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.MahjongTablesQuery, Types.MahjongTablesQueryVariables>(MahjongTablesDocument, options);
        }
// @ts-ignore
export function useMahjongTablesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.MahjongTablesQuery, Types.MahjongTablesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.MahjongTablesQuery, Types.MahjongTablesQueryVariables>;
export function useMahjongTablesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.MahjongTablesQuery, Types.MahjongTablesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.MahjongTablesQuery | undefined, Types.MahjongTablesQueryVariables>;
export function useMahjongTablesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.MahjongTablesQuery, Types.MahjongTablesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.MahjongTablesQuery, Types.MahjongTablesQueryVariables>(MahjongTablesDocument, options);
        }
export type MahjongTablesQueryHookResult = ReturnType<typeof useMahjongTablesQuery>;
export type MahjongTablesLazyQueryHookResult = ReturnType<typeof useMahjongTablesLazyQuery>;
export type MahjongTablesSuspenseQueryHookResult = ReturnType<typeof useMahjongTablesSuspenseQuery>;
export type MahjongTablesQueryResult = Apollo.QueryResult<Types.MahjongTablesQuery, Types.MahjongTablesQueryVariables>;
export const MediaObjectsDocument = gql`
    query MediaObjects($input: MediaListInput = {}) {
  mediaObjects(input: $input) {
    items {
      key
      name
      contentType
      size
      uploaded
      url
    }
    truncated
    cursor
  }
}
    `;

/**
 * __useMediaObjectsQuery__
 *
 * To run a query within a React component, call `useMediaObjectsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMediaObjectsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMediaObjectsQuery({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useMediaObjectsQuery(baseOptions?: Apollo.QueryHookOptions<Types.MediaObjectsQuery, Types.MediaObjectsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.MediaObjectsQuery, Types.MediaObjectsQueryVariables>(MediaObjectsDocument, options);
      }
export function useMediaObjectsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.MediaObjectsQuery, Types.MediaObjectsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.MediaObjectsQuery, Types.MediaObjectsQueryVariables>(MediaObjectsDocument, options);
        }
// @ts-ignore
export function useMediaObjectsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.MediaObjectsQuery, Types.MediaObjectsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.MediaObjectsQuery, Types.MediaObjectsQueryVariables>;
export function useMediaObjectsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.MediaObjectsQuery, Types.MediaObjectsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.MediaObjectsQuery | undefined, Types.MediaObjectsQueryVariables>;
export function useMediaObjectsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.MediaObjectsQuery, Types.MediaObjectsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.MediaObjectsQuery, Types.MediaObjectsQueryVariables>(MediaObjectsDocument, options);
        }
export type MediaObjectsQueryHookResult = ReturnType<typeof useMediaObjectsQuery>;
export type MediaObjectsLazyQueryHookResult = ReturnType<typeof useMediaObjectsLazyQuery>;
export type MediaObjectsSuspenseQueryHookResult = ReturnType<typeof useMediaObjectsSuspenseQuery>;
export type MediaObjectsQueryResult = Apollo.QueryResult<Types.MediaObjectsQuery, Types.MediaObjectsQueryVariables>;
export const RenameMediaObjectDocument = gql`
    mutation RenameMediaObject($oldKey: String!, $newName: String!) {
  renameMediaObject(oldKey: $oldKey, newName: $newName) {
    key
    name
    contentType
    size
    uploaded
    url
  }
}
    `;
export type RenameMediaObjectMutationFn = Apollo.MutationFunction<Types.RenameMediaObjectMutation, Types.RenameMediaObjectMutationVariables>;

/**
 * __useRenameMediaObjectMutation__
 *
 * To run a mutation, you first call `useRenameMediaObjectMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRenameMediaObjectMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [renameMediaObjectMutation, { data, loading, error }] = useRenameMediaObjectMutation({
 *   variables: {
 *      oldKey: // value for 'oldKey'
 *      newName: // value for 'newName'
 *   },
 * });
 */
export function useRenameMediaObjectMutation(baseOptions?: Apollo.MutationHookOptions<Types.RenameMediaObjectMutation, Types.RenameMediaObjectMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.RenameMediaObjectMutation, Types.RenameMediaObjectMutationVariables>(RenameMediaObjectDocument, options);
      }
export type RenameMediaObjectMutationHookResult = ReturnType<typeof useRenameMediaObjectMutation>;
export type RenameMediaObjectMutationResult = Apollo.MutationResult<Types.RenameMediaObjectMutation>;
export type RenameMediaObjectMutationOptions = Apollo.BaseMutationOptions<Types.RenameMediaObjectMutation, Types.RenameMediaObjectMutationVariables>;
export const RemoveMediaObjectDocument = gql`
    mutation RemoveMediaObject($key: String!) {
  removeMediaObject(key: $key) {
    key
    name
    contentType
    size
    uploaded
    url
  }
}
    `;
export type RemoveMediaObjectMutationFn = Apollo.MutationFunction<Types.RemoveMediaObjectMutation, Types.RemoveMediaObjectMutationVariables>;

/**
 * __useRemoveMediaObjectMutation__
 *
 * To run a mutation, you first call `useRemoveMediaObjectMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveMediaObjectMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeMediaObjectMutation, { data, loading, error }] = useRemoveMediaObjectMutation({
 *   variables: {
 *      key: // value for 'key'
 *   },
 * });
 */
export function useRemoveMediaObjectMutation(baseOptions?: Apollo.MutationHookOptions<Types.RemoveMediaObjectMutation, Types.RemoveMediaObjectMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.RemoveMediaObjectMutation, Types.RemoveMediaObjectMutationVariables>(RemoveMediaObjectDocument, options);
      }
export type RemoveMediaObjectMutationHookResult = ReturnType<typeof useRemoveMediaObjectMutation>;
export type RemoveMediaObjectMutationResult = Apollo.MutationResult<Types.RemoveMediaObjectMutation>;
export type RemoveMediaObjectMutationOptions = Apollo.BaseMutationOptions<Types.RemoveMediaObjectMutation, Types.RemoveMediaObjectMutationVariables>;
export const OrdersDocument = gql`
    query Orders($input: OrderListInput = {}, $filter: OrderFilterInput) {
  orders(input: $input, filter: $filter) {
    items {
      id
      tableId
      userId
      tempId
      nickname
      uid
      phone
      seats
      status
      startAt
      endAt
      finalPrice
      pricingSnapshotId
      table {
        id
        name
        code
        scope
      }
    }
    pageInfo {
      offset
      limit
      total
      nextCursor
      hasMore
    }
  }
}
    `;

/**
 * __useOrdersQuery__
 *
 * To run a query within a React component, call `useOrdersQuery` and pass it any options that fit your needs.
 * When your component renders, `useOrdersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOrdersQuery({
 *   variables: {
 *      input: // value for 'input'
 *      filter: // value for 'filter'
 *   },
 * });
 */
export function useOrdersQuery(baseOptions?: Apollo.QueryHookOptions<Types.OrdersQuery, Types.OrdersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.OrdersQuery, Types.OrdersQueryVariables>(OrdersDocument, options);
      }
export function useOrdersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.OrdersQuery, Types.OrdersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.OrdersQuery, Types.OrdersQueryVariables>(OrdersDocument, options);
        }
// @ts-ignore
export function useOrdersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.OrdersQuery, Types.OrdersQueryVariables>): Apollo.UseSuspenseQueryResult<Types.OrdersQuery, Types.OrdersQueryVariables>;
export function useOrdersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.OrdersQuery, Types.OrdersQueryVariables>): Apollo.UseSuspenseQueryResult<Types.OrdersQuery | undefined, Types.OrdersQueryVariables>;
export function useOrdersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.OrdersQuery, Types.OrdersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.OrdersQuery, Types.OrdersQueryVariables>(OrdersDocument, options);
        }
export type OrdersQueryHookResult = ReturnType<typeof useOrdersQuery>;
export type OrdersLazyQueryHookResult = ReturnType<typeof useOrdersLazyQuery>;
export type OrdersSuspenseQueryHookResult = ReturnType<typeof useOrdersSuspenseQuery>;
export type OrdersQueryResult = Apollo.QueryResult<Types.OrdersQuery, Types.OrdersQueryVariables>;
export const OrderDocument = gql`
    query Order($id: ID!) {
  order(id: $id) {
    id
    tableId
    userId
    tempId
    nickname
    uid
    phone
    seats
    status
    startAt
    endAt
    finalPrice
    pricingSnapshotId
    priceBreakdown
    settlementSnapshot
    table {
      id
      name
      code
      scope
    }
    user {
      id
      uid
      name
      nickname
      role
    }
  }
}
    `;

/**
 * __useOrderQuery__
 *
 * To run a query within a React component, call `useOrderQuery` and pass it any options that fit your needs.
 * When your component renders, `useOrderQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOrderQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useOrderQuery(baseOptions: Apollo.QueryHookOptions<Types.OrderQuery, Types.OrderQueryVariables> & ({ variables: Types.OrderQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.OrderQuery, Types.OrderQueryVariables>(OrderDocument, options);
      }
export function useOrderLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.OrderQuery, Types.OrderQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.OrderQuery, Types.OrderQueryVariables>(OrderDocument, options);
        }
// @ts-ignore
export function useOrderSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.OrderQuery, Types.OrderQueryVariables>): Apollo.UseSuspenseQueryResult<Types.OrderQuery, Types.OrderQueryVariables>;
export function useOrderSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.OrderQuery, Types.OrderQueryVariables>): Apollo.UseSuspenseQueryResult<Types.OrderQuery | undefined, Types.OrderQueryVariables>;
export function useOrderSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.OrderQuery, Types.OrderQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.OrderQuery, Types.OrderQueryVariables>(OrderDocument, options);
        }
export type OrderQueryHookResult = ReturnType<typeof useOrderQuery>;
export type OrderLazyQueryHookResult = ReturnType<typeof useOrderLazyQuery>;
export type OrderSuspenseQueryHookResult = ReturnType<typeof useOrderSuspenseQuery>;
export type OrderQueryResult = Apollo.QueryResult<Types.OrderQuery, Types.OrderQueryVariables>;
export const SettlementPreviewDocument = gql`
    query SettlementPreview($id: ID!) {
  settlementPreview(id: $id) {
    order {
      id
      tableId
      userId
      tempId
      nickname
      uid
      status
      startAt
      endAt
      finalPrice
      table {
        id
        name
        code
        scope
      }
    }
    totalMinutes
    pausedMinutes
    billableMinutes
    finalPrice
    priceBreakdown {
      planName
      planType
      billingType
      unitPrice
      totalMinutes
      billableHalfHours
      rawPrice
      capApplied
      capType
      finalPrice
    }
    membership {
      hasTimePlan
      timePlanActive
      timePlanType
      timePlanEndDate
      storedValueBalance
    }
    pauseLogs {
      pausedAt
      resumedAt
    }
    pricingPlans {
      name
      planType
      billingType
      price
      matched
    }
    recentOrders {
      id
      tableName
      startAt
      endAt
      finalPrice
      status
    }
  }
}
    `;

/**
 * __useSettlementPreviewQuery__
 *
 * To run a query within a React component, call `useSettlementPreviewQuery` and pass it any options that fit your needs.
 * When your component renders, `useSettlementPreviewQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSettlementPreviewQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useSettlementPreviewQuery(baseOptions: Apollo.QueryHookOptions<Types.SettlementPreviewQuery, Types.SettlementPreviewQueryVariables> & ({ variables: Types.SettlementPreviewQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.SettlementPreviewQuery, Types.SettlementPreviewQueryVariables>(SettlementPreviewDocument, options);
      }
export function useSettlementPreviewLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.SettlementPreviewQuery, Types.SettlementPreviewQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.SettlementPreviewQuery, Types.SettlementPreviewQueryVariables>(SettlementPreviewDocument, options);
        }
// @ts-ignore
export function useSettlementPreviewSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.SettlementPreviewQuery, Types.SettlementPreviewQueryVariables>): Apollo.UseSuspenseQueryResult<Types.SettlementPreviewQuery, Types.SettlementPreviewQueryVariables>;
export function useSettlementPreviewSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.SettlementPreviewQuery, Types.SettlementPreviewQueryVariables>): Apollo.UseSuspenseQueryResult<Types.SettlementPreviewQuery | undefined, Types.SettlementPreviewQueryVariables>;
export function useSettlementPreviewSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.SettlementPreviewQuery, Types.SettlementPreviewQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.SettlementPreviewQuery, Types.SettlementPreviewQueryVariables>(SettlementPreviewDocument, options);
        }
export type SettlementPreviewQueryHookResult = ReturnType<typeof useSettlementPreviewQuery>;
export type SettlementPreviewLazyQueryHookResult = ReturnType<typeof useSettlementPreviewLazyQuery>;
export type SettlementPreviewSuspenseQueryHookResult = ReturnType<typeof useSettlementPreviewSuspenseQuery>;
export type SettlementPreviewQueryResult = Apollo.QueryResult<Types.SettlementPreviewQuery, Types.SettlementPreviewQueryVariables>;
export const BatchSettlementPreviewDocument = gql`
    mutation BatchSettlementPreview($ids: [ID!]!) {
  batchSettlementPreview(ids: $ids) {
    order {
      id
      tableId
      userId
      tempId
      nickname
      uid
      status
      startAt
      endAt
      finalPrice
      table {
        id
        name
        code
        scope
      }
    }
    totalMinutes
    pausedMinutes
    billableMinutes
    finalPrice
    priceBreakdown {
      planName
      planType
      billingType
      unitPrice
      totalMinutes
      billableHalfHours
      rawPrice
      capApplied
      capType
      finalPrice
    }
    membership {
      hasTimePlan
      timePlanActive
      timePlanType
      timePlanEndDate
      storedValueBalance
    }
    pauseLogs {
      pausedAt
      resumedAt
    }
    pricingPlans {
      name
      planType
      billingType
      price
      matched
    }
    recentOrders {
      id
      tableName
      startAt
      endAt
      finalPrice
      status
    }
  }
}
    `;
export type BatchSettlementPreviewMutationFn = Apollo.MutationFunction<Types.BatchSettlementPreviewMutation, Types.BatchSettlementPreviewMutationVariables>;

/**
 * __useBatchSettlementPreviewMutation__
 *
 * To run a mutation, you first call `useBatchSettlementPreviewMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useBatchSettlementPreviewMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [batchSettlementPreviewMutation, { data, loading, error }] = useBatchSettlementPreviewMutation({
 *   variables: {
 *      ids: // value for 'ids'
 *   },
 * });
 */
export function useBatchSettlementPreviewMutation(baseOptions?: Apollo.MutationHookOptions<Types.BatchSettlementPreviewMutation, Types.BatchSettlementPreviewMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.BatchSettlementPreviewMutation, Types.BatchSettlementPreviewMutationVariables>(BatchSettlementPreviewDocument, options);
      }
export type BatchSettlementPreviewMutationHookResult = ReturnType<typeof useBatchSettlementPreviewMutation>;
export type BatchSettlementPreviewMutationResult = Apollo.MutationResult<Types.BatchSettlementPreviewMutation>;
export type BatchSettlementPreviewMutationOptions = Apollo.BaseMutationOptions<Types.BatchSettlementPreviewMutation, Types.BatchSettlementPreviewMutationVariables>;
export const PauseOrderDocument = gql`
    mutation PauseOrder($id: ID!) {
  pauseOrder(id: $id) {
    id
    status
  }
}
    `;
export type PauseOrderMutationFn = Apollo.MutationFunction<Types.PauseOrderMutation, Types.PauseOrderMutationVariables>;

/**
 * __usePauseOrderMutation__
 *
 * To run a mutation, you first call `usePauseOrderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePauseOrderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pauseOrderMutation, { data, loading, error }] = usePauseOrderMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function usePauseOrderMutation(baseOptions?: Apollo.MutationHookOptions<Types.PauseOrderMutation, Types.PauseOrderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.PauseOrderMutation, Types.PauseOrderMutationVariables>(PauseOrderDocument, options);
      }
export type PauseOrderMutationHookResult = ReturnType<typeof usePauseOrderMutation>;
export type PauseOrderMutationResult = Apollo.MutationResult<Types.PauseOrderMutation>;
export type PauseOrderMutationOptions = Apollo.BaseMutationOptions<Types.PauseOrderMutation, Types.PauseOrderMutationVariables>;
export const ResumeOrderDocument = gql`
    mutation ResumeOrder($id: ID!) {
  resumeOrder(id: $id) {
    id
    status
  }
}
    `;
export type ResumeOrderMutationFn = Apollo.MutationFunction<Types.ResumeOrderMutation, Types.ResumeOrderMutationVariables>;

/**
 * __useResumeOrderMutation__
 *
 * To run a mutation, you first call `useResumeOrderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResumeOrderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resumeOrderMutation, { data, loading, error }] = useResumeOrderMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useResumeOrderMutation(baseOptions?: Apollo.MutationHookOptions<Types.ResumeOrderMutation, Types.ResumeOrderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.ResumeOrderMutation, Types.ResumeOrderMutationVariables>(ResumeOrderDocument, options);
      }
export type ResumeOrderMutationHookResult = ReturnType<typeof useResumeOrderMutation>;
export type ResumeOrderMutationResult = Apollo.MutationResult<Types.ResumeOrderMutation>;
export type ResumeOrderMutationOptions = Apollo.BaseMutationOptions<Types.ResumeOrderMutation, Types.ResumeOrderMutationVariables>;
export const EndOrderDocument = gql`
    mutation EndOrder($id: ID!) {
  endOrder(id: $id) {
    id
    status
    endAt
  }
}
    `;
export type EndOrderMutationFn = Apollo.MutationFunction<Types.EndOrderMutation, Types.EndOrderMutationVariables>;

/**
 * __useEndOrderMutation__
 *
 * To run a mutation, you first call `useEndOrderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEndOrderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [endOrderMutation, { data, loading, error }] = useEndOrderMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useEndOrderMutation(baseOptions?: Apollo.MutationHookOptions<Types.EndOrderMutation, Types.EndOrderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.EndOrderMutation, Types.EndOrderMutationVariables>(EndOrderDocument, options);
      }
export type EndOrderMutationHookResult = ReturnType<typeof useEndOrderMutation>;
export type EndOrderMutationResult = Apollo.MutationResult<Types.EndOrderMutation>;
export type EndOrderMutationOptions = Apollo.BaseMutationOptions<Types.EndOrderMutation, Types.EndOrderMutationVariables>;
export const SettleOrderDocument = gql`
    mutation SettleOrder($input: SettleOrderInput!) {
  settleOrder(input: $input) {
    order {
      id
      status
      finalPrice
    }
    price
    snapshot
    storedValueDeduction {
      deducted
      amount
      note
      balanceBefore
      balanceAfter
    }
  }
}
    `;
export type SettleOrderMutationFn = Apollo.MutationFunction<Types.SettleOrderMutation, Types.SettleOrderMutationVariables>;

/**
 * __useSettleOrderMutation__
 *
 * To run a mutation, you first call `useSettleOrderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSettleOrderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [settleOrderMutation, { data, loading, error }] = useSettleOrderMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSettleOrderMutation(baseOptions?: Apollo.MutationHookOptions<Types.SettleOrderMutation, Types.SettleOrderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.SettleOrderMutation, Types.SettleOrderMutationVariables>(SettleOrderDocument, options);
      }
export type SettleOrderMutationHookResult = ReturnType<typeof useSettleOrderMutation>;
export type SettleOrderMutationResult = Apollo.MutationResult<Types.SettleOrderMutation>;
export type SettleOrderMutationOptions = Apollo.BaseMutationOptions<Types.SettleOrderMutation, Types.SettleOrderMutationVariables>;
export const BatchSettleOrdersDocument = gql`
    mutation BatchSettleOrders($input: BatchSettleInput!) {
  batchSettleOrders(input: $input) {
    batchId
    results {
      id
      success
      price
      restored
      error
    }
  }
}
    `;
export type BatchSettleOrdersMutationFn = Apollo.MutationFunction<Types.BatchSettleOrdersMutation, Types.BatchSettleOrdersMutationVariables>;

/**
 * __useBatchSettleOrdersMutation__
 *
 * To run a mutation, you first call `useBatchSettleOrdersMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useBatchSettleOrdersMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [batchSettleOrdersMutation, { data, loading, error }] = useBatchSettleOrdersMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useBatchSettleOrdersMutation(baseOptions?: Apollo.MutationHookOptions<Types.BatchSettleOrdersMutation, Types.BatchSettleOrdersMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.BatchSettleOrdersMutation, Types.BatchSettleOrdersMutationVariables>(BatchSettleOrdersDocument, options);
      }
export type BatchSettleOrdersMutationHookResult = ReturnType<typeof useBatchSettleOrdersMutation>;
export type BatchSettleOrdersMutationResult = Apollo.MutationResult<Types.BatchSettleOrdersMutation>;
export type BatchSettleOrdersMutationOptions = Apollo.BaseMutationOptions<Types.BatchSettleOrdersMutation, Types.BatchSettleOrdersMutationVariables>;
export const CancelBatchSettlementDocument = gql`
    mutation CancelBatchSettlement($ids: [ID!]!) {
  cancelBatchSettlement(ids: $ids) {
    id
    success
    restored
    error
  }
}
    `;
export type CancelBatchSettlementMutationFn = Apollo.MutationFunction<Types.CancelBatchSettlementMutation, Types.CancelBatchSettlementMutationVariables>;

/**
 * __useCancelBatchSettlementMutation__
 *
 * To run a mutation, you first call `useCancelBatchSettlementMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCancelBatchSettlementMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [cancelBatchSettlementMutation, { data, loading, error }] = useCancelBatchSettlementMutation({
 *   variables: {
 *      ids: // value for 'ids'
 *   },
 * });
 */
export function useCancelBatchSettlementMutation(baseOptions?: Apollo.MutationHookOptions<Types.CancelBatchSettlementMutation, Types.CancelBatchSettlementMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.CancelBatchSettlementMutation, Types.CancelBatchSettlementMutationVariables>(CancelBatchSettlementDocument, options);
      }
export type CancelBatchSettlementMutationHookResult = ReturnType<typeof useCancelBatchSettlementMutation>;
export type CancelBatchSettlementMutationResult = Apollo.MutationResult<Types.CancelBatchSettlementMutation>;
export type CancelBatchSettlementMutationOptions = Apollo.BaseMutationOptions<Types.CancelBatchSettlementMutation, Types.CancelBatchSettlementMutationVariables>;
export const BatchPauseOrdersDocument = gql`
    mutation BatchPauseOrders($ids: [ID!]!) {
  batchPauseOrders(ids: $ids) {
    id
    success
    error
  }
}
    `;
export type BatchPauseOrdersMutationFn = Apollo.MutationFunction<Types.BatchPauseOrdersMutation, Types.BatchPauseOrdersMutationVariables>;

/**
 * __useBatchPauseOrdersMutation__
 *
 * To run a mutation, you first call `useBatchPauseOrdersMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useBatchPauseOrdersMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [batchPauseOrdersMutation, { data, loading, error }] = useBatchPauseOrdersMutation({
 *   variables: {
 *      ids: // value for 'ids'
 *   },
 * });
 */
export function useBatchPauseOrdersMutation(baseOptions?: Apollo.MutationHookOptions<Types.BatchPauseOrdersMutation, Types.BatchPauseOrdersMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.BatchPauseOrdersMutation, Types.BatchPauseOrdersMutationVariables>(BatchPauseOrdersDocument, options);
      }
export type BatchPauseOrdersMutationHookResult = ReturnType<typeof useBatchPauseOrdersMutation>;
export type BatchPauseOrdersMutationResult = Apollo.MutationResult<Types.BatchPauseOrdersMutation>;
export type BatchPauseOrdersMutationOptions = Apollo.BaseMutationOptions<Types.BatchPauseOrdersMutation, Types.BatchPauseOrdersMutationVariables>;
export const BatchResumeOrdersDocument = gql`
    mutation BatchResumeOrders($ids: [ID!]!) {
  batchResumeOrders(ids: $ids) {
    id
    success
    error
  }
}
    `;
export type BatchResumeOrdersMutationFn = Apollo.MutationFunction<Types.BatchResumeOrdersMutation, Types.BatchResumeOrdersMutationVariables>;

/**
 * __useBatchResumeOrdersMutation__
 *
 * To run a mutation, you first call `useBatchResumeOrdersMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useBatchResumeOrdersMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [batchResumeOrdersMutation, { data, loading, error }] = useBatchResumeOrdersMutation({
 *   variables: {
 *      ids: // value for 'ids'
 *   },
 * });
 */
export function useBatchResumeOrdersMutation(baseOptions?: Apollo.MutationHookOptions<Types.BatchResumeOrdersMutation, Types.BatchResumeOrdersMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.BatchResumeOrdersMutation, Types.BatchResumeOrdersMutationVariables>(BatchResumeOrdersDocument, options);
      }
export type BatchResumeOrdersMutationHookResult = ReturnType<typeof useBatchResumeOrdersMutation>;
export type BatchResumeOrdersMutationResult = Apollo.MutationResult<Types.BatchResumeOrdersMutation>;
export type BatchResumeOrdersMutationOptions = Apollo.BaseMutationOptions<Types.BatchResumeOrdersMutation, Types.BatchResumeOrdersMutationVariables>;
export const PublishedPricingDocument = gql`
    query PublishedPricing($storeId: ID) {
  publishedPricing(storeId: $storeId) {
    id
    data {
      config {
        daytimeStart
        daytimeEnd
      }
      plans
    }
  }
}
    `;

/**
 * __usePublishedPricingQuery__
 *
 * To run a query within a React component, call `usePublishedPricingQuery` and pass it any options that fit your needs.
 * When your component renders, `usePublishedPricingQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePublishedPricingQuery({
 *   variables: {
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function usePublishedPricingQuery(baseOptions?: Apollo.QueryHookOptions<Types.PublishedPricingQuery, Types.PublishedPricingQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.PublishedPricingQuery, Types.PublishedPricingQueryVariables>(PublishedPricingDocument, options);
      }
export function usePublishedPricingLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.PublishedPricingQuery, Types.PublishedPricingQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.PublishedPricingQuery, Types.PublishedPricingQueryVariables>(PublishedPricingDocument, options);
        }
// @ts-ignore
export function usePublishedPricingSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.PublishedPricingQuery, Types.PublishedPricingQueryVariables>): Apollo.UseSuspenseQueryResult<Types.PublishedPricingQuery, Types.PublishedPricingQueryVariables>;
export function usePublishedPricingSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.PublishedPricingQuery, Types.PublishedPricingQueryVariables>): Apollo.UseSuspenseQueryResult<Types.PublishedPricingQuery | undefined, Types.PublishedPricingQueryVariables>;
export function usePublishedPricingSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.PublishedPricingQuery, Types.PublishedPricingQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.PublishedPricingQuery, Types.PublishedPricingQueryVariables>(PublishedPricingDocument, options);
        }
export type PublishedPricingQueryHookResult = ReturnType<typeof usePublishedPricingQuery>;
export type PublishedPricingLazyQueryHookResult = ReturnType<typeof usePublishedPricingLazyQuery>;
export type PublishedPricingSuspenseQueryHookResult = ReturnType<typeof usePublishedPricingSuspenseQuery>;
export type PublishedPricingQueryResult = Apollo.QueryResult<Types.PublishedPricingQuery, Types.PublishedPricingQueryVariables>;
export const OrderStatusChangedDocument = gql`
    subscription OrderStatusChanged($orderId: ID, $tableId: ID, $storeId: ID) {
  orderStatusChanged(orderId: $orderId, tableId: $tableId, storeId: $storeId) {
    order {
      id
      tableId
      userId
      tempId
      nickname
      uid
      phone
      seats
      status
      startAt
      endAt
      finalPrice
      table {
        id
        name
        code
        scope
      }
    }
    previousStatus
    currentStatus
    updatedAt
  }
}
    `;

/**
 * __useOrderStatusChangedSubscription__
 *
 * To run a query within a React component, call `useOrderStatusChangedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useOrderStatusChangedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOrderStatusChangedSubscription({
 *   variables: {
 *      orderId: // value for 'orderId'
 *      tableId: // value for 'tableId'
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function useOrderStatusChangedSubscription(baseOptions?: Apollo.SubscriptionHookOptions<Types.OrderStatusChangedSubscription, Types.OrderStatusChangedSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<Types.OrderStatusChangedSubscription, Types.OrderStatusChangedSubscriptionVariables>(OrderStatusChangedDocument, options);
      }
export type OrderStatusChangedSubscriptionHookResult = ReturnType<typeof useOrderStatusChangedSubscription>;
export type OrderStatusChangedSubscriptionResult = Apollo.SubscriptionResult<Types.OrderStatusChangedSubscription>;
export const PricingDraftDocument = gql`
    query PricingDraft($storeId: ID) {
  pricingDraft(storeId: $storeId) {
    data {
      config {
        daytimeStart
        daytimeEnd
      }
      plans
    }
    snapshotId
    snapshotName
    status
  }
}
    `;

/**
 * __usePricingDraftQuery__
 *
 * To run a query within a React component, call `usePricingDraftQuery` and pass it any options that fit your needs.
 * When your component renders, `usePricingDraftQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePricingDraftQuery({
 *   variables: {
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function usePricingDraftQuery(baseOptions?: Apollo.QueryHookOptions<Types.PricingDraftQuery, Types.PricingDraftQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.PricingDraftQuery, Types.PricingDraftQueryVariables>(PricingDraftDocument, options);
      }
export function usePricingDraftLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.PricingDraftQuery, Types.PricingDraftQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.PricingDraftQuery, Types.PricingDraftQueryVariables>(PricingDraftDocument, options);
        }
// @ts-ignore
export function usePricingDraftSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.PricingDraftQuery, Types.PricingDraftQueryVariables>): Apollo.UseSuspenseQueryResult<Types.PricingDraftQuery, Types.PricingDraftQueryVariables>;
export function usePricingDraftSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.PricingDraftQuery, Types.PricingDraftQueryVariables>): Apollo.UseSuspenseQueryResult<Types.PricingDraftQuery | undefined, Types.PricingDraftQueryVariables>;
export function usePricingDraftSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.PricingDraftQuery, Types.PricingDraftQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.PricingDraftQuery, Types.PricingDraftQueryVariables>(PricingDraftDocument, options);
        }
export type PricingDraftQueryHookResult = ReturnType<typeof usePricingDraftQuery>;
export type PricingDraftLazyQueryHookResult = ReturnType<typeof usePricingDraftLazyQuery>;
export type PricingDraftSuspenseQueryHookResult = ReturnType<typeof usePricingDraftSuspenseQuery>;
export type PricingDraftQueryResult = Apollo.QueryResult<Types.PricingDraftQuery, Types.PricingDraftQueryVariables>;
export const PricingSnapshotsDocument = gql`
    query PricingSnapshots($storeId: ID) {
  pricingSnapshots(storeId: $storeId) {
    id
    name
    storeId
    data {
      config {
        daytimeStart
        daytimeEnd
      }
      plans
    }
    status
    summary
    createdAt
    publishedAt
  }
}
    `;

/**
 * __usePricingSnapshotsQuery__
 *
 * To run a query within a React component, call `usePricingSnapshotsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePricingSnapshotsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePricingSnapshotsQuery({
 *   variables: {
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function usePricingSnapshotsQuery(baseOptions?: Apollo.QueryHookOptions<Types.PricingSnapshotsQuery, Types.PricingSnapshotsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.PricingSnapshotsQuery, Types.PricingSnapshotsQueryVariables>(PricingSnapshotsDocument, options);
      }
export function usePricingSnapshotsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.PricingSnapshotsQuery, Types.PricingSnapshotsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.PricingSnapshotsQuery, Types.PricingSnapshotsQueryVariables>(PricingSnapshotsDocument, options);
        }
// @ts-ignore
export function usePricingSnapshotsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.PricingSnapshotsQuery, Types.PricingSnapshotsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.PricingSnapshotsQuery, Types.PricingSnapshotsQueryVariables>;
export function usePricingSnapshotsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.PricingSnapshotsQuery, Types.PricingSnapshotsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.PricingSnapshotsQuery | undefined, Types.PricingSnapshotsQueryVariables>;
export function usePricingSnapshotsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.PricingSnapshotsQuery, Types.PricingSnapshotsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.PricingSnapshotsQuery, Types.PricingSnapshotsQueryVariables>(PricingSnapshotsDocument, options);
        }
export type PricingSnapshotsQueryHookResult = ReturnType<typeof usePricingSnapshotsQuery>;
export type PricingSnapshotsLazyQueryHookResult = ReturnType<typeof usePricingSnapshotsLazyQuery>;
export type PricingSnapshotsSuspenseQueryHookResult = ReturnType<typeof usePricingSnapshotsSuspenseQuery>;
export type PricingSnapshotsQueryResult = Apollo.QueryResult<Types.PricingSnapshotsQuery, Types.PricingSnapshotsQueryVariables>;
export const PricingSnapshotDocument = gql`
    query PricingSnapshot($id: ID!) {
  pricingSnapshot(id: $id) {
    id
    name
    storeId
    data {
      config {
        daytimeStart
        daytimeEnd
      }
      plans
    }
    status
    summary
    createdAt
    publishedAt
  }
}
    `;

/**
 * __usePricingSnapshotQuery__
 *
 * To run a query within a React component, call `usePricingSnapshotQuery` and pass it any options that fit your needs.
 * When your component renders, `usePricingSnapshotQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePricingSnapshotQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function usePricingSnapshotQuery(baseOptions: Apollo.QueryHookOptions<Types.PricingSnapshotQuery, Types.PricingSnapshotQueryVariables> & ({ variables: Types.PricingSnapshotQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.PricingSnapshotQuery, Types.PricingSnapshotQueryVariables>(PricingSnapshotDocument, options);
      }
export function usePricingSnapshotLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.PricingSnapshotQuery, Types.PricingSnapshotQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.PricingSnapshotQuery, Types.PricingSnapshotQueryVariables>(PricingSnapshotDocument, options);
        }
// @ts-ignore
export function usePricingSnapshotSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.PricingSnapshotQuery, Types.PricingSnapshotQueryVariables>): Apollo.UseSuspenseQueryResult<Types.PricingSnapshotQuery, Types.PricingSnapshotQueryVariables>;
export function usePricingSnapshotSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.PricingSnapshotQuery, Types.PricingSnapshotQueryVariables>): Apollo.UseSuspenseQueryResult<Types.PricingSnapshotQuery | undefined, Types.PricingSnapshotQueryVariables>;
export function usePricingSnapshotSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.PricingSnapshotQuery, Types.PricingSnapshotQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.PricingSnapshotQuery, Types.PricingSnapshotQueryVariables>(PricingSnapshotDocument, options);
        }
export type PricingSnapshotQueryHookResult = ReturnType<typeof usePricingSnapshotQuery>;
export type PricingSnapshotLazyQueryHookResult = ReturnType<typeof usePricingSnapshotLazyQuery>;
export type PricingSnapshotSuspenseQueryHookResult = ReturnType<typeof usePricingSnapshotSuspenseQuery>;
export type PricingSnapshotQueryResult = Apollo.QueryResult<Types.PricingSnapshotQuery, Types.PricingSnapshotQueryVariables>;
export const SavePricingSnapshotDocument = gql`
    mutation SavePricingSnapshot($input: SavePricingSnapshotInput!) {
  savePricingSnapshot(input: $input) {
    id
    name
    storeId
    data {
      config {
        daytimeStart
        daytimeEnd
      }
      plans
    }
    status
    summary
    createdAt
    publishedAt
  }
}
    `;
export type SavePricingSnapshotMutationFn = Apollo.MutationFunction<Types.SavePricingSnapshotMutation, Types.SavePricingSnapshotMutationVariables>;

/**
 * __useSavePricingSnapshotMutation__
 *
 * To run a mutation, you first call `useSavePricingSnapshotMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSavePricingSnapshotMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [savePricingSnapshotMutation, { data, loading, error }] = useSavePricingSnapshotMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSavePricingSnapshotMutation(baseOptions?: Apollo.MutationHookOptions<Types.SavePricingSnapshotMutation, Types.SavePricingSnapshotMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.SavePricingSnapshotMutation, Types.SavePricingSnapshotMutationVariables>(SavePricingSnapshotDocument, options);
      }
export type SavePricingSnapshotMutationHookResult = ReturnType<typeof useSavePricingSnapshotMutation>;
export type SavePricingSnapshotMutationResult = Apollo.MutationResult<Types.SavePricingSnapshotMutation>;
export type SavePricingSnapshotMutationOptions = Apollo.BaseMutationOptions<Types.SavePricingSnapshotMutation, Types.SavePricingSnapshotMutationVariables>;
export const PublishPricingSnapshotDocument = gql`
    mutation PublishPricingSnapshot($storeId: ID) {
  publishPricingSnapshot(storeId: $storeId) {
    id
    name
    status
    publishedAt
  }
}
    `;
export type PublishPricingSnapshotMutationFn = Apollo.MutationFunction<Types.PublishPricingSnapshotMutation, Types.PublishPricingSnapshotMutationVariables>;

/**
 * __usePublishPricingSnapshotMutation__
 *
 * To run a mutation, you first call `usePublishPricingSnapshotMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePublishPricingSnapshotMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [publishPricingSnapshotMutation, { data, loading, error }] = usePublishPricingSnapshotMutation({
 *   variables: {
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function usePublishPricingSnapshotMutation(baseOptions?: Apollo.MutationHookOptions<Types.PublishPricingSnapshotMutation, Types.PublishPricingSnapshotMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.PublishPricingSnapshotMutation, Types.PublishPricingSnapshotMutationVariables>(PublishPricingSnapshotDocument, options);
      }
export type PublishPricingSnapshotMutationHookResult = ReturnType<typeof usePublishPricingSnapshotMutation>;
export type PublishPricingSnapshotMutationResult = Apollo.MutationResult<Types.PublishPricingSnapshotMutation>;
export type PublishPricingSnapshotMutationOptions = Apollo.BaseMutationOptions<Types.PublishPricingSnapshotMutation, Types.PublishPricingSnapshotMutationVariables>;
export const RestorePricingSnapshotDocument = gql`
    mutation RestorePricingSnapshot($id: ID!) {
  restorePricingSnapshot(id: $id) {
    id
    name
    data {
      config {
        daytimeStart
        daytimeEnd
      }
      plans
    }
    status
    summary
    createdAt
    publishedAt
  }
}
    `;
export type RestorePricingSnapshotMutationFn = Apollo.MutationFunction<Types.RestorePricingSnapshotMutation, Types.RestorePricingSnapshotMutationVariables>;

/**
 * __useRestorePricingSnapshotMutation__
 *
 * To run a mutation, you first call `useRestorePricingSnapshotMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRestorePricingSnapshotMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [restorePricingSnapshotMutation, { data, loading, error }] = useRestorePricingSnapshotMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRestorePricingSnapshotMutation(baseOptions?: Apollo.MutationHookOptions<Types.RestorePricingSnapshotMutation, Types.RestorePricingSnapshotMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.RestorePricingSnapshotMutation, Types.RestorePricingSnapshotMutationVariables>(RestorePricingSnapshotDocument, options);
      }
export type RestorePricingSnapshotMutationHookResult = ReturnType<typeof useRestorePricingSnapshotMutation>;
export type RestorePricingSnapshotMutationResult = Apollo.MutationResult<Types.RestorePricingSnapshotMutation>;
export type RestorePricingSnapshotMutationOptions = Apollo.BaseMutationOptions<Types.RestorePricingSnapshotMutation, Types.RestorePricingSnapshotMutationVariables>;
export const CaptchaSettingsDocument = gql`
    query CaptchaSettings {
  captchaSettings {
    enabled
    disabledUntil
    prefix
    sceneId
  }
}
    `;

/**
 * __useCaptchaSettingsQuery__
 *
 * To run a query within a React component, call `useCaptchaSettingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useCaptchaSettingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCaptchaSettingsQuery({
 *   variables: {
 *   },
 * });
 */
export function useCaptchaSettingsQuery(baseOptions?: Apollo.QueryHookOptions<Types.CaptchaSettingsQuery, Types.CaptchaSettingsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.CaptchaSettingsQuery, Types.CaptchaSettingsQueryVariables>(CaptchaSettingsDocument, options);
      }
export function useCaptchaSettingsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.CaptchaSettingsQuery, Types.CaptchaSettingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.CaptchaSettingsQuery, Types.CaptchaSettingsQueryVariables>(CaptchaSettingsDocument, options);
        }
// @ts-ignore
export function useCaptchaSettingsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.CaptchaSettingsQuery, Types.CaptchaSettingsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.CaptchaSettingsQuery, Types.CaptchaSettingsQueryVariables>;
export function useCaptchaSettingsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.CaptchaSettingsQuery, Types.CaptchaSettingsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.CaptchaSettingsQuery | undefined, Types.CaptchaSettingsQueryVariables>;
export function useCaptchaSettingsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.CaptchaSettingsQuery, Types.CaptchaSettingsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.CaptchaSettingsQuery, Types.CaptchaSettingsQueryVariables>(CaptchaSettingsDocument, options);
        }
export type CaptchaSettingsQueryHookResult = ReturnType<typeof useCaptchaSettingsQuery>;
export type CaptchaSettingsLazyQueryHookResult = ReturnType<typeof useCaptchaSettingsLazyQuery>;
export type CaptchaSettingsSuspenseQueryHookResult = ReturnType<typeof useCaptchaSettingsSuspenseQuery>;
export type CaptchaSettingsQueryResult = Apollo.QueryResult<Types.CaptchaSettingsQuery, Types.CaptchaSettingsQueryVariables>;
export const SetCaptchaEnabledDocument = gql`
    mutation SetCaptchaEnabled($enabled: Boolean!) {
  setCaptchaEnabled(enabled: $enabled) {
    enabled
    disabledUntil
  }
}
    `;
export type SetCaptchaEnabledMutationFn = Apollo.MutationFunction<Types.SetCaptchaEnabledMutation, Types.SetCaptchaEnabledMutationVariables>;

/**
 * __useSetCaptchaEnabledMutation__
 *
 * To run a mutation, you first call `useSetCaptchaEnabledMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetCaptchaEnabledMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setCaptchaEnabledMutation, { data, loading, error }] = useSetCaptchaEnabledMutation({
 *   variables: {
 *      enabled: // value for 'enabled'
 *   },
 * });
 */
export function useSetCaptchaEnabledMutation(baseOptions?: Apollo.MutationHookOptions<Types.SetCaptchaEnabledMutation, Types.SetCaptchaEnabledMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.SetCaptchaEnabledMutation, Types.SetCaptchaEnabledMutationVariables>(SetCaptchaEnabledDocument, options);
      }
export type SetCaptchaEnabledMutationHookResult = ReturnType<typeof useSetCaptchaEnabledMutation>;
export type SetCaptchaEnabledMutationResult = Apollo.MutationResult<Types.SetCaptchaEnabledMutation>;
export type SetCaptchaEnabledMutationOptions = Apollo.BaseMutationOptions<Types.SetCaptchaEnabledMutation, Types.SetCaptchaEnabledMutationVariables>;
export const ManagedTablesDocument = gql`
    query ManagedTables($filter: TableFilterInput) {
  managedTables(filter: $filter) {
    id
    name
    type
    scope
    status
    capacity
    code
    description
    storeId
    occupancies {
      id
      tableId
      userId
      nickname
      uid
      seats
      status
    }
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useManagedTablesQuery__
 *
 * To run a query within a React component, call `useManagedTablesQuery` and pass it any options that fit your needs.
 * When your component renders, `useManagedTablesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useManagedTablesQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *   },
 * });
 */
export function useManagedTablesQuery(baseOptions?: Apollo.QueryHookOptions<Types.ManagedTablesQuery, Types.ManagedTablesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.ManagedTablesQuery, Types.ManagedTablesQueryVariables>(ManagedTablesDocument, options);
      }
export function useManagedTablesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.ManagedTablesQuery, Types.ManagedTablesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.ManagedTablesQuery, Types.ManagedTablesQueryVariables>(ManagedTablesDocument, options);
        }
// @ts-ignore
export function useManagedTablesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.ManagedTablesQuery, Types.ManagedTablesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.ManagedTablesQuery, Types.ManagedTablesQueryVariables>;
export function useManagedTablesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.ManagedTablesQuery, Types.ManagedTablesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.ManagedTablesQuery | undefined, Types.ManagedTablesQueryVariables>;
export function useManagedTablesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.ManagedTablesQuery, Types.ManagedTablesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.ManagedTablesQuery, Types.ManagedTablesQueryVariables>(ManagedTablesDocument, options);
        }
export type ManagedTablesQueryHookResult = ReturnType<typeof useManagedTablesQuery>;
export type ManagedTablesLazyQueryHookResult = ReturnType<typeof useManagedTablesLazyQuery>;
export type ManagedTablesSuspenseQueryHookResult = ReturnType<typeof useManagedTablesSuspenseQuery>;
export type ManagedTablesQueryResult = Apollo.QueryResult<Types.ManagedTablesQuery, Types.ManagedTablesQueryVariables>;
export const ManagedTableDocument = gql`
    query ManagedTable($id: ID!) {
  managedTable(id: $id) {
    id
    name
    type
    scope
    status
    capacity
    code
    description
    storeId
    occupancies {
      id
      tableId
      userId
      nickname
      uid
      phone
      seats
      status
      startAt
      endAt
      finalPrice
    }
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useManagedTableQuery__
 *
 * To run a query within a React component, call `useManagedTableQuery` and pass it any options that fit your needs.
 * When your component renders, `useManagedTableQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useManagedTableQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useManagedTableQuery(baseOptions: Apollo.QueryHookOptions<Types.ManagedTableQuery, Types.ManagedTableQueryVariables> & ({ variables: Types.ManagedTableQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.ManagedTableQuery, Types.ManagedTableQueryVariables>(ManagedTableDocument, options);
      }
export function useManagedTableLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.ManagedTableQuery, Types.ManagedTableQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.ManagedTableQuery, Types.ManagedTableQueryVariables>(ManagedTableDocument, options);
        }
// @ts-ignore
export function useManagedTableSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.ManagedTableQuery, Types.ManagedTableQueryVariables>): Apollo.UseSuspenseQueryResult<Types.ManagedTableQuery, Types.ManagedTableQueryVariables>;
export function useManagedTableSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.ManagedTableQuery, Types.ManagedTableQueryVariables>): Apollo.UseSuspenseQueryResult<Types.ManagedTableQuery | undefined, Types.ManagedTableQueryVariables>;
export function useManagedTableSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.ManagedTableQuery, Types.ManagedTableQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.ManagedTableQuery, Types.ManagedTableQueryVariables>(ManagedTableDocument, options);
        }
export type ManagedTableQueryHookResult = ReturnType<typeof useManagedTableQuery>;
export type ManagedTableLazyQueryHookResult = ReturnType<typeof useManagedTableLazyQuery>;
export type ManagedTableSuspenseQueryHookResult = ReturnType<typeof useManagedTableSuspenseQuery>;
export type ManagedTableQueryResult = Apollo.QueryResult<Types.ManagedTableQuery, Types.ManagedTableQueryVariables>;
export const CreateTableDocument = gql`
    mutation CreateTable($input: CreateTableInput!) {
  createTable(input: $input) {
    id
    name
    type
    scope
    status
    capacity
    code
    occupancies {
      id
      tableId
      userId
      nickname
      uid
      seats
      status
    }
  }
}
    `;
export type CreateTableMutationFn = Apollo.MutationFunction<Types.CreateTableMutation, Types.CreateTableMutationVariables>;

/**
 * __useCreateTableMutation__
 *
 * To run a mutation, you first call `useCreateTableMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateTableMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createTableMutation, { data, loading, error }] = useCreateTableMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateTableMutation(baseOptions?: Apollo.MutationHookOptions<Types.CreateTableMutation, Types.CreateTableMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.CreateTableMutation, Types.CreateTableMutationVariables>(CreateTableDocument, options);
      }
export type CreateTableMutationHookResult = ReturnType<typeof useCreateTableMutation>;
export type CreateTableMutationResult = Apollo.MutationResult<Types.CreateTableMutation>;
export type CreateTableMutationOptions = Apollo.BaseMutationOptions<Types.CreateTableMutation, Types.CreateTableMutationVariables>;
export const UpdateTableDocument = gql`
    mutation UpdateTable($input: UpdateTableInput!) {
  updateTable(input: $input) {
    id
    name
    type
    scope
    status
    capacity
    description
  }
}
    `;
export type UpdateTableMutationFn = Apollo.MutationFunction<Types.UpdateTableMutation, Types.UpdateTableMutationVariables>;

/**
 * __useUpdateTableMutation__
 *
 * To run a mutation, you first call `useUpdateTableMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateTableMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateTableMutation, { data, loading, error }] = useUpdateTableMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateTableMutation(baseOptions?: Apollo.MutationHookOptions<Types.UpdateTableMutation, Types.UpdateTableMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.UpdateTableMutation, Types.UpdateTableMutationVariables>(UpdateTableDocument, options);
      }
export type UpdateTableMutationHookResult = ReturnType<typeof useUpdateTableMutation>;
export type UpdateTableMutationResult = Apollo.MutationResult<Types.UpdateTableMutation>;
export type UpdateTableMutationOptions = Apollo.BaseMutationOptions<Types.UpdateTableMutation, Types.UpdateTableMutationVariables>;
export const RemoveTableDocument = gql`
    mutation RemoveTable($id: ID!) {
  removeTable(id: $id) {
    id
  }
}
    `;
export type RemoveTableMutationFn = Apollo.MutationFunction<Types.RemoveTableMutation, Types.RemoveTableMutationVariables>;

/**
 * __useRemoveTableMutation__
 *
 * To run a mutation, you first call `useRemoveTableMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveTableMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeTableMutation, { data, loading, error }] = useRemoveTableMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRemoveTableMutation(baseOptions?: Apollo.MutationHookOptions<Types.RemoveTableMutation, Types.RemoveTableMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.RemoveTableMutation, Types.RemoveTableMutationVariables>(RemoveTableDocument, options);
      }
export type RemoveTableMutationHookResult = ReturnType<typeof useRemoveTableMutation>;
export type RemoveTableMutationResult = Apollo.MutationResult<Types.RemoveTableMutation>;
export type RemoveTableMutationOptions = Apollo.BaseMutationOptions<Types.RemoveTableMutation, Types.RemoveTableMutationVariables>;
export const ToggleTableStatusDocument = gql`
    mutation ToggleTableStatus($id: ID!) {
  toggleTableStatus(id: $id) {
    id
    status
  }
}
    `;
export type ToggleTableStatusMutationFn = Apollo.MutationFunction<Types.ToggleTableStatusMutation, Types.ToggleTableStatusMutationVariables>;

/**
 * __useToggleTableStatusMutation__
 *
 * To run a mutation, you first call `useToggleTableStatusMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useToggleTableStatusMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [toggleTableStatusMutation, { data, loading, error }] = useToggleTableStatusMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useToggleTableStatusMutation(baseOptions?: Apollo.MutationHookOptions<Types.ToggleTableStatusMutation, Types.ToggleTableStatusMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.ToggleTableStatusMutation, Types.ToggleTableStatusMutationVariables>(ToggleTableStatusDocument, options);
      }
export type ToggleTableStatusMutationHookResult = ReturnType<typeof useToggleTableStatusMutation>;
export type ToggleTableStatusMutationResult = Apollo.MutationResult<Types.ToggleTableStatusMutation>;
export type ToggleTableStatusMutationOptions = Apollo.BaseMutationOptions<Types.ToggleTableStatusMutation, Types.ToggleTableStatusMutationVariables>;
export const RegenerateTableCodeDocument = gql`
    mutation RegenerateTableCode($id: ID!) {
  regenerateTableCode(id: $id) {
    id
    code
  }
}
    `;
export type RegenerateTableCodeMutationFn = Apollo.MutationFunction<Types.RegenerateTableCodeMutation, Types.RegenerateTableCodeMutationVariables>;

/**
 * __useRegenerateTableCodeMutation__
 *
 * To run a mutation, you first call `useRegenerateTableCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRegenerateTableCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [regenerateTableCodeMutation, { data, loading, error }] = useRegenerateTableCodeMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRegenerateTableCodeMutation(baseOptions?: Apollo.MutationHookOptions<Types.RegenerateTableCodeMutation, Types.RegenerateTableCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.RegenerateTableCodeMutation, Types.RegenerateTableCodeMutationVariables>(RegenerateTableCodeDocument, options);
      }
export type RegenerateTableCodeMutationHookResult = ReturnType<typeof useRegenerateTableCodeMutation>;
export type RegenerateTableCodeMutationResult = Apollo.MutationResult<Types.RegenerateTableCodeMutation>;
export type RegenerateTableCodeMutationOptions = Apollo.BaseMutationOptions<Types.RegenerateTableCodeMutation, Types.RegenerateTableCodeMutationVariables>;
export const AddTableOccupancyDocument = gql`
    mutation AddTableOccupancy($input: AddOccupancyInput!) {
  addTableOccupancy(input: $input) {
    id
    tableId
    userId
    nickname
    uid
    status
  }
}
    `;
export type AddTableOccupancyMutationFn = Apollo.MutationFunction<Types.AddTableOccupancyMutation, Types.AddTableOccupancyMutationVariables>;

/**
 * __useAddTableOccupancyMutation__
 *
 * To run a mutation, you first call `useAddTableOccupancyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddTableOccupancyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addTableOccupancyMutation, { data, loading, error }] = useAddTableOccupancyMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddTableOccupancyMutation(baseOptions?: Apollo.MutationHookOptions<Types.AddTableOccupancyMutation, Types.AddTableOccupancyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.AddTableOccupancyMutation, Types.AddTableOccupancyMutationVariables>(AddTableOccupancyDocument, options);
      }
export type AddTableOccupancyMutationHookResult = ReturnType<typeof useAddTableOccupancyMutation>;
export type AddTableOccupancyMutationResult = Apollo.MutationResult<Types.AddTableOccupancyMutation>;
export type AddTableOccupancyMutationOptions = Apollo.BaseMutationOptions<Types.AddTableOccupancyMutation, Types.AddTableOccupancyMutationVariables>;
export const UsersDocument = gql`
    query Users($filter: UserFilterInput) {
  managedUsers(filter: $filter) {
    items {
      id
      uid
      name
      email
      image
      role
      disabled
      nickname
      phone
      points
      preferredLocale
      preferredStoreId
      preferredTheme
      meta
      createdAt
      membershipPlans {
        id
        userId
        planType
        amount
        note
        startDate
        endDate
        createdAt
        updatedAt
      }
    }
    pageInfo {
      offset
      limit
      total
      nextCursor
      hasMore
    }
  }
}
    `;

/**
 * __useUsersQuery__
 *
 * To run a query within a React component, call `useUsersQuery` and pass it any options that fit your needs.
 * When your component renders, `useUsersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUsersQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *   },
 * });
 */
export function useUsersQuery(baseOptions?: Apollo.QueryHookOptions<Types.UsersQuery, Types.UsersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.UsersQuery, Types.UsersQueryVariables>(UsersDocument, options);
      }
export function useUsersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.UsersQuery, Types.UsersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.UsersQuery, Types.UsersQueryVariables>(UsersDocument, options);
        }
// @ts-ignore
export function useUsersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.UsersQuery, Types.UsersQueryVariables>): Apollo.UseSuspenseQueryResult<Types.UsersQuery, Types.UsersQueryVariables>;
export function useUsersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.UsersQuery, Types.UsersQueryVariables>): Apollo.UseSuspenseQueryResult<Types.UsersQuery | undefined, Types.UsersQueryVariables>;
export function useUsersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.UsersQuery, Types.UsersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.UsersQuery, Types.UsersQueryVariables>(UsersDocument, options);
        }
export type UsersQueryHookResult = ReturnType<typeof useUsersQuery>;
export type UsersLazyQueryHookResult = ReturnType<typeof useUsersLazyQuery>;
export type UsersSuspenseQueryHookResult = ReturnType<typeof useUsersSuspenseQuery>;
export type UsersQueryResult = Apollo.QueryResult<Types.UsersQuery, Types.UsersQueryVariables>;
export const UserDocument = gql`
    query User($id: ID!) {
  user(id: $id) {
    id
    uid
    name
    email
    image
    role
    disabled
    nickname
    phone
    points
    preferredLocale
    preferredStoreId
    preferredTheme
    meta
    createdAt
    membershipPlans {
      id
      userId
      planType
      amount
      note
      startDate
      endDate
      createdAt
      updatedAt
    }
  }
}
    `;

/**
 * __useUserQuery__
 *
 * To run a query within a React component, call `useUserQuery` and pass it any options that fit your needs.
 * When your component renders, `useUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUserQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useUserQuery(baseOptions: Apollo.QueryHookOptions<Types.UserQuery, Types.UserQueryVariables> & ({ variables: Types.UserQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.UserQuery, Types.UserQueryVariables>(UserDocument, options);
      }
export function useUserLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.UserQuery, Types.UserQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.UserQuery, Types.UserQueryVariables>(UserDocument, options);
        }
// @ts-ignore
export function useUserSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.UserQuery, Types.UserQueryVariables>): Apollo.UseSuspenseQueryResult<Types.UserQuery, Types.UserQueryVariables>;
export function useUserSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.UserQuery, Types.UserQueryVariables>): Apollo.UseSuspenseQueryResult<Types.UserQuery | undefined, Types.UserQueryVariables>;
export function useUserSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.UserQuery, Types.UserQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.UserQuery, Types.UserQueryVariables>(UserDocument, options);
        }
export type UserQueryHookResult = ReturnType<typeof useUserQuery>;
export type UserLazyQueryHookResult = ReturnType<typeof useUserLazyQuery>;
export type UserSuspenseQueryHookResult = ReturnType<typeof useUserSuspenseQuery>;
export type UserQueryResult = Apollo.QueryResult<Types.UserQuery, Types.UserQueryVariables>;
export const DisableUserDocument = gql`
    mutation DisableUser($id: ID!) {
  disableUser(id: $id) {
    id
    role
    disabled
  }
}
    `;
export type DisableUserMutationFn = Apollo.MutationFunction<Types.DisableUserMutation, Types.DisableUserMutationVariables>;

/**
 * __useDisableUserMutation__
 *
 * To run a mutation, you first call `useDisableUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDisableUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [disableUserMutation, { data, loading, error }] = useDisableUserMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDisableUserMutation(baseOptions?: Apollo.MutationHookOptions<Types.DisableUserMutation, Types.DisableUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.DisableUserMutation, Types.DisableUserMutationVariables>(DisableUserDocument, options);
      }
export type DisableUserMutationHookResult = ReturnType<typeof useDisableUserMutation>;
export type DisableUserMutationResult = Apollo.MutationResult<Types.DisableUserMutation>;
export type DisableUserMutationOptions = Apollo.BaseMutationOptions<Types.DisableUserMutation, Types.DisableUserMutationVariables>;
export const EnableUserDocument = gql`
    mutation EnableUser($id: ID!) {
  enableUser(id: $id) {
    id
    role
    disabled
  }
}
    `;
export type EnableUserMutationFn = Apollo.MutationFunction<Types.EnableUserMutation, Types.EnableUserMutationVariables>;

/**
 * __useEnableUserMutation__
 *
 * To run a mutation, you first call `useEnableUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnableUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [enableUserMutation, { data, loading, error }] = useEnableUserMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useEnableUserMutation(baseOptions?: Apollo.MutationHookOptions<Types.EnableUserMutation, Types.EnableUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.EnableUserMutation, Types.EnableUserMutationVariables>(EnableUserDocument, options);
      }
export type EnableUserMutationHookResult = ReturnType<typeof useEnableUserMutation>;
export type EnableUserMutationResult = Apollo.MutationResult<Types.EnableUserMutation>;
export type EnableUserMutationOptions = Apollo.BaseMutationOptions<Types.EnableUserMutation, Types.EnableUserMutationVariables>;
export const UpdateUserDocument = gql`
    mutation UpdateUser($input: UpdateManagedUserInput!) {
  updateUser(input: $input) {
    id
    uid
    name
    email
    role
    nickname
    phone
  }
}
    `;
export type UpdateUserMutationFn = Apollo.MutationFunction<Types.UpdateUserMutation, Types.UpdateUserMutationVariables>;

/**
 * __useUpdateUserMutation__
 *
 * To run a mutation, you first call `useUpdateUserMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUserMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateUserMutation, { data, loading, error }] = useUpdateUserMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateUserMutation(baseOptions?: Apollo.MutationHookOptions<Types.UpdateUserMutation, Types.UpdateUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.UpdateUserMutation, Types.UpdateUserMutationVariables>(UpdateUserDocument, options);
      }
export type UpdateUserMutationHookResult = ReturnType<typeof useUpdateUserMutation>;
export type UpdateUserMutationResult = Apollo.MutationResult<Types.UpdateUserMutation>;
export type UpdateUserMutationOptions = Apollo.BaseMutationOptions<Types.UpdateUserMutation, Types.UpdateUserMutationVariables>;
export const UpdateUserRoleDocument = gql`
    mutation UpdateUserRole($input: UpdateRoleInput!) {
  updateUserRole(input: $input) {
    id
    role
  }
}
    `;
export type UpdateUserRoleMutationFn = Apollo.MutationFunction<Types.UpdateUserRoleMutation, Types.UpdateUserRoleMutationVariables>;

/**
 * __useUpdateUserRoleMutation__
 *
 * To run a mutation, you first call `useUpdateUserRoleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUserRoleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateUserRoleMutation, { data, loading, error }] = useUpdateUserRoleMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateUserRoleMutation(baseOptions?: Apollo.MutationHookOptions<Types.UpdateUserRoleMutation, Types.UpdateUserRoleMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.UpdateUserRoleMutation, Types.UpdateUserRoleMutationVariables>(UpdateUserRoleDocument, options);
      }
export type UpdateUserRoleMutationHookResult = ReturnType<typeof useUpdateUserRoleMutation>;
export type UpdateUserRoleMutationResult = Apollo.MutationResult<Types.UpdateUserRoleMutation>;
export type UpdateUserRoleMutationOptions = Apollo.BaseMutationOptions<Types.UpdateUserRoleMutation, Types.UpdateUserRoleMutationVariables>;
export const MembershipPlansByUserDocument = gql`
    query MembershipPlansByUser($userId: ID!) {
  membershipPlansByUser(userId: $userId) {
    id
    userId
    planType
    amount
    note
    startDate
    endDate
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useMembershipPlansByUserQuery__
 *
 * To run a query within a React component, call `useMembershipPlansByUserQuery` and pass it any options that fit your needs.
 * When your component renders, `useMembershipPlansByUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMembershipPlansByUserQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useMembershipPlansByUserQuery(baseOptions: Apollo.QueryHookOptions<Types.MembershipPlansByUserQuery, Types.MembershipPlansByUserQueryVariables> & ({ variables: Types.MembershipPlansByUserQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.MembershipPlansByUserQuery, Types.MembershipPlansByUserQueryVariables>(MembershipPlansByUserDocument, options);
      }
export function useMembershipPlansByUserLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.MembershipPlansByUserQuery, Types.MembershipPlansByUserQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.MembershipPlansByUserQuery, Types.MembershipPlansByUserQueryVariables>(MembershipPlansByUserDocument, options);
        }
// @ts-ignore
export function useMembershipPlansByUserSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.MembershipPlansByUserQuery, Types.MembershipPlansByUserQueryVariables>): Apollo.UseSuspenseQueryResult<Types.MembershipPlansByUserQuery, Types.MembershipPlansByUserQueryVariables>;
export function useMembershipPlansByUserSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.MembershipPlansByUserQuery, Types.MembershipPlansByUserQueryVariables>): Apollo.UseSuspenseQueryResult<Types.MembershipPlansByUserQuery | undefined, Types.MembershipPlansByUserQueryVariables>;
export function useMembershipPlansByUserSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.MembershipPlansByUserQuery, Types.MembershipPlansByUserQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.MembershipPlansByUserQuery, Types.MembershipPlansByUserQueryVariables>(MembershipPlansByUserDocument, options);
        }
export type MembershipPlansByUserQueryHookResult = ReturnType<typeof useMembershipPlansByUserQuery>;
export type MembershipPlansByUserLazyQueryHookResult = ReturnType<typeof useMembershipPlansByUserLazyQuery>;
export type MembershipPlansByUserSuspenseQueryHookResult = ReturnType<typeof useMembershipPlansByUserSuspenseQuery>;
export type MembershipPlansByUserQueryResult = Apollo.QueryResult<Types.MembershipPlansByUserQuery, Types.MembershipPlansByUserQueryVariables>;
export const CreateMembershipPlanDocument = gql`
    mutation CreateMembershipPlan($input: CreateMembershipPlanInput!) {
  createMembershipPlan(input: $input) {
    id
    userId
    planType
    amount
    note
    startDate
    endDate
    createdAt
    updatedAt
  }
}
    `;
export type CreateMembershipPlanMutationFn = Apollo.MutationFunction<Types.CreateMembershipPlanMutation, Types.CreateMembershipPlanMutationVariables>;

/**
 * __useCreateMembershipPlanMutation__
 *
 * To run a mutation, you first call `useCreateMembershipPlanMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateMembershipPlanMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createMembershipPlanMutation, { data, loading, error }] = useCreateMembershipPlanMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateMembershipPlanMutation(baseOptions?: Apollo.MutationHookOptions<Types.CreateMembershipPlanMutation, Types.CreateMembershipPlanMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.CreateMembershipPlanMutation, Types.CreateMembershipPlanMutationVariables>(CreateMembershipPlanDocument, options);
      }
export type CreateMembershipPlanMutationHookResult = ReturnType<typeof useCreateMembershipPlanMutation>;
export type CreateMembershipPlanMutationResult = Apollo.MutationResult<Types.CreateMembershipPlanMutation>;
export type CreateMembershipPlanMutationOptions = Apollo.BaseMutationOptions<Types.CreateMembershipPlanMutation, Types.CreateMembershipPlanMutationVariables>;
export const UpdateMembershipPlanDocument = gql`
    mutation UpdateMembershipPlan($input: UpdateMembershipPlanInput!) {
  updateMembershipPlan(input: $input) {
    id
    userId
    planType
    amount
    note
    startDate
    endDate
    createdAt
    updatedAt
  }
}
    `;
export type UpdateMembershipPlanMutationFn = Apollo.MutationFunction<Types.UpdateMembershipPlanMutation, Types.UpdateMembershipPlanMutationVariables>;

/**
 * __useUpdateMembershipPlanMutation__
 *
 * To run a mutation, you first call `useUpdateMembershipPlanMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateMembershipPlanMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateMembershipPlanMutation, { data, loading, error }] = useUpdateMembershipPlanMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateMembershipPlanMutation(baseOptions?: Apollo.MutationHookOptions<Types.UpdateMembershipPlanMutation, Types.UpdateMembershipPlanMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.UpdateMembershipPlanMutation, Types.UpdateMembershipPlanMutationVariables>(UpdateMembershipPlanDocument, options);
      }
export type UpdateMembershipPlanMutationHookResult = ReturnType<typeof useUpdateMembershipPlanMutation>;
export type UpdateMembershipPlanMutationResult = Apollo.MutationResult<Types.UpdateMembershipPlanMutation>;
export type UpdateMembershipPlanMutationOptions = Apollo.BaseMutationOptions<Types.UpdateMembershipPlanMutation, Types.UpdateMembershipPlanMutationVariables>;
export const RemoveMembershipPlanDocument = gql`
    mutation RemoveMembershipPlan($id: ID!) {
  removeMembershipPlan(id: $id) {
    id
  }
}
    `;
export type RemoveMembershipPlanMutationFn = Apollo.MutationFunction<Types.RemoveMembershipPlanMutation, Types.RemoveMembershipPlanMutationVariables>;

/**
 * __useRemoveMembershipPlanMutation__
 *
 * To run a mutation, you first call `useRemoveMembershipPlanMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveMembershipPlanMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeMembershipPlanMutation, { data, loading, error }] = useRemoveMembershipPlanMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRemoveMembershipPlanMutation(baseOptions?: Apollo.MutationHookOptions<Types.RemoveMembershipPlanMutation, Types.RemoveMembershipPlanMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.RemoveMembershipPlanMutation, Types.RemoveMembershipPlanMutationVariables>(RemoveMembershipPlanDocument, options);
      }
export type RemoveMembershipPlanMutationHookResult = ReturnType<typeof useRemoveMembershipPlanMutation>;
export type RemoveMembershipPlanMutationResult = Apollo.MutationResult<Types.RemoveMembershipPlanMutation>;
export type RemoveMembershipPlanMutationOptions = Apollo.BaseMutationOptions<Types.RemoveMembershipPlanMutation, Types.RemoveMembershipPlanMutationVariables>;
export const DeductStoredValueDocument = gql`
    mutation DeductStoredValue($input: DeductStoredValueInput!) {
  deductStoredValue(input: $input) {
    plan {
      id
      userId
      planType
      amount
    }
    deducted
  }
}
    `;
export type DeductStoredValueMutationFn = Apollo.MutationFunction<Types.DeductStoredValueMutation, Types.DeductStoredValueMutationVariables>;

/**
 * __useDeductStoredValueMutation__
 *
 * To run a mutation, you first call `useDeductStoredValueMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeductStoredValueMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deductStoredValueMutation, { data, loading, error }] = useDeductStoredValueMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useDeductStoredValueMutation(baseOptions?: Apollo.MutationHookOptions<Types.DeductStoredValueMutation, Types.DeductStoredValueMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.DeductStoredValueMutation, Types.DeductStoredValueMutationVariables>(DeductStoredValueDocument, options);
      }
export type DeductStoredValueMutationHookResult = ReturnType<typeof useDeductStoredValueMutation>;
export type DeductStoredValueMutationResult = Apollo.MutationResult<Types.DeductStoredValueMutation>;
export type DeductStoredValueMutationOptions = Apollo.BaseMutationOptions<Types.DeductStoredValueMutation, Types.DeductStoredValueMutationVariables>;
export const OccupanciesByUserDocument = gql`
    query OccupanciesByUser($userId: ID!) {
  occupanciesByUser(userId: $userId) {
    id
    tableId
    userId
    tempId
    nickname
    uid
    phone
    seats
    status
    startAt
    endAt
    finalPrice
    table {
      id
      name
      code
      scope
    }
  }
}
    `;

/**
 * __useOccupanciesByUserQuery__
 *
 * To run a query within a React component, call `useOccupanciesByUserQuery` and pass it any options that fit your needs.
 * When your component renders, `useOccupanciesByUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOccupanciesByUserQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useOccupanciesByUserQuery(baseOptions: Apollo.QueryHookOptions<Types.OccupanciesByUserQuery, Types.OccupanciesByUserQueryVariables> & ({ variables: Types.OccupanciesByUserQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.OccupanciesByUserQuery, Types.OccupanciesByUserQueryVariables>(OccupanciesByUserDocument, options);
      }
export function useOccupanciesByUserLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.OccupanciesByUserQuery, Types.OccupanciesByUserQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.OccupanciesByUserQuery, Types.OccupanciesByUserQueryVariables>(OccupanciesByUserDocument, options);
        }
// @ts-ignore
export function useOccupanciesByUserSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.OccupanciesByUserQuery, Types.OccupanciesByUserQueryVariables>): Apollo.UseSuspenseQueryResult<Types.OccupanciesByUserQuery, Types.OccupanciesByUserQueryVariables>;
export function useOccupanciesByUserSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.OccupanciesByUserQuery, Types.OccupanciesByUserQueryVariables>): Apollo.UseSuspenseQueryResult<Types.OccupanciesByUserQuery | undefined, Types.OccupanciesByUserQueryVariables>;
export function useOccupanciesByUserSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.OccupanciesByUserQuery, Types.OccupanciesByUserQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.OccupanciesByUserQuery, Types.OccupanciesByUserQueryVariables>(OccupanciesByUserDocument, options);
        }
export type OccupanciesByUserQueryHookResult = ReturnType<typeof useOccupanciesByUserQuery>;
export type OccupanciesByUserLazyQueryHookResult = ReturnType<typeof useOccupanciesByUserLazyQuery>;
export type OccupanciesByUserSuspenseQueryHookResult = ReturnType<typeof useOccupanciesByUserSuspenseQuery>;
export type OccupanciesByUserQueryResult = Apollo.QueryResult<Types.OccupanciesByUserQuery, Types.OccupanciesByUserQueryVariables>;
export const PointsLogByUserDocument = gql`
    query PointsLogByUser($userId: ID!) {
  pointsLogByUser(userId: $userId) {
    id
    userId
    amount
    balanceAfter
    note
    createdBy
    createdAt
  }
}
    `;

/**
 * __usePointsLogByUserQuery__
 *
 * To run a query within a React component, call `usePointsLogByUserQuery` and pass it any options that fit your needs.
 * When your component renders, `usePointsLogByUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePointsLogByUserQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function usePointsLogByUserQuery(baseOptions: Apollo.QueryHookOptions<Types.PointsLogByUserQuery, Types.PointsLogByUserQueryVariables> & ({ variables: Types.PointsLogByUserQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.PointsLogByUserQuery, Types.PointsLogByUserQueryVariables>(PointsLogByUserDocument, options);
      }
export function usePointsLogByUserLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.PointsLogByUserQuery, Types.PointsLogByUserQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.PointsLogByUserQuery, Types.PointsLogByUserQueryVariables>(PointsLogByUserDocument, options);
        }
// @ts-ignore
export function usePointsLogByUserSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.PointsLogByUserQuery, Types.PointsLogByUserQueryVariables>): Apollo.UseSuspenseQueryResult<Types.PointsLogByUserQuery, Types.PointsLogByUserQueryVariables>;
export function usePointsLogByUserSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.PointsLogByUserQuery, Types.PointsLogByUserQueryVariables>): Apollo.UseSuspenseQueryResult<Types.PointsLogByUserQuery | undefined, Types.PointsLogByUserQueryVariables>;
export function usePointsLogByUserSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.PointsLogByUserQuery, Types.PointsLogByUserQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.PointsLogByUserQuery, Types.PointsLogByUserQueryVariables>(PointsLogByUserDocument, options);
        }
export type PointsLogByUserQueryHookResult = ReturnType<typeof usePointsLogByUserQuery>;
export type PointsLogByUserLazyQueryHookResult = ReturnType<typeof usePointsLogByUserLazyQuery>;
export type PointsLogByUserSuspenseQueryHookResult = ReturnType<typeof usePointsLogByUserSuspenseQuery>;
export type PointsLogByUserQueryResult = Apollo.QueryResult<Types.PointsLogByUserQuery, Types.PointsLogByUserQueryVariables>;
export const AddPointsDocument = gql`
    mutation AddPoints($input: AddPointsInput!) {
  addPoints(input: $input) {
    id
    userId
    amount
    balanceAfter
    note
    createdBy
    createdAt
  }
}
    `;
export type AddPointsMutationFn = Apollo.MutationFunction<Types.AddPointsMutation, Types.AddPointsMutationVariables>;

/**
 * __useAddPointsMutation__
 *
 * To run a mutation, you first call `useAddPointsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddPointsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addPointsMutation, { data, loading, error }] = useAddPointsMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddPointsMutation(baseOptions?: Apollo.MutationHookOptions<Types.AddPointsMutation, Types.AddPointsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.AddPointsMutation, Types.AddPointsMutationVariables>(AddPointsDocument, options);
      }
export type AddPointsMutationHookResult = ReturnType<typeof useAddPointsMutation>;
export type AddPointsMutationResult = Apollo.MutationResult<Types.AddPointsMutation>;
export type AddPointsMutationOptions = Apollo.BaseMutationOptions<Types.AddPointsMutation, Types.AddPointsMutationVariables>;
export const DeductPointsDocument = gql`
    mutation DeductPoints($input: DeductPointsInput!) {
  deductPoints(input: $input) {
    id
    userId
    amount
    balanceAfter
    note
    createdBy
    createdAt
  }
}
    `;
export type DeductPointsMutationFn = Apollo.MutationFunction<Types.DeductPointsMutation, Types.DeductPointsMutationVariables>;

/**
 * __useDeductPointsMutation__
 *
 * To run a mutation, you first call `useDeductPointsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeductPointsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deductPointsMutation, { data, loading, error }] = useDeductPointsMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useDeductPointsMutation(baseOptions?: Apollo.MutationHookOptions<Types.DeductPointsMutation, Types.DeductPointsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.DeductPointsMutation, Types.DeductPointsMutationVariables>(DeductPointsDocument, options);
      }
export type DeductPointsMutationHookResult = ReturnType<typeof useDeductPointsMutation>;
export type DeductPointsMutationResult = Apollo.MutationResult<Types.DeductPointsMutation>;
export type DeductPointsMutationOptions = Apollo.BaseMutationOptions<Types.DeductPointsMutation, Types.DeductPointsMutationVariables>;
export const VerifyTotpDashDocument = gql`
    mutation VerifyTotpDash($input: VerifyTotpInput!) {
  verifyTotp(input: $input) {
    success
    userId
  }
}
    `;
export type VerifyTotpDashMutationFn = Apollo.MutationFunction<Types.VerifyTotpDashMutation, Types.VerifyTotpDashMutationVariables>;

/**
 * __useVerifyTotpDashMutation__
 *
 * To run a mutation, you first call `useVerifyTotpDashMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useVerifyTotpDashMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [verifyTotpDashMutation, { data, loading, error }] = useVerifyTotpDashMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useVerifyTotpDashMutation(baseOptions?: Apollo.MutationHookOptions<Types.VerifyTotpDashMutation, Types.VerifyTotpDashMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.VerifyTotpDashMutation, Types.VerifyTotpDashMutationVariables>(VerifyTotpDashDocument, options);
      }
export type VerifyTotpDashMutationHookResult = ReturnType<typeof useVerifyTotpDashMutation>;
export type VerifyTotpDashMutationResult = Apollo.MutationResult<Types.VerifyTotpDashMutation>;
export type VerifyTotpDashMutationOptions = Apollo.BaseMutationOptions<Types.VerifyTotpDashMutation, Types.VerifyTotpDashMutationVariables>;
export const SyncOwnedBoardGamesDocument = gql`
    mutation SyncOwnedBoardGames($pageFrom: Int!, $pageTo: Int!, $date: String!) {
  syncOwnedBoardGames(pageFrom: $pageFrom, pageTo: $pageTo, date: $date) {
    success
    message
    processed
  }
}
    `;
export type SyncOwnedBoardGamesMutationFn = Apollo.MutationFunction<Types.SyncOwnedBoardGamesMutation, Types.SyncOwnedBoardGamesMutationVariables>;

/**
 * __useSyncOwnedBoardGamesMutation__
 *
 * To run a mutation, you first call `useSyncOwnedBoardGamesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSyncOwnedBoardGamesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [syncOwnedBoardGamesMutation, { data, loading, error }] = useSyncOwnedBoardGamesMutation({
 *   variables: {
 *      pageFrom: // value for 'pageFrom'
 *      pageTo: // value for 'pageTo'
 *      date: // value for 'date'
 *   },
 * });
 */
export function useSyncOwnedBoardGamesMutation(baseOptions?: Apollo.MutationHookOptions<Types.SyncOwnedBoardGamesMutation, Types.SyncOwnedBoardGamesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.SyncOwnedBoardGamesMutation, Types.SyncOwnedBoardGamesMutationVariables>(SyncOwnedBoardGamesDocument, options);
      }
export type SyncOwnedBoardGamesMutationHookResult = ReturnType<typeof useSyncOwnedBoardGamesMutation>;
export type SyncOwnedBoardGamesMutationResult = Apollo.MutationResult<Types.SyncOwnedBoardGamesMutation>;
export type SyncOwnedBoardGamesMutationOptions = Apollo.BaseMutationOptions<Types.SyncOwnedBoardGamesMutation, Types.SyncOwnedBoardGamesMutationVariables>;
export const WakeOwnedBoardGamesDocument = gql`
    mutation WakeOwnedBoardGames($date: String!) {
  wakeOwnedBoardGames(date: $date) {
    success
    message
    processed
  }
}
    `;
export type WakeOwnedBoardGamesMutationFn = Apollo.MutationFunction<Types.WakeOwnedBoardGamesMutation, Types.WakeOwnedBoardGamesMutationVariables>;

/**
 * __useWakeOwnedBoardGamesMutation__
 *
 * To run a mutation, you first call `useWakeOwnedBoardGamesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useWakeOwnedBoardGamesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [wakeOwnedBoardGamesMutation, { data, loading, error }] = useWakeOwnedBoardGamesMutation({
 *   variables: {
 *      date: // value for 'date'
 *   },
 * });
 */
export function useWakeOwnedBoardGamesMutation(baseOptions?: Apollo.MutationHookOptions<Types.WakeOwnedBoardGamesMutation, Types.WakeOwnedBoardGamesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.WakeOwnedBoardGamesMutation, Types.WakeOwnedBoardGamesMutationVariables>(WakeOwnedBoardGamesDocument, options);
      }
export type WakeOwnedBoardGamesMutationHookResult = ReturnType<typeof useWakeOwnedBoardGamesMutation>;
export type WakeOwnedBoardGamesMutationResult = Apollo.MutationResult<Types.WakeOwnedBoardGamesMutation>;
export type WakeOwnedBoardGamesMutationOptions = Apollo.BaseMutationOptions<Types.WakeOwnedBoardGamesMutation, Types.WakeOwnedBoardGamesMutationVariables>;
export const WechatMenuDraftDocument = gql`
    query WechatMenuDraft($storeId: ID) {
  wechatMenuDraft(storeId: $storeId) {
    data
    snapshotId
    snapshotName
    status
  }
}
    `;

/**
 * __useWechatMenuDraftQuery__
 *
 * To run a query within a React component, call `useWechatMenuDraftQuery` and pass it any options that fit your needs.
 * When your component renders, `useWechatMenuDraftQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWechatMenuDraftQuery({
 *   variables: {
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function useWechatMenuDraftQuery(baseOptions?: Apollo.QueryHookOptions<Types.WechatMenuDraftQuery, Types.WechatMenuDraftQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.WechatMenuDraftQuery, Types.WechatMenuDraftQueryVariables>(WechatMenuDraftDocument, options);
      }
export function useWechatMenuDraftLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.WechatMenuDraftQuery, Types.WechatMenuDraftQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.WechatMenuDraftQuery, Types.WechatMenuDraftQueryVariables>(WechatMenuDraftDocument, options);
        }
// @ts-ignore
export function useWechatMenuDraftSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.WechatMenuDraftQuery, Types.WechatMenuDraftQueryVariables>): Apollo.UseSuspenseQueryResult<Types.WechatMenuDraftQuery, Types.WechatMenuDraftQueryVariables>;
export function useWechatMenuDraftSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.WechatMenuDraftQuery, Types.WechatMenuDraftQueryVariables>): Apollo.UseSuspenseQueryResult<Types.WechatMenuDraftQuery | undefined, Types.WechatMenuDraftQueryVariables>;
export function useWechatMenuDraftSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.WechatMenuDraftQuery, Types.WechatMenuDraftQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.WechatMenuDraftQuery, Types.WechatMenuDraftQueryVariables>(WechatMenuDraftDocument, options);
        }
export type WechatMenuDraftQueryHookResult = ReturnType<typeof useWechatMenuDraftQuery>;
export type WechatMenuDraftLazyQueryHookResult = ReturnType<typeof useWechatMenuDraftLazyQuery>;
export type WechatMenuDraftSuspenseQueryHookResult = ReturnType<typeof useWechatMenuDraftSuspenseQuery>;
export type WechatMenuDraftQueryResult = Apollo.QueryResult<Types.WechatMenuDraftQuery, Types.WechatMenuDraftQueryVariables>;
export const WechatMenuSnapshotsDocument = gql`
    query WechatMenuSnapshots($storeId: ID) {
  wechatMenuSnapshots(storeId: $storeId) {
    id
    name
    storeId
    data
    status
    summary
    createdAt
    publishedAt
  }
}
    `;

/**
 * __useWechatMenuSnapshotsQuery__
 *
 * To run a query within a React component, call `useWechatMenuSnapshotsQuery` and pass it any options that fit your needs.
 * When your component renders, `useWechatMenuSnapshotsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWechatMenuSnapshotsQuery({
 *   variables: {
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function useWechatMenuSnapshotsQuery(baseOptions?: Apollo.QueryHookOptions<Types.WechatMenuSnapshotsQuery, Types.WechatMenuSnapshotsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.WechatMenuSnapshotsQuery, Types.WechatMenuSnapshotsQueryVariables>(WechatMenuSnapshotsDocument, options);
      }
export function useWechatMenuSnapshotsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.WechatMenuSnapshotsQuery, Types.WechatMenuSnapshotsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.WechatMenuSnapshotsQuery, Types.WechatMenuSnapshotsQueryVariables>(WechatMenuSnapshotsDocument, options);
        }
// @ts-ignore
export function useWechatMenuSnapshotsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.WechatMenuSnapshotsQuery, Types.WechatMenuSnapshotsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.WechatMenuSnapshotsQuery, Types.WechatMenuSnapshotsQueryVariables>;
export function useWechatMenuSnapshotsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.WechatMenuSnapshotsQuery, Types.WechatMenuSnapshotsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.WechatMenuSnapshotsQuery | undefined, Types.WechatMenuSnapshotsQueryVariables>;
export function useWechatMenuSnapshotsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.WechatMenuSnapshotsQuery, Types.WechatMenuSnapshotsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.WechatMenuSnapshotsQuery, Types.WechatMenuSnapshotsQueryVariables>(WechatMenuSnapshotsDocument, options);
        }
export type WechatMenuSnapshotsQueryHookResult = ReturnType<typeof useWechatMenuSnapshotsQuery>;
export type WechatMenuSnapshotsLazyQueryHookResult = ReturnType<typeof useWechatMenuSnapshotsLazyQuery>;
export type WechatMenuSnapshotsSuspenseQueryHookResult = ReturnType<typeof useWechatMenuSnapshotsSuspenseQuery>;
export type WechatMenuSnapshotsQueryResult = Apollo.QueryResult<Types.WechatMenuSnapshotsQuery, Types.WechatMenuSnapshotsQueryVariables>;
export const WechatMenuSnapshotDocument = gql`
    query WechatMenuSnapshot($id: ID!) {
  wechatMenuSnapshot(id: $id) {
    id
    name
    storeId
    data
    status
    summary
    createdAt
    publishedAt
  }
}
    `;

/**
 * __useWechatMenuSnapshotQuery__
 *
 * To run a query within a React component, call `useWechatMenuSnapshotQuery` and pass it any options that fit your needs.
 * When your component renders, `useWechatMenuSnapshotQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWechatMenuSnapshotQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useWechatMenuSnapshotQuery(baseOptions: Apollo.QueryHookOptions<Types.WechatMenuSnapshotQuery, Types.WechatMenuSnapshotQueryVariables> & ({ variables: Types.WechatMenuSnapshotQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.WechatMenuSnapshotQuery, Types.WechatMenuSnapshotQueryVariables>(WechatMenuSnapshotDocument, options);
      }
export function useWechatMenuSnapshotLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.WechatMenuSnapshotQuery, Types.WechatMenuSnapshotQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.WechatMenuSnapshotQuery, Types.WechatMenuSnapshotQueryVariables>(WechatMenuSnapshotDocument, options);
        }
// @ts-ignore
export function useWechatMenuSnapshotSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.WechatMenuSnapshotQuery, Types.WechatMenuSnapshotQueryVariables>): Apollo.UseSuspenseQueryResult<Types.WechatMenuSnapshotQuery, Types.WechatMenuSnapshotQueryVariables>;
export function useWechatMenuSnapshotSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.WechatMenuSnapshotQuery, Types.WechatMenuSnapshotQueryVariables>): Apollo.UseSuspenseQueryResult<Types.WechatMenuSnapshotQuery | undefined, Types.WechatMenuSnapshotQueryVariables>;
export function useWechatMenuSnapshotSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.WechatMenuSnapshotQuery, Types.WechatMenuSnapshotQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.WechatMenuSnapshotQuery, Types.WechatMenuSnapshotQueryVariables>(WechatMenuSnapshotDocument, options);
        }
export type WechatMenuSnapshotQueryHookResult = ReturnType<typeof useWechatMenuSnapshotQuery>;
export type WechatMenuSnapshotLazyQueryHookResult = ReturnType<typeof useWechatMenuSnapshotLazyQuery>;
export type WechatMenuSnapshotSuspenseQueryHookResult = ReturnType<typeof useWechatMenuSnapshotSuspenseQuery>;
export type WechatMenuSnapshotQueryResult = Apollo.QueryResult<Types.WechatMenuSnapshotQuery, Types.WechatMenuSnapshotQueryVariables>;
export const WechatMenuVariablesDocument = gql`
    query WechatMenuVariables {
  wechatMenuVariables {
    id
    label
    description
    example
  }
}
    `;

/**
 * __useWechatMenuVariablesQuery__
 *
 * To run a query within a React component, call `useWechatMenuVariablesQuery` and pass it any options that fit your needs.
 * When your component renders, `useWechatMenuVariablesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWechatMenuVariablesQuery({
 *   variables: {
 *   },
 * });
 */
export function useWechatMenuVariablesQuery(baseOptions?: Apollo.QueryHookOptions<Types.WechatMenuVariablesQuery, Types.WechatMenuVariablesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.WechatMenuVariablesQuery, Types.WechatMenuVariablesQueryVariables>(WechatMenuVariablesDocument, options);
      }
export function useWechatMenuVariablesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.WechatMenuVariablesQuery, Types.WechatMenuVariablesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.WechatMenuVariablesQuery, Types.WechatMenuVariablesQueryVariables>(WechatMenuVariablesDocument, options);
        }
// @ts-ignore
export function useWechatMenuVariablesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.WechatMenuVariablesQuery, Types.WechatMenuVariablesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.WechatMenuVariablesQuery, Types.WechatMenuVariablesQueryVariables>;
export function useWechatMenuVariablesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.WechatMenuVariablesQuery, Types.WechatMenuVariablesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.WechatMenuVariablesQuery | undefined, Types.WechatMenuVariablesQueryVariables>;
export function useWechatMenuVariablesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.WechatMenuVariablesQuery, Types.WechatMenuVariablesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.WechatMenuVariablesQuery, Types.WechatMenuVariablesQueryVariables>(WechatMenuVariablesDocument, options);
        }
export type WechatMenuVariablesQueryHookResult = ReturnType<typeof useWechatMenuVariablesQuery>;
export type WechatMenuVariablesLazyQueryHookResult = ReturnType<typeof useWechatMenuVariablesLazyQuery>;
export type WechatMenuVariablesSuspenseQueryHookResult = ReturnType<typeof useWechatMenuVariablesSuspenseQuery>;
export type WechatMenuVariablesQueryResult = Apollo.QueryResult<Types.WechatMenuVariablesQuery, Types.WechatMenuVariablesQueryVariables>;
export const SaveWechatMenuSnapshotDocument = gql`
    mutation SaveWechatMenuSnapshot($input: SaveWechatMenuSnapshotInput!) {
  saveWechatMenuSnapshot(input: $input) {
    id
    name
    storeId
    data
    status
    summary
    createdAt
    publishedAt
  }
}
    `;
export type SaveWechatMenuSnapshotMutationFn = Apollo.MutationFunction<Types.SaveWechatMenuSnapshotMutation, Types.SaveWechatMenuSnapshotMutationVariables>;

/**
 * __useSaveWechatMenuSnapshotMutation__
 *
 * To run a mutation, you first call `useSaveWechatMenuSnapshotMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSaveWechatMenuSnapshotMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [saveWechatMenuSnapshotMutation, { data, loading, error }] = useSaveWechatMenuSnapshotMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSaveWechatMenuSnapshotMutation(baseOptions?: Apollo.MutationHookOptions<Types.SaveWechatMenuSnapshotMutation, Types.SaveWechatMenuSnapshotMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.SaveWechatMenuSnapshotMutation, Types.SaveWechatMenuSnapshotMutationVariables>(SaveWechatMenuSnapshotDocument, options);
      }
export type SaveWechatMenuSnapshotMutationHookResult = ReturnType<typeof useSaveWechatMenuSnapshotMutation>;
export type SaveWechatMenuSnapshotMutationResult = Apollo.MutationResult<Types.SaveWechatMenuSnapshotMutation>;
export type SaveWechatMenuSnapshotMutationOptions = Apollo.BaseMutationOptions<Types.SaveWechatMenuSnapshotMutation, Types.SaveWechatMenuSnapshotMutationVariables>;
export const PublishWechatMenuSnapshotDocument = gql`
    mutation PublishWechatMenuSnapshot($storeId: ID) {
  publishWechatMenuSnapshot(storeId: $storeId) {
    success
    error
    snapshot {
      id
      name
      status
      publishedAt
    }
  }
}
    `;
export type PublishWechatMenuSnapshotMutationFn = Apollo.MutationFunction<Types.PublishWechatMenuSnapshotMutation, Types.PublishWechatMenuSnapshotMutationVariables>;

/**
 * __usePublishWechatMenuSnapshotMutation__
 *
 * To run a mutation, you first call `usePublishWechatMenuSnapshotMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePublishWechatMenuSnapshotMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [publishWechatMenuSnapshotMutation, { data, loading, error }] = usePublishWechatMenuSnapshotMutation({
 *   variables: {
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function usePublishWechatMenuSnapshotMutation(baseOptions?: Apollo.MutationHookOptions<Types.PublishWechatMenuSnapshotMutation, Types.PublishWechatMenuSnapshotMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.PublishWechatMenuSnapshotMutation, Types.PublishWechatMenuSnapshotMutationVariables>(PublishWechatMenuSnapshotDocument, options);
      }
export type PublishWechatMenuSnapshotMutationHookResult = ReturnType<typeof usePublishWechatMenuSnapshotMutation>;
export type PublishWechatMenuSnapshotMutationResult = Apollo.MutationResult<Types.PublishWechatMenuSnapshotMutation>;
export type PublishWechatMenuSnapshotMutationOptions = Apollo.BaseMutationOptions<Types.PublishWechatMenuSnapshotMutation, Types.PublishWechatMenuSnapshotMutationVariables>;
export const RestoreWechatMenuSnapshotDocument = gql`
    mutation RestoreWechatMenuSnapshot($id: ID!) {
  restoreWechatMenuSnapshot(id: $id) {
    id
    name
    data
    status
    summary
    createdAt
    publishedAt
  }
}
    `;
export type RestoreWechatMenuSnapshotMutationFn = Apollo.MutationFunction<Types.RestoreWechatMenuSnapshotMutation, Types.RestoreWechatMenuSnapshotMutationVariables>;

/**
 * __useRestoreWechatMenuSnapshotMutation__
 *
 * To run a mutation, you first call `useRestoreWechatMenuSnapshotMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRestoreWechatMenuSnapshotMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [restoreWechatMenuSnapshotMutation, { data, loading, error }] = useRestoreWechatMenuSnapshotMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRestoreWechatMenuSnapshotMutation(baseOptions?: Apollo.MutationHookOptions<Types.RestoreWechatMenuSnapshotMutation, Types.RestoreWechatMenuSnapshotMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.RestoreWechatMenuSnapshotMutation, Types.RestoreWechatMenuSnapshotMutationVariables>(RestoreWechatMenuSnapshotDocument, options);
      }
export type RestoreWechatMenuSnapshotMutationHookResult = ReturnType<typeof useRestoreWechatMenuSnapshotMutation>;
export type RestoreWechatMenuSnapshotMutationResult = Apollo.MutationResult<Types.RestoreWechatMenuSnapshotMutation>;
export type RestoreWechatMenuSnapshotMutationOptions = Apollo.BaseMutationOptions<Types.RestoreWechatMenuSnapshotMutation, Types.RestoreWechatMenuSnapshotMutationVariables>;
export const TranslateWechatMenuTextDocument = gql`
    mutation TranslateWechatMenuText($text: String!, $targetLocales: [String!]!) {
  translateWechatMenuText(text: $text, targetLocales: $targetLocales) {
    translations {
      locale
      text
    }
  }
}
    `;
export type TranslateWechatMenuTextMutationFn = Apollo.MutationFunction<Types.TranslateWechatMenuTextMutation, Types.TranslateWechatMenuTextMutationVariables>;

/**
 * __useTranslateWechatMenuTextMutation__
 *
 * To run a mutation, you first call `useTranslateWechatMenuTextMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useTranslateWechatMenuTextMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [translateWechatMenuTextMutation, { data, loading, error }] = useTranslateWechatMenuTextMutation({
 *   variables: {
 *      text: // value for 'text'
 *      targetLocales: // value for 'targetLocales'
 *   },
 * });
 */
export function useTranslateWechatMenuTextMutation(baseOptions?: Apollo.MutationHookOptions<Types.TranslateWechatMenuTextMutation, Types.TranslateWechatMenuTextMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.TranslateWechatMenuTextMutation, Types.TranslateWechatMenuTextMutationVariables>(TranslateWechatMenuTextDocument, options);
      }
export type TranslateWechatMenuTextMutationHookResult = ReturnType<typeof useTranslateWechatMenuTextMutation>;
export type TranslateWechatMenuTextMutationResult = Apollo.MutationResult<Types.TranslateWechatMenuTextMutation>;
export type TranslateWechatMenuTextMutationOptions = Apollo.BaseMutationOptions<Types.TranslateWechatMenuTextMutation, Types.TranslateWechatMenuTextMutationVariables>;
export const WechatTemplatesDocument = gql`
    query WechatTemplates {
  wechatTemplates {
    success
    error
    templates {
      templateId
      title
      primaryIndustry
      deputyIndustry
      content
      example
    }
  }
}
    `;

/**
 * __useWechatTemplatesQuery__
 *
 * To run a query within a React component, call `useWechatTemplatesQuery` and pass it any options that fit your needs.
 * When your component renders, `useWechatTemplatesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWechatTemplatesQuery({
 *   variables: {
 *   },
 * });
 */
export function useWechatTemplatesQuery(baseOptions?: Apollo.QueryHookOptions<Types.WechatTemplatesQuery, Types.WechatTemplatesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.WechatTemplatesQuery, Types.WechatTemplatesQueryVariables>(WechatTemplatesDocument, options);
      }
export function useWechatTemplatesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.WechatTemplatesQuery, Types.WechatTemplatesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.WechatTemplatesQuery, Types.WechatTemplatesQueryVariables>(WechatTemplatesDocument, options);
        }
// @ts-ignore
export function useWechatTemplatesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.WechatTemplatesQuery, Types.WechatTemplatesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.WechatTemplatesQuery, Types.WechatTemplatesQueryVariables>;
export function useWechatTemplatesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.WechatTemplatesQuery, Types.WechatTemplatesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.WechatTemplatesQuery | undefined, Types.WechatTemplatesQueryVariables>;
export function useWechatTemplatesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.WechatTemplatesQuery, Types.WechatTemplatesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.WechatTemplatesQuery, Types.WechatTemplatesQueryVariables>(WechatTemplatesDocument, options);
        }
export type WechatTemplatesQueryHookResult = ReturnType<typeof useWechatTemplatesQuery>;
export type WechatTemplatesLazyQueryHookResult = ReturnType<typeof useWechatTemplatesLazyQuery>;
export type WechatTemplatesSuspenseQueryHookResult = ReturnType<typeof useWechatTemplatesSuspenseQuery>;
export type WechatTemplatesQueryResult = Apollo.QueryResult<Types.WechatTemplatesQuery, Types.WechatTemplatesQueryVariables>;
export const WechatTemplateSlotsDocument = gql`
    query WechatTemplateSlots {
  wechatTemplateSlots {
    key
    label
    templateId
  }
}
    `;

/**
 * __useWechatTemplateSlotsQuery__
 *
 * To run a query within a React component, call `useWechatTemplateSlotsQuery` and pass it any options that fit your needs.
 * When your component renders, `useWechatTemplateSlotsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWechatTemplateSlotsQuery({
 *   variables: {
 *   },
 * });
 */
export function useWechatTemplateSlotsQuery(baseOptions?: Apollo.QueryHookOptions<Types.WechatTemplateSlotsQuery, Types.WechatTemplateSlotsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.WechatTemplateSlotsQuery, Types.WechatTemplateSlotsQueryVariables>(WechatTemplateSlotsDocument, options);
      }
export function useWechatTemplateSlotsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.WechatTemplateSlotsQuery, Types.WechatTemplateSlotsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.WechatTemplateSlotsQuery, Types.WechatTemplateSlotsQueryVariables>(WechatTemplateSlotsDocument, options);
        }
// @ts-ignore
export function useWechatTemplateSlotsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.WechatTemplateSlotsQuery, Types.WechatTemplateSlotsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.WechatTemplateSlotsQuery, Types.WechatTemplateSlotsQueryVariables>;
export function useWechatTemplateSlotsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.WechatTemplateSlotsQuery, Types.WechatTemplateSlotsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.WechatTemplateSlotsQuery | undefined, Types.WechatTemplateSlotsQueryVariables>;
export function useWechatTemplateSlotsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.WechatTemplateSlotsQuery, Types.WechatTemplateSlotsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.WechatTemplateSlotsQuery, Types.WechatTemplateSlotsQueryVariables>(WechatTemplateSlotsDocument, options);
        }
export type WechatTemplateSlotsQueryHookResult = ReturnType<typeof useWechatTemplateSlotsQuery>;
export type WechatTemplateSlotsLazyQueryHookResult = ReturnType<typeof useWechatTemplateSlotsLazyQuery>;
export type WechatTemplateSlotsSuspenseQueryHookResult = ReturnType<typeof useWechatTemplateSlotsSuspenseQuery>;
export type WechatTemplateSlotsQueryResult = Apollo.QueryResult<Types.WechatTemplateSlotsQuery, Types.WechatTemplateSlotsQueryVariables>;
export const AddWechatTemplateFromLibraryDocument = gql`
    mutation AddWechatTemplateFromLibrary($input: AddWechatTemplateFromLibraryInput!) {
  addWechatTemplateFromLibrary(input: $input) {
    success
    error
    templateId
    slot
    label
  }
}
    `;
export type AddWechatTemplateFromLibraryMutationFn = Apollo.MutationFunction<Types.AddWechatTemplateFromLibraryMutation, Types.AddWechatTemplateFromLibraryMutationVariables>;

/**
 * __useAddWechatTemplateFromLibraryMutation__
 *
 * To run a mutation, you first call `useAddWechatTemplateFromLibraryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddWechatTemplateFromLibraryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addWechatTemplateFromLibraryMutation, { data, loading, error }] = useAddWechatTemplateFromLibraryMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddWechatTemplateFromLibraryMutation(baseOptions?: Apollo.MutationHookOptions<Types.AddWechatTemplateFromLibraryMutation, Types.AddWechatTemplateFromLibraryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.AddWechatTemplateFromLibraryMutation, Types.AddWechatTemplateFromLibraryMutationVariables>(AddWechatTemplateFromLibraryDocument, options);
      }
export type AddWechatTemplateFromLibraryMutationHookResult = ReturnType<typeof useAddWechatTemplateFromLibraryMutation>;
export type AddWechatTemplateFromLibraryMutationResult = Apollo.MutationResult<Types.AddWechatTemplateFromLibraryMutation>;
export type AddWechatTemplateFromLibraryMutationOptions = Apollo.BaseMutationOptions<Types.AddWechatTemplateFromLibraryMutation, Types.AddWechatTemplateFromLibraryMutationVariables>;
export const AssignWechatTemplateSlotDocument = gql`
    mutation AssignWechatTemplateSlot($slot: WechatTemplateSlotKey!, $templateId: String!) {
  assignWechatTemplateSlot(slot: $slot, templateId: $templateId) {
    key
    label
    templateId
  }
}
    `;
export type AssignWechatTemplateSlotMutationFn = Apollo.MutationFunction<Types.AssignWechatTemplateSlotMutation, Types.AssignWechatTemplateSlotMutationVariables>;

/**
 * __useAssignWechatTemplateSlotMutation__
 *
 * To run a mutation, you first call `useAssignWechatTemplateSlotMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAssignWechatTemplateSlotMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [assignWechatTemplateSlotMutation, { data, loading, error }] = useAssignWechatTemplateSlotMutation({
 *   variables: {
 *      slot: // value for 'slot'
 *      templateId: // value for 'templateId'
 *   },
 * });
 */
export function useAssignWechatTemplateSlotMutation(baseOptions?: Apollo.MutationHookOptions<Types.AssignWechatTemplateSlotMutation, Types.AssignWechatTemplateSlotMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.AssignWechatTemplateSlotMutation, Types.AssignWechatTemplateSlotMutationVariables>(AssignWechatTemplateSlotDocument, options);
      }
export type AssignWechatTemplateSlotMutationHookResult = ReturnType<typeof useAssignWechatTemplateSlotMutation>;
export type AssignWechatTemplateSlotMutationResult = Apollo.MutationResult<Types.AssignWechatTemplateSlotMutation>;
export type AssignWechatTemplateSlotMutationOptions = Apollo.BaseMutationOptions<Types.AssignWechatTemplateSlotMutation, Types.AssignWechatTemplateSlotMutationVariables>;
export const RemoveWechatTemplateDocument = gql`
    mutation RemoveWechatTemplate($templateId: String!) {
  removeWechatTemplate(templateId: $templateId) {
    success
    error
    templateId
    slot
    label
  }
}
    `;
export type RemoveWechatTemplateMutationFn = Apollo.MutationFunction<Types.RemoveWechatTemplateMutation, Types.RemoveWechatTemplateMutationVariables>;

/**
 * __useRemoveWechatTemplateMutation__
 *
 * To run a mutation, you first call `useRemoveWechatTemplateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveWechatTemplateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeWechatTemplateMutation, { data, loading, error }] = useRemoveWechatTemplateMutation({
 *   variables: {
 *      templateId: // value for 'templateId'
 *   },
 * });
 */
export function useRemoveWechatTemplateMutation(baseOptions?: Apollo.MutationHookOptions<Types.RemoveWechatTemplateMutation, Types.RemoveWechatTemplateMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.RemoveWechatTemplateMutation, Types.RemoveWechatTemplateMutationVariables>(RemoveWechatTemplateDocument, options);
      }
export type RemoveWechatTemplateMutationHookResult = ReturnType<typeof useRemoveWechatTemplateMutation>;
export type RemoveWechatTemplateMutationResult = Apollo.MutationResult<Types.RemoveWechatTemplateMutation>;
export type RemoveWechatTemplateMutationOptions = Apollo.BaseMutationOptions<Types.RemoveWechatTemplateMutation, Types.RemoveWechatTemplateMutationVariables>;
export const SendWechatTemplateTestDocument = gql`
    mutation SendWechatTemplateTest($userId: ID!, $slot: WechatTemplateSlotKey!) {
  sendWechatTemplateTest(userId: $userId, slot: $slot) {
    success
    error
    templateId
    slot
    label
  }
}
    `;
export type SendWechatTemplateTestMutationFn = Apollo.MutationFunction<Types.SendWechatTemplateTestMutation, Types.SendWechatTemplateTestMutationVariables>;

/**
 * __useSendWechatTemplateTestMutation__
 *
 * To run a mutation, you first call `useSendWechatTemplateTestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSendWechatTemplateTestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [sendWechatTemplateTestMutation, { data, loading, error }] = useSendWechatTemplateTestMutation({
 *   variables: {
 *      userId: // value for 'userId'
 *      slot: // value for 'slot'
 *   },
 * });
 */
export function useSendWechatTemplateTestMutation(baseOptions?: Apollo.MutationHookOptions<Types.SendWechatTemplateTestMutation, Types.SendWechatTemplateTestMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.SendWechatTemplateTestMutation, Types.SendWechatTemplateTestMutationVariables>(SendWechatTemplateTestDocument, options);
      }
export type SendWechatTemplateTestMutationHookResult = ReturnType<typeof useSendWechatTemplateTestMutation>;
export type SendWechatTemplateTestMutationResult = Apollo.MutationResult<Types.SendWechatTemplateTestMutation>;
export type SendWechatTemplateTestMutationOptions = Apollo.BaseMutationOptions<Types.SendWechatTemplateTestMutation, Types.SendWechatTemplateTestMutationVariables>;
export const GetEventsDocument = gql`
    query GetEvents($storeId: ID) {
  events(storeId: $storeId) {
    id
    title
    description
    coverImageUrl
    content
    isPublished
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetEventsQuery__
 *
 * To run a query within a React component, call `useGetEventsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEventsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEventsQuery({
 *   variables: {
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function useGetEventsQuery(baseOptions?: Apollo.QueryHookOptions<Types.GetEventsQuery, Types.GetEventsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetEventsQuery, Types.GetEventsQueryVariables>(GetEventsDocument, options);
      }
export function useGetEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetEventsQuery, Types.GetEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetEventsQuery, Types.GetEventsQueryVariables>(GetEventsDocument, options);
        }
// @ts-ignore
export function useGetEventsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.GetEventsQuery, Types.GetEventsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetEventsQuery, Types.GetEventsQueryVariables>;
export function useGetEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetEventsQuery, Types.GetEventsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetEventsQuery | undefined, Types.GetEventsQueryVariables>;
export function useGetEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetEventsQuery, Types.GetEventsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetEventsQuery, Types.GetEventsQueryVariables>(GetEventsDocument, options);
        }
export type GetEventsQueryHookResult = ReturnType<typeof useGetEventsQuery>;
export type GetEventsLazyQueryHookResult = ReturnType<typeof useGetEventsLazyQuery>;
export type GetEventsSuspenseQueryHookResult = ReturnType<typeof useGetEventsSuspenseQuery>;
export type GetEventsQueryResult = Apollo.QueryResult<Types.GetEventsQuery, Types.GetEventsQueryVariables>;
export const GetEventDocument = gql`
    query GetEvent($id: ID!) {
  event(id: $id) {
    id
    title
    description
    coverImageUrl
    content
    isPublished
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetEventQuery__
 *
 * To run a query within a React component, call `useGetEventQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetEventQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetEventQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetEventQuery(baseOptions: Apollo.QueryHookOptions<Types.GetEventQuery, Types.GetEventQueryVariables> & ({ variables: Types.GetEventQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetEventQuery, Types.GetEventQueryVariables>(GetEventDocument, options);
      }
export function useGetEventLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetEventQuery, Types.GetEventQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetEventQuery, Types.GetEventQueryVariables>(GetEventDocument, options);
        }
// @ts-ignore
export function useGetEventSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.GetEventQuery, Types.GetEventQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetEventQuery, Types.GetEventQueryVariables>;
export function useGetEventSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetEventQuery, Types.GetEventQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetEventQuery | undefined, Types.GetEventQueryVariables>;
export function useGetEventSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetEventQuery, Types.GetEventQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetEventQuery, Types.GetEventQueryVariables>(GetEventDocument, options);
        }
export type GetEventQueryHookResult = ReturnType<typeof useGetEventQuery>;
export type GetEventLazyQueryHookResult = ReturnType<typeof useGetEventLazyQuery>;
export type GetEventSuspenseQueryHookResult = ReturnType<typeof useGetEventSuspenseQuery>;
export type GetEventQueryResult = Apollo.QueryResult<Types.GetEventQuery, Types.GetEventQueryVariables>;
export const GetMyPpStatsDocument = gql`
    query GetMyPPStats($storeId: ID) {
  myPPStats(storeId: $storeId) {
    totalPP
    categories
    raw
  }
}
    `;

/**
 * __useGetMyPpStatsQuery__
 *
 * To run a query within a React component, call `useGetMyPpStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyPpStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyPpStatsQuery({
 *   variables: {
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function useGetMyPpStatsQuery(baseOptions?: Apollo.QueryHookOptions<Types.GetMyPpStatsQuery, Types.GetMyPpStatsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetMyPpStatsQuery, Types.GetMyPpStatsQueryVariables>(GetMyPpStatsDocument, options);
      }
export function useGetMyPpStatsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetMyPpStatsQuery, Types.GetMyPpStatsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetMyPpStatsQuery, Types.GetMyPpStatsQueryVariables>(GetMyPpStatsDocument, options);
        }
// @ts-ignore
export function useGetMyPpStatsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.GetMyPpStatsQuery, Types.GetMyPpStatsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetMyPpStatsQuery, Types.GetMyPpStatsQueryVariables>;
export function useGetMyPpStatsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetMyPpStatsQuery, Types.GetMyPpStatsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetMyPpStatsQuery | undefined, Types.GetMyPpStatsQueryVariables>;
export function useGetMyPpStatsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetMyPpStatsQuery, Types.GetMyPpStatsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetMyPpStatsQuery, Types.GetMyPpStatsQueryVariables>(GetMyPpStatsDocument, options);
        }
export type GetMyPpStatsQueryHookResult = ReturnType<typeof useGetMyPpStatsQuery>;
export type GetMyPpStatsLazyQueryHookResult = ReturnType<typeof useGetMyPpStatsLazyQuery>;
export type GetMyPpStatsSuspenseQueryHookResult = ReturnType<typeof useGetMyPpStatsSuspenseQuery>;
export type GetMyPpStatsQueryResult = Apollo.QueryResult<Types.GetMyPpStatsQuery, Types.GetMyPpStatsQueryVariables>;
export const GetMahjongHeatmapDocument = gql`
    query GetMahjongHeatmap($userId: ID, $storeId: ID) {
  mahjongHeatmap(userId: $userId, storeId: $storeId)
}
    `;

/**
 * __useGetMahjongHeatmapQuery__
 *
 * To run a query within a React component, call `useGetMahjongHeatmapQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMahjongHeatmapQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMahjongHeatmapQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function useGetMahjongHeatmapQuery(baseOptions?: Apollo.QueryHookOptions<Types.GetMahjongHeatmapQuery, Types.GetMahjongHeatmapQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetMahjongHeatmapQuery, Types.GetMahjongHeatmapQueryVariables>(GetMahjongHeatmapDocument, options);
      }
export function useGetMahjongHeatmapLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetMahjongHeatmapQuery, Types.GetMahjongHeatmapQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetMahjongHeatmapQuery, Types.GetMahjongHeatmapQueryVariables>(GetMahjongHeatmapDocument, options);
        }
// @ts-ignore
export function useGetMahjongHeatmapSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.GetMahjongHeatmapQuery, Types.GetMahjongHeatmapQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetMahjongHeatmapQuery, Types.GetMahjongHeatmapQueryVariables>;
export function useGetMahjongHeatmapSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetMahjongHeatmapQuery, Types.GetMahjongHeatmapQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetMahjongHeatmapQuery | undefined, Types.GetMahjongHeatmapQueryVariables>;
export function useGetMahjongHeatmapSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetMahjongHeatmapQuery, Types.GetMahjongHeatmapQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetMahjongHeatmapQuery, Types.GetMahjongHeatmapQueryVariables>(GetMahjongHeatmapDocument, options);
        }
export type GetMahjongHeatmapQueryHookResult = ReturnType<typeof useGetMahjongHeatmapQuery>;
export type GetMahjongHeatmapLazyQueryHookResult = ReturnType<typeof useGetMahjongHeatmapLazyQuery>;
export type GetMahjongHeatmapSuspenseQueryHookResult = ReturnType<typeof useGetMahjongHeatmapSuspenseQuery>;
export type GetMahjongHeatmapQueryResult = Apollo.QueryResult<Types.GetMahjongHeatmapQuery, Types.GetMahjongHeatmapQueryVariables>;
export const GetMyBadgesDocument = gql`
    query GetMyBadges($storeId: ID) {
  myBadges(storeId: $storeId) {
    id
    userId
    badgeType
    badgeRank
    category
    periodLabel
    title
    awardedAt
    createdAt
  }
}
    `;

/**
 * __useGetMyBadgesQuery__
 *
 * To run a query within a React component, call `useGetMyBadgesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyBadgesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyBadgesQuery({
 *   variables: {
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function useGetMyBadgesQuery(baseOptions?: Apollo.QueryHookOptions<Types.GetMyBadgesQuery, Types.GetMyBadgesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetMyBadgesQuery, Types.GetMyBadgesQueryVariables>(GetMyBadgesDocument, options);
      }
export function useGetMyBadgesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetMyBadgesQuery, Types.GetMyBadgesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetMyBadgesQuery, Types.GetMyBadgesQueryVariables>(GetMyBadgesDocument, options);
        }
// @ts-ignore
export function useGetMyBadgesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.GetMyBadgesQuery, Types.GetMyBadgesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetMyBadgesQuery, Types.GetMyBadgesQueryVariables>;
export function useGetMyBadgesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetMyBadgesQuery, Types.GetMyBadgesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetMyBadgesQuery | undefined, Types.GetMyBadgesQueryVariables>;
export function useGetMyBadgesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetMyBadgesQuery, Types.GetMyBadgesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetMyBadgesQuery, Types.GetMyBadgesQueryVariables>(GetMyBadgesDocument, options);
        }
export type GetMyBadgesQueryHookResult = ReturnType<typeof useGetMyBadgesQuery>;
export type GetMyBadgesLazyQueryHookResult = ReturnType<typeof useGetMyBadgesLazyQuery>;
export type GetMyBadgesSuspenseQueryHookResult = ReturnType<typeof useGetMyBadgesSuspenseQuery>;
export type GetMyBadgesQueryResult = Apollo.QueryResult<Types.GetMyBadgesQuery, Types.GetMyBadgesQueryVariables>;
export const GetMyRankingsDocument = gql`
    query GetMyRankings($storeId: ID) {
  myRankings(storeId: $storeId) {
    category
    period
    rank
    totalPP
    prevRank
    matchCount
  }
}
    `;

/**
 * __useGetMyRankingsQuery__
 *
 * To run a query within a React component, call `useGetMyRankingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyRankingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyRankingsQuery({
 *   variables: {
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function useGetMyRankingsQuery(baseOptions?: Apollo.QueryHookOptions<Types.GetMyRankingsQuery, Types.GetMyRankingsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetMyRankingsQuery, Types.GetMyRankingsQueryVariables>(GetMyRankingsDocument, options);
      }
export function useGetMyRankingsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetMyRankingsQuery, Types.GetMyRankingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetMyRankingsQuery, Types.GetMyRankingsQueryVariables>(GetMyRankingsDocument, options);
        }
// @ts-ignore
export function useGetMyRankingsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.GetMyRankingsQuery, Types.GetMyRankingsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetMyRankingsQuery, Types.GetMyRankingsQueryVariables>;
export function useGetMyRankingsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetMyRankingsQuery, Types.GetMyRankingsQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetMyRankingsQuery | undefined, Types.GetMyRankingsQueryVariables>;
export function useGetMyRankingsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetMyRankingsQuery, Types.GetMyRankingsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetMyRankingsQuery, Types.GetMyRankingsQueryVariables>(GetMyRankingsDocument, options);
        }
export type GetMyRankingsQueryHookResult = ReturnType<typeof useGetMyRankingsQuery>;
export type GetMyRankingsLazyQueryHookResult = ReturnType<typeof useGetMyRankingsLazyQuery>;
export type GetMyRankingsSuspenseQueryHookResult = ReturnType<typeof useGetMyRankingsSuspenseQuery>;
export type GetMyRankingsQueryResult = Apollo.QueryResult<Types.GetMyRankingsQuery, Types.GetMyRankingsQueryVariables>;
export const GetUserBadgesDocument = gql`
    query GetUserBadges($userId: ID!, $storeId: ID) {
  userBadges(userId: $userId, storeId: $storeId) {
    id
    userId
    badgeType
    badgeRank
    category
    periodLabel
    title
    awardedAt
    createdAt
  }
}
    `;

/**
 * __useGetUserBadgesQuery__
 *
 * To run a query within a React component, call `useGetUserBadgesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserBadgesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserBadgesQuery({
 *   variables: {
 *      userId: // value for 'userId'
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function useGetUserBadgesQuery(baseOptions: Apollo.QueryHookOptions<Types.GetUserBadgesQuery, Types.GetUserBadgesQueryVariables> & ({ variables: Types.GetUserBadgesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetUserBadgesQuery, Types.GetUserBadgesQueryVariables>(GetUserBadgesDocument, options);
      }
export function useGetUserBadgesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetUserBadgesQuery, Types.GetUserBadgesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetUserBadgesQuery, Types.GetUserBadgesQueryVariables>(GetUserBadgesDocument, options);
        }
// @ts-ignore
export function useGetUserBadgesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.GetUserBadgesQuery, Types.GetUserBadgesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetUserBadgesQuery, Types.GetUserBadgesQueryVariables>;
export function useGetUserBadgesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetUserBadgesQuery, Types.GetUserBadgesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetUserBadgesQuery | undefined, Types.GetUserBadgesQueryVariables>;
export function useGetUserBadgesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetUserBadgesQuery, Types.GetUserBadgesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetUserBadgesQuery, Types.GetUserBadgesQueryVariables>(GetUserBadgesDocument, options);
        }
export type GetUserBadgesQueryHookResult = ReturnType<typeof useGetUserBadgesQuery>;
export type GetUserBadgesLazyQueryHookResult = ReturnType<typeof useGetUserBadgesLazyQuery>;
export type GetUserBadgesSuspenseQueryHookResult = ReturnType<typeof useGetUserBadgesSuspenseQuery>;
export type GetUserBadgesQueryResult = Apollo.QueryResult<Types.GetUserBadgesQuery, Types.GetUserBadgesQueryVariables>;
export const GetMahjongMatchHistoryDocument = gql`
    query GetMahjongMatchHistory($input: MahjongMatchHistoryInput) {
  mahjongMatchHistory(input: $input) {
    items {
      id
      tableId
      table {
        id
        name
      }
      matchType
      gszRecordId
      gszSynced
      mode
      format
      startedAt
      endedAt
      terminationReason
      players {
        userId
        nickname
        seat
        finalScore
      }
      playersJson
      scores
      config {
        type
        mode
        format
      }
      unsyncableReasons {
        nickname
        userId
        reason
      }
    }
    pageInfo {
      offset
      limit
      total
      nextCursor
      hasMore
    }
  }
}
    `;

/**
 * __useGetMahjongMatchHistoryQuery__
 *
 * To run a query within a React component, call `useGetMahjongMatchHistoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMahjongMatchHistoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMahjongMatchHistoryQuery({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGetMahjongMatchHistoryQuery(baseOptions?: Apollo.QueryHookOptions<Types.GetMahjongMatchHistoryQuery, Types.GetMahjongMatchHistoryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetMahjongMatchHistoryQuery, Types.GetMahjongMatchHistoryQueryVariables>(GetMahjongMatchHistoryDocument, options);
      }
export function useGetMahjongMatchHistoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetMahjongMatchHistoryQuery, Types.GetMahjongMatchHistoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetMahjongMatchHistoryQuery, Types.GetMahjongMatchHistoryQueryVariables>(GetMahjongMatchHistoryDocument, options);
        }
// @ts-ignore
export function useGetMahjongMatchHistorySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.GetMahjongMatchHistoryQuery, Types.GetMahjongMatchHistoryQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetMahjongMatchHistoryQuery, Types.GetMahjongMatchHistoryQueryVariables>;
export function useGetMahjongMatchHistorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetMahjongMatchHistoryQuery, Types.GetMahjongMatchHistoryQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetMahjongMatchHistoryQuery | undefined, Types.GetMahjongMatchHistoryQueryVariables>;
export function useGetMahjongMatchHistorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetMahjongMatchHistoryQuery, Types.GetMahjongMatchHistoryQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetMahjongMatchHistoryQuery, Types.GetMahjongMatchHistoryQueryVariables>(GetMahjongMatchHistoryDocument, options);
        }
export type GetMahjongMatchHistoryQueryHookResult = ReturnType<typeof useGetMahjongMatchHistoryQuery>;
export type GetMahjongMatchHistoryLazyQueryHookResult = ReturnType<typeof useGetMahjongMatchHistoryLazyQuery>;
export type GetMahjongMatchHistorySuspenseQueryHookResult = ReturnType<typeof useGetMahjongMatchHistorySuspenseQuery>;
export type GetMahjongMatchHistoryQueryResult = Apollo.QueryResult<Types.GetMahjongMatchHistoryQuery, Types.GetMahjongMatchHistoryQueryVariables>;
export const MyMahjongMatchesDocument = gql`
    query MyMahjongMatches($storeId: ID) {
  myMahjongMatches(storeId: $storeId) {
    id
    tableId
    table {
      id
      name
      code
    }
    matchType
    gszRecordId
    gszSynced
    gszError
    gszSyncedAt
    mode
    format
    startedAt
    endedAt
    terminationReason
    players {
      userId
      nickname
      seat
      finalScore
    }
    playersJson
    scores
    config {
      type
      mode
      format
    }
    createdAt
  }
}
    `;

/**
 * __useMyMahjongMatchesQuery__
 *
 * To run a query within a React component, call `useMyMahjongMatchesQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyMahjongMatchesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyMahjongMatchesQuery({
 *   variables: {
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function useMyMahjongMatchesQuery(baseOptions?: Apollo.QueryHookOptions<Types.MyMahjongMatchesQuery, Types.MyMahjongMatchesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.MyMahjongMatchesQuery, Types.MyMahjongMatchesQueryVariables>(MyMahjongMatchesDocument, options);
      }
export function useMyMahjongMatchesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.MyMahjongMatchesQuery, Types.MyMahjongMatchesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.MyMahjongMatchesQuery, Types.MyMahjongMatchesQueryVariables>(MyMahjongMatchesDocument, options);
        }
// @ts-ignore
export function useMyMahjongMatchesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.MyMahjongMatchesQuery, Types.MyMahjongMatchesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.MyMahjongMatchesQuery, Types.MyMahjongMatchesQueryVariables>;
export function useMyMahjongMatchesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.MyMahjongMatchesQuery, Types.MyMahjongMatchesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.MyMahjongMatchesQuery | undefined, Types.MyMahjongMatchesQueryVariables>;
export function useMyMahjongMatchesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.MyMahjongMatchesQuery, Types.MyMahjongMatchesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.MyMahjongMatchesQuery, Types.MyMahjongMatchesQueryVariables>(MyMahjongMatchesDocument, options);
        }
export type MyMahjongMatchesQueryHookResult = ReturnType<typeof useMyMahjongMatchesQuery>;
export type MyMahjongMatchesLazyQueryHookResult = ReturnType<typeof useMyMahjongMatchesLazyQuery>;
export type MyMahjongMatchesSuspenseQueryHookResult = ReturnType<typeof useMyMahjongMatchesSuspenseQuery>;
export type MyMahjongMatchesQueryResult = Apollo.QueryResult<Types.MyMahjongMatchesQuery, Types.MyMahjongMatchesQueryVariables>;
export const MyMahjongRegistrationDocument = gql`
    query MyMahjongRegistration {
  myMahjongRegistration {
    hasPhone
    phone
    nickname
    registered
    gszName
    gszId
    gszSynced
    gszError
    alreadyExisted
    nicknameSynced
  }
}
    `;

/**
 * __useMyMahjongRegistrationQuery__
 *
 * To run a query within a React component, call `useMyMahjongRegistrationQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyMahjongRegistrationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyMahjongRegistrationQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyMahjongRegistrationQuery(baseOptions?: Apollo.QueryHookOptions<Types.MyMahjongRegistrationQuery, Types.MyMahjongRegistrationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.MyMahjongRegistrationQuery, Types.MyMahjongRegistrationQueryVariables>(MyMahjongRegistrationDocument, options);
      }
export function useMyMahjongRegistrationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.MyMahjongRegistrationQuery, Types.MyMahjongRegistrationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.MyMahjongRegistrationQuery, Types.MyMahjongRegistrationQueryVariables>(MyMahjongRegistrationDocument, options);
        }
// @ts-ignore
export function useMyMahjongRegistrationSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.MyMahjongRegistrationQuery, Types.MyMahjongRegistrationQueryVariables>): Apollo.UseSuspenseQueryResult<Types.MyMahjongRegistrationQuery, Types.MyMahjongRegistrationQueryVariables>;
export function useMyMahjongRegistrationSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.MyMahjongRegistrationQuery, Types.MyMahjongRegistrationQueryVariables>): Apollo.UseSuspenseQueryResult<Types.MyMahjongRegistrationQuery | undefined, Types.MyMahjongRegistrationQueryVariables>;
export function useMyMahjongRegistrationSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.MyMahjongRegistrationQuery, Types.MyMahjongRegistrationQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.MyMahjongRegistrationQuery, Types.MyMahjongRegistrationQueryVariables>(MyMahjongRegistrationDocument, options);
        }
export type MyMahjongRegistrationQueryHookResult = ReturnType<typeof useMyMahjongRegistrationQuery>;
export type MyMahjongRegistrationLazyQueryHookResult = ReturnType<typeof useMyMahjongRegistrationLazyQuery>;
export type MyMahjongRegistrationSuspenseQueryHookResult = ReturnType<typeof useMyMahjongRegistrationSuspenseQuery>;
export type MyMahjongRegistrationQueryResult = Apollo.QueryResult<Types.MyMahjongRegistrationQuery, Types.MyMahjongRegistrationQueryVariables>;
export const RegisterMahjongDocument = gql`
    mutation RegisterMahjong($input: RegisterMahjongInput!) {
  registerMahjong(input: $input) {
    hasPhone
    phone
    nickname
    registered
    gszName
    gszId
    gszSynced
    gszError
    alreadyExisted
    nicknameSynced
  }
}
    `;
export type RegisterMahjongMutationFn = Apollo.MutationFunction<Types.RegisterMahjongMutation, Types.RegisterMahjongMutationVariables>;

/**
 * __useRegisterMahjongMutation__
 *
 * To run a mutation, you first call `useRegisterMahjongMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRegisterMahjongMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [registerMahjongMutation, { data, loading, error }] = useRegisterMahjongMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRegisterMahjongMutation(baseOptions?: Apollo.MutationHookOptions<Types.RegisterMahjongMutation, Types.RegisterMahjongMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.RegisterMahjongMutation, Types.RegisterMahjongMutationVariables>(RegisterMahjongDocument, options);
      }
export type RegisterMahjongMutationHookResult = ReturnType<typeof useRegisterMahjongMutation>;
export type RegisterMahjongMutationResult = Apollo.MutationResult<Types.RegisterMahjongMutation>;
export type RegisterMahjongMutationOptions = Apollo.BaseMutationOptions<Types.RegisterMahjongMutation, Types.RegisterMahjongMutationVariables>;
export const NotificationReceivedDocument = gql`
    subscription NotificationReceived($userId: ID!) {
  notificationReceived(userId: $userId) {
    id
    userId
    type
    title
    body
    activeId
    createdAt
  }
}
    `;

/**
 * __useNotificationReceivedSubscription__
 *
 * To run a query within a React component, call `useNotificationReceivedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useNotificationReceivedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNotificationReceivedSubscription({
 *   variables: {
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useNotificationReceivedSubscription(baseOptions: Apollo.SubscriptionHookOptions<Types.NotificationReceivedSubscription, Types.NotificationReceivedSubscriptionVariables> & ({ variables: Types.NotificationReceivedSubscriptionVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<Types.NotificationReceivedSubscription, Types.NotificationReceivedSubscriptionVariables>(NotificationReceivedDocument, options);
      }
export type NotificationReceivedSubscriptionHookResult = ReturnType<typeof useNotificationReceivedSubscription>;
export type NotificationReceivedSubscriptionResult = Apollo.SubscriptionResult<Types.NotificationReceivedSubscription>;
export const WechatOpenConfigDocument = gql`
    query WechatOpenConfig {
  wechatOpenConfig {
    appId
  }
}
    `;

/**
 * __useWechatOpenConfigQuery__
 *
 * To run a query within a React component, call `useWechatOpenConfigQuery` and pass it any options that fit your needs.
 * When your component renders, `useWechatOpenConfigQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWechatOpenConfigQuery({
 *   variables: {
 *   },
 * });
 */
export function useWechatOpenConfigQuery(baseOptions?: Apollo.QueryHookOptions<Types.WechatOpenConfigQuery, Types.WechatOpenConfigQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.WechatOpenConfigQuery, Types.WechatOpenConfigQueryVariables>(WechatOpenConfigDocument, options);
      }
export function useWechatOpenConfigLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.WechatOpenConfigQuery, Types.WechatOpenConfigQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.WechatOpenConfigQuery, Types.WechatOpenConfigQueryVariables>(WechatOpenConfigDocument, options);
        }
// @ts-ignore
export function useWechatOpenConfigSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.WechatOpenConfigQuery, Types.WechatOpenConfigQueryVariables>): Apollo.UseSuspenseQueryResult<Types.WechatOpenConfigQuery, Types.WechatOpenConfigQueryVariables>;
export function useWechatOpenConfigSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.WechatOpenConfigQuery, Types.WechatOpenConfigQueryVariables>): Apollo.UseSuspenseQueryResult<Types.WechatOpenConfigQuery | undefined, Types.WechatOpenConfigQueryVariables>;
export function useWechatOpenConfigSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.WechatOpenConfigQuery, Types.WechatOpenConfigQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.WechatOpenConfigQuery, Types.WechatOpenConfigQueryVariables>(WechatOpenConfigDocument, options);
        }
export type WechatOpenConfigQueryHookResult = ReturnType<typeof useWechatOpenConfigQuery>;
export type WechatOpenConfigLazyQueryHookResult = ReturnType<typeof useWechatOpenConfigLazyQuery>;
export type WechatOpenConfigSuspenseQueryHookResult = ReturnType<typeof useWechatOpenConfigSuspenseQuery>;
export type WechatOpenConfigQueryResult = Apollo.QueryResult<Types.WechatOpenConfigQuery, Types.WechatOpenConfigQueryVariables>;
export const SeatUpdatedDocument = gql`
    subscription SeatUpdated($tableCode: String!) {
  seatUpdated(tableCode: $tableCode) {
    tableCode
    table {
      id
      name
      type
      scope
      status
      capacity
      code
    }
    occupancies {
      id
      userId
      nickname
      uid
      seats
      startAt
      status
      tableId
    }
    updatedAt
  }
}
    `;

/**
 * __useSeatUpdatedSubscription__
 *
 * To run a query within a React component, call `useSeatUpdatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useSeatUpdatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSeatUpdatedSubscription({
 *   variables: {
 *      tableCode: // value for 'tableCode'
 *   },
 * });
 */
export function useSeatUpdatedSubscription(baseOptions: Apollo.SubscriptionHookOptions<Types.SeatUpdatedSubscription, Types.SeatUpdatedSubscriptionVariables> & ({ variables: Types.SeatUpdatedSubscriptionVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<Types.SeatUpdatedSubscription, Types.SeatUpdatedSubscriptionVariables>(SeatUpdatedDocument, options);
      }
export type SeatUpdatedSubscriptionHookResult = ReturnType<typeof useSeatUpdatedSubscription>;
export type SeatUpdatedSubscriptionResult = Apollo.SubscriptionResult<Types.SeatUpdatedSubscription>;
export const TableByCodeDocument = gql`
    query TableByCode($code: String!, $storeId: ID) {
  tableByCode(code: $code, storeId: $storeId) {
    id
    name
    type
    scope
    status
    capacity
    code
    description
    storeId
    occupancies {
      id
      tableId
      userId
      tempId
      nickname
      uid
      seats
      status
      startAt
      endAt
      finalPrice
    }
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useTableByCodeQuery__
 *
 * To run a query within a React component, call `useTableByCodeQuery` and pass it any options that fit your needs.
 * When your component renders, `useTableByCodeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTableByCodeQuery({
 *   variables: {
 *      code: // value for 'code'
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function useTableByCodeQuery(baseOptions: Apollo.QueryHookOptions<Types.TableByCodeQuery, Types.TableByCodeQueryVariables> & ({ variables: Types.TableByCodeQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.TableByCodeQuery, Types.TableByCodeQueryVariables>(TableByCodeDocument, options);
      }
export function useTableByCodeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.TableByCodeQuery, Types.TableByCodeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.TableByCodeQuery, Types.TableByCodeQueryVariables>(TableByCodeDocument, options);
        }
// @ts-ignore
export function useTableByCodeSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.TableByCodeQuery, Types.TableByCodeQueryVariables>): Apollo.UseSuspenseQueryResult<Types.TableByCodeQuery, Types.TableByCodeQueryVariables>;
export function useTableByCodeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.TableByCodeQuery, Types.TableByCodeQueryVariables>): Apollo.UseSuspenseQueryResult<Types.TableByCodeQuery | undefined, Types.TableByCodeQueryVariables>;
export function useTableByCodeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.TableByCodeQuery, Types.TableByCodeQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.TableByCodeQuery, Types.TableByCodeQueryVariables>(TableByCodeDocument, options);
        }
export type TableByCodeQueryHookResult = ReturnType<typeof useTableByCodeQuery>;
export type TableByCodeLazyQueryHookResult = ReturnType<typeof useTableByCodeLazyQuery>;
export type TableByCodeSuspenseQueryHookResult = ReturnType<typeof useTableByCodeSuspenseQuery>;
export type TableByCodeQueryResult = Apollo.QueryResult<Types.TableByCodeQuery, Types.TableByCodeQueryVariables>;
export const MyActiveOccupanciesDocument = gql`
    query MyActiveOccupancies($storeId: ID) {
  myActiveOccupancies(storeId: $storeId) {
    code
    name
    status
  }
}
    `;

/**
 * __useMyActiveOccupanciesQuery__
 *
 * To run a query within a React component, call `useMyActiveOccupanciesQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyActiveOccupanciesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyActiveOccupanciesQuery({
 *   variables: {
 *      storeId: // value for 'storeId'
 *   },
 * });
 */
export function useMyActiveOccupanciesQuery(baseOptions?: Apollo.QueryHookOptions<Types.MyActiveOccupanciesQuery, Types.MyActiveOccupanciesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.MyActiveOccupanciesQuery, Types.MyActiveOccupanciesQueryVariables>(MyActiveOccupanciesDocument, options);
      }
export function useMyActiveOccupanciesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.MyActiveOccupanciesQuery, Types.MyActiveOccupanciesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.MyActiveOccupanciesQuery, Types.MyActiveOccupanciesQueryVariables>(MyActiveOccupanciesDocument, options);
        }
// @ts-ignore
export function useMyActiveOccupanciesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.MyActiveOccupanciesQuery, Types.MyActiveOccupanciesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.MyActiveOccupanciesQuery, Types.MyActiveOccupanciesQueryVariables>;
export function useMyActiveOccupanciesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.MyActiveOccupanciesQuery, Types.MyActiveOccupanciesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.MyActiveOccupanciesQuery | undefined, Types.MyActiveOccupanciesQueryVariables>;
export function useMyActiveOccupanciesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.MyActiveOccupanciesQuery, Types.MyActiveOccupanciesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.MyActiveOccupanciesQuery, Types.MyActiveOccupanciesQueryVariables>(MyActiveOccupanciesDocument, options);
        }
export type MyActiveOccupanciesQueryHookResult = ReturnType<typeof useMyActiveOccupanciesQuery>;
export type MyActiveOccupanciesLazyQueryHookResult = ReturnType<typeof useMyActiveOccupanciesLazyQuery>;
export type MyActiveOccupanciesSuspenseQueryHookResult = ReturnType<typeof useMyActiveOccupanciesSuspenseQuery>;
export type MyActiveOccupanciesQueryResult = Apollo.QueryResult<Types.MyActiveOccupanciesQuery, Types.MyActiveOccupanciesQueryVariables>;
export const PauseMyOrderDocument = gql`
    mutation PauseMyOrder($input: LeaveTableInput!) {
  pauseMyOrder(input: $input) {
    id
    tableId
    userId
    nickname
    status
    startAt
    endAt
  }
}
    `;
export type PauseMyOrderMutationFn = Apollo.MutationFunction<Types.PauseMyOrderMutation, Types.PauseMyOrderMutationVariables>;

/**
 * __usePauseMyOrderMutation__
 *
 * To run a mutation, you first call `usePauseMyOrderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePauseMyOrderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pauseMyOrderMutation, { data, loading, error }] = usePauseMyOrderMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function usePauseMyOrderMutation(baseOptions?: Apollo.MutationHookOptions<Types.PauseMyOrderMutation, Types.PauseMyOrderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.PauseMyOrderMutation, Types.PauseMyOrderMutationVariables>(PauseMyOrderDocument, options);
      }
export type PauseMyOrderMutationHookResult = ReturnType<typeof usePauseMyOrderMutation>;
export type PauseMyOrderMutationResult = Apollo.MutationResult<Types.PauseMyOrderMutation>;
export type PauseMyOrderMutationOptions = Apollo.BaseMutationOptions<Types.PauseMyOrderMutation, Types.PauseMyOrderMutationVariables>;
export const OccupyTableDocument = gql`
    mutation OccupyTable($input: OccupyTableInput!) {
  occupyTable(input: $input) {
    occupancy {
      id
      tableId
      userId
      nickname
      status
      startAt
      endAt
    }
    table {
      id
      code
      name
    }
  }
}
    `;
export type OccupyTableMutationFn = Apollo.MutationFunction<Types.OccupyTableMutation, Types.OccupyTableMutationVariables>;

/**
 * __useOccupyTableMutation__
 *
 * To run a mutation, you first call `useOccupyTableMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useOccupyTableMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [occupyTableMutation, { data, loading, error }] = useOccupyTableMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useOccupyTableMutation(baseOptions?: Apollo.MutationHookOptions<Types.OccupyTableMutation, Types.OccupyTableMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.OccupyTableMutation, Types.OccupyTableMutationVariables>(OccupyTableDocument, options);
      }
export type OccupyTableMutationHookResult = ReturnType<typeof useOccupyTableMutation>;
export type OccupyTableMutationResult = Apollo.MutationResult<Types.OccupyTableMutation>;
export type OccupyTableMutationOptions = Apollo.BaseMutationOptions<Types.OccupyTableMutation, Types.OccupyTableMutationVariables>;
export const CreateTempIdentityDocument = gql`
    mutation CreateTempIdentity {
  createTempIdentity {
    id
    nickname
    totpSecret
    expiresAt
    valid
  }
}
    `;
export type CreateTempIdentityMutationFn = Apollo.MutationFunction<Types.CreateTempIdentityMutation, Types.CreateTempIdentityMutationVariables>;

/**
 * __useCreateTempIdentityMutation__
 *
 * To run a mutation, you first call `useCreateTempIdentityMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateTempIdentityMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createTempIdentityMutation, { data, loading, error }] = useCreateTempIdentityMutation({
 *   variables: {
 *   },
 * });
 */
export function useCreateTempIdentityMutation(baseOptions?: Apollo.MutationHookOptions<Types.CreateTempIdentityMutation, Types.CreateTempIdentityMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.CreateTempIdentityMutation, Types.CreateTempIdentityMutationVariables>(CreateTempIdentityDocument, options);
      }
export type CreateTempIdentityMutationHookResult = ReturnType<typeof useCreateTempIdentityMutation>;
export type CreateTempIdentityMutationResult = Apollo.MutationResult<Types.CreateTempIdentityMutation>;
export type CreateTempIdentityMutationOptions = Apollo.BaseMutationOptions<Types.CreateTempIdentityMutation, Types.CreateTempIdentityMutationVariables>;
export const ValidateTempIdentityDocument = gql`
    query ValidateTempIdentity($tempId: ID!) {
  validateTempIdentity(tempId: $tempId) {
    id
    nickname
    totpSecret
    expiresAt
    valid
  }
}
    `;

/**
 * __useValidateTempIdentityQuery__
 *
 * To run a query within a React component, call `useValidateTempIdentityQuery` and pass it any options that fit your needs.
 * When your component renders, `useValidateTempIdentityQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useValidateTempIdentityQuery({
 *   variables: {
 *      tempId: // value for 'tempId'
 *   },
 * });
 */
export function useValidateTempIdentityQuery(baseOptions: Apollo.QueryHookOptions<Types.ValidateTempIdentityQuery, Types.ValidateTempIdentityQueryVariables> & ({ variables: Types.ValidateTempIdentityQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.ValidateTempIdentityQuery, Types.ValidateTempIdentityQueryVariables>(ValidateTempIdentityDocument, options);
      }
export function useValidateTempIdentityLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.ValidateTempIdentityQuery, Types.ValidateTempIdentityQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.ValidateTempIdentityQuery, Types.ValidateTempIdentityQueryVariables>(ValidateTempIdentityDocument, options);
        }
// @ts-ignore
export function useValidateTempIdentitySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.ValidateTempIdentityQuery, Types.ValidateTempIdentityQueryVariables>): Apollo.UseSuspenseQueryResult<Types.ValidateTempIdentityQuery, Types.ValidateTempIdentityQueryVariables>;
export function useValidateTempIdentitySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.ValidateTempIdentityQuery, Types.ValidateTempIdentityQueryVariables>): Apollo.UseSuspenseQueryResult<Types.ValidateTempIdentityQuery | undefined, Types.ValidateTempIdentityQueryVariables>;
export function useValidateTempIdentitySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.ValidateTempIdentityQuery, Types.ValidateTempIdentityQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.ValidateTempIdentityQuery, Types.ValidateTempIdentityQueryVariables>(ValidateTempIdentityDocument, options);
        }
export type ValidateTempIdentityQueryHookResult = ReturnType<typeof useValidateTempIdentityQuery>;
export type ValidateTempIdentityLazyQueryHookResult = ReturnType<typeof useValidateTempIdentityLazyQuery>;
export type ValidateTempIdentitySuspenseQueryHookResult = ReturnType<typeof useValidateTempIdentitySuspenseQuery>;
export type ValidateTempIdentityQueryResult = Apollo.QueryResult<Types.ValidateTempIdentityQuery, Types.ValidateTempIdentityQueryVariables>;
export const TempIdentityActiveOccupanciesDocument = gql`
    query TempIdentityActiveOccupancies($tempId: ID!) {
  tempIdentityActiveOccupancies(tempId: $tempId) {
    code
    name
    status
  }
}
    `;

/**
 * __useTempIdentityActiveOccupanciesQuery__
 *
 * To run a query within a React component, call `useTempIdentityActiveOccupanciesQuery` and pass it any options that fit your needs.
 * When your component renders, `useTempIdentityActiveOccupanciesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTempIdentityActiveOccupanciesQuery({
 *   variables: {
 *      tempId: // value for 'tempId'
 *   },
 * });
 */
export function useTempIdentityActiveOccupanciesQuery(baseOptions: Apollo.QueryHookOptions<Types.TempIdentityActiveOccupanciesQuery, Types.TempIdentityActiveOccupanciesQueryVariables> & ({ variables: Types.TempIdentityActiveOccupanciesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.TempIdentityActiveOccupanciesQuery, Types.TempIdentityActiveOccupanciesQueryVariables>(TempIdentityActiveOccupanciesDocument, options);
      }
export function useTempIdentityActiveOccupanciesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.TempIdentityActiveOccupanciesQuery, Types.TempIdentityActiveOccupanciesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.TempIdentityActiveOccupanciesQuery, Types.TempIdentityActiveOccupanciesQueryVariables>(TempIdentityActiveOccupanciesDocument, options);
        }
// @ts-ignore
export function useTempIdentityActiveOccupanciesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.TempIdentityActiveOccupanciesQuery, Types.TempIdentityActiveOccupanciesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.TempIdentityActiveOccupanciesQuery, Types.TempIdentityActiveOccupanciesQueryVariables>;
export function useTempIdentityActiveOccupanciesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.TempIdentityActiveOccupanciesQuery, Types.TempIdentityActiveOccupanciesQueryVariables>): Apollo.UseSuspenseQueryResult<Types.TempIdentityActiveOccupanciesQuery | undefined, Types.TempIdentityActiveOccupanciesQueryVariables>;
export function useTempIdentityActiveOccupanciesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.TempIdentityActiveOccupanciesQuery, Types.TempIdentityActiveOccupanciesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.TempIdentityActiveOccupanciesQuery, Types.TempIdentityActiveOccupanciesQueryVariables>(TempIdentityActiveOccupanciesDocument, options);
        }
export type TempIdentityActiveOccupanciesQueryHookResult = ReturnType<typeof useTempIdentityActiveOccupanciesQuery>;
export type TempIdentityActiveOccupanciesLazyQueryHookResult = ReturnType<typeof useTempIdentityActiveOccupanciesLazyQuery>;
export type TempIdentityActiveOccupanciesSuspenseQueryHookResult = ReturnType<typeof useTempIdentityActiveOccupanciesSuspenseQuery>;
export type TempIdentityActiveOccupanciesQueryResult = Apollo.QueryResult<Types.TempIdentityActiveOccupanciesQuery, Types.TempIdentityActiveOccupanciesQueryVariables>;
export const TransferTempIdentityDocument = gql`
    mutation TransferTempIdentity($tempId: ID!, $userId: ID!) {
  transferTempIdentity(tempId: $tempId, userId: $userId) {
    transferred
    occupancy {
      id
      tableId
      userId
      nickname
      status
    }
  }
}
    `;
export type TransferTempIdentityMutationFn = Apollo.MutationFunction<Types.TransferTempIdentityMutation, Types.TransferTempIdentityMutationVariables>;

/**
 * __useTransferTempIdentityMutation__
 *
 * To run a mutation, you first call `useTransferTempIdentityMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useTransferTempIdentityMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [transferTempIdentityMutation, { data, loading, error }] = useTransferTempIdentityMutation({
 *   variables: {
 *      tempId: // value for 'tempId'
 *      userId: // value for 'userId'
 *   },
 * });
 */
export function useTransferTempIdentityMutation(baseOptions?: Apollo.MutationHookOptions<Types.TransferTempIdentityMutation, Types.TransferTempIdentityMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.TransferTempIdentityMutation, Types.TransferTempIdentityMutationVariables>(TransferTempIdentityDocument, options);
      }
export type TransferTempIdentityMutationHookResult = ReturnType<typeof useTransferTempIdentityMutation>;
export type TransferTempIdentityMutationResult = Apollo.MutationResult<Types.TransferTempIdentityMutation>;
export type TransferTempIdentityMutationOptions = Apollo.BaseMutationOptions<Types.TransferTempIdentityMutation, Types.TransferTempIdentityMutationVariables>;
export const OccupyTableWithTempIdentityDocument = gql`
    mutation OccupyTableWithTempIdentity($input: TempIdentityOccupyInput!) {
  occupyTableWithTempIdentity(input: $input) {
    occupancy {
      id
      tableId
      userId
      nickname
      status
    }
    table {
      id
      code
      name
    }
  }
}
    `;
export type OccupyTableWithTempIdentityMutationFn = Apollo.MutationFunction<Types.OccupyTableWithTempIdentityMutation, Types.OccupyTableWithTempIdentityMutationVariables>;

/**
 * __useOccupyTableWithTempIdentityMutation__
 *
 * To run a mutation, you first call `useOccupyTableWithTempIdentityMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useOccupyTableWithTempIdentityMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [occupyTableWithTempIdentityMutation, { data, loading, error }] = useOccupyTableWithTempIdentityMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useOccupyTableWithTempIdentityMutation(baseOptions?: Apollo.MutationHookOptions<Types.OccupyTableWithTempIdentityMutation, Types.OccupyTableWithTempIdentityMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.OccupyTableWithTempIdentityMutation, Types.OccupyTableWithTempIdentityMutationVariables>(OccupyTableWithTempIdentityDocument, options);
      }
export type OccupyTableWithTempIdentityMutationHookResult = ReturnType<typeof useOccupyTableWithTempIdentityMutation>;
export type OccupyTableWithTempIdentityMutationResult = Apollo.MutationResult<Types.OccupyTableWithTempIdentityMutation>;
export type OccupyTableWithTempIdentityMutationOptions = Apollo.BaseMutationOptions<Types.OccupyTableWithTempIdentityMutation, Types.OccupyTableWithTempIdentityMutationVariables>;
export const GetMyBusinessCardDocument = gql`
    query GetMyBusinessCard {
  myBusinessCard {
    userId
    nickname
    uid
    sharePhone
    phone
    wechat
    qq
    customContent
    isWatching
    registrationId
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetMyBusinessCardQuery__
 *
 * To run a query within a React component, call `useGetMyBusinessCardQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyBusinessCardQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyBusinessCardQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetMyBusinessCardQuery(baseOptions?: Apollo.QueryHookOptions<Types.GetMyBusinessCardQuery, Types.GetMyBusinessCardQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetMyBusinessCardQuery, Types.GetMyBusinessCardQueryVariables>(GetMyBusinessCardDocument, options);
      }
export function useGetMyBusinessCardLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetMyBusinessCardQuery, Types.GetMyBusinessCardQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetMyBusinessCardQuery, Types.GetMyBusinessCardQueryVariables>(GetMyBusinessCardDocument, options);
        }
// @ts-ignore
export function useGetMyBusinessCardSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.GetMyBusinessCardQuery, Types.GetMyBusinessCardQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetMyBusinessCardQuery, Types.GetMyBusinessCardQueryVariables>;
export function useGetMyBusinessCardSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetMyBusinessCardQuery, Types.GetMyBusinessCardQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetMyBusinessCardQuery | undefined, Types.GetMyBusinessCardQueryVariables>;
export function useGetMyBusinessCardSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetMyBusinessCardQuery, Types.GetMyBusinessCardQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetMyBusinessCardQuery, Types.GetMyBusinessCardQueryVariables>(GetMyBusinessCardDocument, options);
        }
export type GetMyBusinessCardQueryHookResult = ReturnType<typeof useGetMyBusinessCardQuery>;
export type GetMyBusinessCardLazyQueryHookResult = ReturnType<typeof useGetMyBusinessCardLazyQuery>;
export type GetMyBusinessCardSuspenseQueryHookResult = ReturnType<typeof useGetMyBusinessCardSuspenseQuery>;
export type GetMyBusinessCardQueryResult = Apollo.QueryResult<Types.GetMyBusinessCardQuery, Types.GetMyBusinessCardQueryVariables>;
export const UpsertBusinessCardDocument = gql`
    mutation UpsertBusinessCard($input: UpsertBusinessCardInput!) {
  upsertBusinessCard(input: $input) {
    userId
    nickname
    uid
    sharePhone
    phone
    wechat
    qq
    customContent
    isWatching
    registrationId
    createdAt
    updatedAt
  }
}
    `;
export type UpsertBusinessCardMutationFn = Apollo.MutationFunction<Types.UpsertBusinessCardMutation, Types.UpsertBusinessCardMutationVariables>;

/**
 * __useUpsertBusinessCardMutation__
 *
 * To run a mutation, you first call `useUpsertBusinessCardMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpsertBusinessCardMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [upsertBusinessCardMutation, { data, loading, error }] = useUpsertBusinessCardMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpsertBusinessCardMutation(baseOptions?: Apollo.MutationHookOptions<Types.UpsertBusinessCardMutation, Types.UpsertBusinessCardMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.UpsertBusinessCardMutation, Types.UpsertBusinessCardMutationVariables>(UpsertBusinessCardDocument, options);
      }
export type UpsertBusinessCardMutationHookResult = ReturnType<typeof useUpsertBusinessCardMutation>;
export type UpsertBusinessCardMutationResult = Apollo.MutationResult<Types.UpsertBusinessCardMutation>;
export type UpsertBusinessCardMutationOptions = Apollo.BaseMutationOptions<Types.UpsertBusinessCardMutation, Types.UpsertBusinessCardMutationVariables>;
export const GetMyMembershipPlansDocument = gql`
    query GetMyMembershipPlans {
  myMembershipPlans {
    id
    userId
    planType
    amount
    note
    startDate
    endDate
    createdAt
    updatedAt
  }
}
    `;

/**
 * __useGetMyMembershipPlansQuery__
 *
 * To run a query within a React component, call `useGetMyMembershipPlansQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyMembershipPlansQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyMembershipPlansQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetMyMembershipPlansQuery(baseOptions?: Apollo.QueryHookOptions<Types.GetMyMembershipPlansQuery, Types.GetMyMembershipPlansQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetMyMembershipPlansQuery, Types.GetMyMembershipPlansQueryVariables>(GetMyMembershipPlansDocument, options);
      }
export function useGetMyMembershipPlansLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetMyMembershipPlansQuery, Types.GetMyMembershipPlansQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetMyMembershipPlansQuery, Types.GetMyMembershipPlansQueryVariables>(GetMyMembershipPlansDocument, options);
        }
// @ts-ignore
export function useGetMyMembershipPlansSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.GetMyMembershipPlansQuery, Types.GetMyMembershipPlansQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetMyMembershipPlansQuery, Types.GetMyMembershipPlansQueryVariables>;
export function useGetMyMembershipPlansSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetMyMembershipPlansQuery, Types.GetMyMembershipPlansQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetMyMembershipPlansQuery | undefined, Types.GetMyMembershipPlansQueryVariables>;
export function useGetMyMembershipPlansSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetMyMembershipPlansQuery, Types.GetMyMembershipPlansQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetMyMembershipPlansQuery, Types.GetMyMembershipPlansQueryVariables>(GetMyMembershipPlansDocument, options);
        }
export type GetMyMembershipPlansQueryHookResult = ReturnType<typeof useGetMyMembershipPlansQuery>;
export type GetMyMembershipPlansLazyQueryHookResult = ReturnType<typeof useGetMyMembershipPlansLazyQuery>;
export type GetMyMembershipPlansSuspenseQueryHookResult = ReturnType<typeof useGetMyMembershipPlansSuspenseQuery>;
export type GetMyMembershipPlansQueryResult = Apollo.QueryResult<Types.GetMyMembershipPlansQuery, Types.GetMyMembershipPlansQueryVariables>;
export const UpdateMyUserInfoDocument = gql`
    mutation UpdateMyUserInfo($input: UpdateMyUserInfoInput!) {
  updateMyUserInfo(input: $input) {
    success
    message
    user {
      id
      uid
      name
      email
      image
      avatarUrl
      role
      nickname
      phone
      preferredLocale
      preferredStoreId
      preferredTheme
      meta
      createdAt
      membershipPlans {
        id
        userId
        planType
        amount
        note
        startDate
        endDate
        createdAt
        updatedAt
      }
    }
  }
}
    `;
export type UpdateMyUserInfoMutationFn = Apollo.MutationFunction<Types.UpdateMyUserInfoMutation, Types.UpdateMyUserInfoMutationVariables>;

/**
 * __useUpdateMyUserInfoMutation__
 *
 * To run a mutation, you first call `useUpdateMyUserInfoMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateMyUserInfoMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateMyUserInfoMutation, { data, loading, error }] = useUpdateMyUserInfoMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateMyUserInfoMutation(baseOptions?: Apollo.MutationHookOptions<Types.UpdateMyUserInfoMutation, Types.UpdateMyUserInfoMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.UpdateMyUserInfoMutation, Types.UpdateMyUserInfoMutationVariables>(UpdateMyUserInfoDocument, options);
      }
export type UpdateMyUserInfoMutationHookResult = ReturnType<typeof useUpdateMyUserInfoMutation>;
export type UpdateMyUserInfoMutationResult = Apollo.MutationResult<Types.UpdateMyUserInfoMutation>;
export type UpdateMyUserInfoMutationOptions = Apollo.BaseMutationOptions<Types.UpdateMyUserInfoMutation, Types.UpdateMyUserInfoMutationVariables>;
export const UpdateMyPreferencesDocument = gql`
    mutation UpdateMyPreferences($input: UpdatePreferencesInput!) {
  updateMyPreferences(input: $input) {
    id
    uid
    name
    email
    image
    role
    nickname
    phone
    preferredLocale
    preferredStoreId
    preferredTheme
    meta
    createdAt
    membershipPlans {
      id
      userId
      planType
      amount
      note
      startDate
      endDate
      createdAt
      updatedAt
    }
  }
}
    `;
export type UpdateMyPreferencesMutationFn = Apollo.MutationFunction<Types.UpdateMyPreferencesMutation, Types.UpdateMyPreferencesMutationVariables>;

/**
 * __useUpdateMyPreferencesMutation__
 *
 * To run a mutation, you first call `useUpdateMyPreferencesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateMyPreferencesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateMyPreferencesMutation, { data, loading, error }] = useUpdateMyPreferencesMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateMyPreferencesMutation(baseOptions?: Apollo.MutationHookOptions<Types.UpdateMyPreferencesMutation, Types.UpdateMyPreferencesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.UpdateMyPreferencesMutation, Types.UpdateMyPreferencesMutationVariables>(UpdateMyPreferencesDocument, options);
      }
export type UpdateMyPreferencesMutationHookResult = ReturnType<typeof useUpdateMyPreferencesMutation>;
export type UpdateMyPreferencesMutationResult = Apollo.MutationResult<Types.UpdateMyPreferencesMutation>;
export type UpdateMyPreferencesMutationOptions = Apollo.BaseMutationOptions<Types.UpdateMyPreferencesMutation, Types.UpdateMyPreferencesMutationVariables>;
export const RequestSmsCodeDocument = gql`
    mutation RequestSmsCode($input: RequestSmsCodeInput!) {
  requestSmsCode(input: $input) {
    success
    message
    expiresInMs
  }
}
    `;
export type RequestSmsCodeMutationFn = Apollo.MutationFunction<Types.RequestSmsCodeMutation, Types.RequestSmsCodeMutationVariables>;

/**
 * __useRequestSmsCodeMutation__
 *
 * To run a mutation, you first call `useRequestSmsCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestSmsCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestSmsCodeMutation, { data, loading, error }] = useRequestSmsCodeMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRequestSmsCodeMutation(baseOptions?: Apollo.MutationHookOptions<Types.RequestSmsCodeMutation, Types.RequestSmsCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.RequestSmsCodeMutation, Types.RequestSmsCodeMutationVariables>(RequestSmsCodeDocument, options);
      }
export type RequestSmsCodeMutationHookResult = ReturnType<typeof useRequestSmsCodeMutation>;
export type RequestSmsCodeMutationResult = Apollo.MutationResult<Types.RequestSmsCodeMutation>;
export type RequestSmsCodeMutationOptions = Apollo.BaseMutationOptions<Types.RequestSmsCodeMutation, Types.RequestSmsCodeMutationVariables>;
export const SendSmsCodeDocument = gql`
    mutation SendSmsCode($input: SendSmsCodeInput!) {
  sendSmsCode(input: $input) {
    success
    message
    expiresInMs
  }
}
    `;
export type SendSmsCodeMutationFn = Apollo.MutationFunction<Types.SendSmsCodeMutation, Types.SendSmsCodeMutationVariables>;

/**
 * __useSendSmsCodeMutation__
 *
 * To run a mutation, you first call `useSendSmsCodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSendSmsCodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [sendSmsCodeMutation, { data, loading, error }] = useSendSmsCodeMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSendSmsCodeMutation(baseOptions?: Apollo.MutationHookOptions<Types.SendSmsCodeMutation, Types.SendSmsCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<Types.SendSmsCodeMutation, Types.SendSmsCodeMutationVariables>(SendSmsCodeDocument, options);
      }
export type SendSmsCodeMutationHookResult = ReturnType<typeof useSendSmsCodeMutation>;
export type SendSmsCodeMutationResult = Apollo.MutationResult<Types.SendSmsCodeMutation>;
export type SendSmsCodeMutationOptions = Apollo.BaseMutationOptions<Types.SendSmsCodeMutation, Types.SendSmsCodeMutationVariables>;
export const GetTotpSecretDocument = gql`
    query GetTotpSecret {
  getTotpSecret {
    success
    message
    secret
  }
}
    `;

/**
 * __useGetTotpSecretQuery__
 *
 * To run a query within a React component, call `useGetTotpSecretQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTotpSecretQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTotpSecretQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetTotpSecretQuery(baseOptions?: Apollo.QueryHookOptions<Types.GetTotpSecretQuery, Types.GetTotpSecretQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetTotpSecretQuery, Types.GetTotpSecretQueryVariables>(GetTotpSecretDocument, options);
      }
export function useGetTotpSecretLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetTotpSecretQuery, Types.GetTotpSecretQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetTotpSecretQuery, Types.GetTotpSecretQueryVariables>(GetTotpSecretDocument, options);
        }
// @ts-ignore
export function useGetTotpSecretSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.GetTotpSecretQuery, Types.GetTotpSecretQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetTotpSecretQuery, Types.GetTotpSecretQueryVariables>;
export function useGetTotpSecretSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetTotpSecretQuery, Types.GetTotpSecretQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetTotpSecretQuery | undefined, Types.GetTotpSecretQueryVariables>;
export function useGetTotpSecretSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetTotpSecretQuery, Types.GetTotpSecretQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetTotpSecretQuery, Types.GetTotpSecretQueryVariables>(GetTotpSecretDocument, options);
        }
export type GetTotpSecretQueryHookResult = ReturnType<typeof useGetTotpSecretQuery>;
export type GetTotpSecretLazyQueryHookResult = ReturnType<typeof useGetTotpSecretLazyQuery>;
export type GetTotpSecretSuspenseQueryHookResult = ReturnType<typeof useGetTotpSecretSuspenseQuery>;
export type GetTotpSecretQueryResult = Apollo.QueryResult<Types.GetTotpSecretQuery, Types.GetTotpSecretQueryVariables>;
export const GetMyPointsBalanceDocument = gql`
    query GetMyPointsBalance {
  myPointsBalance
}
    `;

/**
 * __useGetMyPointsBalanceQuery__
 *
 * To run a query within a React component, call `useGetMyPointsBalanceQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyPointsBalanceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyPointsBalanceQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetMyPointsBalanceQuery(baseOptions?: Apollo.QueryHookOptions<Types.GetMyPointsBalanceQuery, Types.GetMyPointsBalanceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<Types.GetMyPointsBalanceQuery, Types.GetMyPointsBalanceQueryVariables>(GetMyPointsBalanceDocument, options);
      }
export function useGetMyPointsBalanceLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<Types.GetMyPointsBalanceQuery, Types.GetMyPointsBalanceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<Types.GetMyPointsBalanceQuery, Types.GetMyPointsBalanceQueryVariables>(GetMyPointsBalanceDocument, options);
        }
// @ts-ignore
export function useGetMyPointsBalanceSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<Types.GetMyPointsBalanceQuery, Types.GetMyPointsBalanceQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetMyPointsBalanceQuery, Types.GetMyPointsBalanceQueryVariables>;
export function useGetMyPointsBalanceSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetMyPointsBalanceQuery, Types.GetMyPointsBalanceQueryVariables>): Apollo.UseSuspenseQueryResult<Types.GetMyPointsBalanceQuery | undefined, Types.GetMyPointsBalanceQueryVariables>;
export function useGetMyPointsBalanceSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<Types.GetMyPointsBalanceQuery, Types.GetMyPointsBalanceQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<Types.GetMyPointsBalanceQuery, Types.GetMyPointsBalanceQueryVariables>(GetMyPointsBalanceDocument, options);
        }
export type GetMyPointsBalanceQueryHookResult = ReturnType<typeof useGetMyPointsBalanceQuery>;
export type GetMyPointsBalanceLazyQueryHookResult = ReturnType<typeof useGetMyPointsBalanceLazyQuery>;
export type GetMyPointsBalanceSuspenseQueryHookResult = ReturnType<typeof useGetMyPointsBalanceSuspenseQuery>;
export type GetMyPointsBalanceQueryResult = Apollo.QueryResult<Types.GetMyPointsBalanceQuery, Types.GetMyPointsBalanceQueryVariables>;