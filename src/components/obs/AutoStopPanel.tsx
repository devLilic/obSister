// filepath: src/components/obs/AutoStopPanel.tsx
import { useAutoStopPanelViewModel } from "../../hooks/useAutoStopPanelViewModel";

type Variant = "info" | "success" | "warning" | "error";

function badgeClasses(variant: Variant) {
    switch (variant) {
        case "success":
            return "border-green-700 bg-green-900/20 text-green-200";
        case "warning":
            return "border-yellow-700 bg-yellow-900/20 text-yellow-200";
        case "error":
            return "border-red-700 bg-red-900/20 text-red-200";
        default:
            return "border-blue-700 bg-blue-900/20 text-blue-200";
    }
}

function dotClasses(variant: Variant) {
    switch (variant) {
        case "success":
            return "bg-green-500";
        case "warning":
            return "bg-yellow-500";
        case "error":
            return "bg-red-500";
        default:
            return "bg-blue-500";
    }
}

export default function AutoStopPanel() {
    const vm = useAutoStopPanelViewModel();

    const variant = vm.variant as Variant;

    return (
        <div className="bg-gray-800 rounded p-4 border border-gray-700 mt-4 text-gray-100 w-full max-w-2xl">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold">🧠 AutoStop</h3>

                {/* Global ON/OFF (din VM) */}
                <div className="flex items-center gap-2 text-sm">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${vm.isScanning ? "bg-green-500" : "bg-gray-500"}`} />
                    <span className="font-medium">{vm.isScanning ? "ON" : "OFF"}</span>
                </div>
            </div>

            {/* Runtime status (badge/notice non-blocking) */}
            <div className={`mt-3 rounded border px-3 py-2 text-sm ${badgeClasses(variant)}`}>
                <div className="flex items-start gap-2">
                    <span className={`mt-1 inline-block w-2.5 h-2.5 rounded-full ${dotClasses(variant)}`} />
                    <div className="flex-1">
                        <div className="font-medium">{vm.label}</div>

                        {/* Eligibilitate per item (text gata de afișat din VM) */}
                        <div className="mt-1 opacity-90">{vm.eligibilityText}</div>

                        {/* Opțional: pt timeline/debug UI ulterior, dar fără logică */}
                        {vm.lastEventType ? (
                            <div className="mt-1 text-xs opacity-70">Last event: {vm.lastEventType}</div>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
