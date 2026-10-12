export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// The brand domain is the only public entry point for the Solution member area.
export const PUBLIC_SITE_ORIGIN = "https://www.solution-wrap.com";
const PUBLIC_MEMBER_AUTH_ORIGIN = "https://solutionauth-zcgxwa4c.manus.space";

export const startLogin = () => {
  const memberAuthOrigin = (
    import.meta.env.VITE_MEMBER_AUTH_ORIGIN || PUBLIC_MEMBER_AUTH_ORIGIN
  ).replace(/\/$/, "");

  const isLocalDevelopment = /^(localhost|127\.0\.0\.1)$/.test(
    window.location.hostname
  );
  const returnOrigin = isLocalDevelopment
    ? window.location.origin
    : PUBLIC_SITE_ORIGIN;
  const returnUrl = `${returnOrigin}${window.location.pathname}${window.location.search}`;

  const url = new URL(`${memberAuthOrigin}/api/oauth/start`);
  url.searchParams.set("returnUrl", returnUrl);
  window.location.href = url.toString();
};
