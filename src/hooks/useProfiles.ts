// src/hooks/useProfiles.ts
import { useEffect, useState } from "react";

interface ProfilesState {
  profiles: string[];
  current: string;
  loading: boolean;
  error?: string;
  switchProfile: (profile: string) => Promise<void>;
  reloadProfiles: () => Promise<void>;
}

export function useProfiles(): ProfilesState {
  const [profiles, setProfiles] = useState<string[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await window.api.obsProfiles.getAll();
      if (data) {
        setProfiles(data.profiles || []);
        setCurrent(data.currentProfileName || "");
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to load profiles");
    } finally {
      setLoading(false);
    }
  };

  const switchProfile = async (profile: string) => {
    try {
      const success = await window.api.obsProfiles.set(profile);
      if (success) setCurrent(profile);
    } catch (err) {
      console.error("Profile switch failed:", err);
    }
  };

  useEffect(() => {
    loadProfiles();
    window.api.onProfileChanged((p) => setCurrent(p));
  }, []);

  return { profiles, current, loading, error, switchProfile, reloadProfiles: loadProfiles };
}
