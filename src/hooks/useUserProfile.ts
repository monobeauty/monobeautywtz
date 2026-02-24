import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserProfile {
  id: string;
  user_id: string;
  email: string | null;
  nome: string | null;
  instancias_permitidas: string[] | null;
  role: string | null;
  updated_at: string | null;
}

// Cache to persist profile across re-mounts (same session)
let cachedProfile: UserProfile | null = null;
let cachedUserId: string | null = null;

export function useUserProfile() {
  const { user } = useAuth();
  const hasCached = user && cachedUserId === user.id && cachedProfile !== null;
  const [profile, setProfile] = useState<UserProfile | null>(hasCached ? cachedProfile : null);
  const [loading, setLoading] = useState(!hasCached);
  const fetchedRef = useRef(hasCached);

  const fetchProfile = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    if (fetchedRef.current) return; // already fetched this mount
    fetchedRef.current = true;
    const { data, error } = await supabase
      .from("perfis_usuarios")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    let result: UserProfile | null;
    if (!data && !error) {
      const { data: created } = await supabase
        .from("perfis_usuarios")
        .insert({ user_id: user.id, email: user.email, instancias_permitidas: [] })
        .select()
        .single();
      result = created as UserProfile | null;
    } else {
      result = data as UserProfile | null;
    }
    cachedProfile = result;
    cachedUserId = user.id;
    setProfile(result);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const isAdmin = profile?.role === "admin";
  // Admin sees all; atendente sees only allowed
  const allowedInstances = isAdmin ? [] : (profile?.instancias_permitidas ?? []);

  const refetch = useCallback(async () => {
    fetchedRef.current = false;
    cachedProfile = null;
    await fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, isAdmin, allowedInstances, refetch };
}
