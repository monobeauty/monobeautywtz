import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EvolutionInstance {
  name: string;
  status: string;
  profilePicUrl: string | null;
  profileName: string | null;
}

export function useEvolutionInstances() {
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInstances = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-instances");

      if (error) {
        console.error("Error fetching Evolution instances:", error);
        return;
      }

      if (data?.instances && Array.isArray(data.instances)) {
        setInstances(data.instances);
      }
    } catch (err) {
      console.error("Failed to fetch Evolution instances:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  const instanceNames = instances.map((i) => i.name);
  const statusMap: Record<string, string> = {};
  const profilePicMap: Record<string, string | null> = {};
  instances.forEach((i) => {
    statusMap[i.name] = i.status;
    profilePicMap[i.name] = i.profilePicUrl;
  });

  return { instances: instanceNames, instancesWithStatus: instances, statusMap, profilePicMap, loading, refetch: fetchInstances };
}
