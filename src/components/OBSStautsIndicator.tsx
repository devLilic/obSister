import { useOBSConnection } from "../hooks/useOBSConnection";

export default function OBSStatusIndicator() {
  const { connected, reconnecting } = useOBSConnection();

  const color = connected
    ? "bg-green-500"
    : reconnecting
    ? "bg-yellow-400 animate-pulse"
    : "bg-red-500";

  const text = connected
    ? "Connected to OBS"
    : reconnecting
    ? "Reconnecting..."
    : "Disconnected";

  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-3 h-3 rounded-full ${color}`}></span>
      <span className="text-sm text-gray-300 font-medium">{text}</span>
    </div>
  );
}
