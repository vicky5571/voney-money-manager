import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Ensure redirect url is relative to avoid open redirect vulnerabilities
      const redirectUrl = new URL(
        next.startsWith("/") ? next : "/",
        requestUrl.origin,
      );
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Return to login with error parameter if code exchange fails
  const errorUrl = new URL(
    "/login?error=Invalid%20or%20expired%20reset%20link",
    requestUrl.origin,
  );
  return NextResponse.redirect(errorUrl);
}
