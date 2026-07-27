import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const CANONICAL_HOST = "https://houskase.com";

// Routes that should NOT be indexed / canonicalized to houskase.com
const NOINDEX_PREFIXES = [
  "/admin",
  "/dashboard",
  "/checkout",
  "/reset-password",
  "/forgot-password",
  "/login",
  "/signup",
  "/.lovable",
  "/pwa-diagnostics",
  "/seo-checklist",
  "/oauth",
];

export function RouteCanonical() {
  const { pathname } = useLocation();
  const noindex = NOINDEX_PREFIXES.some((p) => pathname.startsWith(p));
  // Strip trailing slash except root
  const clean = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  const url = `${CANONICAL_HOST}${clean === "/" ? "/" : clean}`;

  return (
    <Helmet>
      <link rel="canonical" href={url} />
      <meta property="og:url" content={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  );
}
