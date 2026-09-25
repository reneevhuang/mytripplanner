import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseBrowserConfig } from "./config";

// Creates a Supabase browser client only when public config exists.
export function createSupabaseBrowserClient() {
  const config = getSupabaseBrowserConfig();
  if (!config) return null;
  return createBrowserClient(config.url, config.anonKey);
}