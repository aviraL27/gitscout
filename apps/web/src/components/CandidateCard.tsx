import type { Candidate } from "@gitscout/shared";
import { useState } from "react";
import { postOutreach } from "../lib/api";

interface Props {
  candidate: Candidate;
  jobId?: string;
  requirement?: string;
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 80 ? "#1a7a4a" : score >= 60 ? "#b45309" : "#9b9b92";
  const size = 52;
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-paper-2)" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.8125rem",
        fontWeight: 700,
        color,
        fontFamily: "var(--font-mono)",
      }}>
        {score}
      </div>
    </div>
  );
}

export function CandidateCard({ candidate, jobId, requirement }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [outreach, setOutreach] = useState<{ subject: string; body: string } | null>(null);
  const [loadingOutreach, setLoadingOutreach] = useState(false);

  const topRepos = [...candidate.repositories]
    .sort((a, b) => b.stars - a.stars)
    .slice(0, expanded ? 6 : 3);

  async function generateOutreach() {
    if (!jobId) return;
    setLoadingOutreach(true);
    try {
      const data = await postOutreach(jobId, candidate.username, {
        senderName: "Aviral",
        requirement: requirement ?? "Senior developer",
      });
      setOutreach(data);
    } catch { /* noop */ }
    setLoadingOutreach(false);
  }

  return (
    <article
      style={{
        background: "#fff",
        border: "1px solid var(--color-paper-3)",
        borderRadius: "12px",
        padding: "1.25rem 1.5rem",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-paper-2)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--color-paper-3)")}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem" }}>
        {/* Avatar */}
        {candidate.avatarUrl ? (
          <img
            src={candidate.avatarUrl}
            alt={candidate.username}
            style={{ width: 44, height: 44, borderRadius: "50%", border: "1.5px solid var(--color-paper-3)", flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "var(--color-paper-2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.125rem", fontWeight: 700, color: "var(--color-ink-3)",
            flexShrink: 0,
          }}>
            {(candidate.name ?? candidate.username)[0].toUpperCase()}
          </div>
        )}

        {/* Name + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: "var(--color-ink)", fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>
              {candidate.name ?? candidate.username}
            </span>
            <span style={{ fontSize: "0.8125rem", color: "var(--color-ink-4)", fontFamily: "var(--font-mono)" }}>
              @{candidate.username}
            </span>
          </div>
          {candidate.location && (
            <div style={{ fontSize: "0.8125rem", color: "var(--color-ink-3)", marginTop: "0.125rem" }}>
              {candidate.location}
            </div>
          )}
          {candidate.bio && (
            <p style={{
              fontSize: "0.875rem",
              color: "var(--color-ink-2)",
              marginTop: "0.375rem",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: expanded ? undefined : 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
              {candidate.bio}
            </p>
          )}
        </div>

        {/* Score */}
        {candidate.relevanceScore !== undefined && (
          <ScoreRing score={candidate.relevanceScore} />
        )}
      </div>

      {/* Stats row */}
      <div style={{
        display: "flex",
        gap: "1.25rem",
        marginTop: "0.875rem",
        fontSize: "0.8125rem",
        color: "var(--color-ink-3)",
      }}>
        <span>{candidate.followers.toLocaleString()} followers</span>
        <span>{candidate.publicRepos} repos</span>
        {candidate.company && <span>{candidate.company}</span>}
        {candidate.signals && (
          <div style={{ display: "flex", gap: "0.25rem", marginLeft: "auto" }}>
            {Object.entries(candidate.signals).map(([key, val]) => (
              <div
                key={key}
                title={key}
                style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: val ? "#22c55e" : "var(--color-paper-3)",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Languages */}
      {candidate.languages.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3125rem", marginTop: "0.75rem" }}>
          {candidate.languages.slice(0, 7).map((lang) => (
            <span key={lang} style={{
              padding: "0.1875rem 0.5625rem",
              borderRadius: "100px",
              border: "1px solid var(--color-paper-3)",
              fontSize: "0.75rem",
              color: "var(--color-ink-2)",
              background: "var(--color-paper)",
              fontWeight: 500,
            }}>
              {lang}
            </span>
          ))}
          {candidate.matchingSkills && candidate.matchingSkills
            .filter((s) => !candidate.languages.includes(s))
            .slice(0, 4)
            .map((skill) => (
              <span key={skill} style={{
                padding: "0.1875rem 0.5625rem",
                borderRadius: "100px",
                border: "1px solid #bfdbfe",
                fontSize: "0.75rem",
                color: "var(--color-accent)",
                background: "#eff6ff",
                fontWeight: 500,
              }}>
                {skill}
              </span>
            ))}
        </div>
      )}

      {/* AI reason */}
      {candidate.relevanceReason && (
        <p style={{
          marginTop: "0.875rem",
          fontSize: "0.8125rem",
          color: "var(--color-ink-3)",
          lineHeight: 1.55,
          padding: "0.625rem 0.875rem",
          background: "var(--color-paper)",
          borderRadius: "8px",
          borderLeft: "2px solid var(--color-accent)",
        }}>
          {candidate.relevanceReason}
        </p>
      )}

      {/* Repos */}
      {topRepos.length > 0 && (
        <div style={{ marginTop: "0.875rem" }}>
          <div style={{ borderTop: "1px solid var(--color-paper-2)", paddingTop: "0.75rem" }}>
            {topRepos.map((repo) => (
              <div key={repo.name} style={{
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
                padding: "0.3125rem 0",
                fontSize: "0.8125rem",
              }}>
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--color-accent)", fontWeight: 600, textDecoration: "none", flexShrink: 0 }}
                >
                  {repo.name}
                </a>
                {repo.language && (
                  <span style={{ color: "var(--color-ink-4)", fontSize: "0.75rem" }}>{repo.language}</span>
                )}
                {repo.description && (
                  <span style={{
                    color: "var(--color-ink-3)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                  }}>
                    {repo.description}
                  </span>
                )}
                <span style={{
                  marginLeft: "auto",
                  color: "var(--color-ink-4)",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  flexShrink: 0,
                }}>
                  ★ {repo.stars}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outreach */}
      {outreach && (
        <div style={{
          marginTop: "1rem",
          background: "var(--color-paper)",
          border: "1px solid var(--color-paper-3)",
          borderRadius: "8px",
          padding: "0.875rem 1rem",
        }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-ink-3)", marginBottom: "0.375rem" }}>
            DRAFT OUTREACH
          </div>
          <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-ink)", marginBottom: "0.5rem" }}>
            {outreach.subject}
          </div>
          <pre style={{
            fontSize: "0.8125rem",
            color: "var(--color-ink-2)",
            whiteSpace: "pre-wrap",
            margin: 0,
            lineHeight: 1.6,
            fontFamily: "var(--font-sans)",
          }}>
            {outreach.body}
          </pre>
          <button
            onClick={() => navigator.clipboard.writeText(`Subject: ${outreach.subject}\n\n${outreach.body}`)}
            style={{
              marginTop: "0.75rem",
              padding: "0.375rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid var(--color-paper-3)",
              background: "transparent",
              fontSize: "0.75rem",
              color: "var(--color-ink-3)",
              cursor: "pointer",
            }}
          >
            Copy to clipboard
          </button>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
        <a
          href={candidate.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: "0.4375rem 0.875rem",
            borderRadius: "8px",
            border: "1px solid var(--color-paper-3)",
            background: "transparent",
            fontSize: "0.8125rem",
            color: "var(--color-ink-2)",
            textDecoration: "none",
            fontWeight: 500,
            transition: "all 0.1s",
          }}
        >
          View GitHub
        </a>
        {jobId && (
          <button
            onClick={generateOutreach}
            disabled={loadingOutreach}
            style={{
              padding: "0.4375rem 0.875rem",
              borderRadius: "8px",
              border: "1px solid var(--color-paper-3)",
              background: "transparent",
              fontSize: "0.8125rem",
              color: outreach ? "var(--color-accent)" : "var(--color-ink-2)",
              cursor: loadingOutreach ? "wait" : "pointer",
              fontWeight: 500,
              fontFamily: "var(--font-sans)",
            }}
          >
            {loadingOutreach ? "Writing…" : outreach ? "Regenerate" : "Generate outreach"}
          </button>
        )}
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            marginLeft: "auto",
            padding: "0.4375rem 0.875rem",
            borderRadius: "8px",
            border: "1px solid var(--color-paper-3)",
            background: "transparent",
            fontSize: "0.8125rem",
            color: "var(--color-ink-4)",
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          {expanded ? "Less" : "More"}
        </button>
      </div>
    </article>
  );
}
