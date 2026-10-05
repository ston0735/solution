export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// The OAuth application only permits the Manus-hosted backend callback. The
// backend relays the authenticated session back to external static frontends.
const PUBLIC_OAUTH_CALLBACK_ORIGIN =
  "https://solauto1care-rmvw9wqm.manus.space";

// Start the Manus OAuth login. Call this from an event handler or effect at the
// moment you want to navigate, e.g. `onClick={() => startLogin()}`.
//
// It has a SIDE EFFECT — it navigates immediately. Do NOT call it during render
// (no `href={startLogin()}` / `loginUrl={...}`); the backend creates the
// one-time nonce and state cookie immediately before redirecting to OAuth.
export const startLogin = () => {
  const callbackOrigin = (
    import.meta.env.VITE_OAUTH_CALLBACK_ORIGIN || PUBLIC_OAUTH_CALLBACK_ORIGIN
  ).replace(/\/$/, "");
  const returnUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  const url = new URL(`${callbackOrigin}/api/oauth/start`);
  url.searchParams.set("returnUrl", returnUrl);

  window.location.href = url.toString();
};
