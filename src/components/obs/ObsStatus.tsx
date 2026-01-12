// File: src/components/obs/ObsStatus.tsx
import { useObsStatusViewModel } from "../../hooks/useObsStatusViewModel";
import { useObsStreamControls } from "../../hooks/useObsStreamControls";
import { useState } from "react";
import { Button } from "../ui/Button";
import ProfileSwitcher from "./ProfileSwitcher.tsx";

export default function ObsStatus() {
    const { connected } = useObsStatusViewModel();
    const { startStream, stopStream } = useObsStreamControls();

    const [streamKey, setStreamKey] = useState("");

    return (
        <div className="p-4 bg-gray-800 rounded-lg text-gray-200 shadow-lg flex flex-col gap-4 w-full">
            <div className="flex gap-3 items-center">
                <input
                    type="text"
                    value={streamKey}
                    onChange={(e) => setStreamKey(e.target.value)}
                    placeholder="Enter Facebook Stream Key"
                    className="px-3 py-2 rounded bg-gray-700 border border-gray-600 w-1/2 text-gray-100"
                />

                <div className="flex gap-3 items-center">
                    <ProfileSwitcher />

                    <Button
                        className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-40 "
                        onClick={() => startStream(streamKey)}
                        disabled={!connected || !streamKey}
                    >
                        Start Stream
                    </Button>

                    <Button
                        className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
                        onClick={() => stopStream()}
                        disabled={!connected}
                    >
                        Stop Stream
                    </Button>
                </div>
            </div>
            <div className="text-gray-500 flex gap-5">
                <p>SingleStream - doar Facebook</p>
                <p>MultiStream - Facebook si Youtube</p>
            </div>
        </div>
    );
}
