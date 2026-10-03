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

const LANGUAGE_SUGGESTIONS = ["Python", "TypeScript", "JavaScript", "Rust", "Go", "Java"];

const EXAMPLE_QUERIES = [
  "Find AI/ML developers in India who have built LLM and RAG applications",
  "Looking for open-source Python developers with FastAPI experience",
  "Senior engineers with deep learning and PyTorch background",
  "Full-stack developers building developer tools",
];

export function SearchPage() {
  const navigate = useNavigate();
  const [requirement, setRequirement] = useState("");
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
    const t = customLang.trim();
    if (t && !languages.includes(t)) setLanguages((p) => [...p, t]);
    setCustomLang("");
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!requirement.trim()) return;
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
    <div
      style={{ background: "var(--color-paper)", minHeight: "100vh" }}
      className="flex flex-col"
    >
      {/* Nav */}
      <header
        style={{ borderBottom: "1px solid var(--color-paper-3)" }}
        className="flex items-center justify-between px-8 py-4"
      >
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--color-accent)" }}>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="11" cy="11" r="3.5" fill="currentColor" opacity="0.4" />
          </svg>
          <span style={{ fontWeight: 700, letterSpacing: "-0.02em", color: "var(--color-ink)" }} className="text-base">
            GitScout
          </span>
        </div>
        <span style={{ fontSize: "0.75rem", color: "var(--color-ink-4)", fontFamily: "var(--font-mono)" }}>
          AI developer discovery
        </span>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        {/* Hero text */}
        <div className="text-center mb-12 max-w-xl">
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 1.1,
              color: "var(--color-ink)",
              margin: 0,
            }}
          >
            Find the right developer,
            <br />
            <span style={{ color: "var(--color-accent)" }}>not just a résumé.</span>
          </h1>
          <p style={{ marginTop: "1rem", color: "var(--color-ink-3)", fontSize: "1.0625rem", lineHeight: 1.6 }}>
            Describe what you need in plain English. GitScout searches GitHub,
            reads their code, and uses Gemma 4 to evaluate real fit.
          </p>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSearch}
          style={{
            width: "100%",
            maxWidth: "640px",
            background: "#fff",
            border: "1px solid var(--color-paper-3)",
            borderRadius: "16px",
            padding: "2rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
          }}
        >
          {/* Requirement */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--color-ink-2)",
                marginBottom: "0.5rem",
                letterSpacing: "0.01em",
              }}
            >
              What are you looking for?
            </label>
            <textarea
              rows={3}
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="Find developers in India who have built LLM/RAG applications using Python…"
              required
              minLength={5}
              style={{
                width: "100%",
                background: "var(--color-paper)",
                border: "1px solid var(--color-paper-3)",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                fontSize: "0.9375rem",
                color: "var(--color-ink)",
                resize: "none",
                outline: "none",
                lineHeight: 1.5,
                transition: "border-color 0.15s",
                fontFamily: "var(--font-sans)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--color-accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--color-paper-3)")}
            />
            {/* Example queries */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginTop: "0.5rem" }}>
              {EXAMPLE_QUERIES.slice(0, 2).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setRequirement(q)}
                  style={{
                    padding: "0.25rem 0.625rem",
                    borderRadius: "100px",
                    border: "1px solid var(--color-paper-3)",
                    background: "transparent",
                    fontSize: "0.75rem",
                    color: "var(--color-ink-3)",
                    cursor: "pointer",
                    lineHeight: 1.4,
                  }}
                >
                  {q.length > 40 ? q.slice(0, 40) + "…" : q}
                </button>
              ))}
            </div>
          </div>

          {/* Row: Location + Min relevance */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-ink-2)", marginBottom: "0.5rem" }}>
                Location
              </label>
              <select
                value={locationScope}
                onChange={(e) => setLocationScope(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--color-paper)",
                  border: "1px solid var(--color-paper-3)",
                  borderRadius: "8px",
                  padding: "0.625rem 0.875rem",
                  fontSize: "0.875rem",
                  color: "var(--color-ink)",
                  outline: "none",
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b6b63' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 0.75rem center",
                }}
              >
                {LOCATION_OPTIONS.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-ink-2)", marginBottom: "0.5rem" }}>
                Min relevance
                <span style={{ fontWeight: 400, color: "var(--color-ink-4)", marginLeft: "0.375rem" }}>
                  {minRelevance > 0 ? `≥ ${minRelevance}` : "any"}
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={90}
                step={10}
                value={minRelevance}
                onChange={(e) => setMinRelevance(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--color-accent)", marginTop: "0.5rem" }}
              />
            </div>
          </div>

          {/* Languages */}
          <div style={{ marginBottom: "1.75rem" }}>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-ink-2)", marginBottom: "0.5rem" }}>
              Languages
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "0.5rem" }}>
              {LANGUAGE_SUGGESTIONS.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  style={{
                    padding: "0.3125rem 0.75rem",
                    borderRadius: "100px",
                    border: `1px solid ${languages.includes(lang) ? "var(--color-accent)" : "var(--color-paper-3)"}`,
                    background: languages.includes(lang) ? "var(--color-accent)" : "transparent",
                    color: languages.includes(lang) ? "#fff" : "var(--color-ink-2)",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.1s",
                  }}
                >
                  {lang}
                </button>
              ))}
              {languages.filter((l) => !LANGUAGE_SUGGESTIONS.includes(l)).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  style={{
                    padding: "0.3125rem 0.75rem",
                    borderRadius: "100px",
                    border: "1px solid var(--color-accent)",
                    background: "var(--color-accent)",
                    color: "#fff",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {lang} ×
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                value={customLang}
                onChange={(e) => setCustomLang(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomLang(); } }}
                placeholder="Add language…"
                style={{
                  flex: 1,
                  background: "var(--color-paper)",
                  border: "1px solid var(--color-paper-3)",
                  borderRadius: "8px",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.8125rem",
                  color: "var(--color-ink)",
                  outline: "none",
                  fontFamily: "var(--font-sans)",
                }}
              />
              <button
                type="button"
                onClick={addCustomLang}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  border: "1px solid var(--color-paper-3)",
                  background: "transparent",
                  fontSize: "0.8125rem",
                  color: "var(--color-ink-2)",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                Add
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              color: "#b91c1c",
              fontSize: "0.875rem",
              marginBottom: "1.25rem",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !requirement.trim()}
            style={{
              width: "100%",
              background: loading || !requirement.trim() ? "var(--color-paper-3)" : "var(--color-ink)",
              color: loading || !requirement.trim() ? "var(--color-ink-4)" : "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "0.875rem 1.5rem",
              fontSize: "0.9375rem",
              fontWeight: 600,
              cursor: loading || !requirement.trim() ? "not-allowed" : "pointer",
              letterSpacing: "-0.01em",
              transition: "all 0.15s",
              fontFamily: "var(--font-sans)",
            }}
          >
            {loading ? "Starting search…" : "Search GitHub →"}
          </button>
        </form>

        {/* Gemma badge */}
        <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.375rem 0.75rem",
            borderRadius: "100px",
            border: "1px solid var(--color-paper-3)",
            background: "#fff",
            fontSize: "0.75rem",
            color: "var(--color-ink-3)",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            Gemma 4 · local via Ollama
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.375rem 0.75rem",
            borderRadius: "100px",
            border: "1px solid var(--color-paper-3)",
            background: "#fff",
            fontSize: "0.75rem",
            color: "var(--color-ink-3)",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-accent)", display: "inline-block" }} />
            GitHub API
          </div>
        </div>
      </main>
    </div>
  );
}
