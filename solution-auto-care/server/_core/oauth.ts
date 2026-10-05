import {
  COOKIE_NAME,
  ONE_YEAR_MS,
  OAUTH_STATE_COOKIE,
  decodeOAuthState,
  encodeOAuthState,
} from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

const OAUTH_PORTAL_URL = "https://manus.im";
const DEFAULT_RETURN_URL = "https://solution-car-wrap.vercel.app/member";
const ALLOWED_RETURN_ORIGINS = new Set([
  "https://solution-car-wrap.vercel.app",
  "https://solauto1care-rmvw9wqm.manus.space",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getRequestOrigin(req: Request) {
  const host = req.get("host") ?? "";
  const forwardedProtocol = req.headers["x-forwarded-proto"];
  const forwardedValue =
    typeof forwardedProtocol === "string"
      ? forwardedProtocol.split(",")[0]?.trim()
      : undefined;
  const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host);
  const protocol = isLocalHost ? forwardedValue || req.protocol : "https";
  return `${protocol}://${host}`;
}

export function getSafeOAuthReturnUrl(value?: string) {
  try {
    const parsed = new URL(value || DEFAULT_RETURN_URL);
    if (!ALLOWED_RETURN_ORIGINS.has(parsed.origin)) return DEFAULT_RETURN_URL;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return DEFAULT_RETURN_URL;
  }
}

function buildExternalRelayUrl(
  returnUrl: string,
  sessionToken: string,
  requestOrigin: string
) {
  const parsed = new URL(returnUrl);
  if (parsed.origin === requestOrigin) return parsed.toString();
  parsed.hash = new URLSearchParams({
    "manus-cookie": `${COOKIE_NAME}=${sessionToken}`,
  }).toString();
  return parsed.toString();
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/start", (req: Request, res: Response) => {
    const nonce = crypto.randomUUID();
    const returnUrl = getSafeOAuthReturnUrl(getQueryParam(req, "returnUrl"));
    const callbackUrl = `${getRequestOrigin(req)}/api/oauth/callback`;
    const state = encodeOAuthState({
      redirectUri: callbackUrl,
      nonce,
      returnUrl,
    });
    const oauthUrl = new URL(`${OAUTH_PORTAL_URL}/app-auth`);
    oauthUrl.searchParams.set("appId", ENV.appId || "RmvW9wQmUck52GnCFFpc6R");
    oauthUrl.searchParams.set("redirectUri", callbackUrl);
    oauthUrl.searchParams.set("state", state);
    oauthUrl.searchParams.set("type", "signIn");

    res.cookie(OAUTH_STATE_COOKIE, nonce, {
      httpOnly: true,
      maxAge: 10 * 60 * 1000,
      path: "/",
      sameSite: "none",
      secure: true,
    });
    res.redirect(302, oauthUrl.toString());
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    // CSRF guard: the nonce in `state` must match the one-time cookie that
    // startLogin set in the browser that began this login. An attacker can
    // forge `state`, but cannot plant this cookie in the victim's browser.
    const oauthState = decodeOAuthState(state);
    const { nonce } = oauthState;
    const expectedNonce = parseCookieHeader(req.headers.cookie ?? "")[
      OAUTH_STATE_COOKIE
    ];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, {
      path: "/",
      secure: true,
      sameSite: "none",
    });

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      const requestOrigin = getRequestOrigin(req);
      const returnUrl = getSafeOAuthReturnUrl(oauthState.returnUrl);
      res.redirect(
        302,
        buildExternalRelayUrl(returnUrl, sessionToken, requestOrigin)
      );
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
