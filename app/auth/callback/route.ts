import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;
  if (!code) return NextResponse.redirect(`${origin}/auth/login?error=Missing%20auth%20code.`);

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.redirect(`${origin}/auth/login?error=Supabase%20is%20not%20configured.`);

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error.message)}`);
  return NextResponse.redirect(`${origin}/plan`);
}

