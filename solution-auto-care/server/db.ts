import { and, count, desc, eq, gt, inArray, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertMemberPreviewHistory,
  InsertUser,
  memberPreviewHistory,
  users,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createMemberPreviewHistory(
  input: InsertMemberPreviewHistory,
) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const [result] = await db.insert(memberPreviewHistory).values(input);
  return getMemberPreviewHistoryById(Number(result.insertId));
}

export async function getMemberPreviewHistoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [item] = await db
    .select()
    .from(memberPreviewHistory)
    .where(eq(memberPreviewHistory.id, id))
    .limit(1);
  return item;
}

export async function listMemberPreviewHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(memberPreviewHistory)
    .where(eq(memberPreviewHistory.userId, userId))
    .orderBy(desc(memberPreviewHistory.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}

export async function saveMemberPreviewHistory(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db
    .update(memberPreviewHistory)
    .set({ isSaved: 1, retentionDays: 30, expiresAt })
    .where(
      and(
        eq(memberPreviewHistory.id, id),
        eq(memberPreviewHistory.userId, userId),
      ),
    );
  const [item] = await db
    .select()
    .from(memberPreviewHistory)
    .where(
      and(
        eq(memberPreviewHistory.id, id),
        eq(memberPreviewHistory.userId, userId),
      ),
    )
    .limit(1);
  return item;
}

export async function listAdminMemberPreviewHistory(
  userId: number,
  limit = 100,
) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  return db
    .select()
    .from(memberPreviewHistory)
    .where(eq(memberPreviewHistory.userId, userId))
    .orderBy(desc(memberPreviewHistory.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}

export async function getAdminMemberDirectory(search: string, limit = 200) {
  const db = await getDb();
  if (!db) throw new Error("DATABASE_UNAVAILABLE");
  const normalizedSearch = search.trim();
  const memberWhere = normalizedSearch
    ? or(
        like(users.name, `%${normalizedSearch}%`),
        like(users.email, `%${normalizedSearch}%`),
      )
    : undefined;
  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      loginMethod: users.loginMethod,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .where(memberWhere)
    .orderBy(desc(users.lastSignedIn))
    .limit(Math.min(Math.max(limit, 1), 200));

  const memberIds = members.map(member => member.id);
  const previews = memberIds.length
    ? await db
        .select()
        .from(memberPreviewHistory)
        .where(inArray(memberPreviewHistory.userId, memberIds))
        .orderBy(desc(memberPreviewHistory.createdAt))
    : [];
  const previewByMember = new Map<number, typeof previews>();
  for (const preview of previews) {
    const current = previewByMember.get(preview.userId) ?? [];
    current.push(preview);
    previewByMember.set(preview.userId, current);
  }
  const memberRows = members.map(member => ({
    ...member,
    previewCount: previewByMember.get(member.id)?.length ?? 0,
    savedPreviewCount:
      previewByMember.get(member.id)?.filter(preview => preview.isSaved === 1)
        .length ?? 0,
  }));

  const [totalMembersRow, totalPreviewsRow] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(memberPreviewHistory),
  ]);
  const since7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const since30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [newMembersRow, activeMembersRow] = await Promise.all([
    db.select({ value: count() }).from(users).where(gt(users.createdAt, since7Days)),
    db.select({ value: count() }).from(users).where(gt(users.lastSignedIn, since30Days)),
  ]);
  return {
    summary: {
      totalMembers: Number(totalMembersRow[0]?.value ?? 0),
      newMembersLast7Days: Number(newMembersRow[0]?.value ?? 0),
      activeMembersLast30Days: Number(activeMembersRow[0]?.value ?? 0),
      totalPreviews: Number(totalPreviewsRow[0]?.value ?? 0),
    },
    members: memberRows,
  };
}
