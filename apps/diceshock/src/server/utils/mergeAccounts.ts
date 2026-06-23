import type db from "@lib/db";
import {
  accounts,
  activeRegistrationsTable,
  activesTable,
  drizzle,
  userBusinessCardTable,
  userInfoTable,
  userMembershipPlansTable,
  userPreferencesTable,
  users,
} from "@lib/db";

export interface MergeResult {
  accountsMoved: number;
  registrationsMoved: number;
  activesReassigned: number;
  preferencesMoved: number;
  businessCardMoved: boolean;
  membershipsMoved: number;
  pointsMerged: number;
}

type Database = ReturnType<typeof db>;
type UserPreference = typeof userPreferencesTable.$inferSelect;

const { and, eq, inArray, sql } = drizzle;

function uniqueValues(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => value != null))];
}

function preferenceKey(preference: UserPreference): string {
  return JSON.stringify({
    rawText: preference.raw_text,
    rrule: preference.rrule,
    categories: preference.categories ?? [],
    playerCount: preference.player_count ?? null,
  });
}

export async function mergeAccounts(
  database: Database,
  fromUserId: string,
  toUserId: string,
): Promise<MergeResult> {
  if (fromUserId === toUserId) {
    return {
      accountsMoved: 0,
      registrationsMoved: 0,
      activesReassigned: 0,
      preferencesMoved: 0,
      businessCardMoved: false,
      membershipsMoved: 0,
      pointsMerged: 0,
    };
  }

  const [
    fromAccounts,
    fromRegistrations,
    toRegistrations,
    fromActives,
    fromPreferences,
    toPreferences,
    fromBusinessCard,
    toBusinessCard,
    fromMemberships,
    fromUserInfo,
  ] = await Promise.all([
    database
      .select({ userId: accounts.userId })
      .from(accounts)
      .where(eq(accounts.userId, fromUserId)),
    database
      .select({
        id: activeRegistrationsTable.id,
        activeId: activeRegistrationsTable.active_id,
      })
      .from(activeRegistrationsTable)
      .where(eq(activeRegistrationsTable.user_id, fromUserId)),
    database
      .select({ activeId: activeRegistrationsTable.active_id })
      .from(activeRegistrationsTable)
      .where(eq(activeRegistrationsTable.user_id, toUserId)),
    database
      .select({ id: activesTable.id })
      .from(activesTable)
      .where(eq(activesTable.creator_id, fromUserId)),
    database
      .select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.user_id, fromUserId)),
    database
      .select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.user_id, toUserId)),
    database
      .select({ id: userBusinessCardTable.id })
      .from(userBusinessCardTable)
      .where(eq(userBusinessCardTable.id, fromUserId))
      .limit(1),
    database
      .select({ id: userBusinessCardTable.id })
      .from(userBusinessCardTable)
      .where(eq(userBusinessCardTable.id, toUserId))
      .limit(1),
    database
      .select({ id: userMembershipPlansTable.id })
      .from(userMembershipPlansTable)
      .where(eq(userMembershipPlansTable.user_id, fromUserId)),
    database
      .select({ points: userInfoTable.points })
      .from(userInfoTable)
      .where(eq(userInfoTable.id, fromUserId))
      .limit(1),
  ]);

  const toActiveIds = new Set(
    toRegistrations.map((registration) => registration.activeId),
  );
  const registrationsToMove = fromRegistrations.filter(
    (registration) => !toActiveIds.has(registration.activeId),
  );
  const registrationsToDelete = fromRegistrations.filter((registration) =>
    toActiveIds.has(registration.activeId),
  );

  const toPreferenceKeys = new Set(toPreferences.map(preferenceKey));
  const preferencesToMove = fromPreferences.filter(
    (preference) => !toPreferenceKeys.has(preferenceKey(preference)),
  );
  const preferencesToDelete = fromPreferences.filter((preference) =>
    toPreferenceKeys.has(preferenceKey(preference)),
  );

  const hasFromBusinessCard = fromBusinessCard.length > 0;
  const shouldMoveBusinessCard =
    hasFromBusinessCard && toBusinessCard.length === 0;
  const shouldDeleteBusinessCard =
    hasFromBusinessCard && !shouldMoveBusinessCard;
  const pointsMerged = fromUserInfo[0]?.points ?? 0;

  const registrationIdsToMove = uniqueValues(
    registrationsToMove.map((registration) => registration.id),
  );
  const registrationIdsToDelete = uniqueValues(
    registrationsToDelete.map((registration) => registration.id),
  );
  const preferenceIdsToMove = uniqueValues(
    preferencesToMove.map((preference) => preference.id),
  );
  const preferenceIdsToDelete = uniqueValues(
    preferencesToDelete.map((preference) => preference.id),
  );

  await database.batch([
    database
      .update(accounts)
      .set({ userId: toUserId })
      .where(eq(accounts.userId, fromUserId)),
    ...(registrationIdsToMove.length > 0
      ? [
          database
            .update(activeRegistrationsTable)
            .set({ user_id: toUserId })
            .where(inArray(activeRegistrationsTable.id, registrationIdsToMove)),
        ]
      : []),
    ...(registrationIdsToDelete.length > 0
      ? [
          database
            .delete(activeRegistrationsTable)
            .where(
              inArray(activeRegistrationsTable.id, registrationIdsToDelete),
            ),
        ]
      : []),
    database
      .update(activesTable)
      .set({ creator_id: toUserId })
      .where(eq(activesTable.creator_id, fromUserId)),
    ...(preferenceIdsToMove.length > 0
      ? [
          database
            .update(userPreferencesTable)
            .set({ user_id: toUserId })
            .where(inArray(userPreferencesTable.id, preferenceIdsToMove)),
        ]
      : []),
    ...(preferenceIdsToDelete.length > 0
      ? [
          database
            .delete(userPreferencesTable)
            .where(inArray(userPreferencesTable.id, preferenceIdsToDelete)),
        ]
      : []),
    ...(shouldMoveBusinessCard
      ? [
          database
            .update(userBusinessCardTable)
            .set({ id: toUserId })
            .where(eq(userBusinessCardTable.id, fromUserId)),
        ]
      : []),
    ...(shouldDeleteBusinessCard
      ? [
          database
            .delete(userBusinessCardTable)
            .where(eq(userBusinessCardTable.id, fromUserId)),
        ]
      : []),
    database
      .update(userMembershipPlansTable)
      .set({ user_id: toUserId })
      .where(eq(userMembershipPlansTable.user_id, fromUserId)),
    database
      .update(userInfoTable)
      .set({ points: sql`${userInfoTable.points} + ${pointsMerged}` })
      .where(eq(userInfoTable.id, toUserId)),
    database.delete(userInfoTable).where(eq(userInfoTable.id, fromUserId)),
    database.delete(users).where(and(eq(users.id, fromUserId))),
  ]);

  return {
    accountsMoved: fromAccounts.length,
    registrationsMoved: registrationsToMove.length,
    activesReassigned: fromActives.length,
    preferencesMoved: preferencesToMove.length,
    businessCardMoved: shouldMoveBusinessCard,
    membershipsMoved: fromMemberships.length,
    pointsMerged,
  };
}
