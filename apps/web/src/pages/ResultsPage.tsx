import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Candidate, SearchJob } from "@gitscout/shared";
import { getSearchJob } from "../lib/api";
import { CandidateCard } from "../components/CandidateCard";
import { ProgressBar } from "../components/ProgressBar";

type SortKey = "relevance" | "followers" | "repos" | "stars";

function sortCandidates(candidates: Candidate[], key: SortKey): Candidate[] {
  const copy = [...candidates];
  switch (key) {
    case "followers":
      return copy.sort((a, b) => b.followers - a.followers);
    case "repos":
      return copy.sort((a, b) => b.publicRepos - a.publicRepos);
    case "stars":
      return copy.sort((a, b) => {
        const aS = a.repositories.reduce((s, r) => s + r.stars, 0);
        const bS = b.repositories.reduce((s, r) => s + r.stars, 0);
        return bS - aS;
      });
    case "relevance":
    default:
      return copy.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
  }
}

const POLL_MS = 2500;

export function ResultsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<SearchJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("relevance");
  const [filterLang, setFilterLang] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!jobId) return;
    async function poll() {
      try {
        const data = await getSearchJob(jobId!);
        setJob(data);
        if (data.status === "complete" || data.status === "error") {
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch job");
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }
    poll();
    intervalRef.current = setInterval(poll, POLL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [jobId]);

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-paper)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: "var(--color-danger)", marginBottom: "1rem" }}>{error}</div>
          <Link to="/" style={{ color: "var(--color-accent)", textDecoration: "none" }}>← New search</Link>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--color-paper)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--color-ink-4)", fontFamily: "var(--font-mono)", fontSize: "0.875rem" }}>Loading…</div>
      </div>
    );
  }

  const isRunning = job.status !== "complete" && job.status !== "error";
  const allLangs = [...new Set(job.candidates.flatMap((c) => c.languages))].sort();
  const filtered = filterLang ? job.candidates.filter((c) => c.languages.includes(filterLang)) : job.candidates;
  const displayed = sortCandidates(filtered, sortKey);

  function exportCsv() {
    if (!job || job.candidates.length === 0) return;
    const headers = ["Name", "Username", "Email", "Relevance Score", "Profile URL", "Location", "Followers", "Public Repos", "Languages"];
    const rows = job.candidates.map((c) => [
      `"${(c.name || "").replace(/"/g, '""')}"`,
      `"${c.username}"`,
      `"${c.email || ""}"`,
      c.relevanceScore ?? "",
      `"${c.profileUrl}"`,
      `"${(c.location || "").replace(/"/g, '""')}"`,
      c.followers,
      c.publicRepos,
      `"${(c.languages || []).join(", ")}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gitscout-${job.id || "candidates"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-paper)" }}>
      {/* Sticky header */}
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "rgba(247,246,242,0.92)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--color-paper-3)",
        padding: "0.875rem 2rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
      }}>
        <Link to="/" style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          textDecoration: "none",
          color: "var(--color-ink-3)",
          fontSize: "0.875rem",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          New search
        </Link>
        <div style={{ width: 1, height: 16, background: "var(--color-paper-3)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--color-accent)" }}>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span style={{ fontWeight: 700, color: "var(--color-ink)", fontSize: "0.875rem" }}>GitScout</span>
        </div>
        <div style={{ flex: 1 }} />
        {job.status === "complete" && (
          <span style={{ fontSize: "0.8125rem", color: "var(--color-ink-3)", fontFamily: "var(--font-mono)" }}>
            {displayed.length} candidates
          </span>
        )}
      </header>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Query summary */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--color-ink)",
            margin: 0,
            lineHeight: 1.3,
          }}>
            {job.criteria.requirement}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginTop: "0.625rem" }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.25rem 0.625rem",
              borderRadius: "100px",
              border: "1px solid var(--color-paper-3)",
              fontSize: "0.75rem",
              color: "var(--color-ink-3)",
              background: "#fff",
            }}>
              📍 {job.criteria.locationScope}
            </span>
            {job.criteria.languages?.map((l) => (
              <span key={l} style={{
                display: "inline-flex",
                padding: "0.25rem 0.625rem",
                borderRadius: "100px",
                border: "1px solid var(--color-paper-3)",
                fontSize: "0.75rem",
                color: "var(--color-ink-3)",
                background: "#fff",
              }}>
                {l}
              </span>
            ))}
            {job.plan && (
              <span style={{
                display: "inline-flex",
                padding: "0.25rem 0.625rem",
                borderRadius: "100px",
                border: "1px solid var(--color-paper-3)",
                fontSize: "0.75rem",
                color: "var(--color-ink-4)",
                background: "#fff",
                fontFamily: "var(--font-mono)",
              }}>
                {job.plan.githubQueries.length} queries
              </span>
            )}
          </div>
        </div>

        {/* Progress */}
        {(isRunning || job.status === "error") && (
          <div style={{ marginBottom: "1.5rem" }}>
            <ProgressBar status={job.status} progress={job.progress} />
          </div>
        )}

        {/* Complete banner */}
        {job.status === "complete" && job.candidates.length > 0 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            marginBottom: "1.5rem",
            fontSize: "0.875rem",
          }}>
            <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ {job.candidates.length} candidates found</span>
            {job.candidates.filter(c => !!c.email).length > 0 && (
              <span style={{
                background: "#dcfce7",
                color: "#15803d",
                padding: "2px 8px",
                borderRadius: "100px",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}>
                ✉ {job.candidates.filter(c => !!c.email).length} direct emails found
              </span>
            )}
            <span style={{ color: "var(--color-ink-4)", marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
              Gemma 4 evaluated
            </span>
          </div>
        )}

        {/* Controls */}
        {job.candidates.length > 0 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1.25rem",
            flexWrap: "wrap",
          }}>
            {/* Sort buttons */}
            <div style={{ display: "flex", gap: "0.25rem" }}>
              {(["relevance", "followers", "repos", "stars"] as SortKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setSortKey(key)}
                  style={{
                    padding: "0.375rem 0.75rem",
                    borderRadius: "8px",
                    border: `1px solid ${sortKey === key ? "var(--color-ink)" : "var(--color-paper-3)"}`,
                    background: sortKey === key ? "var(--color-ink)" : "transparent",
                    color: sortKey === key ? "#fff" : "var(--color-ink-3)",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    transition: "all 0.1s",
                  }}
                >
                  {key === "relevance" ? "Relevance" : key === "followers" ? "Followers" : key === "repos" ? "Repos" : "Stars"}
                </button>
              ))}
            </div>

            {/* Language filter */}
            {allLangs.length > 0 && (
              <select
                value={filterLang}
                onChange={(e) => setFilterLang(e.target.value)}
                style={{
                  marginLeft: "auto",
                  padding: "0.375rem 0.75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--color-paper-3)",
                  background: "#fff",
                  fontSize: "0.75rem",
                  color: "var(--color-ink-2)",
                  outline: "none",
                }}
              >
                <option value="">All languages</option>
                {allLangs.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            )}

            <button
              onClick={exportCsv}
              title="Download CSV containing candidates, scores, and email addresses"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                padding: "0.375rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid var(--color-paper-3)",
                background: "#fff",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--color-ink-2)",
                cursor: "pointer",
                transition: "all 0.1s",
              }}
            >
              <span>📥</span>
              <span>Export CSV</span>
            </button>

            <span style={{ fontSize: "0.75rem", color: "var(--color-ink-4)", fontFamily: "var(--font-mono)" }}>
              {displayed.length}/{job.candidates.length}
            </span>
          </div>
        )}

        {/* Results */}
        {displayed.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {displayed.map((c) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                jobId={jobId}
                requirement={job.criteria.requirement}
              />
            ))}
          </div>
        ) : (
          !isRunning && (
            <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--color-ink-4)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>◎</div>
              <div style={{ fontSize: "0.9375rem" }}>No candidates matched. Try broadening your search.</div>
            </div>
          )
        )}

        {/* Debug plan */}
        {job.plan && (
          <details style={{ marginTop: "2rem" }}>
            <summary style={{
              cursor: "pointer",
              fontSize: "0.75rem",
              color: "var(--color-ink-4)",
              fontFamily: "var(--font-mono)",
              listStyle: "none",
            }}>
              ▸ Debug: search plan ({job.plan.githubQueries.length} queries)
            </summary>
            <pre style={{
              marginTop: "0.5rem",
              background: "#fff",
              border: "1px solid var(--color-paper-3)",
              borderRadius: "8px",
              padding: "1rem",
              fontSize: "0.75rem",
              color: "var(--color-ink-3)",
              overflow: "auto",
              fontFamily: "var(--font-mono)",
            }}>
              {JSON.stringify(job.plan, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
