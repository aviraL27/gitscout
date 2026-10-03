import { SearchCriteria, SearchPlan } from "@gitscout/shared";

// ─── Keyword taxonomy ─────────────────────────────────────────────────────────
//
// These are the canonical domain → keyword mappings.
// When the user's requirement contains any of the left-hand terms,
// all right-hand keywords are added to the search.
//
// This is DETERMINISTIC — no AI required for basic expansion.
// Gemma (Phase 3) can further refine, but the base queries don't depend on it.

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  // AI / ML
  "machine learning": ["machine learning", "deep learning", "neural network"],
  "ml": ["machine learning", "deep learning"],
  "ai": ["artificial intelligence", "machine learning"],
  "deep learning": ["deep learning", "neural network", "pytorch", "tensorflow"],

  // LLM / Generative AI
  "llm": ["LLM", "large language model"],
  "large language model": ["LLM", "large language model"],
  "generative ai": ["generative AI", "LLM"],
  "genai": ["generative AI", "LLM"],

  // RAG
  "rag": ["RAG", "retrieval augmented generation"],
  "retrieval augmented": ["RAG", "retrieval augmented generation"],
  "vector search": ["vector search", "RAG", "embeddings"],
  "embeddings": ["embeddings", "vector search"],

  // Frameworks / tooling
  "langchain": ["langchain", "LLM"],
  "llamaindex": ["llamaindex", "LLM", "RAG"],
  "hugging face": ["hugging face", "transformers"],
  "transformers": ["transformers", "hugging face"],
  "openai": ["openai", "GPT", "LLM"],
  "fastapi": ["fastapi", "python"],
  "pytorch": ["pytorch", "deep learning"],
  "tensorflow": ["tensorflow", "deep learning"],

  // Open source
  "open source": ["open source", "opensource"],
  "opensource": ["open source", "opensource"],

  // Languages
  "python": [],  // handled separately in the language list
  "typescript": [],
  "javascript": [],
  "rust": [],
  "go": [],
};

// Supported location scopes. Easily extended later.
const LOCATION_SCOPE_MAP: Record<string, string> = {
  india: "India",
  "united states": "United States",
  usa: "United States",
  uk: "United Kingdom",
  "united kingdom": "United Kingdom",
  germany: "Germany",
  singapore: "Singapore",
  worldwide: "", // empty = no location filter
};

/**
 * SearchPlanner
 *
 * Transforms a natural-language requirement + locationScope into a
 * deterministic set of GitHub search queries.
 *
 * Design principles:
 *  - Keyword extraction is rule-based (no AI dependency)
 *  - Queries are composable: keyword + location + language
 *  - locationScope is the single source of truth — never hardcoded to India
 *  - Deduplication of generated queries happens here
 */
export class SearchPlanner {
  plan(criteria: SearchCriteria): SearchPlan {
    const normalizedReq = criteria.requirement.toLowerCase();
    const locationFilter = this.resolveLocationFilter(criteria.locationScope);

    // ── 1. Extract keywords from the requirement ───────────────────────────
    const keywordSet = new Set<string>();

    for (const [trigger, expansions] of Object.entries(DOMAIN_KEYWORDS)) {
      if (normalizedReq.includes(trigger)) {
        // Add the matched term itself (capitalised appropriately)
        keywordSet.add(this.capitalise(trigger));
        for (const kw of expansions) {
          keywordSet.add(kw);
        }
      }
    }

    // Fallback: if nothing matched, extract meaningful words from the
    // requirement (skip stop words, keep nouns/tech terms)
    if (keywordSet.size === 0) {
      const fallbackWords = this.extractFallbackKeywords(criteria.requirement);
      for (const w of fallbackWords) keywordSet.add(w);
    }

    const keywords = [...keywordSet];

    // ── 2. Extract languages ───────────────────────────────────────────────
    const languageSet = new Set<string>(criteria.languages ?? []);
    const languageTriggers: Record<string, string> = {
      python: "Python",
      typescript: "TypeScript",
      javascript: "JavaScript",
      rust: "Rust",
      "go ": "Go",
      golang: "Go",
      java: "Java",
      "c++": "C++",
      cpp: "C++",
    };
    for (const [trigger, lang] of Object.entries(languageTriggers)) {
      if (normalizedReq.includes(trigger)) {
        languageSet.add(lang);
      }
    }
    const languages = [...languageSet];

    // ── 3. Build GitHub query strings ─────────────────────────────────────
    const querySet = new Set<string>();

    const locationPart = locationFilter ? ` location:${locationFilter}` : "";

    for (const kw of keywords) {
      // Basic: keyword + location
      const q = `${kw}${locationPart}`.trim();
      querySet.add(q);

      // With language if single language provided for tighter queries
      if (languages.length === 1) {
        const ql = `${kw} language:${languages[0]}${locationPart}`.trim();
        querySet.add(ql);
      }
    }

    // Also run a repository-search style query: users who have repos in topic
    // This surfaces people who tag their repos with the right topics.
    for (const kw of keywords.slice(0, 3)) {
      const topicQuery = `${kw.toLowerCase().replace(/\s+/g, "-")} in:topics${locationPart}`.trim();
      querySet.add(topicQuery);
    }

    const githubQueries = [...querySet];

    return {
      locationScope: criteria.locationScope,
      keywords,
      languages,
      githubQueries,
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private resolveLocationFilter(locationScope: string): string {
    const key = locationScope.toLowerCase().trim();
    if (key in LOCATION_SCOPE_MAP) {
      return LOCATION_SCOPE_MAP[key];
    }
    // If not in the map, use the value as-is (handles custom locations)
    return locationScope.trim();
  }

  private capitalise(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private extractFallbackKeywords(requirement: string): string[] {
    const stopWords = new Set([
      "find", "me", "a", "an", "the", "who", "have", "has", "had", "with",
      "and", "or", "in", "for", "on", "at", "to", "of", "is", "are", "was",
      "that", "this", "from", "by", "can", "i", "want", "need", "looking",
      "into", "about", "like", "such", "some", "someone", "people", "folks",
      "developers", "developer", "engineer", "engineers", "development",
      "building", "built", "build", "work", "working", "works", "experience",
      "experienced", "senior", "junior", "expert", "specialist", "good", "strong"
    ]);

    return requirement
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9+#]/g, "").trim())
      .filter((w) => w.length > 2 && !stopWords.has(w.toLowerCase()))
      .slice(0, 5);
  }
}
