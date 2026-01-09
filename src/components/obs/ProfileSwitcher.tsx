// File: src/components/obs/ProfileSwitcher.tsx
import React from "react";
import { useProfileSwitcherViewModel } from "../../hooks/useProfileSwitcherViewModel";

const ProfileSwitcher: React.FC = () => {
  const { profiles, current, switchProfile } = useProfileSwitcherViewModel();

  return (
      <div>

        <select
            title="select profile"
            value={current}
            onChange={(e) => void switchProfile(e.target.value)}
            className="border rounded text-gray-300 p-2"
            disabled={!profiles.length}
        >
          {profiles.length === 0 ? (
              <option>Loading...</option>
          ) : (
              profiles.map((p) => (
                  <option key={p} value={p} className='text-gray-500 font-bold'>
                    {p}
                  </option>
              ))
          )}
        </select>
      </div>
  );
};

export default ProfileSwitcher;
