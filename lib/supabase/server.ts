import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseBrowserConfig, getSupabaseServiceConfig } from "./config";

// Creates a cookie-aware Supabase client for authenticated server routes/components.
export async function createSupabaseServerClient() {
  const config = getSupabaseBrowserConfig();
  if (!config) return null;
  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}

// Creates a service-role Supabase client for server-only privileged reads.
export function createSupabaseServiceClient() {
  const config = getSupabaseServiceConfig();
  if (!config) return null;
  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}