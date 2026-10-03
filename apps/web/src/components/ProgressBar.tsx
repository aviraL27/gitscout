import type { SearchStatus } from "@gitscout/shared";

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

const STEPS: { key: SearchStatus; label: string }[] = [
  { key: "planning", label: "Planning" },
  { key: "searching", label: "Searching" },
  { key: "enriching", label: "Enriching" },
  { key: "evaluating", label: "Evaluating" },
  { key: "complete", label: "Done" },
];

const ORDER: SearchStatus[] = ["pending", "planning", "searching", "enriching", "evaluating", "complete"];

function idx(s: SearchStatus) {
  return ORDER.indexOf(s);
}

export function ProgressBar({ status, progress }: Props) {
  const cur = idx(status);

  if (status === "error") {
    return (
      <div style={{
        background: "#fef2f2",
        border: "1px solid #fca5a5",
        borderRadius: "10px",
        padding: "1rem 1.25rem",
      }}>
        <div style={{ fontWeight: 600, color: "#b91c1c", fontSize: "0.875rem" }}>Search failed</div>
        <div style={{ color: "#ef4444", fontSize: "0.8125rem", marginTop: "0.25rem" }}>{progress.message}</div>
      </div>
    );
  }

  return (
    <div style={{
      background: "#fff",
      border: "1px solid var(--color-paper-3)",
      borderRadius: "10px",
      padding: "1rem 1.25rem",
    }}>
      {/* Step row */}
      <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
        {STEPS.map((step, i) => {
          const stepIdx = idx(step.key);
          const done = stepIdx < cur;
          const active = stepIdx === cur;
          const isLast = i === STEPS.length - 1;

          return (
            <div key={step.key} style={{ display: "flex", alignItems: "center", flex: isLast ? 0 : 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexShrink: 0 }}>
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: done ? "#22c55e" : active ? "var(--color-ink)" : "var(--color-paper-2)",
                  border: active ? "2px solid var(--color-ink)" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  color: done || active ? "#fff" : "var(--color-ink-4)",
                  transition: "all 0.2s",
                }}>
                  {done ? "✓" : i + 1}
                </div>
                <span style={{
                  fontSize: "0.75rem",
                  fontWeight: active ? 600 : 400,
                  color: done ? "#22c55e" : active ? "var(--color-ink)" : "var(--color-ink-4)",
                }}>
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div style={{
                  flex: 1,
                  height: 1,
                  background: done ? "#22c55e" : "var(--color-paper-2)",
                  margin: "0 0.5rem",
                  transition: "background 0.3s",
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Message */}
      <div style={{ marginTop: "0.75rem", fontSize: "0.8125rem", color: "var(--color-ink-3)" }}>
        {progress.message}
      </div>

      {/* Counts */}
      {(progress.found > 0 || progress.enriched > 0 || progress.evaluated > 0) && (
        <div style={{
          display: "flex",
          gap: "1rem",
          marginTop: "0.5rem",
          fontSize: "0.75rem",
          color: "var(--color-ink-4)",
          fontFamily: "var(--font-mono)",
        }}>
          {progress.found > 0 && <span>{progress.found} found</span>}
          {progress.enriched > 0 && <span>{progress.enriched} enriched</span>}
          {progress.evaluated > 0 && <span>{progress.evaluated} evaluated</span>}
        </div>
      )}
    </div>
  );
}
