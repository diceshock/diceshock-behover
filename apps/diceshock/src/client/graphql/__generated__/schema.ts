/* eslint-disable */
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Active = {
  __typename?: 'Active';
  boardGame?: Maybe<BoardGameSummary>;
  boardGameId?: Maybe<Scalars['ID']['output']>;
  boardGames: Array<BoardGameSummary>;
  content?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  creator?: Maybe<UserProfile>;
  creatorId: Scalars['ID']['output'];
  date: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isGame: Scalars['Boolean']['output'];
  isSystemRecommended: Scalars['Boolean']['output'];
  maxPlayers: Scalars['Int']['output'];
  registrations: Array<ActiveRegistration>;
  storeId?: Maybe<Scalars['ID']['output']>;
  time?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export enum ActiveDateRange {
  Month = 'MONTH',
  Today = 'TODAY',
  Week = 'WEEK',
  Year = 'YEAR'
}

export type ActiveFilterInput = {
  creator?: InputMaybe<Scalars['String']['input']>;
  dateFrom?: InputMaybe<Scalars['String']['input']>;
  dateTo?: InputMaybe<Scalars['String']['input']>;
  pagination?: InputMaybe<CursorPaginationInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<SortOrder>;
  status?: InputMaybe<Array<Scalars['String']['input']>>;
  store?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export type ActiveListInput = {
  dateRange?: InputMaybe<ActiveDateRange>;
  pagination?: InputMaybe<CursorPaginationInput>;
  showExpired?: InputMaybe<Scalars['Boolean']['input']>;
  storeId?: InputMaybe<Scalars['ID']['input']>;
};

export type ActiveListResult = {
  __typename?: 'ActiveListResult';
  items: Array<Active>;
  pageInfo: PageInfo;
};

export type ActiveMahjongMatch = {
  __typename?: 'ActiveMahjongMatch';
  format: MahjongFormat;
  matchType: MahjongMatchType;
  mode: MahjongMode;
  phase: Scalars['String']['output'];
  players: Array<MahjongPlayer>;
  startedAt?: Maybe<Scalars['String']['output']>;
  tableCode: Scalars['String']['output'];
  tableId: Scalars['ID']['output'];
  tableName: Scalars['String']['output'];
};

export type ActiveOccupancySummary = {
  __typename?: 'ActiveOccupancySummary';
  code: Scalars['String']['output'];
  name: Scalars['String']['output'];
  status: OrderStatus;
};

export type ActiveParticipantsChangedPayload = {
  __typename?: 'ActiveParticipantsChangedPayload';
  active: Active;
  participants: Array<ActiveRegistration>;
  updatedAt: Scalars['String']['output'];
};

export type ActiveRegistration = {
  __typename?: 'ActiveRegistration';
  activeId: Scalars['ID']['output'];
  createdAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isWatching: Scalars['Boolean']['output'];
  nickname?: Maybe<Scalars['String']['output']>;
  uid?: Maybe<Scalars['String']['output']>;
  userId: Scalars['ID']['output'];
};

export type AddOccupancyInput = {
  tableId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};

export type AddPointsInput = {
  amount: Scalars['Int']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['ID']['input'];
};

export type AddWechatTemplateFromLibraryInput = {
  keywordNameList?: InputMaybe<Array<Scalars['String']['input']>>;
  slot: WechatTemplateSlotKey;
  templateIdShort: Scalars['String']['input'];
};

export type AdminPhoneInput = {
  code: Scalars['String']['input'];
  phone: Scalars['String']['input'];
};

export type ArticlePublishResult = {
  __typename?: 'ArticlePublishResult';
  draftMediaId?: Maybe<Scalars['String']['output']>;
  error?: Maybe<Scalars['String']['output']>;
  imageUrls?: Maybe<Array<Scalars['String']['output']>>;
  publishId?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export enum ArticleType {
  Active = 'ACTIVE',
  Event = 'EVENT'
}

export type BatchOperationResult = {
  __typename?: 'BatchOperationResult';
  error?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  success: Scalars['Boolean']['output'];
};

export type BatchOrderResult = {
  __typename?: 'BatchOrderResult';
  error?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  order?: Maybe<TableOccupancy>;
  price?: Maybe<Scalars['Int']['output']>;
  restored?: Maybe<Scalars['Boolean']['output']>;
  success: Scalars['Boolean']['output'];
};

export type BatchSettleInput = {
  deductAmount?: InputMaybe<Scalars['Int']['input']>;
  deductFromStoredValue?: InputMaybe<Scalars['Boolean']['input']>;
  ids: Array<Scalars['ID']['input']>;
  items?: InputMaybe<Array<PerUserSettleInput>>;
  note?: InputMaybe<Scalars['String']['input']>;
};

export type BatchSettlementResult = {
  __typename?: 'BatchSettlementResult';
  batchId?: Maybe<Scalars['ID']['output']>;
  results: Array<BatchOrderResult>;
};

export type BoardGameCounts = {
  __typename?: 'BoardGameCounts';
  current: Scalars['Int']['output'];
  latestDate?: Maybe<Scalars['String']['output']>;
  removed: Scalars['Int']['output'];
};

export type BoardGameFilterInput = {
  isBestNumOfPlayers?: InputMaybe<Scalars['Boolean']['input']>;
  numOfPlayers?: InputMaybe<Scalars['Int']['input']>;
  pagination?: InputMaybe<PaginationInput>;
  searchWords?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type BoardGameSummary = {
  __typename?: 'BoardGameSummary';
  bestPlayerNum?: Maybe<Scalars['String']['output']>;
  category?: Maybe<Scalars['String']['output']>;
  content?: Maybe<Scalars['String']['output']>;
  engName?: Maybe<Scalars['String']['output']>;
  gstoneId?: Maybe<Scalars['Int']['output']>;
  gstoneRating?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  mode?: Maybe<Scalars['String']['output']>;
  playerNum?: Maybe<Scalars['String']['output']>;
  removeDate?: Maybe<Scalars['String']['output']>;
  schName?: Maybe<Scalars['String']['output']>;
};

export type BoardGameSyncResult = {
  __typename?: 'BoardGameSyncResult';
  message?: Maybe<Scalars['String']['output']>;
  processed?: Maybe<Scalars['Int']['output']>;
  success: Scalars['Boolean']['output'];
};

export type BusinessCard = {
  __typename?: 'BusinessCard';
  createdAt?: Maybe<Scalars['String']['output']>;
  customContent?: Maybe<Scalars['String']['output']>;
  isWatching?: Maybe<Scalars['Boolean']['output']>;
  nickname?: Maybe<Scalars['String']['output']>;
  phone?: Maybe<Scalars['String']['output']>;
  qq?: Maybe<Scalars['String']['output']>;
  registrationId?: Maybe<Scalars['ID']['output']>;
  sharePhone: Scalars['Boolean']['output'];
  uid?: Maybe<Scalars['String']['output']>;
  updatedAt?: Maybe<Scalars['String']['output']>;
  userId: Scalars['ID']['output'];
  wechat?: Maybe<Scalars['String']['output']>;
};

export type CaptchaSettings = {
  __typename?: 'CaptchaSettings';
  disabledUntil?: Maybe<Scalars['String']['output']>;
  enabled: Scalars['Boolean']['output'];
  prefix?: Maybe<Scalars['String']['output']>;
  sceneId?: Maybe<Scalars['String']['output']>;
};

export type CleanupOrphanedDataResult = {
  __typename?: 'CleanupOrphanedDataResult';
  actions: Array<Scalars['String']['output']>;
  activeOrphans: Array<OrphanedOrderInfo>;
  danglingPauseLogs: Scalars['Int']['output'];
  dryRun: Scalars['Boolean']['output'];
  endedOrphans: Scalars['Int']['output'];
  orphanedOccupancies: Scalars['Int']['output'];
  orphanedPauseLogs: Scalars['Int']['output'];
  totalOccupancies: Scalars['Int']['output'];
};

export type CrawlerError = {
  __typename?: 'CrawlerError';
  error?: Maybe<Scalars['String']['output']>;
  gstoneId: Scalars['Int']['output'];
  retryCount: Scalars['Int']['output'];
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export type CrawlerStats = {
  __typename?: 'CrawlerStats';
  crawled: Scalars['Int']['output'];
  errors: Scalars['Int']['output'];
  estimatedMax: Scalars['Int']['output'];
  imagesCached: Scalars['Int']['output'];
  maxId: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type CreateActiveInput = {
  boardGameId?: InputMaybe<Scalars['ID']['input']>;
  content?: InputMaybe<Scalars['String']['input']>;
  date: Scalars['String']['input'];
  isGame?: InputMaybe<Scalars['Boolean']['input']>;
  maxPlayers: Scalars['Int']['input'];
  storeId?: InputMaybe<Scalars['ID']['input']>;
  time?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
};

export type CreateMembershipPlanInput = {
  amount?: InputMaybe<Scalars['Int']['input']>;
  endDate?: InputMaybe<Scalars['String']['input']>;
  planType: MembershipPlanType;
  startDate: Scalars['String']['input'];
  userId: Scalars['ID']['input'];
};

export type CreatePreferenceInput = {
  categories: Array<Scalars['String']['input']>;
  playerCount?: InputMaybe<Scalars['Int']['input']>;
  rawText: Scalars['String']['input'];
  rrule: Scalars['String']['input'];
};

export type CreateShortlinkInput = {
  expiresInSeconds?: InputMaybe<Scalars['Int']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
  url: Scalars['String']['input'];
};

export type CreateTableInput = {
  capacity?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  scope: TableScope;
  storeId?: InputMaybe<Scalars['ID']['input']>;
  type: TableType;
};

export type CursorPaginationInput = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type DashGlobalSearchResult = {
  __typename?: 'DashGlobalSearchResult';
  category: Scalars['String']['output'];
  items: Array<DashSearchResultItem>;
};

export type DashSearchHistoryEntry = {
  __typename?: 'DashSearchHistoryEntry';
  categoryId: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  params: Scalars['String']['output'];
  route: Scalars['String']['output'];
};

export type DashSearchResultItem = {
  __typename?: 'DashSearchResultItem';
  avatar?: Maybe<Scalars['String']['output']>;
  category: Scalars['String']['output'];
  detail?: Maybe<Scalars['String']['output']>;
  href: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  searchableFields?: Maybe<Scalars['String']['output']>;
  subtitle?: Maybe<Scalars['String']['output']>;
  title: Scalars['String']['output'];
};

export type DeductPointsInput = {
  amount: Scalars['Int']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['ID']['input'];
};

export type DeductStoredValueInput = {
  amount: Scalars['Int']['input'];
  date: Scalars['String']['input'];
  note: Scalars['String']['input'];
  userId: Scalars['ID']['input'];
};

export type DeletePreferenceResult = {
  __typename?: 'DeletePreferenceResult';
  success: Scalars['Boolean']['output'];
};

export type Event = {
  __typename?: 'Event';
  content?: Maybe<Scalars['String']['output']>;
  coverImageUrl?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isPublished: Scalars['Boolean']['output'];
  storeId?: Maybe<Scalars['ID']['output']>;
  title: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export type EventFilterInput = {
  dateFrom?: InputMaybe<Scalars['String']['input']>;
  dateTo?: InputMaybe<Scalars['String']['input']>;
  pagination?: InputMaybe<PaginationInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<SortOrder>;
  status?: InputMaybe<Array<Scalars['String']['input']>>;
  store?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export type EventInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  coverImageUrl?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  storeId?: InputMaybe<Scalars['ID']['input']>;
  title: Scalars['String']['input'];
};

export type GszCustomer = {
  __typename?: 'GszCustomer';
  id: Scalars['Int']['output'];
  name?: Maybe<Scalars['String']['output']>;
  phone?: Maybe<Scalars['String']['output']>;
  qq?: Maybe<Scalars['String']['output']>;
  raw?: Maybe<Scalars['String']['output']>;
  wechat?: Maybe<Scalars['String']['output']>;
};

export type GszCustomerPage = {
  __typename?: 'GszCustomerPage';
  pageNo: Scalars['Int']['output'];
  pageSize: Scalars['Int']['output'];
  records: Array<GszCustomer>;
  total?: Maybe<Scalars['Int']['output']>;
};

export type GszCustomerPageInput = {
  nickname?: InputMaybe<Scalars['String']['input']>;
  pageNo: Scalars['Int']['input'];
  pageSize: Scalars['Int']['input'];
  phone?: InputMaybe<Scalars['String']['input']>;
  qq?: InputMaybe<Scalars['String']['input']>;
  wechat?: InputMaybe<Scalars['String']['input']>;
};

export type GszRegisterInput = {
  password?: InputMaybe<Scalars['String']['input']>;
  phone: Scalars['String']['input'];
  qq?: InputMaybe<Scalars['String']['input']>;
  username: Scalars['String']['input'];
  wechat?: InputMaybe<Scalars['String']['input']>;
};

export type GszScoreAddInput = {
  phone1: Scalars['String']['input'];
  phone2: Scalars['String']['input'];
  phone3: Scalars['String']['input'];
  phone4: Scalars['String']['input'];
  point1: Scalars['String']['input'];
  point2: Scalars['String']['input'];
  point3: Scalars['String']['input'];
  point4: Scalars['String']['input'];
  rateTime: Scalars['String']['input'];
};

export type GszScoreUpdateInput = {
  phone1: Scalars['String']['input'];
  phone2: Scalars['String']['input'];
  phone3: Scalars['String']['input'];
  phone4: Scalars['String']['input'];
  point1: Scalars['String']['input'];
  point2: Scalars['String']['input'];
  point3: Scalars['String']['input'];
  point4: Scalars['String']['input'];
  rateTime: Scalars['String']['input'];
  recordId: Scalars['Int']['input'];
};

export enum GszSyncFilter {
  All = 'ALL',
  Synced = 'SYNCED',
  Unsynced = 'UNSYNCED'
}

export type GszSyncResult = {
  __typename?: 'GszSyncResult';
  error?: Maybe<Scalars['String']['output']>;
  failCount?: Maybe<Scalars['Int']['output']>;
  match?: Maybe<MahjongMatch>;
  success: Scalars['Boolean']['output'];
  successCount?: Maybe<Scalars['Int']['output']>;
  total?: Maybe<Scalars['Int']['output']>;
};

export type JoinActiveInput = {
  activeId: Scalars['ID']['input'];
  isWatching?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Leaderboard = {
  __typename?: 'Leaderboard';
  category: LeaderboardCategory;
  computedAt?: Maybe<Scalars['String']['output']>;
  entries: Array<LeaderboardEntry>;
  period: LeaderboardPeriod;
};

export enum LeaderboardCategory {
  Store_3PHanchan = 'STORE_3P_HANCHAN',
  Store_3PTonpuu = 'STORE_3P_TONPUU',
  Store_4PHanchan = 'STORE_4P_HANCHAN',
  Store_4PTonpuu = 'STORE_4P_TONPUU',
  Tournament = 'TOURNAMENT'
}

export type LeaderboardCategoryInfo = {
  __typename?: 'LeaderboardCategoryInfo';
  key: LeaderboardCategory;
  label: Scalars['String']['output'];
};

export type LeaderboardEntry = {
  __typename?: 'LeaderboardEntry';
  matchCount: Scalars['Int']['output'];
  nickname: Scalars['String']['output'];
  prevRank?: Maybe<Scalars['Int']['output']>;
  rank: Scalars['Int']['output'];
  totalPP: Scalars['Float']['output'];
  userId: Scalars['ID']['output'];
};

export enum LeaderboardPeriod {
  Day = 'DAY',
  Month = 'MONTH',
  Week = 'WEEK'
}

export type LeaderboardUpdatedPayload = {
  __typename?: 'LeaderboardUpdatedPayload';
  leaderboard: Leaderboard;
  updatedAt: Scalars['String']['output'];
};

export type LeaveTableInput = {
  code: Scalars['String']['input'];
  occupancyId: Scalars['ID']['input'];
};

export enum MahjongCompletionFilter {
  All = 'ALL',
  Completed = 'COMPLETED',
  Incomplete = 'INCOMPLETE'
}

export type MahjongConfig = {
  __typename?: 'MahjongConfig';
  format: Scalars['String']['output'];
  mode: Scalars['String']['output'];
  type?: Maybe<Scalars['String']['output']>;
};

export type MahjongConfigInput = {
  format: Scalars['String']['input'];
  mode: Scalars['String']['input'];
  type: Scalars['String']['input'];
};

export type MahjongFilterInput = {
  completion?: InputMaybe<Array<Scalars['String']['input']>>;
  dateFrom?: InputMaybe<Scalars['String']['input']>;
  dateTo?: InputMaybe<Scalars['String']['input']>;
  format?: InputMaybe<Array<Scalars['String']['input']>>;
  mode?: InputMaybe<Array<Scalars['String']['input']>>;
  pagination?: InputMaybe<PaginationInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<SortOrder>;
  store?: InputMaybe<Scalars['String']['input']>;
  syncStatus?: InputMaybe<Array<Scalars['String']['input']>>;
  tableCode?: InputMaybe<Scalars['String']['input']>;
};

export enum MahjongFormat {
  Hanchan = 'HANCHAN',
  Tonpuu = 'TONPUU'
}

export type MahjongManagementListInput = {
  completion?: InputMaybe<MahjongCompletionFilter>;
  endDate?: InputMaybe<Scalars['String']['input']>;
  format?: InputMaybe<MahjongFormat>;
  gszSync?: InputMaybe<GszSyncFilter>;
  mode?: InputMaybe<MahjongMode>;
  pagination?: InputMaybe<PaginationInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
  storeId?: InputMaybe<Scalars['ID']['input']>;
  tableId?: InputMaybe<Scalars['ID']['input']>;
};

export type MahjongMatch = {
  __typename?: 'MahjongMatch';
  config?: Maybe<MahjongConfig>;
  createdAt?: Maybe<Scalars['String']['output']>;
  endedAt: Scalars['String']['output'];
  format: MahjongFormat;
  gszError?: Maybe<Scalars['String']['output']>;
  gszRecordId?: Maybe<Scalars['Int']['output']>;
  gszSynced: Scalars['Boolean']['output'];
  gszSyncedAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  matchType?: Maybe<MahjongMatchType>;
  mode: MahjongMode;
  players: Array<MahjongPlayer>;
  playersJson: Scalars['String']['output'];
  scores?: Maybe<Scalars['String']['output']>;
  startedAt: Scalars['String']['output'];
  table?: Maybe<Table>;
  tableId?: Maybe<Scalars['ID']['output']>;
  terminationReason: MahjongTerminationReason;
  unsyncableReasons: Array<UnsyncableReason>;
};

export type MahjongMatchHistoryInput = {
  endDate?: InputMaybe<Scalars['String']['input']>;
  format?: InputMaybe<MahjongFormat>;
  matchType?: InputMaybe<MahjongMatchType>;
  mode?: InputMaybe<MahjongMode>;
  pagination?: InputMaybe<CursorPaginationInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  startDate?: InputMaybe<Scalars['String']['input']>;
  storeId?: InputMaybe<Scalars['ID']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type MahjongMatchListResult = {
  __typename?: 'MahjongMatchListResult';
  items: Array<MahjongMatch>;
  pageInfo: PageInfo;
};

export enum MahjongMatchType {
  Store = 'STORE',
  Tournament = 'TOURNAMENT'
}

export enum MahjongMode {
  FourPlayer = 'FOUR_PLAYER',
  ThreePlayer = 'THREE_PLAYER'
}

export type MahjongPlayer = {
  __typename?: 'MahjongPlayer';
  currentPoints?: Maybe<Scalars['Int']['output']>;
  finalScore: Scalars['Int']['output'];
  nickname: Scalars['String']['output'];
  seat?: Maybe<Scalars['String']['output']>;
  userId: Scalars['ID']['output'];
};

export type MahjongPlayerInput = {
  finalScore: Scalars['Int']['input'];
  nickname: Scalars['String']['input'];
  seat?: InputMaybe<Scalars['String']['input']>;
  userId: Scalars['ID']['input'];
};

export type MahjongRegistrationStatus = {
  __typename?: 'MahjongRegistrationStatus';
  alreadyExisted?: Maybe<Scalars['Boolean']['output']>;
  gszError?: Maybe<Scalars['String']['output']>;
  gszId?: Maybe<Scalars['Int']['output']>;
  gszName?: Maybe<Scalars['String']['output']>;
  gszSynced: Scalars['Boolean']['output'];
  hasPhone: Scalars['Boolean']['output'];
  nickname?: Maybe<Scalars['String']['output']>;
  nicknameSynced?: Maybe<Scalars['Boolean']['output']>;
  phone?: Maybe<Scalars['String']['output']>;
  registered: Scalars['Boolean']['output'];
};

export enum MahjongTerminationReason {
  AdminAbort = 'ADMIN_ABORT',
  OrderInvalid = 'ORDER_INVALID',
  ScoreComplete = 'SCORE_COMPLETE',
  Vote = 'VOTE'
}

export type MediaListInput = {
  contentTypeFilter?: InputMaybe<Scalars['String']['input']>;
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type MediaListResult = {
  __typename?: 'MediaListResult';
  cursor?: Maybe<Scalars['String']['output']>;
  items: Array<MediaObject>;
  truncated: Scalars['Boolean']['output'];
};

export type MediaObject = {
  __typename?: 'MediaObject';
  contentType: Scalars['String']['output'];
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
  size: Scalars['Int']['output'];
  uploaded: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type MembershipDeductionResult = {
  __typename?: 'MembershipDeductionResult';
  deducted: Scalars['Int']['output'];
  plan: MembershipPlan;
};

export type MembershipPlan = {
  __typename?: 'MembershipPlan';
  amount?: Maybe<Scalars['Int']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  endDate?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  note?: Maybe<Scalars['String']['output']>;
  planType: MembershipPlanType;
  startDate: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['String']['output']>;
  userId: Scalars['ID']['output'];
};

export enum MembershipPlanType {
  Monthly = 'MONTHLY',
  MonthlyCc = 'MONTHLY_CC',
  StoredValue = 'STORED_VALUE',
  Yearly = 'YEARLY'
}

export type Mutation = {
  __typename?: 'Mutation';
  addAdminPhone: Array<Scalars['String']['output']>;
  addPoints: UserPointsLog;
  addTableOccupancy: TableOccupancy;
  addWechatTemplateFromLibrary: WechatTemplateAssignment;
  assignWechatTemplateSlot: WechatTemplateSlot;
  batchPauseOrders: Array<BatchOrderResult>;
  batchRemoveActives: Array<Active>;
  batchResumeOrders: Array<BatchOrderResult>;
  batchSettle: Array<BatchOrderResult>;
  batchSettleOrders: BatchSettlementResult;
  batchSettlementPreview: Array<SettlementPreview>;
  batchSyncMahjongMatchesToGsz: GszSyncResult;
  cancelBatchSettlement: Array<BatchOrderResult>;
  cancelSettlement: BatchOrderResult;
  cleanupOrphanedData: CleanupOrphanedDataResult;
  cleanupOrphanedOrders: CleanupOrphanedDataResult;
  clearDashSearchHistory: Scalars['Boolean']['output'];
  closeShortlink: Shortlink;
  createActive: Active;
  createEvent: Event;
  createMembershipPlan: MembershipPlan;
  createPreference: UserPreference;
  createShortlink: Shortlink;
  createTable: Table;
  createTempIdentity: TempIdentity;
  deductPoints: UserPointsLog;
  deductStoredValue: MembershipDeductionResult;
  deletePreference: DeletePreferenceResult;
  disableUser: UserProfile;
  enableUser: UserProfile;
  endOrder: TableOccupancy;
  gszRegister: GszCustomer;
  gszScoreAdd: MahjongMatch;
  gszScoreUpdate: MahjongMatch;
  joinActive: ActiveRegistration;
  leaveActive?: Maybe<Active>;
  leaveTable: TableOccupancy;
  leaveTableWithTempIdentity: SettlementResult;
  occupyTable: OccupyTableResult;
  occupyTableWithTempIdentity: OccupyTableResult;
  parsePreference: PreferenceParseResult;
  pauseMyOrder: TableOccupancy;
  pauseOrder: TableOccupancy;
  publishArticleToWechat: ArticlePublishResult;
  publishPricingSnapshot: PricingSnapshot;
  publishWechatMenuSnapshot: WechatMenuPublishResult;
  regenerateTableCode: Table;
  registerMahjong: MahjongRegistrationStatus;
  removeActive: Active;
  removeActiveRegistration: ActiveRegistration;
  removeAdminPhone: Array<Scalars['String']['output']>;
  removeDashSearchHistory: Scalars['Boolean']['output'];
  removeEvent: Event;
  removeMediaObject: MediaObject;
  removeMembershipPlan: MembershipPlan;
  removeTable: Table;
  removeTableOccupancy: TableOccupancy;
  removeWechatTemplate: WechatTemplateAssignment;
  renameMediaObject: MediaObject;
  requestSmsCode: SmsCodeResult;
  resetCrawlerErrors: CrawlerStats;
  restorePricingSnapshot: PricingSnapshot;
  restoreWechatMenuSnapshot: WechatMenuSnapshot;
  resumeOrder: TableOccupancy;
  saveDashSearchHistory: DashSearchHistoryEntry;
  saveMahjongMatch: MahjongMatch;
  savePricingSnapshot: PricingSnapshot;
  saveWechatMenuSnapshot: WechatMenuSnapshot;
  sendSmsCode: SmsCodeResult;
  sendWechatTemplateTest: WechatTemplateAssignment;
  setCaptchaEnabled: CaptchaSettings;
  settleOrder: SettlementResult;
  startOrder: TableOccupancy;
  syncMahjongMatchToGsz: GszSyncResult;
  syncOwnedBoardGames: BoardGameSyncResult;
  terminateMahjongMatch: MahjongMatch;
  toggleEventPublish: Event;
  togglePreference: UserPreference;
  toggleTableStatus: Table;
  transferTempIdentity: TempIdentityTransferResult;
  translateWechatMenuText: WechatMenuTranslateResult;
  updateActive: Active;
  updateEvent: Event;
  updateMahjongScore: MahjongMatch;
  updateMembershipPlan: MembershipPlan;
  updateMyPreferences: UserProfile;
  updateMyUserInfo: UserInfoUpdateResult;
  updatePreferences: UserProfile;
  updateProfile: UserInfoUpdateResult;
  updateShortlinkExpiry: Shortlink;
  updateTable: Table;
  updateUser: UserProfile;
  updateUserRole: UserProfile;
  upsertBusinessCard: BusinessCard;
  verifyPhone: UserInfoUpdateResult;
  verifyTotp: TotpVerificationResult;
  wakeOwnedBoardGames: BoardGameSyncResult;
};


export type MutationAddAdminPhoneArgs = {
  input: AdminPhoneInput;
};


export type MutationAddPointsArgs = {
  input: AddPointsInput;
};


export type MutationAddTableOccupancyArgs = {
  input: AddOccupancyInput;
};


export type MutationAddWechatTemplateFromLibraryArgs = {
  input: AddWechatTemplateFromLibraryInput;
};


export type MutationAssignWechatTemplateSlotArgs = {
  slot: WechatTemplateSlotKey;
  templateId: Scalars['String']['input'];
};


export type MutationBatchPauseOrdersArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type MutationBatchRemoveActivesArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type MutationBatchResumeOrdersArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type MutationBatchSettleArgs = {
  input: BatchSettleInput;
};


export type MutationBatchSettleOrdersArgs = {
  input: BatchSettleInput;
};


export type MutationBatchSettlementPreviewArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type MutationBatchSyncMahjongMatchesToGszArgs = {
  matchIds: Array<Scalars['ID']['input']>;
};


export type MutationCancelBatchSettlementArgs = {
  ids: Array<Scalars['ID']['input']>;
};


export type MutationCancelSettlementArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCleanupOrphanedDataArgs = {
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCleanupOrphanedOrdersArgs = {
  dryRun?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationCloseShortlinkArgs = {
  slug: Scalars['String']['input'];
};


export type MutationCreateActiveArgs = {
  input: CreateActiveInput;
};


export type MutationCreateEventArgs = {
  input: EventInput;
};


export type MutationCreateMembershipPlanArgs = {
  input: CreateMembershipPlanInput;
};


export type MutationCreatePreferenceArgs = {
  input: CreatePreferenceInput;
};


export type MutationCreateShortlinkArgs = {
  input: CreateShortlinkInput;
};


export type MutationCreateTableArgs = {
  input: CreateTableInput;
};


export type MutationDeductPointsArgs = {
  input: DeductPointsInput;
};


export type MutationDeductStoredValueArgs = {
  input: DeductStoredValueInput;
};


export type MutationDeletePreferenceArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDisableUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationEnableUserArgs = {
  id: Scalars['ID']['input'];
};


export type MutationEndOrderArgs = {
  id: Scalars['ID']['input'];
};


export type MutationGszRegisterArgs = {
  input: GszRegisterInput;
};


export type MutationGszScoreAddArgs = {
  input: GszScoreAddInput;
};


export type MutationGszScoreUpdateArgs = {
  input: GszScoreUpdateInput;
};


export type MutationJoinActiveArgs = {
  input: JoinActiveInput;
};


export type MutationLeaveActiveArgs = {
  activeId: Scalars['ID']['input'];
};


export type MutationLeaveTableArgs = {
  input: LeaveTableInput;
};


export type MutationLeaveTableWithTempIdentityArgs = {
  input: TempIdentityLeaveInput;
};


export type MutationOccupyTableArgs = {
  input: OccupyTableInput;
};


export type MutationOccupyTableWithTempIdentityArgs = {
  input: TempIdentityOccupyInput;
};


export type MutationParsePreferenceArgs = {
  rawText: Scalars['String']['input'];
};


export type MutationPauseMyOrderArgs = {
  input: LeaveTableInput;
};


export type MutationPauseOrderArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPublishArticleToWechatArgs = {
  input: PublishArticleInput;
};


export type MutationPublishPricingSnapshotArgs = {
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationPublishWechatMenuSnapshotArgs = {
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationRegenerateTableCodeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRegisterMahjongArgs = {
  input: RegisterMahjongInput;
};


export type MutationRemoveActiveArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveActiveRegistrationArgs = {
  registrationId: Scalars['ID']['input'];
};


export type MutationRemoveAdminPhoneArgs = {
  input: AdminPhoneInput;
};


export type MutationRemoveDashSearchHistoryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveEventArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveMediaObjectArgs = {
  key: Scalars['String']['input'];
};


export type MutationRemoveMembershipPlanArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveTableArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveTableOccupancyArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRemoveWechatTemplateArgs = {
  templateId: Scalars['String']['input'];
};


export type MutationRenameMediaObjectArgs = {
  newName: Scalars['String']['input'];
  oldKey: Scalars['String']['input'];
};


export type MutationRequestSmsCodeArgs = {
  input: RequestSmsCodeInput;
};


export type MutationRestorePricingSnapshotArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRestoreWechatMenuSnapshotArgs = {
  id: Scalars['ID']['input'];
};


export type MutationResumeOrderArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSaveDashSearchHistoryArgs = {
  input: SaveDashSearchHistoryInput;
};


export type MutationSaveMahjongMatchArgs = {
  input: SaveMahjongMatchInput;
};


export type MutationSavePricingSnapshotArgs = {
  input: SavePricingSnapshotInput;
};


export type MutationSaveWechatMenuSnapshotArgs = {
  input: SaveWechatMenuSnapshotInput;
};


export type MutationSendSmsCodeArgs = {
  input: SendSmsCodeInput;
};


export type MutationSendWechatTemplateTestArgs = {
  slot: WechatTemplateSlotKey;
  userId: Scalars['ID']['input'];
};


export type MutationSetCaptchaEnabledArgs = {
  enabled: Scalars['Boolean']['input'];
};


export type MutationSettleOrderArgs = {
  input: SettleOrderInput;
};


export type MutationStartOrderArgs = {
  input: StartOrderInput;
};


export type MutationSyncMahjongMatchToGszArgs = {
  matchId: Scalars['ID']['input'];
};


export type MutationSyncOwnedBoardGamesArgs = {
  date: Scalars['String']['input'];
  pageFrom: Scalars['Int']['input'];
  pageTo: Scalars['Int']['input'];
};


export type MutationTerminateMahjongMatchArgs = {
  reason?: InputMaybe<MahjongTerminationReason>;
  tableCode: Scalars['String']['input'];
};


export type MutationToggleEventPublishArgs = {
  id: Scalars['ID']['input'];
};


export type MutationTogglePreferenceArgs = {
  id: Scalars['ID']['input'];
};


export type MutationToggleTableStatusArgs = {
  id: Scalars['ID']['input'];
};


export type MutationTransferTempIdentityArgs = {
  tempId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationTranslateWechatMenuTextArgs = {
  targetLocales: Array<Scalars['String']['input']>;
  text: Scalars['String']['input'];
};


export type MutationUpdateActiveArgs = {
  input: UpdateActiveInput;
};


export type MutationUpdateEventArgs = {
  input: UpdateEventInput;
};


export type MutationUpdateMahjongScoreArgs = {
  matchId: Scalars['ID']['input'];
  players: Array<MahjongPlayerInput>;
};


export type MutationUpdateMembershipPlanArgs = {
  input: UpdateMembershipPlanInput;
};


export type MutationUpdateMyPreferencesArgs = {
  input: UpdatePreferencesInput;
};


export type MutationUpdateMyUserInfoArgs = {
  input: UpdateMyUserInfoInput;
};


export type MutationUpdatePreferencesArgs = {
  input: UpdatePreferencesInput;
};


export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput;
};


export type MutationUpdateShortlinkExpiryArgs = {
  expiresInSeconds?: InputMaybe<Scalars['Int']['input']>;
  slug: Scalars['String']['input'];
};


export type MutationUpdateTableArgs = {
  input: UpdateTableInput;
};


export type MutationUpdateUserArgs = {
  input: UpdateManagedUserInput;
};


export type MutationUpdateUserRoleArgs = {
  input: UpdateRoleInput;
};


export type MutationUpsertBusinessCardArgs = {
  input: UpsertBusinessCardInput;
};


export type MutationVerifyPhoneArgs = {
  input: VerifyPhoneInput;
};


export type MutationVerifyTotpArgs = {
  input: VerifyTotpInput;
};


export type MutationWakeOwnedBoardGamesArgs = {
  date: Scalars['String']['input'];
};

export type NotificationPayload = {
  __typename?: 'NotificationPayload';
  activeId?: Maybe<Scalars['ID']['output']>;
  body?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  data: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  title?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
  userId: Scalars['ID']['output'];
};

export type OccupyTableInput = {
  code: Scalars['String']['input'];
};

export type OccupyTableResult = {
  __typename?: 'OccupyTableResult';
  occupancy: TableOccupancy;
  table: Table;
};

export type OperationResult = {
  __typename?: 'OperationResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type OrderFilterInput = {
  dateFrom?: InputMaybe<Scalars['String']['input']>;
  dateTo?: InputMaybe<Scalars['String']['input']>;
  groupBy?: InputMaybe<Scalars['String']['input']>;
  pagination?: InputMaybe<PaginationInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<SortOrder>;
  status?: InputMaybe<Array<Scalars['String']['input']>>;
  store?: InputMaybe<Scalars['String']['input']>;
  tableCode?: InputMaybe<Scalars['String']['input']>;
};

export enum OrderGroupBy {
  Date = 'DATE',
  None = 'NONE',
  Table = 'TABLE',
  User = 'USER'
}

export type OrderListInput = {
  groupBy?: InputMaybe<OrderGroupBy>;
  pagination?: InputMaybe<PaginationInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<OrderSortBy>;
  sortOrder?: InputMaybe<SortOrder>;
  status?: InputMaybe<OrderStatusFilter>;
  storeId?: InputMaybe<Scalars['ID']['input']>;
};

export type OrderListResult = {
  __typename?: 'OrderListResult';
  items: Array<TableOccupancy>;
  pageInfo: PageInfo;
};

export type OrderPauseLogView = {
  __typename?: 'OrderPauseLogView';
  pausedAt: Scalars['String']['output'];
  resumedAt?: Maybe<Scalars['String']['output']>;
};

export enum OrderSortBy {
  EndAt = 'END_AT',
  StartAt = 'START_AT'
}

export enum OrderStatus {
  Active = 'ACTIVE',
  Cancelled = 'CANCELLED',
  Paused = 'PAUSED',
  Settled = 'SETTLED'
}

export type OrderStatusChangedPayload = {
  __typename?: 'OrderStatusChangedPayload';
  currentStatus: OrderStatus;
  order: TableOccupancy;
  previousStatus?: Maybe<OrderStatus>;
  updatedAt: Scalars['String']['output'];
};

export enum OrderStatusFilter {
  Active = 'ACTIVE',
  All = 'ALL',
  Paused = 'PAUSED',
  Settled = 'SETTLED'
}

export type OrphanedOrderInfo = {
  __typename?: 'OrphanedOrderInfo';
  id: Scalars['ID']['output'];
  status: OrderStatus;
  tableId: Scalars['ID']['output'];
  tempId?: Maybe<Scalars['ID']['output']>;
  userId?: Maybe<Scalars['ID']['output']>;
};

export type PpStats = {
  __typename?: 'PPStats';
  categories: Scalars['String']['output'];
  raw: Scalars['String']['output'];
  totalPP: Scalars['Float']['output'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  hasMore: Scalars['Boolean']['output'];
  limit: Scalars['Int']['output'];
  nextCursor?: Maybe<Scalars['String']['output']>;
  offset: Scalars['Int']['output'];
  total?: Maybe<Scalars['Int']['output']>;
};

export type PaginationInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type PerUserSettleInput = {
  deductAmount?: InputMaybe<Scalars['Int']['input']>;
  deductFromStoredValue?: InputMaybe<Scalars['Boolean']['input']>;
  note?: InputMaybe<Scalars['String']['input']>;
  orderId: Scalars['ID']['input'];
  pointsChange?: InputMaybe<Scalars['Int']['input']>;
};

export type PreferenceParseError = {
  __typename?: 'PreferenceParseError';
  error: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type PreferenceParseResult = PreferenceParseError | PreferenceParseSuccess;

export type PreferenceParseSuccess = {
  __typename?: 'PreferenceParseSuccess';
  categories: Array<Scalars['String']['output']>;
  confidence: Scalars['Float']['output'];
  playerCount?: Maybe<Scalars['Int']['output']>;
  rrule: Scalars['String']['output'];
  success: Scalars['Boolean']['output'];
};

export type PriceBreakdown = {
  __typename?: 'PriceBreakdown';
  billableHalfHours: Scalars['Int']['output'];
  billingType: Scalars['String']['output'];
  capApplied: Scalars['Boolean']['output'];
  capType?: Maybe<Scalars['String']['output']>;
  finalPrice: Scalars['Int']['output'];
  planName: Scalars['String']['output'];
  planType: Scalars['String']['output'];
  rawPrice: Scalars['Int']['output'];
  totalMinutes: Scalars['Int']['output'];
  unitPrice: Scalars['Int']['output'];
};

export type PricingConfig = {
  __typename?: 'PricingConfig';
  daytimeEnd: Scalars['String']['output'];
  daytimeStart: Scalars['String']['output'];
};

export type PricingDraft = {
  __typename?: 'PricingDraft';
  data: PricingSnapshotData;
  snapshotId?: Maybe<Scalars['ID']['output']>;
  snapshotName?: Maybe<Scalars['String']['output']>;
  status?: Maybe<PricingSnapshotStatus>;
};

export type PricingPlanMatch = {
  __typename?: 'PricingPlanMatch';
  billingType: Scalars['String']['output'];
  matched: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  planType: Scalars['String']['output'];
  price: Scalars['Int']['output'];
};

export type PricingSnapshot = {
  __typename?: 'PricingSnapshot';
  createdAt?: Maybe<Scalars['String']['output']>;
  data: PricingSnapshotData;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  publishedAt?: Maybe<Scalars['String']['output']>;
  status: PricingSnapshotStatus;
  storeId?: Maybe<Scalars['ID']['output']>;
  summary?: Maybe<Scalars['String']['output']>;
};

export type PricingSnapshotData = {
  __typename?: 'PricingSnapshotData';
  config: PricingConfig;
  plans: Scalars['String']['output'];
};

export type PricingSnapshotDataInput = {
  config: Scalars['String']['input'];
  plans: Scalars['String']['input'];
};

export enum PricingSnapshotStatus {
  Draft = 'DRAFT',
  Published = 'PUBLISHED'
}

export type PublishArticleInput = {
  /** If true, immediately publish after creating draft */
  autoPublish?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['ID']['input'];
  type: ArticleType;
};

export type Query = {
  __typename?: 'Query';
  active: Active;
  activeMahjongMatches: Array<ActiveMahjongMatch>;
  activeParticipants: Array<ActiveRegistration>;
  actives: ActiveListResult;
  adminPhones: Array<Scalars['String']['output']>;
  businessCard?: Maybe<BusinessCard>;
  captchaSettings: CaptchaSettings;
  crawlerErrors: Array<CrawlerError>;
  crawlerStats: CrawlerStats;
  dashGlobalSearch: Array<DashGlobalSearchResult>;
  dashSearchHistory: Array<DashSearchHistoryEntry>;
  event: Event;
  events: Array<Event>;
  getTotpSecret: TotpSecretResult;
  gszCustomers: GszCustomerPage;
  leaderboard: Leaderboard;
  leaderboardCategories: Array<LeaderboardCategoryInfo>;
  mahjongHeatmap: Scalars['String']['output'];
  mahjongMatch?: Maybe<MahjongMatch>;
  mahjongMatchHistory: MahjongMatchListResult;
  mahjongTables: Array<Table>;
  managedActive: Active;
  managedActives: Array<Active>;
  managedEvent: Event;
  managedEvents: Array<Event>;
  managedMahjongMatch: MahjongMatch;
  managedMahjongMatches: MahjongMatchListResult;
  managedTable: Table;
  managedTableByCode: Table;
  managedTables: Array<Table>;
  managedUsers: UserListResult;
  mediaObjects: MediaListResult;
  membershipPlansByUser: Array<MembershipPlan>;
  myActiveOccupancies: Array<ActiveOccupancySummary>;
  myBadges: Array<UserBadge>;
  myBusinessCard?: Maybe<BusinessCard>;
  myMahjongMatches: Array<MahjongMatch>;
  myMahjongRegistration: MahjongRegistrationStatus;
  myMembershipPlans: Array<MembershipPlan>;
  myPPStats: PpStats;
  myPointsBalance: Scalars['Int']['output'];
  myPreferences: Array<UserPreference>;
  myPreferencesCount: Scalars['Int']['output'];
  myRankings: Array<RankingSummary>;
  occupanciesByUser: Array<TableOccupancy>;
  order: TableOccupancy;
  orders: OrderListResult;
  ownedBoardGame?: Maybe<BoardGameSummary>;
  ownedBoardGameCount: BoardGameCounts;
  ownedBoardGames: Array<BoardGameSummary>;
  participantBusinessCards: Array<BusinessCard>;
  pointsLogByUser: Array<UserPointsLog>;
  pricingDraft: PricingDraft;
  pricingSnapshot: PricingSnapshot;
  pricingSnapshots: Array<PricingSnapshot>;
  publishedPricing?: Maybe<PricingSnapshot>;
  searchRules: RuleSearchResponse;
  settlementPreview: SettlementPreview;
  shortlinks: ShortlinkListResult;
  tableByCode: Table;
  tempIdentityActiveOccupancies: Array<ActiveOccupancySummary>;
  totpSecret: TotpSecretResult;
  user?: Maybe<UserProfile>;
  userBadges: Array<UserBadge>;
  validateTempIdentity: TempIdentity;
  wechatMenuDraft: WechatMenuDraft;
  wechatMenuSnapshot: WechatMenuSnapshot;
  wechatMenuSnapshots: Array<WechatMenuSnapshot>;
  wechatMenuVariables: Array<WechatMenuVariable>;
  wechatOpenConfig: WechatOpenConfig;
  wechatTemplateSlots: Array<WechatTemplateSlot>;
  wechatTemplates: WechatTemplateListResult;
};


export type QueryActiveArgs = {
  id: Scalars['ID']['input'];
};


export type QueryActiveParticipantsArgs = {
  activeId: Scalars['ID']['input'];
};


export type QueryActivesArgs = {
  input?: InputMaybe<ActiveListInput>;
};


export type QueryBusinessCardArgs = {
  activeId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
};


export type QueryCrawlerErrorsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryDashGlobalSearchArgs = {
  categories?: InputMaybe<Array<Scalars['String']['input']>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type QueryDashSearchHistoryArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryEventArgs = {
  id: Scalars['ID']['input'];
};


export type QueryEventsArgs = {
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryGszCustomersArgs = {
  input: GszCustomerPageInput;
};


export type QueryLeaderboardArgs = {
  category: LeaderboardCategory;
  period: LeaderboardPeriod;
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryMahjongHeatmapArgs = {
  storeId?: InputMaybe<Scalars['ID']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryMahjongMatchArgs = {
  id: Scalars['ID']['input'];
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryMahjongMatchHistoryArgs = {
  input?: InputMaybe<MahjongMatchHistoryInput>;
};


export type QueryManagedActiveArgs = {
  id: Scalars['ID']['input'];
};


export type QueryManagedActivesArgs = {
  filter?: InputMaybe<ActiveFilterInput>;
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryManagedEventArgs = {
  id: Scalars['ID']['input'];
};


export type QueryManagedEventsArgs = {
  filter?: InputMaybe<EventFilterInput>;
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryManagedMahjongMatchArgs = {
  id: Scalars['ID']['input'];
};


export type QueryManagedMahjongMatchesArgs = {
  filter?: InputMaybe<MahjongFilterInput>;
  input?: InputMaybe<MahjongManagementListInput>;
};


export type QueryManagedTableArgs = {
  id: Scalars['ID']['input'];
};


export type QueryManagedTableByCodeArgs = {
  code: Scalars['String']['input'];
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryManagedTablesArgs = {
  filter?: InputMaybe<TableFilterInput>;
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryManagedUsersArgs = {
  filter?: InputMaybe<UserFilterInput>;
  input?: InputMaybe<UserSearchInput>;
};


export type QueryMediaObjectsArgs = {
  input?: InputMaybe<MediaListInput>;
};


export type QueryMembershipPlansByUserArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryMyActiveOccupanciesArgs = {
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryMyBadgesArgs = {
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryMyMahjongMatchesArgs = {
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryMyPpStatsArgs = {
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryMyRankingsArgs = {
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryOccupanciesByUserArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryOrderArgs = {
  id: Scalars['ID']['input'];
};


export type QueryOrdersArgs = {
  filter?: InputMaybe<OrderFilterInput>;
  input?: InputMaybe<OrderListInput>;
};


export type QueryOwnedBoardGameArgs = {
  id: Scalars['ID']['input'];
};


export type QueryOwnedBoardGamesArgs = {
  input?: InputMaybe<BoardGameFilterInput>;
};


export type QueryParticipantBusinessCardsArgs = {
  activeId: Scalars['ID']['input'];
};


export type QueryPointsLogByUserArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryPricingDraftArgs = {
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryPricingSnapshotArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPricingSnapshotsArgs = {
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryPublishedPricingArgs = {
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type QuerySearchRulesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  query: Scalars['String']['input'];
};


export type QuerySettlementPreviewArgs = {
  id: Scalars['ID']['input'];
};


export type QueryShortlinksArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
};


export type QueryTableByCodeArgs = {
  code: Scalars['String']['input'];
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryTempIdentityActiveOccupanciesArgs = {
  tempId: Scalars['ID']['input'];
};


export type QueryUserArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUserBadgesArgs = {
  storeId?: InputMaybe<Scalars['ID']['input']>;
  userId: Scalars['ID']['input'];
};


export type QueryValidateTempIdentityArgs = {
  tempId: Scalars['ID']['input'];
};


export type QueryWechatMenuDraftArgs = {
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryWechatMenuSnapshotArgs = {
  id: Scalars['ID']['input'];
};


export type QueryWechatMenuSnapshotsArgs = {
  storeId?: InputMaybe<Scalars['ID']['input']>;
};

export type RankingSummary = {
  __typename?: 'RankingSummary';
  category: LeaderboardCategory;
  matchCount: Scalars['Int']['output'];
  period: LeaderboardPeriod;
  prevRank?: Maybe<Scalars['Int']['output']>;
  rank?: Maybe<Scalars['Int']['output']>;
  totalPP: Scalars['Float']['output'];
};

export type RecentOrder = {
  __typename?: 'RecentOrder';
  endAt?: Maybe<Scalars['String']['output']>;
  finalPrice?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  startAt: Scalars['String']['output'];
  status: OrderStatus;
  tableName: Scalars['String']['output'];
};

export type RegisterMahjongInput = {
  gszName: Scalars['String']['input'];
  phone: Scalars['String']['input'];
  smsCode: Scalars['String']['input'];
  syncNickname?: InputMaybe<Scalars['Boolean']['input']>;
};

export type RequestSmsCodeInput = {
  botcheck?: InputMaybe<Scalars['String']['input']>;
  phone: Scalars['String']['input'];
};

export type RuleSearchResponse = {
  __typename?: 'RuleSearchResponse';
  message?: Maybe<Scalars['String']['output']>;
  results: Array<RuleSearchResult>;
};

export type RuleSearchResult = {
  __typename?: 'RuleSearchResult';
  score: Scalars['Float']['output'];
  source: Scalars['String']['output'];
  text: Scalars['String']['output'];
};

export type SaveDashSearchHistoryInput = {
  categoryId: Scalars['String']['input'];
  label: Scalars['String']['input'];
  params: Scalars['String']['input'];
  route: Scalars['String']['input'];
};

export type SaveMahjongMatchInput = {
  config: MahjongConfigInput;
  endedAt: Scalars['String']['input'];
  format: MahjongFormat;
  matchType: MahjongMatchType;
  mode: MahjongMode;
  players: Array<MahjongPlayerInput>;
  startedAt: Scalars['String']['input'];
  tableId?: InputMaybe<Scalars['ID']['input']>;
  terminationReason: MahjongTerminationReason;
};

export type SavePricingSnapshotInput = {
  data: PricingSnapshotDataInput;
  name: Scalars['String']['input'];
  storeId?: InputMaybe<Scalars['ID']['input']>;
};

export type SaveWechatMenuSnapshotInput = {
  data: Scalars['String']['input'];
  name: Scalars['String']['input'];
  storeId?: InputMaybe<Scalars['ID']['input']>;
};

export type SeatUpdatePayload = {
  __typename?: 'SeatUpdatePayload';
  occupancies: Array<TableOccupancy>;
  table: Table;
  tableCode: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type SendSmsCodeInput = {
  botcheck?: InputMaybe<Scalars['String']['input']>;
  phone: Scalars['String']['input'];
};

export type SettleOrderInput = {
  deductAmount?: InputMaybe<Scalars['Int']['input']>;
  deductFromStoredValue?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['ID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
  pointsChange?: InputMaybe<Scalars['Int']['input']>;
};

export type SettlementMembershipInfo = {
  __typename?: 'SettlementMembershipInfo';
  hasTimePlan: Scalars['Boolean']['output'];
  storedValueBalance: Scalars['Int']['output'];
  timePlanActive: Scalars['Boolean']['output'];
  timePlanEndDate?: Maybe<Scalars['String']['output']>;
  timePlanType?: Maybe<Scalars['String']['output']>;
};

export type SettlementPreview = {
  __typename?: 'SettlementPreview';
  billableMinutes: Scalars['Int']['output'];
  finalPrice: Scalars['Int']['output'];
  membership: SettlementMembershipInfo;
  order: TableOccupancy;
  pauseLogs: Array<OrderPauseLogView>;
  pausedMinutes: Scalars['Int']['output'];
  priceBreakdown?: Maybe<PriceBreakdown>;
  pricingPlans: Array<PricingPlanMatch>;
  recentOrders: Array<RecentOrder>;
  totalMinutes: Scalars['Int']['output'];
};

export type SettlementResult = {
  __typename?: 'SettlementResult';
  order: TableOccupancy;
  price: Scalars['Int']['output'];
  snapshot?: Maybe<Scalars['String']['output']>;
  storedValueDeduction?: Maybe<StoredValueDeduction>;
};

export type Shortlink = {
  __typename?: 'Shortlink';
  active: Scalars['Boolean']['output'];
  createdAt: Scalars['String']['output'];
  expiresAt?: Maybe<Scalars['String']['output']>;
  shortUrl?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type ShortlinkListResult = {
  __typename?: 'ShortlinkListResult';
  cursor?: Maybe<Scalars['String']['output']>;
  items: Array<Shortlink>;
};

export type SmsCodeResult = {
  __typename?: 'SmsCodeResult';
  expiresInMs?: Maybe<Scalars['Int']['output']>;
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export enum SortOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

export type StartOrderInput = {
  planId?: InputMaybe<Scalars['ID']['input']>;
  seats?: InputMaybe<Scalars['Int']['input']>;
  storeId?: InputMaybe<Scalars['ID']['input']>;
  tableId: Scalars['ID']['input'];
  tempId?: InputMaybe<Scalars['ID']['input']>;
  userId?: InputMaybe<Scalars['ID']['input']>;
};

export type Store = {
  __typename?: 'Store';
  address?: Maybe<Scalars['String']['output']>;
  code?: Maybe<StoreCode>;
  createdAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
};

export enum StoreCode {
  Gg = 'gg',
  Jdk = 'jdk'
}

export type StoredValueDeduction = {
  __typename?: 'StoredValueDeduction';
  amount: Scalars['Int']['output'];
  balanceAfter: Scalars['Int']['output'];
  balanceBefore: Scalars['Int']['output'];
  deducted: Scalars['Boolean']['output'];
  note: Scalars['String']['output'];
};

export type Subscription = {
  __typename?: 'Subscription';
  activeParticipantsChanged: ActiveParticipantsChangedPayload;
  leaderboardUpdated: LeaderboardUpdatedPayload;
  notificationReceived: NotificationPayload;
  orderStatusChanged: OrderStatusChangedPayload;
  seatUpdated: SeatUpdatePayload;
};


export type SubscriptionActiveParticipantsChangedArgs = {
  activeId?: InputMaybe<Scalars['ID']['input']>;
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type SubscriptionLeaderboardUpdatedArgs = {
  category?: InputMaybe<LeaderboardCategory>;
  period?: InputMaybe<LeaderboardPeriod>;
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type SubscriptionNotificationReceivedArgs = {
  userId: Scalars['ID']['input'];
};


export type SubscriptionOrderStatusChangedArgs = {
  orderId?: InputMaybe<Scalars['ID']['input']>;
  storeId?: InputMaybe<Scalars['ID']['input']>;
  tableId?: InputMaybe<Scalars['ID']['input']>;
};


export type SubscriptionSeatUpdatedArgs = {
  storeId?: InputMaybe<Scalars['ID']['input']>;
  tableCode?: InputMaybe<Scalars['String']['input']>;
};

export type Table = {
  __typename?: 'Table';
  capacity: Scalars['Int']['output'];
  code: Scalars['String']['output'];
  createdAt?: Maybe<Scalars['String']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  occupancies: Array<TableOccupancy>;
  scope: TableScope;
  status: TableStatus;
  storeId?: Maybe<Scalars['ID']['output']>;
  type: TableType;
  updatedAt?: Maybe<Scalars['String']['output']>;
};

export type TableFilterInput = {
  pagination?: InputMaybe<PaginationInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<SortOrder>;
  status?: InputMaybe<Array<Scalars['String']['input']>>;
  store?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type TableOccupancy = {
  __typename?: 'TableOccupancy';
  amount?: Maybe<Scalars['Int']['output']>;
  duration: Scalars['Int']['output'];
  endAt?: Maybe<Scalars['String']['output']>;
  finalPrice?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  nickname?: Maybe<Scalars['String']['output']>;
  phone?: Maybe<Scalars['String']['output']>;
  priceBreakdown?: Maybe<Scalars['String']['output']>;
  pricingSnapshotId?: Maybe<Scalars['ID']['output']>;
  seats: Scalars['Int']['output'];
  settlementSnapshot?: Maybe<Scalars['String']['output']>;
  startAt: Scalars['String']['output'];
  status: OrderStatus;
  table?: Maybe<Table>;
  tableId: Scalars['ID']['output'];
  tempId?: Maybe<Scalars['ID']['output']>;
  uid?: Maybe<Scalars['String']['output']>;
  user?: Maybe<UserProfile>;
  userId?: Maybe<Scalars['ID']['output']>;
};

export enum TableScope {
  Boardgame = 'BOARDGAME',
  Console = 'CONSOLE',
  Mahjong = 'MAHJONG',
  Trpg = 'TRPG'
}

export enum TableStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE'
}

export enum TableType {
  Fixed = 'FIXED',
  Solo = 'SOLO'
}

export type TempIdentity = {
  __typename?: 'TempIdentity';
  expiresAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  nickname: Scalars['String']['output'];
  totpSecret: Scalars['String']['output'];
  valid: Scalars['Boolean']['output'];
};

export type TempIdentityLeaveInput = {
  code: Scalars['String']['input'];
  occupancyId: Scalars['ID']['input'];
  tempId: Scalars['ID']['input'];
};

export type TempIdentityOccupyInput = {
  code: Scalars['String']['input'];
  tempId: Scalars['ID']['input'];
};

export type TempIdentityTransferResult = {
  __typename?: 'TempIdentityTransferResult';
  occupancy?: Maybe<TableOccupancy>;
  transferred: Scalars['Boolean']['output'];
};

export type TotpSecretResult = {
  __typename?: 'TotpSecretResult';
  message?: Maybe<Scalars['String']['output']>;
  secret?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
};

export type TotpVerificationResult = {
  __typename?: 'TotpVerificationResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  userId?: Maybe<Scalars['ID']['output']>;
};

export type UnsyncableReason = {
  __typename?: 'UnsyncableReason';
  nickname: Scalars['String']['output'];
  reason: UnsyncableReasonCode;
  userId: Scalars['ID']['output'];
};

export enum UnsyncableReasonCode {
  NoPhone = 'NO_PHONE',
  TempUser = 'TEMP_USER'
}

export type UpdateActiveInput = {
  boardGameId?: InputMaybe<Scalars['ID']['input']>;
  content?: InputMaybe<Scalars['String']['input']>;
  date?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  isGame?: InputMaybe<Scalars['Boolean']['input']>;
  maxPlayers?: InputMaybe<Scalars['Int']['input']>;
  time?: InputMaybe<Scalars['String']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateEventInput = {
  content?: InputMaybe<Scalars['String']['input']>;
  coverImageUrl?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  title: Scalars['String']['input'];
};

export type UpdateManagedUserInput = {
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  nickname?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateMembershipPlanInput = {
  amount?: InputMaybe<Scalars['Int']['input']>;
  endDate?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  planType?: InputMaybe<MembershipPlanType>;
  startDate?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateMyUserInfoInput = {
  code?: InputMaybe<Scalars['String']['input']>;
  nickname?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePreferencesInput = {
  preferredLocale?: InputMaybe<Scalars['String']['input']>;
  preferredStoreId?: InputMaybe<Scalars['ID']['input']>;
  preferredTheme?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateProfileInput = {
  nickname: Scalars['String']['input'];
};

export type UpdateRoleInput = {
  id: Scalars['ID']['input'];
  role: UserRole;
};

export type UpdateTableInput = {
  capacity?: InputMaybe<Scalars['Int']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  scope?: InputMaybe<TableScope>;
  type?: InputMaybe<TableType>;
};

export type UpsertBusinessCardInput = {
  customContent?: InputMaybe<Scalars['String']['input']>;
  qq?: InputMaybe<Scalars['String']['input']>;
  sharePhone?: InputMaybe<Scalars['Boolean']['input']>;
  wechat?: InputMaybe<Scalars['String']['input']>;
};

export type UserBadge = {
  __typename?: 'UserBadge';
  awardedAt?: Maybe<Scalars['String']['output']>;
  badgeRank: Scalars['Int']['output'];
  badgeType: Scalars['String']['output'];
  category: Scalars['String']['output'];
  createdAt?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  periodLabel: Scalars['String']['output'];
  title: Scalars['String']['output'];
  userId?: Maybe<Scalars['ID']['output']>;
};

export type UserFilterInput = {
  dateFrom?: InputMaybe<Scalars['String']['input']>;
  dateTo?: InputMaybe<Scalars['String']['input']>;
  pagination?: InputMaybe<PaginationInput>;
  role?: InputMaybe<Array<Scalars['String']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
  sortOrder?: InputMaybe<SortOrder>;
  store?: InputMaybe<Scalars['String']['input']>;
};

export type UserInfoUpdateResult = {
  __typename?: 'UserInfoUpdateResult';
  message?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  user?: Maybe<UserProfile>;
};

export type UserListResult = {
  __typename?: 'UserListResult';
  items: Array<UserProfile>;
  pageInfo: PageInfo;
};

export type UserPointsLog = {
  __typename?: 'UserPointsLog';
  amount: Scalars['Int']['output'];
  balanceAfter: Scalars['Int']['output'];
  createdAt?: Maybe<Scalars['String']['output']>;
  createdBy?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  note?: Maybe<Scalars['String']['output']>;
  userId: Scalars['ID']['output'];
};

export type UserPreference = {
  __typename?: 'UserPreference';
  categories: Array<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  playerCount?: Maybe<Scalars['Int']['output']>;
  rawText: Scalars['String']['output'];
  rrule: Scalars['String']['output'];
  updatedAt?: Maybe<Scalars['String']['output']>;
  userId: Scalars['ID']['output'];
};

export type UserProfile = {
  __typename?: 'UserProfile';
  avatarUrl?: Maybe<Scalars['String']['output']>;
  createdAt?: Maybe<Scalars['String']['output']>;
  disabled?: Maybe<Scalars['Boolean']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  image?: Maybe<Scalars['String']['output']>;
  membershipPlans: Array<MembershipPlan>;
  meta?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  nickname?: Maybe<Scalars['String']['output']>;
  phone?: Maybe<Scalars['String']['output']>;
  points?: Maybe<Scalars['Int']['output']>;
  preferredLocale?: Maybe<Scalars['String']['output']>;
  preferredStoreId?: Maybe<Scalars['ID']['output']>;
  preferredTheme?: Maybe<Scalars['String']['output']>;
  role: UserRole;
  uid?: Maybe<Scalars['String']['output']>;
};

export enum UserRole {
  Admin = 'ADMIN',
  Customer = 'CUSTOMER',
  Staff = 'STAFF'
}

export type UserSearchInput = {
  pagination?: InputMaybe<PaginationInput>;
  searchWords?: InputMaybe<Scalars['String']['input']>;
};

export type VerifyPhoneInput = {
  code: Scalars['String']['input'];
  phone: Scalars['String']['input'];
};

export type VerifyTotpInput = {
  loginTime: Scalars['Float']['input'];
  totp: Scalars['String']['input'];
  userAgent: Scalars['String']['input'];
};

export type WechatMenuDraft = {
  __typename?: 'WechatMenuDraft';
  data: Scalars['String']['output'];
  snapshotId?: Maybe<Scalars['ID']['output']>;
  snapshotName?: Maybe<Scalars['String']['output']>;
  status?: Maybe<WechatMenuSnapshotStatus>;
};

export type WechatMenuPublishResult = {
  __typename?: 'WechatMenuPublishResult';
  error?: Maybe<Scalars['String']['output']>;
  snapshot?: Maybe<WechatMenuSnapshot>;
  success: Scalars['Boolean']['output'];
};

export type WechatMenuSnapshot = {
  __typename?: 'WechatMenuSnapshot';
  createdAt?: Maybe<Scalars['String']['output']>;
  data: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  publishedAt?: Maybe<Scalars['String']['output']>;
  status: WechatMenuSnapshotStatus;
  storeId?: Maybe<Scalars['ID']['output']>;
  summary?: Maybe<Scalars['String']['output']>;
};

export enum WechatMenuSnapshotStatus {
  Draft = 'DRAFT',
  Published = 'PUBLISHED'
}

export type WechatMenuTranslateResult = {
  __typename?: 'WechatMenuTranslateResult';
  translations: Array<WechatMenuTranslation>;
};

export type WechatMenuTranslation = {
  __typename?: 'WechatMenuTranslation';
  locale: Scalars['String']['output'];
  text: Scalars['String']['output'];
};

export type WechatMenuVariable = {
  __typename?: 'WechatMenuVariable';
  description?: Maybe<Scalars['String']['output']>;
  example?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  label: Scalars['String']['output'];
};

export type WechatOpenConfig = {
  __typename?: 'WechatOpenConfig';
  appId?: Maybe<Scalars['String']['output']>;
};

export type WechatTemplate = {
  __typename?: 'WechatTemplate';
  content?: Maybe<Scalars['String']['output']>;
  deputyIndustry?: Maybe<Scalars['String']['output']>;
  example?: Maybe<Scalars['String']['output']>;
  primaryIndustry?: Maybe<Scalars['String']['output']>;
  templateId: Scalars['String']['output'];
  title: Scalars['String']['output'];
};

export type WechatTemplateAssignment = {
  __typename?: 'WechatTemplateAssignment';
  error?: Maybe<Scalars['String']['output']>;
  label?: Maybe<Scalars['String']['output']>;
  slot?: Maybe<WechatTemplateSlotKey>;
  success: Scalars['Boolean']['output'];
  templateId?: Maybe<Scalars['String']['output']>;
};

export type WechatTemplateListResult = {
  __typename?: 'WechatTemplateListResult';
  error?: Maybe<Scalars['String']['output']>;
  success: Scalars['Boolean']['output'];
  templates: Array<WechatTemplate>;
};

export type WechatTemplateSlot = {
  __typename?: 'WechatTemplateSlot';
  key: WechatTemplateSlotKey;
  label: Scalars['String']['output'];
  templateId?: Maybe<Scalars['String']['output']>;
};

export enum WechatTemplateSlotKey {
  MahjongGszSync = 'MAHJONG_GSZ_SYNC',
  MahjongStart = 'MAHJONG_START',
  MembershipChange = 'MEMBERSHIP_CHANGE',
  OrderSettled = 'ORDER_SETTLED',
  OrderStart = 'ORDER_START',
  PassExpiring = 'PASS_EXPIRING',
  PhoneBound = 'PHONE_BOUND',
  TableTransfer = 'TABLE_TRANSFER'
}
