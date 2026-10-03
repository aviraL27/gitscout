import { SearchStatus } from "@gitscout/shared";

interface Progress {
  message: string;
  found: number;
  enriched: number;
  evaluated: number;
}

interface Props {
  status: SearchStatus;
  progress: Progress;
}

const STATUS_STEPS: { key: SearchStatus; label: string }[] = [
  { key: "planning", label: "Planning queries" },
  { key: "searching", label: "Searching GitHub" },
  { key: "enriching", label: "Enriching profiles" },
  { key: "evaluating", label: "AI evaluation" },
  { key: "complete", label: "Complete" },
];

const STATUS_ORDER: SearchStatus[] = [
  "pending",
  "planning",
  "searching",
  "enriching",
  "evaluating",
  "complete",
];

function getStepIndex(status: SearchStatus) {
  return STATUS_ORDER.indexOf(status);
}

export function ProgressBar({ status, progress }: Props) {
  const currentIdx = getStepIndex(status);

  if (status === "error") {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-xl px-6 py-4">
        <div className="text-red-400 font-medium">Search failed</div>
        <div className="text-red-300 text-sm mt-1">{progress.message}</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-6 py-5 space-y-4">
      {/* Step indicators */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUS_STEPS.map((step, idx) => {
          const stepIdx = getStepIndex(step.key);
          const done = stepIdx < currentIdx;
          const active = stepIdx === currentIdx;

          return (
            <div key={step.key} className="flex items-center gap-1.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  done
                    ? "bg-green-500 text-white"
                    : active
                    ? "bg-indigo-600 text-white animate-pulse"
                    : "bg-gray-700 text-gray-500"
                }`}
              >
                {done ? "✓" : idx + 1}
              </div>
              <span
                className={`text-sm ${
                  done
                    ? "text-green-400"
                    : active
                    ? "text-white font-medium"
                    : "text-gray-500"
                }`}
              >
                {step.label}
              </span>
              {idx < STATUS_STEPS.length - 1 && (
                <div
                  className={`h-px w-4 sm:w-8 ${done ? "bg-green-500" : "bg-gray-700"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current message */}
      <div className="text-gray-300 text-sm">{progress.message}</div>

      {/* Counts */}
      {(progress.found > 0 || progress.enriched > 0) && (
        <div className="flex gap-4 text-xs text-gray-500">
          {progress.found > 0 && <span>🔍 {progress.found} found</span>}
          {progress.enriched > 0 && <span>✅ {progress.enriched} enriched</span>}
          {progress.evaluated > 0 && <span>🤖 {progress.evaluated} evaluated</span>}
        </div>
      )}
    </div>
  );
}
