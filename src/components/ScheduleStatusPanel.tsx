// filepath: src/components/ScheduleStatusPanel.tsx
import { useScheduleStatusPanelViewModel } from "../hooks/useScheduleStatusPanelViewModel";

function normalizeReason(reasonLabel?: string) {
    if (!reasonLabel) return undefined;
    if (reasonLabel.toLowerCase().includes("obs disconnected")) {
        return "OBS disconnected — stream ended";
    }
    return reasonLabel;
}

function titleFromVariant(variant: "idle" | "live" | "ending" | "ended" | "error") {
    if (variant === "live") return "LIVE NOW";
    if (variant === "ending") return "Ending…";
    if (variant === "ended") return "Ended";
    if (variant === "error") return "Error";
    return "Idle";
}

export default function ScheduleStatusPanel() {
    const {
        label,
        variant,
        reasonLabel,

        activeItemName,
        activeItemPlatform,

        nextName,
        timeToNext,
        timeToEnd,

        isStopping,
        stopCurrentLive,

    } = useScheduleStatusPanelViewModel();

    const title = titleFromVariant(variant);
    const isLive = variant === "live" || variant === "ending";
    const normalizedReason = normalizeReason(reasonLabel);

    return (
        <div className="bg-gray-800 rounded-lg px-4 py-3 border border-gray-700 text-gray-100">
            <h2 className="text-lg font-semibold mb-2">🕒 Live Schedule Monitor</h2>

            <div className="flex flex-col gap-2 text-sm">
                {/* HEADER STATUS (standardizat) */}
                <div className="font-semibold text-gray-200">{title}</div>

                {/* 1) LIVE: nume item + timp până la final */}
                {isLive && activeItemName ? (
                    <>
                        <div className="text-green-400 font-semibold flex items-center justify-between">
              <span>
                {activeItemName}
                  {activeItemPlatform ? ` (${activeItemPlatform})` : ""}
              </span>

                            <button
                                onClick={() => void stopCurrentLive()}
                                disabled={isStopping}
                                className={`ml-3 px-3 py-1 rounded text-white ${
                                    isStopping ? "bg-gray-600 cursor-wait" : "bg-red-600 hover:bg-red-700"
                                }`}
                            >
                                {isStopping ? "Stopping..." : "⏹ Stop Live"}
                            </button>
                        </div>

                        <div className="text-gray-300">
                            Ends in: <span className="font-mono">{timeToEnd}</span>
                        </div>
                    </>
                ) : null}

                {/* ended: reasonLabel */}
                {variant === "ended" ? (
                    <div className="text-gray-300">{normalizedReason ? normalizedReason : "Ended"}</div>
                ) : null}


                {/* 2) NEXT: următorul item + timp până la start */}
                {nextName ? (
                    <div className="mt-2">
                        <div className="text-gray-300">
                            Next: <span className="text-blue-400">{nextName}</span>
                        </div>
                        <div className="text-gray-400">
                            Starts in: <span className="font-mono">{timeToNext}</span>
                        </div>
                    </div>
                ) : null}


                {/* label din VM păstrat ca fallback informativ (nu calculăm nimic) */}
                {variant === "error" && label ? <div className="text-gray-400">{label}</div> : null}
            </div>
        </div>
    );
}
