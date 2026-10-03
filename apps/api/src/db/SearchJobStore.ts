import { SearchJob } from "@gitscout/shared";

/**
 * SearchJobStore
 *
 * In-memory store for search jobs during Phase 1.
 * Designed to be replaced with a SQLite/PostgreSQL-backed implementation
 * in Phase 2 without changing the interface.
 *
 * All public methods are async to make the swap transparent.
 */
export class SearchJobStore {
  private jobs = new Map<string, SearchJob>();

  async save(job: SearchJob): Promise<void> {
    this.jobs.set(job.id, { ...job, updatedAt: new Date() });
  }

  async get(id: string): Promise<SearchJob | null> {
    return this.jobs.get(id) ?? null;
  }

  async update(id: string, patch: Partial<SearchJob>): Promise<void> {
    const existing = this.jobs.get(id);
    if (!existing) throw new Error(`Job ${id} not found`);
    this.jobs.set(id, { ...existing, ...patch, updatedAt: new Date() });
  }

  async list(): Promise<SearchJob[]> {
    return [...this.jobs.values()].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }
}

// Singleton instance shared across the process
export const jobStore = new SearchJobStore();
