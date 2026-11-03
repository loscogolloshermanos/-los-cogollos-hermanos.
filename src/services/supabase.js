import { createClient } from "@supabase/supabase-js";
import config from "../data/supabase.json";
export const authCallbackOnLoad = /^#(access_token|error|refresh_token)=/.test(
  window.location.hash,
);
export const supabase = createClient(config.url, config.publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "implicit",
    storageKey: "lch-admin-session",
  },
});
// Public reads never inherit the administrator session.
export const publicSupabase = createClient(config.url, config.publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
export function loginRedirect() {
  return new URL(`${import.meta.env.BASE_URL}?admin=1`, window.location.href)
    .href;
}
