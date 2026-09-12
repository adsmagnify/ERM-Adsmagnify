"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function SessionKeepAlive() {
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession();
    const { data } = supabase.auth.onAuthStateChange(() => {});
    return () => data.subscription.unsubscribe();
  }, []);

  return null;
}
