import { cn } from "@/lib/utils";

type Signal = "positive" | "neutral" | "negative" | "warning";

interface SignalDotProps {
  signal: Signal;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
}

const signalColors: Record<Signal, string> = {
  positive: "bg-emerald-500",
  neutral: "bg-blue-400",
  warning: "bg-amber-400",
  negative: "bg-red-500",
};

const pulseColors: Record<Signal, string> = {
  positive: "bg-emerald-400",
  neutral: "bg-blue-300",
  warning: "bg-amber-300",
  negative: "bg-red-400",
};

const sizes = {
  sm: "h-2 w-2",
  md: "h-3 w-3",
  lg: "h-4 w-4",
};

export function SignalDot({ signal, size = "md", pulse = true, className }: SignalDotProps) {
  return (
    <span className={cn("relative inline-flex", sizes[size], className)}>
      {pulse && (
        <span
          className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-50",
            pulseColors[signal],
          )}
        />
      )}
      <span className={cn("relative inline-flex rounded-full h-full w-full", signalColors[signal])} />
    </span>
  );
}

export function SignalBadge({ signal, label }: { signal: Signal; label: string }) {
  const colorMap: Record<Signal, string> = {
    positive: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/20 dark:text-emerald-400",
    neutral: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-400",
    warning: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/20 dark:text-amber-400",
    negative: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/20 dark:text-red-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        colorMap[signal],
      )}
    >
      {label}
    </span>
  );
}
