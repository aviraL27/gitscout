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

function generateClientOutreach(candidate: Candidate, requirement?: string): { subject: string; body: string } {
  const displayName = candidate.name || candidate.username;
  const topRepo = candidate.repositories.length > 0
    ? [...candidate.repositories].sort((a, b) => b.stars - a.stars)[0]
    : null;
  const primarySkill = candidate.matchingSkills?.[0] || candidate.languages?.[0] || "software engineering";
  const reqText = requirement || "high-impact development roles";

  const subject = topRepo
    ? `Loved your work on ${topRepo.name} · ${primarySkill} opportunity`
    : `Connecting on GitHub · ${primarySkill} opportunity`;

  const repoHighlight = topRepo
    ? `I was particularly impressed by your project "${topRepo.name}"${topRepo.description ? ` (${topRepo.description})` : ""}${topRepo.language ? ` built with ${topRepo.language}` : ""}.`
    : `I was really impressed by your active public contributions across ${candidate.languages.slice(0, 3).join(", ") || "GitHub"}.`;

  const body = `Hi ${displayName},

I came across your GitHub profile (@${candidate.username}) while sourcing developers with expertise in ${reqText}.

${repoHighlight}

We are currently building high-impact systems and looking for talented engineers with your specific hands-on background. Would you be open to a brief 15-minute introductory conversation this week to explore potential collaboration?

Looking forward to connecting!

Best regards,
Aviral`;

  return { subject, body };
}

export function CandidateCard({ candidate, jobId, requirement }: Props) {
  const [expanded, setExpanded] = useState(false);
  const initialOutreach = candidate.outreachDraft ?? generateClientOutreach(candidate, requirement);
  const [outreach, setOutreach] = useState<{ subject: string; body: string }>(initialOutreach);
  const [recipientEmail, setRecipientEmail] = useState(candidate.email || "");
  const [showOutreach, setShowOutreach] = useState(false);
  const [copiedSubject, setCopiedSubject] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [loadingOutreach, setLoadingOutreach] = useState(false);

  const topRepos = [...candidate.repositories]
    .sort((a, b) => b.stars - a.stars)
    .slice(0, expanded ? 6 : 3);

  async function generateOutreach() {
    setLoadingOutreach(true);
    setShowOutreach(true);
    try {
      const data = await postOutreach(jobId ?? "latest", candidate.username, {
        senderName: "Aviral",
        requirement: requirement ?? "Senior developer",
        candidate,
      });
      if (data?.subject && data?.body) {
        setOutreach(data);
      }
    } catch {
      // Fallback is already initialized
    }
    setLoadingOutreach(false);
  }

  function handleResetOutreach() {
    const fresh = generateClientOutreach(candidate, requirement);
    setOutreach(fresh);
    if (candidate.email) {
      setRecipientEmail(candidate.email);
    }
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
          {candidate.email ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginTop: "0.3125rem", flexWrap: "wrap" }}>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
                fontSize: "0.75rem",
                color: "#15803d",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                padding: "2px 8px",
                borderRadius: "100px",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
              }}>
                <span>✉</span>
                <a
                  href={`mailto:${candidate.email}`}
                  style={{ color: "inherit", textDecoration: "none" }}
                  title="Send email"
                >
                  {candidate.email}
                </a>
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(candidate.email!);
                  setCopiedEmail(true);
                  setTimeout(() => setCopiedEmail(false), 2000);
                }}
                style={{
                  padding: "1px 6px",
                  borderRadius: "4px",
                  border: "1px solid var(--color-paper-3)",
                  background: "#fff",
                  fontSize: "0.6875rem",
                  color: copiedEmail ? "var(--color-accent)" : "var(--color-ink-3)",
                  cursor: "pointer",
                }}
                title="Copy email address"
              >
                {copiedEmail ? "✓ Copied" : "Copy"}
              </button>
            </div>
          ) : (
            <div style={{ fontSize: "0.6875rem", color: "var(--color-ink-4)", marginTop: "0.25rem", fontStyle: "italic" }}>
              ✉ No public email listed
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
      {showOutreach && (
        <div style={{
          marginTop: "1.125rem",
          background: "var(--color-paper)",
          border: "1px solid var(--color-paper-3)",
          borderRadius: "10px",
          padding: "1rem 1.25rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.875rem" }}>✉️</span>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.05em", color: "var(--color-ink-2)", textTransform: "uppercase" }}>
                Personalized Outreach Email
              </span>
              <span style={{
                fontSize: "0.6875rem",
                background: "var(--color-paper-2)",
                color: "var(--color-ink-3)",
                padding: "2px 8px",
                borderRadius: "100px",
                fontWeight: 600,
              }}>
                @{candidate.username}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <button
                type="button"
                onClick={handleResetOutreach}
                title="Reset email to original template"
                style={{
                  padding: "0.25rem 0.5rem",
                  borderRadius: "6px",
                  border: "1px solid var(--color-paper-3)",
                  background: "#fff",
                  fontSize: "0.75rem",
                  color: "var(--color-ink-3)",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                ↺ Reset Draft
              </button>
              <button
                type="button"
                onClick={generateOutreach}
                disabled={loadingOutreach}
                style={{
                  padding: "0.25rem 0.625rem",
                  borderRadius: "6px",
                  border: "1px solid var(--color-paper-3)",
                  background: "#fff",
                  fontSize: "0.75rem",
                  color: "var(--color-accent)",
                  cursor: loadingOutreach ? "wait" : "pointer",
                  fontWeight: 600,
                }}
              >
                {loadingOutreach ? "Refining with Gemma 4…" : "⚡ Enhance with AI"}
              </button>
            </div>
          </div>

          {/* Recipient */}
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
              <label style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--color-ink-4)", textTransform: "uppercase" }}>
                To (Recipient Email)
              </label>
              {candidate.email && recipientEmail === candidate.email ? (
                <span style={{ fontSize: "0.6875rem", background: "#f0fdf4", color: "#166534", padding: "1px 6px", borderRadius: "100px", fontWeight: 600 }}>
                  ✓ Discovered from Git Commits
                </span>
              ) : (
                <span style={{ fontSize: "0.6875rem", color: "var(--color-ink-4)" }}>
                  Editable
                </span>
              )}
            </div>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="Enter recipient email (e.g. developer@gmail.com)"
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#fff",
                border: "1px solid var(--color-paper-3)",
                borderRadius: "6px",
                padding: "0.5rem 0.75rem",
                fontSize: "0.8125rem",
                color: "var(--color-ink)",
                fontFamily: "var(--font-mono)",
                outline: "none",
              }}
            />
          </div>

          {/* Subject */}
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
              <label style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--color-ink-4)", textTransform: "uppercase" }}>
                Subject Line
              </label>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(outreach.subject);
                  setCopiedSubject(true);
                  setTimeout(() => setCopiedSubject(false), 2000);
                }}
                style={{
                  padding: "0.15rem 0.5rem",
                  borderRadius: "4px",
                  border: "1px solid var(--color-paper-3)",
                  background: "transparent",
                  fontSize: "0.6875rem",
                  color: copiedSubject ? "var(--color-accent)" : "var(--color-ink-3)",
                  cursor: "pointer",
                }}
              >
                {copiedSubject ? "✓ Copied" : "Copy Subject"}
              </button>
            </div>
            <input
              type="text"
              value={outreach.subject}
              onChange={(e) => setOutreach((prev) => ({ ...prev, subject: e.target.value }))}
              placeholder="Email subject..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#fff",
                border: "1px solid var(--color-paper-3)",
                borderRadius: "6px",
                padding: "0.5rem 0.75rem",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--color-ink)",
                outline: "none",
              }}
            />
          </div>

          {/* Body */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
              <label style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--color-ink-4)", textTransform: "uppercase" }}>
                Message Body
              </label>
              <span style={{ fontSize: "0.6875rem", color: "var(--color-ink-4)", fontFamily: "var(--font-mono)" }}>
                {outreach.body.split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <textarea
              rows={8}
              value={outreach.body}
              onChange={(e) => setOutreach((prev) => ({ ...prev, body: e.target.value }))}
              placeholder="Write or edit your pitch message..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "#fff",
                border: "1px solid var(--color-paper-3)",
                borderRadius: "6px",
                padding: "0.75rem",
                fontSize: "0.8125rem",
                color: "var(--color-ink-2)",
                lineHeight: 1.6,
                fontFamily: "var(--font-sans)",
                outline: "none",
                resize: "vertical",
              }}
            />
            <div style={{ fontSize: "0.6875rem", color: "var(--color-ink-4)", marginTop: "0.25rem" }}>
              💡 All fields are directly editable. Any edits will be automatically passed when opening in Gmail or your Mail app.
            </div>
          </div>

          {/* Email Action Buttons */}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.875rem", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`Subject: ${outreach.subject}\n\n${outreach.body}`);
                setCopiedBody(true);
                setTimeout(() => setCopiedBody(false), 2000);
              }}
              style={{
                padding: "0.375rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid var(--color-paper-3)",
                background: "#fff",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: copiedBody ? "var(--color-accent)" : "var(--color-ink-2)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <span>{copiedBody ? "✓" : "📋"}</span>
              <span>{copiedBody ? "Copied to clipboard!" : "Copy Full Email"}</span>
            </button>

            {/* Direct Web Gmail Composer */}
            <a
              href={`https://mail.google.com/mail/?view=cm&fs=1${recipientEmail ? `&to=${encodeURIComponent(recipientEmail)}` : ""}&su=${encodeURIComponent(outreach.subject)}&body=${encodeURIComponent(outreach.body)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "0.375rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #ea4335",
                background: "#fff5f5",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#c5221f",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
              title="Open draft directly in Gmail web composer"
            >
              <span>🔴</span>
              <span>Open in Gmail</span>
            </a>

            {/* Default Mail Client (mailto) */}
            <a
              href={recipientEmail
                ? `mailto:${recipientEmail}?subject=${encodeURIComponent(outreach.subject)}&body=${encodeURIComponent(outreach.body)}`
                : `mailto:?subject=${encodeURIComponent(outreach.subject)}&body=${encodeURIComponent(outreach.body)}`}
              style={{
                padding: "0.375rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid var(--color-paper-3)",
                background: "#fff",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--color-ink-2)",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <span>🚀</span>
              <span>Open in Mail App</span>
            </a>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", flexWrap: "wrap", alignItems: "center" }}>
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
          View GitHub ↗
        </a>
        <button
          onClick={() => setShowOutreach(!showOutreach)}
          style={{
            padding: "0.4375rem 0.875rem",
            borderRadius: "8px",
            border: showOutreach ? "1px solid var(--color-ink)" : "1px solid var(--color-paper-3)",
            background: showOutreach ? "var(--color-ink)" : "transparent",
            fontSize: "0.8125rem",
            color: showOutreach ? "#fff" : "var(--color-ink)",
            cursor: "pointer",
            fontWeight: 500,
            fontFamily: "var(--font-sans)",
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            transition: "all 0.1s",
          }}
        >
          <span>✉️</span>
          <span>{showOutreach ? "Hide Email Draft" : "Draft Outreach Email"}</span>
        </button>
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
