import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Candidate, SearchJob } from "@gitscout/shared";
import { getSearchJob } from "../lib/api";
import { CandidateCard } from "../components/CandidateCard";
import { ProgressBar } from "../components/ProgressBar";

type SortKey = "default" | "followers" | "repos" | "stars";

function sortCandidates(candidates: Candidate[], key: SortKey): Candidate[] {
  const copy = [...candidates];
  switch (key) {
    case "followers":
      return copy.sort((a, b) => b.followers - a.followers);
    case "repos":
      return copy.sort((a, b) => b.publicRepos - a.publicRepos);
    case "stars":
      return copy.sort((a, b) => {
        const aStars = a.repositories.reduce((s, r) => s + r.stars, 0);
        const bStars = b.repositories.reduce((s, r) => s + r.stars, 0);
        return bStars - aStars;
      });
    case "default":
    default:
      return copy;
  }
}

const POLL_INTERVAL_MS = 2500;

export function ResultsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<SearchJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [filterLang, setFilterLang] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!jobId) return;

    async function fetchJob() {
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

    fetchJob();
    intervalRef.current = setInterval(fetchJob, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [jobId]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4">{error}</div>
          <Link to="/" className="text-indigo-400 hover:text-indigo-300">
            ← New search
          </Link>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Loading…</div>
      </div>
    );
  }

  const isRunning = job.status !== "complete" && job.status !== "error";

  // Collect all unique languages across candidates for filter
  const allLangs = [...new Set(job.candidates.flatMap((c) => c.languages))].sort();

  // Apply filter then sort
  const filtered = filterLang
    ? job.candidates.filter((c) => c.languages.includes(filterLang))
    : job.candidates;
  const displayed = sortCandidates(filtered, sortKey);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Nav */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/"
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← New search
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-white font-medium flex items-center gap-1">
            🔭 GitScout
          </span>
        </div>

        {/* Search summary */}
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-white">
            {job.criteria.requirement}
          </h2>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
            <span>📍 {job.criteria.locationScope}</span>
            {job.criteria.languages && job.criteria.languages.length > 0 && (
              <span>
                💻 {job.criteria.languages.join(", ")}
              </span>
            )}
            {job.plan && (
              <span>🔑 {job.plan.githubQueries.length} queries</span>
            )}
          </div>
        </div>

        {/* Progress */}
        {(isRunning || job.status === "error") && (
          <div className="mb-6">
            <ProgressBar status={job.status} progress={job.progress} />
          </div>
        )}

        {/* Complete summary */}
        {job.status === "complete" && (
          <div className="bg-green-900/20 border border-green-800 rounded-xl px-5 py-3 mb-6 flex items-center gap-3">
            <span className="text-green-400 text-lg">✅</span>
            <span className="text-green-300 font-medium">
              Found {job.candidates.length} candidates
            </span>
            <span className="text-gray-500 text-sm ml-auto">
              {job.plan && `${job.plan.githubQueries.length} GitHub queries executed`}
            </span>
          </div>
        )}

        {/* Controls */}
        {job.candidates.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-5">
            {/* Sort */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Sort:</span>
              {(["default", "followers", "repos", "stars"] as SortKey[]).map(
                (key) => (
                  <button
                    key={key}
                    onClick={() => setSortKey(key)}
                    className={`px-2.5 py-1 rounded-lg border text-xs transition-all ${
                      sortKey === key
                        ? "bg-indigo-600 border-indigo-500 text-white"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
                    }`}
                  >
                    {key === "default"
                      ? "Default"
                      : key === "followers"
                      ? "Followers"
                      : key === "repos"
                      ? "Repos"
                      : "Stars"}
                  </button>
                )
              )}
            </div>

            {/* Language filter */}
            {allLangs.length > 0 && (
              <div className="flex items-center gap-2 text-sm ml-auto">
                <span className="text-gray-400">Language:</span>
                <select
                  value={filterLang}
                  onChange={(e) => setFilterLang(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none"
                >
                  <option value="">All</option>
                  {allLangs.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <span className="text-gray-500 text-xs">
              {displayed.length} of {job.candidates.length}
            </span>
          </div>
        )}

        {/* Candidate list */}
        {displayed.length > 0 ? (
          <div className="space-y-4">
            {displayed.map((c) => (
              <CandidateCard key={c.id} candidate={c} />
            ))}
          </div>
        ) : (
          !isRunning && (
            <div className="text-center py-16 text-gray-500">
              <div className="text-4xl mb-3">🔍</div>
              <div>No candidates found. Try broadening your search.</div>
            </div>
          )
        )}

        {/* Plan debug info */}
        {job.plan && (
          <details className="mt-8 text-xs text-gray-600">
            <summary className="cursor-pointer hover:text-gray-400">
              Debug: Search plan
            </summary>
            <pre className="mt-2 bg-gray-900 border border-gray-800 rounded-lg p-4 overflow-auto">
              {JSON.stringify(job.plan, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
