import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { postSearch } from "../lib/api";

const LOCATION_OPTIONS = [
  "India",
  "United States",
  "United Kingdom",
  "Germany",
  "Singapore",
  "Worldwide",
];

const LANGUAGE_SUGGESTIONS = [
  "Python",
  "TypeScript",
  "JavaScript",
  "Rust",
  "Go",
  "Java",
];

export function SearchPage() {
  const navigate = useNavigate();
  const [requirement, setRequirement] = useState(
    "Find AI/ML developers with LLM and RAG experience"
  );
  const [locationScope, setLocationScope] = useState("India");
  const [languages, setLanguages] = useState<string[]>(["Python"]);
  const [customLang, setCustomLang] = useState("");
  const [minRelevance, setMinRelevance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleLanguage(lang: string) {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  }

  function addCustomLang() {
    const trimmed = customLang.trim();
    if (trimmed && !languages.includes(trimmed)) {
      setLanguages((prev) => [...prev, trimmed]);
    }
    setCustomLang("");
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { jobId } = await postSearch({
        requirement,
        locationScope,
        languages: languages.length > 0 ? languages : undefined,
        minRelevance: minRelevance > 0 ? minRelevance : undefined,
      });
      navigate(`/results/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-3xl">🔭</span>
          <h1 className="text-4xl font-bold tracking-tight text-white">GitScout</h1>
        </div>
        <p className="text-gray-400 text-lg mt-1">
          AI-powered GitHub developer discovery
        </p>
      </div>

      {/* Search form */}
      <form
        onSubmit={handleSearch}
        className="w-full max-w-2xl bg-gray-900 rounded-2xl border border-gray-800 p-8 shadow-xl space-y-6"
      >
        {/* Requirement */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            What are you looking for?
          </label>
          <textarea
            rows={3}
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            placeholder="Find developers in India who have built LLM/RAG applications using Python…"
            required
            minLength={5}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Country / Location
          </label>
          <select
            value={locationScope}
            onChange={(e) => setLocationScope(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {LOCATION_OPTIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Languages */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Programming languages
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {LANGUAGE_SUGGESTIONS.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => toggleLanguage(lang)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  languages.includes(lang)
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:border-indigo-500"
                }`}
              >
                {lang}
              </button>
            ))}
            {/* Custom tags */}
            {languages
              .filter((l) => !LANGUAGE_SUGGESTIONS.includes(l))
              .map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium border bg-indigo-600 border-indigo-500 text-white"
                >
                  {lang} ✕
                </button>
              ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customLang}
              onChange={(e) => setCustomLang(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomLang();
                }
              }}
              placeholder="Add language…"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={addCustomLang}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-200"
            >
              Add
            </button>
          </div>
        </div>

        {/* Min relevance — shown as a visual note since Gemma isn't wired yet */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Minimum relevance score{" "}
            <span className="text-gray-500 text-xs">(used in Phase 3)</span>
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minRelevance}
              onChange={(e) => setMinRelevance(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-white font-mono w-8 text-right">{minRelevance}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors text-base"
        >
          {loading ? "Starting search…" : "🔍 Search GitHub"}
        </button>
      </form>
    </div>
  );
}
