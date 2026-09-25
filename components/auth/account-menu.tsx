import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Ends the current Supabase session when a signed-in user clicks Sign out.
async function signOut() {
  "use server";
  const supabase = await createSupabaseServerClient();
  if (supabase) await supabase.auth.signOut();
}

// Shows guest, sign-in, or signed-in account controls in the site header.
export async function AccountMenu() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = supabase
    ? await supabase.auth.getUser()
    : { data: { user: null } };

  if (!supabase) {
    return <span className="account-pill">Guest mode</span>;
  }

  if (!user) {
    return <Link className="account-pill account-link" href="/auth/login">Sign in</Link>;
  }

  return (
    <form action={signOut} className="account-menu">
      <span className="account-pill">{user.email}</span>
      <button className="text-button" type="submit">Sign out</button>
    </form>
  );
}