export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// This Manus-hosted bridge owns the allowlisted OAuth callback and returns a
// one-time code to the external Vercel frontend after authentication.
const PUBLIC_MEMBER_AUTH_ORIGIN = "https://solutionauth-zcgxwa4c.manus.space";

// Start the Manus OAuth login. Call this from an event handler or effect at the
// moment you want to navigate, e.g. `onClick={() => startLogin()}`.
//
// It has a SIDE EFFECT — it navigates immediately. Do NOT call it during render
// (no `href={startLogin()}` / `loginUrl={...}`); the backend creates the
// one-time nonce and state cookie immediately before redirecting to OAuth.
export const startLogin = () => {
  const memberAuthOrigin = (
    import.meta.env.VITE_MEMBER_AUTH_ORIGIN || PUBLIC_MEMBER_AUTH_ORIGIN
  ).replace(/\/$/, "");
  const returnUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  const url = new URL(`${memberAuthOrigin}/api/oauth/start`);
  url.searchParams.set("returnUrl", returnUrl);

  window.location.href = url.toString();
};
