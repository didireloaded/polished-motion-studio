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
    try {
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key?.startsWith("mutal:matches:v1:") || key?.startsWith("mutal:profile:v1:")) {
          localStorage.removeItem(key);
        }
      }
      sessionStorage.removeItem("mutal-preview-completed-polls");
    } catch {
      // Browser storage may be disabled; these obsolete caches are never read.
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventReceived = true;
      setSession(nextSession);
      setReady(true);
    });
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (disposed || authEventReceived) return;
        setSession(data.session);
        setReady(true);
      })
      .catch(() => {
        if (disposed || authEventReceived) return;
        setSession(null);
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
    staleTime: 2 * 60_000,
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
