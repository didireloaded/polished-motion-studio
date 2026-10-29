import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Current session; `ready` is false until the stored session has been read. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    let authEventReceived = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventReceived = true;
      setSession(nextSession);
      setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (disposed || authEventReceived) return;
      setSession(data.session);
      setReady(true);
    });
    return () => {
      disposed = true;
      sub.subscription.unsubscribe();
    };
  }, []);
  return { session, user: session?.user ?? null, ready };
}

export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
