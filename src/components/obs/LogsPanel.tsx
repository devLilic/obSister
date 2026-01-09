// File: src/components/obs/LogsPanel.tsx
import { useEffect, useRef, useState } from "react";
import { useLogsPanelViewModel } from "../../hooks/useLogsPanelViewModel";

export default function LogsPanel() {
  const { logs, clearLogs } = useLogsPanelViewModel();

  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [logs, autoScroll]);

  // Detect user scroll
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  return (
      <div className="mt-6 bg-gray-900 border border-gray-700 rounded p-2 text-sm text-gray-200 relative">
        <button
            onClick={clearLogs}
            className="absolute right-2 top-2 text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Clear
        </button>

        <div
            ref={containerRef}
            onScroll={handleScroll}
            className="h-20 overflow-y-auto font-mono pr-2"
        >
          {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
          ) : (
              logs.map((log, idx) => (
                  <div key={idx} className="border-b border-gray-800 py-1">
              <span className="text-gray-500 mr-2">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
                    <span
                        className={
                          log.level === "error"
                              ? "text-red-400"
                              : log.level === "warn"
                                  ? "text-yellow-400"
                                  : "text-blue-400"
                        }
                    >
                [{log.level.toUpperCase()}]
              </span>{" "}
                    <span>{log.message}</span>
                  </div>
              ))
          )}
        </div>
      </div>
  );
}
