import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to save and sync your Italy itineraries.",
};

async function signIn(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect("/auth/login?error=Enter%20an%20email%20address.");

  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/auth/login?error=Supabase%20is%20not%20configured.");

  const origin = (await headers()).get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  redirect(`/auth/login?sent=1&email=${encodeURIComponent(email)}`);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string; email?: string }>;
}) {
  const params = await searchParams;
  return (
    <section className="auth-shell">
      <div>
        <p className="eyebrow">ACCOUNT SYNC</p>
        <h1>Sign in to save trips</h1>
        <p>Enter your email and Supabase will send a magic link. Guest plans remain on this device until you import them.</p>
      </div>
      {params.error && <p className="form-error" role="alert">{params.error}</p>}
      {params.sent && <p className="status" role="status">Check {params.email} for your sign-in link.</p>}
      <form action={signIn} className="auth-form">
        <label className="field">
          Email address
          <input autoComplete="email" name="email" required type="email" />
        </label>
        <button className="button button-primary" type="submit">Send magic link</button>
      </form>
    </section>
  );
}

