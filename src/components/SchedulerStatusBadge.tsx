// filepath: src/components/SchedulerStatusBadge.tsx
type StreamVariant = "idle" | "live" | "ending" | "ended" | "error";

type Props = {
    label: string;
    variant: StreamVariant;
    reasonLabel?: string;
};

function getBadgeText(label: string, variant: StreamVariant, reasonLabel?: string) {
    if (variant === "live") return "LIVE NOW";
    if (variant === "ending") return "Ending…";
    if (variant === "ended") return reasonLabel ? `Ended — ${reasonLabel}` : "Ended";
    if (variant === "error") return label || "Error";
    return "Idle";
}

function getDotClass(variant: StreamVariant) {
    if (variant === "live") return "bg-green-600";
    if (variant === "ending") return "bg-yellow-500";
    if (variant === "ended") return "bg-gray-500";
    if (variant === "error") return "bg-red-600";
    return "bg-gray-600";
}

export default function SchedulerStatusBadge({ label, variant, reasonLabel }: Props) {
    const text = getBadgeText(label, variant, reasonLabel);
    const dot = getDotClass(variant);

    return (
        <div className="flex items-center gap-2 ml-2">
            <span className={`inline-block w-3 h-3 rounded-full shadow-md ${dot}`} />
            <span className="text-sm font-medium text-gray-200">{text}</span>
        </div>
    );
}
