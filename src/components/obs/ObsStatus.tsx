import { useOBSConnection } from "../../hooks/useOBSConnection";
import { useState } from "react";
import { Button } from "../ui/Button";

export default function ObsStatus() {
  const { connected } = useOBSConnection();
  const [streamKey, setStreamKey] = useState("");


  return (
    <div className="p-4 bg-gray-800 rounded-lg text-gray-200 shadow-lg flex flex-col gap-4 w-96">
      
      <input
        type="text"
        value={streamKey}
        onChange={(e) => setStreamKey(e.target.value)}
        placeholder="Enter Facebook Stream Key"
        className="px-3 py-2 rounded bg-gray-700 border border-gray-600 text-gray-100"
      />

      <div className="flex gap-3">
        <Button
          className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-40 "
          onClick={() => window.api.stream.start(streamKey)}
          disabled={!connected || !streamKey}
        >
          Start Stream
        </Button>
        

        <Button
          className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
          onClick={() => window.api.stream.stop()}
          disabled={!connected}
        >
          Stop Stream
        </Button>

      </div>
    </div>
  );
}
