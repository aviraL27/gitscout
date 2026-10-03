import { Candidate } from "@gitscout/shared";

interface Props {
  candidate: Candidate;
}

export function CandidateCard({ candidate }: Props) {
  const topRepos = candidate.repositories
    .sort((a, b) => b.stars - a.stars)
    .slice(0, 3);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-600 transition-all shadow-sm">
      {/* Header row */}
      <div className="flex items-start gap-4">
        {candidate.avatarUrl ? (
          <img
            src={candidate.avatarUrl}
            alt={candidate.username}
            className="w-12 h-12 rounded-full ring-2 ring-gray-700 flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-indigo-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            {(candidate.name ?? candidate.username)[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-base">
              {candidate.name ?? candidate.username}
            </span>
            <span className="text-gray-400 text-sm">@{candidate.username}</span>
          </div>
          {candidate.location && (
            <div className="text-gray-400 text-sm mt-0.5">
              📍 {candidate.location}
            </div>
          )}
          {candidate.bio && (
            <p className="text-gray-300 text-sm mt-1 line-clamp-2">{candidate.bio}</p>
          )}
        </div>

        {/* Relevance badge — placeholder in Phase 1 */}
        {candidate.relevanceScore !== undefined && (
          <div className="flex-shrink-0 text-center">
            <div
              className={`text-2xl font-bold ${
                candidate.relevanceScore >= 80
                  ? "text-green-400"
                  : candidate.relevanceScore >= 60
                  ? "text-yellow-400"
                  : "text-gray-400"
              }`}
            >
              {candidate.relevanceScore}
            </div>
            <div className="text-gray-500 text-xs">relevance</div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4 mt-3 text-sm text-gray-400">
        <span>👥 {candidate.followers.toLocaleString()} followers</span>
        <span>📦 {candidate.publicRepos} repos</span>
        {candidate.company && <span>🏢 {candidate.company}</span>}
      </div>

      {/* Languages */}
      {candidate.languages.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {candidate.languages.slice(0, 6).map((lang) => (
            <span
              key={lang}
              className="px-2 py-0.5 bg-gray-800 rounded-full text-xs text-indigo-300 border border-gray-700"
            >
              {lang}
            </span>
          ))}
          {candidate.languages.length > 6 && (
            <span className="px-2 py-0.5 text-xs text-gray-500">
              +{candidate.languages.length - 6} more
            </span>
          )}
        </div>
      )}

      {/* Top repos */}
      {topRepos.length > 0 && (
        <div className="mt-3 space-y-1">
          {topRepos.map((repo) => (
            <div
              key={repo.name}
              className="flex items-center gap-2 text-sm text-gray-400"
            >
              <span className="text-gray-600">📁</span>
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 truncate"
              >
                {repo.name}
              </a>
              {repo.description && (
                <span className="text-gray-500 truncate hidden sm:inline">
                  — {repo.description}
                </span>
              )}
              <span className="ml-auto text-gray-500 flex-shrink-0">
                ⭐ {repo.stars}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        <a
          href={candidate.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-200 transition-colors"
        >
          View GitHub
        </a>
        {candidate.relevanceReason && (
          <div className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-400 line-clamp-1 flex-1">
            💬 {candidate.relevanceReason}
          </div>
        )}
      </div>
    </div>
  );
}
