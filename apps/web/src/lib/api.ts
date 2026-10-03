const envBase = (import.meta.env.VITE_API_BASE as string | undefined)?.trim();
export const API_BASE = envBase ? envBase.replace(/\/$/, "") : "/api";

export async function postSearch(body: {
  requirement: string;
  locationScope: string;
  languages?: string[];
  minRelevance?: number;
}): Promise<{ jobId: string }> {
  const res = await fetch(`${API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getSearchJob(jobId: string) {
  const res = await fetch(`${API_BASE}/search/${jobId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function postOutreach(jobId: string, username: string, body: { senderName: string; requirement: string }) {
  const res = await fetch(`${API_BASE}/search/${jobId}/outreach/${username}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ subject: string; body: string }>;
}
