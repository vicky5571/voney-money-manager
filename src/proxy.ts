import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware to refresh Supabase auth session and enforce route protection.
 *
 * - Unauthenticated users attempting to access protected routes are redirected to `/login`.
 * - Authenticated users attempting to access auth routes (`/login`, `/signup`) are redirected to `/`.
 *
 * @param request - Incoming Next.js HTTP request.
 * @returns Next.js HTTP response with refreshed cookies or route redirection.
 */
function createRedirectResponse(
  request: NextRequest,
  pathname: string,
  supabaseResponse: NextResponse,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirectResponse = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Avoid running any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could cause random logouts.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const publicRoutes = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/auth/callback",
    "/sw.js",
  ];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  const authEntryRoutes = ["/login", "/signup", "/forgot-password"];
  const isAuthEntryRoute = authEntryRoutes.some((route) => pathname.startsWith(route));

  // Authenticated user accessing login/signup/forgot-password -> redirect to main app home
  if (user && isAuthEntryRoute) {
    return createRedirectResponse(request, "/", supabaseResponse);
  }

  // Unauthenticated user accessing protected routes -> redirect to login
  if (!user && !isPublicRoute) {
    return createRedirectResponse(request, "/login", supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
