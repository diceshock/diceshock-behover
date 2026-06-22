/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
const defaultOptions = {} as const;
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

export type AddWechatTemplateFromLibraryInput = {
  keywordNameList?: InputMaybe<Array<Scalars['String']['input']>>;
  slot: WechatTemplateSlotKey;
  templateIdShort: Scalars['String']['input'];
};

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
  deductFromStoredValue?: InputMaybe<Scalars['Boolean']['input']>;
  ids: Array<Scalars['ID']['input']>;
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

export type DeductStoredValueInput = {
  amount: Scalars['Int']['input'];
  date: Scalars['String']['input'];
  note: Scalars['String']['input'];
  userId: Scalars['ID']['input'];
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
  addTableOccupancy: TableOccupancy;
  addWechatTemplateFromLibrary: WechatTemplateAssignment;
  assignWechatTemplateSlot: WechatTemplateSlot;
  batchPauseOrders: Array<BatchOrderResult>;
  batchRemoveActives: Array<Active>;
  batchResumeOrders: Array<BatchOrderResult>;
  batchSettleOrders: BatchSettlementResult;
  batchSettlementPreview: Array<SettlementPreview>;
  batchSyncMahjongMatchesToGsz: GszSyncResult;
  cancelBatchSettlement: Array<BatchOrderResult>;
  cleanupOrphanedOrders: CleanupOrphanedDataResult;
  closeShortlink: Shortlink;
  createActive: Active;
  createEvent: Event;
  createMembershipPlan: MembershipPlan;
  createShortlink: Shortlink;
  createTable: Table;
  createTempIdentity: TempIdentity;
  deductStoredValue: MembershipDeductionResult;
  disableUser: UserProfile;
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
  pauseMyOrder: TableOccupancy;
  pauseOrder: TableOccupancy;
  publishPricingSnapshot: PricingSnapshot;
  regenerateTableCode: Table;
  registerMahjong: MahjongRegistrationStatus;
  removeActive: Active;
  removeActiveRegistration: ActiveRegistration;
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
  resumeOrder: TableOccupancy;
  saveMahjongMatch: MahjongMatch;
  savePricingSnapshot: PricingSnapshot;
  sendWechatTemplateTest: WechatTemplateAssignment;
  setCaptchaEnabled: CaptchaSettings;
  settleOrder: SettlementResult;
  syncMahjongMatchToGsz: GszSyncResult;
  syncOwnedBoardGames: BoardGameSyncResult;
  terminateMahjongMatch: MahjongMatch;
  toggleEventPublish: Event;
  toggleTableStatus: Table;
  transferTempIdentity: TempIdentityTransferResult;
  updateActive: Active;
  updateEvent: Event;
  updateMahjongScore: MahjongMatch;
  updateMembershipPlan: MembershipPlan;
  updateMyPreferences: UserProfile;
  updateMyUserInfo: UserInfoUpdateResult;
  updateShortlinkExpiry: Shortlink;
  updateTable: Table;
  updateUser: UserProfile;
  updateUserRole: UserProfile;
  upsertBusinessCard: BusinessCard;
  verifyTotp: TotpVerificationResult;
  wakeOwnedBoardGames: BoardGameSyncResult;
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


export type MutationCreateShortlinkArgs = {
  input: CreateShortlinkInput;
};


export type MutationCreateTableArgs = {
  input: CreateTableInput;
};


export type MutationDeductStoredValueArgs = {
  input: DeductStoredValueInput;
};


export type MutationDisableUserArgs = {
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


export type MutationPauseMyOrderArgs = {
  input: LeaveTableInput;
};


export type MutationPauseOrderArgs = {
  id: Scalars['ID']['input'];
};


export type MutationPublishPricingSnapshotArgs = {
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


export type MutationResumeOrderArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSaveMahjongMatchArgs = {
  input: SaveMahjongMatchInput;
};


export type MutationSavePricingSnapshotArgs = {
  input: SavePricingSnapshotInput;
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


export type MutationToggleTableStatusArgs = {
  id: Scalars['ID']['input'];
};


export type MutationTransferTempIdentityArgs = {
  tempId: Scalars['ID']['input'];
  userId: Scalars['ID']['input'];
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

export type Query = {
  __typename?: 'Query';
  active: Active;
  activeMahjongMatches: Array<ActiveMahjongMatch>;
  activeParticipants: Array<ActiveRegistration>;
  actives: ActiveListResult;
  businessCard?: Maybe<BusinessCard>;
  captchaSettings: CaptchaSettings;
  crawlerErrors: Array<CrawlerError>;
  crawlerStats: CrawlerStats;
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
  mediaObjects: MediaListResult;
  membershipPlansByUser: Array<MembershipPlan>;
  myActiveOccupancies: Array<ActiveOccupancySummary>;
  myBadges: Array<UserBadge>;
  myBusinessCard?: Maybe<BusinessCard>;
  myMahjongMatches: Array<MahjongMatch>;
  myMahjongRegistration: MahjongRegistrationStatus;
  myMembershipPlans: Array<MembershipPlan>;
  myPPStats: PpStats;
  myRankings: Array<RankingSummary>;
  occupanciesByUser: Array<TableOccupancy>;
  order: TableOccupancy;
  orders: OrderListResult;
  ownedBoardGame?: Maybe<BoardGameSummary>;
  ownedBoardGameCount: BoardGameCounts;
  ownedBoardGames: Array<BoardGameSummary>;
  participantBusinessCards: Array<BusinessCard>;
  pricingDraft: PricingDraft;
  pricingSnapshot: PricingSnapshot;
  pricingSnapshots: Array<PricingSnapshot>;
  publishedPricing?: Maybe<PricingSnapshot>;
  searchRules: RuleSearchResponse;
  settlementPreview: SettlementPreview;
  shortlinks: ShortlinkListResult;
  tableByCode: Table;
  tempIdentityActiveOccupancies: Array<ActiveOccupancySummary>;
  user?: Maybe<UserProfile>;
  userBadges: Array<UserBadge>;
  users: UserListResult;
  validateTempIdentity: TempIdentity;
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
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryManagedEventArgs = {
  id: Scalars['ID']['input'];
};


export type QueryManagedEventsArgs = {
  storeId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryManagedMahjongMatchArgs = {
  id: Scalars['ID']['input'];
};


export type QueryManagedMahjongMatchesArgs = {
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
  storeId?: InputMaybe<Scalars['ID']['input']>;
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


export type QueryUsersArgs = {
  input?: InputMaybe<UserSearchInput>;
};


export type QueryValidateTempIdentityArgs = {
  tempId: Scalars['ID']['input'];
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

export type SeatUpdatePayload = {
  __typename?: 'SeatUpdatePayload';
  occupancies: Array<TableOccupancy>;
  table: Table;
  tableCode: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type SettleOrderInput = {
  deductFromStoredValue?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['ID']['input'];
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

export type TableOccupancy = {
  __typename?: 'TableOccupancy';
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

export type UserProfile = {
  __typename?: 'UserProfile';
  createdAt?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  image?: Maybe<Scalars['String']['output']>;
  membershipPlans: Array<MembershipPlan>;
  meta?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  nickname?: Maybe<Scalars['String']['output']>;
  phone?: Maybe<Scalars['String']['output']>;
  preferredLocale?: Maybe<Scalars['String']['output']>;
  preferredStoreId?: Maybe<Scalars['ID']['output']>;
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

export type VerifyTotpInput = {
  loginTime: Scalars['Float']['input'];
  totp: Scalars['String']['input'];
  userAgent: Scalars['String']['input'];
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

export type ActiveDateRange =
  | 'MONTH'
  | 'TODAY'
  | 'WEEK'
  | 'YEAR';

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

export type AddWechatTemplateFromLibraryInput = {
  keywordNameList?: Array<string> | null | undefined;
  slot: WechatTemplateSlotKey;
  templateIdShort: string;
};

export type BatchSettleInput = {
  deductFromStoredValue?: boolean | null | undefined;
  ids: Array<string | number>;
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

export type DeductStoredValueInput = {
  amount: number;
  date: string;
  note: string;
  userId: string | number;
};

export type EventInput = {
  content?: string | null | undefined;
  coverImageUrl?: string | null | undefined;
  description?: string | null | undefined;
  storeId?: string | number | null | undefined;
  title: string;
};

export type GszSyncFilter =
  | 'ALL'
  | 'SYNCED'
  | 'UNSYNCED';

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

export type MahjongCompletionFilter =
  | 'ALL'
  | 'COMPLETED'
  | 'INCOMPLETE';

export type MahjongFormat =
  | 'HANCHAN'
  | 'TONPUU';

export type MahjongManagementListInput = {
  completion?: MahjongCompletionFilter | null | undefined;
  endDate?: string | null | undefined;
  format?: MahjongFormat | null | undefined;
  gszSync?: GszSyncFilter | null | undefined;
  mode?: MahjongMode | null | undefined;
  pagination?: PaginationInput | null | undefined;
  search?: string | null | undefined;
  startDate?: string | null | undefined;
  storeId?: string | number | null | undefined;
  tableId?: string | number | null | undefined;
};

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

export type SettleOrderInput = {
  deductFromStoredValue?: boolean | null | undefined;
  id: string | number;
};

export type SortOrder =
  | 'ASC'
  | 'DESC';

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

export type UserRole =
  | 'ADMIN'
  | 'CUSTOMER'
  | 'STAFF';

export type UserSearchInput = {
  pagination?: PaginationInput | null | undefined;
  searchWords?: string | null | undefined;
};

export type VerifyTotpInput = {
  loginTime: number;
  totp: string;
  userAgent: string;
};

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
  input?: ActiveListInput | null | undefined;
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
  category: LeaderboardCategory;
  period: LeaderboardPeriod;
}>;


export type GetLeaderboardQuery = { leaderboard: { category: LeaderboardCategory, period: LeaderboardPeriod, computedAt: string | null, entries: Array<{ userId: string, nickname: string, totalPP: number, matchCount: number, rank: number, prevRank: number | null }> } };

export type GetOwnedBoardGameCountQueryVariables = Exact<{ [key: string]: never; }>;


export type GetOwnedBoardGameCountQuery = { ownedBoardGameCount: { current: number, removed: number, latestDate: string | null } };

export type GetOwnedBoardGameQueryVariables = Exact<{
  id: string | number;
}>;


export type GetOwnedBoardGameQuery = { ownedBoardGame: { id: string, schName: string | null, engName: string | null, gstoneId: number | null, gstoneRating: number | null, category: string | null, mode: string | null, playerNum: string | null, bestPlayerNum: string | null, content: string | null, removeDate: string | null } | null };

export type GetOwnedBoardGamesQueryVariables = Exact<{
  input?: BoardGameFilterInput | null | undefined;
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
  input: CreateActiveInput;
}>;


export type CreateActiveMutation = { createActive: { id: string, creatorId: string, title: string, boardGameId: string | null, storeId: string | null, date: string, time: string | null, maxPlayers: number, content: string | null, isGame: boolean, createdAt: string | null, boardGame: { id: string, schName: string | null, engName: string | null, gstoneRating: number | null } | null, registrations: Array<{ id: string, activeId: string, userId: string, isWatching: boolean, nickname: string | null, uid: string | null, createdAt: string | null }> } };

export type ManagedActivesQueryVariables = Exact<{ [key: string]: never; }>;


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
  input: UpdateActiveInput;
}>;


export type UpdateActiveMutation = { updateActive: { id: string, title: string, date: string, time: string | null, maxPlayers: number, boardGameId: string | null, content: string | null, isGame: boolean } };

export type RemoveActiveRegistrationMutationVariables = Exact<{
  registrationId: string | number;
}>;


export type RemoveActiveRegistrationMutation = { removeActiveRegistration: { id: string } };

export type CrawlerStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type CrawlerStatsQuery = { crawlerStats: { total: number, crawled: number, errors: number, imagesCached: number, maxId: number, estimatedMax: number } };

export type CrawlerErrorsQueryVariables = Exact<{
  limit?: number | null | undefined;
}>;


export type CrawlerErrorsQuery = { crawlerErrors: Array<{ gstoneId: number, error: string | null, retryCount: number, updatedAt: string | null }> };

export type ResetCrawlerErrorsMutationVariables = Exact<{ [key: string]: never; }>;


export type ResetCrawlerErrorsMutation = { resetCrawlerErrors: { total: number, crawled: number, errors: number, imagesCached: number, maxId: number, estimatedMax: number } };

export type ManagedEventsQueryVariables = Exact<{ [key: string]: never; }>;


export type ManagedEventsQuery = { managedEvents: Array<{ id: string, title: string, description: string | null, coverImageUrl: string | null, content: string | null, isPublished: boolean, createdAt: string | null, updatedAt: string | null }> };

export type ManagedEventQueryVariables = Exact<{
  id: string | number;
}>;


export type ManagedEventQuery = { managedEvent: { id: string, title: string, description: string | null, coverImageUrl: string | null, content: string | null, isPublished: boolean, createdAt: string | null, updatedAt: string | null } };

export type CreateEventMutationVariables = Exact<{
  input: EventInput;
}>;


export type CreateEventMutation = { createEvent: { id: string, title: string, description: string | null, coverImageUrl: string | null, content: string | null, isPublished: boolean, createdAt: string | null, updatedAt: string | null } };

export type UpdateEventMutationVariables = Exact<{
  input: UpdateEventInput;
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


export type MahjongMatchQuery = { mahjongMatch: { id: string, tableId: string | null, matchType: MahjongMatchType | null, gszRecordId: number | null, gszSynced: boolean, gszError: string | null, gszSyncedAt: string | null, mode: MahjongMode, format: MahjongFormat, startedAt: string, endedAt: string, terminationReason: MahjongTerminationReason, playersJson: string, scores: string | null, createdAt: string | null, table: { id: string, name: string, code: string } | null, players: Array<{ userId: string, nickname: string, seat: string | null, finalScore: number }>, config: { type: string | null, mode: string, format: string } | null, unsyncableReasons: Array<{ nickname: string, userId: string, reason: UnsyncableReasonCode }> } | null };

export type TerminateMahjongMatchMutationVariables = Exact<{
  tableCode: string;
  reason?: MahjongTerminationReason | null | undefined;
}>;


export type TerminateMahjongMatchMutation = { terminateMahjongMatch: { id: string, terminationReason: MahjongTerminationReason, terminatedAt: string } };

export type UpdateMahjongScoreMutationVariables = Exact<{
  matchId: string | number;
  players: Array<MahjongPlayerInput> | MahjongPlayerInput;
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
  input?: MahjongManagementListInput | null | undefined;
}>;


export type ManagedMahjongMatchesQuery = { managedMahjongMatches: { items: Array<{ id: string, tableId: string | null, matchType: MahjongMatchType | null, gszRecordId: number | null, gszSynced: boolean, gszError: string | null, gszSyncedAt: string | null, mode: MahjongMode, format: MahjongFormat, startedAt: string, endedAt: string, terminationReason: MahjongTerminationReason, playersJson: string, table: { id: string, name: string, code: string, scope: TableScope } | null, players: Array<{ userId: string, nickname: string, seat: string | null, finalScore: number }>, unsyncableReasons: Array<{ nickname: string, userId: string, reason: UnsyncableReasonCode }> }>, pageInfo: { offset: number, limit: number, total: number | null, nextCursor: string | null, hasMore: boolean } } };

export type ActiveMahjongMatchesQueryVariables = Exact<{ [key: string]: never; }>;


export type ActiveMahjongMatchesQuery = { activeMahjongMatches: Array<{ tableCode: string, tableName: string, tableId: string, phase: string, matchType: MahjongMatchType, mode: MahjongMode, format: MahjongFormat, startedAt: string | null, players: Array<{ userId: string, nickname: string, seat: string | null, currentPoints: number | null }> }> };

export type MahjongTablesQueryVariables = Exact<{ [key: string]: never; }>;


export type MahjongTablesQuery = { mahjongTables: Array<{ id: string, name: string, code: string }> };

export type MediaObjectsQueryVariables = Exact<{
  input?: MediaListInput | null | undefined;
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
  input?: OrderListInput | null | undefined;
}>;


export type OrdersQuery = { orders: { items: Array<{ id: string, tableId: string, userId: string | null, tempId: string | null, nickname: string | null, uid: string | null, phone: string | null, seats: number, status: OrderStatus, startAt: string, endAt: string | null, finalPrice: number | null, pricingSnapshotId: string | null, table: { id: string, name: string, code: string, scope: TableScope } | null }>, pageInfo: { offset: number, limit: number, total: number | null, nextCursor: string | null, hasMore: boolean } } };

export type OrderQueryVariables = Exact<{
  id: string | number;
}>;


export type OrderQuery = { order: { id: string, tableId: string, userId: string | null, tempId: string | null, nickname: string | null, uid: string | null, phone: string | null, seats: number, status: OrderStatus, startAt: string, endAt: string | null, finalPrice: number | null, pricingSnapshotId: string | null, priceBreakdown: string | null, settlementSnapshot: string | null, table: { id: string, name: string, code: string, scope: TableScope } | null, user: { id: string, uid: string | null, name: string | null, nickname: string | null, role: UserRole } | null } };

export type SettlementPreviewQueryVariables = Exact<{
  id: string | number;
}>;


export type SettlementPreviewQuery = { settlementPreview: { totalMinutes: number, pausedMinutes: number, billableMinutes: number, finalPrice: number, order: { id: string, tableId: string, userId: string | null, tempId: string | null, nickname: string | null, uid: string | null, status: OrderStatus, startAt: string, endAt: string | null, finalPrice: number | null, table: { id: string, name: string, code: string, scope: TableScope } | null }, priceBreakdown: { planName: string, planType: string, billingType: string, unitPrice: number, totalMinutes: number, billableHalfHours: number, rawPrice: number, capApplied: boolean, capType: string | null, finalPrice: number } | null, membership: { hasTimePlan: boolean, timePlanActive: boolean, timePlanType: string | null, timePlanEndDate: string | null, storedValueBalance: number }, pauseLogs: Array<{ pausedAt: string, resumedAt: string | null }>, pricingPlans: Array<{ name: string, planType: string, billingType: string, price: number, matched: boolean }>, recentOrders: Array<{ id: string, tableName: string, startAt: string, endAt: string | null, finalPrice: number | null, status: OrderStatus }> } };

export type BatchSettlementPreviewMutationVariables = Exact<{
  ids: Array<string | number> | string | number;
}>;


export type BatchSettlementPreviewMutation = { batchSettlementPreview: Array<{ totalMinutes: number, pausedMinutes: number, billableMinutes: number, finalPrice: number, order: { id: string, tableId: string, userId: string | null, tempId: string | null, nickname: string | null, uid: string | null, status: OrderStatus, startAt: string, endAt: string | null, finalPrice: number | null, table: { id: string, name: string, code: string, scope: TableScope } | null }, priceBreakdown: { planName: string, planType: string, billingType: string, unitPrice: number, totalMinutes: number, billableHalfHours: number, rawPrice: number, capApplied: boolean, capType: string | null, finalPrice: number } | null, membership: { hasTimePlan: boolean, timePlanActive: boolean, timePlanType: string | null, timePlanEndDate: string | null, storedValueBalance: number }, pauseLogs: Array<{ pausedAt: string, resumedAt: string | null }>, pricingPlans: Array<{ name: string, planType: string, billingType: string, price: number, matched: boolean }>, recentOrders: Array<{ id: string, tableName: string, startAt: string, endAt: string | null, finalPrice: number | null, status: OrderStatus }> }> };

export type PauseOrderMutationVariables = Exact<{
  id: string | number;
}>;


export type PauseOrderMutation = { pauseOrder: { id: string, status: OrderStatus } };

export type ResumeOrderMutationVariables = Exact<{
  id: string | number;
}>;


export type ResumeOrderMutation = { resumeOrder: { id: string, status: OrderStatus } };

export type EndOrderMutationVariables = Exact<{
  id: string | number;
}>;


export type EndOrderMutation = { endOrder: { id: string, status: OrderStatus, endAt: string | null } };

export type SettleOrderMutationVariables = Exact<{
  input: SettleOrderInput;
}>;


export type SettleOrderMutation = { settleOrder: { price: number, snapshot: string | null, order: { id: string, status: OrderStatus, finalPrice: number | null }, storedValueDeduction: { deducted: boolean, amount: number, note: string, balanceBefore: number, balanceAfter: number } | null } };

export type BatchSettleOrdersMutationVariables = Exact<{
  input: BatchSettleInput;
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


export type OrderStatusChangedSubscription = { orderStatusChanged: { previousStatus: OrderStatus | null, currentStatus: OrderStatus, updatedAt: string, order: { id: string, tableId: string, userId: string | null, tempId: string | null, nickname: string | null, uid: string | null, phone: string | null, seats: number, status: OrderStatus, startAt: string, endAt: string | null, finalPrice: number | null, table: { id: string, name: string, code: string, scope: TableScope } | null } } };

export type PricingDraftQueryVariables = Exact<{
  storeId?: string | number | null | undefined;
}>;


export type PricingDraftQuery = { pricingDraft: { snapshotId: string | null, snapshotName: string | null, status: PricingSnapshotStatus | null, data: { plans: string, config: { daytimeStart: string, daytimeEnd: string } } } };

export type PricingSnapshotsQueryVariables = Exact<{
  storeId?: string | number | null | undefined;
}>;


export type PricingSnapshotsQuery = { pricingSnapshots: Array<{ id: string, name: string, storeId: string | null, status: PricingSnapshotStatus, summary: string | null, createdAt: string | null, publishedAt: string | null, data: { plans: string, config: { daytimeStart: string, daytimeEnd: string } } }> };

export type PricingSnapshotQueryVariables = Exact<{
  id: string | number;
}>;


export type PricingSnapshotQuery = { pricingSnapshot: { id: string, name: string, storeId: string | null, status: PricingSnapshotStatus, summary: string | null, createdAt: string | null, publishedAt: string | null, data: { plans: string, config: { daytimeStart: string, daytimeEnd: string } } } };

export type SavePricingSnapshotMutationVariables = Exact<{
  input: SavePricingSnapshotInput;
}>;


export type SavePricingSnapshotMutation = { savePricingSnapshot: { id: string, name: string, storeId: string | null, status: PricingSnapshotStatus, summary: string | null, createdAt: string | null, publishedAt: string | null, data: { plans: string, config: { daytimeStart: string, daytimeEnd: string } } } };

export type PublishPricingSnapshotMutationVariables = Exact<{
  storeId?: string | number | null | undefined;
}>;


export type PublishPricingSnapshotMutation = { publishPricingSnapshot: { id: string, name: string, status: PricingSnapshotStatus, publishedAt: string | null } };

export type RestorePricingSnapshotMutationVariables = Exact<{
  id: string | number;
}>;


export type RestorePricingSnapshotMutation = { restorePricingSnapshot: { id: string, name: string, status: PricingSnapshotStatus, summary: string | null, createdAt: string | null, publishedAt: string | null, data: { plans: string, config: { daytimeStart: string, daytimeEnd: string } } } };

export type CaptchaSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type CaptchaSettingsQuery = { captchaSettings: { enabled: boolean, disabledUntil: string | null } };

export type SetCaptchaEnabledMutationVariables = Exact<{
  enabled: boolean;
}>;


export type SetCaptchaEnabledMutation = { setCaptchaEnabled: { enabled: boolean, disabledUntil: string | null } };

export type ManagedTablesQueryVariables = Exact<{ [key: string]: never; }>;


export type ManagedTablesQuery = { managedTables: Array<{ id: string, name: string, type: TableType, scope: TableScope, status: TableStatus, capacity: number, code: string, description: string | null, storeId: string | null, createdAt: string | null, updatedAt: string | null, occupancies: Array<{ id: string, tableId: string, userId: string | null, nickname: string | null, uid: string | null, seats: number, status: OrderStatus }> }> };

export type ManagedTableQueryVariables = Exact<{
  id: string | number;
}>;


export type ManagedTableQuery = { managedTable: { id: string, name: string, type: TableType, scope: TableScope, status: TableStatus, capacity: number, code: string, description: string | null, storeId: string | null, createdAt: string | null, updatedAt: string | null, occupancies: Array<{ id: string, tableId: string, userId: string | null, nickname: string | null, uid: string | null, phone: string | null, seats: number, status: OrderStatus, startAt: string, endAt: string | null, finalPrice: number | null }> } };

export type CreateTableMutationVariables = Exact<{
  input: CreateTableInput;
}>;


export type CreateTableMutation = { createTable: { id: string, name: string, type: TableType, scope: TableScope, status: TableStatus, capacity: number, code: string } };

export type UpdateTableMutationVariables = Exact<{
  input: UpdateTableInput;
}>;


export type UpdateTableMutation = { updateTable: { id: string, name: string, type: TableType, scope: TableScope, status: TableStatus, capacity: number, description: string | null } };

export type RemoveTableMutationVariables = Exact<{
  id: string | number;
}>;


export type RemoveTableMutation = { removeTable: { id: string } };

export type ToggleTableStatusMutationVariables = Exact<{
  id: string | number;
}>;


export type ToggleTableStatusMutation = { toggleTableStatus: { id: string, status: TableStatus } };

export type RegenerateTableCodeMutationVariables = Exact<{
  id: string | number;
}>;


export type RegenerateTableCodeMutation = { regenerateTableCode: { id: string, code: string } };

export type AddTableOccupancyMutationVariables = Exact<{
  input: AddOccupancyInput;
}>;


export type AddTableOccupancyMutation = { addTableOccupancy: { id: string, tableId: string, userId: string | null, nickname: string | null, uid: string | null, status: OrderStatus } };

export type UsersQueryVariables = Exact<{
  input?: UserSearchInput | null | undefined;
}>;


export type UsersQuery = { users: { items: Array<{ id: string, uid: string | null, name: string | null, email: string | null, image: string | null, role: UserRole, nickname: string | null, phone: string | null, preferredLocale: string | null, preferredStoreId: string | null, meta: string | null, createdAt: string | null, membershipPlans: Array<{ id: string, userId: string, planType: MembershipPlanType, amount: number | null, note: string | null, startDate: string, endDate: string | null, createdAt: string | null, updatedAt: string | null }> }>, pageInfo: { offset: number, limit: number, total: number | null, nextCursor: string | null, hasMore: boolean } } };

export type UserQueryVariables = Exact<{
  id: string | number;
}>;


export type UserQuery = { user: { id: string, uid: string | null, name: string | null, email: string | null, image: string | null, role: UserRole, nickname: string | null, phone: string | null, preferredLocale: string | null, preferredStoreId: string | null, meta: string | null, createdAt: string | null, membershipPlans: Array<{ id: string, userId: string, planType: MembershipPlanType, amount: number | null, note: string | null, startDate: string, endDate: string | null, createdAt: string | null, updatedAt: string | null }> } | null };

export type DisableUserMutationVariables = Exact<{
  id: string | number;
}>;


export type DisableUserMutation = { disableUser: { id: string, role: UserRole } };

export type UpdateUserMutationVariables = Exact<{
  input: UpdateManagedUserInput;
}>;


export type UpdateUserMutation = { updateUser: { id: string, uid: string | null, name: string | null, email: string | null, role: UserRole, nickname: string | null, phone: string | null } };

export type UpdateUserRoleMutationVariables = Exact<{
  input: UpdateRoleInput;
}>;


export type UpdateUserRoleMutation = { updateUserRole: { id: string, role: UserRole } };

export type MembershipPlansByUserQueryVariables = Exact<{
  userId: string | number;
}>;


export type MembershipPlansByUserQuery = { membershipPlansByUser: Array<{ id: string, userId: string, planType: MembershipPlanType, amount: number | null, note: string | null, startDate: string, endDate: string | null, createdAt: string | null, updatedAt: string | null }> };

export type CreateMembershipPlanMutationVariables = Exact<{
  input: CreateMembershipPlanInput;
}>;


export type CreateMembershipPlanMutation = { createMembershipPlan: { id: string, userId: string, planType: MembershipPlanType, amount: number | null, note: string | null, startDate: string, endDate: string | null, createdAt: string | null, updatedAt: string | null } };

export type UpdateMembershipPlanMutationVariables = Exact<{
  input: UpdateMembershipPlanInput;
}>;


export type UpdateMembershipPlanMutation = { updateMembershipPlan: { id: string, userId: string, planType: MembershipPlanType, amount: number | null, note: string | null, startDate: string, endDate: string | null, createdAt: string | null, updatedAt: string | null } };

export type RemoveMembershipPlanMutationVariables = Exact<{
  id: string | number;
}>;


export type RemoveMembershipPlanMutation = { removeMembershipPlan: { id: string } };

export type DeductStoredValueMutationVariables = Exact<{
  input: DeductStoredValueInput;
}>;


export type DeductStoredValueMutation = { deductStoredValue: { deducted: number, plan: { id: string, userId: string, planType: MembershipPlanType, amount: number | null } } };

export type OccupanciesByUserQueryVariables = Exact<{
  userId: string | number;
}>;


export type OccupanciesByUserQuery = { occupanciesByUser: Array<{ id: string, tableId: string, userId: string | null, tempId: string | null, nickname: string | null, uid: string | null, phone: string | null, seats: number, status: OrderStatus, startAt: string, endAt: string | null, finalPrice: number | null, table: { id: string, name: string, code: string, scope: TableScope } | null }> };

export type VerifyTotpDashMutationVariables = Exact<{
  input: VerifyTotpInput;
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

export type WechatTemplatesQueryVariables = Exact<{ [key: string]: never; }>;


export type WechatTemplatesQuery = { wechatTemplates: { success: boolean, error: string | null, templates: Array<{ templateId: string, title: string, primaryIndustry: string | null, deputyIndustry: string | null, content: string | null, example: string | null }> } };

export type WechatTemplateSlotsQueryVariables = Exact<{ [key: string]: never; }>;


export type WechatTemplateSlotsQuery = { wechatTemplateSlots: Array<{ key: WechatTemplateSlotKey, label: string, templateId: string | null }> };

export type AddWechatTemplateFromLibraryMutationVariables = Exact<{
  input: AddWechatTemplateFromLibraryInput;
}>;


export type AddWechatTemplateFromLibraryMutation = { addWechatTemplateFromLibrary: { success: boolean, error: string | null, templateId: string | null, slot: WechatTemplateSlotKey | null, label: string | null } };

export type AssignWechatTemplateSlotMutationVariables = Exact<{
  slot: WechatTemplateSlotKey;
  templateId: string;
}>;


export type AssignWechatTemplateSlotMutation = { assignWechatTemplateSlot: { key: WechatTemplateSlotKey, label: string, templateId: string | null } };

export type RemoveWechatTemplateMutationVariables = Exact<{
  templateId: string;
}>;


export type RemoveWechatTemplateMutation = { removeWechatTemplate: { success: boolean, error: string | null, templateId: string | null, slot: WechatTemplateSlotKey | null, label: string | null } };

export type SendWechatTemplateTestMutationVariables = Exact<{
  userId: string | number;
  slot: WechatTemplateSlotKey;
}>;


export type SendWechatTemplateTestMutation = { sendWechatTemplateTest: { success: boolean, error: string | null, templateId: string | null, slot: WechatTemplateSlotKey | null, label: string | null } };

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


export type GetMyRankingsQuery = { myRankings: Array<{ category: LeaderboardCategory, period: LeaderboardPeriod, rank: number | null, totalPP: number, prevRank: number | null, matchCount: number }> };

export type GetUserBadgesQueryVariables = Exact<{
  userId: string | number;
  storeId?: string | number | null | undefined;
}>;


export type GetUserBadgesQuery = { userBadges: Array<{ id: string, userId: string | null, badgeType: string, badgeRank: number, category: string, periodLabel: string, title: string, awardedAt: string | null, createdAt: string | null }> };

export type GetMahjongMatchHistoryQueryVariables = Exact<{
  input?: MahjongMatchHistoryInput | null | undefined;
}>;


export type GetMahjongMatchHistoryQuery = { mahjongMatchHistory: { items: Array<{ id: string, tableId: string | null, matchType: MahjongMatchType | null, gszRecordId: number | null, gszSynced: boolean, mode: MahjongMode, format: MahjongFormat, startedAt: string, endedAt: string, terminationReason: MahjongTerminationReason, playersJson: string, scores: string | null, table: { id: string, name: string } | null, players: Array<{ userId: string, nickname: string, seat: string | null, finalScore: number }>, config: { type: string | null, mode: string, format: string } | null, unsyncableReasons: Array<{ nickname: string, userId: string, reason: UnsyncableReasonCode }> }>, pageInfo: { offset: number, limit: number, total: number | null, nextCursor: string | null, hasMore: boolean } } };

export type MyMahjongMatchesQueryVariables = Exact<{
  storeId?: string | number | null | undefined;
}>;


export type MyMahjongMatchesQuery = { myMahjongMatches: Array<{ id: string, tableId: string | null, matchType: MahjongMatchType | null, gszRecordId: number | null, gszSynced: boolean, gszError: string | null, gszSyncedAt: string | null, mode: MahjongMode, format: MahjongFormat, startedAt: string, endedAt: string, terminationReason: MahjongTerminationReason, playersJson: string, scores: string | null, createdAt: string | null, table: { id: string, name: string, code: string } | null, players: Array<{ userId: string, nickname: string, seat: string | null, finalScore: number }>, config: { type: string | null, mode: string, format: string } | null }> };

export type MyMahjongRegistrationQueryVariables = Exact<{ [key: string]: never; }>;


export type MyMahjongRegistrationQuery = { myMahjongRegistration: { hasPhone: boolean, phone: string | null, nickname: string | null, registered: boolean, gszName: string | null, gszId: number | null, gszSynced: boolean, gszError: string | null, alreadyExisted: boolean | null, nicknameSynced: boolean | null } };

export type RegisterMahjongMutationVariables = Exact<{
  input: RegisterMahjongInput;
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


export type SeatUpdatedSubscription = { seatUpdated: { tableCode: string, updatedAt: string, table: { id: string, name: string, type: TableType, scope: TableScope, status: TableStatus, capacity: number, code: string }, occupancies: Array<{ id: string, userId: string | null, nickname: string | null, uid: string | null, seats: number, startAt: string, status: OrderStatus, tableId: string }> } };

export type TableByCodeQueryVariables = Exact<{
  code: string;
  storeId?: string | number | null | undefined;
}>;


export type TableByCodeQuery = { tableByCode: { id: string, name: string, type: TableType, scope: TableScope, status: TableStatus, capacity: number, code: string, description: string | null, storeId: string | null, createdAt: string | null, updatedAt: string | null, occupancies: Array<{ id: string, tableId: string, userId: string | null, tempId: string | null, nickname: string | null, uid: string | null, seats: number, status: OrderStatus, startAt: string, endAt: string | null, finalPrice: number | null }> } };

export type MyActiveOccupanciesQueryVariables = Exact<{
  storeId?: string | number | null | undefined;
}>;


export type MyActiveOccupanciesQuery = { myActiveOccupancies: Array<{ code: string, name: string, status: OrderStatus }> };

export type PauseMyOrderMutationVariables = Exact<{
  input: LeaveTableInput;
}>;


export type PauseMyOrderMutation = { pauseMyOrder: { id: string, tableId: string, userId: string | null, nickname: string | null, status: OrderStatus, startAt: string, endAt: string | null } };

export type OccupyTableMutationVariables = Exact<{
  input: OccupyTableInput;
}>;


export type OccupyTableMutation = { occupyTable: { occupancy: { id: string, tableId: string, userId: string | null, nickname: string | null, status: OrderStatus, startAt: string, endAt: string | null }, table: { id: string, code: string, name: string } } };

export type CreateTempIdentityMutationVariables = Exact<{ [key: string]: never; }>;


export type CreateTempIdentityMutation = { createTempIdentity: { id: string, nickname: string, totpSecret: string, expiresAt: string, valid: boolean } };

export type ValidateTempIdentityQueryVariables = Exact<{
  tempId: string | number;
}>;


export type ValidateTempIdentityQuery = { validateTempIdentity: { id: string, nickname: string, totpSecret: string, expiresAt: string, valid: boolean } };

export type TempIdentityActiveOccupanciesQueryVariables = Exact<{
  tempId: string | number;
}>;


export type TempIdentityActiveOccupanciesQuery = { tempIdentityActiveOccupancies: Array<{ code: string, name: string, status: OrderStatus }> };

export type TransferTempIdentityMutationVariables = Exact<{
  tempId: string | number;
  userId: string | number;
}>;


export type TransferTempIdentityMutation = { transferTempIdentity: { transferred: boolean, occupancy: { id: string, tableId: string, userId: string | null, nickname: string | null, status: OrderStatus } | null } };

export type OccupyTableWithTempIdentityMutationVariables = Exact<{
  input: TempIdentityOccupyInput;
}>;


export type OccupyTableWithTempIdentityMutation = { occupyTableWithTempIdentity: { occupancy: { id: string, tableId: string, userId: string | null, nickname: string | null, status: OrderStatus }, table: { id: string, code: string, name: string } } };

export type GetMyBusinessCardQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMyBusinessCardQuery = { myBusinessCard: { userId: string, nickname: string | null, uid: string | null, sharePhone: boolean, phone: string | null, wechat: string | null, qq: string | null, customContent: string | null, isWatching: boolean | null, registrationId: string | null, createdAt: string | null, updatedAt: string | null } | null };

export type UpsertBusinessCardMutationVariables = Exact<{
  input: UpsertBusinessCardInput;
}>;


export type UpsertBusinessCardMutation = { upsertBusinessCard: { userId: string, nickname: string | null, uid: string | null, sharePhone: boolean, phone: string | null, wechat: string | null, qq: string | null, customContent: string | null, isWatching: boolean | null, registrationId: string | null, createdAt: string | null, updatedAt: string | null } };

export type GetMyMembershipPlansQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMyMembershipPlansQuery = { myMembershipPlans: Array<{ id: string, userId: string, planType: MembershipPlanType, amount: number | null, note: string | null, startDate: string, endDate: string | null, createdAt: string | null, updatedAt: string | null }> };

export type UpdateMyUserInfoMutationVariables = Exact<{
  input: UpdateMyUserInfoInput;
}>;


export type UpdateMyUserInfoMutation = { updateMyUserInfo: { success: boolean, message: string | null, user: { id: string, uid: string | null, name: string | null, email: string | null, image: string | null, role: UserRole, nickname: string | null, phone: string | null, preferredLocale: string | null, preferredStoreId: string | null, meta: string | null, createdAt: string | null, membershipPlans: Array<{ id: string, userId: string, planType: MembershipPlanType, amount: number | null, note: string | null, startDate: string, endDate: string | null, createdAt: string | null, updatedAt: string | null }> } | null } };

export type UpdateMyPreferencesMutationVariables = Exact<{
  input: UpdatePreferencesInput;
}>;


export type UpdateMyPreferencesMutation = { updateMyPreferences: { id: string, uid: string | null, name: string | null, email: string | null, image: string | null, role: UserRole, nickname: string | null, phone: string | null, preferredLocale: string | null, preferredStoreId: string | null, meta: string | null, createdAt: string | null, membershipPlans: Array<{ id: string, userId: string, planType: MembershipPlanType, amount: number | null, note: string | null, startDate: string, endDate: string | null, createdAt: string | null, updatedAt: string | null }> } };

export type RequestSmsCodeMutationVariables = Exact<{
  input: RequestSmsCodeInput;
}>;


export type RequestSmsCodeMutation = { requestSmsCode: { success: boolean, message: string | null, expiresInMs: number | null } };

export type GetTotpSecretQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTotpSecretQuery = { getTotpSecret: { success: boolean, message: string | null, secret: string | null } };


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
export function useGetActivesQuery(baseOptions?: Apollo.QueryHookOptions<GetActivesQuery, GetActivesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetActivesQuery, GetActivesQueryVariables>(GetActivesDocument, options);
      }
export function useGetActivesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetActivesQuery, GetActivesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetActivesQuery, GetActivesQueryVariables>(GetActivesDocument, options);
        }
// @ts-ignore
export function useGetActivesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetActivesQuery, GetActivesQueryVariables>): Apollo.UseSuspenseQueryResult<GetActivesQuery, GetActivesQueryVariables>;
export function useGetActivesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetActivesQuery, GetActivesQueryVariables>): Apollo.UseSuspenseQueryResult<GetActivesQuery | undefined, GetActivesQueryVariables>;
export function useGetActivesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetActivesQuery, GetActivesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetActivesQuery, GetActivesQueryVariables>(GetActivesDocument, options);
        }
export type GetActivesQueryHookResult = ReturnType<typeof useGetActivesQuery>;
export type GetActivesLazyQueryHookResult = ReturnType<typeof useGetActivesLazyQuery>;
export type GetActivesSuspenseQueryHookResult = ReturnType<typeof useGetActivesSuspenseQuery>;
export type GetActivesQueryResult = Apollo.QueryResult<GetActivesQuery, GetActivesQueryVariables>;
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
export function useGetActiveQuery(baseOptions: Apollo.QueryHookOptions<GetActiveQuery, GetActiveQueryVariables> & ({ variables: GetActiveQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetActiveQuery, GetActiveQueryVariables>(GetActiveDocument, options);
      }
export function useGetActiveLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetActiveQuery, GetActiveQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetActiveQuery, GetActiveQueryVariables>(GetActiveDocument, options);
        }
// @ts-ignore
export function useGetActiveSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetActiveQuery, GetActiveQueryVariables>): Apollo.UseSuspenseQueryResult<GetActiveQuery, GetActiveQueryVariables>;
export function useGetActiveSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetActiveQuery, GetActiveQueryVariables>): Apollo.UseSuspenseQueryResult<GetActiveQuery | undefined, GetActiveQueryVariables>;
export function useGetActiveSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetActiveQuery, GetActiveQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetActiveQuery, GetActiveQueryVariables>(GetActiveDocument, options);
        }
export type GetActiveQueryHookResult = ReturnType<typeof useGetActiveQuery>;
export type GetActiveLazyQueryHookResult = ReturnType<typeof useGetActiveLazyQuery>;
export type GetActiveSuspenseQueryHookResult = ReturnType<typeof useGetActiveSuspenseQuery>;
export type GetActiveQueryResult = Apollo.QueryResult<GetActiveQuery, GetActiveQueryVariables>;
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
export type JoinActiveMutationFn = Apollo.MutationFunction<JoinActiveMutation, JoinActiveMutationVariables>;

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
export function useJoinActiveMutation(baseOptions?: Apollo.MutationHookOptions<JoinActiveMutation, JoinActiveMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<JoinActiveMutation, JoinActiveMutationVariables>(JoinActiveDocument, options);
      }
export type JoinActiveMutationHookResult = ReturnType<typeof useJoinActiveMutation>;
export type JoinActiveMutationResult = Apollo.MutationResult<JoinActiveMutation>;
export type JoinActiveMutationOptions = Apollo.BaseMutationOptions<JoinActiveMutation, JoinActiveMutationVariables>;
export const LeaveActiveDocument = gql`
    mutation LeaveActive($activeId: ID!) {
  leaveActive(activeId: $activeId) {
    id
  }
}
    `;
export type LeaveActiveMutationFn = Apollo.MutationFunction<LeaveActiveMutation, LeaveActiveMutationVariables>;

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
export function useLeaveActiveMutation(baseOptions?: Apollo.MutationHookOptions<LeaveActiveMutation, LeaveActiveMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LeaveActiveMutation, LeaveActiveMutationVariables>(LeaveActiveDocument, options);
      }
export type LeaveActiveMutationHookResult = ReturnType<typeof useLeaveActiveMutation>;
export type LeaveActiveMutationResult = Apollo.MutationResult<LeaveActiveMutation>;
export type LeaveActiveMutationOptions = Apollo.BaseMutationOptions<LeaveActiveMutation, LeaveActiveMutationVariables>;
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
export type WatchActiveMutationFn = Apollo.MutationFunction<WatchActiveMutation, WatchActiveMutationVariables>;

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
export function useWatchActiveMutation(baseOptions?: Apollo.MutationHookOptions<WatchActiveMutation, WatchActiveMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<WatchActiveMutation, WatchActiveMutationVariables>(WatchActiveDocument, options);
      }
export type WatchActiveMutationHookResult = ReturnType<typeof useWatchActiveMutation>;
export type WatchActiveMutationResult = Apollo.MutationResult<WatchActiveMutation>;
export type WatchActiveMutationOptions = Apollo.BaseMutationOptions<WatchActiveMutation, WatchActiveMutationVariables>;
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
export function useGetActiveParticipantsQuery(baseOptions: Apollo.QueryHookOptions<GetActiveParticipantsQuery, GetActiveParticipantsQueryVariables> & ({ variables: GetActiveParticipantsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetActiveParticipantsQuery, GetActiveParticipantsQueryVariables>(GetActiveParticipantsDocument, options);
      }
export function useGetActiveParticipantsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetActiveParticipantsQuery, GetActiveParticipantsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetActiveParticipantsQuery, GetActiveParticipantsQueryVariables>(GetActiveParticipantsDocument, options);
        }
// @ts-ignore
export function useGetActiveParticipantsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetActiveParticipantsQuery, GetActiveParticipantsQueryVariables>): Apollo.UseSuspenseQueryResult<GetActiveParticipantsQuery, GetActiveParticipantsQueryVariables>;
export function useGetActiveParticipantsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetActiveParticipantsQuery, GetActiveParticipantsQueryVariables>): Apollo.UseSuspenseQueryResult<GetActiveParticipantsQuery | undefined, GetActiveParticipantsQueryVariables>;
export function useGetActiveParticipantsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetActiveParticipantsQuery, GetActiveParticipantsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetActiveParticipantsQuery, GetActiveParticipantsQueryVariables>(GetActiveParticipantsDocument, options);
        }
export type GetActiveParticipantsQueryHookResult = ReturnType<typeof useGetActiveParticipantsQuery>;
export type GetActiveParticipantsLazyQueryHookResult = ReturnType<typeof useGetActiveParticipantsLazyQuery>;
export type GetActiveParticipantsSuspenseQueryHookResult = ReturnType<typeof useGetActiveParticipantsSuspenseQuery>;
export type GetActiveParticipantsQueryResult = Apollo.QueryResult<GetActiveParticipantsQuery, GetActiveParticipantsQueryVariables>;
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
export function useActiveParticipantsChangedSubscription(baseOptions: Apollo.SubscriptionHookOptions<ActiveParticipantsChangedSubscription, ActiveParticipantsChangedSubscriptionVariables> & ({ variables: ActiveParticipantsChangedSubscriptionVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<ActiveParticipantsChangedSubscription, ActiveParticipantsChangedSubscriptionVariables>(ActiveParticipantsChangedDocument, options);
      }
export type ActiveParticipantsChangedSubscriptionHookResult = ReturnType<typeof useActiveParticipantsChangedSubscription>;
export type ActiveParticipantsChangedSubscriptionResult = Apollo.SubscriptionResult<ActiveParticipantsChangedSubscription>;
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
export function useGetLeaderboardQuery(baseOptions: Apollo.QueryHookOptions<GetLeaderboardQuery, GetLeaderboardQueryVariables> & ({ variables: GetLeaderboardQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetLeaderboardQuery, GetLeaderboardQueryVariables>(GetLeaderboardDocument, options);
      }
export function useGetLeaderboardLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetLeaderboardQuery, GetLeaderboardQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetLeaderboardQuery, GetLeaderboardQueryVariables>(GetLeaderboardDocument, options);
        }
// @ts-ignore
export function useGetLeaderboardSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetLeaderboardQuery, GetLeaderboardQueryVariables>): Apollo.UseSuspenseQueryResult<GetLeaderboardQuery, GetLeaderboardQueryVariables>;
export function useGetLeaderboardSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLeaderboardQuery, GetLeaderboardQueryVariables>): Apollo.UseSuspenseQueryResult<GetLeaderboardQuery | undefined, GetLeaderboardQueryVariables>;
export function useGetLeaderboardSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetLeaderboardQuery, GetLeaderboardQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetLeaderboardQuery, GetLeaderboardQueryVariables>(GetLeaderboardDocument, options);
        }
export type GetLeaderboardQueryHookResult = ReturnType<typeof useGetLeaderboardQuery>;
export type GetLeaderboardLazyQueryHookResult = ReturnType<typeof useGetLeaderboardLazyQuery>;
export type GetLeaderboardSuspenseQueryHookResult = ReturnType<typeof useGetLeaderboardSuspenseQuery>;
export type GetLeaderboardQueryResult = Apollo.QueryResult<GetLeaderboardQuery, GetLeaderboardQueryVariables>;
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
export function useGetOwnedBoardGameCountQuery(baseOptions?: Apollo.QueryHookOptions<GetOwnedBoardGameCountQuery, GetOwnedBoardGameCountQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetOwnedBoardGameCountQuery, GetOwnedBoardGameCountQueryVariables>(GetOwnedBoardGameCountDocument, options);
      }
export function useGetOwnedBoardGameCountLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetOwnedBoardGameCountQuery, GetOwnedBoardGameCountQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetOwnedBoardGameCountQuery, GetOwnedBoardGameCountQueryVariables>(GetOwnedBoardGameCountDocument, options);
        }
// @ts-ignore
export function useGetOwnedBoardGameCountSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetOwnedBoardGameCountQuery, GetOwnedBoardGameCountQueryVariables>): Apollo.UseSuspenseQueryResult<GetOwnedBoardGameCountQuery, GetOwnedBoardGameCountQueryVariables>;
export function useGetOwnedBoardGameCountSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetOwnedBoardGameCountQuery, GetOwnedBoardGameCountQueryVariables>): Apollo.UseSuspenseQueryResult<GetOwnedBoardGameCountQuery | undefined, GetOwnedBoardGameCountQueryVariables>;
export function useGetOwnedBoardGameCountSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetOwnedBoardGameCountQuery, GetOwnedBoardGameCountQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetOwnedBoardGameCountQuery, GetOwnedBoardGameCountQueryVariables>(GetOwnedBoardGameCountDocument, options);
        }
export type GetOwnedBoardGameCountQueryHookResult = ReturnType<typeof useGetOwnedBoardGameCountQuery>;
export type GetOwnedBoardGameCountLazyQueryHookResult = ReturnType<typeof useGetOwnedBoardGameCountLazyQuery>;
export type GetOwnedBoardGameCountSuspenseQueryHookResult = ReturnType<typeof useGetOwnedBoardGameCountSuspenseQuery>;
export type GetOwnedBoardGameCountQueryResult = Apollo.QueryResult<GetOwnedBoardGameCountQuery, GetOwnedBoardGameCountQueryVariables>;
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
export function useGetOwnedBoardGameQuery(baseOptions: Apollo.QueryHookOptions<GetOwnedBoardGameQuery, GetOwnedBoardGameQueryVariables> & ({ variables: GetOwnedBoardGameQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetOwnedBoardGameQuery, GetOwnedBoardGameQueryVariables>(GetOwnedBoardGameDocument, options);
      }
export function useGetOwnedBoardGameLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetOwnedBoardGameQuery, GetOwnedBoardGameQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetOwnedBoardGameQuery, GetOwnedBoardGameQueryVariables>(GetOwnedBoardGameDocument, options);
        }
// @ts-ignore
export function useGetOwnedBoardGameSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetOwnedBoardGameQuery, GetOwnedBoardGameQueryVariables>): Apollo.UseSuspenseQueryResult<GetOwnedBoardGameQuery, GetOwnedBoardGameQueryVariables>;
export function useGetOwnedBoardGameSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetOwnedBoardGameQuery, GetOwnedBoardGameQueryVariables>): Apollo.UseSuspenseQueryResult<GetOwnedBoardGameQuery | undefined, GetOwnedBoardGameQueryVariables>;
export function useGetOwnedBoardGameSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetOwnedBoardGameQuery, GetOwnedBoardGameQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetOwnedBoardGameQuery, GetOwnedBoardGameQueryVariables>(GetOwnedBoardGameDocument, options);
        }
export type GetOwnedBoardGameQueryHookResult = ReturnType<typeof useGetOwnedBoardGameQuery>;
export type GetOwnedBoardGameLazyQueryHookResult = ReturnType<typeof useGetOwnedBoardGameLazyQuery>;
export type GetOwnedBoardGameSuspenseQueryHookResult = ReturnType<typeof useGetOwnedBoardGameSuspenseQuery>;
export type GetOwnedBoardGameQueryResult = Apollo.QueryResult<GetOwnedBoardGameQuery, GetOwnedBoardGameQueryVariables>;
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
export function useGetOwnedBoardGamesQuery(baseOptions?: Apollo.QueryHookOptions<GetOwnedBoardGamesQuery, GetOwnedBoardGamesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetOwnedBoardGamesQuery, GetOwnedBoardGamesQueryVariables>(GetOwnedBoardGamesDocument, options);
      }
export function useGetOwnedBoardGamesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetOwnedBoardGamesQuery, GetOwnedBoardGamesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetOwnedBoardGamesQuery, GetOwnedBoardGamesQueryVariables>(GetOwnedBoardGamesDocument, options);
        }
// @ts-ignore
export function useGetOwnedBoardGamesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetOwnedBoardGamesQuery, GetOwnedBoardGamesQueryVariables>): Apollo.UseSuspenseQueryResult<GetOwnedBoardGamesQuery, GetOwnedBoardGamesQueryVariables>;
export function useGetOwnedBoardGamesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetOwnedBoardGamesQuery, GetOwnedBoardGamesQueryVariables>): Apollo.UseSuspenseQueryResult<GetOwnedBoardGamesQuery | undefined, GetOwnedBoardGamesQueryVariables>;
export function useGetOwnedBoardGamesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetOwnedBoardGamesQuery, GetOwnedBoardGamesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetOwnedBoardGamesQuery, GetOwnedBoardGamesQueryVariables>(GetOwnedBoardGamesDocument, options);
        }
export type GetOwnedBoardGamesQueryHookResult = ReturnType<typeof useGetOwnedBoardGamesQuery>;
export type GetOwnedBoardGamesLazyQueryHookResult = ReturnType<typeof useGetOwnedBoardGamesLazyQuery>;
export type GetOwnedBoardGamesSuspenseQueryHookResult = ReturnType<typeof useGetOwnedBoardGamesSuspenseQuery>;
export type GetOwnedBoardGamesQueryResult = Apollo.QueryResult<GetOwnedBoardGamesQuery, GetOwnedBoardGamesQueryVariables>;
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
export function useParticipantBusinessCardsQuery(baseOptions: Apollo.QueryHookOptions<ParticipantBusinessCardsQuery, ParticipantBusinessCardsQueryVariables> & ({ variables: ParticipantBusinessCardsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ParticipantBusinessCardsQuery, ParticipantBusinessCardsQueryVariables>(ParticipantBusinessCardsDocument, options);
      }
export function useParticipantBusinessCardsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ParticipantBusinessCardsQuery, ParticipantBusinessCardsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ParticipantBusinessCardsQuery, ParticipantBusinessCardsQueryVariables>(ParticipantBusinessCardsDocument, options);
        }
// @ts-ignore
export function useParticipantBusinessCardsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ParticipantBusinessCardsQuery, ParticipantBusinessCardsQueryVariables>): Apollo.UseSuspenseQueryResult<ParticipantBusinessCardsQuery, ParticipantBusinessCardsQueryVariables>;
export function useParticipantBusinessCardsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ParticipantBusinessCardsQuery, ParticipantBusinessCardsQueryVariables>): Apollo.UseSuspenseQueryResult<ParticipantBusinessCardsQuery | undefined, ParticipantBusinessCardsQueryVariables>;
export function useParticipantBusinessCardsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ParticipantBusinessCardsQuery, ParticipantBusinessCardsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ParticipantBusinessCardsQuery, ParticipantBusinessCardsQueryVariables>(ParticipantBusinessCardsDocument, options);
        }
export type ParticipantBusinessCardsQueryHookResult = ReturnType<typeof useParticipantBusinessCardsQuery>;
export type ParticipantBusinessCardsLazyQueryHookResult = ReturnType<typeof useParticipantBusinessCardsLazyQuery>;
export type ParticipantBusinessCardsSuspenseQueryHookResult = ReturnType<typeof useParticipantBusinessCardsSuspenseQuery>;
export type ParticipantBusinessCardsQueryResult = Apollo.QueryResult<ParticipantBusinessCardsQuery, ParticipantBusinessCardsQueryVariables>;
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
export function useBusinessCardByUserIdQuery(baseOptions: Apollo.QueryHookOptions<BusinessCardByUserIdQuery, BusinessCardByUserIdQueryVariables> & ({ variables: BusinessCardByUserIdQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<BusinessCardByUserIdQuery, BusinessCardByUserIdQueryVariables>(BusinessCardByUserIdDocument, options);
      }
export function useBusinessCardByUserIdLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<BusinessCardByUserIdQuery, BusinessCardByUserIdQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<BusinessCardByUserIdQuery, BusinessCardByUserIdQueryVariables>(BusinessCardByUserIdDocument, options);
        }
// @ts-ignore
export function useBusinessCardByUserIdSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<BusinessCardByUserIdQuery, BusinessCardByUserIdQueryVariables>): Apollo.UseSuspenseQueryResult<BusinessCardByUserIdQuery, BusinessCardByUserIdQueryVariables>;
export function useBusinessCardByUserIdSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<BusinessCardByUserIdQuery, BusinessCardByUserIdQueryVariables>): Apollo.UseSuspenseQueryResult<BusinessCardByUserIdQuery | undefined, BusinessCardByUserIdQueryVariables>;
export function useBusinessCardByUserIdSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<BusinessCardByUserIdQuery, BusinessCardByUserIdQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<BusinessCardByUserIdQuery, BusinessCardByUserIdQueryVariables>(BusinessCardByUserIdDocument, options);
        }
export type BusinessCardByUserIdQueryHookResult = ReturnType<typeof useBusinessCardByUserIdQuery>;
export type BusinessCardByUserIdLazyQueryHookResult = ReturnType<typeof useBusinessCardByUserIdLazyQuery>;
export type BusinessCardByUserIdSuspenseQueryHookResult = ReturnType<typeof useBusinessCardByUserIdSuspenseQuery>;
export type BusinessCardByUserIdQueryResult = Apollo.QueryResult<BusinessCardByUserIdQuery, BusinessCardByUserIdQueryVariables>;
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
export type CreateActiveMutationFn = Apollo.MutationFunction<CreateActiveMutation, CreateActiveMutationVariables>;

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
export function useCreateActiveMutation(baseOptions?: Apollo.MutationHookOptions<CreateActiveMutation, CreateActiveMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateActiveMutation, CreateActiveMutationVariables>(CreateActiveDocument, options);
      }
export type CreateActiveMutationHookResult = ReturnType<typeof useCreateActiveMutation>;
export type CreateActiveMutationResult = Apollo.MutationResult<CreateActiveMutation>;
export type CreateActiveMutationOptions = Apollo.BaseMutationOptions<CreateActiveMutation, CreateActiveMutationVariables>;
export const ManagedActivesDocument = gql`
    query ManagedActives {
  managedActives {
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
 *   },
 * });
 */
export function useManagedActivesQuery(baseOptions?: Apollo.QueryHookOptions<ManagedActivesQuery, ManagedActivesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ManagedActivesQuery, ManagedActivesQueryVariables>(ManagedActivesDocument, options);
      }
export function useManagedActivesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ManagedActivesQuery, ManagedActivesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ManagedActivesQuery, ManagedActivesQueryVariables>(ManagedActivesDocument, options);
        }
// @ts-ignore
export function useManagedActivesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ManagedActivesQuery, ManagedActivesQueryVariables>): Apollo.UseSuspenseQueryResult<ManagedActivesQuery, ManagedActivesQueryVariables>;
export function useManagedActivesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ManagedActivesQuery, ManagedActivesQueryVariables>): Apollo.UseSuspenseQueryResult<ManagedActivesQuery | undefined, ManagedActivesQueryVariables>;
export function useManagedActivesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ManagedActivesQuery, ManagedActivesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ManagedActivesQuery, ManagedActivesQueryVariables>(ManagedActivesDocument, options);
        }
export type ManagedActivesQueryHookResult = ReturnType<typeof useManagedActivesQuery>;
export type ManagedActivesLazyQueryHookResult = ReturnType<typeof useManagedActivesLazyQuery>;
export type ManagedActivesSuspenseQueryHookResult = ReturnType<typeof useManagedActivesSuspenseQuery>;
export type ManagedActivesQueryResult = Apollo.QueryResult<ManagedActivesQuery, ManagedActivesQueryVariables>;
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
export function useManagedActiveQuery(baseOptions: Apollo.QueryHookOptions<ManagedActiveQuery, ManagedActiveQueryVariables> & ({ variables: ManagedActiveQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ManagedActiveQuery, ManagedActiveQueryVariables>(ManagedActiveDocument, options);
      }
export function useManagedActiveLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ManagedActiveQuery, ManagedActiveQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ManagedActiveQuery, ManagedActiveQueryVariables>(ManagedActiveDocument, options);
        }
// @ts-ignore
export function useManagedActiveSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ManagedActiveQuery, ManagedActiveQueryVariables>): Apollo.UseSuspenseQueryResult<ManagedActiveQuery, ManagedActiveQueryVariables>;
export function useManagedActiveSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ManagedActiveQuery, ManagedActiveQueryVariables>): Apollo.UseSuspenseQueryResult<ManagedActiveQuery | undefined, ManagedActiveQueryVariables>;
export function useManagedActiveSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ManagedActiveQuery, ManagedActiveQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ManagedActiveQuery, ManagedActiveQueryVariables>(ManagedActiveDocument, options);
        }
export type ManagedActiveQueryHookResult = ReturnType<typeof useManagedActiveQuery>;
export type ManagedActiveLazyQueryHookResult = ReturnType<typeof useManagedActiveLazyQuery>;
export type ManagedActiveSuspenseQueryHookResult = ReturnType<typeof useManagedActiveSuspenseQuery>;
export type ManagedActiveQueryResult = Apollo.QueryResult<ManagedActiveQuery, ManagedActiveQueryVariables>;
export const RemoveActiveDocument = gql`
    mutation RemoveActive($id: ID!) {
  removeActive(id: $id) {
    id
  }
}
    `;
export type RemoveActiveMutationFn = Apollo.MutationFunction<RemoveActiveMutation, RemoveActiveMutationVariables>;

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
export function useRemoveActiveMutation(baseOptions?: Apollo.MutationHookOptions<RemoveActiveMutation, RemoveActiveMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveActiveMutation, RemoveActiveMutationVariables>(RemoveActiveDocument, options);
      }
export type RemoveActiveMutationHookResult = ReturnType<typeof useRemoveActiveMutation>;
export type RemoveActiveMutationResult = Apollo.MutationResult<RemoveActiveMutation>;
export type RemoveActiveMutationOptions = Apollo.BaseMutationOptions<RemoveActiveMutation, RemoveActiveMutationVariables>;
export const BatchRemoveActivesDocument = gql`
    mutation BatchRemoveActives($ids: [ID!]!) {
  batchRemoveActives(ids: $ids) {
    id
  }
}
    `;
export type BatchRemoveActivesMutationFn = Apollo.MutationFunction<BatchRemoveActivesMutation, BatchRemoveActivesMutationVariables>;

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
export function useBatchRemoveActivesMutation(baseOptions?: Apollo.MutationHookOptions<BatchRemoveActivesMutation, BatchRemoveActivesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<BatchRemoveActivesMutation, BatchRemoveActivesMutationVariables>(BatchRemoveActivesDocument, options);
      }
export type BatchRemoveActivesMutationHookResult = ReturnType<typeof useBatchRemoveActivesMutation>;
export type BatchRemoveActivesMutationResult = Apollo.MutationResult<BatchRemoveActivesMutation>;
export type BatchRemoveActivesMutationOptions = Apollo.BaseMutationOptions<BatchRemoveActivesMutation, BatchRemoveActivesMutationVariables>;
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
export type UpdateActiveMutationFn = Apollo.MutationFunction<UpdateActiveMutation, UpdateActiveMutationVariables>;

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
export function useUpdateActiveMutation(baseOptions?: Apollo.MutationHookOptions<UpdateActiveMutation, UpdateActiveMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateActiveMutation, UpdateActiveMutationVariables>(UpdateActiveDocument, options);
      }
export type UpdateActiveMutationHookResult = ReturnType<typeof useUpdateActiveMutation>;
export type UpdateActiveMutationResult = Apollo.MutationResult<UpdateActiveMutation>;
export type UpdateActiveMutationOptions = Apollo.BaseMutationOptions<UpdateActiveMutation, UpdateActiveMutationVariables>;
export const RemoveActiveRegistrationDocument = gql`
    mutation RemoveActiveRegistration($registrationId: ID!) {
  removeActiveRegistration(registrationId: $registrationId) {
    id
  }
}
    `;
export type RemoveActiveRegistrationMutationFn = Apollo.MutationFunction<RemoveActiveRegistrationMutation, RemoveActiveRegistrationMutationVariables>;

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
export function useRemoveActiveRegistrationMutation(baseOptions?: Apollo.MutationHookOptions<RemoveActiveRegistrationMutation, RemoveActiveRegistrationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveActiveRegistrationMutation, RemoveActiveRegistrationMutationVariables>(RemoveActiveRegistrationDocument, options);
      }
export type RemoveActiveRegistrationMutationHookResult = ReturnType<typeof useRemoveActiveRegistrationMutation>;
export type RemoveActiveRegistrationMutationResult = Apollo.MutationResult<RemoveActiveRegistrationMutation>;
export type RemoveActiveRegistrationMutationOptions = Apollo.BaseMutationOptions<RemoveActiveRegistrationMutation, RemoveActiveRegistrationMutationVariables>;
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
export function useCrawlerStatsQuery(baseOptions?: Apollo.QueryHookOptions<CrawlerStatsQuery, CrawlerStatsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CrawlerStatsQuery, CrawlerStatsQueryVariables>(CrawlerStatsDocument, options);
      }
export function useCrawlerStatsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CrawlerStatsQuery, CrawlerStatsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CrawlerStatsQuery, CrawlerStatsQueryVariables>(CrawlerStatsDocument, options);
        }
// @ts-ignore
export function useCrawlerStatsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CrawlerStatsQuery, CrawlerStatsQueryVariables>): Apollo.UseSuspenseQueryResult<CrawlerStatsQuery, CrawlerStatsQueryVariables>;
export function useCrawlerStatsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CrawlerStatsQuery, CrawlerStatsQueryVariables>): Apollo.UseSuspenseQueryResult<CrawlerStatsQuery | undefined, CrawlerStatsQueryVariables>;
export function useCrawlerStatsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CrawlerStatsQuery, CrawlerStatsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CrawlerStatsQuery, CrawlerStatsQueryVariables>(CrawlerStatsDocument, options);
        }
export type CrawlerStatsQueryHookResult = ReturnType<typeof useCrawlerStatsQuery>;
export type CrawlerStatsLazyQueryHookResult = ReturnType<typeof useCrawlerStatsLazyQuery>;
export type CrawlerStatsSuspenseQueryHookResult = ReturnType<typeof useCrawlerStatsSuspenseQuery>;
export type CrawlerStatsQueryResult = Apollo.QueryResult<CrawlerStatsQuery, CrawlerStatsQueryVariables>;
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
export function useCrawlerErrorsQuery(baseOptions?: Apollo.QueryHookOptions<CrawlerErrorsQuery, CrawlerErrorsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CrawlerErrorsQuery, CrawlerErrorsQueryVariables>(CrawlerErrorsDocument, options);
      }
export function useCrawlerErrorsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CrawlerErrorsQuery, CrawlerErrorsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CrawlerErrorsQuery, CrawlerErrorsQueryVariables>(CrawlerErrorsDocument, options);
        }
// @ts-ignore
export function useCrawlerErrorsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CrawlerErrorsQuery, CrawlerErrorsQueryVariables>): Apollo.UseSuspenseQueryResult<CrawlerErrorsQuery, CrawlerErrorsQueryVariables>;
export function useCrawlerErrorsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CrawlerErrorsQuery, CrawlerErrorsQueryVariables>): Apollo.UseSuspenseQueryResult<CrawlerErrorsQuery | undefined, CrawlerErrorsQueryVariables>;
export function useCrawlerErrorsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CrawlerErrorsQuery, CrawlerErrorsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CrawlerErrorsQuery, CrawlerErrorsQueryVariables>(CrawlerErrorsDocument, options);
        }
export type CrawlerErrorsQueryHookResult = ReturnType<typeof useCrawlerErrorsQuery>;
export type CrawlerErrorsLazyQueryHookResult = ReturnType<typeof useCrawlerErrorsLazyQuery>;
export type CrawlerErrorsSuspenseQueryHookResult = ReturnType<typeof useCrawlerErrorsSuspenseQuery>;
export type CrawlerErrorsQueryResult = Apollo.QueryResult<CrawlerErrorsQuery, CrawlerErrorsQueryVariables>;
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
export type ResetCrawlerErrorsMutationFn = Apollo.MutationFunction<ResetCrawlerErrorsMutation, ResetCrawlerErrorsMutationVariables>;

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
export function useResetCrawlerErrorsMutation(baseOptions?: Apollo.MutationHookOptions<ResetCrawlerErrorsMutation, ResetCrawlerErrorsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResetCrawlerErrorsMutation, ResetCrawlerErrorsMutationVariables>(ResetCrawlerErrorsDocument, options);
      }
export type ResetCrawlerErrorsMutationHookResult = ReturnType<typeof useResetCrawlerErrorsMutation>;
export type ResetCrawlerErrorsMutationResult = Apollo.MutationResult<ResetCrawlerErrorsMutation>;
export type ResetCrawlerErrorsMutationOptions = Apollo.BaseMutationOptions<ResetCrawlerErrorsMutation, ResetCrawlerErrorsMutationVariables>;
export const ManagedEventsDocument = gql`
    query ManagedEvents {
  managedEvents {
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
 *   },
 * });
 */
export function useManagedEventsQuery(baseOptions?: Apollo.QueryHookOptions<ManagedEventsQuery, ManagedEventsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ManagedEventsQuery, ManagedEventsQueryVariables>(ManagedEventsDocument, options);
      }
export function useManagedEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ManagedEventsQuery, ManagedEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ManagedEventsQuery, ManagedEventsQueryVariables>(ManagedEventsDocument, options);
        }
// @ts-ignore
export function useManagedEventsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ManagedEventsQuery, ManagedEventsQueryVariables>): Apollo.UseSuspenseQueryResult<ManagedEventsQuery, ManagedEventsQueryVariables>;
export function useManagedEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ManagedEventsQuery, ManagedEventsQueryVariables>): Apollo.UseSuspenseQueryResult<ManagedEventsQuery | undefined, ManagedEventsQueryVariables>;
export function useManagedEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ManagedEventsQuery, ManagedEventsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ManagedEventsQuery, ManagedEventsQueryVariables>(ManagedEventsDocument, options);
        }
export type ManagedEventsQueryHookResult = ReturnType<typeof useManagedEventsQuery>;
export type ManagedEventsLazyQueryHookResult = ReturnType<typeof useManagedEventsLazyQuery>;
export type ManagedEventsSuspenseQueryHookResult = ReturnType<typeof useManagedEventsSuspenseQuery>;
export type ManagedEventsQueryResult = Apollo.QueryResult<ManagedEventsQuery, ManagedEventsQueryVariables>;
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
export function useManagedEventQuery(baseOptions: Apollo.QueryHookOptions<ManagedEventQuery, ManagedEventQueryVariables> & ({ variables: ManagedEventQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ManagedEventQuery, ManagedEventQueryVariables>(ManagedEventDocument, options);
      }
export function useManagedEventLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ManagedEventQuery, ManagedEventQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ManagedEventQuery, ManagedEventQueryVariables>(ManagedEventDocument, options);
        }
// @ts-ignore
export function useManagedEventSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ManagedEventQuery, ManagedEventQueryVariables>): Apollo.UseSuspenseQueryResult<ManagedEventQuery, ManagedEventQueryVariables>;
export function useManagedEventSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ManagedEventQuery, ManagedEventQueryVariables>): Apollo.UseSuspenseQueryResult<ManagedEventQuery | undefined, ManagedEventQueryVariables>;
export function useManagedEventSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ManagedEventQuery, ManagedEventQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ManagedEventQuery, ManagedEventQueryVariables>(ManagedEventDocument, options);
        }
export type ManagedEventQueryHookResult = ReturnType<typeof useManagedEventQuery>;
export type ManagedEventLazyQueryHookResult = ReturnType<typeof useManagedEventLazyQuery>;
export type ManagedEventSuspenseQueryHookResult = ReturnType<typeof useManagedEventSuspenseQuery>;
export type ManagedEventQueryResult = Apollo.QueryResult<ManagedEventQuery, ManagedEventQueryVariables>;
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
export type CreateEventMutationFn = Apollo.MutationFunction<CreateEventMutation, CreateEventMutationVariables>;

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
export function useCreateEventMutation(baseOptions?: Apollo.MutationHookOptions<CreateEventMutation, CreateEventMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateEventMutation, CreateEventMutationVariables>(CreateEventDocument, options);
      }
export type CreateEventMutationHookResult = ReturnType<typeof useCreateEventMutation>;
export type CreateEventMutationResult = Apollo.MutationResult<CreateEventMutation>;
export type CreateEventMutationOptions = Apollo.BaseMutationOptions<CreateEventMutation, CreateEventMutationVariables>;
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
export type UpdateEventMutationFn = Apollo.MutationFunction<UpdateEventMutation, UpdateEventMutationVariables>;

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
export function useUpdateEventMutation(baseOptions?: Apollo.MutationHookOptions<UpdateEventMutation, UpdateEventMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateEventMutation, UpdateEventMutationVariables>(UpdateEventDocument, options);
      }
export type UpdateEventMutationHookResult = ReturnType<typeof useUpdateEventMutation>;
export type UpdateEventMutationResult = Apollo.MutationResult<UpdateEventMutation>;
export type UpdateEventMutationOptions = Apollo.BaseMutationOptions<UpdateEventMutation, UpdateEventMutationVariables>;
export const RemoveEventDocument = gql`
    mutation RemoveEvent($id: ID!) {
  removeEvent(id: $id) {
    id
  }
}
    `;
export type RemoveEventMutationFn = Apollo.MutationFunction<RemoveEventMutation, RemoveEventMutationVariables>;

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
export function useRemoveEventMutation(baseOptions?: Apollo.MutationHookOptions<RemoveEventMutation, RemoveEventMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveEventMutation, RemoveEventMutationVariables>(RemoveEventDocument, options);
      }
export type RemoveEventMutationHookResult = ReturnType<typeof useRemoveEventMutation>;
export type RemoveEventMutationResult = Apollo.MutationResult<RemoveEventMutation>;
export type RemoveEventMutationOptions = Apollo.BaseMutationOptions<RemoveEventMutation, RemoveEventMutationVariables>;
export const ToggleEventPublishDocument = gql`
    mutation ToggleEventPublish($id: ID!) {
  toggleEventPublish(id: $id) {
    id
    isPublished
  }
}
    `;
export type ToggleEventPublishMutationFn = Apollo.MutationFunction<ToggleEventPublishMutation, ToggleEventPublishMutationVariables>;

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
export function useToggleEventPublishMutation(baseOptions?: Apollo.MutationHookOptions<ToggleEventPublishMutation, ToggleEventPublishMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ToggleEventPublishMutation, ToggleEventPublishMutationVariables>(ToggleEventPublishDocument, options);
      }
export type ToggleEventPublishMutationHookResult = ReturnType<typeof useToggleEventPublishMutation>;
export type ToggleEventPublishMutationResult = Apollo.MutationResult<ToggleEventPublishMutation>;
export type ToggleEventPublishMutationOptions = Apollo.BaseMutationOptions<ToggleEventPublishMutation, ToggleEventPublishMutationVariables>;
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
export function useMahjongMatchQuery(baseOptions: Apollo.QueryHookOptions<MahjongMatchQuery, MahjongMatchQueryVariables> & ({ variables: MahjongMatchQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MahjongMatchQuery, MahjongMatchQueryVariables>(MahjongMatchDocument, options);
      }
export function useMahjongMatchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MahjongMatchQuery, MahjongMatchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MahjongMatchQuery, MahjongMatchQueryVariables>(MahjongMatchDocument, options);
        }
// @ts-ignore
export function useMahjongMatchSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MahjongMatchQuery, MahjongMatchQueryVariables>): Apollo.UseSuspenseQueryResult<MahjongMatchQuery, MahjongMatchQueryVariables>;
export function useMahjongMatchSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MahjongMatchQuery, MahjongMatchQueryVariables>): Apollo.UseSuspenseQueryResult<MahjongMatchQuery | undefined, MahjongMatchQueryVariables>;
export function useMahjongMatchSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MahjongMatchQuery, MahjongMatchQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MahjongMatchQuery, MahjongMatchQueryVariables>(MahjongMatchDocument, options);
        }
export type MahjongMatchQueryHookResult = ReturnType<typeof useMahjongMatchQuery>;
export type MahjongMatchLazyQueryHookResult = ReturnType<typeof useMahjongMatchLazyQuery>;
export type MahjongMatchSuspenseQueryHookResult = ReturnType<typeof useMahjongMatchSuspenseQuery>;
export type MahjongMatchQueryResult = Apollo.QueryResult<MahjongMatchQuery, MahjongMatchQueryVariables>;
export const TerminateMahjongMatchDocument = gql`
    mutation TerminateMahjongMatch($tableCode: String!, $reason: MahjongTerminationReason) {
  terminateMahjongMatch(tableCode: $tableCode, reason: $reason) {
    id
    terminatedAt: endedAt
    terminationReason
  }
}
    `;
export type TerminateMahjongMatchMutationFn = Apollo.MutationFunction<TerminateMahjongMatchMutation, TerminateMahjongMatchMutationVariables>;

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
export function useTerminateMahjongMatchMutation(baseOptions?: Apollo.MutationHookOptions<TerminateMahjongMatchMutation, TerminateMahjongMatchMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<TerminateMahjongMatchMutation, TerminateMahjongMatchMutationVariables>(TerminateMahjongMatchDocument, options);
      }
export type TerminateMahjongMatchMutationHookResult = ReturnType<typeof useTerminateMahjongMatchMutation>;
export type TerminateMahjongMatchMutationResult = Apollo.MutationResult<TerminateMahjongMatchMutation>;
export type TerminateMahjongMatchMutationOptions = Apollo.BaseMutationOptions<TerminateMahjongMatchMutation, TerminateMahjongMatchMutationVariables>;
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
export type UpdateMahjongScoreMutationFn = Apollo.MutationFunction<UpdateMahjongScoreMutation, UpdateMahjongScoreMutationVariables>;

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
export function useUpdateMahjongScoreMutation(baseOptions?: Apollo.MutationHookOptions<UpdateMahjongScoreMutation, UpdateMahjongScoreMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateMahjongScoreMutation, UpdateMahjongScoreMutationVariables>(UpdateMahjongScoreDocument, options);
      }
export type UpdateMahjongScoreMutationHookResult = ReturnType<typeof useUpdateMahjongScoreMutation>;
export type UpdateMahjongScoreMutationResult = Apollo.MutationResult<UpdateMahjongScoreMutation>;
export type UpdateMahjongScoreMutationOptions = Apollo.BaseMutationOptions<UpdateMahjongScoreMutation, UpdateMahjongScoreMutationVariables>;
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
export type SyncMahjongMatchToGszMutationFn = Apollo.MutationFunction<SyncMahjongMatchToGszMutation, SyncMahjongMatchToGszMutationVariables>;

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
export function useSyncMahjongMatchToGszMutation(baseOptions?: Apollo.MutationHookOptions<SyncMahjongMatchToGszMutation, SyncMahjongMatchToGszMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SyncMahjongMatchToGszMutation, SyncMahjongMatchToGszMutationVariables>(SyncMahjongMatchToGszDocument, options);
      }
export type SyncMahjongMatchToGszMutationHookResult = ReturnType<typeof useSyncMahjongMatchToGszMutation>;
export type SyncMahjongMatchToGszMutationResult = Apollo.MutationResult<SyncMahjongMatchToGszMutation>;
export type SyncMahjongMatchToGszMutationOptions = Apollo.BaseMutationOptions<SyncMahjongMatchToGszMutation, SyncMahjongMatchToGszMutationVariables>;
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
export type BatchSyncMahjongMatchesToGszMutationFn = Apollo.MutationFunction<BatchSyncMahjongMatchesToGszMutation, BatchSyncMahjongMatchesToGszMutationVariables>;

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
export function useBatchSyncMahjongMatchesToGszMutation(baseOptions?: Apollo.MutationHookOptions<BatchSyncMahjongMatchesToGszMutation, BatchSyncMahjongMatchesToGszMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<BatchSyncMahjongMatchesToGszMutation, BatchSyncMahjongMatchesToGszMutationVariables>(BatchSyncMahjongMatchesToGszDocument, options);
      }
export type BatchSyncMahjongMatchesToGszMutationHookResult = ReturnType<typeof useBatchSyncMahjongMatchesToGszMutation>;
export type BatchSyncMahjongMatchesToGszMutationResult = Apollo.MutationResult<BatchSyncMahjongMatchesToGszMutation>;
export type BatchSyncMahjongMatchesToGszMutationOptions = Apollo.BaseMutationOptions<BatchSyncMahjongMatchesToGszMutation, BatchSyncMahjongMatchesToGszMutationVariables>;
export const ManagedMahjongMatchesDocument = gql`
    query ManagedMahjongMatches($input: MahjongManagementListInput) {
  managedMahjongMatches(input: $input) {
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
 *      input: // value for 'input'
 *   },
 * });
 */
export function useManagedMahjongMatchesQuery(baseOptions?: Apollo.QueryHookOptions<ManagedMahjongMatchesQuery, ManagedMahjongMatchesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ManagedMahjongMatchesQuery, ManagedMahjongMatchesQueryVariables>(ManagedMahjongMatchesDocument, options);
      }
export function useManagedMahjongMatchesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ManagedMahjongMatchesQuery, ManagedMahjongMatchesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ManagedMahjongMatchesQuery, ManagedMahjongMatchesQueryVariables>(ManagedMahjongMatchesDocument, options);
        }
// @ts-ignore
export function useManagedMahjongMatchesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ManagedMahjongMatchesQuery, ManagedMahjongMatchesQueryVariables>): Apollo.UseSuspenseQueryResult<ManagedMahjongMatchesQuery, ManagedMahjongMatchesQueryVariables>;
export function useManagedMahjongMatchesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ManagedMahjongMatchesQuery, ManagedMahjongMatchesQueryVariables>): Apollo.UseSuspenseQueryResult<ManagedMahjongMatchesQuery | undefined, ManagedMahjongMatchesQueryVariables>;
export function useManagedMahjongMatchesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ManagedMahjongMatchesQuery, ManagedMahjongMatchesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ManagedMahjongMatchesQuery, ManagedMahjongMatchesQueryVariables>(ManagedMahjongMatchesDocument, options);
        }
export type ManagedMahjongMatchesQueryHookResult = ReturnType<typeof useManagedMahjongMatchesQuery>;
export type ManagedMahjongMatchesLazyQueryHookResult = ReturnType<typeof useManagedMahjongMatchesLazyQuery>;
export type ManagedMahjongMatchesSuspenseQueryHookResult = ReturnType<typeof useManagedMahjongMatchesSuspenseQuery>;
export type ManagedMahjongMatchesQueryResult = Apollo.QueryResult<ManagedMahjongMatchesQuery, ManagedMahjongMatchesQueryVariables>;
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
export function useActiveMahjongMatchesQuery(baseOptions?: Apollo.QueryHookOptions<ActiveMahjongMatchesQuery, ActiveMahjongMatchesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ActiveMahjongMatchesQuery, ActiveMahjongMatchesQueryVariables>(ActiveMahjongMatchesDocument, options);
      }
export function useActiveMahjongMatchesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ActiveMahjongMatchesQuery, ActiveMahjongMatchesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ActiveMahjongMatchesQuery, ActiveMahjongMatchesQueryVariables>(ActiveMahjongMatchesDocument, options);
        }
// @ts-ignore
export function useActiveMahjongMatchesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ActiveMahjongMatchesQuery, ActiveMahjongMatchesQueryVariables>): Apollo.UseSuspenseQueryResult<ActiveMahjongMatchesQuery, ActiveMahjongMatchesQueryVariables>;
export function useActiveMahjongMatchesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ActiveMahjongMatchesQuery, ActiveMahjongMatchesQueryVariables>): Apollo.UseSuspenseQueryResult<ActiveMahjongMatchesQuery | undefined, ActiveMahjongMatchesQueryVariables>;
export function useActiveMahjongMatchesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ActiveMahjongMatchesQuery, ActiveMahjongMatchesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ActiveMahjongMatchesQuery, ActiveMahjongMatchesQueryVariables>(ActiveMahjongMatchesDocument, options);
        }
export type ActiveMahjongMatchesQueryHookResult = ReturnType<typeof useActiveMahjongMatchesQuery>;
export type ActiveMahjongMatchesLazyQueryHookResult = ReturnType<typeof useActiveMahjongMatchesLazyQuery>;
export type ActiveMahjongMatchesSuspenseQueryHookResult = ReturnType<typeof useActiveMahjongMatchesSuspenseQuery>;
export type ActiveMahjongMatchesQueryResult = Apollo.QueryResult<ActiveMahjongMatchesQuery, ActiveMahjongMatchesQueryVariables>;
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
export function useMahjongTablesQuery(baseOptions?: Apollo.QueryHookOptions<MahjongTablesQuery, MahjongTablesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MahjongTablesQuery, MahjongTablesQueryVariables>(MahjongTablesDocument, options);
      }
export function useMahjongTablesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MahjongTablesQuery, MahjongTablesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MahjongTablesQuery, MahjongTablesQueryVariables>(MahjongTablesDocument, options);
        }
// @ts-ignore
export function useMahjongTablesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MahjongTablesQuery, MahjongTablesQueryVariables>): Apollo.UseSuspenseQueryResult<MahjongTablesQuery, MahjongTablesQueryVariables>;
export function useMahjongTablesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MahjongTablesQuery, MahjongTablesQueryVariables>): Apollo.UseSuspenseQueryResult<MahjongTablesQuery | undefined, MahjongTablesQueryVariables>;
export function useMahjongTablesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MahjongTablesQuery, MahjongTablesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MahjongTablesQuery, MahjongTablesQueryVariables>(MahjongTablesDocument, options);
        }
export type MahjongTablesQueryHookResult = ReturnType<typeof useMahjongTablesQuery>;
export type MahjongTablesLazyQueryHookResult = ReturnType<typeof useMahjongTablesLazyQuery>;
export type MahjongTablesSuspenseQueryHookResult = ReturnType<typeof useMahjongTablesSuspenseQuery>;
export type MahjongTablesQueryResult = Apollo.QueryResult<MahjongTablesQuery, MahjongTablesQueryVariables>;
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
export function useMediaObjectsQuery(baseOptions?: Apollo.QueryHookOptions<MediaObjectsQuery, MediaObjectsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MediaObjectsQuery, MediaObjectsQueryVariables>(MediaObjectsDocument, options);
      }
export function useMediaObjectsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MediaObjectsQuery, MediaObjectsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MediaObjectsQuery, MediaObjectsQueryVariables>(MediaObjectsDocument, options);
        }
// @ts-ignore
export function useMediaObjectsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MediaObjectsQuery, MediaObjectsQueryVariables>): Apollo.UseSuspenseQueryResult<MediaObjectsQuery, MediaObjectsQueryVariables>;
export function useMediaObjectsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MediaObjectsQuery, MediaObjectsQueryVariables>): Apollo.UseSuspenseQueryResult<MediaObjectsQuery | undefined, MediaObjectsQueryVariables>;
export function useMediaObjectsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MediaObjectsQuery, MediaObjectsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MediaObjectsQuery, MediaObjectsQueryVariables>(MediaObjectsDocument, options);
        }
export type MediaObjectsQueryHookResult = ReturnType<typeof useMediaObjectsQuery>;
export type MediaObjectsLazyQueryHookResult = ReturnType<typeof useMediaObjectsLazyQuery>;
export type MediaObjectsSuspenseQueryHookResult = ReturnType<typeof useMediaObjectsSuspenseQuery>;
export type MediaObjectsQueryResult = Apollo.QueryResult<MediaObjectsQuery, MediaObjectsQueryVariables>;
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
export type RenameMediaObjectMutationFn = Apollo.MutationFunction<RenameMediaObjectMutation, RenameMediaObjectMutationVariables>;

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
export function useRenameMediaObjectMutation(baseOptions?: Apollo.MutationHookOptions<RenameMediaObjectMutation, RenameMediaObjectMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RenameMediaObjectMutation, RenameMediaObjectMutationVariables>(RenameMediaObjectDocument, options);
      }
export type RenameMediaObjectMutationHookResult = ReturnType<typeof useRenameMediaObjectMutation>;
export type RenameMediaObjectMutationResult = Apollo.MutationResult<RenameMediaObjectMutation>;
export type RenameMediaObjectMutationOptions = Apollo.BaseMutationOptions<RenameMediaObjectMutation, RenameMediaObjectMutationVariables>;
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
export type RemoveMediaObjectMutationFn = Apollo.MutationFunction<RemoveMediaObjectMutation, RemoveMediaObjectMutationVariables>;

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
export function useRemoveMediaObjectMutation(baseOptions?: Apollo.MutationHookOptions<RemoveMediaObjectMutation, RemoveMediaObjectMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveMediaObjectMutation, RemoveMediaObjectMutationVariables>(RemoveMediaObjectDocument, options);
      }
export type RemoveMediaObjectMutationHookResult = ReturnType<typeof useRemoveMediaObjectMutation>;
export type RemoveMediaObjectMutationResult = Apollo.MutationResult<RemoveMediaObjectMutation>;
export type RemoveMediaObjectMutationOptions = Apollo.BaseMutationOptions<RemoveMediaObjectMutation, RemoveMediaObjectMutationVariables>;
export const OrdersDocument = gql`
    query Orders($input: OrderListInput = {}) {
  orders(input: $input) {
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
 *   },
 * });
 */
export function useOrdersQuery(baseOptions?: Apollo.QueryHookOptions<OrdersQuery, OrdersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<OrdersQuery, OrdersQueryVariables>(OrdersDocument, options);
      }
export function useOrdersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<OrdersQuery, OrdersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<OrdersQuery, OrdersQueryVariables>(OrdersDocument, options);
        }
// @ts-ignore
export function useOrdersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<OrdersQuery, OrdersQueryVariables>): Apollo.UseSuspenseQueryResult<OrdersQuery, OrdersQueryVariables>;
export function useOrdersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<OrdersQuery, OrdersQueryVariables>): Apollo.UseSuspenseQueryResult<OrdersQuery | undefined, OrdersQueryVariables>;
export function useOrdersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<OrdersQuery, OrdersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<OrdersQuery, OrdersQueryVariables>(OrdersDocument, options);
        }
export type OrdersQueryHookResult = ReturnType<typeof useOrdersQuery>;
export type OrdersLazyQueryHookResult = ReturnType<typeof useOrdersLazyQuery>;
export type OrdersSuspenseQueryHookResult = ReturnType<typeof useOrdersSuspenseQuery>;
export type OrdersQueryResult = Apollo.QueryResult<OrdersQuery, OrdersQueryVariables>;
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
export function useOrderQuery(baseOptions: Apollo.QueryHookOptions<OrderQuery, OrderQueryVariables> & ({ variables: OrderQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<OrderQuery, OrderQueryVariables>(OrderDocument, options);
      }
export function useOrderLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<OrderQuery, OrderQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<OrderQuery, OrderQueryVariables>(OrderDocument, options);
        }
// @ts-ignore
export function useOrderSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<OrderQuery, OrderQueryVariables>): Apollo.UseSuspenseQueryResult<OrderQuery, OrderQueryVariables>;
export function useOrderSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<OrderQuery, OrderQueryVariables>): Apollo.UseSuspenseQueryResult<OrderQuery | undefined, OrderQueryVariables>;
export function useOrderSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<OrderQuery, OrderQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<OrderQuery, OrderQueryVariables>(OrderDocument, options);
        }
export type OrderQueryHookResult = ReturnType<typeof useOrderQuery>;
export type OrderLazyQueryHookResult = ReturnType<typeof useOrderLazyQuery>;
export type OrderSuspenseQueryHookResult = ReturnType<typeof useOrderSuspenseQuery>;
export type OrderQueryResult = Apollo.QueryResult<OrderQuery, OrderQueryVariables>;
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
export function useSettlementPreviewQuery(baseOptions: Apollo.QueryHookOptions<SettlementPreviewQuery, SettlementPreviewQueryVariables> & ({ variables: SettlementPreviewQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SettlementPreviewQuery, SettlementPreviewQueryVariables>(SettlementPreviewDocument, options);
      }
export function useSettlementPreviewLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SettlementPreviewQuery, SettlementPreviewQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SettlementPreviewQuery, SettlementPreviewQueryVariables>(SettlementPreviewDocument, options);
        }
// @ts-ignore
export function useSettlementPreviewSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<SettlementPreviewQuery, SettlementPreviewQueryVariables>): Apollo.UseSuspenseQueryResult<SettlementPreviewQuery, SettlementPreviewQueryVariables>;
export function useSettlementPreviewSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SettlementPreviewQuery, SettlementPreviewQueryVariables>): Apollo.UseSuspenseQueryResult<SettlementPreviewQuery | undefined, SettlementPreviewQueryVariables>;
export function useSettlementPreviewSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<SettlementPreviewQuery, SettlementPreviewQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<SettlementPreviewQuery, SettlementPreviewQueryVariables>(SettlementPreviewDocument, options);
        }
export type SettlementPreviewQueryHookResult = ReturnType<typeof useSettlementPreviewQuery>;
export type SettlementPreviewLazyQueryHookResult = ReturnType<typeof useSettlementPreviewLazyQuery>;
export type SettlementPreviewSuspenseQueryHookResult = ReturnType<typeof useSettlementPreviewSuspenseQuery>;
export type SettlementPreviewQueryResult = Apollo.QueryResult<SettlementPreviewQuery, SettlementPreviewQueryVariables>;
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
export type BatchSettlementPreviewMutationFn = Apollo.MutationFunction<BatchSettlementPreviewMutation, BatchSettlementPreviewMutationVariables>;

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
export function useBatchSettlementPreviewMutation(baseOptions?: Apollo.MutationHookOptions<BatchSettlementPreviewMutation, BatchSettlementPreviewMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<BatchSettlementPreviewMutation, BatchSettlementPreviewMutationVariables>(BatchSettlementPreviewDocument, options);
      }
export type BatchSettlementPreviewMutationHookResult = ReturnType<typeof useBatchSettlementPreviewMutation>;
export type BatchSettlementPreviewMutationResult = Apollo.MutationResult<BatchSettlementPreviewMutation>;
export type BatchSettlementPreviewMutationOptions = Apollo.BaseMutationOptions<BatchSettlementPreviewMutation, BatchSettlementPreviewMutationVariables>;
export const PauseOrderDocument = gql`
    mutation PauseOrder($id: ID!) {
  pauseOrder(id: $id) {
    id
    status
  }
}
    `;
export type PauseOrderMutationFn = Apollo.MutationFunction<PauseOrderMutation, PauseOrderMutationVariables>;

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
export function usePauseOrderMutation(baseOptions?: Apollo.MutationHookOptions<PauseOrderMutation, PauseOrderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PauseOrderMutation, PauseOrderMutationVariables>(PauseOrderDocument, options);
      }
export type PauseOrderMutationHookResult = ReturnType<typeof usePauseOrderMutation>;
export type PauseOrderMutationResult = Apollo.MutationResult<PauseOrderMutation>;
export type PauseOrderMutationOptions = Apollo.BaseMutationOptions<PauseOrderMutation, PauseOrderMutationVariables>;
export const ResumeOrderDocument = gql`
    mutation ResumeOrder($id: ID!) {
  resumeOrder(id: $id) {
    id
    status
  }
}
    `;
export type ResumeOrderMutationFn = Apollo.MutationFunction<ResumeOrderMutation, ResumeOrderMutationVariables>;

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
export function useResumeOrderMutation(baseOptions?: Apollo.MutationHookOptions<ResumeOrderMutation, ResumeOrderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResumeOrderMutation, ResumeOrderMutationVariables>(ResumeOrderDocument, options);
      }
export type ResumeOrderMutationHookResult = ReturnType<typeof useResumeOrderMutation>;
export type ResumeOrderMutationResult = Apollo.MutationResult<ResumeOrderMutation>;
export type ResumeOrderMutationOptions = Apollo.BaseMutationOptions<ResumeOrderMutation, ResumeOrderMutationVariables>;
export const EndOrderDocument = gql`
    mutation EndOrder($id: ID!) {
  endOrder(id: $id) {
    id
    status
    endAt
  }
}
    `;
export type EndOrderMutationFn = Apollo.MutationFunction<EndOrderMutation, EndOrderMutationVariables>;

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
export function useEndOrderMutation(baseOptions?: Apollo.MutationHookOptions<EndOrderMutation, EndOrderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<EndOrderMutation, EndOrderMutationVariables>(EndOrderDocument, options);
      }
export type EndOrderMutationHookResult = ReturnType<typeof useEndOrderMutation>;
export type EndOrderMutationResult = Apollo.MutationResult<EndOrderMutation>;
export type EndOrderMutationOptions = Apollo.BaseMutationOptions<EndOrderMutation, EndOrderMutationVariables>;
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
export type SettleOrderMutationFn = Apollo.MutationFunction<SettleOrderMutation, SettleOrderMutationVariables>;

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
export function useSettleOrderMutation(baseOptions?: Apollo.MutationHookOptions<SettleOrderMutation, SettleOrderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SettleOrderMutation, SettleOrderMutationVariables>(SettleOrderDocument, options);
      }
export type SettleOrderMutationHookResult = ReturnType<typeof useSettleOrderMutation>;
export type SettleOrderMutationResult = Apollo.MutationResult<SettleOrderMutation>;
export type SettleOrderMutationOptions = Apollo.BaseMutationOptions<SettleOrderMutation, SettleOrderMutationVariables>;
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
export type BatchSettleOrdersMutationFn = Apollo.MutationFunction<BatchSettleOrdersMutation, BatchSettleOrdersMutationVariables>;

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
export function useBatchSettleOrdersMutation(baseOptions?: Apollo.MutationHookOptions<BatchSettleOrdersMutation, BatchSettleOrdersMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<BatchSettleOrdersMutation, BatchSettleOrdersMutationVariables>(BatchSettleOrdersDocument, options);
      }
export type BatchSettleOrdersMutationHookResult = ReturnType<typeof useBatchSettleOrdersMutation>;
export type BatchSettleOrdersMutationResult = Apollo.MutationResult<BatchSettleOrdersMutation>;
export type BatchSettleOrdersMutationOptions = Apollo.BaseMutationOptions<BatchSettleOrdersMutation, BatchSettleOrdersMutationVariables>;
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
export type CancelBatchSettlementMutationFn = Apollo.MutationFunction<CancelBatchSettlementMutation, CancelBatchSettlementMutationVariables>;

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
export function useCancelBatchSettlementMutation(baseOptions?: Apollo.MutationHookOptions<CancelBatchSettlementMutation, CancelBatchSettlementMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CancelBatchSettlementMutation, CancelBatchSettlementMutationVariables>(CancelBatchSettlementDocument, options);
      }
export type CancelBatchSettlementMutationHookResult = ReturnType<typeof useCancelBatchSettlementMutation>;
export type CancelBatchSettlementMutationResult = Apollo.MutationResult<CancelBatchSettlementMutation>;
export type CancelBatchSettlementMutationOptions = Apollo.BaseMutationOptions<CancelBatchSettlementMutation, CancelBatchSettlementMutationVariables>;
export const BatchPauseOrdersDocument = gql`
    mutation BatchPauseOrders($ids: [ID!]!) {
  batchPauseOrders(ids: $ids) {
    id
    success
    error
  }
}
    `;
export type BatchPauseOrdersMutationFn = Apollo.MutationFunction<BatchPauseOrdersMutation, BatchPauseOrdersMutationVariables>;

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
export function useBatchPauseOrdersMutation(baseOptions?: Apollo.MutationHookOptions<BatchPauseOrdersMutation, BatchPauseOrdersMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<BatchPauseOrdersMutation, BatchPauseOrdersMutationVariables>(BatchPauseOrdersDocument, options);
      }
export type BatchPauseOrdersMutationHookResult = ReturnType<typeof useBatchPauseOrdersMutation>;
export type BatchPauseOrdersMutationResult = Apollo.MutationResult<BatchPauseOrdersMutation>;
export type BatchPauseOrdersMutationOptions = Apollo.BaseMutationOptions<BatchPauseOrdersMutation, BatchPauseOrdersMutationVariables>;
export const BatchResumeOrdersDocument = gql`
    mutation BatchResumeOrders($ids: [ID!]!) {
  batchResumeOrders(ids: $ids) {
    id
    success
    error
  }
}
    `;
export type BatchResumeOrdersMutationFn = Apollo.MutationFunction<BatchResumeOrdersMutation, BatchResumeOrdersMutationVariables>;

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
export function useBatchResumeOrdersMutation(baseOptions?: Apollo.MutationHookOptions<BatchResumeOrdersMutation, BatchResumeOrdersMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<BatchResumeOrdersMutation, BatchResumeOrdersMutationVariables>(BatchResumeOrdersDocument, options);
      }
export type BatchResumeOrdersMutationHookResult = ReturnType<typeof useBatchResumeOrdersMutation>;
export type BatchResumeOrdersMutationResult = Apollo.MutationResult<BatchResumeOrdersMutation>;
export type BatchResumeOrdersMutationOptions = Apollo.BaseMutationOptions<BatchResumeOrdersMutation, BatchResumeOrdersMutationVariables>;
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
export function usePublishedPricingQuery(baseOptions?: Apollo.QueryHookOptions<PublishedPricingQuery, PublishedPricingQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PublishedPricingQuery, PublishedPricingQueryVariables>(PublishedPricingDocument, options);
      }
export function usePublishedPricingLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PublishedPricingQuery, PublishedPricingQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PublishedPricingQuery, PublishedPricingQueryVariables>(PublishedPricingDocument, options);
        }
// @ts-ignore
export function usePublishedPricingSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PublishedPricingQuery, PublishedPricingQueryVariables>): Apollo.UseSuspenseQueryResult<PublishedPricingQuery, PublishedPricingQueryVariables>;
export function usePublishedPricingSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PublishedPricingQuery, PublishedPricingQueryVariables>): Apollo.UseSuspenseQueryResult<PublishedPricingQuery | undefined, PublishedPricingQueryVariables>;
export function usePublishedPricingSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PublishedPricingQuery, PublishedPricingQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PublishedPricingQuery, PublishedPricingQueryVariables>(PublishedPricingDocument, options);
        }
export type PublishedPricingQueryHookResult = ReturnType<typeof usePublishedPricingQuery>;
export type PublishedPricingLazyQueryHookResult = ReturnType<typeof usePublishedPricingLazyQuery>;
export type PublishedPricingSuspenseQueryHookResult = ReturnType<typeof usePublishedPricingSuspenseQuery>;
export type PublishedPricingQueryResult = Apollo.QueryResult<PublishedPricingQuery, PublishedPricingQueryVariables>;
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
export function useOrderStatusChangedSubscription(baseOptions?: Apollo.SubscriptionHookOptions<OrderStatusChangedSubscription, OrderStatusChangedSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<OrderStatusChangedSubscription, OrderStatusChangedSubscriptionVariables>(OrderStatusChangedDocument, options);
      }
export type OrderStatusChangedSubscriptionHookResult = ReturnType<typeof useOrderStatusChangedSubscription>;
export type OrderStatusChangedSubscriptionResult = Apollo.SubscriptionResult<OrderStatusChangedSubscription>;
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
export function usePricingDraftQuery(baseOptions?: Apollo.QueryHookOptions<PricingDraftQuery, PricingDraftQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PricingDraftQuery, PricingDraftQueryVariables>(PricingDraftDocument, options);
      }
export function usePricingDraftLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PricingDraftQuery, PricingDraftQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PricingDraftQuery, PricingDraftQueryVariables>(PricingDraftDocument, options);
        }
// @ts-ignore
export function usePricingDraftSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PricingDraftQuery, PricingDraftQueryVariables>): Apollo.UseSuspenseQueryResult<PricingDraftQuery, PricingDraftQueryVariables>;
export function usePricingDraftSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PricingDraftQuery, PricingDraftQueryVariables>): Apollo.UseSuspenseQueryResult<PricingDraftQuery | undefined, PricingDraftQueryVariables>;
export function usePricingDraftSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PricingDraftQuery, PricingDraftQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PricingDraftQuery, PricingDraftQueryVariables>(PricingDraftDocument, options);
        }
export type PricingDraftQueryHookResult = ReturnType<typeof usePricingDraftQuery>;
export type PricingDraftLazyQueryHookResult = ReturnType<typeof usePricingDraftLazyQuery>;
export type PricingDraftSuspenseQueryHookResult = ReturnType<typeof usePricingDraftSuspenseQuery>;
export type PricingDraftQueryResult = Apollo.QueryResult<PricingDraftQuery, PricingDraftQueryVariables>;
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
export function usePricingSnapshotsQuery(baseOptions?: Apollo.QueryHookOptions<PricingSnapshotsQuery, PricingSnapshotsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PricingSnapshotsQuery, PricingSnapshotsQueryVariables>(PricingSnapshotsDocument, options);
      }
export function usePricingSnapshotsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PricingSnapshotsQuery, PricingSnapshotsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PricingSnapshotsQuery, PricingSnapshotsQueryVariables>(PricingSnapshotsDocument, options);
        }
// @ts-ignore
export function usePricingSnapshotsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PricingSnapshotsQuery, PricingSnapshotsQueryVariables>): Apollo.UseSuspenseQueryResult<PricingSnapshotsQuery, PricingSnapshotsQueryVariables>;
export function usePricingSnapshotsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PricingSnapshotsQuery, PricingSnapshotsQueryVariables>): Apollo.UseSuspenseQueryResult<PricingSnapshotsQuery | undefined, PricingSnapshotsQueryVariables>;
export function usePricingSnapshotsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PricingSnapshotsQuery, PricingSnapshotsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PricingSnapshotsQuery, PricingSnapshotsQueryVariables>(PricingSnapshotsDocument, options);
        }
export type PricingSnapshotsQueryHookResult = ReturnType<typeof usePricingSnapshotsQuery>;
export type PricingSnapshotsLazyQueryHookResult = ReturnType<typeof usePricingSnapshotsLazyQuery>;
export type PricingSnapshotsSuspenseQueryHookResult = ReturnType<typeof usePricingSnapshotsSuspenseQuery>;
export type PricingSnapshotsQueryResult = Apollo.QueryResult<PricingSnapshotsQuery, PricingSnapshotsQueryVariables>;
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
export function usePricingSnapshotQuery(baseOptions: Apollo.QueryHookOptions<PricingSnapshotQuery, PricingSnapshotQueryVariables> & ({ variables: PricingSnapshotQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PricingSnapshotQuery, PricingSnapshotQueryVariables>(PricingSnapshotDocument, options);
      }
export function usePricingSnapshotLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PricingSnapshotQuery, PricingSnapshotQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PricingSnapshotQuery, PricingSnapshotQueryVariables>(PricingSnapshotDocument, options);
        }
// @ts-ignore
export function usePricingSnapshotSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<PricingSnapshotQuery, PricingSnapshotQueryVariables>): Apollo.UseSuspenseQueryResult<PricingSnapshotQuery, PricingSnapshotQueryVariables>;
export function usePricingSnapshotSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PricingSnapshotQuery, PricingSnapshotQueryVariables>): Apollo.UseSuspenseQueryResult<PricingSnapshotQuery | undefined, PricingSnapshotQueryVariables>;
export function usePricingSnapshotSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PricingSnapshotQuery, PricingSnapshotQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PricingSnapshotQuery, PricingSnapshotQueryVariables>(PricingSnapshotDocument, options);
        }
export type PricingSnapshotQueryHookResult = ReturnType<typeof usePricingSnapshotQuery>;
export type PricingSnapshotLazyQueryHookResult = ReturnType<typeof usePricingSnapshotLazyQuery>;
export type PricingSnapshotSuspenseQueryHookResult = ReturnType<typeof usePricingSnapshotSuspenseQuery>;
export type PricingSnapshotQueryResult = Apollo.QueryResult<PricingSnapshotQuery, PricingSnapshotQueryVariables>;
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
export type SavePricingSnapshotMutationFn = Apollo.MutationFunction<SavePricingSnapshotMutation, SavePricingSnapshotMutationVariables>;

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
export function useSavePricingSnapshotMutation(baseOptions?: Apollo.MutationHookOptions<SavePricingSnapshotMutation, SavePricingSnapshotMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SavePricingSnapshotMutation, SavePricingSnapshotMutationVariables>(SavePricingSnapshotDocument, options);
      }
export type SavePricingSnapshotMutationHookResult = ReturnType<typeof useSavePricingSnapshotMutation>;
export type SavePricingSnapshotMutationResult = Apollo.MutationResult<SavePricingSnapshotMutation>;
export type SavePricingSnapshotMutationOptions = Apollo.BaseMutationOptions<SavePricingSnapshotMutation, SavePricingSnapshotMutationVariables>;
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
export type PublishPricingSnapshotMutationFn = Apollo.MutationFunction<PublishPricingSnapshotMutation, PublishPricingSnapshotMutationVariables>;

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
export function usePublishPricingSnapshotMutation(baseOptions?: Apollo.MutationHookOptions<PublishPricingSnapshotMutation, PublishPricingSnapshotMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PublishPricingSnapshotMutation, PublishPricingSnapshotMutationVariables>(PublishPricingSnapshotDocument, options);
      }
export type PublishPricingSnapshotMutationHookResult = ReturnType<typeof usePublishPricingSnapshotMutation>;
export type PublishPricingSnapshotMutationResult = Apollo.MutationResult<PublishPricingSnapshotMutation>;
export type PublishPricingSnapshotMutationOptions = Apollo.BaseMutationOptions<PublishPricingSnapshotMutation, PublishPricingSnapshotMutationVariables>;
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
export type RestorePricingSnapshotMutationFn = Apollo.MutationFunction<RestorePricingSnapshotMutation, RestorePricingSnapshotMutationVariables>;

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
export function useRestorePricingSnapshotMutation(baseOptions?: Apollo.MutationHookOptions<RestorePricingSnapshotMutation, RestorePricingSnapshotMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RestorePricingSnapshotMutation, RestorePricingSnapshotMutationVariables>(RestorePricingSnapshotDocument, options);
      }
export type RestorePricingSnapshotMutationHookResult = ReturnType<typeof useRestorePricingSnapshotMutation>;
export type RestorePricingSnapshotMutationResult = Apollo.MutationResult<RestorePricingSnapshotMutation>;
export type RestorePricingSnapshotMutationOptions = Apollo.BaseMutationOptions<RestorePricingSnapshotMutation, RestorePricingSnapshotMutationVariables>;
export const CaptchaSettingsDocument = gql`
    query CaptchaSettings {
  captchaSettings {
    enabled
    disabledUntil
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
export function useCaptchaSettingsQuery(baseOptions?: Apollo.QueryHookOptions<CaptchaSettingsQuery, CaptchaSettingsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CaptchaSettingsQuery, CaptchaSettingsQueryVariables>(CaptchaSettingsDocument, options);
      }
export function useCaptchaSettingsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CaptchaSettingsQuery, CaptchaSettingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CaptchaSettingsQuery, CaptchaSettingsQueryVariables>(CaptchaSettingsDocument, options);
        }
// @ts-ignore
export function useCaptchaSettingsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<CaptchaSettingsQuery, CaptchaSettingsQueryVariables>): Apollo.UseSuspenseQueryResult<CaptchaSettingsQuery, CaptchaSettingsQueryVariables>;
export function useCaptchaSettingsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CaptchaSettingsQuery, CaptchaSettingsQueryVariables>): Apollo.UseSuspenseQueryResult<CaptchaSettingsQuery | undefined, CaptchaSettingsQueryVariables>;
export function useCaptchaSettingsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CaptchaSettingsQuery, CaptchaSettingsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CaptchaSettingsQuery, CaptchaSettingsQueryVariables>(CaptchaSettingsDocument, options);
        }
export type CaptchaSettingsQueryHookResult = ReturnType<typeof useCaptchaSettingsQuery>;
export type CaptchaSettingsLazyQueryHookResult = ReturnType<typeof useCaptchaSettingsLazyQuery>;
export type CaptchaSettingsSuspenseQueryHookResult = ReturnType<typeof useCaptchaSettingsSuspenseQuery>;
export type CaptchaSettingsQueryResult = Apollo.QueryResult<CaptchaSettingsQuery, CaptchaSettingsQueryVariables>;
export const SetCaptchaEnabledDocument = gql`
    mutation SetCaptchaEnabled($enabled: Boolean!) {
  setCaptchaEnabled(enabled: $enabled) {
    enabled
    disabledUntil
  }
}
    `;
export type SetCaptchaEnabledMutationFn = Apollo.MutationFunction<SetCaptchaEnabledMutation, SetCaptchaEnabledMutationVariables>;

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
export function useSetCaptchaEnabledMutation(baseOptions?: Apollo.MutationHookOptions<SetCaptchaEnabledMutation, SetCaptchaEnabledMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SetCaptchaEnabledMutation, SetCaptchaEnabledMutationVariables>(SetCaptchaEnabledDocument, options);
      }
export type SetCaptchaEnabledMutationHookResult = ReturnType<typeof useSetCaptchaEnabledMutation>;
export type SetCaptchaEnabledMutationResult = Apollo.MutationResult<SetCaptchaEnabledMutation>;
export type SetCaptchaEnabledMutationOptions = Apollo.BaseMutationOptions<SetCaptchaEnabledMutation, SetCaptchaEnabledMutationVariables>;
export const ManagedTablesDocument = gql`
    query ManagedTables {
  managedTables {
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
 *   },
 * });
 */
export function useManagedTablesQuery(baseOptions?: Apollo.QueryHookOptions<ManagedTablesQuery, ManagedTablesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ManagedTablesQuery, ManagedTablesQueryVariables>(ManagedTablesDocument, options);
      }
export function useManagedTablesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ManagedTablesQuery, ManagedTablesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ManagedTablesQuery, ManagedTablesQueryVariables>(ManagedTablesDocument, options);
        }
// @ts-ignore
export function useManagedTablesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ManagedTablesQuery, ManagedTablesQueryVariables>): Apollo.UseSuspenseQueryResult<ManagedTablesQuery, ManagedTablesQueryVariables>;
export function useManagedTablesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ManagedTablesQuery, ManagedTablesQueryVariables>): Apollo.UseSuspenseQueryResult<ManagedTablesQuery | undefined, ManagedTablesQueryVariables>;
export function useManagedTablesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ManagedTablesQuery, ManagedTablesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ManagedTablesQuery, ManagedTablesQueryVariables>(ManagedTablesDocument, options);
        }
export type ManagedTablesQueryHookResult = ReturnType<typeof useManagedTablesQuery>;
export type ManagedTablesLazyQueryHookResult = ReturnType<typeof useManagedTablesLazyQuery>;
export type ManagedTablesSuspenseQueryHookResult = ReturnType<typeof useManagedTablesSuspenseQuery>;
export type ManagedTablesQueryResult = Apollo.QueryResult<ManagedTablesQuery, ManagedTablesQueryVariables>;
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
export function useManagedTableQuery(baseOptions: Apollo.QueryHookOptions<ManagedTableQuery, ManagedTableQueryVariables> & ({ variables: ManagedTableQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ManagedTableQuery, ManagedTableQueryVariables>(ManagedTableDocument, options);
      }
export function useManagedTableLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ManagedTableQuery, ManagedTableQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ManagedTableQuery, ManagedTableQueryVariables>(ManagedTableDocument, options);
        }
// @ts-ignore
export function useManagedTableSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ManagedTableQuery, ManagedTableQueryVariables>): Apollo.UseSuspenseQueryResult<ManagedTableQuery, ManagedTableQueryVariables>;
export function useManagedTableSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ManagedTableQuery, ManagedTableQueryVariables>): Apollo.UseSuspenseQueryResult<ManagedTableQuery | undefined, ManagedTableQueryVariables>;
export function useManagedTableSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ManagedTableQuery, ManagedTableQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ManagedTableQuery, ManagedTableQueryVariables>(ManagedTableDocument, options);
        }
export type ManagedTableQueryHookResult = ReturnType<typeof useManagedTableQuery>;
export type ManagedTableLazyQueryHookResult = ReturnType<typeof useManagedTableLazyQuery>;
export type ManagedTableSuspenseQueryHookResult = ReturnType<typeof useManagedTableSuspenseQuery>;
export type ManagedTableQueryResult = Apollo.QueryResult<ManagedTableQuery, ManagedTableQueryVariables>;
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
  }
}
    `;
export type CreateTableMutationFn = Apollo.MutationFunction<CreateTableMutation, CreateTableMutationVariables>;

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
export function useCreateTableMutation(baseOptions?: Apollo.MutationHookOptions<CreateTableMutation, CreateTableMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateTableMutation, CreateTableMutationVariables>(CreateTableDocument, options);
      }
export type CreateTableMutationHookResult = ReturnType<typeof useCreateTableMutation>;
export type CreateTableMutationResult = Apollo.MutationResult<CreateTableMutation>;
export type CreateTableMutationOptions = Apollo.BaseMutationOptions<CreateTableMutation, CreateTableMutationVariables>;
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
export type UpdateTableMutationFn = Apollo.MutationFunction<UpdateTableMutation, UpdateTableMutationVariables>;

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
export function useUpdateTableMutation(baseOptions?: Apollo.MutationHookOptions<UpdateTableMutation, UpdateTableMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateTableMutation, UpdateTableMutationVariables>(UpdateTableDocument, options);
      }
export type UpdateTableMutationHookResult = ReturnType<typeof useUpdateTableMutation>;
export type UpdateTableMutationResult = Apollo.MutationResult<UpdateTableMutation>;
export type UpdateTableMutationOptions = Apollo.BaseMutationOptions<UpdateTableMutation, UpdateTableMutationVariables>;
export const RemoveTableDocument = gql`
    mutation RemoveTable($id: ID!) {
  removeTable(id: $id) {
    id
  }
}
    `;
export type RemoveTableMutationFn = Apollo.MutationFunction<RemoveTableMutation, RemoveTableMutationVariables>;

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
export function useRemoveTableMutation(baseOptions?: Apollo.MutationHookOptions<RemoveTableMutation, RemoveTableMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveTableMutation, RemoveTableMutationVariables>(RemoveTableDocument, options);
      }
export type RemoveTableMutationHookResult = ReturnType<typeof useRemoveTableMutation>;
export type RemoveTableMutationResult = Apollo.MutationResult<RemoveTableMutation>;
export type RemoveTableMutationOptions = Apollo.BaseMutationOptions<RemoveTableMutation, RemoveTableMutationVariables>;
export const ToggleTableStatusDocument = gql`
    mutation ToggleTableStatus($id: ID!) {
  toggleTableStatus(id: $id) {
    id
    status
  }
}
    `;
export type ToggleTableStatusMutationFn = Apollo.MutationFunction<ToggleTableStatusMutation, ToggleTableStatusMutationVariables>;

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
export function useToggleTableStatusMutation(baseOptions?: Apollo.MutationHookOptions<ToggleTableStatusMutation, ToggleTableStatusMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ToggleTableStatusMutation, ToggleTableStatusMutationVariables>(ToggleTableStatusDocument, options);
      }
export type ToggleTableStatusMutationHookResult = ReturnType<typeof useToggleTableStatusMutation>;
export type ToggleTableStatusMutationResult = Apollo.MutationResult<ToggleTableStatusMutation>;
export type ToggleTableStatusMutationOptions = Apollo.BaseMutationOptions<ToggleTableStatusMutation, ToggleTableStatusMutationVariables>;
export const RegenerateTableCodeDocument = gql`
    mutation RegenerateTableCode($id: ID!) {
  regenerateTableCode(id: $id) {
    id
    code
  }
}
    `;
export type RegenerateTableCodeMutationFn = Apollo.MutationFunction<RegenerateTableCodeMutation, RegenerateTableCodeMutationVariables>;

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
export function useRegenerateTableCodeMutation(baseOptions?: Apollo.MutationHookOptions<RegenerateTableCodeMutation, RegenerateTableCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RegenerateTableCodeMutation, RegenerateTableCodeMutationVariables>(RegenerateTableCodeDocument, options);
      }
export type RegenerateTableCodeMutationHookResult = ReturnType<typeof useRegenerateTableCodeMutation>;
export type RegenerateTableCodeMutationResult = Apollo.MutationResult<RegenerateTableCodeMutation>;
export type RegenerateTableCodeMutationOptions = Apollo.BaseMutationOptions<RegenerateTableCodeMutation, RegenerateTableCodeMutationVariables>;
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
export type AddTableOccupancyMutationFn = Apollo.MutationFunction<AddTableOccupancyMutation, AddTableOccupancyMutationVariables>;

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
export function useAddTableOccupancyMutation(baseOptions?: Apollo.MutationHookOptions<AddTableOccupancyMutation, AddTableOccupancyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddTableOccupancyMutation, AddTableOccupancyMutationVariables>(AddTableOccupancyDocument, options);
      }
export type AddTableOccupancyMutationHookResult = ReturnType<typeof useAddTableOccupancyMutation>;
export type AddTableOccupancyMutationResult = Apollo.MutationResult<AddTableOccupancyMutation>;
export type AddTableOccupancyMutationOptions = Apollo.BaseMutationOptions<AddTableOccupancyMutation, AddTableOccupancyMutationVariables>;
export const UsersDocument = gql`
    query Users($input: UserSearchInput = {}) {
  users(input: $input) {
    items {
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
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUsersQuery(baseOptions?: Apollo.QueryHookOptions<UsersQuery, UsersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UsersQuery, UsersQueryVariables>(UsersDocument, options);
      }
export function useUsersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UsersQuery, UsersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UsersQuery, UsersQueryVariables>(UsersDocument, options);
        }
// @ts-ignore
export function useUsersSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<UsersQuery, UsersQueryVariables>): Apollo.UseSuspenseQueryResult<UsersQuery, UsersQueryVariables>;
export function useUsersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<UsersQuery, UsersQueryVariables>): Apollo.UseSuspenseQueryResult<UsersQuery | undefined, UsersQueryVariables>;
export function useUsersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<UsersQuery, UsersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<UsersQuery, UsersQueryVariables>(UsersDocument, options);
        }
export type UsersQueryHookResult = ReturnType<typeof useUsersQuery>;
export type UsersLazyQueryHookResult = ReturnType<typeof useUsersLazyQuery>;
export type UsersSuspenseQueryHookResult = ReturnType<typeof useUsersSuspenseQuery>;
export type UsersQueryResult = Apollo.QueryResult<UsersQuery, UsersQueryVariables>;
export const UserDocument = gql`
    query User($id: ID!) {
  user(id: $id) {
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
export function useUserQuery(baseOptions: Apollo.QueryHookOptions<UserQuery, UserQueryVariables> & ({ variables: UserQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UserQuery, UserQueryVariables>(UserDocument, options);
      }
export function useUserLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UserQuery, UserQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UserQuery, UserQueryVariables>(UserDocument, options);
        }
// @ts-ignore
export function useUserSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<UserQuery, UserQueryVariables>): Apollo.UseSuspenseQueryResult<UserQuery, UserQueryVariables>;
export function useUserSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<UserQuery, UserQueryVariables>): Apollo.UseSuspenseQueryResult<UserQuery | undefined, UserQueryVariables>;
export function useUserSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<UserQuery, UserQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<UserQuery, UserQueryVariables>(UserDocument, options);
        }
export type UserQueryHookResult = ReturnType<typeof useUserQuery>;
export type UserLazyQueryHookResult = ReturnType<typeof useUserLazyQuery>;
export type UserSuspenseQueryHookResult = ReturnType<typeof useUserSuspenseQuery>;
export type UserQueryResult = Apollo.QueryResult<UserQuery, UserQueryVariables>;
export const DisableUserDocument = gql`
    mutation DisableUser($id: ID!) {
  disableUser(id: $id) {
    id
    role
  }
}
    `;
export type DisableUserMutationFn = Apollo.MutationFunction<DisableUserMutation, DisableUserMutationVariables>;

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
export function useDisableUserMutation(baseOptions?: Apollo.MutationHookOptions<DisableUserMutation, DisableUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DisableUserMutation, DisableUserMutationVariables>(DisableUserDocument, options);
      }
export type DisableUserMutationHookResult = ReturnType<typeof useDisableUserMutation>;
export type DisableUserMutationResult = Apollo.MutationResult<DisableUserMutation>;
export type DisableUserMutationOptions = Apollo.BaseMutationOptions<DisableUserMutation, DisableUserMutationVariables>;
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
export type UpdateUserMutationFn = Apollo.MutationFunction<UpdateUserMutation, UpdateUserMutationVariables>;

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
export function useUpdateUserMutation(baseOptions?: Apollo.MutationHookOptions<UpdateUserMutation, UpdateUserMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateUserMutation, UpdateUserMutationVariables>(UpdateUserDocument, options);
      }
export type UpdateUserMutationHookResult = ReturnType<typeof useUpdateUserMutation>;
export type UpdateUserMutationResult = Apollo.MutationResult<UpdateUserMutation>;
export type UpdateUserMutationOptions = Apollo.BaseMutationOptions<UpdateUserMutation, UpdateUserMutationVariables>;
export const UpdateUserRoleDocument = gql`
    mutation UpdateUserRole($input: UpdateRoleInput!) {
  updateUserRole(input: $input) {
    id
    role
  }
}
    `;
export type UpdateUserRoleMutationFn = Apollo.MutationFunction<UpdateUserRoleMutation, UpdateUserRoleMutationVariables>;

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
export function useUpdateUserRoleMutation(baseOptions?: Apollo.MutationHookOptions<UpdateUserRoleMutation, UpdateUserRoleMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateUserRoleMutation, UpdateUserRoleMutationVariables>(UpdateUserRoleDocument, options);
      }
export type UpdateUserRoleMutationHookResult = ReturnType<typeof useUpdateUserRoleMutation>;
export type UpdateUserRoleMutationResult = Apollo.MutationResult<UpdateUserRoleMutation>;
export type UpdateUserRoleMutationOptions = Apollo.BaseMutationOptions<UpdateUserRoleMutation, UpdateUserRoleMutationVariables>;
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
export function useMembershipPlansByUserQuery(baseOptions: Apollo.QueryHookOptions<MembershipPlansByUserQuery, MembershipPlansByUserQueryVariables> & ({ variables: MembershipPlansByUserQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MembershipPlansByUserQuery, MembershipPlansByUserQueryVariables>(MembershipPlansByUserDocument, options);
      }
export function useMembershipPlansByUserLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MembershipPlansByUserQuery, MembershipPlansByUserQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MembershipPlansByUserQuery, MembershipPlansByUserQueryVariables>(MembershipPlansByUserDocument, options);
        }
// @ts-ignore
export function useMembershipPlansByUserSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MembershipPlansByUserQuery, MembershipPlansByUserQueryVariables>): Apollo.UseSuspenseQueryResult<MembershipPlansByUserQuery, MembershipPlansByUserQueryVariables>;
export function useMembershipPlansByUserSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MembershipPlansByUserQuery, MembershipPlansByUserQueryVariables>): Apollo.UseSuspenseQueryResult<MembershipPlansByUserQuery | undefined, MembershipPlansByUserQueryVariables>;
export function useMembershipPlansByUserSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MembershipPlansByUserQuery, MembershipPlansByUserQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MembershipPlansByUserQuery, MembershipPlansByUserQueryVariables>(MembershipPlansByUserDocument, options);
        }
export type MembershipPlansByUserQueryHookResult = ReturnType<typeof useMembershipPlansByUserQuery>;
export type MembershipPlansByUserLazyQueryHookResult = ReturnType<typeof useMembershipPlansByUserLazyQuery>;
export type MembershipPlansByUserSuspenseQueryHookResult = ReturnType<typeof useMembershipPlansByUserSuspenseQuery>;
export type MembershipPlansByUserQueryResult = Apollo.QueryResult<MembershipPlansByUserQuery, MembershipPlansByUserQueryVariables>;
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
export type CreateMembershipPlanMutationFn = Apollo.MutationFunction<CreateMembershipPlanMutation, CreateMembershipPlanMutationVariables>;

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
export function useCreateMembershipPlanMutation(baseOptions?: Apollo.MutationHookOptions<CreateMembershipPlanMutation, CreateMembershipPlanMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateMembershipPlanMutation, CreateMembershipPlanMutationVariables>(CreateMembershipPlanDocument, options);
      }
export type CreateMembershipPlanMutationHookResult = ReturnType<typeof useCreateMembershipPlanMutation>;
export type CreateMembershipPlanMutationResult = Apollo.MutationResult<CreateMembershipPlanMutation>;
export type CreateMembershipPlanMutationOptions = Apollo.BaseMutationOptions<CreateMembershipPlanMutation, CreateMembershipPlanMutationVariables>;
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
export type UpdateMembershipPlanMutationFn = Apollo.MutationFunction<UpdateMembershipPlanMutation, UpdateMembershipPlanMutationVariables>;

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
export function useUpdateMembershipPlanMutation(baseOptions?: Apollo.MutationHookOptions<UpdateMembershipPlanMutation, UpdateMembershipPlanMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateMembershipPlanMutation, UpdateMembershipPlanMutationVariables>(UpdateMembershipPlanDocument, options);
      }
export type UpdateMembershipPlanMutationHookResult = ReturnType<typeof useUpdateMembershipPlanMutation>;
export type UpdateMembershipPlanMutationResult = Apollo.MutationResult<UpdateMembershipPlanMutation>;
export type UpdateMembershipPlanMutationOptions = Apollo.BaseMutationOptions<UpdateMembershipPlanMutation, UpdateMembershipPlanMutationVariables>;
export const RemoveMembershipPlanDocument = gql`
    mutation RemoveMembershipPlan($id: ID!) {
  removeMembershipPlan(id: $id) {
    id
  }
}
    `;
export type RemoveMembershipPlanMutationFn = Apollo.MutationFunction<RemoveMembershipPlanMutation, RemoveMembershipPlanMutationVariables>;

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
export function useRemoveMembershipPlanMutation(baseOptions?: Apollo.MutationHookOptions<RemoveMembershipPlanMutation, RemoveMembershipPlanMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveMembershipPlanMutation, RemoveMembershipPlanMutationVariables>(RemoveMembershipPlanDocument, options);
      }
export type RemoveMembershipPlanMutationHookResult = ReturnType<typeof useRemoveMembershipPlanMutation>;
export type RemoveMembershipPlanMutationResult = Apollo.MutationResult<RemoveMembershipPlanMutation>;
export type RemoveMembershipPlanMutationOptions = Apollo.BaseMutationOptions<RemoveMembershipPlanMutation, RemoveMembershipPlanMutationVariables>;
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
export type DeductStoredValueMutationFn = Apollo.MutationFunction<DeductStoredValueMutation, DeductStoredValueMutationVariables>;

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
export function useDeductStoredValueMutation(baseOptions?: Apollo.MutationHookOptions<DeductStoredValueMutation, DeductStoredValueMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeductStoredValueMutation, DeductStoredValueMutationVariables>(DeductStoredValueDocument, options);
      }
export type DeductStoredValueMutationHookResult = ReturnType<typeof useDeductStoredValueMutation>;
export type DeductStoredValueMutationResult = Apollo.MutationResult<DeductStoredValueMutation>;
export type DeductStoredValueMutationOptions = Apollo.BaseMutationOptions<DeductStoredValueMutation, DeductStoredValueMutationVariables>;
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
export function useOccupanciesByUserQuery(baseOptions: Apollo.QueryHookOptions<OccupanciesByUserQuery, OccupanciesByUserQueryVariables> & ({ variables: OccupanciesByUserQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<OccupanciesByUserQuery, OccupanciesByUserQueryVariables>(OccupanciesByUserDocument, options);
      }
export function useOccupanciesByUserLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<OccupanciesByUserQuery, OccupanciesByUserQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<OccupanciesByUserQuery, OccupanciesByUserQueryVariables>(OccupanciesByUserDocument, options);
        }
// @ts-ignore
export function useOccupanciesByUserSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<OccupanciesByUserQuery, OccupanciesByUserQueryVariables>): Apollo.UseSuspenseQueryResult<OccupanciesByUserQuery, OccupanciesByUserQueryVariables>;
export function useOccupanciesByUserSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<OccupanciesByUserQuery, OccupanciesByUserQueryVariables>): Apollo.UseSuspenseQueryResult<OccupanciesByUserQuery | undefined, OccupanciesByUserQueryVariables>;
export function useOccupanciesByUserSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<OccupanciesByUserQuery, OccupanciesByUserQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<OccupanciesByUserQuery, OccupanciesByUserQueryVariables>(OccupanciesByUserDocument, options);
        }
export type OccupanciesByUserQueryHookResult = ReturnType<typeof useOccupanciesByUserQuery>;
export type OccupanciesByUserLazyQueryHookResult = ReturnType<typeof useOccupanciesByUserLazyQuery>;
export type OccupanciesByUserSuspenseQueryHookResult = ReturnType<typeof useOccupanciesByUserSuspenseQuery>;
export type OccupanciesByUserQueryResult = Apollo.QueryResult<OccupanciesByUserQuery, OccupanciesByUserQueryVariables>;
export const VerifyTotpDashDocument = gql`
    mutation VerifyTotpDash($input: VerifyTotpInput!) {
  verifyTotp(input: $input) {
    success
    userId
  }
}
    `;
export type VerifyTotpDashMutationFn = Apollo.MutationFunction<VerifyTotpDashMutation, VerifyTotpDashMutationVariables>;

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
export function useVerifyTotpDashMutation(baseOptions?: Apollo.MutationHookOptions<VerifyTotpDashMutation, VerifyTotpDashMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<VerifyTotpDashMutation, VerifyTotpDashMutationVariables>(VerifyTotpDashDocument, options);
      }
export type VerifyTotpDashMutationHookResult = ReturnType<typeof useVerifyTotpDashMutation>;
export type VerifyTotpDashMutationResult = Apollo.MutationResult<VerifyTotpDashMutation>;
export type VerifyTotpDashMutationOptions = Apollo.BaseMutationOptions<VerifyTotpDashMutation, VerifyTotpDashMutationVariables>;
export const SyncOwnedBoardGamesDocument = gql`
    mutation SyncOwnedBoardGames($pageFrom: Int!, $pageTo: Int!, $date: String!) {
  syncOwnedBoardGames(pageFrom: $pageFrom, pageTo: $pageTo, date: $date) {
    success
    message
    processed
  }
}
    `;
export type SyncOwnedBoardGamesMutationFn = Apollo.MutationFunction<SyncOwnedBoardGamesMutation, SyncOwnedBoardGamesMutationVariables>;

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
export function useSyncOwnedBoardGamesMutation(baseOptions?: Apollo.MutationHookOptions<SyncOwnedBoardGamesMutation, SyncOwnedBoardGamesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SyncOwnedBoardGamesMutation, SyncOwnedBoardGamesMutationVariables>(SyncOwnedBoardGamesDocument, options);
      }
export type SyncOwnedBoardGamesMutationHookResult = ReturnType<typeof useSyncOwnedBoardGamesMutation>;
export type SyncOwnedBoardGamesMutationResult = Apollo.MutationResult<SyncOwnedBoardGamesMutation>;
export type SyncOwnedBoardGamesMutationOptions = Apollo.BaseMutationOptions<SyncOwnedBoardGamesMutation, SyncOwnedBoardGamesMutationVariables>;
export const WakeOwnedBoardGamesDocument = gql`
    mutation WakeOwnedBoardGames($date: String!) {
  wakeOwnedBoardGames(date: $date) {
    success
    message
    processed
  }
}
    `;
export type WakeOwnedBoardGamesMutationFn = Apollo.MutationFunction<WakeOwnedBoardGamesMutation, WakeOwnedBoardGamesMutationVariables>;

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
export function useWakeOwnedBoardGamesMutation(baseOptions?: Apollo.MutationHookOptions<WakeOwnedBoardGamesMutation, WakeOwnedBoardGamesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<WakeOwnedBoardGamesMutation, WakeOwnedBoardGamesMutationVariables>(WakeOwnedBoardGamesDocument, options);
      }
export type WakeOwnedBoardGamesMutationHookResult = ReturnType<typeof useWakeOwnedBoardGamesMutation>;
export type WakeOwnedBoardGamesMutationResult = Apollo.MutationResult<WakeOwnedBoardGamesMutation>;
export type WakeOwnedBoardGamesMutationOptions = Apollo.BaseMutationOptions<WakeOwnedBoardGamesMutation, WakeOwnedBoardGamesMutationVariables>;
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
export function useWechatTemplatesQuery(baseOptions?: Apollo.QueryHookOptions<WechatTemplatesQuery, WechatTemplatesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<WechatTemplatesQuery, WechatTemplatesQueryVariables>(WechatTemplatesDocument, options);
      }
export function useWechatTemplatesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<WechatTemplatesQuery, WechatTemplatesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<WechatTemplatesQuery, WechatTemplatesQueryVariables>(WechatTemplatesDocument, options);
        }
// @ts-ignore
export function useWechatTemplatesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<WechatTemplatesQuery, WechatTemplatesQueryVariables>): Apollo.UseSuspenseQueryResult<WechatTemplatesQuery, WechatTemplatesQueryVariables>;
export function useWechatTemplatesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<WechatTemplatesQuery, WechatTemplatesQueryVariables>): Apollo.UseSuspenseQueryResult<WechatTemplatesQuery | undefined, WechatTemplatesQueryVariables>;
export function useWechatTemplatesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<WechatTemplatesQuery, WechatTemplatesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<WechatTemplatesQuery, WechatTemplatesQueryVariables>(WechatTemplatesDocument, options);
        }
export type WechatTemplatesQueryHookResult = ReturnType<typeof useWechatTemplatesQuery>;
export type WechatTemplatesLazyQueryHookResult = ReturnType<typeof useWechatTemplatesLazyQuery>;
export type WechatTemplatesSuspenseQueryHookResult = ReturnType<typeof useWechatTemplatesSuspenseQuery>;
export type WechatTemplatesQueryResult = Apollo.QueryResult<WechatTemplatesQuery, WechatTemplatesQueryVariables>;
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
export function useWechatTemplateSlotsQuery(baseOptions?: Apollo.QueryHookOptions<WechatTemplateSlotsQuery, WechatTemplateSlotsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<WechatTemplateSlotsQuery, WechatTemplateSlotsQueryVariables>(WechatTemplateSlotsDocument, options);
      }
export function useWechatTemplateSlotsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<WechatTemplateSlotsQuery, WechatTemplateSlotsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<WechatTemplateSlotsQuery, WechatTemplateSlotsQueryVariables>(WechatTemplateSlotsDocument, options);
        }
// @ts-ignore
export function useWechatTemplateSlotsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<WechatTemplateSlotsQuery, WechatTemplateSlotsQueryVariables>): Apollo.UseSuspenseQueryResult<WechatTemplateSlotsQuery, WechatTemplateSlotsQueryVariables>;
export function useWechatTemplateSlotsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<WechatTemplateSlotsQuery, WechatTemplateSlotsQueryVariables>): Apollo.UseSuspenseQueryResult<WechatTemplateSlotsQuery | undefined, WechatTemplateSlotsQueryVariables>;
export function useWechatTemplateSlotsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<WechatTemplateSlotsQuery, WechatTemplateSlotsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<WechatTemplateSlotsQuery, WechatTemplateSlotsQueryVariables>(WechatTemplateSlotsDocument, options);
        }
export type WechatTemplateSlotsQueryHookResult = ReturnType<typeof useWechatTemplateSlotsQuery>;
export type WechatTemplateSlotsLazyQueryHookResult = ReturnType<typeof useWechatTemplateSlotsLazyQuery>;
export type WechatTemplateSlotsSuspenseQueryHookResult = ReturnType<typeof useWechatTemplateSlotsSuspenseQuery>;
export type WechatTemplateSlotsQueryResult = Apollo.QueryResult<WechatTemplateSlotsQuery, WechatTemplateSlotsQueryVariables>;
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
export type AddWechatTemplateFromLibraryMutationFn = Apollo.MutationFunction<AddWechatTemplateFromLibraryMutation, AddWechatTemplateFromLibraryMutationVariables>;

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
export function useAddWechatTemplateFromLibraryMutation(baseOptions?: Apollo.MutationHookOptions<AddWechatTemplateFromLibraryMutation, AddWechatTemplateFromLibraryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddWechatTemplateFromLibraryMutation, AddWechatTemplateFromLibraryMutationVariables>(AddWechatTemplateFromLibraryDocument, options);
      }
export type AddWechatTemplateFromLibraryMutationHookResult = ReturnType<typeof useAddWechatTemplateFromLibraryMutation>;
export type AddWechatTemplateFromLibraryMutationResult = Apollo.MutationResult<AddWechatTemplateFromLibraryMutation>;
export type AddWechatTemplateFromLibraryMutationOptions = Apollo.BaseMutationOptions<AddWechatTemplateFromLibraryMutation, AddWechatTemplateFromLibraryMutationVariables>;
export const AssignWechatTemplateSlotDocument = gql`
    mutation AssignWechatTemplateSlot($slot: WechatTemplateSlotKey!, $templateId: String!) {
  assignWechatTemplateSlot(slot: $slot, templateId: $templateId) {
    key
    label
    templateId
  }
}
    `;
export type AssignWechatTemplateSlotMutationFn = Apollo.MutationFunction<AssignWechatTemplateSlotMutation, AssignWechatTemplateSlotMutationVariables>;

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
export function useAssignWechatTemplateSlotMutation(baseOptions?: Apollo.MutationHookOptions<AssignWechatTemplateSlotMutation, AssignWechatTemplateSlotMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AssignWechatTemplateSlotMutation, AssignWechatTemplateSlotMutationVariables>(AssignWechatTemplateSlotDocument, options);
      }
export type AssignWechatTemplateSlotMutationHookResult = ReturnType<typeof useAssignWechatTemplateSlotMutation>;
export type AssignWechatTemplateSlotMutationResult = Apollo.MutationResult<AssignWechatTemplateSlotMutation>;
export type AssignWechatTemplateSlotMutationOptions = Apollo.BaseMutationOptions<AssignWechatTemplateSlotMutation, AssignWechatTemplateSlotMutationVariables>;
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
export type RemoveWechatTemplateMutationFn = Apollo.MutationFunction<RemoveWechatTemplateMutation, RemoveWechatTemplateMutationVariables>;

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
export function useRemoveWechatTemplateMutation(baseOptions?: Apollo.MutationHookOptions<RemoveWechatTemplateMutation, RemoveWechatTemplateMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveWechatTemplateMutation, RemoveWechatTemplateMutationVariables>(RemoveWechatTemplateDocument, options);
      }
export type RemoveWechatTemplateMutationHookResult = ReturnType<typeof useRemoveWechatTemplateMutation>;
export type RemoveWechatTemplateMutationResult = Apollo.MutationResult<RemoveWechatTemplateMutation>;
export type RemoveWechatTemplateMutationOptions = Apollo.BaseMutationOptions<RemoveWechatTemplateMutation, RemoveWechatTemplateMutationVariables>;
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
export type SendWechatTemplateTestMutationFn = Apollo.MutationFunction<SendWechatTemplateTestMutation, SendWechatTemplateTestMutationVariables>;

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
export function useSendWechatTemplateTestMutation(baseOptions?: Apollo.MutationHookOptions<SendWechatTemplateTestMutation, SendWechatTemplateTestMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SendWechatTemplateTestMutation, SendWechatTemplateTestMutationVariables>(SendWechatTemplateTestDocument, options);
      }
export type SendWechatTemplateTestMutationHookResult = ReturnType<typeof useSendWechatTemplateTestMutation>;
export type SendWechatTemplateTestMutationResult = Apollo.MutationResult<SendWechatTemplateTestMutation>;
export type SendWechatTemplateTestMutationOptions = Apollo.BaseMutationOptions<SendWechatTemplateTestMutation, SendWechatTemplateTestMutationVariables>;
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
export function useGetEventsQuery(baseOptions?: Apollo.QueryHookOptions<GetEventsQuery, GetEventsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetEventsQuery, GetEventsQueryVariables>(GetEventsDocument, options);
      }
export function useGetEventsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetEventsQuery, GetEventsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetEventsQuery, GetEventsQueryVariables>(GetEventsDocument, options);
        }
// @ts-ignore
export function useGetEventsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetEventsQuery, GetEventsQueryVariables>): Apollo.UseSuspenseQueryResult<GetEventsQuery, GetEventsQueryVariables>;
export function useGetEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEventsQuery, GetEventsQueryVariables>): Apollo.UseSuspenseQueryResult<GetEventsQuery | undefined, GetEventsQueryVariables>;
export function useGetEventsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEventsQuery, GetEventsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetEventsQuery, GetEventsQueryVariables>(GetEventsDocument, options);
        }
export type GetEventsQueryHookResult = ReturnType<typeof useGetEventsQuery>;
export type GetEventsLazyQueryHookResult = ReturnType<typeof useGetEventsLazyQuery>;
export type GetEventsSuspenseQueryHookResult = ReturnType<typeof useGetEventsSuspenseQuery>;
export type GetEventsQueryResult = Apollo.QueryResult<GetEventsQuery, GetEventsQueryVariables>;
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
export function useGetEventQuery(baseOptions: Apollo.QueryHookOptions<GetEventQuery, GetEventQueryVariables> & ({ variables: GetEventQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetEventQuery, GetEventQueryVariables>(GetEventDocument, options);
      }
export function useGetEventLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetEventQuery, GetEventQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetEventQuery, GetEventQueryVariables>(GetEventDocument, options);
        }
// @ts-ignore
export function useGetEventSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetEventQuery, GetEventQueryVariables>): Apollo.UseSuspenseQueryResult<GetEventQuery, GetEventQueryVariables>;
export function useGetEventSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEventQuery, GetEventQueryVariables>): Apollo.UseSuspenseQueryResult<GetEventQuery | undefined, GetEventQueryVariables>;
export function useGetEventSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetEventQuery, GetEventQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetEventQuery, GetEventQueryVariables>(GetEventDocument, options);
        }
export type GetEventQueryHookResult = ReturnType<typeof useGetEventQuery>;
export type GetEventLazyQueryHookResult = ReturnType<typeof useGetEventLazyQuery>;
export type GetEventSuspenseQueryHookResult = ReturnType<typeof useGetEventSuspenseQuery>;
export type GetEventQueryResult = Apollo.QueryResult<GetEventQuery, GetEventQueryVariables>;
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
export function useGetMyPpStatsQuery(baseOptions?: Apollo.QueryHookOptions<GetMyPpStatsQuery, GetMyPpStatsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMyPpStatsQuery, GetMyPpStatsQueryVariables>(GetMyPpStatsDocument, options);
      }
export function useGetMyPpStatsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMyPpStatsQuery, GetMyPpStatsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMyPpStatsQuery, GetMyPpStatsQueryVariables>(GetMyPpStatsDocument, options);
        }
// @ts-ignore
export function useGetMyPpStatsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetMyPpStatsQuery, GetMyPpStatsQueryVariables>): Apollo.UseSuspenseQueryResult<GetMyPpStatsQuery, GetMyPpStatsQueryVariables>;
export function useGetMyPpStatsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMyPpStatsQuery, GetMyPpStatsQueryVariables>): Apollo.UseSuspenseQueryResult<GetMyPpStatsQuery | undefined, GetMyPpStatsQueryVariables>;
export function useGetMyPpStatsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMyPpStatsQuery, GetMyPpStatsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMyPpStatsQuery, GetMyPpStatsQueryVariables>(GetMyPpStatsDocument, options);
        }
export type GetMyPpStatsQueryHookResult = ReturnType<typeof useGetMyPpStatsQuery>;
export type GetMyPpStatsLazyQueryHookResult = ReturnType<typeof useGetMyPpStatsLazyQuery>;
export type GetMyPpStatsSuspenseQueryHookResult = ReturnType<typeof useGetMyPpStatsSuspenseQuery>;
export type GetMyPpStatsQueryResult = Apollo.QueryResult<GetMyPpStatsQuery, GetMyPpStatsQueryVariables>;
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
export function useGetMahjongHeatmapQuery(baseOptions?: Apollo.QueryHookOptions<GetMahjongHeatmapQuery, GetMahjongHeatmapQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMahjongHeatmapQuery, GetMahjongHeatmapQueryVariables>(GetMahjongHeatmapDocument, options);
      }
export function useGetMahjongHeatmapLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMahjongHeatmapQuery, GetMahjongHeatmapQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMahjongHeatmapQuery, GetMahjongHeatmapQueryVariables>(GetMahjongHeatmapDocument, options);
        }
// @ts-ignore
export function useGetMahjongHeatmapSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetMahjongHeatmapQuery, GetMahjongHeatmapQueryVariables>): Apollo.UseSuspenseQueryResult<GetMahjongHeatmapQuery, GetMahjongHeatmapQueryVariables>;
export function useGetMahjongHeatmapSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMahjongHeatmapQuery, GetMahjongHeatmapQueryVariables>): Apollo.UseSuspenseQueryResult<GetMahjongHeatmapQuery | undefined, GetMahjongHeatmapQueryVariables>;
export function useGetMahjongHeatmapSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMahjongHeatmapQuery, GetMahjongHeatmapQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMahjongHeatmapQuery, GetMahjongHeatmapQueryVariables>(GetMahjongHeatmapDocument, options);
        }
export type GetMahjongHeatmapQueryHookResult = ReturnType<typeof useGetMahjongHeatmapQuery>;
export type GetMahjongHeatmapLazyQueryHookResult = ReturnType<typeof useGetMahjongHeatmapLazyQuery>;
export type GetMahjongHeatmapSuspenseQueryHookResult = ReturnType<typeof useGetMahjongHeatmapSuspenseQuery>;
export type GetMahjongHeatmapQueryResult = Apollo.QueryResult<GetMahjongHeatmapQuery, GetMahjongHeatmapQueryVariables>;
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
export function useGetMyBadgesQuery(baseOptions?: Apollo.QueryHookOptions<GetMyBadgesQuery, GetMyBadgesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMyBadgesQuery, GetMyBadgesQueryVariables>(GetMyBadgesDocument, options);
      }
export function useGetMyBadgesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMyBadgesQuery, GetMyBadgesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMyBadgesQuery, GetMyBadgesQueryVariables>(GetMyBadgesDocument, options);
        }
// @ts-ignore
export function useGetMyBadgesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetMyBadgesQuery, GetMyBadgesQueryVariables>): Apollo.UseSuspenseQueryResult<GetMyBadgesQuery, GetMyBadgesQueryVariables>;
export function useGetMyBadgesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMyBadgesQuery, GetMyBadgesQueryVariables>): Apollo.UseSuspenseQueryResult<GetMyBadgesQuery | undefined, GetMyBadgesQueryVariables>;
export function useGetMyBadgesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMyBadgesQuery, GetMyBadgesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMyBadgesQuery, GetMyBadgesQueryVariables>(GetMyBadgesDocument, options);
        }
export type GetMyBadgesQueryHookResult = ReturnType<typeof useGetMyBadgesQuery>;
export type GetMyBadgesLazyQueryHookResult = ReturnType<typeof useGetMyBadgesLazyQuery>;
export type GetMyBadgesSuspenseQueryHookResult = ReturnType<typeof useGetMyBadgesSuspenseQuery>;
export type GetMyBadgesQueryResult = Apollo.QueryResult<GetMyBadgesQuery, GetMyBadgesQueryVariables>;
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
export function useGetMyRankingsQuery(baseOptions?: Apollo.QueryHookOptions<GetMyRankingsQuery, GetMyRankingsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMyRankingsQuery, GetMyRankingsQueryVariables>(GetMyRankingsDocument, options);
      }
export function useGetMyRankingsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMyRankingsQuery, GetMyRankingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMyRankingsQuery, GetMyRankingsQueryVariables>(GetMyRankingsDocument, options);
        }
// @ts-ignore
export function useGetMyRankingsSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetMyRankingsQuery, GetMyRankingsQueryVariables>): Apollo.UseSuspenseQueryResult<GetMyRankingsQuery, GetMyRankingsQueryVariables>;
export function useGetMyRankingsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMyRankingsQuery, GetMyRankingsQueryVariables>): Apollo.UseSuspenseQueryResult<GetMyRankingsQuery | undefined, GetMyRankingsQueryVariables>;
export function useGetMyRankingsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMyRankingsQuery, GetMyRankingsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMyRankingsQuery, GetMyRankingsQueryVariables>(GetMyRankingsDocument, options);
        }
export type GetMyRankingsQueryHookResult = ReturnType<typeof useGetMyRankingsQuery>;
export type GetMyRankingsLazyQueryHookResult = ReturnType<typeof useGetMyRankingsLazyQuery>;
export type GetMyRankingsSuspenseQueryHookResult = ReturnType<typeof useGetMyRankingsSuspenseQuery>;
export type GetMyRankingsQueryResult = Apollo.QueryResult<GetMyRankingsQuery, GetMyRankingsQueryVariables>;
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
export function useGetUserBadgesQuery(baseOptions: Apollo.QueryHookOptions<GetUserBadgesQuery, GetUserBadgesQueryVariables> & ({ variables: GetUserBadgesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetUserBadgesQuery, GetUserBadgesQueryVariables>(GetUserBadgesDocument, options);
      }
export function useGetUserBadgesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetUserBadgesQuery, GetUserBadgesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetUserBadgesQuery, GetUserBadgesQueryVariables>(GetUserBadgesDocument, options);
        }
// @ts-ignore
export function useGetUserBadgesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetUserBadgesQuery, GetUserBadgesQueryVariables>): Apollo.UseSuspenseQueryResult<GetUserBadgesQuery, GetUserBadgesQueryVariables>;
export function useGetUserBadgesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetUserBadgesQuery, GetUserBadgesQueryVariables>): Apollo.UseSuspenseQueryResult<GetUserBadgesQuery | undefined, GetUserBadgesQueryVariables>;
export function useGetUserBadgesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetUserBadgesQuery, GetUserBadgesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetUserBadgesQuery, GetUserBadgesQueryVariables>(GetUserBadgesDocument, options);
        }
export type GetUserBadgesQueryHookResult = ReturnType<typeof useGetUserBadgesQuery>;
export type GetUserBadgesLazyQueryHookResult = ReturnType<typeof useGetUserBadgesLazyQuery>;
export type GetUserBadgesSuspenseQueryHookResult = ReturnType<typeof useGetUserBadgesSuspenseQuery>;
export type GetUserBadgesQueryResult = Apollo.QueryResult<GetUserBadgesQuery, GetUserBadgesQueryVariables>;
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
export function useGetMahjongMatchHistoryQuery(baseOptions?: Apollo.QueryHookOptions<GetMahjongMatchHistoryQuery, GetMahjongMatchHistoryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMahjongMatchHistoryQuery, GetMahjongMatchHistoryQueryVariables>(GetMahjongMatchHistoryDocument, options);
      }
export function useGetMahjongMatchHistoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMahjongMatchHistoryQuery, GetMahjongMatchHistoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMahjongMatchHistoryQuery, GetMahjongMatchHistoryQueryVariables>(GetMahjongMatchHistoryDocument, options);
        }
// @ts-ignore
export function useGetMahjongMatchHistorySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetMahjongMatchHistoryQuery, GetMahjongMatchHistoryQueryVariables>): Apollo.UseSuspenseQueryResult<GetMahjongMatchHistoryQuery, GetMahjongMatchHistoryQueryVariables>;
export function useGetMahjongMatchHistorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMahjongMatchHistoryQuery, GetMahjongMatchHistoryQueryVariables>): Apollo.UseSuspenseQueryResult<GetMahjongMatchHistoryQuery | undefined, GetMahjongMatchHistoryQueryVariables>;
export function useGetMahjongMatchHistorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMahjongMatchHistoryQuery, GetMahjongMatchHistoryQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMahjongMatchHistoryQuery, GetMahjongMatchHistoryQueryVariables>(GetMahjongMatchHistoryDocument, options);
        }
export type GetMahjongMatchHistoryQueryHookResult = ReturnType<typeof useGetMahjongMatchHistoryQuery>;
export type GetMahjongMatchHistoryLazyQueryHookResult = ReturnType<typeof useGetMahjongMatchHistoryLazyQuery>;
export type GetMahjongMatchHistorySuspenseQueryHookResult = ReturnType<typeof useGetMahjongMatchHistorySuspenseQuery>;
export type GetMahjongMatchHistoryQueryResult = Apollo.QueryResult<GetMahjongMatchHistoryQuery, GetMahjongMatchHistoryQueryVariables>;
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
export function useMyMahjongMatchesQuery(baseOptions?: Apollo.QueryHookOptions<MyMahjongMatchesQuery, MyMahjongMatchesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyMahjongMatchesQuery, MyMahjongMatchesQueryVariables>(MyMahjongMatchesDocument, options);
      }
export function useMyMahjongMatchesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyMahjongMatchesQuery, MyMahjongMatchesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyMahjongMatchesQuery, MyMahjongMatchesQueryVariables>(MyMahjongMatchesDocument, options);
        }
// @ts-ignore
export function useMyMahjongMatchesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MyMahjongMatchesQuery, MyMahjongMatchesQueryVariables>): Apollo.UseSuspenseQueryResult<MyMahjongMatchesQuery, MyMahjongMatchesQueryVariables>;
export function useMyMahjongMatchesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyMahjongMatchesQuery, MyMahjongMatchesQueryVariables>): Apollo.UseSuspenseQueryResult<MyMahjongMatchesQuery | undefined, MyMahjongMatchesQueryVariables>;
export function useMyMahjongMatchesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyMahjongMatchesQuery, MyMahjongMatchesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MyMahjongMatchesQuery, MyMahjongMatchesQueryVariables>(MyMahjongMatchesDocument, options);
        }
export type MyMahjongMatchesQueryHookResult = ReturnType<typeof useMyMahjongMatchesQuery>;
export type MyMahjongMatchesLazyQueryHookResult = ReturnType<typeof useMyMahjongMatchesLazyQuery>;
export type MyMahjongMatchesSuspenseQueryHookResult = ReturnType<typeof useMyMahjongMatchesSuspenseQuery>;
export type MyMahjongMatchesQueryResult = Apollo.QueryResult<MyMahjongMatchesQuery, MyMahjongMatchesQueryVariables>;
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
export function useMyMahjongRegistrationQuery(baseOptions?: Apollo.QueryHookOptions<MyMahjongRegistrationQuery, MyMahjongRegistrationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyMahjongRegistrationQuery, MyMahjongRegistrationQueryVariables>(MyMahjongRegistrationDocument, options);
      }
export function useMyMahjongRegistrationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyMahjongRegistrationQuery, MyMahjongRegistrationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyMahjongRegistrationQuery, MyMahjongRegistrationQueryVariables>(MyMahjongRegistrationDocument, options);
        }
// @ts-ignore
export function useMyMahjongRegistrationSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MyMahjongRegistrationQuery, MyMahjongRegistrationQueryVariables>): Apollo.UseSuspenseQueryResult<MyMahjongRegistrationQuery, MyMahjongRegistrationQueryVariables>;
export function useMyMahjongRegistrationSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyMahjongRegistrationQuery, MyMahjongRegistrationQueryVariables>): Apollo.UseSuspenseQueryResult<MyMahjongRegistrationQuery | undefined, MyMahjongRegistrationQueryVariables>;
export function useMyMahjongRegistrationSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyMahjongRegistrationQuery, MyMahjongRegistrationQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MyMahjongRegistrationQuery, MyMahjongRegistrationQueryVariables>(MyMahjongRegistrationDocument, options);
        }
export type MyMahjongRegistrationQueryHookResult = ReturnType<typeof useMyMahjongRegistrationQuery>;
export type MyMahjongRegistrationLazyQueryHookResult = ReturnType<typeof useMyMahjongRegistrationLazyQuery>;
export type MyMahjongRegistrationSuspenseQueryHookResult = ReturnType<typeof useMyMahjongRegistrationSuspenseQuery>;
export type MyMahjongRegistrationQueryResult = Apollo.QueryResult<MyMahjongRegistrationQuery, MyMahjongRegistrationQueryVariables>;
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
export type RegisterMahjongMutationFn = Apollo.MutationFunction<RegisterMahjongMutation, RegisterMahjongMutationVariables>;

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
export function useRegisterMahjongMutation(baseOptions?: Apollo.MutationHookOptions<RegisterMahjongMutation, RegisterMahjongMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RegisterMahjongMutation, RegisterMahjongMutationVariables>(RegisterMahjongDocument, options);
      }
export type RegisterMahjongMutationHookResult = ReturnType<typeof useRegisterMahjongMutation>;
export type RegisterMahjongMutationResult = Apollo.MutationResult<RegisterMahjongMutation>;
export type RegisterMahjongMutationOptions = Apollo.BaseMutationOptions<RegisterMahjongMutation, RegisterMahjongMutationVariables>;
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
export function useNotificationReceivedSubscription(baseOptions: Apollo.SubscriptionHookOptions<NotificationReceivedSubscription, NotificationReceivedSubscriptionVariables> & ({ variables: NotificationReceivedSubscriptionVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<NotificationReceivedSubscription, NotificationReceivedSubscriptionVariables>(NotificationReceivedDocument, options);
      }
export type NotificationReceivedSubscriptionHookResult = ReturnType<typeof useNotificationReceivedSubscription>;
export type NotificationReceivedSubscriptionResult = Apollo.SubscriptionResult<NotificationReceivedSubscription>;
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
export function useWechatOpenConfigQuery(baseOptions?: Apollo.QueryHookOptions<WechatOpenConfigQuery, WechatOpenConfigQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<WechatOpenConfigQuery, WechatOpenConfigQueryVariables>(WechatOpenConfigDocument, options);
      }
export function useWechatOpenConfigLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<WechatOpenConfigQuery, WechatOpenConfigQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<WechatOpenConfigQuery, WechatOpenConfigQueryVariables>(WechatOpenConfigDocument, options);
        }
// @ts-ignore
export function useWechatOpenConfigSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<WechatOpenConfigQuery, WechatOpenConfigQueryVariables>): Apollo.UseSuspenseQueryResult<WechatOpenConfigQuery, WechatOpenConfigQueryVariables>;
export function useWechatOpenConfigSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<WechatOpenConfigQuery, WechatOpenConfigQueryVariables>): Apollo.UseSuspenseQueryResult<WechatOpenConfigQuery | undefined, WechatOpenConfigQueryVariables>;
export function useWechatOpenConfigSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<WechatOpenConfigQuery, WechatOpenConfigQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<WechatOpenConfigQuery, WechatOpenConfigQueryVariables>(WechatOpenConfigDocument, options);
        }
export type WechatOpenConfigQueryHookResult = ReturnType<typeof useWechatOpenConfigQuery>;
export type WechatOpenConfigLazyQueryHookResult = ReturnType<typeof useWechatOpenConfigLazyQuery>;
export type WechatOpenConfigSuspenseQueryHookResult = ReturnType<typeof useWechatOpenConfigSuspenseQuery>;
export type WechatOpenConfigQueryResult = Apollo.QueryResult<WechatOpenConfigQuery, WechatOpenConfigQueryVariables>;
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
export function useSeatUpdatedSubscription(baseOptions: Apollo.SubscriptionHookOptions<SeatUpdatedSubscription, SeatUpdatedSubscriptionVariables> & ({ variables: SeatUpdatedSubscriptionVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<SeatUpdatedSubscription, SeatUpdatedSubscriptionVariables>(SeatUpdatedDocument, options);
      }
export type SeatUpdatedSubscriptionHookResult = ReturnType<typeof useSeatUpdatedSubscription>;
export type SeatUpdatedSubscriptionResult = Apollo.SubscriptionResult<SeatUpdatedSubscription>;
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
export function useTableByCodeQuery(baseOptions: Apollo.QueryHookOptions<TableByCodeQuery, TableByCodeQueryVariables> & ({ variables: TableByCodeQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TableByCodeQuery, TableByCodeQueryVariables>(TableByCodeDocument, options);
      }
export function useTableByCodeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TableByCodeQuery, TableByCodeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TableByCodeQuery, TableByCodeQueryVariables>(TableByCodeDocument, options);
        }
// @ts-ignore
export function useTableByCodeSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TableByCodeQuery, TableByCodeQueryVariables>): Apollo.UseSuspenseQueryResult<TableByCodeQuery, TableByCodeQueryVariables>;
export function useTableByCodeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TableByCodeQuery, TableByCodeQueryVariables>): Apollo.UseSuspenseQueryResult<TableByCodeQuery | undefined, TableByCodeQueryVariables>;
export function useTableByCodeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TableByCodeQuery, TableByCodeQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TableByCodeQuery, TableByCodeQueryVariables>(TableByCodeDocument, options);
        }
export type TableByCodeQueryHookResult = ReturnType<typeof useTableByCodeQuery>;
export type TableByCodeLazyQueryHookResult = ReturnType<typeof useTableByCodeLazyQuery>;
export type TableByCodeSuspenseQueryHookResult = ReturnType<typeof useTableByCodeSuspenseQuery>;
export type TableByCodeQueryResult = Apollo.QueryResult<TableByCodeQuery, TableByCodeQueryVariables>;
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
export function useMyActiveOccupanciesQuery(baseOptions?: Apollo.QueryHookOptions<MyActiveOccupanciesQuery, MyActiveOccupanciesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyActiveOccupanciesQuery, MyActiveOccupanciesQueryVariables>(MyActiveOccupanciesDocument, options);
      }
export function useMyActiveOccupanciesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyActiveOccupanciesQuery, MyActiveOccupanciesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyActiveOccupanciesQuery, MyActiveOccupanciesQueryVariables>(MyActiveOccupanciesDocument, options);
        }
// @ts-ignore
export function useMyActiveOccupanciesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<MyActiveOccupanciesQuery, MyActiveOccupanciesQueryVariables>): Apollo.UseSuspenseQueryResult<MyActiveOccupanciesQuery, MyActiveOccupanciesQueryVariables>;
export function useMyActiveOccupanciesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyActiveOccupanciesQuery, MyActiveOccupanciesQueryVariables>): Apollo.UseSuspenseQueryResult<MyActiveOccupanciesQuery | undefined, MyActiveOccupanciesQueryVariables>;
export function useMyActiveOccupanciesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MyActiveOccupanciesQuery, MyActiveOccupanciesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MyActiveOccupanciesQuery, MyActiveOccupanciesQueryVariables>(MyActiveOccupanciesDocument, options);
        }
export type MyActiveOccupanciesQueryHookResult = ReturnType<typeof useMyActiveOccupanciesQuery>;
export type MyActiveOccupanciesLazyQueryHookResult = ReturnType<typeof useMyActiveOccupanciesLazyQuery>;
export type MyActiveOccupanciesSuspenseQueryHookResult = ReturnType<typeof useMyActiveOccupanciesSuspenseQuery>;
export type MyActiveOccupanciesQueryResult = Apollo.QueryResult<MyActiveOccupanciesQuery, MyActiveOccupanciesQueryVariables>;
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
export type PauseMyOrderMutationFn = Apollo.MutationFunction<PauseMyOrderMutation, PauseMyOrderMutationVariables>;

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
export function usePauseMyOrderMutation(baseOptions?: Apollo.MutationHookOptions<PauseMyOrderMutation, PauseMyOrderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PauseMyOrderMutation, PauseMyOrderMutationVariables>(PauseMyOrderDocument, options);
      }
export type PauseMyOrderMutationHookResult = ReturnType<typeof usePauseMyOrderMutation>;
export type PauseMyOrderMutationResult = Apollo.MutationResult<PauseMyOrderMutation>;
export type PauseMyOrderMutationOptions = Apollo.BaseMutationOptions<PauseMyOrderMutation, PauseMyOrderMutationVariables>;
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
export type OccupyTableMutationFn = Apollo.MutationFunction<OccupyTableMutation, OccupyTableMutationVariables>;

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
export function useOccupyTableMutation(baseOptions?: Apollo.MutationHookOptions<OccupyTableMutation, OccupyTableMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<OccupyTableMutation, OccupyTableMutationVariables>(OccupyTableDocument, options);
      }
export type OccupyTableMutationHookResult = ReturnType<typeof useOccupyTableMutation>;
export type OccupyTableMutationResult = Apollo.MutationResult<OccupyTableMutation>;
export type OccupyTableMutationOptions = Apollo.BaseMutationOptions<OccupyTableMutation, OccupyTableMutationVariables>;
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
export type CreateTempIdentityMutationFn = Apollo.MutationFunction<CreateTempIdentityMutation, CreateTempIdentityMutationVariables>;

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
export function useCreateTempIdentityMutation(baseOptions?: Apollo.MutationHookOptions<CreateTempIdentityMutation, CreateTempIdentityMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateTempIdentityMutation, CreateTempIdentityMutationVariables>(CreateTempIdentityDocument, options);
      }
export type CreateTempIdentityMutationHookResult = ReturnType<typeof useCreateTempIdentityMutation>;
export type CreateTempIdentityMutationResult = Apollo.MutationResult<CreateTempIdentityMutation>;
export type CreateTempIdentityMutationOptions = Apollo.BaseMutationOptions<CreateTempIdentityMutation, CreateTempIdentityMutationVariables>;
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
export function useValidateTempIdentityQuery(baseOptions: Apollo.QueryHookOptions<ValidateTempIdentityQuery, ValidateTempIdentityQueryVariables> & ({ variables: ValidateTempIdentityQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ValidateTempIdentityQuery, ValidateTempIdentityQueryVariables>(ValidateTempIdentityDocument, options);
      }
export function useValidateTempIdentityLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ValidateTempIdentityQuery, ValidateTempIdentityQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ValidateTempIdentityQuery, ValidateTempIdentityQueryVariables>(ValidateTempIdentityDocument, options);
        }
// @ts-ignore
export function useValidateTempIdentitySuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<ValidateTempIdentityQuery, ValidateTempIdentityQueryVariables>): Apollo.UseSuspenseQueryResult<ValidateTempIdentityQuery, ValidateTempIdentityQueryVariables>;
export function useValidateTempIdentitySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ValidateTempIdentityQuery, ValidateTempIdentityQueryVariables>): Apollo.UseSuspenseQueryResult<ValidateTempIdentityQuery | undefined, ValidateTempIdentityQueryVariables>;
export function useValidateTempIdentitySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ValidateTempIdentityQuery, ValidateTempIdentityQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ValidateTempIdentityQuery, ValidateTempIdentityQueryVariables>(ValidateTempIdentityDocument, options);
        }
export type ValidateTempIdentityQueryHookResult = ReturnType<typeof useValidateTempIdentityQuery>;
export type ValidateTempIdentityLazyQueryHookResult = ReturnType<typeof useValidateTempIdentityLazyQuery>;
export type ValidateTempIdentitySuspenseQueryHookResult = ReturnType<typeof useValidateTempIdentitySuspenseQuery>;
export type ValidateTempIdentityQueryResult = Apollo.QueryResult<ValidateTempIdentityQuery, ValidateTempIdentityQueryVariables>;
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
export function useTempIdentityActiveOccupanciesQuery(baseOptions: Apollo.QueryHookOptions<TempIdentityActiveOccupanciesQuery, TempIdentityActiveOccupanciesQueryVariables> & ({ variables: TempIdentityActiveOccupanciesQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TempIdentityActiveOccupanciesQuery, TempIdentityActiveOccupanciesQueryVariables>(TempIdentityActiveOccupanciesDocument, options);
      }
export function useTempIdentityActiveOccupanciesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TempIdentityActiveOccupanciesQuery, TempIdentityActiveOccupanciesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TempIdentityActiveOccupanciesQuery, TempIdentityActiveOccupanciesQueryVariables>(TempIdentityActiveOccupanciesDocument, options);
        }
// @ts-ignore
export function useTempIdentityActiveOccupanciesSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<TempIdentityActiveOccupanciesQuery, TempIdentityActiveOccupanciesQueryVariables>): Apollo.UseSuspenseQueryResult<TempIdentityActiveOccupanciesQuery, TempIdentityActiveOccupanciesQueryVariables>;
export function useTempIdentityActiveOccupanciesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TempIdentityActiveOccupanciesQuery, TempIdentityActiveOccupanciesQueryVariables>): Apollo.UseSuspenseQueryResult<TempIdentityActiveOccupanciesQuery | undefined, TempIdentityActiveOccupanciesQueryVariables>;
export function useTempIdentityActiveOccupanciesSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TempIdentityActiveOccupanciesQuery, TempIdentityActiveOccupanciesQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TempIdentityActiveOccupanciesQuery, TempIdentityActiveOccupanciesQueryVariables>(TempIdentityActiveOccupanciesDocument, options);
        }
export type TempIdentityActiveOccupanciesQueryHookResult = ReturnType<typeof useTempIdentityActiveOccupanciesQuery>;
export type TempIdentityActiveOccupanciesLazyQueryHookResult = ReturnType<typeof useTempIdentityActiveOccupanciesLazyQuery>;
export type TempIdentityActiveOccupanciesSuspenseQueryHookResult = ReturnType<typeof useTempIdentityActiveOccupanciesSuspenseQuery>;
export type TempIdentityActiveOccupanciesQueryResult = Apollo.QueryResult<TempIdentityActiveOccupanciesQuery, TempIdentityActiveOccupanciesQueryVariables>;
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
export type TransferTempIdentityMutationFn = Apollo.MutationFunction<TransferTempIdentityMutation, TransferTempIdentityMutationVariables>;

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
export function useTransferTempIdentityMutation(baseOptions?: Apollo.MutationHookOptions<TransferTempIdentityMutation, TransferTempIdentityMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<TransferTempIdentityMutation, TransferTempIdentityMutationVariables>(TransferTempIdentityDocument, options);
      }
export type TransferTempIdentityMutationHookResult = ReturnType<typeof useTransferTempIdentityMutation>;
export type TransferTempIdentityMutationResult = Apollo.MutationResult<TransferTempIdentityMutation>;
export type TransferTempIdentityMutationOptions = Apollo.BaseMutationOptions<TransferTempIdentityMutation, TransferTempIdentityMutationVariables>;
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
export type OccupyTableWithTempIdentityMutationFn = Apollo.MutationFunction<OccupyTableWithTempIdentityMutation, OccupyTableWithTempIdentityMutationVariables>;

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
export function useOccupyTableWithTempIdentityMutation(baseOptions?: Apollo.MutationHookOptions<OccupyTableWithTempIdentityMutation, OccupyTableWithTempIdentityMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<OccupyTableWithTempIdentityMutation, OccupyTableWithTempIdentityMutationVariables>(OccupyTableWithTempIdentityDocument, options);
      }
export type OccupyTableWithTempIdentityMutationHookResult = ReturnType<typeof useOccupyTableWithTempIdentityMutation>;
export type OccupyTableWithTempIdentityMutationResult = Apollo.MutationResult<OccupyTableWithTempIdentityMutation>;
export type OccupyTableWithTempIdentityMutationOptions = Apollo.BaseMutationOptions<OccupyTableWithTempIdentityMutation, OccupyTableWithTempIdentityMutationVariables>;
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
export function useGetMyBusinessCardQuery(baseOptions?: Apollo.QueryHookOptions<GetMyBusinessCardQuery, GetMyBusinessCardQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMyBusinessCardQuery, GetMyBusinessCardQueryVariables>(GetMyBusinessCardDocument, options);
      }
export function useGetMyBusinessCardLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMyBusinessCardQuery, GetMyBusinessCardQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMyBusinessCardQuery, GetMyBusinessCardQueryVariables>(GetMyBusinessCardDocument, options);
        }
// @ts-ignore
export function useGetMyBusinessCardSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetMyBusinessCardQuery, GetMyBusinessCardQueryVariables>): Apollo.UseSuspenseQueryResult<GetMyBusinessCardQuery, GetMyBusinessCardQueryVariables>;
export function useGetMyBusinessCardSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMyBusinessCardQuery, GetMyBusinessCardQueryVariables>): Apollo.UseSuspenseQueryResult<GetMyBusinessCardQuery | undefined, GetMyBusinessCardQueryVariables>;
export function useGetMyBusinessCardSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMyBusinessCardQuery, GetMyBusinessCardQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMyBusinessCardQuery, GetMyBusinessCardQueryVariables>(GetMyBusinessCardDocument, options);
        }
export type GetMyBusinessCardQueryHookResult = ReturnType<typeof useGetMyBusinessCardQuery>;
export type GetMyBusinessCardLazyQueryHookResult = ReturnType<typeof useGetMyBusinessCardLazyQuery>;
export type GetMyBusinessCardSuspenseQueryHookResult = ReturnType<typeof useGetMyBusinessCardSuspenseQuery>;
export type GetMyBusinessCardQueryResult = Apollo.QueryResult<GetMyBusinessCardQuery, GetMyBusinessCardQueryVariables>;
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
export type UpsertBusinessCardMutationFn = Apollo.MutationFunction<UpsertBusinessCardMutation, UpsertBusinessCardMutationVariables>;

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
export function useUpsertBusinessCardMutation(baseOptions?: Apollo.MutationHookOptions<UpsertBusinessCardMutation, UpsertBusinessCardMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpsertBusinessCardMutation, UpsertBusinessCardMutationVariables>(UpsertBusinessCardDocument, options);
      }
export type UpsertBusinessCardMutationHookResult = ReturnType<typeof useUpsertBusinessCardMutation>;
export type UpsertBusinessCardMutationResult = Apollo.MutationResult<UpsertBusinessCardMutation>;
export type UpsertBusinessCardMutationOptions = Apollo.BaseMutationOptions<UpsertBusinessCardMutation, UpsertBusinessCardMutationVariables>;
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
export function useGetMyMembershipPlansQuery(baseOptions?: Apollo.QueryHookOptions<GetMyMembershipPlansQuery, GetMyMembershipPlansQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetMyMembershipPlansQuery, GetMyMembershipPlansQueryVariables>(GetMyMembershipPlansDocument, options);
      }
export function useGetMyMembershipPlansLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetMyMembershipPlansQuery, GetMyMembershipPlansQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetMyMembershipPlansQuery, GetMyMembershipPlansQueryVariables>(GetMyMembershipPlansDocument, options);
        }
// @ts-ignore
export function useGetMyMembershipPlansSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetMyMembershipPlansQuery, GetMyMembershipPlansQueryVariables>): Apollo.UseSuspenseQueryResult<GetMyMembershipPlansQuery, GetMyMembershipPlansQueryVariables>;
export function useGetMyMembershipPlansSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMyMembershipPlansQuery, GetMyMembershipPlansQueryVariables>): Apollo.UseSuspenseQueryResult<GetMyMembershipPlansQuery | undefined, GetMyMembershipPlansQueryVariables>;
export function useGetMyMembershipPlansSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetMyMembershipPlansQuery, GetMyMembershipPlansQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetMyMembershipPlansQuery, GetMyMembershipPlansQueryVariables>(GetMyMembershipPlansDocument, options);
        }
export type GetMyMembershipPlansQueryHookResult = ReturnType<typeof useGetMyMembershipPlansQuery>;
export type GetMyMembershipPlansLazyQueryHookResult = ReturnType<typeof useGetMyMembershipPlansLazyQuery>;
export type GetMyMembershipPlansSuspenseQueryHookResult = ReturnType<typeof useGetMyMembershipPlansSuspenseQuery>;
export type GetMyMembershipPlansQueryResult = Apollo.QueryResult<GetMyMembershipPlansQuery, GetMyMembershipPlansQueryVariables>;
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
      role
      nickname
      phone
      preferredLocale
      preferredStoreId
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
export type UpdateMyUserInfoMutationFn = Apollo.MutationFunction<UpdateMyUserInfoMutation, UpdateMyUserInfoMutationVariables>;

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
export function useUpdateMyUserInfoMutation(baseOptions?: Apollo.MutationHookOptions<UpdateMyUserInfoMutation, UpdateMyUserInfoMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateMyUserInfoMutation, UpdateMyUserInfoMutationVariables>(UpdateMyUserInfoDocument, options);
      }
export type UpdateMyUserInfoMutationHookResult = ReturnType<typeof useUpdateMyUserInfoMutation>;
export type UpdateMyUserInfoMutationResult = Apollo.MutationResult<UpdateMyUserInfoMutation>;
export type UpdateMyUserInfoMutationOptions = Apollo.BaseMutationOptions<UpdateMyUserInfoMutation, UpdateMyUserInfoMutationVariables>;
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
export type UpdateMyPreferencesMutationFn = Apollo.MutationFunction<UpdateMyPreferencesMutation, UpdateMyPreferencesMutationVariables>;

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
export function useUpdateMyPreferencesMutation(baseOptions?: Apollo.MutationHookOptions<UpdateMyPreferencesMutation, UpdateMyPreferencesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateMyPreferencesMutation, UpdateMyPreferencesMutationVariables>(UpdateMyPreferencesDocument, options);
      }
export type UpdateMyPreferencesMutationHookResult = ReturnType<typeof useUpdateMyPreferencesMutation>;
export type UpdateMyPreferencesMutationResult = Apollo.MutationResult<UpdateMyPreferencesMutation>;
export type UpdateMyPreferencesMutationOptions = Apollo.BaseMutationOptions<UpdateMyPreferencesMutation, UpdateMyPreferencesMutationVariables>;
export const RequestSmsCodeDocument = gql`
    mutation RequestSmsCode($input: RequestSmsCodeInput!) {
  requestSmsCode(input: $input) {
    success
    message
    expiresInMs
  }
}
    `;
export type RequestSmsCodeMutationFn = Apollo.MutationFunction<RequestSmsCodeMutation, RequestSmsCodeMutationVariables>;

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
export function useRequestSmsCodeMutation(baseOptions?: Apollo.MutationHookOptions<RequestSmsCodeMutation, RequestSmsCodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RequestSmsCodeMutation, RequestSmsCodeMutationVariables>(RequestSmsCodeDocument, options);
      }
export type RequestSmsCodeMutationHookResult = ReturnType<typeof useRequestSmsCodeMutation>;
export type RequestSmsCodeMutationResult = Apollo.MutationResult<RequestSmsCodeMutation>;
export type RequestSmsCodeMutationOptions = Apollo.BaseMutationOptions<RequestSmsCodeMutation, RequestSmsCodeMutationVariables>;
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
export function useGetTotpSecretQuery(baseOptions?: Apollo.QueryHookOptions<GetTotpSecretQuery, GetTotpSecretQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetTotpSecretQuery, GetTotpSecretQueryVariables>(GetTotpSecretDocument, options);
      }
export function useGetTotpSecretLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetTotpSecretQuery, GetTotpSecretQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetTotpSecretQuery, GetTotpSecretQueryVariables>(GetTotpSecretDocument, options);
        }
// @ts-ignore
export function useGetTotpSecretSuspenseQuery(baseOptions?: Apollo.SuspenseQueryHookOptions<GetTotpSecretQuery, GetTotpSecretQueryVariables>): Apollo.UseSuspenseQueryResult<GetTotpSecretQuery, GetTotpSecretQueryVariables>;
export function useGetTotpSecretSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTotpSecretQuery, GetTotpSecretQueryVariables>): Apollo.UseSuspenseQueryResult<GetTotpSecretQuery | undefined, GetTotpSecretQueryVariables>;
export function useGetTotpSecretSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTotpSecretQuery, GetTotpSecretQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetTotpSecretQuery, GetTotpSecretQueryVariables>(GetTotpSecretDocument, options);
        }
export type GetTotpSecretQueryHookResult = ReturnType<typeof useGetTotpSecretQuery>;
export type GetTotpSecretLazyQueryHookResult = ReturnType<typeof useGetTotpSecretLazyQuery>;
export type GetTotpSecretSuspenseQueryHookResult = ReturnType<typeof useGetTotpSecretSuspenseQuery>;
export type GetTotpSecretQueryResult = Apollo.QueryResult<GetTotpSecretQuery, GetTotpSecretQueryVariables>;