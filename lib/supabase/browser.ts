import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseBrowserConfig } from "./config";

export function createSupabaseBrowserClient() {
  const config = getSupabaseBrowserConfig();
  if (!config) return null;
  return createBrowserClient(config.url, config.anonKey);
}

