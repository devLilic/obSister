import { useEffect, useState } from "react";

declare global {
  interface Window {
    api: {
      onOBSStatus: (callback: (status: boolean) => void) => void;
      startStream: (key: string) => void;
      stopStream: () => void;
    };
  }
}

export default function ObsStatus() {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [streamKey, setStreamKey] = useState("");

  useEffect(() => {
    window.api.onOBSStatus((status) => {
        if(status){
            setConnected(true);
            setReconnecting(false);
        } else {
            if(connected){
                setConnected(false);
                setReconnecting(true);
            } else {
                setConnected(false);
                setReconnecting(true);
            }
        }
    });
  }, []);

 const statusColor = connected
    ? "bg-green-500"
    : reconnecting
    ? "bg-yellow-400 animate-pulse"
    : "bg-red-500";

  const statusText = connected
    ? "Connected to OBS"
    : reconnecting
    ? "Reconnecting..."
    : "Disconnected";


  return (
    <div className="p-6 text-gray-200 bg-gray-900 h-screen flex flex-col gap-6">
      <div className="text-3xl font-bold text-blue-400">obSister</div>

      <div className="flex items-center text-lg">
        <span className={`inline-block w-3 h-3 rounded-full mr-2 ${statusColor}`}></span>
        {statusText}
      </div>

      <div className="flex flex-col gap-3 max-w-md">
        <input
          type="text"
          value={streamKey}
          onChange={(e) => setStreamKey(e.target.value)}
          placeholder="Enter Facebook Stream Key"
          className="px-3 py-2 rounded bg-gray-800 border border-gray-600 text-gray-100"
        />

        <div className="flex gap-3">
          <button
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white disabled:opacity-40"
            onClick={() => window.api.startStream(streamKey)}
            disabled={!connected || !streamKey}
          >
            Start Stream
          </button>

          <button
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white disabled:opacity-40"
            onClick={() => window.api.stopStream()}
            disabled={!connected}
          >
            Stop Stream
          </button>
        </div>
      </div>
    </div>
  );
}
