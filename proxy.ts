import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function proxy(request: NextRequest) {
  const isAccountRoute = request.nextUrl.pathname.startsWith("/account");
  let response = NextResponse.next({ request });
  Object.entries(PRIVATE_HEADERS).forEach(([name, value]) => response.headers.set(name, value));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    if (isAccountRoute) {
      const destination = new URL("/login", request.url);
      destination.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
      const redirect = NextResponse.redirect(destination);
      Object.entries(PRIVATE_HEADERS).forEach(([name, value]) => redirect.headers.set(name, value));
      return redirect;
    }
    return response;
  }

  let claims: { sub?: string } | null = null;
  let verificationFailed = false;

  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          Object.entries(PRIVATE_HEADERS).forEach(([name, value]) => response.headers.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
          Object.entries(headers ?? {}).forEach(([name, value]) => response.headers.set(name, value));
        },
      },
    });

    // Verify claims with Supabase rather than trusting decoded cookie contents.
    const result = await supabase.auth.getClaims();
    claims = result.data?.claims ?? null;
    verificationFailed = Boolean(result.error);
  } catch {
    // Network, configuration, and token-verification exceptions must not
    // turn into an unhandled proxy failure or accidentally grant member access.
    verificationFailed = true;
  }

  if (isAccountRoute && (verificationFailed || !claims?.sub)) {
    const destination = new URL("/login", request.url);
    destination.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    const redirect = NextResponse.redirect(destination);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    Object.entries(PRIVATE_HEADERS).forEach(([name, value]) => redirect.headers.set(name, value));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: ["/account/:path*", "/auth/callback", "/reset-password"],
};
