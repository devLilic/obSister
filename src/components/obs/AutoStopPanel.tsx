// filepath: src/components/obs/AutoStopPanel.tsx
import { useAutoStopPanelViewModel } from "../../hooks/useAutoStopPanelViewModel";
import { useEffect, useState } from "react";

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
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    const variant = vm.variant as Variant;

    useEffect(() => {
        if (vm.stopFramePath) {
            window.api.stopFrames.openPreview(vm.stopFramePath).then((url) => {
                setImageUrl(url);
            });
        } else {
            setImageUrl(null);
        }
    }, [vm.stopFramePath]);

    return (

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex flex-col w-1/2 text-gray-100 ">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold">🧠 AutoStop</h3>

                {/* Global ON/OFF (din VM) */}
                <div className="flex items-center gap-2 text-sm">
                    {vm.isScanning && (
                        <span className="text-xs text-green-400 animate-pulse mr-1">Scanning</span>
                    )}
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${vm.isEnabled ? "bg-green-500" : "bg-gray-500"}`} />
                    <span className="font-medium">{vm.isEnabled ? "ON" : "OFF"}</span>
                </div>
            </div>

            {/* Runtime status (badge/notice non-blocking) */}
            <div className={`mt-3 rounded border px-3 py-2 text-sm ${badgeClasses(variant)}`}>
                <div className="flex items-start gap-2">
                    <span className={`mt-1 inline-block w-2.5 h-2.5 rounded-full ${dotClasses(variant)}`} />
                    <div className="flex-1">
                        <div className="font-medium">{vm.label}</div>

                        {/* StopFrame Image Preview */}
                        <div className="my-2">
                            <div className="relative rounded overflow-hidden border border-gray-600 bg-black/40 inline-block min-w-[200px] min-h-[112px]">
                                {imageUrl ? (
                                    <img 
                                        src={imageUrl} 
                                        alt="StopFrame" 
                                        className="max-h-32 object-contain"
                                    />
                                ) : (
                                    <div className="w-[200px] h-[112px] bg-black" />
                                )}
                            </div>
                        </div>

                        {/* Eligibilitate per item (text gata de afișat din VM) */}
                        <div className="opacity-90">{vm.eligibilityText}</div>

                    </div>
                </div>
            </div>
        </div>
    );
}
