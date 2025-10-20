// src/hooks/useOBSConnection.ts
import { useEffect, useState } from "react";

interface OBSConnectionState {
  connected: boolean;
  reconnecting: boolean;
}

export function useOBSConnection(): OBSConnectionState {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    const handleStatus = (status: boolean) => {
      if (status) {
        setConnected(true);
        setReconnecting(false);
      } else {
        setReconnecting(true);
        setConnected(false);
      }
    };

    window.api.onOBSStatus(handleStatus);

    return () => {
      window.api.off?.("obs-status", handleStatus);
    };
  }, []);

  return { connected, reconnecting };
}
