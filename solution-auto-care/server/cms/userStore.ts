import { get as blobGet, put as blobPut } from "@vercel/blob";
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as callbackScrypt,
  timingSafeEqual,
} from "node:crypto";
import {
  CmsAuthError,
  CmsConflictError,
  CmsStorageError,
  CmsValidationError,
} from "./errors";
import type { CmsBlobClient, CmsBlobGetResult } from "./store";

function deriveScrypt(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: { N: number; r: number; p: number; maxmem: number }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    callbackScrypt(password, salt, keyLength, options, (error, derived) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derived as Buffer);
    });
  });
}

export const CMS_AUTH_COOKIE = "solution_cms_session";
export const CMS_AUTH_DOCUMENT_PREFIX = "cms/auth";
export const CMS_AUTH_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const CMS_AUTH_MAX_USERS = 100;
export const CMS_AUTH_MAX_SESSIONS = 500;
export const CMS_AUTH_MAX_PASSWORD_LENGTH = 256;
export const CMS_AUTH_MIN_PASSWORD_LENGTH = 12;
export const CMS_AUTH_MAX_USERNAME_LENGTH = 32;
export const CMS_AUTH_MAX_NAME_LENGTH = 120;
export const CMS_AUTH_MAX_REVISION_LENGTH = 200;

const LOGIN_FAILURE_LIMIT = 5;
const LOGIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;
const BOOTSTRAP_ATTEMPT_LIMIT = 5;
const BOOTSTRAP_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const BOOTSTRAP_LIMIT_CAS_RETRIES = 5;
const LOGIN_FAILURE_CAS_RETRIES = 5;
const IP_THROTTLE_LIMIT = 20;
const IP_THROTTLE_WINDOW_MS = 15 * 60 * 1000;
const IP_THROTTLE_MAX_ENTRIES = 4096;
const SCRYPT_KEY_LENGTH = 32;
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAXMEM = 32 * 1024 * 1024;

export type CmsAuthRole = "owner" | "editor";

export type CmsPrincipal = {
  role: "admin";
  cmsRole: CmsAuthRole;
  id: string;
  username: string;
  name?: string;
  mustChangePassword: boolean;
};

export type CmsAuthAccount = {
  id: string;
  username: string;
  name?: string;
  role: CmsAuthRole;
  enabled: boolean;
  removed: boolean;
  passwordHash: string;
  mustChangePassword: boolean;
  sessionVersion: number;
  createdAt: string;
  failedAttempts: number;
  failedWindowStartedAt: string | null;
  lockedUntil: string | null;
};

export type CmsAuthSession = {
  tokenHash: string;
  accountId: string;
  sessionVersion: number;
  createdAt: string;
  expiresAt: string;
};

export type CmsAuthDocument = {
  schemaVersion: 1;
  revision: string;
  accounts: CmsAuthAccount[];
  sessions: CmsAuthSession[];
};

export type CmsAuthSnapshot = {
  document: CmsAuthDocument | null;
  etag: string | null;
  exists: boolean;
};

export type CmsLoginResult = {
  principal: CmsPrincipal;
  sessionToken: string;
};

export type CmsUsersResult = {
  users: CmsUserSummary[];
  revision: string;
};

export type CmsUserSummary = {
  id: string;
  username: string;
  name?: string;
  role: CmsAuthRole;
  enabled: boolean;
  mustChangePassword: boolean;
  createdAt: string;
};

export type CmsAuthBlobClient = CmsBlobClient;

type CmsBlobPutOptions = {
  access: "private";
  allowOverwrite: boolean;
  contentType?: string;
  ifMatch?: string;
};

type IpThrottleState = {
  windowStartedAt: number;
  failures: number;
  blockedUntil: number;
};

type CmsBootstrapLimitDocument = {
  schemaVersion: 1;
  windowStartedAt: string;
  attempts: number;
};

type CmsBootstrapLimitSnapshot = {
  document: CmsBootstrapLimitDocument | null;
  etag: string | null;
  exists: boolean;
};

const ipThrottle = new Map<string, IpThrottleState>();

const defaultBlobClient: CmsAuthBlobClient = {
  get: blobGet as unknown as CmsAuthBlobClient["get"],
  put: blobPut as unknown as CmsAuthBlobClient["put"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isKnownEnvironment(
  value: string | undefined
): value is "production" | "preview" | "development" {
  return (
    value === "production" || value === "preview" || value === "development"
  );
}

export function getCmsAuthPath(environment = process.env.VERCEL_ENV): string {
  const selected = isKnownEnvironment(environment)
    ? environment
    : "development";
  return `${CMS_AUTH_DOCUMENT_PREFIX}/${selected}.json`;
}

export function getCmsBootstrapLimitPath(authPath: string): string {
  return authPath.endsWith(".json")
    ? `${authPath.slice(0, -5)}-bootstrap-limit.json`
    : `${authPath}-bootstrap-limit.json`;
}

function isBlobConfiguredByEnvironment(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)
  );
}

function isBlobConflict(error: unknown): boolean {
  if (!isRecord(error)) return false;
  const name = typeof error.name === "string" ? error.name : "";
  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message : "";
  const status = error.status ?? error.statusCode;
  return (
    name.includes("Precondition") ||
    code.includes("Precondition") ||
    name.includes("AlreadyExists") ||
    code.includes("AlreadyExists") ||
    /already exists|overwrite/i.test(message) ||
    status === 409 ||
    status === 412
  );
}

async function readStream(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  try {
    return Buffer.from(await new Response(stream).arrayBuffer());
  } catch {
    throw new CmsStorageError();
  }
}

function validDateString(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function parseOptionalName(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > CMS_AUTH_MAX_NAME_LENGTH
  ) {
    throw new CmsStorageError("CMS authentication document is invalid.");
  }
  return value;
}

export function normalizeCmsUsername(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 3 ||
    value.length > CMS_AUTH_MAX_USERNAME_LENGTH
  ) {
    throw new CmsValidationError("Username is invalid.");
  }
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new CmsValidationError("Username is invalid.");
  }
  return value.toLowerCase();
}

function parseUsername(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length < 3 ||
    value.length > CMS_AUTH_MAX_USERNAME_LENGTH
  ) {
    throw new CmsStorageError("CMS authentication document is invalid.");
  }
  if (!/^[a-z0-9_-]+$/.test(value)) {
    throw new CmsStorageError("CMS authentication document is invalid.");
  }
  return value;
}

export function validateCmsPassword(
  value: unknown,
  field = "Password"
): string {
  if (
    typeof value !== "string" ||
    value.length < CMS_AUTH_MIN_PASSWORD_LENGTH ||
    value.length > CMS_AUTH_MAX_PASSWORD_LENGTH
  ) {
    throw new CmsValidationError(
      `${field} must be between ${CMS_AUTH_MIN_PASSWORD_LENGTH} and ${CMS_AUTH_MAX_PASSWORD_LENGTH} characters.`
    );
  }
  return value;
}

function validateBootstrapPassword(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > CMS_AUTH_MAX_PASSWORD_LENGTH
  ) {
    return null;
  }
  return value;
}

function safeSecretEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  if (leftBytes.length !== rightBytes.length) {
    // Do equivalent work for unequal lengths without ever calling
    // timingSafeEqual with differently-sized buffers.
    timingSafeEqual(leftBytes, leftBytes);
    return false;
  }
  return timingSafeEqual(leftBytes, rightBytes);
}

function getBootstrapConfig(): { username: string; password: string } | null {
  const password = validateBootstrapPassword(
    process.env.CMS_BOOTSTRAP_PASSWORD
  );
  if (!password) return null;
  const configuredUsername = process.env.CMS_BOOTSTRAP_USERNAME;
  const username = configuredUsername
    ? (() => {
        try {
          return normalizeCmsUsername(configuredUsername);
        } catch {
          return null;
        }
      })()
    : null;
  return username ? { username, password } : null;
}

function makePasswordRecord(hash: Buffer, salt: Buffer): string {
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64url"),
    hash.toString("base64url"),
  ].join("$");
}

function parsePasswordRecord(value: string): {
  n: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
} {
  const parts = value.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    throw new CmsStorageError("CMS authentication document is invalid.");
  }
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  let salt: Buffer;
  let hash: Buffer;
  try {
    salt = Buffer.from(parts[4], "base64url");
    hash = Buffer.from(parts[5], "base64url");
  } catch {
    throw new CmsStorageError("CMS authentication document is invalid.");
  }
  if (
    n !== SCRYPT_N ||
    r !== SCRYPT_R ||
    p !== SCRYPT_P ||
    salt.length < 16 ||
    hash.length !== SCRYPT_KEY_LENGTH
  ) {
    throw new CmsStorageError("CMS authentication document is invalid.");
  }
  return { n, r, p, salt, hash };
}

export async function hashCmsPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await deriveScrypt(password, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  return makePasswordRecord(hash, salt);
}

export async function verifyCmsPassword(
  password: string,
  record: string
): Promise<boolean> {
  const parsed = parsePasswordRecord(record);
  const actual = await deriveScrypt(password, parsed.salt, parsed.hash.length, {
    N: parsed.n,
    r: parsed.r,
    p: parsed.p,
    maxmem: SCRYPT_MAXMEM,
  });
  return (
    actual.length === parsed.hash.length && timingSafeEqual(actual, parsed.hash)
  );
}

export function hashCmsSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function cloneDocument(document: CmsAuthDocument): CmsAuthDocument {
  return JSON.parse(JSON.stringify(document)) as CmsAuthDocument;
}

function parseAuthDocument(value: unknown): CmsAuthDocument {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.revision !== "string"
  ) {
    throw new CmsStorageError("CMS authentication document is invalid.");
  }
  if (
    value.revision.length === 0 ||
    value.revision.length > CMS_AUTH_MAX_REVISION_LENGTH ||
    !Array.isArray(value.accounts) ||
    !Array.isArray(value.sessions) ||
    value.accounts.length > CMS_AUTH_MAX_USERS ||
    value.sessions.length > CMS_AUTH_MAX_SESSIONS
  ) {
    throw new CmsStorageError("CMS authentication document is invalid.");
  }

  const accounts = value.accounts.map(item => {
    if (!isRecord(item))
      throw new CmsStorageError("CMS authentication document is invalid.");
    const role = item.role;
    const id = item.id;
    const createdAt = item.createdAt;
    const failedWindowStartedAt = item.failedWindowStartedAt;
    const lockedUntil = item.lockedUntil;
    const sessionVersion =
      typeof item.sessionVersion === "number" ? item.sessionVersion : -1;
    const failedAttempts =
      typeof item.failedAttempts === "number" ? item.failedAttempts : -1;
    if (
      typeof id !== "string" ||
      id.length < 1 ||
      id.length > 100 ||
      (role !== "owner" && role !== "editor") ||
      !validDateString(createdAt) ||
      typeof item.enabled !== "boolean" ||
      typeof item.removed !== "boolean" ||
      typeof item.passwordHash !== "string" ||
      typeof item.mustChangePassword !== "boolean" ||
      !Number.isInteger(sessionVersion) ||
      sessionVersion < 0 ||
      !Number.isInteger(failedAttempts) ||
      failedAttempts < 0 ||
      failedAttempts > LOGIN_FAILURE_LIMIT ||
      (failedWindowStartedAt !== null &&
        !validDateString(failedWindowStartedAt)) ||
      (lockedUntil !== null && !validDateString(lockedUntil))
    ) {
      throw new CmsStorageError("CMS authentication document is invalid.");
    }
    const username = parseUsername(item.username);
    const name = parseOptionalName(item.name);
    parsePasswordRecord(item.passwordHash);
    return {
      id,
      username,
      ...(name === undefined ? {} : { name }),
      role,
      enabled: item.enabled,
      removed: item.removed,
      passwordHash: item.passwordHash,
      mustChangePassword: item.mustChangePassword,
      sessionVersion,
      createdAt,
      failedAttempts,
      failedWindowStartedAt,
      lockedUntil,
    } satisfies CmsAuthAccount;
  });

  if (accounts.filter(account => account.role === "owner").length !== 1) {
    throw new CmsStorageError("CMS authentication document is invalid.");
  }
  const usernames = new Set<string>();
  const ids = new Set<string>();
  for (const account of accounts) {
    if (usernames.has(account.username) || ids.has(account.id)) {
      throw new CmsStorageError("CMS authentication document is invalid.");
    }
    usernames.add(account.username);
    ids.add(account.id);
  }

  const sessions = value.sessions.map(item => {
    if (!isRecord(item))
      throw new CmsStorageError("CMS authentication document is invalid.");
    const sessionVersion =
      typeof item.sessionVersion === "number" ? item.sessionVersion : -1;
    if (
      typeof item.tokenHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(item.tokenHash) ||
      typeof item.accountId !== "string" ||
      !ids.has(item.accountId) ||
      !Number.isInteger(sessionVersion) ||
      sessionVersion < 0 ||
      !validDateString(item.createdAt) ||
      !validDateString(item.expiresAt)
    ) {
      throw new CmsStorageError("CMS authentication document is invalid.");
    }
    return {
      tokenHash: item.tokenHash,
      accountId: item.accountId,
      sessionVersion,
      createdAt: item.createdAt,
      expiresAt: item.expiresAt,
    } satisfies CmsAuthSession;
  });

  return {
    schemaVersion: 1,
    revision: value.revision,
    accounts,
    sessions,
  };
}

function parseBootstrapLimitDocument(
  value: unknown
): CmsBootstrapLimitDocument {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new CmsStorageError("CMS bootstrap limiter is invalid.");
  }
  const windowStartedAt = value.windowStartedAt;
  const attempts = value.attempts;
  if (
    typeof windowStartedAt !== "string" ||
    !validDateString(windowStartedAt) ||
    typeof attempts !== "number" ||
    !Number.isInteger(attempts) ||
    attempts < 0 ||
    attempts > BOOTSTRAP_ATTEMPT_LIMIT
  ) {
    throw new CmsStorageError("CMS bootstrap limiter is invalid.");
  }
  return { schemaVersion: 1, windowStartedAt, attempts };
}

function createInitialDocument(account: CmsAuthAccount): CmsAuthDocument {
  return {
    schemaVersion: 1,
    revision: randomUUID(),
    accounts: [account],
    sessions: [],
  };
}

function toPrincipal(account: CmsAuthAccount): CmsPrincipal {
  return {
    role: "admin",
    cmsRole: account.role,
    id: account.id,
    username: account.username,
    ...(account.name === undefined ? {} : { name: account.name }),
    mustChangePassword: account.mustChangePassword,
  };
}

function toUserSummary(account: CmsAuthAccount): CmsUserSummary {
  return {
    id: account.id,
    username: account.username,
    ...(account.name === undefined ? {} : { name: account.name }),
    role: account.role,
    enabled: account.enabled,
    mustChangePassword: account.mustChangePassword,
    createdAt: account.createdAt,
  };
}

function genericLoginError(): CmsAuthError {
  return new CmsAuthError(401, "Invalid username or password.");
}

function genericSessionError(): CmsAuthError {
  return new CmsAuthError(401, "Authentication required.");
}

function throttleKey(ip: string | undefined): string {
  return ip && ip.length <= 200 ? ip : "unknown";
}

function pruneIpThrottle(now: number): void {
  ipThrottle.forEach((state, key) => {
    if (
      now - state.windowStartedAt > IP_THROTTLE_WINDOW_MS &&
      state.blockedUntil <= now
    ) {
      ipThrottle.delete(key);
    }
  });
  while (ipThrottle.size > IP_THROTTLE_MAX_ENTRIES) {
    const oldest = ipThrottle.keys().next().value;
    if (typeof oldest !== "string") break;
    ipThrottle.delete(oldest);
  }
}

function isIpThrottled(ip: string | undefined, now: number): boolean {
  pruneIpThrottle(now);
  const state = ipThrottle.get(throttleKey(ip));
  if (!state) return false;
  if (state.blockedUntil > now) return true;
  if (now - state.windowStartedAt >= IP_THROTTLE_WINDOW_MS) {
    ipThrottle.delete(throttleKey(ip));
    return false;
  }
  return state.failures >= IP_THROTTLE_LIMIT;
}

function recordIpFailure(ip: string | undefined, now: number): void {
  pruneIpThrottle(now);
  const key = throttleKey(ip);
  const previous = ipThrottle.get(key);
  const state =
    !previous || now - previous.windowStartedAt >= IP_THROTTLE_WINDOW_MS
      ? { windowStartedAt: now, failures: 0, blockedUntil: 0 }
      : previous;
  state.failures += 1;
  if (state.failures >= IP_THROTTLE_LIMIT)
    state.blockedUntil = now + IP_THROTTLE_WINDOW_MS;
  ipThrottle.delete(key);
  ipThrottle.set(key, state);
}

function clearIpFailures(ip: string | undefined): void {
  ipThrottle.delete(throttleKey(ip));
}

function accountIsLocked(account: CmsAuthAccount, now: number): boolean {
  return Boolean(account.lockedUntil && Date.parse(account.lockedUntil) > now);
}

function resetAccountFailures(account: CmsAuthAccount): void {
  account.failedAttempts = 0;
  account.failedWindowStartedAt = null;
  account.lockedUntil = null;
}

function recordAccountFailure(account: CmsAuthAccount, now: number): void {
  const previousWindow = account.failedWindowStartedAt
    ? Date.parse(account.failedWindowStartedAt)
    : NaN;
  if (
    !Number.isFinite(previousWindow) ||
    now - previousWindow >= LOGIN_FAILURE_WINDOW_MS
  ) {
    account.failedAttempts = 0;
    account.failedWindowStartedAt = new Date(now).toISOString();
  }
  account.failedAttempts = Math.min(
    LOGIN_FAILURE_LIMIT,
    account.failedAttempts + 1
  );
  if (account.failedAttempts >= LOGIN_FAILURE_LIMIT) {
    account.lockedUntil = new Date(now + LOGIN_LOCKOUT_MS).toISOString();
  }
}

function cleanupSessions(document: CmsAuthDocument, now: number): void {
  document.sessions = document.sessions.filter(
    session => Date.parse(session.expiresAt) > now
  );
}

function makeAccount(input: {
  username: string;
  passwordHash: string;
  role: CmsAuthRole;
  name?: string;
  mustChangePassword: boolean;
  now: number;
}): CmsAuthAccount {
  return {
    id: randomUUID(),
    username: input.username,
    ...(input.name === undefined ? {} : { name: input.name }),
    role: input.role,
    enabled: true,
    removed: false,
    passwordHash: input.passwordHash,
    mustChangePassword: input.mustChangePassword,
    sessionVersion: 0,
    createdAt: new Date(input.now).toISOString(),
    failedAttempts: 0,
    failedWindowStartedAt: null,
    lockedUntil: null,
  };
}

async function readSnapshot(
  client: CmsAuthBlobClient,
  pathname: string
): Promise<CmsAuthSnapshot> {
  let result: CmsBlobGetResult | null;
  try {
    result = await client.get(pathname, { access: "private", useCache: false });
  } catch {
    throw new CmsStorageError();
  }
  if (!result || result.statusCode === 404) {
    return { document: null, etag: null, exists: false };
  }
  if (result.statusCode !== 200 || !result.stream) throw new CmsStorageError();
  const raw = await readStream(result.stream);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch {
    throw new CmsStorageError("CMS authentication document is invalid.");
  }
  return {
    document: parseAuthDocument(parsed),
    etag: result.blob.etag,
    exists: true,
  };
}

async function readBootstrapLimitSnapshot(
  client: CmsAuthBlobClient,
  pathname: string
): Promise<CmsBootstrapLimitSnapshot> {
  let result: CmsBlobGetResult | null;
  try {
    result = await client.get(pathname, { access: "private", useCache: false });
  } catch {
    throw new CmsStorageError();
  }
  if (!result || result.statusCode === 404) {
    return { document: null, etag: null, exists: false };
  }
  if (result.statusCode !== 200 || !result.stream) throw new CmsStorageError();
  const raw = await readStream(result.stream);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch {
    throw new CmsStorageError("CMS bootstrap limiter is invalid.");
  }
  return {
    document: parseBootstrapLimitDocument(parsed),
    etag: result.blob.etag,
    exists: true,
  };
}

async function writeBootstrapLimitSnapshot(
  client: CmsAuthBlobClient,
  pathname: string,
  snapshot: CmsBootstrapLimitSnapshot,
  document: CmsBootstrapLimitDocument
): Promise<void> {
  const options: CmsBlobPutOptions = {
    access: "private",
    allowOverwrite: snapshot.exists,
    contentType: "application/json; charset=utf-8",
  };
  if (snapshot.exists) {
    if (!snapshot.etag) throw new CmsConflictError();
    options.ifMatch = snapshot.etag;
  }
  try {
    await client.put(pathname, JSON.stringify(document), options);
  } catch (error) {
    if (isBlobConflict(error)) throw new CmsConflictError();
    throw new CmsStorageError();
  }
}

async function reserveBootstrapAttempt(
  client: CmsAuthBlobClient,
  pathname: string,
  now: number
): Promise<boolean> {
  for (let attempt = 0; attempt < BOOTSTRAP_LIMIT_CAS_RETRIES; attempt += 1) {
    const snapshot = await readBootstrapLimitSnapshot(client, pathname);
    const current = snapshot.document;
    const startedAt = current ? Date.parse(current.windowStartedAt) : NaN;
    const expired = !current || now - startedAt >= BOOTSTRAP_ATTEMPT_WINDOW_MS;
    if (!expired && current.attempts >= BOOTSTRAP_ATTEMPT_LIMIT) {
      return false;
    }

    const document: CmsBootstrapLimitDocument = expired
      ? {
          schemaVersion: 1,
          windowStartedAt: new Date(now).toISOString(),
          attempts: 1,
        }
      : {
          schemaVersion: 1,
          windowStartedAt: current.windowStartedAt,
          attempts: current.attempts + 1,
        };
    try {
      await writeBootstrapLimitSnapshot(client, pathname, snapshot, document);
      return true;
    } catch (error) {
      if (!(error instanceof CmsConflictError)) throw error;
      if (attempt === BOOTSTRAP_LIMIT_CAS_RETRIES - 1) throw error;
    }
  }
  throw new CmsConflictError();
}

async function writeSnapshot(
  client: CmsAuthBlobClient,
  pathname: string,
  snapshot: CmsAuthSnapshot,
  document: CmsAuthDocument
): Promise<void> {
  const options: CmsBlobPutOptions = {
    access: "private",
    allowOverwrite: snapshot.exists,
    contentType: "application/json; charset=utf-8",
  };
  if (snapshot.exists) {
    if (!snapshot.etag) throw new CmsConflictError();
    options.ifMatch = snapshot.etag;
  }
  try {
    await client.put(pathname, JSON.stringify(document), options);
  } catch (error) {
    if (isBlobConflict(error)) throw new CmsConflictError();
    throw new CmsStorageError();
  }
}

function assertRevision(document: CmsAuthDocument, revision: string): void {
  if (document.revision !== revision) throw new CmsConflictError();
}

function validateRevision(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > CMS_AUTH_MAX_REVISION_LENGTH
  ) {
    throw new CmsValidationError("An authentication revision is required.");
  }
  return value;
}

function validateName(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > CMS_AUTH_MAX_NAME_LENGTH
  ) {
    throw new CmsValidationError("Name is invalid.");
  }
  return value;
}

function findAccount(
  document: CmsAuthDocument,
  username: string
): CmsAuthAccount | undefined {
  return document.accounts.find(account => account.username === username);
}

function findAccountById(
  document: CmsAuthDocument,
  id: string
): CmsAuthAccount | undefined {
  return document.accounts.find(account => account.id === id);
}

function sessionAccount(
  document: CmsAuthDocument,
  token: string,
  now: number
): { account: CmsAuthAccount; session: CmsAuthSession } | null {
  const tokenHash = hashCmsSessionToken(token);
  const session = document.sessions.find(item => item.tokenHash === tokenHash);
  if (!session || Date.parse(session.expiresAt) <= now) return null;
  const account = findAccountById(document, session.accountId);
  if (
    !account ||
    !account.enabled ||
    account.removed ||
    account.sessionVersion !== session.sessionVersion
  ) {
    return null;
  }
  return { account, session };
}

function createSession(
  document: CmsAuthDocument,
  account: CmsAuthAccount,
  now: number
): string {
  cleanupSessions(document, now);
  if (document.sessions.length >= CMS_AUTH_MAX_SESSIONS) {
    throw new CmsStorageError("Too many active CMS sessions.");
  }
  const token = randomBytes(32).toString("base64url");
  document.sessions.push({
    tokenHash: hashCmsSessionToken(token),
    accountId: account.id,
    sessionVersion: account.sessionVersion,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + CMS_AUTH_SESSION_TTL_MS).toISOString(),
  });
  return token;
}

async function recordFailedLogin(
  client: CmsAuthBlobClient,
  pathname: string,
  username: string,
  now: number
): Promise<void> {
  for (let attempt = 0; attempt < LOGIN_FAILURE_CAS_RETRIES; attempt += 1) {
    const snapshot = await readSnapshot(client, pathname);
    if (!snapshot.document) return;
    const account = findAccount(snapshot.document, username);
    if (!account) return;
    const document = cloneDocument(snapshot.document);
    const updated = findAccount(document, username);
    if (!updated) return;
    recordAccountFailure(updated, now);
    document.revision = randomUUID();
    try {
      await writeSnapshot(client, pathname, snapshot, document);
      return;
    } catch (error) {
      if (!(error instanceof CmsConflictError)) throw error;
      if (attempt === LOGIN_FAILURE_CAS_RETRIES - 1) throw error;
    }
  }
  throw new CmsConflictError();
}

export type CmsUserStore = {
  readonly configured: boolean;
  readonly authPath: string;
  readSnapshot(): Promise<CmsAuthSnapshot>;
  login(
    username: string,
    password: string,
    ip?: string
  ): Promise<CmsLoginResult>;
  authenticateSession(token: string): Promise<CmsPrincipal>;
  logout(token: string): Promise<void>;
  changePassword(
    token: string,
    currentPassword: string,
    newPassword: string
  ): Promise<CmsLoginResult>;
  listUsers(): Promise<CmsUsersResult>;
  createEditor(input: {
    username: string;
    password: string;
    name?: string;
    revision: string;
  }): Promise<CmsUsersResult>;
  setEditorEnabled(input: {
    id: string;
    enabled: boolean;
    revision: string;
  }): Promise<CmsUsersResult>;
  removeEditor(input: {
    id: string;
    revision: string;
  }): Promise<CmsUsersResult>;
};

export function createCmsUserStore(
  client: CmsAuthBlobClient = defaultBlobClient,
  options: { configured?: boolean; environment?: string } = {}
): CmsUserStore {
  const configured = options.configured ?? isBlobConfiguredByEnvironment();
  const authPath = getCmsAuthPath(
    options.environment ?? process.env.VERCEL_ENV
  );
  const bootstrapLimitPath = getCmsBootstrapLimitPath(authPath);

  const store: CmsUserStore = {
    configured,
    authPath,

    readSnapshot: () => readSnapshot(client, authPath),

    async login(usernameInput, password, ip) {
      const username = normalizeCmsUsername(usernameInput);
      if (
        typeof password !== "string" ||
        password.length === 0 ||
        password.length > CMS_AUTH_MAX_PASSWORD_LENGTH
      ) {
        throw genericLoginError();
      }
      const now = Date.now();
      if (isIpThrottled(ip, now)) throw genericLoginError();

      let snapshot = await readSnapshot(client, authPath);
      if (!snapshot.document) {
        const reserved = await reserveBootstrapAttempt(
          client,
          bootstrapLimitPath,
          now
        );
        if (!reserved) throw genericLoginError();

        const bootstrap = getBootstrapConfig();
        if (
          !bootstrap ||
          bootstrap.username !== username ||
          !safeSecretEqual(password, bootstrap.password)
        ) {
          // No auth document is written for an unknown/wrong initial guess.
          // Only the private global limiter and bounded IP throttle change.
          recordIpFailure(ip, now);
          throw genericLoginError();
        }

        const owner = makeAccount({
          username: bootstrap.username,
          passwordHash: await hashCmsPassword(bootstrap.password),
          role: "owner",
          mustChangePassword: true,
          now,
        });
        const seeded = createInitialDocument(owner);
        try {
          await writeSnapshot(client, authPath, snapshot, seeded);
          snapshot = { document: seeded, etag: null, exists: true };
        } catch (error) {
          if (!(error instanceof CmsConflictError)) throw error;
          snapshot = await readSnapshot(client, authPath);
        }
      }

      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (!snapshot.document) {
          recordIpFailure(ip, now);
          throw genericLoginError();
        }
        const account = findAccount(snapshot.document, username);
        if (
          !account ||
          !account.enabled ||
          account.removed ||
          accountIsLocked(account, now)
        ) {
          if (!account) await hashCmsPassword(password);
          recordIpFailure(ip, now);
          throw genericLoginError();
        }

        let valid = false;
        try {
          valid = await verifyCmsPassword(password, account.passwordHash);
        } catch {
          throw new CmsStorageError("CMS authentication document is invalid.");
        }
        if (!valid) {
          recordIpFailure(ip, now);
          await recordFailedLogin(client, authPath, username, now);
          throw genericLoginError();
        }

        const document = cloneDocument(snapshot.document);
        const current = findAccount(document, username);
        if (
          !current ||
          !current.enabled ||
          current.removed ||
          accountIsLocked(current, now)
        ) {
          recordIpFailure(ip, now);
          throw genericLoginError();
        }
        resetAccountFailures(current);
        const token = createSession(document, current, now);
        document.revision = randomUUID();
        try {
          await writeSnapshot(client, authPath, snapshot, document);
          clearIpFailures(ip);
          return { principal: toPrincipal(current), sessionToken: token };
        } catch (error) {
          if (!(error instanceof CmsConflictError) || attempt === 1)
            throw error;
          snapshot = await readSnapshot(client, authPath);
        }
      }
      throw new CmsConflictError();
    },

    async authenticateSession(token) {
      if (
        typeof token !== "string" ||
        token.length < 20 ||
        token.length > 200
      ) {
        throw genericSessionError();
      }
      const snapshot = await readSnapshot(client, authPath);
      const current =
        snapshot.document &&
        sessionAccount(snapshot.document, token, Date.now());
      if (!current) throw genericSessionError();
      return toPrincipal(current.account);
    },

    async logout(token) {
      if (typeof token !== "string" || token.length < 20 || token.length > 200)
        return;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const snapshot = await readSnapshot(client, authPath);
        if (!snapshot.document) return;
        const tokenHash = hashCmsSessionToken(token);
        if (
          !snapshot.document.sessions.some(
            session => session.tokenHash === tokenHash
          )
        )
          return;
        const document = cloneDocument(snapshot.document);
        document.sessions = document.sessions.filter(
          session => session.tokenHash !== tokenHash
        );
        cleanupSessions(document, Date.now());
        document.revision = randomUUID();
        try {
          await writeSnapshot(client, authPath, snapshot, document);
          return;
        } catch (error) {
          if (!(error instanceof CmsConflictError) || attempt === 1)
            throw error;
        }
      }
    },

    async changePassword(token, currentPassword, newPassword) {
      if (
        typeof token !== "string" ||
        token.length < 20 ||
        token.length > 200
      ) {
        throw genericSessionError();
      }
      if (
        typeof currentPassword !== "string" ||
        currentPassword.length === 0 ||
        currentPassword.length > CMS_AUTH_MAX_PASSWORD_LENGTH
      ) {
        throw new CmsValidationError("Current password is required.");
      }
      validateCmsPassword(newPassword, "New password");
      const snapshot = await readSnapshot(client, authPath);
      if (!snapshot.document) throw genericSessionError();
      const current = sessionAccount(snapshot.document, token, Date.now());
      if (!current) throw genericSessionError();
      let currentValid = false;
      try {
        currentValid = await verifyCmsPassword(
          currentPassword,
          current.account.passwordHash
        );
      } catch {
        throw new CmsStorageError("CMS authentication document is invalid.");
      }
      if (!currentValid)
        throw new CmsAuthError(401, "Current password is incorrect.");
      if (currentPassword === newPassword) {
        throw new CmsValidationError(
          "New password must differ from the current password."
        );
      }

      const now = Date.now();
      const document = cloneDocument(snapshot.document);
      const account = findAccountById(document, current.account.id);
      if (!account || !account.enabled || account.removed)
        throw genericSessionError();
      account.passwordHash = await hashCmsPassword(newPassword);
      account.mustChangePassword = false;
      account.sessionVersion += 1;
      resetAccountFailures(account);
      document.sessions = document.sessions.filter(
        session => session.accountId !== account.id
      );
      const newToken = createSession(document, account, now);
      document.revision = randomUUID();
      await writeSnapshot(client, authPath, snapshot, document);
      return { principal: toPrincipal(account), sessionToken: newToken };
    },

    async listUsers() {
      const snapshot = await readSnapshot(client, authPath);
      if (!snapshot.document) throw new CmsStorageError();
      return {
        users: snapshot.document.accounts.map(toUserSummary),
        revision: snapshot.document.revision,
      };
    },

    async createEditor(input) {
      const username = normalizeCmsUsername(input.username);
      const password = validateCmsPassword(input.password, "Password");
      const name = validateName(input.name);
      const revision = validateRevision(input.revision);
      const passwordHash = await hashCmsPassword(password);
      const snapshot = await readSnapshot(client, authPath);
      if (!snapshot.document) throw new CmsStorageError();
      assertRevision(snapshot.document, revision);
      if (snapshot.document.accounts.length >= CMS_AUTH_MAX_USERS) {
        throw new CmsValidationError("The CMS user limit has been reached.");
      }
      if (findAccount(snapshot.document, username)) {
        throw new CmsConflictError("That username is already reserved.");
      }
      const document = cloneDocument(snapshot.document);
      document.accounts.push(
        makeAccount({
          username,
          passwordHash,
          role: "editor",
          ...(name === undefined ? {} : { name }),
          mustChangePassword: true,
          now: Date.now(),
        })
      );
      document.revision = randomUUID();
      await writeSnapshot(client, authPath, snapshot, document);
      return {
        users: document.accounts.map(toUserSummary),
        revision: document.revision,
      };
    },

    async setEditorEnabled(input) {
      const id =
        typeof input.id === "string" && input.id.length <= 100 ? input.id : "";
      if (!id) throw new CmsValidationError("User id is required.");
      if (typeof input.enabled !== "boolean")
        throw new CmsValidationError("Enabled must be boolean.");
      const revision = validateRevision(input.revision);
      const snapshot = await readSnapshot(client, authPath);
      if (!snapshot.document) throw new CmsStorageError();
      assertRevision(snapshot.document, revision);
      const document = cloneDocument(snapshot.document);
      const account = findAccountById(document, id);
      if (!account) throw new CmsValidationError("User not found.");
      if (account.role === "owner")
        throw new CmsAuthError(403, "The owner account cannot be disabled.");
      if (
        account.enabled !== input.enabled ||
        (input.enabled && account.removed)
      ) {
        account.enabled = input.enabled;
        account.removed = input.enabled ? false : account.removed;
        account.sessionVersion += 1;
        if (!input.enabled) {
          document.sessions = document.sessions.filter(
            session => session.accountId !== account.id
          );
        }
      }
      document.revision = randomUUID();
      await writeSnapshot(client, authPath, snapshot, document);
      return {
        users: document.accounts.map(toUserSummary),
        revision: document.revision,
      };
    },

    async removeEditor(input) {
      const id =
        typeof input.id === "string" && input.id.length <= 100 ? input.id : "";
      if (!id) throw new CmsValidationError("User id is required.");
      const revision = validateRevision(input.revision);
      const snapshot = await readSnapshot(client, authPath);
      if (!snapshot.document) throw new CmsStorageError();
      assertRevision(snapshot.document, revision);
      const document = cloneDocument(snapshot.document);
      const account = findAccountById(document, id);
      if (!account) throw new CmsValidationError("User not found.");
      if (account.role === "owner")
        throw new CmsAuthError(403, "The owner account cannot be removed.");
      account.enabled = false;
      account.removed = true;
      account.sessionVersion += 1;
      document.sessions = document.sessions.filter(
        session => session.accountId !== account.id
      );
      document.revision = randomUUID();
      await writeSnapshot(client, authPath, snapshot, document);
      return {
        users: document.accounts.map(toUserSummary),
        revision: document.revision,
      };
    },
  };

  return store;
}
