import React, { useEffect, useState } from "react";

const ProfileSwitcher: React.FC = () => {
  const [profiles, setProfiles] = useState<string[]>([]);
  const [current, setCurrent] = useState<string>("");

  // Load profiles on mount
  useEffect(() => {
    let isMounted = true;

    async function loadProfiles() {
      try {
        const data = await window.api.obsProfiles.getAll();
        if (!data) return;

        // Expected shape: { currentProfileName: 'Multi Stream', profiles: ['Multi Stream', 'SingleStream'] }
        if (isMounted) {
          setProfiles(data.profiles || []);
          setCurrent(data.currentProfileName || "");
        }
      } catch (err) {
        console.error("Failed to load profiles:", err);
      }
    }

    loadProfiles();

    return () => {
      isMounted = false;
    };
  }, []);

  const switchProfile = async (p: string) => {
    const success = await window.api.obsProfiles.set(p);
    if (success) {
      setCurrent(p);
    }
  };

  return (
    <div className="mt-6">
      <h2 className="font-semibold mb-2">Active Profile: {current || "Loading..."}</h2>
      <select
        value={current}
        onChange={(e) => switchProfile(e.target.value)}
        className="border rounded p-2"
        disabled={!profiles.length}
      >
        {profiles.length === 0 ? (
          <option>Loading...</option>
        ) : (
          profiles.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))
        )}
      </select>
    </div>
  );
};

export default ProfileSwitcher;
