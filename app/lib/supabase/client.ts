"use client";

import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// The SSR browser client stores the session in cookies shared with the server proxy.
// Never use a service-role key in this browser bundle.
export const supabase = url && key
  ? createBrowserClient(url, key, {
      auth: {
        flowType: "pkce",
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
